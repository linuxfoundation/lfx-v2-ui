// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NextFunction, Request, Response } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Error message returned when rate limit is exceeded */
  message: string;
}

/**
 * Creates an in-memory IP-based rate limiter middleware.
 *
 * @param config - Rate limit configuration
 * @returns Express middleware that enforces rate limits per IP
 */
export function createRateLimiter(config: RateLimitConfig) {
  const store = new Map<string, RateLimitEntry>();

  // Cleanup expired entries every 5 minutes
  const cleanupInterval = setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of store) {
        if (now >= entry.resetTime) {
          store.delete(key);
        }
      }
    },
    5 * 60 * 1000
  );

  // Allow garbage collection if the process exits
  cleanupInterval.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || 'unknown';
    const now = Date.now();

    let entry = store.get(ip);

    // Reset if the window has expired
    if (!entry || now >= entry.resetTime) {
      entry = { count: 0, resetTime: now + config.windowMs };
      store.set(ip, entry);
    }

    entry.count++;

    const remaining = Math.max(0, config.maxRequests - entry.count);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

    if (entry.count > config.maxRequests) {
      res.status(429).json({
        error: 'TOO_MANY_REQUESTS',
        message: config.message,
      });
      return;
    }

    next();
  };
}
