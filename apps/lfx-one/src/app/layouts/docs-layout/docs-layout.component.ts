// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { DocSection, DocsService } from '../../modules/docs/services/docs.service';

@Component({
  selector: 'lfx-docs-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './docs-layout.component.html',
  styleUrl: './docs-layout.component.scss',
})
export class DocsLayoutComponent implements OnInit {
  private readonly docsService = inject(DocsService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly sections = signal<DocSection[]>([]);
  public readonly mobileNavOpen = signal(false);

  public ngOnInit(): void {
    this.docsService
      .getSections()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.sections.set(data.sections);
      });
  }

  public toggleMobileNav(): void {
    this.mobileNavOpen.update((v) => !v);
  }

  public closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }
}
