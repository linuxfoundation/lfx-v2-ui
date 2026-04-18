// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import {
  CommitteeLinkQueryResult,
  GroupsIOArtifactQueryResult,
  MeetingAttachment,
  MyCommittee,
  MyDocumentItem,
  MyDocumentSource,
  PastMeetingAttachment,
  PastMeetingRecordingQueryResult,
  PastMeetingSummaryQueryResult,
  PastMeetingTranscriptQueryResult,
  QueryServiceResponse,
  V1PastMeetingQueryResult,
} from '@lfx-one/shared/interfaces';
import { Request } from 'express';

import { fetchAllQueryResources } from '../helpers/query-service.helper';
import { getEffectiveEmail } from '../utils/auth-helper';
import { CommitteeService } from './committee.service';
import { logger } from './logger.service';
import { MicroserviceProxyService } from './microservice-proxy.service';
import { UserService } from './user.service';

type MeetingDetails = Map<string, { title: string; project_uid: string }>;

/**
 * Service for aggregating documents across a user's groups, meetings, and mailing lists.
 *
 * Uses a 4-stage query model:
 *   Stage 1: Fetch committee memberships and past occurrence IDs in parallel
 *   Stage 2: Fetch all raw attachments/recordings/artifacts in parallel
 *   Stage 3: Single batched meeting detail fetch (title + project_uid), then map to MyDocumentItem
 *   Stage 4: Batched HTTP lookup to resolve foundation display names for meeting-sourced documents
 */
export class DocumentService {
  private readonly microserviceProxy: MicroserviceProxyService;
  private readonly committeeService: CommitteeService;
  private readonly userService: UserService;

  public constructor() {
    this.microserviceProxy = new MicroserviceProxyService();
    this.committeeService = new CommitteeService();
    this.userService = new UserService();
  }

  /**
   * Fetches all documents relevant to the current user across their groups and meetings.
   * Optionally scoped to a specific project via project_uid query param.
   */
  public async getMyDocuments(req: Request, query: Record<string, any> = {}): Promise<MyDocumentItem[]> {
    const projectUid = query['project_uid'] as string | undefined;
    const committeeUid = query['committee_uid'] as string | undefined;

    logger.info(req, 'get_my_documents', 'Starting 4-stage document aggregation', { project_uid: projectUid, committee_uid: committeeUid });

    // Stage 1 — Fetch committee memberships and past occurrence IDs in parallel
    const [myCommittees, occurrenceIds] = await Promise.all([
      this.committeeService.getMyCommittees(req, projectUid).catch((err) => {
        logger.warning(req, 'get_my_documents', 'Failed to fetch committee memberships, returning empty', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        return [] as MyCommittee[];
      }),
      this.userService.getPastMeetingOccurrenceIds(req).catch((err) => {
        logger.warning(req, 'get_my_documents', 'Failed to fetch past meeting occurrence IDs, returning empty', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        return [] as string[];
      }),
    ]);

    // When scoped to a specific committee, filter memberships to that committee only.
    // If the user is not a member, scopedCommittees will be empty and committee-based
    // fetches return [] early — access control is enforced implicitly.
    const scopedCommittees = committeeUid ? myCommittees.filter((c) => c.uid === committeeUid) : myCommittees;

    // Stage 1.5 — When scoped to a committee, narrow occurrence IDs to only that committee's
    // past meetings via a two-hop: query v1_past_meeting by committee_uid to get its
    // occurrence IDs, then intersect with the user's own attended occurrence IDs.
    let effectiveOccurrenceIds = occurrenceIds;
    if (committeeUid && occurrenceIds.length > 0) {
      const committeeOccurrenceIds = await this.fetchCommitteeOccurrenceIds(req, committeeUid, projectUid);
      effectiveOccurrenceIds = occurrenceIds.filter((id) => committeeOccurrenceIds.has(id));
      logger.debug(req, 'get_my_documents', 'Narrowed occurrence IDs to committee meetings', {
        committee_uid: committeeUid,
        user_occurrence_count: occurrenceIds.length,
        committee_occurrence_count: committeeOccurrenceIds.size,
        effective_occurrence_count: effectiveOccurrenceIds.length,
      });
    }

    // Stage 2 — Fetch all raw items in parallel (no meeting enrichment yet)
    const [committeeLinkItems, groupsioItems, rawMeetingAttachments, rawPastAttachments, rawPastRecordings, rawTranscripts, rawSummaries] = await Promise.all([
      this.getCommitteeDocuments(req, scopedCommittees),
      this.getGroupsIOArtifacts(req, projectUid ?? scopedCommittees.find((c) => c.project_uid)?.project_uid),
      this.fetchRawMeetingAttachments(req, projectUid),
      this.fetchRawPastMeetingAttachments(req, effectiveOccurrenceIds, projectUid),
      this.fetchRawPastMeetingRecordings(req, effectiveOccurrenceIds, projectUid),
      this.fetchRawPastMeetingTranscripts(req, effectiveOccurrenceIds, projectUid),
      this.fetchRawPastMeetingSummaries(req, effectiveOccurrenceIds, projectUid),
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
      allMeetingIds.length > 0 ? await this.fetchMeetingDetails(req, allMeetingIds) : new Map<string, { title: string; project_uid: string }>();

    const meetingAttachmentItems = this.mapMeetingAttachments(rawMeetingAttachments, meetingDetails);
    const pastMeetingItems = [
      ...this.mapPastMeetingAttachments(rawPastAttachments, meetingDetails),
      ...this.mapPastMeetingRecordings(rawPastRecordings, meetingDetails),
      ...this.mapPastMeetingTranscripts(rawTranscripts, meetingDetails),
      ...this.mapPastMeetingSummaries(rawSummaries, meetingDetails),
    ];

    const allDocuments = [...committeeLinkItems, ...groupsioItems, ...meetingAttachmentItems, ...pastMeetingItems];

    // Stage 4 — Resolve foundation names for docs that have a foundationUid but no foundationName
    const needsNameResolution: MyDocumentSource[] = ['file', 'recording', 'transcript', 'summary', 'meeting', 'mailing_list'];
    const foundationUids = [
      ...new Set(
        allDocuments.filter((d) => needsNameResolution.includes(d.source) && d.foundationUid && !d.foundationName).map((d) => d.foundationUid as string)
      ),
    ];

    const foundationNames = await this.fetchProjectNames(req, foundationUids);

    const enrichedDocuments = allDocuments.map((doc) => {
      if (needsNameResolution.includes(doc.source) && doc.foundationUid && !doc.foundationName) {
        const name = foundationNames.get(doc.foundationUid);
        return name ? { ...doc, foundationName: name } : doc;
      }
      return doc;
    });

    logger.info(req, 'get_my_documents', 'Completed 4-stage document aggregation', {
      committee_docs: committeeLinkItems.length,
      mailing_list_artifacts: groupsioItems.length,
      meeting_attachments: meetingAttachmentItems.length,
      past_meeting_items: pastMeetingItems.length,
      total: enrichedDocuments.length,
    });

    return enrichedDocuments;
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
          foundationUid: committee?.project_uid || undefined,
          groupOrMeetingName: committee?.name || '',
          groupOrMeetingUid: committee?.uid || link.committee_uid || '',
          date: link.created_at || '',
          url: link.url,
        };
      });
  }

  // ─── GroupsIO / Mailing List Artifacts ──────────────────────────────────────

  private async getGroupsIOArtifacts(req: Request, projectUid?: string): Promise<MyDocumentItem[]> {
    if (!projectUid) {
      return [];
    }

    logger.debug(req, 'get_my_documents', 'Fetching groupsio artifacts', { project_uid: projectUid });

    const artifacts = await fetchAllQueryResources<GroupsIOArtifactQueryResult>(req, (pageToken) =>
      this.microserviceProxy.proxyRequest<QueryServiceResponse<GroupsIOArtifactQueryResult>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
        type: 'groupsio_artifact',
        tags: `project_uid:${projectUid}`,
        ...(pageToken && { page_token: pageToken }),
      })
    ).catch((err) => {
      logger.warning(req, 'get_my_documents', 'Failed to fetch groupsio artifacts', {
        project_uid: projectUid,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      return [];
    });

    logger.info(req, 'get_my_documents', 'Fetched groupsio artifacts', { project_uid: projectUid, artifact_count: artifacts.length });

    return artifacts.map((a): MyDocumentItem => {
      const url = a.type === 'link' ? a.link_url : (a.download_url ?? a.link_url);
      return {
        id: `groupsio_artifact:${a.artifact_id}`,
        name: a.filename || a.link_url || a.artifact_id,
        source: (a.type === 'file' ? 'file' : 'mailing_list') as MyDocumentSource,
        foundationName: '',
        foundationUid: a.project_uid || undefined,
        groupOrMeetingName: '',
        groupOrMeetingUid: a.committee_uid || '',
        date: a.created_at || '',
        url,
        mailingListId: a.group_id ? String(a.group_id) : undefined,
        fileType: a.media_type,
      };
    });
  }

  // ─── Committee Meeting Scoping (Two-hop) ────────────────────────────────────

  /**
   * Queries v1_past_meeting resources tagged with the given committee_uid to
   * build a set of occurrence IDs belonging to that committee's meetings.
   * Used to intersect with a user's attended occurrence IDs so that past-meeting
   * documents are scoped to meetings of this specific committee.
   */
  private async fetchCommitteeOccurrenceIds(req: Request, committeeUid: string, projectUid?: string): Promise<Set<string>> {
    logger.debug(req, 'get_my_documents', 'Fetching committee past-meeting occurrence IDs (two-hop)', {
      committee_uid: committeeUid,
    });

    const tags = projectUid ? `committee_uid:${committeeUid} project_uid:${projectUid}` : `committee_uid:${committeeUid}`;

    const pastMeetings = await fetchAllQueryResources<V1PastMeetingQueryResult>(req, (pageToken) =>
      this.microserviceProxy.proxyRequest<QueryServiceResponse<V1PastMeetingQueryResult>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
        v: '1',
        type: 'v1_past_meeting',
        tags,
        ...(pageToken && { page_token: pageToken }),
      })
    ).catch((err) => {
      logger.warning(req, 'get_my_documents', 'Failed to fetch committee past-meeting IDs, meeting items will not be committee-scoped', {
        committee_uid: committeeUid,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      return [] as V1PastMeetingQueryResult[];
    });

    return new Set(pastMeetings.map((m) => m.meeting_and_occurrence_id).filter(Boolean));
  }

  // ─── Foundation Name Resolution ─────────────────────────────────────────────

  /**
   * Resolves a batch of project UIDs to display names via the project service HTTP API.
   * Uses bounded parallelism (10 concurrent) to avoid overwhelming upstream.
   * UIDs that fail or return no name are silently omitted from the result map.
   */
  private async fetchProjectNames(req: Request, uids: string[]): Promise<Map<string, string>> {
    if (uids.length === 0) return new Map();

    logger.debug(req, 'get_my_documents', 'Resolving foundation names via project service', { uid_count: uids.length });

    const CONCURRENCY = 10;
    const nameMap = new Map<string, string>();

    for (let i = 0; i < uids.length; i += CONCURRENCY) {
      const batch = uids.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        batch.map((uid) =>
          this.microserviceProxy.proxyRequest<{ name: string }>(req, 'LFX_V2_SERVICE', `/projects/${uid}`, 'GET').catch((err) => {
            logger.debug(req, 'get_my_documents', 'Failed to fetch project name, skipping', {
              uid,
              error: err instanceof Error ? err.message : String(err),
            });
            return null;
          })
        )
      );
      batch.forEach((uid, j) => {
        const p = results[j];
        if (p?.name) nameMap.set(uid, p.name);
      });
    }

    return nameMap;
  }

  // ─── Meeting Enrichment ─────────────────────────────────────────────────────

  /**
   * Fetches meeting details (title, project_uid, project_name) for a set of meeting IDs
   * using bounded parallelism (10 concurrent requests) to avoid overwhelming upstream.
   * Returns a map of meeting_id → enrichment data; missing/failed IDs are silently omitted.
   */
  private async fetchMeetingDetails(req: Request, meetingIds: string[]): Promise<MeetingDetails> {
    const CONCURRENCY = 10;
    const map: MeetingDetails = new Map();

    for (let i = 0; i < meetingIds.length; i += CONCURRENCY) {
      const batch = meetingIds.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        batch.map((id) =>
          this.microserviceProxy.proxyRequest<{ title: string; project_uid: string }>(req, 'LFX_V2_SERVICE', `/itx/meetings/${id}`, 'GET').catch((err) => {
            logger.debug(req, 'fetch_meeting_details', 'Failed to fetch meeting details, skipping', {
              meeting_id: id,
              error: err instanceof Error ? err.message : String(err),
            });
            return null;
          })
        )
      );
      batch.forEach((id, j) => {
        const m = results[j];
        if (m?.title) map.set(id, m);
      });
    }

    return map;
  }

  // ─── Upcoming Meeting Attachments ───────────────────────────────────────────

  private async fetchRawMeetingAttachments(req: Request, projectUid?: string): Promise<MeetingAttachment[]> {
    logger.debug(req, 'get_my_documents', 'Fetching user meeting registrations for attachments');

    const email = getEffectiveEmail(req) ?? undefined;

    // Delegate registrant lookup to UserService which handles email+username dual lookup
    // with M2M tokens (required because registrant queries search across all participants
    // in the index and require application-level credentials)
    const meetingIds = await this.userService.getUserRegisteredMeetingIds(req, email).catch(() => new Set<string>());

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
        ...(projectUid && { tags: `project_uid:${projectUid}` }),
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
        foundationName: '',
        foundationUid: meeting?.project_uid || undefined,
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

  private async fetchRawPastMeetingAttachments(req: Request, occurrenceIds: string[], projectUid?: string): Promise<PastMeetingAttachment[]> {
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
        ...(projectUid && { tags: `project_uid:${projectUid}` }),
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
        foundationName: '',
        foundationUid: meeting?.project_uid || undefined,
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

  private async fetchRawPastMeetingRecordings(req: Request, occurrenceIds: string[], projectUid?: string): Promise<PastMeetingRecordingQueryResult[]> {
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
        ...(projectUid && { tags: `project_uid:${projectUid}` }),
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
        foundationName: '',
        foundationUid: meeting?.project_uid || undefined,
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

  private async fetchRawPastMeetingTranscripts(req: Request, occurrenceIds: string[], projectUid?: string): Promise<PastMeetingTranscriptQueryResult[]> {
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
        ...(projectUid && { tags: `project_uid:${projectUid}` }),
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
        foundationName: '',
        foundationUid: meeting?.project_uid || undefined,
        groupOrMeetingName: meeting?.title || '',
        groupOrMeetingUid: t.meeting_and_occurrence_id,
        date: t.start_time || t.created_at,
        url,
        pastMeetingId: t.meeting_and_occurrence_id,
      };
    });
  }

  // ─── Past Meeting Summaries ──────────────────────────────────────────────────

  private async fetchRawPastMeetingSummaries(req: Request, occurrenceIds: string[], projectUid?: string): Promise<PastMeetingSummaryQueryResult[]> {
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
        ...(projectUid && { tags: `project_uid:${projectUid}` }),
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
        foundationName: '',
        foundationUid: meeting?.project_uid || undefined,
        groupOrMeetingName: meeting?.title || '',
        groupOrMeetingUid: s.meeting_and_occurrence_id,
        date: s.summary_start_time || s.created_at,
        pastMeetingId: s.meeting_and_occurrence_id,
      };
    });
  }
}
