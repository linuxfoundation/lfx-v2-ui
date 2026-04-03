// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Pipe, PipeTransform } from '@angular/core';

/**
 * Returns uppercase initials for a user avatar.
 * Accepts any object with first_name, last_name, and/or email fields.
 * Optional `maxChars` parameter controls how many initials to return (default: 2).
 */
@Pipe({
  name: 'userInitials',
})
export class UserInitialsPipe implements PipeTransform {
  public transform(user: { first_name?: string; last_name?: string; email?: string } | null | undefined, maxChars: number = 2): string {
    if (!user) return '?';
    const first = user.first_name?.charAt(0) ?? '';
    const last = user.last_name?.charAt(0) ?? '';
    const initials = (first + last).toUpperCase() || user.email?.charAt(0).toUpperCase() || '?';
    return initials.slice(0, maxChars);
  }
}
