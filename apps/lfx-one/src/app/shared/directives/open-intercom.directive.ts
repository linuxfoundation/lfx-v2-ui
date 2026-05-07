// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Directive, HostBinding, HostListener, inject } from '@angular/core';
import { IntercomService } from '@services/intercom.service';

/**
 * Attribute directive that opens the Intercom Messenger on click.
 *
 * Usage: `<button type="button" lfxOpenIntercom>Support</button>`
 *
 * Adds the `open-intercom-bot` host class so global styles can target every
 * Intercom-launching element uniformly.
 */
@Directive({
  selector: '[lfxOpenIntercom]',
})
export class OpenIntercomDirective {
  @HostBinding('class.open-intercom-bot')
  public readonly intercomClass = true;

  private readonly intercomService = inject(IntercomService);

  @HostListener('click')
  public onClick(): void {
    this.intercomService.show();
  }
}
