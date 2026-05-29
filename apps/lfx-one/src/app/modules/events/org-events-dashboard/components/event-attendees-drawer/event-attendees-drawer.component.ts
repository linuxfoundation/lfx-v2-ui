// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { Component, computed, inject, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { OrgEventAttendee, OrgEventAttendeesResponse } from '@lfx-one/shared/interfaces';
import { AccountContextService } from '@app/shared/services/account-context.service';
import { EventsService } from '@app/shared/services/events.service';
import { InputTextModule } from 'primeng/inputtext';
import { DrawerModule } from 'primeng/drawer';
import { catchError, finalize, of, skip, switchMap } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

const AVATAR_COLORS = ['bg-blue-600', 'bg-purple-600', 'bg-emerald-600', 'bg-orange-500', 'bg-red-500', 'bg-teal-600', 'bg-indigo-600', 'bg-amber-500'];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[Math.abs(hash)];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

@Component({
  selector: 'lfx-event-attendees-drawer',
  imports: [FormsModule, DrawerModule, InputTextModule],
  templateUrl: './event-attendees-drawer.component.html',
})
export class EventAttendeesDrawerComponent {
  private readonly eventsService = inject(EventsService);
  private readonly accountContext = inject(AccountContextService);

  public readonly visible = model<boolean>(false);
  public readonly eventId = input<string>('');
  public readonly eventName = input<string>('');
  public readonly attendeeCount = input<number>(0);

  protected readonly companyName = computed(() => this.accountContext.selectedAccount().accountName ?? '');
  protected readonly searchTerm = signal('');
  protected readonly loading = signal(false);

  private readonly attendeesData = this.initAttendeesData();

  protected readonly filteredAttendees = computed<OrgEventAttendee[]>(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const data = this.attendeesData()?.data ?? [];
    if (!term) return [...data];
    return data.filter((a) => a.name.toLowerCase().includes(term) || (a.jobTitle ?? '').toLowerCase().includes(term));
  });

  protected avatarColor(name: string): string {
    return avatarColor(name);
  }

  protected initials(name: string): string {
    return initials(name);
  }

  protected onClose(): void {
    this.visible.set(false);
  }

  private initAttendeesData() {
    return toSignal(
      toObservable(this.visible).pipe(
        skip(1),
        switchMap((isVisible) => {
          if (!isVisible || !this.eventId()) return of(null);
          const accountId = this.accountContext.selectedAccount().accountId;
          if (!accountId) return of(null);
          this.searchTerm.set('');
          this.loading.set(true);
          return this.eventsService.getEventAttendees(accountId, this.eventId()).pipe(
            catchError(() => of({ eventId: this.eventId(), eventName: this.eventName(), total: 0, data: [] } as OrgEventAttendeesResponse)),
            finalize(() => this.loading.set(false))
          );
        })
      ),
      { initialValue: null }
    );
  }
}
