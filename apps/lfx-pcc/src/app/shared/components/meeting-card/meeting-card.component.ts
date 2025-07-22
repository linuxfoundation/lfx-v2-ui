// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { BadgeComponent } from '@app/shared/components/badge/badge.component';
import { ButtonComponent } from '@app/shared/components/button/button.component';
import { MenuComponent } from '@app/shared/components/menu/menu.component';
import { MeetingTimePipe } from '@app/shared/pipes/meeting-time.pipe';
import { Meeting } from '@lfx-pcc/shared/interfaces';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'lfx-meeting-card',
  standalone: true,
  imports: [CommonModule, ButtonComponent, MenuComponent, BadgeComponent, TitleCasePipe, MeetingTimePipe],
  templateUrl: './meeting-card.component.html',
  styleUrl: './meeting-card.component.scss',
})
export class MeetingCardComponent {
  public readonly meeting = input.required<Meeting>();
  public readonly actionMenuItems = input.required<MenuItem[]>();

  public readonly menuToggle = output<{ event: Event; meeting: Meeting; menuComponent: MenuComponent }>();

  public onMenuToggle(event: Event, menuComponent: MenuComponent): void {
    event.stopPropagation();
    this.menuToggle.emit({ event, meeting: this.meeting(), menuComponent });
  }
}
