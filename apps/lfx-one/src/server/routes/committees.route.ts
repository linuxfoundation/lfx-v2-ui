// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Router } from 'express';

import { CommitteeController } from '../controllers/committee.controller';

const router = Router();

const committeeController = new CommitteeController();

// Committee CRUD routes - using new controller pattern
router.get('/', (req, res, next) => committeeController.getCommittees(req, res, next));
router.get('/count', (req, res, next) => committeeController.getCommitteesCount(req, res, next));
router.get('/my', (req, res, next) => committeeController.getMyCommittees(req, res, next));

// ── Dashboard sub-resource routes (BEFORE /:id to avoid route conflicts) ──
router.get('/:id/votes', (req, res, next) => committeeController.getCommitteeVotes(req, res, next));
router.get('/:id/resolutions', (req, res, next) => committeeController.getCommitteeResolutions(req, res, next));
router.get('/:id/activity', (req, res, next) => committeeController.getCommitteeActivity(req, res, next));
router.get('/:id/contributors', (req, res, next) => committeeController.getCommitteeContributors(req, res, next));
router.get('/:id/deliverables', (req, res, next) => committeeController.getCommitteeDeliverables(req, res, next));
router.get('/:id/discussions', (req, res, next) => committeeController.getCommitteeDiscussions(req, res, next));
router.get('/:id/events', (req, res, next) => committeeController.getCommitteeEvents(req, res, next));
router.get('/:id/campaigns', (req, res, next) => committeeController.getCommitteeCampaigns(req, res, next));
router.get('/:id/engagement', (req, res, next) => committeeController.getCommitteeEngagement(req, res, next));
router.get('/:id/budget', (req, res, next) => committeeController.getCommitteeBudget(req, res, next));
router.get('/:id/documents', (req, res, next) => committeeController.getCommitteeDocuments(req, res, next));

router.get('/:id', (req, res, next) => committeeController.getCommitteeById(req, res, next));
router.post('/', (req, res, next) => committeeController.createCommittee(req, res, next));
router.put('/:id', (req, res, next) => committeeController.updateCommittee(req, res, next));
router.delete('/:id', (req, res, next) => committeeController.deleteCommittee(req, res, next));

// Committee member routes - now using committee controller
router.get('/:id/members', (req, res, next) => committeeController.getCommitteeMembers(req, res, next));
router.get('/:id/members/:memberId', (req, res, next) => committeeController.getCommitteeMemberById(req, res, next));
router.post('/:id/members', (req, res, next) => committeeController.createCommitteeMember(req, res, next));
router.put('/:id/members/:memberId', (req, res, next) => committeeController.updateCommitteeMember(req, res, next));
router.delete('/:id/members/:memberId', (req, res, next) => committeeController.deleteCommitteeMember(req, res, next));

// ── Invite routes ──────────────────────────────────────────────────────────
router.post('/:id/invites', (req, res, next) => committeeController.createInvites(req, res, next));
router.get('/:id/invites', (req, res, next) => committeeController.getInvites(req, res, next));
router.post('/:id/invites/:inviteId/accept', (req, res, next) => committeeController.acceptInvite(req, res, next));
router.post('/:id/invites/:inviteId/decline', (req, res, next) => committeeController.declineInvite(req, res, next));
router.delete('/:id/invites/:inviteId', (req, res, next) => committeeController.revokeInvite(req, res, next));

// ── Join / Leave routes ────────────────────────────────────────────────────
router.post('/:id/join', (req, res, next) => committeeController.joinCommittee(req, res, next));
router.post('/:id/leave', (req, res, next) => committeeController.leaveCommittee(req, res, next));

// ── Application routes (join_mode = 'apply') ───────────────────────────────
router.post('/:id/applications', (req, res, next) => committeeController.applyToJoin(req, res, next));
router.get('/:id/applications', (req, res, next) => committeeController.getApplications(req, res, next));
router.post('/:id/applications/:applicationId/approve', (req, res, next) => committeeController.approveApplication(req, res, next));
router.post('/:id/applications/:applicationId/reject', (req, res, next) => committeeController.rejectApplication(req, res, next));

export default router;
