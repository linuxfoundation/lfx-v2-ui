// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { AppService } from '@services/app.service';

type ActivityTab = 'code' | 'training' | 'events';
type ParticipantType = 'all' | 'maintainers' | 'contributors' | 'participants';
type EventsSubTab = 'overview' | 'sponsorships' | 'travel';

interface ContributorRecord {
  name: string;
  initials: string;
  bgColor: string;
  textColor: string;
  highestType: string;
  activities: number;
  lastActive: string;
  mostActiveProject: string;
  mostActiveFoundation: string;
}

interface TrainingCourse {
  name: string;
  enrollees: number;
  type: 'Training' | 'Certification';
}

interface EventRecord {
  name: string;
  location: string;
  dates: string;
  myRegistrants: number;
  totalRegistrants: number;
  speakingProposals: number | null;
  speakingTotal: number | null;
}

@Component({
  selector: 'lfx-org-code',
  imports: [DecimalPipe, ButtonComponent],
  templateUrl: './org-code.component.html',
})
export class OrgCodeComponent {
  private readonly appService = inject(AppService);

  protected readonly orgUserType = this.appService.orgUserType;
  protected readonly isAdmin = computed(() => this.orgUserType() !== 'employee');
  protected readonly canEdit = computed(() => this.orgUserType() === 'admin-edit' || this.orgUserType() === 'conglomerate-admin');

  protected readonly activeTab = signal<ActivityTab>('code');
  protected readonly activeParticipantType = signal<ParticipantType>('all');
  protected readonly hideFormerEmployees = signal(false);
  protected readonly activeEventsSubTab = signal<EventsSubTab>('overview');

  protected readonly participantTypes = [
    { id: 'all', label: 'All Employees', count: 291 },
    { id: 'maintainers', label: 'Maintainers', count: 12 },
    { id: 'contributors', label: 'Contributors', count: 240 },
    { id: 'participants', label: 'Participants', count: 39 },
  ];

  protected readonly trainingStats = {
    trainingCourses: 59,
    individualsEnrolled: 20,
    certificationCourses: 23,
    individualsIssued: 10,
  };

  protected readonly contributors: ContributorRecord[] = [
    { name: 'Simon Deziel', initials: 'SD', bgColor: '#E0F2FE', textColor: '#0284C7', highestType: 'Contributor', activities: 15882, lastActive: 'Mar 26, 2026', mostActiveProject: 'Node.js', mostActiveFoundation: 'OpenJS Foundation' },
    { name: 'Thomas Parrott', initials: 'T', bgColor: '#7C3AED', textColor: '#FFFFFF', highestType: 'Contributor', activities: 9422, lastActive: 'Feb 3, 2026', mostActiveProject: 'Kubernetes', mostActiveFoundation: 'CNCF' },
    { name: 'dann frazier', initials: 'DF', bgColor: '#FED7AA', textColor: '#9A3412', highestType: 'Contributor', activities: 4308, lastActive: 'Mar 8, 2026', mostActiveProject: 'PyTorch Project', mostActiveFoundation: 'PyTorch Foundation' },
    { name: 'Simon Richardson', initials: 'SR', bgColor: '#DBEAFE', textColor: '#1D4ED8', highestType: 'Contributor', activities: 4635, lastActive: 'Feb 3, 2026', mostActiveProject: 'Linux Kernel', mostActiveFoundation: 'Linux Foundation' },
    { name: 'kadinsayani', initials: 'K', bgColor: '#E0E7FF', textColor: '#4338CA', highestType: 'Contributor', activities: 2228, lastActive: 'Mar 27, 2026', mostActiveProject: 'Aether Project', mostActiveFoundation: 'Linux Foundation' },
  ];

  protected readonly trainingCourses: TrainingCourse[] = [
    { name: 'Certified Kubernetes Security Specialist (CKS)', enrollees: 9, type: 'Certification' },
    { name: 'Certified Kubernetes Administrator (CKA)', enrollees: 8, type: 'Certification' },
    { name: 'Certified Kubernetes Application Developer (CKAD)', enrollees: 8, type: 'Certification' },
    { name: 'Kubernetes and Cloud Native Security Associate (KCSA)', enrollees: 7, type: 'Certification' },
    { name: 'Getting Started with OpenTofu (LFEL1009)', enrollees: 7, type: 'Training' },
    { name: 'Kubernetes and Cloud Native Associate Exam (KCNA)', enrollees: 7, type: 'Certification' },
  ];

  protected readonly events: EventRecord[] = [
    { name: 'Open Source in Finance Forum Toronto 2026', location: 'Toronto Canada', dates: 'Apr 14, 2026', myRegistrants: 2, totalRegistrants: 325, speakingProposals: 0, speakingTotal: 1 },
    { name: 'OpenSearchCon Europe 2026', location: 'Nové Město Czechia', dates: 'Apr 16 - Apr 17, 2026', myRegistrants: 1, totalRegistrants: 250, speakingProposals: null, speakingTotal: null },
    { name: 'Open Source Summit + ELC North America 2026', location: 'Minneapolis United States', dates: 'May 18 - May 20, 2026', myRegistrants: 1, totalRegistrants: 2000, speakingProposals: 0, speakingTotal: 1 },
  ];

  protected setTab(tab: ActivityTab): void {
    this.activeTab.set(tab);
  }

  protected setParticipantType(type: string): void {
    this.activeParticipantType.set(type as ParticipantType);
  }

  protected setEventsSubTab(tab: string): void {
    this.activeEventsSubTab.set(tab as EventsSubTab);
  }
}
