// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CreateMeetingRegistrantRequest, CreateMeetingRequest, UpdateMeetingRegistrantRequest, UpdateMeetingRequest } from '@lfx-pcc/shared/interfaces';
import { Request, Response } from 'express';

import { Logger } from '../helpers/logger';
import { Responder } from '../helpers/responder';
import { MeetingService } from '../services/meeting.service';

/**
 * Controller for handling meeting HTTP requests
 */
export class MeetingController {
  private meetingService: MeetingService = new MeetingService();

  /**
   * GET /meetings
   */
  public async getMeetings(req: Request, res: Response): Promise<void> {
    const startTime = Logger.start(req, 'get_meetings', {
      query_params: Logger.sanitize(req.query as Record<string, any>),
    });

    try {
      const meetings = await this.meetingService.getMeetings(req, req.query as Record<string, any>);

      Logger.success(req, 'get_meetings', startTime, {
        meeting_count: meetings.length,
      });

      res.json(meetings);
    } catch (error) {
      Logger.error(req, 'get_meetings', startTime, error);
      Responder.handle(res, error, 'get_meetings');
    }
  }

  /**
   * GET /meetings/:id
   */
  public async getMeetingById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const startTime = Logger.start(req, 'get_meeting_by_id', {
      meeting_id: id,
    });

    try {
      if (!id) {
        Logger.error(req, 'get_meeting_by_id', startTime, new Error('Missing meeting ID parameter'));

        Responder.badRequest(res, 'Meeting ID is required', {
          code: 'MISSING_MEETING_ID',
        });
        return;
      }

      const meeting = await this.meetingService.getMeetingById(req, id);

      Logger.success(req, 'get_meeting_by_id', startTime, {
        meeting_id: id,
        project_uid: meeting.project_uid,
        title: meeting.title,
      });

      res.json(meeting);
    } catch (error) {
      Logger.error(req, 'get_meeting_by_id', startTime, error, {
        meeting_id: id,
      });
      Responder.handle(res, error, 'get_meeting_by_id');
    }
  }

  /**
   * POST /meetings
   */
  public async createMeeting(req: Request, res: Response): Promise<void> {
    const meetingData: CreateMeetingRequest = req.body;
    const startTime = Logger.start(req, 'create_meeting', {
      project_uid: meetingData?.project_uid,
      title: meetingData?.title,
      start_time: meetingData?.start_time,
      duration: meetingData?.duration,
      timezone: meetingData?.timezone,
      body_size: JSON.stringify(req.body).length,
    });

    try {
      // Basic validation
      if (!meetingData.title || !meetingData.start_time || !meetingData.project_uid || !meetingData.duration || !meetingData.timezone) {
        Logger.error(req, 'create_meeting', startTime, new Error('Missing required fields for meeting creation'), {
          provided_fields: {
            has_title: !!meetingData.title,
            has_start_time: !!meetingData.start_time,
            has_project_uid: !!meetingData.project_uid,
            has_duration: !!meetingData.duration,
            has_timezone: !!meetingData.timezone,
          },
        });

        Responder.badRequest(res, 'Title, start_time, duration, timezone, and project_uid are required fields', {
          code: 'MISSING_REQUIRED_FIELDS',
        });
        return;
      }

      // Validate duration range
      if (meetingData.duration < 0 || meetingData.duration > 600) {
        Logger.error(req, 'create_meeting', startTime, new Error('Invalid duration for meeting creation'), {
          provided_duration: meetingData.duration,
        });

        Responder.badRequest(res, 'Duration must be between 0 and 600 minutes', {
          code: 'INVALID_DURATION',
        });
        return;
      }

      const meeting = await this.meetingService.createMeeting(req, meetingData);

      Logger.success(req, 'create_meeting', startTime, {
        meeting_id: meeting.uid,
        project_uid: meeting.project_uid,
        title: meeting.title,
      });

      res.status(201).json(meeting);
    } catch (error) {
      Logger.error(req, 'create_meeting', startTime, error, {
        project_uid: req.body?.project_uid,
      });
      Responder.handle(res, error, 'create_meeting');
    }
  }

  /**
   * PUT /meetings/:id
   */
  public async updateMeeting(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const meetingData: UpdateMeetingRequest = req.body;
    const { editType } = req.query;
    const startTime = Logger.start(req, 'update_meeting', {
      meeting_id: id,
      project_uid: meetingData?.project_uid,
      title: meetingData?.title,
      start_time: meetingData?.start_time,
      duration: meetingData?.duration,
      timezone: meetingData?.timezone,
      edit_type: editType,
      body_size: JSON.stringify(req.body).length,
    });

    try {
      if (!id) {
        Logger.error(req, 'update_meeting', startTime, new Error('Missing meeting ID parameter'));

        Responder.badRequest(res, 'Meeting ID is required', {
          code: 'MISSING_MEETING_ID',
        });
        return;
      }

      // Basic validation
      if (!meetingData.title || !meetingData.start_time || !meetingData.project_uid || !meetingData.duration || !meetingData.timezone) {
        Logger.error(req, 'update_meeting', startTime, new Error('Missing required fields for meeting update'), {
          provided_fields: {
            has_title: !!meetingData.title,
            has_start_time: !!meetingData.start_time,
            has_project_uid: !!meetingData.project_uid,
            has_duration: !!meetingData.duration,
            has_timezone: !!meetingData.timezone,
          },
        });

        Responder.badRequest(res, 'Title, start_time, duration, timezone, and project_uid are required fields', {
          code: 'MISSING_REQUIRED_FIELDS',
        });
        return;
      }

      // Validate duration range
      if (meetingData.duration < 0 || meetingData.duration > 600) {
        Logger.error(req, 'update_meeting', startTime, new Error('Invalid duration for meeting update'), {
          provided_duration: meetingData.duration,
        });

        Responder.badRequest(res, 'Duration must be between 0 and 600 minutes', {
          code: 'INVALID_DURATION',
        });
        return;
      }

      // Validate editType for recurring meetings
      if (editType && !['single', 'future'].includes(editType as string)) {
        Logger.error(req, 'update_meeting', startTime, new Error('Invalid edit type for meeting update'), {
          provided_edit_type: editType,
        });

        Responder.badRequest(res, 'Edit type must be "single" or "future"', {
          code: 'INVALID_EDIT_TYPE',
        });
        return;
      }

      const meeting = await this.meetingService.updateMeeting(req, id, meetingData, editType as 'single' | 'future');

      Logger.success(req, 'update_meeting', startTime, {
        meeting_id: id,
        project_uid: meeting.project_uid,
        title: meeting.title,
        edit_type: editType || 'single',
      });

      res.json(meeting);
    } catch (error) {
      Logger.error(req, 'update_meeting', startTime, error, {
        meeting_id: id,
        edit_type: editType,
      });
      Responder.handle(res, error, 'update_meeting');
    }
  }

  /**
   * DELETE /meetings/:id
   */
  public async deleteMeeting(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const startTime = Logger.start(req, 'delete_meeting', {
      meeting_id: id,
    });

    try {
      if (!id) {
        Logger.error(req, 'delete_meeting', startTime, new Error('Missing meeting ID parameter'));

        Responder.badRequest(res, 'Meeting ID is required', {
          code: 'MISSING_MEETING_ID',
        });
        return;
      }

      await this.meetingService.deleteMeeting(req, id);

      Logger.success(req, 'delete_meeting', startTime, {
        meeting_id: id,
        status_code: 204,
      });

      res.status(204).send();
    } catch (error) {
      Logger.error(req, 'delete_meeting', startTime, error, {
        meeting_id: id,
      });
      Responder.handle(res, error, 'delete_meeting');
    }
  }

  /**
   * GET /meetings/:uid/registrants
   */
  public async getMeetingRegistrants(req: Request, res: Response): Promise<void> {
    const { uid } = req.params;
    const startTime = Logger.start(req, 'get_meeting_registrants', {
      meeting_uid: uid,
    });

    try {
      if (!uid) {
        Logger.error(req, 'get_meeting_registrants', startTime, new Error('Missing meeting UID parameter'));

        Responder.badRequest(res, 'Meeting UID is required', {
          code: 'MISSING_MEETING_UID',
        });
        return;
      }

      const registrants = await this.meetingService.getMeetingRegistrants(req, uid);

      Logger.success(req, 'get_meeting_registrants', startTime, {
        meeting_uid: uid,
        registrant_count: registrants.length,
      });

      res.json(registrants);
    } catch (error) {
      Logger.error(req, 'get_meeting_registrants', startTime, error, {
        meeting_uid: uid,
      });
      Responder.handle(res, error, 'get_meeting_registrants');
    }
  }

  /**
   * POST /meetings/:uid/registrants
   */
  public async addMeetingRegistrant(req: Request, res: Response): Promise<void> {
    const { uid } = req.params;
    const registrantData: CreateMeetingRegistrantRequest = {
      ...req.body,
      meeting_uid: uid,
    };

    const startTime = Logger.start(req, 'add_meeting_registrant', {
      meeting_uid: uid,
      email: registrantData.email,
      host: registrantData.host || false,
      body_size: JSON.stringify(req.body).length,
    });

    try {
      if (!uid) {
        Logger.error(req, 'add_meeting_registrant', startTime, new Error('Missing meeting UID parameter'));

        Responder.badRequest(res, 'Meeting UID is required', {
          code: 'MISSING_MEETING_UID',
        });
        return;
      }

      // Basic validation
      if (!registrantData.email || !registrantData.first_name || !registrantData.last_name) {
        Logger.error(req, 'add_meeting_registrant', startTime, new Error('Missing required fields for registrant creation'), {
          provided_fields: {
            has_email: !!registrantData.email,
            has_first_name: !!registrantData.first_name,
            has_last_name: !!registrantData.last_name,
          },
        });

        Responder.badRequest(res, 'Email, first name, and last name are required', {
          code: 'MISSING_REQUIRED_FIELDS',
        });
        return;
      }

      const registrant = await this.meetingService.addMeetingRegistrant(req, registrantData);

      Logger.success(req, 'add_meeting_registrant', startTime, {
        meeting_uid: uid,
        registrant_uid: registrant.uid,
        email: registrant.email,
        host: registrant.host,
      });

      res.status(201).json(registrant);
    } catch (error) {
      Logger.error(req, 'add_meeting_registrant', startTime, error, {
        meeting_uid: uid,
        email: registrantData.email,
      });
      Responder.handle(res, error, 'add_meeting_registrant');
    }
  }

  /**
   * PUT /meetings/:uid/registrants/:registrantUid
   */
  public async updateMeetingRegistrant(req: Request, res: Response): Promise<void> {
    const { uid, registrantUid } = req.params;
    const updateData: UpdateMeetingRegistrantRequest = req.body;

    const startTime = Logger.start(req, 'update_meeting_registrant', {
      meeting_uid: uid,
      registrant_uid: registrantUid,
      body_size: JSON.stringify(req.body).length,
    });

    try {
      if (!uid) {
        Logger.error(req, 'update_meeting_registrant', startTime, new Error('Missing meeting UID parameter'));

        Responder.badRequest(res, 'Meeting UID is required', {
          code: 'MISSING_MEETING_UID',
        });
        return;
      }

      if (!registrantUid) {
        Logger.error(req, 'update_meeting_registrant', startTime, new Error('Missing registrant UID parameter'));

        Responder.badRequest(res, 'Registrant UID is required', {
          code: 'MISSING_REGISTRANT_UID',
        });
        return;
      }

      const updatedRegistrant = await this.meetingService.updateMeetingRegistrant(req, uid, registrantUid, updateData);

      Logger.success(req, 'update_meeting_registrant', startTime, {
        meeting_uid: uid,
        registrant_uid: registrantUid,
        email: updatedRegistrant.email,
      });

      res.json(updatedRegistrant);
    } catch (error) {
      Logger.error(req, 'update_meeting_registrant', startTime, error, {
        meeting_uid: uid,
        registrant_uid: registrantUid,
      });
      Responder.handle(res, error, 'update_meeting_registrant');
    }
  }

  /**
   * DELETE /meetings/:uid/registrants/:registrantUid
   */
  public async deleteMeetingRegistrant(req: Request, res: Response): Promise<void> {
    const { uid, registrantUid } = req.params;
    const startTime = Logger.start(req, 'delete_meeting_registrant', {
      meeting_uid: uid,
      registrant_uid: registrantUid,
    });

    try {
      if (!uid) {
        Logger.error(req, 'delete_meeting_registrant', startTime, new Error('Missing meeting UID parameter'));

        Responder.badRequest(res, 'Meeting UID is required', {
          code: 'MISSING_MEETING_UID',
        });
        return;
      }

      if (!registrantUid) {
        Logger.error(req, 'delete_meeting_registrant', startTime, new Error('Missing registrant UID parameter'));

        Responder.badRequest(res, 'Registrant UID is required', {
          code: 'MISSING_REGISTRANT_UID',
        });
        return;
      }

      await this.meetingService.deleteMeetingRegistrant(req, uid, registrantUid);

      Logger.success(req, 'delete_meeting_registrant', startTime, {
        meeting_uid: uid,
        registrant_uid: registrantUid,
        status_code: 204,
      });

      res.status(204).send();
    } catch (error) {
      Logger.error(req, 'delete_meeting_registrant', startTime, error, {
        meeting_uid: uid,
        registrant_uid: registrantUid,
      });
      Responder.handle(res, error, 'delete_meeting_registrant');
    }
  }
}
