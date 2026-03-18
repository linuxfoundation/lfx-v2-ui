// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NgClass } from '@angular/common';
import { Component, input } from '@angular/core';
import { CardComponent } from '@components/card/card.component';
import { Committee } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-committee-channels',
  imports: [NgClass, CardComponent],
  templateUrl: './committee-channels.component.html',
  styleUrl: './committee-channels.component.scss',
})
export class CommitteeChannelsComponent {
  public committee = input.required<Committee>();
}
