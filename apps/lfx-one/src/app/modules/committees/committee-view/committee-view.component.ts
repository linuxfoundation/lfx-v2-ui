// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '@components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { TagComponent } from '@components/tag/tag.component';
import { Committee, CommitteeMember, getCommitteeCategorySeverity, Meeting, TagSeverity } from '@lfx-one/shared';
import { CommitteeMemberVotingStatus } from '@lfx-one/shared/enums';
import { CommitteeService } from '@services/committee.service';
import { MeetingService } from '@services/meeting.service';
import { PersonaService } from '@services/persona.service';
import { MenuItem, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { BehaviorSubject, catchError, combineLatest, finalize, map, of, switchMap, throwError } from 'rxjs';

import { CommitteeMembersComponent } from '../components/committee-members/committee-members.component';

@Component({
  selector: 'lfx-committee-view',
  imports: [
    DatePipe,
    RouterLink,
    BreadcrumbComponent,
    CardComponent,
    ButtonComponent,
    TagComponent,
    CommitteeMembersComponent,
    ConfirmDialogModule,
    Tabs,
    Tab,
    TabList,
    TabPanel,
    TabPanels,
    TooltipModule,
  ],
  templateUrl: './committee-view.component.html',
  styleUrl: './committee-view.component.scss',
})
export class CommitteeViewComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly committeeService = inject(CommitteeService);
  private readonly meetingService = inject(MeetingService);
  private readonly messageService = inject(MessageService);
  private readonly personaService = inject(PersonaService);

  // State signals
  public error = signal<boolean>(false);
  public loading = signal<boolean>(true);
  public members = signal<CommitteeMember[]>([]);
  public membersLoading = signal<boolean>(true);
  public upcomingMeetingsLoading = signal<boolean>(true);
  public refresh = new BehaviorSubject<void>(undefined);

  // Computed / Read-only signals
  public committee: Signal<Committee | null> = this.initializeCommittee();
  public formattedCreatedDate: Signal<string> = this.initializeFormattedCreatedDate();
  public formattedUpdatedDate: Signal<string> = this.initializeFormattedUpdatedDate();
  public upcomingMeetings: Signal<Meeting[]> = this.initializeUpcomingMeetings();

  public categorySeverity: Signal<TagSeverity> = computed(() => {
    return getCommitteeCategorySeverity(this.committee()?.category || '');
  });

  public breadcrumbItems: Signal<MenuItem[]> = computed(() => [{ label: 'Groups', routerLink: ['/groups'] }, { label: this.committee()?.name || '' }]);

  public isBoardMember: Signal<boolean> = computed(() => this.personaService.currentPersona() === 'board-member');

  public totalMembers: Signal<number> = computed(() => this.committee()?.total_members || 0);

  public activeVoters: Signal<number> = computed(() => {
    if (!this.committee()?.enable_voting) return 0;
    return this.members().filter(
      (m) => m.voting?.status === CommitteeMemberVotingStatus.VOTING_REP || m.voting?.status === CommitteeMemberVotingStatus.ALTERNATE_VOTING_REP
    ).length;
  });

  // Public methods
  public goBack(): void {
    this.router.navigate(['/', 'groups']);
  }

  public refreshMembers(): void {
    this.refresh.next();
  }

  // Private initializer functions
  private initializeCommittee(): Signal<Committee | null> {
    return toSignal(
      combineLatest([this.route.paramMap, this.refresh]).pipe(
        switchMap(([params]) => {
          const committeeId = params?.get('id');
          if (!committeeId) {
            this.error.set(true);
            return of(null);
          }

          const committeeQuery = this.committeeService.getCommittee(committeeId).pipe(
            catchError(() => {
              console.error('Failed to load committee');
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load committee',
              });
              this.router.navigate(['/', 'groups']);
              return throwError(() => new Error('Failed to load committee'));
            })
          );

          const membersQuery = this.committeeService.getCommitteeMembers(committeeId).pipe(
            catchError(() => {
              console.error('Failed to load committee members');
              return of([]);
            })
          );

          return combineLatest([committeeQuery, membersQuery]).pipe(
            switchMap(([committee, members]) => {
              this.members.set(members);
              this.loading.set(false);
              this.membersLoading.set(false);
              return of(committee);
            })
          );
        })
      ),
      { initialValue: null }
    );
  }

  private initializeFormattedCreatedDate(): Signal<string> {
    return computed(() => {
      const committee = this.committee();
      if (!committee?.created_at) return '-';
      const date = new Date(committee.created_at);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    });
  }

  private initializeFormattedUpdatedDate(): Signal<string> {
    return computed(() => {
      const committee = this.committee();
      if (!committee?.updated_at) return '-';
      const date = new Date(committee.updated_at);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    });
  }

  private initializeUpcomingMeetings(): Signal<Meeting[]> {
    return toSignal(
      toObservable(this.committee).pipe(
        switchMap((committee) => {
          if (!committee?.project_uid) {
            this.upcomingMeetingsLoading.set(false);
            return of([]);
          }
          this.upcomingMeetingsLoading.set(true);
          return this.meetingService.getUpcomingMeetingsByProject(committee.project_uid, 10).pipe(
            map((meetings) => meetings.filter((m) => m.committees?.some((c) => c.uid === committee.uid))),
            catchError(() => of([])),
            finalize(() => this.upcomingMeetingsLoading.set(false))
          );
        })
      ),
      { initialValue: [] }
    );
  }
}
