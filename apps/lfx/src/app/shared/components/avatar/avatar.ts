// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input, signal } from '@angular/core';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type AvatarType = 'photo' | 'placeholder' | 'initials' | 'org-logo' | 'project-placeholder' | 'org-placeholder';

@Component({
  selector: 'lfx-avatar',
  imports: [],
  templateUrl: './avatar.html',
  styleUrl: './avatar.css',
  host: {
    '[attr.data-testid]': '"avatar"',
  },
})
export class Avatar {
  public src = input<string>();
  public alt = input('');
  public name = input<string>();
  public size = input<AvatarSize>('md');
  public type = input<AvatarType>('photo');

  public imageError = signal(false);

  public showImage = computed(() => !!this.src() && !this.imageError() && (this.type() === 'photo' || this.type() === 'org-logo'));

  public initials = computed(() => {
    const nameValue = this.name();
    if (!nameValue) {
      return '';
    }
    const words = nameValue.trim().split(/\s+/).filter(Boolean);
    const first = words[0]?.[0] ?? '';
    const last = words.length > 1 ? words[words.length - 1][0] : '';
    return (first + last).toUpperCase();
  });

  public isOrgShape = computed(() => {
    const orgTypes: AvatarType[] = ['org-logo', 'project-placeholder', 'org-placeholder'];
    return orgTypes.includes(this.type());
  });

  public avatarClasses = computed(() => {
    const sizeMap: Record<AvatarSize, string> = {
      xs: 'size-6 text-2xs',
      sm: 'size-8 text-xs',
      md: 'size-10 text-sm',
      lg: 'size-12 text-base',
      xl: 'size-14 text-lg',
    };

    const shapeClass = this.isOrgShape() ? 'rounded-lg' : 'rounded-full';
    const bgClass = !this.showImage() ? 'bg-neutral-100 text-neutral-500' : '';
    const borderClass = this.isOrgShape() ? 'border border-neutral-200' : '';

    return `${sizeMap[this.size()]} ${shapeClass} ${bgClass} ${borderClass}`.trim();
  });

  public onImageError(): void {
    this.imageError.set(true);
  }
}
