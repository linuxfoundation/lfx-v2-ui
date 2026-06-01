// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type {
  GetOrgEventsOptions,
  OrgEvent,
  OrgEventAttendee,
  OrgEventAttendeesResponse,
  OrgEventSpeaker,
  OrgEventSpeakersResponse,
  OrgEventsResponse,
  OrgEventsSummary,
} from '@lfx-one/shared/interfaces';
import { formatDateToUTC } from '@lfx-one/shared/utils';
import type { Request } from 'express';

import { logger } from './logger.service';
import { SnowflakeService } from './snowflake.service';

/** Raw row returned by the org upcoming/past events Snowflake query. */
interface OrgEventRow {
  EVENT_ID: string;
  EVENT_NAME: string;
  FOUNDATION: string | null;
  EVENT_START_DATE: Date | string | null;
  EVENT_END_DATE: Date | string | null;
  EVENT_LOCATION: string | null;
  EVENT_CITY: string | null;
  EVENT_COUNTRY: string | null;
  EVENT_URL: string | null;
  EVENT_REGISTRATION_URL: string | null;
  ORG_ATTENDEE_COUNT: number;
  TOTAL_ATTENDEE_COUNT: number | null;
  ORG_SPEAKER_ACCEPTED_COUNT: number;
  ORG_SPEAKER_SUBMITTED_COUNT: number;
  IS_ORG_SPONSOR: boolean;
  IS_REGISTERED: boolean;
  TOTAL_RECORDS: number;
}

/** Service for org-lens event list endpoints — queries org employees' event footprint via Snowflake. */
export class OrgLensEventsService {
  private readonly snowflakeService: SnowflakeService;

  public constructor() {
    this.snowflakeService = SnowflakeService.getInstance();
  }

  /** GET /api/orgs/:accountId/lens/events — paginated list of events for the org. */
  public async getOrgEvents(req: Request, accountId: string, userEmail: string, options: GetOrgEventsOptions): Promise<OrgEventsResponse> {
    const { isPast, searchQuery, status, pageSize, offset, sortOrder } = options;

    logger.debug(req, 'get_org_lens_events', 'Building org events query', {
      account_id: accountId,
      is_past: isPast,
      has_search: !!searchQuery,
      status,
      page_size: pageSize,
      offset,
    });

    const searchQueryFilter = searchQuery ? 'AND o.EVENT_NAME ILIKE ?' : '';
    let statusFilter = '';
    if (status === 'registered') {
      statusFilter = 'AND u.EVENT_ID IS NOT NULL';
    } else if (status === 'speaker-submitted') {
      statusFilter = 'AND COALESCE(oss.ORG_SPEAKER_SUBMITTED_COUNT, 0) > 0';
    } else if (status === 'speaker-accepted') {
      statusFilter = 'AND o.ORG_SPEAKER_ACCEPTED_COUNT > 0';
    } else if (status === 'event-sponsor') {
      statusFilter = 'AND o.IS_ORG_SPONSOR = 1';
    }

    // Use date comparison for ORG_PEOPLE_EVENTS (which has no IS_PAST_EVENT column)
    const eventDateCondition = isPast ? 'ope.EVENT_END_DATE < CURRENT_DATE()' : 'ope.EVENT_END_DATE >= CURRENT_DATE()';

    const sql = `
      WITH
      -- Primary event discovery: ACCOUNT_ID-based via ORG_PEOPLE_EVENTS (same source as myorg)
      org_pe AS (
        SELECT DISTINCT ope.EVENT_ID
        FROM ANALYTICS.PLATINUM_LFX_ONE.ORG_PEOPLE_EVENTS ope
        WHERE ope.ACCOUNT_ID = ?
          AND ${eventDateCondition}
      ),
      -- Org employee emails for org-specific attendee/speaker counting
      org_emails AS (
        SELECT DISTINCT UPPER(EMAIL) AS EMAIL
        FROM ANALYTICS.PLATINUM_LFX_ONE.ORG_PEOPLE_ALL
        WHERE ACCOUNT_ID = ?
      ),
      -- Canonical account names for sponsor detection fallback
      account AS (
        SELECT ACCOUNT_NAME
        FROM ANALYTICS.PLATINUM_LFX_ONE.ORG_LENS_ACCOUNT_CONTEXT
        WHERE ACCOUNT_ID = ?
      ),
      -- Event metrics from EVENT_REGISTRATIONS scoped to org's event IDs
      org_events AS (
        SELECT
          er.EVENT_ID,
          MAX(er.EVENT_NAME) AS EVENT_NAME,
          MAX(er.PROJECT_NAME) AS FOUNDATION,
          MAX(er.EVENT_START_DATE) AS EVENT_START_DATE,
          MAX(er.EVENT_END_DATE) AS EVENT_END_DATE,
          MAX(er.EVENT_LOCATION) AS EVENT_LOCATION,
          MAX(er.EVENT_CITY) AS EVENT_CITY,
          MAX(er.EVENT_COUNTRY) AS EVENT_COUNTRY,
          MAX(er.EVENT_URL) AS EVENT_URL,
          MAX(er.EVENT_REGISTRATION_URL) AS EVENT_REGISTRATION_URL,
          COUNT(DISTINCT CASE WHEN UPPER(er.USER_EMAIL) IN (SELECT EMAIL FROM org_emails) AND er.REGISTRATION_STATUS = 'Accepted' THEN er.USER_EMAIL END) AS ORG_ATTENDEE_COUNT,
          COUNT(DISTINCT CASE WHEN UPPER(er.USER_EMAIL) IN (SELECT EMAIL FROM org_emails) AND er.USER_ROLE = 'Speaker' AND er.REGISTRATION_STATUS = 'Accepted' THEN er.USER_EMAIL END) AS ORG_SPEAKER_ACCEPTED_COUNT,
          MAX(CASE WHEN er.USER_ROLE = 'Sponsor' AND er.REGISTRATION_STATUS NOT IN ('Cancelled', 'Declined', 'Rejected') AND (UPPER(er.USER_EMAIL) IN (SELECT EMAIL FROM org_emails) OR UPPER(er.ACCOUNT_NAME) IN (SELECT UPPER(a.ACCOUNT_NAME) FROM account a)) THEN 1 ELSE 0 END) AS IS_ORG_SPONSOR
        FROM ANALYTICS.PLATINUM_LFX_ONE.EVENT_REGISTRATIONS er
        WHERE er.EVENT_ID IN (SELECT EVENT_ID FROM org_pe)
        GROUP BY er.EVENT_ID
      ),
      org_speaker_submissions AS (
        SELECT er.EVENT_ID, COUNT(DISTINCT er.USER_EMAIL) AS ORG_SPEAKER_SUBMITTED_COUNT
        FROM ANALYTICS.PLATINUM_LFX_ONE.EVENT_REGISTRATIONS er
        WHERE er.EVENT_ID IN (SELECT EVENT_ID FROM org_pe)
          AND er.USER_ROLE = 'Speaker'
          AND er.REGISTRATION_STATUS NOT IN ('Cancelled', 'Declined', 'Rejected')
          AND (
            UPPER(er.USER_EMAIL) IN (SELECT EMAIL FROM org_emails)
            OR UPPER(er.ACCOUNT_NAME) IN (SELECT UPPER(a.ACCOUNT_NAME) FROM account a)
          )
        GROUP BY er.EVENT_ID
      ),
      user_reg AS (
        SELECT EVENT_ID
        FROM ANALYTICS.PLATINUM_LFX_ONE.EVENT_REGISTRATIONS
        WHERE USER_EMAIL = ?
          AND REGISTRATION_STATUS = 'Accepted'
          AND EVENT_ID IN (SELECT EVENT_ID FROM org_pe)
      )
      SELECT
        o.EVENT_ID,
        o.EVENT_NAME,
        o.FOUNDATION,
        o.EVENT_START_DATE,
        o.EVENT_END_DATE,
        o.EVENT_LOCATION,
        o.EVENT_CITY,
        o.EVENT_COUNTRY,
        o.EVENT_URL,
        o.EVENT_REGISTRATION_URL,
        o.ORG_ATTENDEE_COUNT,
        NULLIF(ph.EVENT_REGISTRATIONS_GOAL, 0) AS TOTAL_ATTENDEE_COUNT,
        o.ORG_SPEAKER_ACCEPTED_COUNT,
        COALESCE(oss.ORG_SPEAKER_SUBMITTED_COUNT, 0) AS ORG_SPEAKER_SUBMITTED_COUNT,
        (o.IS_ORG_SPONSOR = 1) AS IS_ORG_SPONSOR,
        (u.EVENT_ID IS NOT NULL) AS IS_REGISTERED,
        COUNT(*) OVER() AS TOTAL_RECORDS
      FROM org_events o
      LEFT JOIN ANALYTICS.GOLD_REPORTING.PROJECT_HEALTH_EVENTS ph ON o.EVENT_ID = ph.EVENT_ID
      LEFT JOIN org_speaker_submissions oss ON o.EVENT_ID = oss.EVENT_ID
      LEFT JOIN user_reg u ON o.EVENT_ID = u.EVENT_ID
      WHERE 1=1
        ${searchQueryFilter}
        ${statusFilter}
      ORDER BY o.EVENT_START_DATE ${sortOrder}
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const binds: string[] = [accountId, accountId, accountId, userEmail];
    if (searchQuery) binds.push(`%${searchQuery}%`);

    let result;
    try {
      result = await this.snowflakeService.execute<OrgEventRow>(sql, binds);
    } catch (error) {
      logger.warning(req, 'get_org_lens_events', 'Snowflake query failed, returning empty events', {
        error: error instanceof Error ? error.message : String(error),
        account_id: accountId,
      });
      return { data: [], total: 0, pageSize, offset };
    }

    const total = result.rows.length > 0 ? result.rows[0].TOTAL_RECORDS : 0;
    const data = result.rows.map((row) => this.mapRowToOrgEvent(row));

    logger.debug(req, 'get_org_lens_events', 'Fetched org events', { count: data.length, total });

    return { data, total, pageSize, offset };
  }

  /** GET /api/orgs/:accountId/lens/events/summary — org-wide total / past / upcoming / registered counts for the stat strip. */
  public async getOrgEventsSummary(req: Request, accountId: string, userEmail: string): Promise<OrgEventsSummary> {
    logger.debug(req, 'get_org_lens_events_summary', 'Building org events summary query', { account_id: accountId });

    const sql = `
      WITH
      -- Use ORG_PEOPLE_EVENTS (ACCOUNT_ID-based) for consistent event counts across all views
      org_events AS (
        SELECT DISTINCT
          ope.EVENT_ID,
          CASE WHEN ope.EVENT_END_DATE < CURRENT_DATE() THEN TRUE ELSE FALSE END AS IS_PAST_EVENT
        FROM ANALYTICS.PLATINUM_LFX_ONE.ORG_PEOPLE_EVENTS ope
        WHERE ope.ACCOUNT_ID = ?
      ),
      user_upcoming_regs AS (
        SELECT DISTINCT er.EVENT_ID
        FROM ANALYTICS.PLATINUM_LFX_ONE.EVENT_REGISTRATIONS er
        WHERE er.USER_EMAIL = ?
          AND er.REGISTRATION_STATUS = 'Accepted'
          AND er.EVENT_ID IN (SELECT EVENT_ID FROM org_events WHERE IS_PAST_EVENT = FALSE)
      )
      SELECT
        COUNT(DISTINCT oe.EVENT_ID)                                                                               AS TOTAL_EVENTS,
        COUNT(DISTINCT CASE WHEN oe.IS_PAST_EVENT = TRUE  THEN oe.EVENT_ID END)                                  AS PAST_EVENTS,
        COUNT(DISTINCT CASE WHEN oe.IS_PAST_EVENT = FALSE THEN oe.EVENT_ID END)                                  AS UPCOMING_EVENTS,
        COUNT(DISTINCT CASE WHEN oe.IS_PAST_EVENT = FALSE AND uur.EVENT_ID IS NOT NULL THEN oe.EVENT_ID END)     AS REGISTERED_EVENTS
      FROM org_events oe
      LEFT JOIN user_upcoming_regs uur ON oe.EVENT_ID = uur.EVENT_ID
    `;

    interface SummaryRow {
      TOTAL_EVENTS: number;
      PAST_EVENTS: number;
      UPCOMING_EVENTS: number;
      REGISTERED_EVENTS: number;
    }

    let result;
    try {
      result = await this.snowflakeService.execute<SummaryRow>(sql, [accountId, userEmail]);
    } catch (error) {
      logger.warning(req, 'get_org_lens_events_summary', 'Snowflake query failed, returning zero counts', {
        error: error instanceof Error ? error.message : String(error),
        account_id: accountId,
      });
      return { totalEvents: 0, pastEvents: 0, upcomingEvents: 0, registeredEvents: 0 };
    }

    const row = result.rows[0];
    const summary: OrgEventsSummary = {
      totalEvents: row?.TOTAL_EVENTS ?? 0,
      pastEvents: row?.PAST_EVENTS ?? 0,
      upcomingEvents: row?.UPCOMING_EVENTS ?? 0,
      registeredEvents: row?.REGISTERED_EVENTS ?? 0,
    };

    logger.debug(req, 'get_org_lens_events_summary', 'Fetched org events summary', { ...summary });

    return summary;
  }

  /** GET /api/orgs/:accountId/lens/events/:eventId/attendees — org employees registered for a specific event. */
  public async getEventAttendees(req: Request, accountId: string, eventId: string, searchQuery?: string): Promise<OrgEventAttendeesResponse> {
    logger.debug(req, 'get_event_attendees', 'Fetching event attendees', { account_id: accountId, event_id: eventId });

    const searchFilter = searchQuery ? 'AND (UPPER(COALESCE(p.NAME, er.USER_EMAIL)) LIKE UPPER(?) OR UPPER(er.USER_EMAIL) LIKE UPPER(?))' : '';

    const sql = `
      WITH account AS (
        SELECT ACCOUNT_NAME
        FROM ANALYTICS.PLATINUM_LFX_ONE.ORG_LENS_ACCOUNT_CONTEXT
        WHERE ACCOUNT_ID = ?
      )
      SELECT
        er.USER_EMAIL                         AS CONTACT_ID,
        COALESCE(p.NAME, er.USER_EMAIL)       AS NAME,
        p.TITLE                               AS JOB_TITLE,
        MAX(er.EVENT_NAME)                    AS EVENT_NAME
      FROM ANALYTICS.PLATINUM_LFX_ONE.EVENT_REGISTRATIONS er
      JOIN account a ON UPPER(er.ACCOUNT_NAME) = UPPER(a.ACCOUNT_NAME)
      LEFT JOIN ANALYTICS.PLATINUM_LFX_ONE.ORG_PEOPLE_ALL p
        ON UPPER(p.EMAIL) = UPPER(er.USER_EMAIL) AND p.ACCOUNT_ID = ?
      WHERE er.EVENT_ID = ?
        AND er.REGISTRATION_STATUS = 'Accepted'
        ${searchFilter}
      GROUP BY er.USER_EMAIL, COALESCE(p.NAME, er.USER_EMAIL), p.TITLE
      ORDER BY NAME ASC NULLS LAST
    `;

    const binds: string[] = [accountId, accountId, eventId];
    if (searchQuery) {
      binds.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }

    interface AttendeeRow {
      CONTACT_ID: string;
      NAME: string | null;
      JOB_TITLE: string | null;
      EVENT_NAME: string | null;
    }

    let result;
    try {
      result = await this.snowflakeService.execute<AttendeeRow>(sql, binds);
    } catch (error) {
      logger.warning(req, 'get_event_attendees', 'Snowflake query failed, returning empty attendees', {
        error: error instanceof Error ? error.message : String(error),
        account_id: accountId,
        event_id: eventId,
      });
      return { eventId, eventName: '', total: 0, data: [] };
    }

    const eventName = result.rows[0]?.EVENT_NAME ?? '';
    const data: OrgEventAttendee[] = result.rows.map((row) => ({
      contactId: row.CONTACT_ID,
      name: row.NAME ?? row.CONTACT_ID,
      jobTitle: row.JOB_TITLE ?? null,
    }));

    logger.debug(req, 'get_event_attendees', 'Fetched event attendees', { count: data.length, event_id: eventId });

    return { eventId, eventName, total: data.length, data };
  }

  /** GET /api/orgs/:accountId/lens/events/:eventId/speakers — org speakers (accepted + submitted) for a specific event. */
  public async getEventSpeakers(req: Request, accountId: string, eventId: string, searchQuery?: string): Promise<OrgEventSpeakersResponse> {
    logger.debug(req, 'get_event_speakers', 'Fetching event speakers', { account_id: accountId, event_id: eventId });

    const searchFilter = searchQuery ? 'AND (UPPER(COALESCE(p.NAME, er.USER_EMAIL)) LIKE UPPER(?) OR UPPER(er.USER_EMAIL) LIKE UPPER(?))' : '';

    const sql = `
      WITH account AS (
        SELECT ACCOUNT_NAME
        FROM ANALYTICS.PLATINUM_LFX_ONE.ORG_LENS_ACCOUNT_CONTEXT
        WHERE ACCOUNT_ID = ?
      ),
      org_emails AS (
        SELECT DISTINCT UPPER(EMAIL) AS EMAIL
        FROM ANALYTICS.PLATINUM_LFX_ONE.ORG_PEOPLE_ALL
        WHERE ACCOUNT_ID = ?
      )
      SELECT
        er.USER_EMAIL                           AS CONTACT_ID,
        COALESCE(p.NAME, er.USER_EMAIL)         AS NAME,
        p.TITLE                                 AS JOB_TITLE,
        er.REGISTRATION_STATUS                  AS STATUS,
        MAX(er.EVENT_NAME)                      AS EVENT_NAME
      FROM ANALYTICS.PLATINUM_LFX_ONE.EVENT_REGISTRATIONS er
      LEFT JOIN ANALYTICS.PLATINUM_LFX_ONE.ORG_PEOPLE_ALL p
        ON UPPER(p.EMAIL) = UPPER(er.USER_EMAIL) AND p.ACCOUNT_ID = ?
      WHERE er.EVENT_ID = ?
        AND er.USER_ROLE = 'Speaker'
        AND er.REGISTRATION_STATUS NOT IN ('Cancelled', 'Declined', 'Rejected')
        AND (
          UPPER(er.USER_EMAIL) IN (SELECT EMAIL FROM org_emails)
          OR UPPER(er.ACCOUNT_NAME) IN (SELECT UPPER(a.ACCOUNT_NAME) FROM account a)
        )
        ${searchFilter}
      GROUP BY
        er.USER_EMAIL,
        COALESCE(p.NAME, er.USER_EMAIL),
        p.TITLE,
        er.REGISTRATION_STATUS
      ORDER BY NAME ASC NULLS LAST
    `;

    const binds: string[] = [accountId, accountId, accountId, eventId];
    if (searchQuery) {
      binds.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }

    interface SpeakerRow {
      CONTACT_ID: string;
      NAME: string | null;
      JOB_TITLE: string | null;
      STATUS: string;
      EVENT_NAME: string | null;
    }

    let result;
    try {
      result = await this.snowflakeService.execute<SpeakerRow>(sql, binds);
    } catch (error) {
      logger.warning(req, 'get_event_speakers', 'Snowflake query failed, returning empty speakers', {
        error: error instanceof Error ? error.message : String(error),
        account_id: accountId,
        event_id: eventId,
      });
      return { eventId, eventName: '', acceptedCount: 0, submittedCount: 0, data: [] };
    }

    const eventName = result.rows[0]?.EVENT_NAME ?? '';
    const data: OrgEventSpeaker[] = result.rows.map((row) => ({
      contactId: row.CONTACT_ID,
      name: row.NAME ?? row.CONTACT_ID,
      jobTitle: row.JOB_TITLE ?? null,
      status: row.STATUS === 'Accepted' ? 'ACCEPTED' : 'SUBMITTED',
    }));

    const acceptedCount = data.filter((s) => s.status === 'ACCEPTED').length;
    const submittedCount = data.length;

    logger.debug(req, 'get_event_speakers', 'Fetched event speakers', { accepted: acceptedCount, submitted: submittedCount, event_id: eventId });

    return { eventId, eventName, acceptedCount, submittedCount, data };
  }

  private mapRowToOrgEvent(row: OrgEventRow): OrgEvent {
    return {
      eventId: row.EVENT_ID,
      eventName: row.EVENT_NAME,
      foundation: row.FOUNDATION ?? null,
      eventStartDate: formatDateToUTC(row.EVENT_START_DATE),
      eventEndDate: row.EVENT_END_DATE ? formatDateToUTC(row.EVENT_END_DATE) : null,
      eventLocation: row.EVENT_LOCATION ?? null,
      eventCity: row.EVENT_CITY ?? null,
      eventCountry: row.EVENT_COUNTRY ?? null,
      eventUrl: row.EVENT_URL ?? null,
      eventRegistrationUrl: row.EVENT_REGISTRATION_URL ?? null,
      orgAttendeeCount: row.ORG_ATTENDEE_COUNT || 0,
      totalAttendeeCount: row.TOTAL_ATTENDEE_COUNT ?? null,
      orgSpeakerAcceptedCount: row.ORG_SPEAKER_ACCEPTED_COUNT || 0,
      orgSpeakerSubmittedCount: row.ORG_SPEAKER_SUBMITTED_COUNT || 0,
      isOrgSponsor: !!row.IS_ORG_SPONSOR,
      isRegistered: !!row.IS_REGISTERED,
    };
  }
}
