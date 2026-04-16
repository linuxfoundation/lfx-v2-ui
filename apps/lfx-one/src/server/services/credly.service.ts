// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { Badge, CredlyApiResponse, CredlyBadgeEntry, CredlyCachedBadges } from '@lfx-one/shared/interfaces';
import { compareBadgesByIssuedDateDesc, isValidBadge, mapCredlyBadgeToBadge } from '@lfx-one/shared/utils';
import { Request } from 'express';

import { logger } from './logger.service';

export class CredlyService {
  // TODO: Replace with AWS Secrets Manager fetch + in-memory cache
  private readonly apiUrl = process.env['CREDLY_API_URL'] || '';
  private readonly orgId = process.env['CREDLY_ORG_ID'] || '';
  private readonly authToken = process.env['CREDLY_API_TOKEN'] || '';

  private static readonly requestTimeoutMs = 15_000;
  private static readonly maxPaginationPages = 20;
  private static readonly maxEmailsPerQuery = 10;
  private static readonly cacheTtlMs = 30 * 60 * 1_000; // 30 minutes
  private static readonly maxCacheSize = 500;

  /** Per-user in-memory badge cache. Key is a sorted, joined email list. */
  private readonly badgeCache = new Map<string, CredlyCachedBadges>();

  /**
   * Fetch badges for one or more email addresses from the Credly API.
   * Queries all emails in parallel, deduplicates by badge ID, and maps to our Badge interface.
   */
  public async getBadgesForEmails(req: Request, emails: string[]): Promise<Badge[]> {
    if (!this.apiUrl || !this.orgId || !this.authToken) {
      logger.warning(req, 'get_badges_for_emails', 'Credly API not configured — missing CREDLY_API_URL, CREDLY_ORG_ID, or CREDLY_API_TOKEN', {
        email_count: emails.length,
      });
      return [];
    }

    if (emails.length === 0) {
      return [];
    }

    // Normalize before capping: sort + dedupe so the same logical set always maps to the same cache key
    const normalizedEmails = [...new Set(emails.map((e) => e.toLowerCase()))].sort();
    const emailsToQuery = normalizedEmails.slice(0, CredlyService.maxEmailsPerQuery);
    if (normalizedEmails.length > CredlyService.maxEmailsPerQuery) {
      logger.warning(req, 'get_badges_for_emails', 'Email count exceeds limit, truncating', {
        total: normalizedEmails.length,
        limit: CredlyService.maxEmailsPerQuery,
      });
    }

    const cacheKey = emailsToQuery.join(',');
    const cached = this.badgeCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      logger.debug(req, 'get_badges_for_emails', 'Returning cached badges', {
        email_count: emailsToQuery.length,
        badge_count: cached.badges.length,
      });
      return cached.badges;
    }

    const results = await Promise.all(emailsToQuery.map((email) => this.fetchBadgesForEmail(req, email)));
    const allEntries = results.flat();

    // Deduplicate by badge ID (a user with multiple emails may have the same badge issued to each)
    const seen = new Set<string>();
    const unique = allEntries.filter((entry) => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    });

    const badges = unique.filter(isValidBadge).map(mapCredlyBadgeToBadge).sort(compareBadgesByIssuedDateDesc);

    this.evictExpiredCacheEntries();
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
    let nextUrl: string | null = `${this.apiUrl}/organizations/${this.orgId}/badges?filter=${encodeURIComponent(filter)}`;
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
        nextUrl = this.isTrustedUrl(candidateUrl) ? candidateUrl : null;
      }

      if (nextUrl && page >= CredlyService.maxPaginationPages) {
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
        err: error instanceof Error ? error : new Error(String(error)),
      });
      return allEntries; // return whatever was collected before the error
    }
  }

  /**
   * Returns true if the candidate URL shares the same origin as the configured Credly API URL.
   * Rejects null, relative URLs, and any URL whose origin doesn't match (guards against SSRF
   * via subdomain tricks like `https://api.credly.com.evil.com`).
   */
  private isTrustedUrl(candidateUrl: string | null): candidateUrl is string {
    if (!candidateUrl) return false;
    try {
      const candidate = new URL(candidateUrl);
      const trusted = new URL(this.apiUrl);
      return candidate.origin === trusted.origin;
    } catch {
      return false;
    }
  }

  /**
   * Remove expired entries from the badge cache and enforce the max cache size limit.
   * Called before each cache write to prevent unbounded memory growth.
   */
  private evictExpiredCacheEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.badgeCache) {
      if (now >= entry.expiresAt) {
        this.badgeCache.delete(key);
      }
    }
    // If still over the limit after expiry eviction, remove oldest entries (insertion order)
    if (this.badgeCache.size >= CredlyService.maxCacheSize) {
      const overflow = this.badgeCache.size - CredlyService.maxCacheSize + 1;
      let removed = 0;
      for (const key of this.badgeCache.keys()) {
        this.badgeCache.delete(key);
        if (++removed >= overflow) break;
      }
    }
  }

  /** Mask the local part of an email address for safe logging (e.g. `au***@example.com`). */
  private maskEmail(email: string): string {
    const atIndex = email.indexOf('@');
    if (atIndex <= 2) return `***${email.slice(atIndex)}`;
    return `${email.slice(0, 2)}***${email.slice(atIndex)}`;
  }
}
