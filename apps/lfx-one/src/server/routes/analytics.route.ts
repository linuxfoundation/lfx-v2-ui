// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Router } from 'express';

import { AnalyticsController } from '../controllers/analytics.controller';

const router = Router();

const analyticsController = new AnalyticsController();

// Analytics data routes
router.get('/active-weeks-streak', (req, res, next) => analyticsController.getActiveWeeksStreak(req, res, next));
router.get('/pull-requests-merged', (req, res, next) => analyticsController.getPullRequestsMerged(req, res, next));
router.get('/code-commits', (req, res, next) => analyticsController.getCodeCommits(req, res, next));
router.get('/my-projects', (req, res, next) => analyticsController.getMyProjects(req, res, next));
router.get('/organization-maintainers', (req, res, next) => analyticsController.getOrganizationMaintainers(req, res, next));
router.get('/organization-contributors', (req, res, next) => analyticsController.getOrganizationContributors(req, res, next));
router.get('/organization-event-attendance', (req, res, next) => analyticsController.getOrganizationEventAttendance(req, res, next));
router.get('/organization-technical-committee', (req, res, next) => analyticsController.getOrganizationTechnicalCommittee(req, res, next));
router.get('/organization-projects-participating', (req, res, next) => analyticsController.getOrganizationProjectsParticipating(req, res, next));
router.get('/organization-total-commits', (req, res, next) => analyticsController.getOrganizationTotalCommits(req, res, next));
router.get('/organization-certified-employees', (req, res, next) => analyticsController.getOrganizationCertifiedEmployees(req, res, next));
router.get('/organization-board-meeting-attendance', (req, res, next) => analyticsController.getOrganizationBoardMeetingAttendance(req, res, next));
router.get('/organization-event-sponsorships', (req, res, next) => analyticsController.getOrganizationEventSponsorships(req, res, next));
router.get('/membership-tier', (req, res, next) => analyticsController.getMembershipTier(req, res, next));

export default router;
