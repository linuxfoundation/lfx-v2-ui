// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NgClass } from '@angular/common';
import { Component, computed, inject, signal, Signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { BreadcrumbComponent } from '@components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { TagComponent } from '@components/tag/tag.component';
import { ChatPlatform, Committee, CommitteeMember, getCommitteeCategorySeverity, TagSeverity } from '@lfx-one/shared';
import { CommitteeService } from '@services/committee.service';
import { PersonaService } from '@services/persona.service';
import { MenuItem, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { BehaviorSubject, catchError, combineLatest, of, switchMap, throwError } from 'rxjs';

import { CommitteeMembersComponent } from '../components/committee-members/committee-members.component';

@Component({
  selector: 'lfx-committee-view',
  imports: [NgClass, FormsModule, BreadcrumbComponent, CardComponent, ButtonComponent, TagComponent, CommitteeMembersComponent, ConfirmDialogModule],
  templateUrl: './committee-view.component.html',
  styleUrl: './committee-view.component.scss',
})
export class CommitteeViewComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly committeeService = inject(CommitteeService);
  private readonly messageService = inject(MessageService);
  private readonly personaService = inject(PersonaService);

  public committee: Signal<Committee | null>;
  public members: WritableSignal<CommitteeMember[]>;
  public membersLoading: WritableSignal<boolean>;
  public loading: WritableSignal<boolean>;
  public error: WritableSignal<boolean>;
  public formattedCreatedDate: Signal<string>;
  public formattedUpdatedDate: Signal<string>;
  public refresh: BehaviorSubject<void>;
  public categorySeverity: Signal<TagSeverity>;
  public breadcrumbItems: Signal<MenuItem[]>;
  public isBoardMember: Signal<boolean>;
  public isMaintainer: Signal<boolean>;

  // Collaboration editing signals
  public editingCollaboration = signal(false);
  public collabSaving = signal(false);
  public collabEdit = signal<{
    mailingListName: string;
    mailingListUrl: string;
    chatChannelPlatform: string;
    chatChannelName: string;
    chatChannelUrl: string;
  }>({
    mailingListName: '',
    mailingListUrl: '',
    chatChannelPlatform: 'slack',
    chatChannelName: '',
    chatChannelUrl: '',
  });

  public constructor() {
    this.error = signal<boolean>(false);
    this.refresh = new BehaviorSubject<void>(undefined);
    this.members = signal<CommitteeMember[]>([]);
    this.membersLoading = signal<boolean>(true);
    this.loading = signal<boolean>(true);
    this.committee = this.initializeCommittee();
    this.formattedCreatedDate = this.initializeFormattedCreatedDate();
    this.formattedUpdatedDate = this.initializeFormattedUpdatedDate();
    this.categorySeverity = computed(() => {
      const category = this.committee()?.category;
      return getCommitteeCategorySeverity(category || '');
    });
    this.breadcrumbItems = computed(() => [{ label: 'Groups', routerLink: ['/groups'] }, { label: this.committee()?.name || '' }]);
    this.isBoardMember = computed(() => this.personaService.currentPersona() === 'board-member');
    this.isMaintainer = computed(() => this.personaService.currentPersona() === 'maintainer');
  }

  public goBack(): void {
    this.router.navigate(['/', 'groups']);
  }

  public refreshMembers(): void {
    this.refresh.next();
  }

  public startEditCollaboration(): void {
    const committee = this.committee();
    this.collabEdit.set({
      mailingListName: committee?.mailing_list?.name || '',
      mailingListUrl: committee?.mailing_list?.url || '',
      chatChannelPlatform: committee?.chat_channel?.platform || 'slack',
      chatChannelName: committee?.chat_channel?.name || '',
      chatChannelUrl: committee?.chat_channel?.url || '',
    });
    this.editingCollaboration.set(true);
  }

  public cancelEditCollaboration(): void {
    this.editingCollaboration.set(false);
  }

  public updateCollabField(field: string, value: string): void {
    this.collabEdit.update((current) => ({ ...current, [field]: value }));
  }

  public saveCollaboration(): void {
    const committeeId = this.committee()?.uid;
    if (!committeeId) return;

    this.collabSaving.set(true);
    const edit = this.collabEdit();

    const payload: Partial<Committee> = {
      mailing_list: edit.mailingListName
        ? { name: edit.mailingListName, url: edit.mailingListUrl || undefined, subscriber_count: this.committee()?.mailing_list?.subscriber_count }
        : undefined,
      chat_channel: edit.chatChannelName
        ? { platform: edit.chatChannelPlatform as ChatPlatform, name: edit.chatChannelName, url: edit.chatChannelUrl || undefined }
        : undefined,
    };

    this.committeeService.updateCommittee(committeeId, payload).subscribe({
      next: () => {
        this.collabSaving.set(false);
        this.editingCollaboration.set(false);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Collaboration channels updated' });
        this.refresh.next();
      },
      error: (err) => {
        this.collabSaving.set(false);
        console.error('Failed to update collaboration channels:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update collaboration channels' });
      },
    });
  }

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
        hour: '2-digit',
        minute: '2-digit',
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
        hour: '2-digit',
        minute: '2-digit',
      });
    });
  }
}
