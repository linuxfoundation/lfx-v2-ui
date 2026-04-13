// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { Badge, CredlyApiResponse, CredlyBadgeEntry } from '@lfx-one/shared/interfaces';
import { isValidBadge, mapCredlyBadgeToBadge } from '@lfx-one/shared/utils';
import { Request } from 'express';

import { logger } from './logger.service';

interface CachedBadges {
  badges: Badge[];
  expiresAt: number;
}

export class CredlyService {
  // TODO: Replace with AWS Secrets Manager fetch + in-memory cache
  private readonly apiUrl = process.env['CREDLY_API_URL'] || '';
  private readonly authToken = process.env['CREDLY_AUTH_TOKEN'] || '';

  private static readonly requestTimeoutMs = 15_000;
  private static readonly maxPaginationPages = 20;
  private static readonly maxEmailsPerQuery = 10;
  private static readonly cacheTtlMs = 30 * 60 * 1_000; // 30 minutes

  /** Per-user in-memory badge cache. Key is a sorted, joined email list. */
  private readonly badgeCache = new Map<string, CachedBadges>();

  /**
   * Fetch badges for one or more email addresses from the Credly API.
   * Queries all emails in parallel, deduplicates by badge ID, and maps to our Badge interface.
   */
  public async getBadgesForEmails(req: Request, emails: string[]): Promise<Badge[]> {
    if (!this.apiUrl || !this.authToken) {
      logger.warning(req, 'get_badges_for_emails', 'Credly API not configured — missing CREDLY_API_URL or CREDLY_AUTH_TOKEN', {
        email_count: emails.length,
      });
      return [];
    }

    if (emails.length === 0) {
      return [];
    }

    const emailsToQuery = emails.slice(0, CredlyService.maxEmailsPerQuery);
    if (emails.length > CredlyService.maxEmailsPerQuery) {
      logger.warning(req, 'get_badges_for_emails', 'Email count exceeds limit, truncating', {
        total: emails.length,
        limit: CredlyService.maxEmailsPerQuery,
      });
    }

    const cacheKey = [...emailsToQuery].sort().join(',');
    const cached = this.badgeCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      logger.debug(req, 'get_badges_for_emails', 'Returning cached badges', {
        email_count: emailsToQuery.length,
        badge_count: cached.badges.length,
      });
      return cached.badges;
    }

    const results = await Promise.all(emailsToQuery.map(email => this.fetchBadgesForEmail(req, email)));
    const allEntries = results.flat();

    // Deduplicate by badge ID (a user with multiple emails may have the same badge issued to each)
    const seen = new Set<string>();
    const unique = allEntries.filter(entry => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    });

    const badges = unique.filter(isValidBadge).map(mapCredlyBadgeToBadge);

    this.badgeCache.set(cacheKey, {
      badges,
      expiresAt: Date.now() + CredlyService.cacheTtlMs,
    });

    logger.debug(req, 'get_badges_for_emails', 'Fetched badges for user emails', {
      email_count: emails.length,
      raw_count: allEntries.length,
      deduplicated_count: unique.length,
      badge_count: badges.length,
    });

    return badges;
  }

  /**
   * Fetch all pages of badges for a single email address from the Credly API.
   * Follows `next_page_url` until all pages are collected, with a max page cap.
   * Returns an empty array on failure (graceful degradation).
   */
  private async fetchBadgesForEmail(req: Request, email: string): Promise<CredlyBadgeEntry[]> {
    const filter = `recipient_email::${email}|state::accepted,pending`;
    const authHeader = `Basic ${Buffer.from(`${this.authToken}:`).toString('base64')}`;
    const maskedEmail = this.maskEmail(email);

    const allEntries: CredlyBadgeEntry[] = [];
    let nextUrl: string | null = `${this.apiUrl}/badges?filter=${encodeURIComponent(filter)}`;
    let page = 0;

    try {
      while (nextUrl && page < CredlyService.maxPaginationPages) {
        page++;

        const response = await fetch(nextUrl, {
          method: 'GET',
          headers: {
            Authorization: authHeader,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(CredlyService.requestTimeoutMs),
        });

        if (!response.ok) {
          logger.warning(req, 'fetch_badges_for_email', `Credly API returned ${response.status}`, {
            email: maskedEmail,
            status: response.status,
          });
          break;
        }

        const body: CredlyApiResponse = await response.json();
        allEntries.push(...(body.data ?? []));

        // Validate the next page URL belongs to the same Credly API origin before following
        const candidateUrl = body.metadata?.next_page_url ?? null;
        nextUrl = candidateUrl?.startsWith(this.apiUrl) ? candidateUrl : null;
      }

      if (page >= CredlyService.maxPaginationPages) {
        logger.warning(req, 'fetch_badges_for_email', 'Reached max pagination limit', {
          email: maskedEmail,
          pages_fetched: page,
          entries_collected: allEntries.length,
        });
      }

      return allEntries;
    } catch (error) {
      logger.warning(req, 'fetch_badges_for_email', 'Failed to fetch badges from Credly', {
        email: maskedEmail,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return allEntries; // return whatever was collected before the error
    }
  }

  /** Mask the local part of an email address for safe logging (e.g. `au***@example.com`). */
  private maskEmail(email: string): string {
    const atIndex = email.indexOf('@');
    if (atIndex <= 2) return `***${email.slice(atIndex)}`;
    return `${email.slice(0, 2)}***${email.slice(atIndex)}`;
  }
}
