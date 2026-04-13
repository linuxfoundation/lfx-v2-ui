// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import {
  CommitteeLinkQueryResult,
  GroupsIOArtifactQueryResult,
  MeetingAttachment,
  MeetingRegistrantQueryResult,
  MyCommittee,
  MyDocumentItem,
  MyDocumentSource,
  PastMeetingAttachment,
  PastMeetingParticipantQueryResult,
  PastMeetingRecordingQueryResult,
  PastMeetingSummaryQueryResult,
  PastMeetingTranscriptQueryResult,
  QueryServiceResponse,
} from '@lfx-one/shared/interfaces';
import { Request } from 'express';

import { fetchAllQueryResources } from '../helpers/query-service.helper';
import { generateM2MToken } from '../utils/m2m-token.util';
import { getUsernameFromAuth, stripAuthPrefix } from '../utils/auth-helper';
import { CommitteeService } from './committee.service';
import { logger } from './logger.service';
import { MicroserviceProxyService } from './microservice-proxy.service';

type MeetingDetails = Map<string, { title: string; project_uid: string; project_name: string }>;

/**
 * Service for aggregating documents across a user's groups, meetings, and mailing lists.
 *
 * Uses a 3-stage query model:
 *   Stage 1: Determine which committees and meetings the user belongs to
 *   Stage 2: Fetch all raw attachments/recordings in parallel
 *   Stage 3: Single batched meeting detail fetch, then map to MyDocumentItem
 */
export class DocumentService {
  private readonly microserviceProxy: MicroserviceProxyService;
  private readonly committeeService: CommitteeService;

  public constructor() {
    this.microserviceProxy = new MicroserviceProxyService();
    this.committeeService = new CommitteeService();
  }

  /**
   * Fetches all documents relevant to the current user across their groups and meetings.
   * Optionally scoped to a specific project via project_uid query param.
   */
  public async getMyDocuments(req: Request, query: Record<string, any> = {}): Promise<MyDocumentItem[]> {
    const projectUid = query['project_uid'] as string | undefined;

    logger.debug(req, 'get_my_documents', 'Starting document aggregation', { project_uid: projectUid });

    // Stage 1 — Fetch committee memberships and past occurrence IDs in parallel
    const [myCommittees, occurrenceIds] = await Promise.all([
      this.committeeService.getMyCommittees(req, projectUid).catch((err) => {
        logger.warning(req, 'get_my_documents', 'Failed to fetch committee memberships, returning empty', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        return [] as MyCommittee[];
      }),
      this.getUserPastMeetingOccurrenceIds(req),
    ]);

    // Stage 2 — Fetch all raw items in parallel (no meeting enrichment yet)
    const [committeeLinkItems, groupsioItems, rawMeetingAttachments, rawPastAttachments, rawPastRecordings, rawTranscripts, rawSummaries] = await Promise.all([
      this.getCommitteeDocuments(req, myCommittees),
      this.getGroupsIOArtifacts(req, myCommittees),
      this.fetchRawMeetingAttachments(req),
      this.fetchRawPastMeetingAttachments(req, occurrenceIds),
      this.fetchRawPastMeetingRecordings(req, occurrenceIds),
      this.fetchRawPastMeetingTranscripts(req, occurrenceIds),
      this.fetchRawPastMeetingSummaries(req, occurrenceIds),
    ]);

    // Stage 3 — Batch all unique meeting IDs across all meeting-linked sources into ONE fetch
    const allMeetingIds = [
      ...new Set(
        [
          ...rawMeetingAttachments.map((a) => a.meeting_id),
          ...rawPastAttachments.map((a) => a.meeting_id),
          ...rawPastRecordings.map((r) => r.meeting_id),
          ...rawTranscripts.map((t) => t.meeting_id),
          ...rawSummaries.map((s) => s.meeting_id),
        ].filter(Boolean)
      ),
    ];

    const meetingDetails =
      allMeetingIds.length > 0
        ? await this.fetchMeetingDetails(req, allMeetingIds)
        : new Map<string, { title: string; project_uid: string; project_name: string }>();

    const meetingAttachmentItems = this.mapMeetingAttachments(rawMeetingAttachments, meetingDetails);
    const pastMeetingItems = [
      ...this.mapPastMeetingAttachments(rawPastAttachments, meetingDetails),
      ...this.mapPastMeetingRecordings(rawPastRecordings, meetingDetails),
      ...this.mapPastMeetingTranscripts(rawTranscripts, meetingDetails),
      ...this.mapPastMeetingSummaries(rawSummaries, meetingDetails),
    ];

    const allDocuments = [...committeeLinkItems, ...groupsioItems, ...meetingAttachmentItems, ...pastMeetingItems];

    logger.debug(req, 'get_my_documents', 'Aggregated documents', {
      committee_docs: committeeLinkItems.length,
      mailing_list_artifacts: groupsioItems.length,
      meeting_attachments: meetingAttachmentItems.length,
      past_meeting_items: pastMeetingItems.length,
      total: allDocuments.length,
    });

    return allDocuments;
  }

  // ─── Committee / Group Documents ────────────────────────────────────────────

  private async getCommitteeDocuments(req: Request, myCommittees: MyCommittee[]): Promise<MyDocumentItem[]> {
    if (myCommittees.length === 0) {
      return [];
    }

    logger.debug(req, 'get_my_documents', 'Fetching committee links using filters_or', {
      committee_count: myCommittees.length,
    });

    const filtersOr = myCommittees.map((c) => `committee_uid:${c.uid}`);

    // Fetch committee link documents (links and folders) via filters_or
    // We use v=1 for the new filters_or param (requires query service PR #41)
    const linkAttachments = await fetchAllQueryResources<CommitteeLinkQueryResult>(req, (pageToken) =>
      this.microserviceProxy.proxyRequest<QueryServiceResponse<CommitteeLinkQueryResult>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
        v: '1',
        type: 'committee_link',
        filters_or: filtersOr,
        ...(pageToken && { page_token: pageToken }),
      })
    ).catch((err) => {
      logger.warning(req, 'get_my_documents', 'Failed to fetch committee links via query service, falling back', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      return [];
    });

    const committeeMap = new Map(myCommittees.map((c) => [c.uid, c]));

    return linkAttachments
      .filter((link) => link.url) // skip folders
      .map((link): MyDocumentItem => {
        const committee = link.committee_uid ? committeeMap.get(link.committee_uid) : undefined;
        return {
          id: `committee_link:${link.uid}`,
          name: link.name,
          source: 'link' as MyDocumentSource,
          foundationName: committee?.foundation_name || committee?.project_name || '',
          foundationUid: committee?.project_uid || '',
          groupOrMeetingName: committee?.name || '',
          groupOrMeetingUid: committee?.uid || link.committee_uid || '',
          date: link.created_at || '',
          url: link.url,
        };
      });
  }

  // ─── GroupsIO / Mailing List Artifacts ──────────────────────────────────────

  private async getGroupsIOArtifacts(req: Request, myCommittees: MyCommittee[]): Promise<MyDocumentItem[]> {
    if (myCommittees.length === 0) {
      return [];
    }

    const filtersOr = myCommittees.map((c) => `committee_uid:${c.uid}`);

    logger.debug(req, 'get_my_documents', 'Fetching groupsio artifacts via filters_or', {
      committee_count: myCommittees.length,
    });

    const artifacts = await fetchAllQueryResources<GroupsIOArtifactQueryResult>(req, (pageToken) =>
      this.microserviceProxy.proxyRequest<QueryServiceResponse<GroupsIOArtifactQueryResult>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
        v: '1',
        type: 'groupsio_artifact',
        filters_or: filtersOr,
        ...(pageToken && { page_token: pageToken }),
      })
    ).catch((err) => {
      logger.warning(req, 'get_my_documents', 'Failed to fetch groupsio artifacts', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      return [];
    });

    const committeeMap = new Map(myCommittees.map((c) => [c.uid, c]));

    return artifacts.map((a): MyDocumentItem => {
      const committee = a.committee_uid ? committeeMap.get(a.committee_uid) : undefined;
      const url = a.type === 'link' ? a.link_url : (a.download_url ?? a.link_url);
      return {
        id: `groupsio_artifact:${a.artifact_id}`,
        name: a.filename || a.link_url || a.artifact_id,
        source: 'mailing_list' as MyDocumentSource,
        foundationName: committee?.foundation_name || committee?.project_name || '',
        foundationUid: committee?.project_uid || a.project_uid || '',
        groupOrMeetingName: committee?.name || '',
        groupOrMeetingUid: committee?.uid || a.committee_uid || '',
        date: a.created_at || '',
        url,
        mailingListId: a.group_id ? String(a.group_id) : undefined,
        fileType: a.media_type,
      };
    });
  }

  // ─── Meeting Enrichment ─────────────────────────────────────────────────────

  /**
   * Fetches meeting details (title, project_uid, project_name) for a set of meeting IDs.
   * Returns a map of meeting_id → enrichment data; missing/failed IDs are silently omitted.
   */
  private async fetchMeetingDetails(req: Request, meetingIds: string[]): Promise<MeetingDetails> {
    const results = await Promise.all(
      meetingIds.map((id) =>
        this.microserviceProxy
          .proxyRequest<{ title: string; project_uid: string; project_name: string }>(req, 'LFX_V2_SERVICE', `/itx/meetings/${id}`, 'GET')
          .catch(() => null)
      )
    );

    const map: MeetingDetails = new Map();
    meetingIds.forEach((id, i) => {
      const m = results[i];
      if (m?.title) map.set(id, m);
    });
    return map;
  }

  // ─── Upcoming Meeting Attachments ───────────────────────────────────────────

  private async fetchRawMeetingAttachments(req: Request): Promise<MeetingAttachment[]> {
    const email = (req.oidc?.user?.['email'] as string | undefined)?.toLowerCase();
    const username = await getUsernameFromAuth(req);

    if (!email && !username) {
      return [];
    }

    logger.debug(req, 'get_my_documents', 'Fetching user meeting registrations for attachments');

    const m2mToken = await generateM2MToken(req);
    const headers = { Authorization: `Bearer ${m2mToken}` };

    // Collect meeting IDs from registrant records
    const meetingIds = new Set<string>();

    if (email) {
      const emailRegistrants = await fetchAllQueryResources<MeetingRegistrantQueryResult>(req, (pageToken) =>
        this.microserviceProxy.proxyRequest<QueryServiceResponse<MeetingRegistrantQueryResult>>(
          req,
          'LFX_V2_SERVICE',
          '/query/resources',
          'GET',
          {
            v: '1',
            type: 'v1_meeting_registrant',
            tags: `email:${email}`,
            ...(pageToken && { page_token: pageToken }),
          },
          undefined,
          headers
        )
      ).catch(() => []);
      emailRegistrants.forEach((r) => r.meeting_id && meetingIds.add(r.meeting_id));
    }

    if (username) {
      const plainUsername = stripAuthPrefix(username);
      const usernameRegistrants = await fetchAllQueryResources<MeetingRegistrantQueryResult>(req, (pageToken) =>
        this.microserviceProxy.proxyRequest<QueryServiceResponse<MeetingRegistrantQueryResult>>(
          req,
          'LFX_V2_SERVICE',
          '/query/resources',
          'GET',
          {
            v: '1',
            type: 'v1_meeting_registrant',
            tags: `username:${plainUsername}`,
            ...(pageToken && { page_token: pageToken }),
          },
          undefined,
          headers
        )
      ).catch(() => []);
      usernameRegistrants.forEach((r) => r.meeting_id && meetingIds.add(r.meeting_id));
    }

    if (meetingIds.size === 0) {
      return [];
    }

    const filtersOr = Array.from(meetingIds).map((id) => `meeting_id:${id}`);

    logger.debug(req, 'get_my_documents', 'Fetching meeting attachments via filters_or', {
      meeting_count: meetingIds.size,
    });

    return fetchAllQueryResources<MeetingAttachment>(req, (pageToken) =>
      this.microserviceProxy.proxyRequest<QueryServiceResponse<MeetingAttachment>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
        v: '1',
        type: 'v1_meeting_attachment',
        filters_or: filtersOr,
        ...(pageToken && { page_token: pageToken }),
      })
    ).catch((err) => {
      logger.warning(req, 'get_my_documents', 'Failed to fetch meeting attachments', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      return [];
    });
  }

  private mapMeetingAttachments(attachments: MeetingAttachment[], meetingDetails: MeetingDetails): MyDocumentItem[] {
    return attachments.map((a): MyDocumentItem => {
      const meeting = meetingDetails.get(a.meeting_id);
      return {
        id: `meeting_attachment:${a.uid}`,
        name: a.name,
        source: a.type === 'file' ? ('file' as MyDocumentSource) : ('meeting' as MyDocumentSource),
        foundationName: meeting?.project_name || '',
        foundationUid: meeting?.project_uid || '',
        groupOrMeetingName: meeting?.title || '',
        groupOrMeetingUid: a.meeting_id,
        date: a.created_at,
        url: a.link,
        attachmentUid: a.uid,
        meetingId: a.meeting_id,
        fileType: a.file_content_type,
      };
    });
  }

  // ─── Past Meeting Items (Attachments + Recordings) ──────────────────────────

  private async getUserPastMeetingOccurrenceIds(req: Request): Promise<string[]> {
    const email = (req.oidc?.user?.['email'] as string | undefined)?.toLowerCase();
    const username = await getUsernameFromAuth(req);

    if (!email && !username) {
      return [];
    }

    logger.debug(req, 'get_my_documents', 'Fetching past meeting participations');

    const m2mToken = await generateM2MToken(req);
    const headers = { Authorization: `Bearer ${m2mToken}` };

    const occurrenceIds = new Set<string>();

    if (email) {
      const emailParticipants = await fetchAllQueryResources<PastMeetingParticipantQueryResult>(req, (pageToken) =>
        this.microserviceProxy.proxyRequest<QueryServiceResponse<PastMeetingParticipantQueryResult>>(
          req,
          'LFX_V2_SERVICE',
          '/query/resources',
          'GET',
          {
            v: '1',
            type: 'v1_past_meeting_participant',
            tags: `email:${email}`,
            ...(pageToken && { page_token: pageToken }),
          },
          undefined,
          headers
        )
      ).catch(() => []);
      emailParticipants.forEach((p) => p.meeting_and_occurrence_id && occurrenceIds.add(p.meeting_and_occurrence_id));
    }

    if (username) {
      const plainUsername = stripAuthPrefix(username);
      const usernameParticipants = await fetchAllQueryResources<PastMeetingParticipantQueryResult>(req, (pageToken) =>
        this.microserviceProxy.proxyRequest<QueryServiceResponse<PastMeetingParticipantQueryResult>>(
          req,
          'LFX_V2_SERVICE',
          '/query/resources',
          'GET',
          {
            v: '1',
            type: 'v1_past_meeting_participant',
            tags: `username:${plainUsername}`,
            ...(pageToken && { page_token: pageToken }),
          },
          undefined,
          headers
        )
      ).catch(() => []);
      usernameParticipants.forEach((p) => p.meeting_and_occurrence_id && occurrenceIds.add(p.meeting_and_occurrence_id));
    }

    return [...occurrenceIds];
  }

  private async fetchRawPastMeetingAttachments(req: Request, occurrenceIds: string[]): Promise<PastMeetingAttachment[]> {
    if (occurrenceIds.length === 0) {
      return [];
    }

    const filtersOr = occurrenceIds.map((id) => `meeting_and_occurrence_id:${id}`);

    logger.debug(req, 'get_my_documents', 'Fetching past meeting attachments via filters_or', {
      occurrence_count: occurrenceIds.length,
    });

    return fetchAllQueryResources<PastMeetingAttachment>(req, (pageToken) =>
      this.microserviceProxy.proxyRequest<QueryServiceResponse<PastMeetingAttachment>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
        v: '1',
        type: 'v1_past_meeting_attachment',
        filters_or: filtersOr,
        ...(pageToken && { page_token: pageToken }),
      })
    ).catch((err) => {
      logger.warning(req, 'get_my_documents', 'Failed to fetch past meeting attachments', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      return [];
    });
  }

  private mapPastMeetingAttachments(attachments: PastMeetingAttachment[], meetingDetails: MeetingDetails): MyDocumentItem[] {
    return attachments.map((a): MyDocumentItem => {
      const meeting = meetingDetails.get(a.meeting_id);
      return {
        id: `past_meeting_attachment:${a.uid}`,
        name: a.name,
        source: a.type === 'file' ? ('file' as MyDocumentSource) : ('meeting' as MyDocumentSource),
        foundationName: meeting?.project_name || '',
        foundationUid: meeting?.project_uid || '',
        groupOrMeetingName: meeting?.title || '',
        groupOrMeetingUid: a.meeting_and_occurrence_id,
        date: a.created_at,
        url: a.link,
        attachmentUid: a.uid,
        pastMeetingId: a.meeting_and_occurrence_id,
        fileType: a.file_content_type,
      };
    });
  }

  private async fetchRawPastMeetingRecordings(req: Request, occurrenceIds: string[]): Promise<PastMeetingRecordingQueryResult[]> {
    if (occurrenceIds.length === 0) {
      return [];
    }

    const filtersOr = occurrenceIds.map((id) => `meeting_and_occurrence_id:${id}`);

    logger.debug(req, 'get_my_documents', 'Fetching past meeting recordings via filters_or', {
      occurrence_count: occurrenceIds.length,
    });

    return fetchAllQueryResources<PastMeetingRecordingQueryResult>(req, (pageToken) =>
      this.microserviceProxy.proxyRequest<QueryServiceResponse<PastMeetingRecordingQueryResult>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
        v: '1',
        type: 'v1_past_meeting_recording',
        filters_or: filtersOr,
        ...(pageToken && { page_token: pageToken }),
      })
    ).catch((err) => {
      logger.warning(req, 'get_my_documents', 'Failed to fetch past meeting recordings', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      return [];
    });
  }

  private mapPastMeetingRecordings(recordings: PastMeetingRecordingQueryResult[], meetingDetails: MeetingDetails): MyDocumentItem[] {
    return recordings.map((r): MyDocumentItem => {
      const meeting = meetingDetails.get(r.meeting_id);
      const url = r.sessions?.[0]?.share_url ?? r.recording_files?.[0]?.play_url;
      return {
        id: `past_meeting_recording:${r.id}`,
        name: r.title || 'Recording',
        source: 'recording' as MyDocumentSource,
        foundationName: meeting?.project_name || '',
        foundationUid: meeting?.project_uid || '',
        groupOrMeetingName: meeting?.title || '',
        groupOrMeetingUid: r.meeting_and_occurrence_id,
        date: r.start_time || r.created_at,
        url,
        pastMeetingId: r.meeting_and_occurrence_id,
        fileType: r.recording_files?.[0]?.file_type,
      };
    });
  }

  // ─── Past Meeting Transcripts ────────────────────────────────────────────────

  private async fetchRawPastMeetingTranscripts(req: Request, occurrenceIds: string[]): Promise<PastMeetingTranscriptQueryResult[]> {
    if (occurrenceIds.length === 0) {
      return [];
    }

    const filtersOr = occurrenceIds.map((id) => `meeting_and_occurrence_id:${id}`);

    logger.debug(req, 'get_my_documents', 'Fetching past meeting transcripts via filters_or', {
      occurrence_count: occurrenceIds.length,
    });

    return fetchAllQueryResources<PastMeetingTranscriptQueryResult>(req, (pageToken) =>
      this.microserviceProxy.proxyRequest<QueryServiceResponse<PastMeetingTranscriptQueryResult>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
        v: '1',
        type: 'v1_past_meeting_transcript',
        filters_or: filtersOr,
        ...(pageToken && { page_token: pageToken }),
      })
    ).catch((err) => {
      logger.warning(req, 'get_my_documents', 'Failed to fetch past meeting transcripts', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      return [];
    });
  }

  private mapPastMeetingTranscripts(transcripts: PastMeetingTranscriptQueryResult[], meetingDetails: MeetingDetails): MyDocumentItem[] {
    return transcripts.map((t): MyDocumentItem => {
      const meeting = meetingDetails.get(t.meeting_id);
      const url = t.sessions?.[0]?.share_url ?? t.recording_files?.[0]?.download_url;
      return {
        id: `past_meeting_transcript:${t.id}`,
        name: t.title || 'Transcript',
        source: 'transcript' as MyDocumentSource,
        foundationName: meeting?.project_name || '',
        foundationUid: meeting?.project_uid || '',
        groupOrMeetingName: meeting?.title || '',
        groupOrMeetingUid: t.meeting_and_occurrence_id,
        date: t.start_time || t.created_at,
        url,
        pastMeetingId: t.meeting_and_occurrence_id,
      };
    });
  }

  // ─── Past Meeting Summaries ──────────────────────────────────────────────────

  private async fetchRawPastMeetingSummaries(req: Request, occurrenceIds: string[]): Promise<PastMeetingSummaryQueryResult[]> {
    if (occurrenceIds.length === 0) {
      return [];
    }

    const filtersOr = occurrenceIds.map((id) => `meeting_and_occurrence_id:${id}`);

    logger.debug(req, 'get_my_documents', 'Fetching past meeting summaries via filters_or', {
      occurrence_count: occurrenceIds.length,
    });

    return fetchAllQueryResources<PastMeetingSummaryQueryResult>(req, (pageToken) =>
      this.microserviceProxy.proxyRequest<QueryServiceResponse<PastMeetingSummaryQueryResult>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
        v: '1',
        type: 'v1_past_meeting_summary',
        filters_or: filtersOr,
        ...(pageToken && { page_token: pageToken }),
      })
    ).catch((err) => {
      logger.warning(req, 'get_my_documents', 'Failed to fetch past meeting summaries', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      return [];
    });
  }

  private mapPastMeetingSummaries(summaries: PastMeetingSummaryQueryResult[], meetingDetails: MeetingDetails): MyDocumentItem[] {
    return summaries.map((s): MyDocumentItem => {
      const meeting = meetingDetails.get(s.meeting_id);
      return {
        id: `past_meeting_summary:${s.id}`,
        name: s.summary_title || s.zoom_meeting_topic || 'Meeting Summary',
        source: 'summary' as MyDocumentSource,
        foundationName: meeting?.project_name || '',
        foundationUid: meeting?.project_uid || '',
        groupOrMeetingName: meeting?.title || '',
        groupOrMeetingUid: s.meeting_and_occurrence_id,
        date: s.summary_start_time || s.created_at,
        pastMeetingId: s.meeting_and_occurrence_id,
      };
    });
  }
}
