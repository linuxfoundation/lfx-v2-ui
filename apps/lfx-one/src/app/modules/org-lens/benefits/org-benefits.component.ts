// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';

interface OspoCard {
  title: string;
  description: string;
}

interface KeyDoc {
  title: string;
  description: string;
}

@Component({
  selector: 'lfx-org-benefits',
  imports: [ButtonComponent],
  templateUrl: './org-benefits.component.html',
})
export class OrgBenefitsComponent {
  protected readonly cards: OspoCard[] = [
    { title: 'OSPO Basics', description: 'Learn the fundamentals of Open Source Program Offices, including governance, legal, and community management.' },
    { title: 'Contribution Guidelines', description: 'Best practices for contributing to open source projects, licensing, and maintaining community standards.' },
    { title: 'Compliance & Legal', description: 'Understanding open source licenses, compliance requirements, and legal considerations.' },
    { title: 'Community Engagement', description: 'Strategies for building and maintaining healthy open source communities.' },
    { title: 'Metrics & Measurement', description: 'Tools and techniques for measuring open source program impact and success.' },
    { title: 'Resource Library', description: 'Curated collection of templates, guides, and tools for managing open source initiatives.' },
  ];

  protected readonly keyDocs: KeyDoc[] = [
    { title: 'Open Source Program Office Handbook', description: 'Comprehensive guide to establishing and running an OSPO' },
    { title: 'Open Source Compliance Guide', description: 'Best practices for license compliance and risk management' },
    { title: 'Community Health Assessment', description: 'Tools to evaluate and improve project community health' },
    { title: 'Funding & Sponsorship Models', description: 'Different approaches to funding open source projects' },
  ];
}
