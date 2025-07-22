// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NextFunction, Request, Response, Router } from 'express';

import { SupabaseService } from '../services/supabase.service';

const router = Router();

const supabaseService = new SupabaseService();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meetings = await supabaseService.getMeetings(req.query as Record<string, any>);

    return res.json(meetings);
  } catch (error) {
    console.error('Failed to fetch meetings:', error);
    return next(error);
  }
});

export default router;
