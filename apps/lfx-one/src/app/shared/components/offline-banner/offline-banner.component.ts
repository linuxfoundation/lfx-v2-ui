// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, inject } from '@angular/core';
import { NetworkStatusService } from '@services/network-status.service';

@Component({
  selector: 'lfx-offline-banner',
  imports: [],
  templateUrl: './offline-banner.component.html',
  styleUrl: './offline-banner.component.scss',
})
export class OfflineBannerComponent {
  private readonly networkStatus = inject(NetworkStatusService);

  protected readonly offline = this.networkStatus.offline;
  protected readonly slow = this.networkStatus.slow;
  protected readonly online = this.networkStatus.online;
}
