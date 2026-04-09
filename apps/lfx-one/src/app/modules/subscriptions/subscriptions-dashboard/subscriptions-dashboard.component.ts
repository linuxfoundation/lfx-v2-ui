// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, Signal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FilterPillOption, UserEmail, UserSubscription } from '@lfx-one/shared/interfaces';
import { catchError, filter, of, startWith, switchMap } from 'rxjs';

import { DecimalPipe } from '@angular/common';

import { ButtonComponent } from '@components/button/button.component';
import { FilterPillsComponent } from '@components/filter-pills/filter-pills.component';
import { SelectComponent } from '@components/select/select.component';
import { SubscriptionService } from '@services/subscription.service';
import { UserService } from '@services/user.service';

const TAB_OPTIONS: FilterPillOption[] = [
  { id: 'my-subscriptions', label: 'My Subscriptions' },
  { id: 'browse', label: 'Browse Subscriptions' },
];

interface EmailOption {
  label: string;
  value: string;
}

interface SubscriptionGroup {
  project_uid: string;
  project_name: string;
  mailing_lists: UserSubscription[];
}

@Component({
  selector: 'lfx-subscriptions-dashboard',
  imports: [ButtonComponent, DecimalPipe, FilterPillsComponent, ReactiveFormsModule, SelectComponent],
  templateUrl: './subscriptions-dashboard.component.html',
})
export class SubscriptionsDashboardComponent {
  // ─── Private Injections ────────────────────────────────────────────────────
  private readonly userService = inject(UserService);
  private readonly subscriptionService = inject(SubscriptionService);

  // ─── Configuration ─────────────────────────────────────────────────────────
  protected readonly tabOptions = TAB_OPTIONS;

  // ─── Forms ─────────────────────────────────────────────────────────────────
  protected readonly emailForm = new FormGroup({
    email: new FormControl<string>(''),
  });

  // ─── Writable Signals ──────────────────────────────────────────────────────
  protected readonly activeTab = signal<string>('my-subscriptions');
  protected readonly togglingListId = signal<string | null>(null);
  private readonly refreshTrigger = signal(0);

  // ─── Computed Signals ──────────────────────────────────────────────────────
  protected readonly emailOptions: Signal<EmailOption[]> = this.initEmailOptions();
  protected readonly selectedEmail: Signal<string> = this.initSelectedEmail();
  protected readonly subscriptions: Signal<UserSubscription[]> = this.initSubscriptions();
  protected readonly loading: Signal<boolean> = this.initLoading();
  protected readonly subscriptionGroups: Signal<SubscriptionGroup[]> = this.initSubscriptionGroups();

  // ─── Protected Methods ─────────────────────────────────────────────────────
  protected onTabChange(tabId: string): void {
    this.activeTab.set(tabId);
  }

  protected async toggleSubscription(list: UserSubscription): Promise<void> {
    if (this.togglingListId()) return;

    const email = this.selectedEmail();
    if (!email) return;

    this.togglingListId.set(list.mailing_list_uid);

    if (list.subscribed && list.member_uid) {
      this.subscriptionService
        .unsubscribe(list.mailing_list_uid, list.member_uid)
        .pipe(catchError(() => of(null)))
        .subscribe(() => {
          this.togglingListId.set(null);
          this.refreshSubscriptions();
        });
    } else if (!list.subscribed) {
      this.subscriptionService
        .subscribe(list.mailing_list_uid, email)
        .pipe(catchError(() => of(null)))
        .subscribe(() => {
          this.togglingListId.set(null);
          this.refreshSubscriptions();
        });
    } else {
      this.togglingListId.set(null);
    }
  }

  private refreshSubscriptions(): void {
    this.refreshTrigger.update((n) => n + 1);
  }

  // ─── Private Initializers ──────────────────────────────────────────────────
  private initEmailOptions(): Signal<EmailOption[]> {
    const emails$ = this.userService.getUserEmails().pipe(catchError(() => of({ emails: [] as UserEmail[], preferences: null })));
    const emails = toSignal(emails$, { initialValue: { emails: [] as UserEmail[], preferences: null } });
    return computed(() =>
      (emails().emails ?? []).map((e) => ({
        label: e.email,
        value: e.email,
      }))
    );
  }

  private initSelectedEmail(): Signal<string> {
    const emailControl = this.emailForm.get('email')!;
    const valueChange$ = emailControl.valueChanges.pipe(startWith(emailControl.value));
    return toSignal(valueChange$, { initialValue: '' }) as Signal<string>;
  }

  private initSubscriptions(): Signal<UserSubscription[]> {
    const result = toSignal(
      toObservable(this.selectedEmail).pipe(
        filter((email) => !!email),
        switchMap((email) =>
          toObservable(this.refreshTrigger).pipe(
            switchMap(() => this.subscriptionService.getUserSubscriptions(email!).pipe(catchError(() => of({ email: email!, subscriptions: [] }))))
          )
        )
      ),
      { initialValue: null }
    );
    return computed(() => result()?.subscriptions ?? []);
  }

  private initLoading(): Signal<boolean> {
    const fetching = toSignal(
      toObservable(this.selectedEmail).pipe(
        switchMap((email) => {
          if (!email) return of(false);
          return toObservable(this.refreshTrigger).pipe(
            switchMap(() =>
              this.subscriptionService.getUserSubscriptions(email).pipe(
                switchMap(() => of(false)),
                startWith(true),
                catchError(() => of(false))
              )
            )
          );
        }),
        startWith(false)
      ),
      { initialValue: false }
    );
    return computed(() => fetching() ?? false);
  }

  private initSubscriptionGroups(): Signal<SubscriptionGroup[]> {
    return computed(() => {
      const subs = this.subscriptions();
      const map = new Map<string, SubscriptionGroup>();
      for (const sub of subs) {
        if (!map.has(sub.project_uid)) {
          map.set(sub.project_uid, {
            project_uid: sub.project_uid,
            project_name: sub.project_name,
            mailing_lists: [],
          });
        }
        map.get(sub.project_uid)!.mailing_lists.push(sub);
      }
      return Array.from(map.values()).sort((a, b) => a.project_name.localeCompare(b.project_name));
    });
  }
}
