// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Directive, HostBinding, HostListener, inject } from '@angular/core';
import { environment } from '@environments/environment';
import { IntercomService } from '@services/intercom.service';

/**
 * Attribute directive that opens the Intercom Messenger on click.
 *
 * Usage: `<button type="button" lfxOpenIntercom>Support</button>`
 *
 * Adds the `open-intercom-bot` host class so global styles can target every
 * Intercom-launching element uniformly. Falls back to the Jira service desk
 * when Intercom is not yet booted (feature flag off, missing config, or
 * user clicked before boot completed).
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
    if (this.intercomService.isIntercomBooted()) {
      this.intercomService.show();
    } else {
      window.open(environment.urls.support, '_blank', 'noopener,noreferrer');
    }
  }
}
