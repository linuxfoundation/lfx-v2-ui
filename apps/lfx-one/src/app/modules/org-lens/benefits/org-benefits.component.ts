// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component } from '@angular/core';

interface OspoResource {
  icon: string;
  iconBg: string;
  title: string;
  description: string;
  linkLabel: string;
}

interface OspoTopic {
  icon: string;
  title: string;
  description: string;
  resources: OspoResource[];
}

@Component({
  selector: 'lfx-org-benefits',
  templateUrl: './org-benefits.component.html',
})
export class OrgBenefitsComponent {
  protected readonly topics: OspoTopic[] = [
    {
      icon: 'fa-light fa-building',
      title: 'What is an OSPO?',
      description: 'An Open Source Program Office (OSPO) is a center of competency for managing a company\'s open source activities — from strategy and policy to compliance, contribution, and community engagement.',
      resources: [
        { icon: 'fa-light fa-book-open', iconBg: 'bg-blue-50 text-blue-600', title: 'TODO Group OSPO Definition', description: 'The industry standard definition and scope of an OSPO from the TODO Group.', linkLabel: 'Read Guide' },
        { icon: 'fa-light fa-graduation-cap', iconBg: 'bg-purple-50 text-purple-600', title: 'Setting Up an OSPO', description: 'Step-by-step guide to establishing an open source program office in your organization.', linkLabel: 'View Course' },
        { icon: 'fa-light fa-chart-line', iconBg: 'bg-emerald-50 text-emerald-600', title: 'OSPO Maturity Model', description: 'TODO Group\'s 5-stage maturity model for measuring OSPO effectiveness.', linkLabel: 'Explore Model' },
      ],
    },
    {
      icon: 'fa-light fa-shield-halved',
      title: 'Open Source Policy & Compliance',
      description: 'Establish policies for how your employees contribute to and consume open source software. Manage license compliance, CLA signing, and security obligations.',
      resources: [
        { icon: 'fa-light fa-file-contract', iconBg: 'bg-amber-50 text-amber-600', title: 'Open Source Policy Templates', description: 'Ready-to-use policy templates for contribution, consumption, and release.', linkLabel: 'Download Templates' },
        { icon: 'fa-light fa-file-signature', iconBg: 'bg-rose-50 text-rose-600', title: 'EasyCLA Documentation', description: 'Linux Foundation\'s Contributor License Agreement automation tool.', linkLabel: 'View Docs' },
        { icon: 'fa-light fa-magnifying-glass', iconBg: 'bg-indigo-50 text-indigo-600', title: 'License Scanning Best Practices', description: 'Guide to scanning your codebase for license obligations and third-party dependencies.', linkLabel: 'Read Guide' },
      ],
    },
    {
      icon: 'fa-light fa-code-branch',
      title: 'Contributing to Open Source',
      description: 'Enable and encourage your employees to contribute to open source projects aligned with your company\'s strategy. Learn how to measure impact and recognize contributors.',
      resources: [
        { icon: 'fa-light fa-people-group', iconBg: 'bg-teal-50 text-teal-600', title: 'Contribution Strategy Guide', description: 'How to align open source contributions with business goals and technical strategy.', linkLabel: 'Read Guide' },
        { icon: 'fa-light fa-star', iconBg: 'bg-yellow-50 text-yellow-600', title: 'Recognizing Contributors', description: 'Best practices for internal recognition programs that motivate open source participation.', linkLabel: 'Read Guide' },
        { icon: 'fa-light fa-arrows-to-circle', iconBg: 'bg-cyan-50 text-cyan-600', title: 'Inner Source Practices', description: 'Apply open source principles internally to improve collaboration across your organization.', linkLabel: 'Explore' },
      ],
    },
    {
      icon: 'fa-light fa-scale-balanced',
      title: 'Governance & Foundations',
      description: 'Understand how to participate effectively in open source foundations, governance bodies, and technical committees to maximize your organization\'s influence.',
      resources: [
        { icon: 'fa-light fa-sitemap', iconBg: 'bg-violet-50 text-violet-600', title: 'Foundation Governance Guide', description: 'How foundation governance works — boards, TOCs, TAGs, and member roles.', linkLabel: 'Read Guide' },
        { icon: 'fa-light fa-handshake', iconBg: 'bg-pink-50 text-pink-600', title: 'Membership Value Playbook', description: 'How to extract maximum value from your Linux Foundation memberships.', linkLabel: 'Download Playbook' },
        { icon: 'fa-light fa-award', iconBg: 'bg-orange-50 text-orange-600', title: 'Open Source Leadership Program', description: 'LF training program for developing open source leaders within your organization.', linkLabel: 'Learn More' },
      ],
    },
  ];

  protected readonly externalLinks = [
    { label: 'TODO Group', description: 'Industry community for OSPOs', url: '#' },
    { label: 'LF Research', description: 'Open source industry reports', url: '#' },
    { label: 'OpenSSF Best Practices', description: 'Security best practices for OSS', url: '#' },
    { label: 'SPDX License List', description: 'Standard OSS license identifiers', url: '#' },
    { label: 'LF Training Catalog', description: 'Open source courses & certifications', url: '#' },
    { label: 'LF Events Calendar', description: 'Upcoming open source events', url: '#' },
  ];
}
