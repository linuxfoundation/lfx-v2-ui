// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { MailingListAudienceAccess, MailingListMemberDeliveryMode, MailingListMemberModStatus, MailingListMemberType } from '@lfx-one/shared/enums';
import { CreateMailingListMemberRequest, PublicMailingListSubscribeRequest, PublicMailingListSubscribeResponse } from '@lfx-one/shared/interfaces';
import { NextFunction, Request, Response } from 'express';

import { ServiceValidationError } from '../errors';
import { AuthorizationError } from '../errors/authentication.error';
import { validateUidParameter } from '../helpers/validation.helper';
import { logger } from '../services/logger.service';
import { MailingListService } from '../services/mailing-list.service';
import { generateM2MToken } from '../utils/m2m-token.util';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Controller for handling public mailing list subscribe requests (no authentication required)
 */
export class PublicMailingListController {
  private mailingListService: MailingListService = new MailingListService();

  /**
   * POST /public/api/mailing-lists/:id/subscribe
   * Subscribes a user to a public mailing list without requiring authentication
   */
  public async subscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;

    const startTime = logger.startOperation(req, 'subscribe_to_public_mailing_list', {
      mailing_list_id: id,
    });

    try {
      // Validate mailing list ID
      if (
        !validateUidParameter(id, req, next, {
          operation: 'subscribe_to_public_mailing_list',
          service: 'public_mailing_list_controller',
        })
      ) {
        return;
      }

      // Validate request body
      const body: PublicMailingListSubscribeRequest = req.body;

      if (!body.email || !EMAIL_REGEX.test(body.email.trim())) {
        const validationError = ServiceValidationError.forField('email', 'A valid email address is required', {
          operation: 'subscribe_to_public_mailing_list',
          service: 'public_mailing_list_controller',
          path: req.path,
        });
        return next(validationError);
      }

      const email = body.email.trim().toLowerCase();
      const firstName = body.first_name?.trim() || undefined;
      const lastName = body.last_name?.trim() || undefined;

      // Generate M2M token for server-to-server API calls
      const m2mToken = await this.setupM2MToken(req);

      // Fetch the mailing list to validate it exists and is public
      let mailingList;
      try {
        mailingList = await this.mailingListService.getMailingListById(req, id);
      } catch {
        // Don't reveal whether the list exists or not for non-public lists
        const authError = new AuthorizationError('This mailing list is not found or is not accepting public subscriptions', {
          operation: 'subscribe_to_public_mailing_list',
          service: 'public_mailing_list_controller',
          path: req.path,
        });
        return next(authError);
      }

      // Validate the mailing list has public audience access
      if (mailingList.audience_access !== MailingListAudienceAccess.PUBLIC) {
        const authError = new AuthorizationError('This mailing list is not found or is not accepting public subscriptions', {
          operation: 'subscribe_to_public_mailing_list',
          service: 'public_mailing_list_controller',
          path: req.path,
        });
        return next(authError);
      }

      // Build the member creation payload
      const memberData: CreateMailingListMemberRequest = {
        email,
        first_name: firstName,
        last_name: lastName,
        member_type: MailingListMemberType.DIRECT,
        delivery_mode: MailingListMemberDeliveryMode.NORMAL,
        mod_status: MailingListMemberModStatus.NONE,
      };

      // Restore M2M token (getMailingListById may have overwritten it via access check)
      req.bearerToken = m2mToken;

      // Create the member
      await this.mailingListService.createMember(req, id, memberData);

      const response: PublicMailingListSubscribeResponse = {
        success: true,
        message: 'You have been subscribed. A confirmation email may be sent by Groups.io.',
        mailing_list_title: mailingList.title || mailingList.group_name,
      };

      logger.success(req, 'subscribe_to_public_mailing_list', startTime, {
        mailing_list_id: id,
        mailing_list_name: mailingList.group_name,
      });

      res.status(201).json(response);
    } catch (error: unknown) {
      // Handle duplicate subscriber errors gracefully
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.toLowerCase().includes('already') || errorMessage.toLowerCase().includes('duplicate') || errorMessage.toLowerCase().includes('exists')) {
        const response: PublicMailingListSubscribeResponse = {
          success: true,
          message: 'This email is already subscribed to this mailing list.',
          mailing_list_title: '',
        };

        logger.success(req, 'subscribe_to_public_mailing_list', startTime, {
          mailing_list_id: id,
          already_subscribed: true,
        });

        res.status(200).json(response);
        return;
      }

      // Error handler will log
      next(error);
    }
  }

  /**
   * Sets up M2M token for API calls
   */
  private async setupM2MToken(req: Request): Promise<string> {
    const startTime = logger.startOperation(req, 'setup_m2m_token');

    const m2mToken = await generateM2MToken(req);
    req.bearerToken = m2mToken;

    logger.success(req, 'setup_m2m_token', startTime, {
      has_token: !!m2mToken,
    });

    return m2mToken;
  }
}
