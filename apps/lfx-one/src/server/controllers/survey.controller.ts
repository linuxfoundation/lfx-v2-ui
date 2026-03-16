// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { SurveyCreateData } from '@lfx-one/shared/interfaces';
import { NextFunction, Request, Response } from 'express';

import { ServiceValidationError } from '../errors';
import { validateUidParameter } from '../helpers/validation.helper';
import { logger } from '../services/logger.service';
import { SurveyService } from '../services/survey.service';

/**
 * Controller for handling survey HTTP requests
 */
export class SurveyController {
  private surveyService: SurveyService = new SurveyService();

  /**
   * GET /surveys
   */
  public async getSurveys(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'get_surveys', {
      query_params: logger.sanitize(req.query as Record<string, any>),
    });

    try {
      const surveys = await this.surveyService.getSurveys(req, req.query as Record<string, any>);

      logger.success(req, 'get_surveys', startTime, {
        survey_count: surveys.length,
      });

      res.json(surveys);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /surveys/:uid
   */
  public async getSurveyById(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { uid } = req.params;
    const startTime = logger.startOperation(req, 'get_survey_by_id', {
      survey_uid: uid,
    });

    try {
      if (
        !validateUidParameter(uid, req, next, {
          operation: 'get_survey_by_id',
          service: 'survey_controller',
        })
      ) {
        return;
      }

      const projectId = req.query['project_id'] as string | undefined;
      const survey = await this.surveyService.getSurveyById(req, uid, projectId);

      logger.success(req, 'get_survey_by_id', startTime, {
        survey_uid: uid,
        title: survey.survey_title,
      });

      res.json(survey);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /surveys
   */
  public async createSurvey(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'create_survey', {});

    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const surveyTitle = body['survey_title'];

      if (typeof surveyTitle !== 'string' || !surveyTitle.trim()) {
        const validationError = ServiceValidationError.forField('survey_title', 'Survey title is required', {
          operation: 'create_survey',
          service: 'survey_controller',
          path: req.path,
        });
        next(validationError);
        return;
      }

      const createData: SurveyCreateData = {
        survey_title: surveyTitle.trim(),
        ...(body['survey_monkey_id'] !== undefined && { survey_monkey_id: body['survey_monkey_id'] as string }),
        ...(body['is_project_survey'] !== undefined && { is_project_survey: body['is_project_survey'] as boolean }),
        ...(body['stage_filter'] !== undefined && { stage_filter: body['stage_filter'] as string }),
        ...(body['send_immediately'] !== undefined && { send_immediately: body['send_immediately'] as boolean }),
        ...(body['survey_send_date'] !== undefined && { survey_send_date: body['survey_send_date'] as string }),
        ...(body['survey_cutoff_date'] !== undefined && { survey_cutoff_date: body['survey_cutoff_date'] as string }),
        ...(body['survey_reminder_rate_days'] !== undefined && { survey_reminder_rate_days: body['survey_reminder_rate_days'] as number }),
        ...(body['email_subject'] !== undefined && { email_subject: body['email_subject'] as string }),
        ...(body['email_body'] !== undefined && { email_body: body['email_body'] as string }),
        ...(body['email_body_text'] !== undefined && { email_body_text: body['email_body_text'] as string }),
        ...(body['committees'] !== undefined && { committees: body['committees'] as string[] }),
        ...(body['committee_voting_enabled'] !== undefined && { committee_voting_enabled: body['committee_voting_enabled'] as boolean }),
      };

      const survey = await this.surveyService.createSurvey(req, createData);

      logger.success(req, 'create_survey', startTime, { survey_uid: survey.uid });
      res.status(201).json(survey);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /surveys/:uid
   */
  public async deleteSurvey(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { uid } = req.params;
    const startTime = logger.startOperation(req, 'delete_survey', {
      survey_uid: uid,
    });

    try {
      if (
        !validateUidParameter(uid, req, next, {
          operation: 'delete_survey',
          service: 'survey_controller',
        })
      ) {
        return;
      }

      await this.surveyService.deleteSurvey(req, uid);

      logger.success(req, 'delete_survey', startTime, {
        survey_uid: uid,
        status_code: 204,
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
