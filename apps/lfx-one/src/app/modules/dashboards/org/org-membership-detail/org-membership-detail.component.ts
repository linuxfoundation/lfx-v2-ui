// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AccountContextService } from '@services/account-context.service';
import { OrgLensMembershipsService } from '@services/org-lens-memberships.service';
import { CardComponent } from '@components/card/card.component';
import { EmptyStateComponent } from '@components/empty-state/empty-state.component';
import type {
  OrgMembershipDetailResponse,
  OrgMembershipKeyContact,
  OrgMembershipKeyContactPerson,
  OrgMembershipKeyContactType,
} from '@lfx-one/shared/interfaces';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { catchError, combineLatest, filter, of, switchMap, tap } from 'rxjs';

import { BoardCommitteeCardComponent } from './components/board-committee-card.component';
import { DocumentationTabComponent } from './components/documentation-tab.component';
import { EditKeyContactModalComponent, type EditKeyContactRemoveEvent, type EditKeyContactSubmitEvent } from './components/edit-key-contact-modal.component';

type PageState = 'loading' | 'error' | 'ready' | 'empty' | 'notFound';
type MembershipDetailTab = 'key-contacts' | 'board' | 'docs' | 'governance';

/** Whitelist used by the URL-fragment ↔ tab sync (spec 016 round 7 enhancement — reverses spec 015 round 2 Q-no-URL decision). */
const TAB_FRAGMENTS: readonly MembershipDetailTab[] = ['key-contacts', 'board', 'docs', 'governance'] as const;
const DEFAULT_TAB: MembershipDetailTab = 'key-contacts';

/** Parse a URL fragment into a tab id, defaulting to `key-contacts` for empty / unknown values. */
function fragmentToTab(fragment: string | null | undefined): MembershipDetailTab {
  const candidate = (fragment ?? '').toLowerCase().trim();
  return (TAB_FRAGMENTS as readonly string[]).includes(candidate) ? (candidate as MembershipDetailTab) : DEFAULT_TAB;
}

interface ModalOpenState {
  contact: OrgMembershipKeyContact;
  editingPersonId: string | null;
}

@Component({
  selector: 'lfx-org-membership-detail',
  standalone: true,
  imports: [
    RouterLink,
    CardComponent,
    EmptyStateComponent,
    TooltipModule,
    ToastModule,
    EditKeyContactModalComponent,
    BoardCommitteeCardComponent,
    DocumentationTabComponent,
  ],
  providers: [MessageService],
  templateUrl: './org-membership-detail.component.html',
})
export class OrgMembershipDetailComponent {
  protected readonly accountContext = inject(AccountContextService);
  private readonly membershipsService = inject(OrgLensMembershipsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);

  /**
   * Active tab signal. Synced two-way with the URL fragment (`#key-contacts`,
   * `#board`, `#docs`, `#governance`). Initial value comes from
   * `route.snapshot.fragment`; subsequent fragment changes (browser back/forward
   * or external link) update the signal; user tab clicks update the URL via
   * `switchTab()`. (Spec 016 round 7 enhancement — reverses spec 015 round 2
   * "tab state is component-local" clarification to simplify e2e navigation.)
   */
  protected readonly activeTab = signal<MembershipDetailTab>(fragmentToTab(this.route.snapshot.fragment));
  protected readonly retryTrigger = signal(0);
  protected readonly fetchLoading = signal(true);
  protected readonly fetchError = signal(false);

  // Local mutable copy of keyContacts so the modal can mutate without triggering a refetch
  protected readonly keyContacts = signal<OrgMembershipKeyContact[]>([]);
  protected readonly foundation = signal<OrgMembershipDetailResponse['foundation']>(null);

  protected readonly modalState = signal<ModalOpenState | null>(null);
  protected readonly modalVisible = signal(false);

  protected readonly tabs = [
    { id: 'key-contacts' as const, label: 'Key Contacts', icon: 'fa-light fa-address-card' },
    { id: 'board' as const, label: 'Board & Committee', icon: 'fa-light fa-users-rectangle' },
    { id: 'docs' as const, label: 'Documentation', icon: 'fa-light fa-file-lines' },
    { id: 'governance' as const, label: 'Governance', icon: 'fa-light fa-layer-group' },
  ];

  private readonly accountId$ = toObservable(computed(() => this.accountContext.selectedAccount()?.accountId));
  private readonly foundationId$ = toObservable(
    computed(() => {
      // Use snapshot via signal — paramMap is hot-reload reactive
      const params = this.route.snapshot.paramMap;
      return params.get('foundationId');
    })
  );
  private readonly retryTrigger$ = toObservable(this.retryTrigger);

  private readonly detail$ = combineLatest([
    this.accountId$.pipe(filter((id): id is string => !!id)),
    this.foundationId$.pipe(filter((id): id is string => !!id)),
    this.retryTrigger$,
  ]).pipe(
    tap(() => {
      this.fetchLoading.set(true);
      this.fetchError.set(false);
    }),
    switchMap(([accountId, foundationId]) =>
      this.membershipsService.getMembershipDetail(accountId, foundationId).pipe(
        catchError(() => {
          this.fetchError.set(true);
          this.fetchLoading.set(false);
          return of(null);
        })
      )
    ),
    tap((response) => {
      this.fetchLoading.set(false);
      if (response) {
        this.foundation.set(response.foundation);
        this.keyContacts.set(response.keyContacts);
      }
    })
  );

  // Subscribe via toSignal so the observable runs (read in template indirectly via pageState/foundation/keyContacts)
  protected readonly detailData = toSignal<OrgMembershipDetailResponse | null>(this.detail$, { initialValue: null });

  protected readonly pageState = computed<PageState>(() => {
    if (this.fetchLoading()) return 'loading';
    if (this.fetchError()) return 'error';
    const data = this.detailData();
    if (!data) return 'loading';
    if (!data.foundation) return 'notFound';
    if (this.keyContacts().length === 0) return 'empty';
    return 'ready';
  });

  public constructor() {
    // React to browser back/forward and externally-changed fragments without
    // triggering a re-fetch. `replaceUrl: true` in switchTab() avoids polluting
    // history when the change originates from a user tab click.
    this.route.fragment.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((fragment) => {
      const next = fragmentToTab(fragment);
      if (next !== this.activeTab()) {
        this.activeTab.set(next);
      }
    });
  }

  protected switchTab(tab: MembershipDetailTab): void {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    // Sync URL fragment. `replaceUrl: true` because tab switches are not navigation
    // events worth a browser-history entry; matches the existing UX precedent for
    // signal-driven tab UIs in this codebase.
    void this.router.navigate([], {
      relativeTo: this.route,
      fragment: tab,
      replaceUrl: true,
      queryParamsHandling: 'preserve',
    });
  }

  protected retry(): void {
    this.retryTrigger.update((v) => v + 1);
  }

  protected formatDateShort(dateString: string | null): string {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  }

  protected onPencilClick(contact: OrgMembershipKeyContact): void {
    const editingPersonId = contact.maxContacts === 1 && contact.people.length === 1 ? contact.people[0].personId : null;
    this.modalState.set({ contact, editingPersonId });
    this.modalVisible.set(true);
  }

  protected onModalHide(): void {
    this.modalVisible.set(false);
    // Defer clearing state until after the close animation so the modal renders cleanly
    setTimeout(() => this.modalState.set(null), 200);
  }

  protected onReplaceSubmit(event: EditKeyContactSubmitEvent): void {
    this.keyContacts.update((rows) =>
      rows.map((row) => {
        if (row.contactType !== event.contactType) return row;
        const newPeople = row.people.map((p) => (p.personId === event.editingPersonId ? event.person : p));
        return { ...row, people: newPeople };
      })
    );
    this.messageService.add({
      key: 'key-contact-toast-success-updated',
      severity: 'success',
      summary: 'Key contact updated',
      life: 3000,
    });
  }

  protected onAddSubmit(event: EditKeyContactSubmitEvent): void {
    this.keyContacts.update((rows) =>
      rows.map((row) => {
        if (row.contactType !== event.contactType) return row;
        return { ...row, people: [...row.people, event.person] };
      })
    );
    this.messageService.add({
      key: 'key-contact-toast-success-added',
      severity: 'success',
      summary: 'Key contact added',
      life: 3000,
    });
  }

  protected onRemoveSubmit(event: EditKeyContactRemoveEvent): void {
    let removedPerson: OrgMembershipKeyContactPerson | undefined;
    let originalIndex = -1;
    this.keyContacts.update((rows) =>
      rows.map((row) => {
        if (row.contactType !== event.contactType) return row;
        originalIndex = row.people.findIndex((p) => p.personId === event.personId);
        if (originalIndex === -1) return row;
        removedPerson = row.people[originalIndex];
        return { ...row, people: row.people.filter((p) => p.personId !== event.personId) };
      })
    );

    if (!removedPerson) return;

    // Dismiss any previous undo toast before showing a new one (FR-016g cancellation rule)
    this.messageService.clear('key-contact-toast-remove');

    const personToRestore = removedPerson;
    const contactType = event.contactType;
    const contactTypeLabel = event.contactTypeLabel;
    const insertAtIndex = originalIndex;

    this.messageService.add({
      key: 'key-contact-toast-remove',
      severity: 'success',
      summary: 'Key contact removed',
      detail: `${personToRestore.fullName} is no longer a ${contactTypeLabel}.`,
      life: 5000,
      data: {
        undo: () => {
          this.keyContacts.update((rows) =>
            rows.map((row) => {
              if (row.contactType !== contactType) return row;
              const newPeople = [...row.people];
              newPeople.splice(Math.max(0, Math.min(insertAtIndex, newPeople.length)), 0, personToRestore);
              return { ...row, people: newPeople };
            })
          );
          this.messageService.clear('key-contact-toast-remove');
          this.messageService.add({
            key: 'key-contact-toast-undone',
            severity: 'success',
            summary: 'Removal undone',
            life: 3000,
          });
        },
      },
    });
  }

  // Helpers used by the template
  protected isEmptyRow(contact: OrgMembershipKeyContact): boolean {
    return contact.people.length === 0;
  }

  protected pencilAriaLabel(contact: OrgMembershipKeyContact): string {
    return contact.people.length === 0 ? `Add ${contact.contactTypeLabel} for this membership` : `Edit ${contact.contactTypeLabel} for this membership`;
  }

  protected trackContactType(_index: number, contact: OrgMembershipKeyContact): OrgMembershipKeyContactType {
    return contact.contactType;
  }

  protected trackPersonId(_index: number, person: OrgMembershipKeyContactPerson): string {
    return person.personId;
  }
}
