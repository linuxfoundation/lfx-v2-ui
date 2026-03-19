// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input, output } from '@angular/core';
import { Avatar } from '../avatar/avatar';

type ChipStyle = 'bordered' | 'neutral';
type ChipSize = 'sm' | 'lg';
type ChipType = 'label' | 'icon' | 'avatar-photo' | 'avatar-logo';

@Component({
  selector: 'lfx-chip',
  imports: [Avatar],
  templateUrl: './chip.html',
  styleUrl: './chip.css',
  host: {
    '[attr.data-testid]': '"chip"',
  },
})
export class Chip {
  public chipStyle = input<ChipStyle>('bordered');
  public size = input<ChipSize>('lg');
  public type = input<ChipType>('label');
  public icon = input<string>();
  public avatarSrc = input<string>();
  public dismissable = input(false);
  public label = input('');

  public readonly dismissed = output<void>();

  public chipClasses = computed(() => {
    const sizeClasses: Record<ChipSize, string> = {
      lg: 'px-2.5 py-1 text-sm leading-5',
      sm: 'px-1.5 py-0.5 text-xs leading-4',
    };

    const styleClasses: Record<ChipStyle, string> = {
      bordered: 'bg-white border border-neutral-200',
      neutral: 'bg-neutral-100',
    };

    return `${sizeClasses[this.size()]} ${styleClasses[this.chipStyle()]}`;
  });

  public onDismiss(): void {
    this.dismissed.emit();
  }
}
