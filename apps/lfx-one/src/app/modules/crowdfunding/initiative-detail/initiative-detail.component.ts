// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonComponent } from '@components/button/button.component';
import { TagComponent } from '@components/tag/tag.component';
import { map } from 'rxjs';

@Component({
  selector: 'lfx-initiative-detail',
  imports: [ButtonComponent, TagComponent],
  templateUrl: './initiative-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InitiativeDetailComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly initiativeId = toSignal(this.route.paramMap.pipe(map((params) => params.get('id') ?? '')), { initialValue: '' });
}
