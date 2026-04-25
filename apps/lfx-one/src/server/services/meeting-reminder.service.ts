// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { Meeting } from '@lfx-one/shared/interfaces';
import { getCurrentOrNextOccurrence } from '@lfx-one/shared/utils';
import { Request } from 'express';

import { logger } from './logger.service';
import { PushNotificationService } from './push-notification.service';
import { UserService } from './user.service';

/** Push reminders fire when a meeting starts within this window from now. */
const WINDOW_MIN = 10;
const WINDOW_MAX = 20;
/** A given (user, meeting, occurrence-start) tuple is only pushed once per hour. */
const THROTTLE_TTL_MS = 60 * 60 * 1000;

interface ReminderResult {
  reminded: number;
  skipped: number;
  candidates: number;
}

/**
 * Local-only meeting reminder dispatcher. Each call checks the requesting
 * user's upcoming meetings and fires a push for any starting in the
 * 10–20-minute window. The endpoint is the trigger surface — point a cron
 * at it (or call from a webhook) to get periodic reminders.
 */
export class MeetingReminderService {
  private static instance: MeetingReminderService | null = null;

  private readonly userService = new UserService();
  private readonly throttle = new Map<string, number>();

  public static getInstance(): MeetingReminderService {
    if (!this.instance) {
      this.instance = new MeetingReminderService();
    }
    return this.instance;
  }

  public async checkAndNotifyForUser(req: Request, userId: string, email: string): Promise<ReminderResult> {
    const meetings = await this.userService.getUserMeetings(req, email);
    const now = Date.now();
    const candidates = meetings.filter((meeting) => this.isInWindow(meeting, now));

    if (candidates.length === 0) {
      logger.debug(req, 'meeting_reminder', 'No meetings in reminder window', { user_id: userId });
      return { reminded: 0, skipped: 0, candidates: 0 };
    }

    let reminded = 0;
    let skipped = 0;
    const pushService = PushNotificationService.getInstance();

    for (const meeting of candidates) {
      const startMs = this.nextStartMs(meeting);
      const key = `${userId}:${meeting.id}:${startMs}`;
      const lastPushed = this.throttle.get(key);
      if (lastPushed && now - lastPushed < THROTTLE_TTL_MS) {
        skipped++;
        continue;
      }
      const minutesAway = Math.max(1, Math.round((startMs - now) / 60000));
      const result = await pushService.sendToUser(req, userId, {
        kind: 'meeting_reminder',
        title: meeting.title ?? 'Upcoming meeting',
        body: `Starting in ${minutesAway} minute${minutesAway === 1 ? '' : 's'}.`,
        url: `/meetings/${meeting.id}`,
        tag: `meeting-reminder:${meeting.id}:${startMs}`,
      });
      if (result.delivered > 0) {
        this.throttle.set(key, now);
        reminded++;
      } else {
        skipped++;
      }
    }

    logger.info(req, 'meeting_reminder', 'Processed meeting reminders', {
      user_id: userId,
      candidates: candidates.length,
      reminded,
      skipped,
    });
    this.cleanThrottle(now);
    return { reminded, skipped, candidates: candidates.length };
  }

  private isInWindow(meeting: Meeting, now: number): boolean {
    const startMs = this.nextStartMs(meeting);
    if (!Number.isFinite(startMs)) {
      return false;
    }
    const minutesAway = (startMs - now) / 60000;
    return minutesAway >= WINDOW_MIN && minutesAway <= WINDOW_MAX;
  }

  private nextStartMs(meeting: Meeting): number {
    const occurrence = getCurrentOrNextOccurrence(meeting);
    const iso = occurrence?.start_time ?? meeting.start_time;
    return iso ? new Date(iso).getTime() : NaN;
  }

  private cleanThrottle(now: number): void {
    if (this.throttle.size < 200) {
      return;
    }
    for (const [key, ts] of this.throttle) {
      if (now - ts > THROTTLE_TTL_MS) {
        this.throttle.delete(key);
      }
    }
  }
}
