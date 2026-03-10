// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { isDevMode } from '@angular/core';
import { API_CLIENT_INTERNAL_COMMITTEE_UID, getMockCommitteeActivity, getMockCommitteeChannels, getMockCommitteeEvents, MOCK_COMMITTEE_UID } from '@mock-data';
import { map, of } from 'rxjs';

/**
 * Dev-only HTTP interceptor that injects mock data for endpoints not yet backed
 * by real data (activity, events, channels) and applies dev-only UID corrections
 * to real API responses.
 *
 * Also patches meeting responses to replace the api_client_service internal committee
 * UUID with the external UUID so the client-side committee filter can match.
 *
 * Uses isDevMode() as a guard — compiles out of production builds when the interceptor
 * is excluded from the provider array via the environment.production check in app.config.ts.
 */
export const devMockInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isDevMode()) {
    return next(req);
  }

  // Only intercept GET requests to /api/
  if (req.method !== 'GET' || !req.url.startsWith('/api/')) {
    return next(req);
  }

  // GET /api/committees/<uid>/activity → return mock activity items
  const committeeActivityMatch = req.url.match(/\/api\/committees\/([^/]+)\/activity/);
  if (committeeActivityMatch) {
    const activity = getMockCommitteeActivity(committeeActivityMatch[1]);
    if (activity.length > 0) {
      return of(new HttpResponse({ status: 200, body: activity }));
    }
    return next(req);
  }

  // GET /api/committees/<uid>/events → return mock events
  const committeeEventsMatch = req.url.match(/\/api\/committees\/([^/]+)\/events/);
  if (committeeEventsMatch) {
    const events = getMockCommitteeEvents(committeeEventsMatch[1]);
    if (events.length > 0) {
      return of(new HttpResponse({ status: 200, body: events }));
    }
    return next(req);
  }

  // GET /api/committees/<uid> (not a sub-resource) → pass through and merge channel data
  const committeeByIdMatch = req.url.match(/\/api\/committees\/([^/?]+)$/);
  if (committeeByIdMatch) {
    const committeeId = committeeByIdMatch[1];
    const channels = getMockCommitteeChannels(committeeId);
    if (channels) {
      return next(req).pipe(
        map((event) => {
          if (event instanceof HttpResponse && event.body) {
            return event.clone({ body: { ...event.body, ...channels } });
          }
          return event;
        })
      );
    }
  }

  // GET /api/meetings → patch meetings response to replace api_client_service internal
  // committee UUID with the external UUID so client-side filtering works correctly.
  // api_client_service assigns its own internal UUID when storing meeting-committee links;
  // this is a dev-only correction so real meeting data surfaces on the committee page.
  if (req.url.startsWith('/api/meetings')) {
    return next(req).pipe(
      map((event) => {
        if (!(event instanceof HttpResponse) || !event.body) return event;

        const body = event.body as any;
        const meetings: any[] = Array.isArray(body) ? body : (body?.data ?? []);

        if (meetings.length === 0) return event;

        const patched = meetings.map((meeting: any) => {
          // Case 1: meetings from api_client_service use a singular `committee` string field
          // (not a `committees` array). Normalize it into the array shape the component expects.
          if (typeof meeting.committee === 'string' && !meeting.committees?.length) {
            const normalizedUid = meeting.committee === API_CLIENT_INTERNAL_COMMITTEE_UID ? MOCK_COMMITTEE_UID : meeting.committee;
            return { ...meeting, committees: [{ uid: normalizedUid }] };
          }
          // Case 2: meetings that already have a `committees` array — patch the internal UID.
          if (meeting.committees?.length) {
            const fixedCommittees = meeting.committees.map((c: any) =>
              c.uid === API_CLIENT_INTERNAL_COMMITTEE_UID ? { ...c, uid: MOCK_COMMITTEE_UID } : c
            );
            return { ...meeting, committees: fixedCommittees };
          }
          return meeting;
        });

        const patchedBody = Array.isArray(body) ? patched : { ...body, data: patched };
        return event.clone({ body: patchedBody });
      })
    );
  }

  return next(req);
};
