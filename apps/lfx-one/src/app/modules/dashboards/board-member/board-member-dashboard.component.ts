// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component } from '@angular/core';
import { FoundationHealthComponent } from '../components/foundation-health/foundation-health.component';
import { MyMeetingsComponent } from '../components/my-meetings/my-meetings.component';
import { OrganizationInvolvementComponent } from '../components/organization-involvement/organization-involvement.component';
import { PendingActionsComponent } from '../components/pending-actions/pending-actions.component';

@Component({
  selector: 'lfx-board-member-dashboard',
  imports: [OrganizationInvolvementComponent, PendingActionsComponent, MyMeetingsComponent, FoundationHealthComponent],
  templateUrl: './board-member-dashboard.component.html',
  styleUrl: './board-member-dashboard.component.scss',
})
export class BoardMemberDashboardComponent {}
