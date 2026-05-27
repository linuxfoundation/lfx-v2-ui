// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, inject, OnInit, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { DocSection, DocsService } from '../services/docs.service';

@Component({
  selector: 'lfx-docs-landing',
  imports: [RouterLink],
  templateUrl: './docs-landing.component.html',
  styleUrl: './docs-landing.component.scss',
})
export class DocsLandingComponent implements OnInit {
  private readonly docsService = inject(DocsService);
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);

  public readonly sections = signal<DocSection[]>([]);
  public readonly loading = signal(true);

  public ngOnInit(): void {
    this.titleService.setTitle('Help Documentation — LFX Self Serve');
    this.metaService.updateTag({ name: 'description', content: 'Guides for app.lfx.dev — manage your membership, communities, and contributions.' });

    this.docsService.getSections().subscribe((data) => {
      this.sections.set(data.sections);
      this.loading.set(false);
    });
  }
}
