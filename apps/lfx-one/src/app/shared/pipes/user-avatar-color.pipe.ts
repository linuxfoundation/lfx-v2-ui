// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Pipe, PipeTransform } from '@angular/core';
import { UserSearchResult } from '@lfx-one/shared/interfaces';

const AVATAR_COLORS = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 'bg-teal-500'];

/**
 * Returns a deterministic Tailwind background-color class for a user avatar,
 * derived from the char code of the first character of the user's email.
 */
@Pipe({
  name: 'userAvatarColor',
})
export class UserAvatarColorPipe implements PipeTransform {
  public transform(user: UserSearchResult | null | undefined): string {
    const index = (user?.email?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
  }
}
