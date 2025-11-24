// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Injectable } from '@angular/core';
import { PendingActionItem } from '@lfx-one/shared';

/**
 * Service for managing hidden pending actions using browser cookies.
 * Provides 24-hour automatic expiration without manual cleanup.
 * SSR-compatible as cookies work on both server and client.
 */
@Injectable({
  providedIn: 'root',
})
export class HiddenActionsService {
  private readonly cookiePrefix = 'lfx_hidden_';
  private readonly maxAgeSeconds = 86400; // 24 hours

  /**
   * Hide an action for 24 hours by setting a cookie.
   * The browser will automatically remove the cookie after expiration.
   *
   * @param item The pending action item to hide
   */
  public hideAction(item: PendingActionItem): void {
    const identifier = this.getActionIdentifier(item);
    const cookieName = this.getCookieName(identifier);
    this.setCookie(cookieName, '1', this.maxAgeSeconds);
  }

  /**
   * Check if an action is currently hidden by checking for cookie existence.
   * If the cookie expired, the browser already removed it, so this returns false.
   *
   * @param item The pending action item to check
   * @returns true if the action is hidden, false otherwise
   */
  public isActionHidden(item: PendingActionItem): boolean {
    const identifier = this.getActionIdentifier(item);
    const cookieName = this.getCookieName(identifier);
    return this.getCookie(cookieName) !== null;
  }

  /**
   * Generate a unique identifier for an action.
   * Uses buttonLink URL if available, otherwise combines type and badge.
   *
   * @param item The pending action item
   * @returns A unique string identifier
   */
  private getActionIdentifier(item: PendingActionItem): string {
    if (item.buttonLink) {
      return item.buttonLink;
    }
    return `${item.type}-${item.badge}`;
  }

  /**
   * Convert an identifier to a safe cookie name using simple string hashing.
   * Uses a deterministic hash to create short, consistent cookie names.
   *
   * @param identifier The action identifier
   * @returns A cookie-safe name with prefix
   */
  private getCookieName(identifier: string): string {
    const hash = this.hashString(identifier);
    return `${this.cookiePrefix}${hash}`;
  }

  /**
   * Simple string hash function for generating short, deterministic identifiers.
   * Uses a variant of the DJB2 hash algorithm.
   *
   * @param str String to hash
   * @returns 8-character hexadecimal hash
   */
  private hashString(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) + hash + str.charCodeAt(i); // hash * 33 + char
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Convert to unsigned and return as hex string
    return Math.abs(hash).toString(16).padStart(8, '0').substring(0, 8);
  }

  /**
   * Set a cookie with specified name, value, and max-age.
   *
   * @param name Cookie name
   * @param value Cookie value
   * @param maxAge Expiration time in seconds
   */
  private setCookie(name: string, value: string, maxAge: number): void {
    document.cookie = `${name}=${value}; max-age=${maxAge}; path=/; SameSite=Strict`;
  }

  /**
   * Get a cookie value by name.
   *
   * @param name Cookie name
   * @returns Cookie value if found, null otherwise
   */
  private getCookie(name: string): string | null {
    const cookies = document.cookie.split('; ');
    const cookie = cookies.find((c) => c.startsWith(`${name}=`));
    return cookie ? cookie.split('=')[1] : null;
  }
}
