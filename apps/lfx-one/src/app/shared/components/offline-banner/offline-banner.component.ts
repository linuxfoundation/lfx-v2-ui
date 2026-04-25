// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, effect, inject, Signal } from '@angular/core';
import { NetworkStatusService } from '@services/network-status.service';
import { OfflineQueueService } from '@services/offline-queue.service';

@Component({
  selector: 'lfx-offline-banner',
  imports: [],
  templateUrl: './offline-banner.component.html',
  styleUrl: './offline-banner.component.scss',
})
export class OfflineBannerComponent {
  private readonly networkStatus = inject(NetworkStatusService);
  private readonly offlineQueue = inject(OfflineQueueService);

  protected readonly offline = this.networkStatus.offline;
  protected readonly slow = this.networkStatus.slow;
  protected readonly online = this.networkStatus.online;
  protected readonly queued = this.offlineQueue.queued;
  protected readonly hasQueue = this.offlineQueue.hasQueue;

  protected readonly queueLabel: Signal<string> = computed(() => {
    const count = this.queued();
    return `${count} action${count === 1 ? '' : 's'} queued`;
  });

  public constructor() {
    // Re-poll queue size when the connection comes back so the banner
    // updates promptly after a reconnect-driven sync.
    effect(() => {
      if (this.online()) {
        this.offlineQueue.refresh();
      }
    });
  }
}
