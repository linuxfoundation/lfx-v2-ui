// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CardComponent } from '@shared/components/card/card.component';
import { MessageComponent } from '@shared/components/message/message.component';
import { UserService } from '@shared/services/user.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { finalize } from 'rxjs';

@Component({
  selector: 'lfx-profile-developer',
  standalone: true,
  imports: [CommonModule, CardComponent, MessageComponent, ToastModule],
  providers: [MessageService],
  templateUrl: './profile-developer.component.html',
})
export class ProfileDeveloperComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly messageService = inject(MessageService);

  // State signals
  private readonly loadingSignal = signal<boolean>(false);
  private readonly apiTokenSignal = signal<string>('');

  public readonly isLoading = computed(() => this.loadingSignal());
  public readonly apiToken = computed(() => this.apiTokenSignal());

  // Token visibility toggle
  public maskToken = signal<boolean>(true);

  // Computed masked token
  public readonly maskedToken = computed(() => {
    const token = this.apiToken();
    if (!token) return '';
    if (token.length <= 8) return '*'.repeat(token.length);
    // Show first 4 chars + fixed number of asterisks + last 4 chars for better UX
    return token.substring(0, 4) + '••••••••••••' + token.substring(token.length - 4);
  });

  public ngOnInit(): void {
    this.loadTokenData();
  }

  public toggleTokenVisibility(): void {
    this.maskToken.set(!this.maskToken());
  }

  public async copyToken(): Promise<void> {
    const token = this.apiToken();
    if (!token) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Token',
        detail: 'No API token available to copy.',
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(token);
      this.messageService.add({
        severity: 'success',
        summary: 'Copied',
        detail: 'API token copied to clipboard successfully.',
      });
    } catch (error) {
      console.error('Failed to copy token:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Copy Failed',
        detail: 'Failed to copy token to clipboard. Please try again.',
      });
    }
  }

  private loadTokenData(): void {
    this.loadingSignal.set(true);

    this.userService
      .getDeveloperTokenInfo()
      .pipe(finalize(() => this.loadingSignal.set(false)))
      .subscribe({
        next: (tokenInfo) => {
          this.apiTokenSignal.set(tokenInfo.token);
        },
        error: (error) => {
          console.error('Failed to load developer token:', error);
          this.apiTokenSignal.set('Error loading token');
          this.messageService.add({
            severity: 'error',
            summary: 'Token Error',
            detail: 'Failed to load API token. Please refresh the page.',
          });
        },
      });
  }
}
