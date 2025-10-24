// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NATS_CONFIG } from '@lfx-one/shared/constants';
import { NatsSubjects } from '@lfx-one/shared/enums';
import { Request } from 'express';

import { MicroserviceError, ServiceValidationError } from '../errors';
import { NatsService } from './nats.service';

/**
 * Response from email verification operations
 */
interface EmailVerificationResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Response from OTP verification operation
 */
interface OTPVerificationResponse {
  success: boolean;
  data?: {
    token: string;
  };
  error?: string;
}

/**
 * Request payload for OTP verification
 */
interface VerifyOTPRequest {
  email: string;
  otp: string;
}

/**
 * Response from identity linking operation
 */
interface IdentityLinkResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Request payload for identity linking
 */
interface LinkIdentityRequest {
  user_token: string;
  link_with: string;
}

/**
 * Email service for handling email verification and identity linking flows
 * Uses NATS request-reply pattern to communicate with auth service
 */
export class EmailService {
  private natsService: NatsService;

  public constructor() {
    this.natsService = new NatsService();
  }

  /**
   * Send verification code to an alternate email address
   * Step 1 of the email verification flow
   * 
   * @param req - Express request object for logging
   * @param email - The alternate email address to verify
   * @returns Promise with success status and message
   * @throws ServiceValidationError if email is invalid or already linked
   * @throws MicroserviceError for NATS communication failures
   */
  public async sendVerificationCode(req: Request, email: string): Promise<EmailVerificationResponse> {
    const codec = this.natsService.getCodec();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw ServiceValidationError.forField('email', 'Valid email address is required', {
        operation: 'send_verification_code',
        service: 'email_service',
        path: '/nats/email-linking/send-verification',
      });
    }

    try {
      req.log.info({ email }, 'Sending verification code via NATS');

      // Send plain text email address (no JSON wrapping)
      const response = await this.natsService.request(
        NatsSubjects.EMAIL_LINKING_SEND_VERIFICATION,
        codec.encode(email),
        { timeout: NATS_CONFIG.REQUEST_TIMEOUT }
      );

      const responseText = codec.decode(response.data);
      const result: EmailVerificationResponse = JSON.parse(responseText);

      if (!result.success) {
        req.log.warn({ email, error: result.error }, 'Failed to send verification code');
        
        // Handle "already linked" as a validation error
        if (result.error?.includes('already linked')) {
          throw ServiceValidationError.forField('email', 'This email address is already linked to an account', {
            operation: 'send_verification_code',
            service: 'email_service',
            path: '/nats/email-linking/send-verification',
          });
        }

        throw new MicroserviceError(result.error || 'Failed to send verification code', 500, 'SEND_VERIFICATION_FAILED', {
          operation: 'send_verification_code',
          service: 'email_service',
          path: '/nats/email-linking/send-verification',
        });
      }

      req.log.info({ email }, 'Verification code sent successfully');
      return result;
    } catch (error) {
      // Re-throw known error types
      if (error instanceof ServiceValidationError || error instanceof MicroserviceError) {
        throw error;
      }

      req.log.error(
        { error: error instanceof Error ? error.message : error, email },
        'Failed to send verification code via NATS'
      );

      throw new MicroserviceError('Failed to communicate with authentication service', 503, 'NATS_COMMUNICATION_FAILED', {
        operation: 'send_verification_code',
        service: 'email_service',
        path: '/nats/email-linking/send-verification',
      });
    }
  }

  /**
   * Verify OTP code and get authentication token
   * Step 2 of the email verification flow
   * 
   * @param req - Express request object for logging
   * @param email - The email address that received the OTP
   * @param otp - The one-time password code (6 digits)
   * @returns Promise with authentication token if successful
   * @throws ServiceValidationError if OTP is invalid or email already linked
   * @throws MicroserviceError for NATS communication failures
   */
  public async verifyOTP(req: Request, email: string, otp: string): Promise<OTPVerificationResponse> {
    const codec = this.natsService.getCodec();

    // Validate inputs
    if (!email || !otp) {
      throw ServiceValidationError.forField('otp', 'Email and OTP code are required', {
        operation: 'verify_otp',
        service: 'email_service',
        path: '/nats/email-linking/verify',
      });
    }

    // Validate OTP format (6 digits)
    const otpRegex = /^\d{6}$/;
    if (!otpRegex.test(otp)) {
      throw ServiceValidationError.forField('otp', 'OTP must be a 6-digit code', {
        operation: 'verify_otp',
        service: 'email_service',
        path: '/nats/email-linking/verify',
      });
    }

    try {
      req.log.info({ email }, 'Verifying OTP code via NATS');

      const requestPayload: VerifyOTPRequest = { email, otp };
      const response = await this.natsService.request(
        NatsSubjects.EMAIL_LINKING_VERIFY,
        codec.encode(JSON.stringify(requestPayload)),
        { timeout: NATS_CONFIG.REQUEST_TIMEOUT }
      );

      const responseText = codec.decode(response.data);
      const result: OTPVerificationResponse = JSON.parse(responseText);

      if (!result.success) {
        req.log.warn({ email, error: result.error }, 'Failed to verify OTP');

        // Handle specific error cases
        if (result.error?.includes('already linked')) {
          throw ServiceValidationError.forField('email', 'This email address is already linked to an account', {
            operation: 'verify_otp',
            service: 'email_service',
            path: '/nats/email-linking/verify',
          });
        }

        if (result.error?.includes('failed to exchange OTP')) {
          throw ServiceValidationError.forField('otp', 'Invalid or expired verification code', {
            operation: 'verify_otp',
            service: 'email_service',
            path: '/nats/email-linking/verify',
          });
        }

        throw new MicroserviceError(result.error || 'Failed to verify OTP', 400, 'OTP_VERIFICATION_FAILED', {
          operation: 'verify_otp',
          service: 'email_service',
          path: '/nats/email-linking/verify',
        });
      }

      req.log.info({ email }, 'OTP verified successfully');
      return result;
    } catch (error) {
      // Re-throw known error types
      if (error instanceof ServiceValidationError || error instanceof MicroserviceError) {
        throw error;
      }

      req.log.error(
        { error: error instanceof Error ? error.message : error, email },
        'Failed to verify OTP via NATS'
      );

      throw new MicroserviceError('Failed to communicate with authentication service', 503, 'NATS_COMMUNICATION_FAILED', {
        operation: 'verify_otp',
        service: 'email_service',
        path: '/nats/email-linking/verify',
      });
    }
  }

  /**
   * Link verified identity to user account
   * Step 3 of the email verification flow
   * 
   * @param req - Express request object for logging
   * @param userToken - The user's authentication token
   * @param linkWithToken - The token from OTP verification (from step 2)
   * @returns Promise with success status
   * @throws MicroserviceError for NATS communication failures or linking failures
   */
  public async linkIdentity(req: Request, userToken: string, linkWithToken: string): Promise<IdentityLinkResponse> {
    const codec = this.natsService.getCodec();

    // Validate tokens
    if (!userToken || !linkWithToken) {
      throw ServiceValidationError.forField('token', 'User token and link token are required', {
        operation: 'link_identity',
        service: 'email_service',
        path: '/nats/user-identity/link',
      });
    }

    try {
      req.log.info('Linking identity via NATS');

      const requestPayload: LinkIdentityRequest = {
        user_token: userToken,
        link_with: linkWithToken,
      };

      const response = await this.natsService.request(
        NatsSubjects.USER_IDENTITY_LINK,
        codec.encode(JSON.stringify(requestPayload)),
        { timeout: NATS_CONFIG.REQUEST_TIMEOUT }
      );

      const responseText = codec.decode(response.data);
      const result: IdentityLinkResponse = JSON.parse(responseText);

      if (!result.success) {
        req.log.warn({ error: result.error }, 'Failed to link identity');

        throw new MicroserviceError(result.error || 'Failed to link identity', 400, 'IDENTITY_LINK_FAILED', {
          operation: 'link_identity',
          service: 'email_service',
          path: '/nats/user-identity/link',
        });
      }

      req.log.info('Identity linked successfully');
      return result;
    } catch (error) {
      // Re-throw known error types
      if (error instanceof ServiceValidationError || error instanceof MicroserviceError) {
        throw error;
      }

      req.log.error(
        { error: error instanceof Error ? error.message : error },
        'Failed to link identity via NATS'
      );

      throw new MicroserviceError('Failed to communicate with authentication service', 503, 'NATS_COMMUNICATION_FAILED', {
        operation: 'link_identity',
        service: 'email_service',
        path: '/nats/user-identity/link',
      });
    }
  }

  /**
   * Complete email verification and linking flow
   * Combines all three steps: send verification, verify OTP, and link identity
   * 
   * @param req - Express request object for logging
   * @param email - The alternate email address to verify and link
   * @param otp - The one-time password code
   * @param userToken - The user's authentication token
   * @returns Promise with final linking result
   */
  public async verifyAndLinkEmail(
    req: Request,
    email: string,
    otp: string,
    userToken: string
  ): Promise<IdentityLinkResponse> {
    // Step 2: Verify OTP and get token
    const verificationResult = await this.verifyOTP(req, email, otp);

    if (!verificationResult.success || !verificationResult.data?.token) {
      throw new MicroserviceError('OTP verification failed', 400, 'OTP_VERIFICATION_FAILED', {
        operation: 'verify_and_link_email',
        service: 'email_service',
      });
    }

    // Step 3: Link identity using the token from verification
    return await this.linkIdentity(req, userToken, verificationResult.data.token);
  }
}

