// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Injectable } from '@angular/core';
import { Badge } from '@lfx-one/shared/interfaces';

/**
 * Service for retrieving badge/credential data.
 * Currently returns mock data; replace getBadges() with an HTTP call
 * when the Badges API endpoint is available.
 */
@Injectable({ providedIn: 'root' })
export class BadgeService {
  /** Returns the authenticated user's earned badges. */
  public getBadges(): Badge[] {
    return MOCK_BADGES;
  }
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_BADGES: Badge[] = [
  // ── Certifications ──────────────────────────────────────────────────────────
  {
    id: 'badge-cka-001',
    name: 'Certified Kubernetes Administrator (CKA)',
    description:
      'The Certified Kubernetes Administrator (CKA) program was created by the Cloud Native Computing Foundation (CNCF), in collaboration with The Linux Foundation, to allow Kubernetes users to demonstrate competence in a hands-on, practical manner. A certified Kubernetes administrator has demonstrated the ability to do basic installation as well as configuring and managing production-grade Kubernetes clusters.',
    imageUrl: 'https://images.credly.com/size/340x340/images/8b8ed108-e77d-4396-ac59-2504583b9d54/cka_from_cncfsite__281_29.png',
    issuedBy: 'The Linux Foundation',
    issuedDate: '2024-03-15',
    credentialId: 'a3f8b2c1-4d92-4e7b-8c3a-1f5e9d0b2a47',
    topics: ['Kubernetes', 'Cloud Native', 'DevOps', 'Container Orchestration'],
    earningCriteria:
      'Pass a 2-hour performance-based online exam that tests skills and knowledge of Kubernetes cluster administration, including installation, configuration, networking, storage, troubleshooting, and security.',
    category: 'certification',
    verifyUrl: 'https://www.credly.com/badges/a3f8b2c1-4d92-4e7b-8c3a-1f5e9d0b2a47/public_url',
  },
  {
    id: 'badge-lfcs-001',
    name: 'Linux Foundation Certified SysAdmin (LFCS)',
    description:
      'The Linux Foundation Certified SysAdmin (LFCS) exam certifies that users can perform essential maintenance tasks on Linux, including first and junior-level Linux system administration. Holders of this certification have demonstrated the ability to support running systems and services, first-level troubleshooting, and analysis, as well as the ability to decide when to escalate issues to higher-level teams.',
    imageUrl: 'https://images.credly.com/size/340x340/images/1e6611ca-8afe-4ecc-ad4d-305fba52ee7e/1_LFCS-600x600.png',
    issuedBy: 'The Linux Foundation',
    issuedDate: '2023-07-22',
    credentialId: 'b7e1d4a9-2f83-4c5b-9d1e-3a8f0c7b4e62',
    topics: ['Linux', 'SysAdmin', 'CLI', 'Bash', 'System Administration'],
    earningCriteria:
      'Pass a 2-hour performance-based exam demonstrating ability to perform common Linux system administration tasks including user management, file permissions, networking, storage, and service configuration.',
    category: 'certification',
    verifyUrl: 'https://www.credly.com/badges/b7e1d4a9-2f83-4c5b-9d1e-3a8f0c7b4e62/public_url',
  },
  {
    id: 'badge-cks-001',
    name: 'Certified Kubernetes Security Specialist (CKS)',
    description:
      'The Certified Kubernetes Security Specialist (CKS) program provides assurance that a CKS has the skills, knowledge, and competence on a broad range of best practices for securing container-based applications and Kubernetes platforms during build, deployment and runtime. Earners of this designation demonstrated proficiency in Cluster Setup, Cluster Hardening, System Hardening, Minimize Microservice Vulnerabilities, Supply Chain Security, and Monitoring, Logging, and Runtime Security.',
    imageUrl: 'https://images.credly.com/size/340x340/images/9945dfcb-1cca-4529-85e6-db1be3782210/kubernetes-security-specialist-logo2.png',
    issuedBy: 'The Linux Foundation',
    issuedDate: '2024-09-10',
    credentialId: 'c2a5e8f3-6b74-4d1a-8e2c-5f9b0d3a7c85',
    topics: ['Kubernetes', 'Security', 'Cloud Native', 'DevSecOps', 'Container Security'],
    earningCriteria:
      'Pass a 2-hour online exam covering cluster setup and hardening, system hardening, microservice vulnerabilities, supply chain security, and runtime monitoring. Prerequisite: active CKA certification.',
    category: 'certification',
    verifyUrl: 'https://www.credly.com/badges/c2a5e8f3-6b74-4d1a-8e2c-5f9b0d3a7c85/public_url',
  },
  // ── Maintainer ──────────────────────────────────────────────────────────────
  {
    id: 'badge-maintainer-001',
    name: 'Open Source Project Maintainer',
    description:
      'Awarded to contributors who have demonstrated sustained leadership in an open source project hosted or supported through LFX. Maintainers are responsible for reviewing and merging contributions, managing releases, and ensuring the long-term health and direction of the project.',
    imageUrl: 'https://placehold.co/100x100?text=Maintainer',
    issuedBy: 'The Linux Foundation via LFX',
    issuedDate: '2023-11-05',
    credentialId: 'd9c3f7a1-5e28-4b6d-a3c9-7f2e0b8d1e43',
    topics: ['Open Source', 'Maintainer', 'GitHub', 'Leadership', 'Code Review'],
    earningCriteria:
      'Nominated and approved by existing project maintainers after demonstrating consistent, high-quality code contributions, active participation in code reviews, and leadership in project discussions over a sustained period.',
    category: 'maintainer',
    verifyUrl: 'https://www.credly.com/badges/d9c3f7a1-5e28-4b6d-a3c9-7f2e0b8d1e43/public_url',
  },
  // ── Speaking ────────────────────────────────────────────────────────────────
  {
    id: 'badge-speaking-kubecon-001',
    name: 'KubeCon + CloudNativeCon Speaker',
    description:
      "Awarded to individuals who delivered an accepted talk, workshop, or keynote at KubeCon + CloudNativeCon, the Cloud Native Computing Foundation's flagship event. Speakers contribute to the global cloud-native community by sharing expertise, research, and real-world experiences with thousands of practitioners worldwide.",
    imageUrl: 'https://placehold.co/100x100?text=Speaker',
    issuedBy: 'Cloud Native Computing Foundation (CNCF)',
    issuedDate: '2024-11-14',
    credentialId: 'e4b8d2f6-3a71-4c9e-b5d4-8a1c0f7e3b29',
    topics: ['Kubernetes', 'Cloud Native', 'Public Speaking', 'CNCF', 'Community'],
    earningCriteria:
      'Submit a talk or workshop proposal through the official CFP (Call for Proposals) process, receive acceptance by the KubeCon program committee, and successfully deliver the session at the event.',
    category: 'speaking',
    verifyUrl: 'https://www.credly.com/badges/e4b8d2f6-3a71-4c9e-b5d4-8a1c0f7e3b29/public_url',
  },
  {
    id: 'badge-speaking-oss-001',
    name: 'Open Source Summit Speaker',
    description:
      "Recognizes individuals who presented at the Linux Foundation's Open Source Summit, the premier event for open source developers, technologists, and community leaders. Speakers share insights across tracks including Linux kernel, open source leadership, community health, diversity, and emerging technologies.",
    imageUrl: 'https://placehold.co/100x100?text=Speaker',
    issuedBy: 'The Linux Foundation',
    issuedDate: '2023-05-18',
    credentialId: 'f1d7c3e9-4b82-4a5f-c8e1-6d3b9a0f2c74',
    topics: ['Open Source', 'Linux', 'Public Speaking', 'Community', 'Technology'],
    earningCriteria: 'Submit a session proposal through the CFP process and be selected by the Open Source Summit program committee to present at the event.',
    category: 'speaking',
    verifyUrl: 'https://www.credly.com/badges/f1d7c3e9-4b82-4a5f-c8e1-6d3b9a0f2c74/public_url',
  },
  // ── Event Participation ─────────────────────────────────────────────────────
  {
    id: 'badge-event-kubecon-001',
    name: 'KubeCon + CloudNativeCon Attendee',
    description:
      "Awarded to registered attendees of KubeCon + CloudNativeCon, the Cloud Native Computing Foundation's largest annual conference. Attendees gain access to hundreds of sessions, keynotes, and co-located events covering the entire cloud-native ecosystem, including Kubernetes, Prometheus, Envoy, and more.",
    imageUrl: 'https://placehold.co/100x100?text=Attendee',
    issuedBy: 'Cloud Native Computing Foundation (CNCF)',
    issuedDate: '2024-03-22',
    credentialId: '07e5f9a4-8c63-4b2d-d6f0-1e9a3c8b5d71',
    topics: ['Cloud Native', 'Community', 'Networking', 'Kubernetes', 'CNCF'],
    earningCriteria:
      'Register and attend KubeCon + CloudNativeCon as an in-person or virtual participant. The badge is automatically issued upon verified event registration and check-in.',
    category: 'event-participation',
    verifyUrl: 'https://www.credly.com/badges/07e5f9a4-8c63-4b2d-d6f0-1e9a3c8b5d71/public_url',
  },
  // ── Project Contribution ────────────────────────────────────────────────────
  {
    id: 'badge-contrib-cncf-001',
    name: 'CNCF Individual Contributor',
    description:
      'Recognizes individual contributors who have made meaningful code, documentation, or community contributions to one or more CNCF-hosted projects. This badge celebrates the people who power the cloud-native ecosystem through their open source work, helping projects grow, improve, and remain healthy.',
    imageUrl: 'https://placehold.co/100x100?text=Contributor',
    issuedBy: 'Cloud Native Computing Foundation (CNCF)',
    issuedDate: '2022-08-30',
    credentialId: '18f6a0b7-9d54-4e3c-e7b2-2f0c4d9a8e36',
    topics: ['Open Source', 'Cloud Native', 'Contributions', 'GitHub', 'CNCF'],
    earningCriteria:
      'Make verified contributions (code commits, documentation PRs, or significant issue triage) to one or more CNCF-graduated or incubating projects, verified through GitHub contribution history.',
    category: 'project-contribution',
    verifyUrl: 'https://www.credly.com/badges/18f6a0b7-9d54-4e3c-e7b2-2f0c4d9a8e36/public_url',
  },
  // ── Program Committee ───────────────────────────────────────────────────────
  {
    id: 'badge-pc-oss-001',
    name: 'Program Committee Member – Open Source Summit',
    description:
      "Awarded to individuals who served on the program committee for the Linux Foundation's Open Source Summit. Program committee members play a critical role in shaping the event by reviewing and selecting talk submissions, ensuring the quality and diversity of the conference program across all technical and community tracks.",
    imageUrl: 'https://placehold.co/100x100?text=PC+Member',
    issuedBy: 'The Linux Foundation',
    issuedDate: '2022-05-01',
    credentialId: '29a7b1c8-0e65-4f4d-f8c3-3a1d5e0b9f47',
    topics: ['Open Source', 'Leadership', 'Community', 'Event Organization', 'Program Committee'],
    earningCriteria:
      'Be nominated and selected to serve as a program committee member for the Open Source Summit. Responsibilities include reviewing CFP submissions, scoring proposals, and participating in selection discussions.',
    category: 'program-committee',
    verifyUrl: 'https://www.credly.com/badges/29a7b1c8-0e65-4f4d-f8c3-3a1d5e0b9f47/public_url',
  },
];
