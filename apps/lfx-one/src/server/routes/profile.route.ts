// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Router } from 'express';

import { ProfileController } from '../controllers/profile.controller';

const router = Router();

const profileController = new ProfileController();

/**
 * Profile routes for authenticated users
 * All routes require authentication via auth middleware
 */

// GET /api/profile - Get current user's combined profile data
router.get('/', (req, res, next) => profileController.getCurrentUserProfile(req, res, next));

// PATCH /api/profile - Update user metadata via NATS (replaces separate user and details endpoints)
router.patch('/', (req, res, next) => profileController.updateUserMetadata(req, res, next));

// Email management routes

// GET /api/profile/emails - Get current user's email management data
router.get('/emails', (req, res, next) => profileController.getUserEmails(req, res, next));

// POST /api/profile/emails/send-verification - Send verification code to email
router.post('/emails/send-verification', (req, res, next) => profileController.sendEmailVerification(req, res, next));

// POST /api/profile/emails/verify - Verify OTP and link email to account
router.post('/emails/verify', (req, res, next) => profileController.verifyAndLinkEmail(req, res, next));

// POST /api/profile/emails - Add new email for current user
router.post('/emails', (req, res, next) => profileController.addUserEmail(req, res, next));

// DELETE /api/profile/emails/:emailId - Delete user email
router.delete('/emails/:emailId', (req, res, next) => profileController.deleteUserEmail(req, res, next));

// PUT /api/profile/emails/:emailId/primary - Set email as primary
router.put('/emails/:emailId/primary', (req, res, next) => profileController.setPrimaryEmail(req, res, next));

// GET /api/profile/email-preferences - Get user email preferences
router.get('/email-preferences', (req, res, next) => profileController.getEmailPreferences(req, res, next));

// PUT /api/profile/email-preferences - Update user email preferences
router.put('/email-preferences', (req, res, next) => profileController.updateEmailPreferences(req, res, next));

// GET /api/profile/developer - Get current user's developer token information
router.get('/developer', (req, res, next) => profileController.getDeveloperTokenInfo(req, res, next));

export default router;
