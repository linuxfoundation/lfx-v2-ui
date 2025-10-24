// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * NATS message subjects enum
 */
export enum NatsSubjects {
  PROJECT_SLUG_TO_UID = 'lfx.projects-api.slug_to_uid',
  USER_METADATA_UPDATE = 'lfx.auth-service.user_metadata.update',
  USER_METADATA_READ = 'lfx.auth-service.user_metadata.read',
  EMAIL_TO_USERNAME = 'lfx.auth-service.email_to_username',
  EMAIL_TO_SUB = 'lfx.auth-service.email_to_sub',
  // User emails
  USER_EMAILS_READ = 'lfx.auth-service.user_emails.read',
  // Email linking
  EMAIL_LINKING_SEND_VERIFICATION = 'lfx.auth-service.email_linking.send_verification',
  EMAIL_LINKING_VERIFY = 'lfx.auth-service.email_linking.verify',
  // User identity linking
  USER_IDENTITY_LINK = 'lfx.auth-service.user_identity.link',
}
