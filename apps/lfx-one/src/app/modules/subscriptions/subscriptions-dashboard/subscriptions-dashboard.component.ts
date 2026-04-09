// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, Signal, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { FilterPillOption, UserSubscription } from '@lfx-one/shared/interfaces';
import { startWith } from 'rxjs';

import { ButtonComponent } from '@components/button/button.component';
import { FilterPillsComponent } from '@components/filter-pills/filter-pills.component';
import { SelectComponent } from '@components/select/select.component';
import { SubscriptionMockService } from '../subscription-mock.service';

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
  private readonly mockService = inject(SubscriptionMockService);

  // ─── Configuration ─────────────────────────────────────────────────────────
  protected readonly tabOptions = TAB_OPTIONS;

  // ─── Forms ─────────────────────────────────────────────────────────────────
  protected readonly emailForm = new FormGroup({
    email: new FormControl<string>(this.mockService.getEmails()[0] ?? ''),
  });

  // ─── Writable Signals ──────────────────────────────────────────────────────
  protected readonly activeTab = signal<string>('my-subscriptions');
  protected readonly togglingListId = signal<string | null>(null);
  private readonly subscriptionsState = signal<UserSubscription[]>([]);

  // ─── Computed Signals ──────────────────────────────────────────────────────
  protected readonly emailOptions: Signal<EmailOption[]> = this.initEmailOptions();
  protected readonly selectedEmail: Signal<string> = this.initSelectedEmail();
  protected readonly subscriptionGroups: Signal<SubscriptionGroup[]> = this.initSubscriptionGroups();

  // ─── Protected Methods ─────────────────────────────────────────────────────
  protected onTabChange(tabId: string): void {
    this.activeTab.set(tabId);
  }

  protected onEmailChange(): void {
    const email = this.emailForm.get('email')!.value ?? '';
    this.loadSubscriptions(email);
  }

  protected toggleSubscription(list: UserSubscription): void {
    if (this.togglingListId()) return;
    this.togglingListId.set(list.mailing_list_uid);

    // Optimistic update — toggle subscribed state in local signal
    this.subscriptionsState.update((subs) =>
      subs.map((s) => {
        if (s.mailing_list_uid !== list.mailing_list_uid) return s;
        return s.subscribed ? { ...s, subscribed: false, member_uid: undefined } : { ...s, subscribed: true, member_uid: `member-mock-${s.mailing_list_uid}` };
      })
    );

    // Simulate async operation
    setTimeout(() => this.togglingListId.set(null), 600);
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────
  private loadSubscriptions(email: string): void {
    if (!email) {
      this.subscriptionsState.set([]);
      return;
    }
    this.subscriptionsState.set(this.mockService.getSubscriptions(email).subscriptions);
  }

  // ─── Private Initializers ──────────────────────────────────────────────────
  private initEmailOptions(): Signal<EmailOption[]> {
    return signal(this.mockService.getEmails().map((e) => ({ label: e, value: e })));
  }

  private initSelectedEmail(): Signal<string> {
    const emailControl = this.emailForm.get('email')!;
    const value$ = emailControl.valueChanges.pipe(startWith(emailControl.value));
    const raw = toSignal(value$, { initialValue: emailControl.value });

    // Load initial data for the pre-selected email
    this.loadSubscriptions(emailControl.value ?? '');

    return computed(() => raw() ?? '');
  }

  private initSubscriptionGroups(): Signal<SubscriptionGroup[]> {
    return computed(() => {
      const subs = this.subscriptionsState();
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
