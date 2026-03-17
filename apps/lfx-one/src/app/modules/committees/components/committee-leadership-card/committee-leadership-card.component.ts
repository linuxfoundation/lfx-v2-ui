// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, input, output } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { Committee, CommitteeLeadership, LeadershipRole } from '@lfx-one/shared';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'lfx-committee-leadership-card',
  imports: [CardComponent, ButtonComponent, TooltipModule],
  templateUrl: './committee-leadership-card.component.html',
  styleUrl: './committee-leadership-card.component.scss',
})
export class CommitteeLeadershipCardComponent {
  // Inputs
  public committee = input.required<Committee>();
  public canManage = input<boolean>(false);
  public chair = input<CommitteeLeadership | null | undefined>(null);
  public coChair = input<CommitteeLeadership | null | undefined>(null);
  public chairElectedDate = input<string>('');
  public coChairElectedDate = input<string>('');

  // Outputs
  public readonly assignLeadership = output<LeadershipRole>();
}
