// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Router } from 'express';

import { NewsletterController } from '../controllers/newsletter.controller';
import { requireExecutiveDirector } from '../middleware/require-executive-director.middleware';

const router = Router();
const newsletterController = new NewsletterController();

// Authorization is enforced by the downstream lfx-v2-newsletter-service (FGA
// via the forwarded user bearer token) and by the corresponding frontend
// route guards. Don't gate on persona here — newsletters are accessible to
// Executive Directors AND writers/owners of the foundation or project.

// List newsletters (drafts + sent) and per-newsletter analytics
router.get('/', (req, res, next) => newsletterController.listNewsletters(req, res, next));
router.get('/:id/analytics', (req, res, next) => newsletterController.getAnalytics(req, res, next));

// Draft CRUD — proxies to lfx-v2-newsletter-service
router.get('/drafts', (req, res, next) => newsletterController.listDrafts(req, res, next));
router.post('/drafts', (req, res, next) => newsletterController.createDraft(req, res, next));
router.get('/drafts/:id', (req, res, next) => newsletterController.getDraft(req, res, next));
router.put('/drafts/:id', (req, res, next) => newsletterController.updateDraft(req, res, next));
router.delete('/drafts/:id', (req, res, next) => newsletterController.deleteDraft(req, res, next));
router.post('/drafts/:id/send', (req, res, next) => newsletterController.sendDraft(req, res, next));

// Preview, test-send, and ad-hoc send — proxy to lfx-v2-newsletter-service
router.post('/recipient-count', (req, res, next) => newsletterController.getRecipientCount(req, res, next));
router.post('/recipients', (req, res, next) => newsletterController.getRecipients(req, res, next));
router.post('/test-send', (req, res, next) => newsletterController.testSend(req, res, next));
router.post('/send', (req, res, next) => newsletterController.send(req, res, next));

// AI generation stays in lfx-v2-ui and doesn't proxy to the Go service, so
// the downstream FGA check that gates the other endpoints isn't available
// here. Gate on ED persona to bound LiteLLM cost exposure until /generate
// accepts a contextUid and the controller can do a writer/owner check
// against the active project (tracked follow-up).
router.post('/generate', requireExecutiveDirector, (req, res, next) => newsletterController.generate(req, res, next));

export default router;
