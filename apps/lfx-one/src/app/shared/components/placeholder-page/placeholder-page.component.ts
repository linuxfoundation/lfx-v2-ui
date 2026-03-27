// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  selector: 'lfx-placeholder-page',
  imports: [RouterModule],
  templateUrl: './placeholder-page.component.html',
})
export class PlaceholderPageComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly pageTitle = this.route.snapshot.data['title'] as string | undefined;
}
