// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, input, Signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'lfx-newsletter-preview',
  templateUrl: './newsletter-preview.component.html',
  styleUrl: './newsletter-preview.component.scss',
})
export class NewsletterPreviewComponent {
  // Inputs
  public readonly subject = input<string>('');
  public readonly bodyHtml = input<string>('');
  public readonly edName = input<string>('');
  public readonly logoUrl = input<string | undefined>(undefined);
  public readonly displayName = input<string>('');
  public readonly edReplyEmail = input<string>('');

  // Computed
  public readonly trustedBody: Signal<SafeHtml> = this.initTrustedBody();
  public readonly hasContent: Signal<boolean> = computed(() => Boolean(this.subject().trim() || this.bodyHtml().trim()));

  private readonly sanitizer = inject(DomSanitizer);

  private initTrustedBody(): Signal<SafeHtml> {
    return computed(() => this.sanitizer.bypassSecurityTrustHtml(this.bodyHtml() || ''));
  }
}
