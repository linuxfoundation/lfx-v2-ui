// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Router } from 'express';

import { CommitteeController } from '../controllers/committee.controller';

const router = Router();

const committeeController = new CommitteeController();

// Committee CRUD routes - using new controller pattern
router.get('/', (req, res, next) => committeeController.getCommittees(req, res, next));
router.get('/count', (req, res, next) => committeeController.getCommitteesCount(req, res, next));
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

// Meeting routes
router.get('/:id/meetings', (req, res, next) => committeeController.getCommitteeMeetings(req, res, next));

// Dashboard sub-resource routes
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

export default router;
