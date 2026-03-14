// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { HeaderComponent } from '@components/header/header.component';
import { TagComponent } from '@components/tag/tag.component';
import { PublicCommittee, getCommitteeCategorySeverity, TagSeverity } from '@lfx-one/shared';
import { COMMITTEE_LABEL } from '@lfx-one/shared/constants';
import { CommitteeService } from '@services/committee.service';
import { UserService } from '@services/user.service';
import { catchError, map, of, switchMap } from 'rxjs';

interface CommitteeLoadResult {
  committee: PublicCommittee | null;
  error: string | null;
}

@Component({
  selector: 'lfx-committee-public-view',
  imports: [HeaderComponent, CardComponent, ButtonComponent, TagComponent],
  templateUrl: './committee-public-view.component.html',
})
export class CommitteePublicViewComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly committeeService = inject(CommitteeService);
  private readonly userService = inject(UserService);

  public readonly committeeLabel = COMMITTEE_LABEL;
  public readonly authenticated: Signal<boolean> = this.userService.authenticated;

  public committee: Signal<PublicCommittee | null>;
  public error: Signal<string | null>;
  public loading: Signal<boolean>;

  public categorySeverity: Signal<TagSeverity>;
  public joinModeLabel: Signal<string>;
  public canJoin: Signal<boolean>;
  public canApply: Signal<boolean>;
  public isInviteOnly: Signal<boolean>;
  public isClosed: Signal<boolean>;

  public constructor() {
    const result = this.initializeCommittee();
    this.committee = result.committee;
    this.error = result.error;
    this.loading = result.loading;

    this.categorySeverity = computed(() => getCommitteeCategorySeverity(this.committee()?.category || ''));

    this.joinModeLabel = computed(() => {
      switch (this.committee()?.join_mode) {
        case 'open':
          return 'Open';
        case 'invite-only':
          return 'Invite Only';
        case 'apply':
          return 'Apply to Join';
        case 'closed':
          return 'Closed';
        default:
          return 'Closed';
      }
    });

    this.canJoin = computed(() => this.committee()?.join_mode === 'open' && this.authenticated());
    this.canApply = computed(() => this.committee()?.join_mode === 'apply' && this.authenticated());
    this.isInviteOnly = computed(() => this.committee()?.join_mode === 'invite-only');
    this.isClosed = computed(() => this.committee()?.join_mode === 'closed' || !this.committee()?.join_mode);
  }

  public signIn(): void {
    const committeeId = this.committee()?.uid;
    const returnTo = committeeId ? `/public/groups/${committeeId}` : '/';
    window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
  }

  public joinGroup(): void {
    const committee = this.committee();
    if (!committee) return;
    this.router.navigate(['/groups', committee.uid]);
  }

  public applyToJoin(): void {
    const committee = this.committee();
    if (!committee) return;
    this.router.navigate(['/groups', committee.uid]);
  }

  protected sanitizeUrl(url: string | undefined): string | null {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      return ['http:', 'https:', 'mailto:'].includes(parsed.protocol) ? url : null;
    } catch {
      return null;
    }
  }

  private initializeCommittee(): {
    committee: Signal<PublicCommittee | null>;
    error: Signal<string | null>;
    loading: Signal<boolean>;
  } {
    const initialValue: CommitteeLoadResult = { committee: null, error: null };

    const data$ = this.route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id');
        if (!id) {
          return of<CommitteeLoadResult>({ committee: null, error: 'No committee ID provided' });
        }
        return this.committeeService.getPublicCommitteeById(id).pipe(
          map((committee): CommitteeLoadResult => ({ committee, error: null })),
          catchError((err) => {
            const status = err?.status;
            if (status === 404) {
              return of<CommitteeLoadResult>({ committee: null, error: `${this.committeeLabel.singular} not found` });
            }
            return of<CommitteeLoadResult>({ committee: null, error: `Failed to load ${this.committeeLabel.singular.toLowerCase()}` });
          })
        );
      })
    );

    const result = toSignal(data$, { initialValue });

    return {
      committee: computed(() => result().committee),
      error: computed(() => result().error),
      loading: computed(() => result().committee === null && result().error === null),
    };
  }
}
