// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { DocSection, DocsService } from '../../modules/docs/services/docs.service';

@Component({
  selector: 'lfx-docs-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './docs-layout.component.html',
  styleUrl: './docs-layout.component.scss',
})
export class DocsLayoutComponent implements OnInit {
  private readonly docsService = inject(DocsService);
  private readonly router = inject(Router);

  readonly sections = signal<DocSection[]>([]);
  readonly mobileNavOpen = signal(false);

  ngOnInit(): void {
    this.docsService.getSections().subscribe((data) => {
      this.sections.set(data.sections);
    });
  }

  toggleMobileNav(): void {
    this.mobileNavOpen.update((v) => !v);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }
}
