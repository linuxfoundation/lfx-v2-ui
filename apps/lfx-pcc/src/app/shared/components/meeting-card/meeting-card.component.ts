// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BadgeComponent } from '@app/shared/components/badge/badge.component';
import { ButtonComponent } from '@app/shared/components/button/button.component';
import { MenuComponent } from '@app/shared/components/menu/menu.component';
import { MeetingTimePipe } from '@app/shared/pipes/meeting-time.pipe';
import { ProjectService } from '@app/shared/services/project.service';
import { Meeting } from '@lfx-pcc/shared/interfaces';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'lfx-meeting-card',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonComponent, MenuComponent, BadgeComponent, TitleCasePipe, MeetingTimePipe],
  templateUrl: './meeting-card.component.html',
  styleUrl: './meeting-card.component.scss',
})
export class MeetingCardComponent {
  private readonly projectService = inject(ProjectService);

  public readonly meeting = input.required<Meeting>();
  public readonly actionMenuItems = input.required<MenuItem[]>();

  public readonly menuToggle = output<{ event: Event; meeting: Meeting; menuComponent: MenuComponent }>();
  public readonly project = this.projectService.project;

  public onMenuToggle(event: Event, menuComponent: MenuComponent): void {
    event.stopPropagation();
    this.menuToggle.emit({ event, meeting: this.meeting(), menuComponent });
  }
}
