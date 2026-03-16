// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, signal, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe, NgClass } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '@components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { TagComponent } from '@components/tag/tag.component';
import { Committee, CommitteeMemberVisibility, getCommitteeCategorySeverity, TagSeverity } from '@lfx-one/shared';
import { CommitteeService } from '@services/committee.service';
import { RouteLoadingComponent } from '@components/loading/route-loading.component';
import { JoinModeLabelPipe } from '@pipes/join-mode-label.pipe';
import { MenuItem, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { BehaviorSubject, catchError, combineLatest, finalize, of, switchMap } from 'rxjs';

@Component({
  selector: 'lfx-committee-view',
  imports: [
    BreadcrumbComponent,
    CardComponent,
    ButtonComponent,
    TagComponent,
    ConfirmDialogModule,
    RouterLink,
    RouteLoadingComponent,
    DatePipe,
    NgClass,
    JoinModeLabelPipe,
  ],
  templateUrl: './committee-view.component.html',
  styleUrl: './committee-view.component.scss',
})
export class CommitteeViewComponent {
  // -- Injections --
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly committeeService = inject(CommitteeService);
  private readonly messageService = inject(MessageService);

  // -- Tab state --
  public activeTab = signal<string>('overview');

  // -- Writable signals --
  public loading = signal<boolean>(true);
  public error = signal<boolean>(false);
  public refresh = new BehaviorSubject<void>(undefined);

  // -- Computed / toSignal --
  public committee: Signal<Committee | null> = this.initializeCommittee();

  public categorySeverity: Signal<TagSeverity> = computed(() => {
    const category = this.committee()?.category;
    return getCommitteeCategorySeverity(category || '');
  });

  public breadcrumbItems: Signal<MenuItem[]> = computed(() => [{ label: 'Groups', routerLink: ['/groups'] }, { label: this.committee()?.name || '' }]);

  public canEdit: Signal<boolean> = computed(() => !!this.committee()?.writer);

  // -- Tab visibility signals --
  public isMembersTabVisible: Signal<boolean> = computed(() => this.committee()?.member_visibility !== CommitteeMemberVisibility.HIDDEN || this.canEdit());
  public isVotesTabVisible: Signal<boolean> = computed(() => !!this.committee()?.enable_voting);

  // -- Public methods --
  public goBack(): void {
    this.router.navigate(['/', 'groups']);
  }

  public refreshCommittee(): void {
    this.loading.set(true);
    this.refresh.next();
  }

  // -- Private initializer functions --
  private initializeCommittee(): Signal<Committee | null> {
    return toSignal(
      combineLatest([this.route.paramMap, this.refresh]).pipe(
        switchMap(([params]) => {
          const committeeId = params?.get('id');
          if (!committeeId) {
            this.error.set(true);
            this.loading.set(false);
            return of(null);
          }

          this.error.set(false);
          this.loading.set(true);

          return this.committeeService.getCommittee(committeeId).pipe(
            catchError(() => {
              this.error.set(true);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load group details',
              });
              return of(null);
            }),
            finalize(() => this.loading.set(false))
          );
        })
      ),
      { initialValue: null }
    );
  }
}
