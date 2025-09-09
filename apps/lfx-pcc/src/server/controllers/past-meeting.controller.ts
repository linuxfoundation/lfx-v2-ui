// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NextFunction, Request, Response } from 'express';

import { Logger } from '../helpers/logger';
import { validateUidParameter } from '../helpers/validation.helper';
import { MeetingService } from '../services/meeting.service';

/**
 * Controller for handling past meeting HTTP requests
 */
export class PastMeetingController {
  private meetingService: MeetingService = new MeetingService();

  /**
   * GET /past-meetings
   */
  public async getPastMeetings(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Logger.start(req, 'get_past_meetings', {
      query_params: Logger.sanitize(req.query as Record<string, any>),
    });

    try {
      // Get the past meetings using meetingType 'past_meeting'
      const meetings = await this.meetingService.getMeetings(req, req.query as Record<string, any>, 'past_meeting');

      // TODO: Remove this once we have a way to get the registrants count
      const counts = await Promise.all(
        meetings.map(async (m) => {
          const registrants = await this.meetingService.getMeetingRegistrants(req, m.uid);
          const committeeMembers = registrants.filter((r) => r.type === 'committee').length ?? 0;

          return {
            individual_registrants_count: registrants.length - committeeMembers,
            committee_members_count: committeeMembers,
          };
        })
      );

      meetings.forEach((m, i) => {
        m.individual_registrants_count = counts[i].individual_registrants_count;
        m.committee_members_count = counts[i].committee_members_count;
      });

      // Log the success
      Logger.success(req, 'get_past_meetings', startTime, {
        meeting_count: meetings.length,
      });

      // Send the meetings data to the client
      res.json(meetings);
    } catch (error) {
      // Log the error
      Logger.error(req, 'get_past_meetings', startTime, error);
      next(error);
    }
  }

  /**
   * GET /past-meetings/:uid
   */
  public async getPastMeetingById(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { uid } = req.params;
    const startTime = Logger.start(req, 'get_past_meeting_by_id', {
      meeting_uid: uid,
    });

    try {
      // Check if the meeting UID is provided
      if (
        !validateUidParameter(uid, req, next, {
          operation: 'get_past_meeting_by_id',
          service: 'past_meeting_controller',
          logStartTime: startTime,
        })
      ) {
        return;
      }

      // Get the past meeting by ID using meetingType 'past_meeting'
      const meeting = await this.meetingService.getMeetingById(req, uid, 'past_meeting');

      // Log the success
      Logger.success(req, 'get_past_meeting_by_id', startTime, {
        meeting_uid: uid,
        project_uid: meeting.project_uid,
        title: meeting.title,
      });

      // TODO: Remove this once we have a way to get the registrants count
      try {
        const registrants = await this.meetingService.getMeetingRegistrants(req, meeting.uid);
        const committeeMembers = registrants.filter((r) => r.type === 'committee').length ?? 0;

        meeting.individual_registrants_count = registrants.length - committeeMembers;
        meeting.committee_members_count = committeeMembers;
      } catch (error) {
        // Log the error
        Logger.error(req, 'get_past_meeting_by_id', startTime, error, {
          meeting_uid: uid,
        });
      }

      // Send the meeting data to the client
      res.json(meeting);
    } catch (error) {
      // Log the error
      Logger.error(req, 'get_past_meeting_by_id', startTime, error, {
        meeting_uid: uid,
      });

      // Send the error to the next middleware
      next(error);
    }
  }
}
