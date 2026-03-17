// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { Committee, CommitteeLeadership, LeadershipRole } from '@lfx-one/shared/interfaces';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'lfx-committee-leadership-card',
  imports: [DatePipe, CardComponent, ButtonComponent, TooltipModule],
  templateUrl: './committee-leadership-card.component.html',
  styleUrl: './committee-leadership-card.component.scss',
})
export class CommitteeLeadershipCardComponent {
  // Inputs
  public committee = input.required<Committee>();
  public canManage = input<boolean>(false);
  public chair = input<CommitteeLeadership | null | undefined>(null);
  public coChair = input<CommitteeLeadership | null | undefined>(null);

  // Outputs
  public readonly assignLeadership = output<LeadershipRole>();
}
