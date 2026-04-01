// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, signal } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { MessageComponent } from '@components/message/message.component';
import { AppService } from '@services/app.service';

type PeopleTab = 'access' | 'board' | 'correct';
type BoardView = 'by-foundation' | 'by-employee';
type AccessSubTab = 'employee' | 'admin-view' | 'admin-edit' | 'conglomerate';

interface EmployeeUser {
  name: string;
  email: string;
  lastViewedOrgLens: string;
  activeProjects: number;
  never?: boolean;
}

interface AdminUser {
  name: string;
  email: string;
  lastViewedOrgLens: string;
  permissions: string;
}

interface ConglomerateUser {
  name: string;
  email: string;
  subsidiary: string;
  lastViewedOrgLens: string;
}

interface BoardSeat {
  foundation: string;
  committee: string;
  type: 'Board' | 'Committee';
  representative: string | null;
  representativeInitials: string | null;
  vacant: boolean;
  nextMeeting: string;
}

@Component({
  selector: 'lfx-org-groups',
  imports: [ButtonComponent, MessageComponent],
  templateUrl: './org-groups.component.html',
})
export class OrgGroupsComponent {
  private readonly appService = inject(AppService);

  protected readonly orgUserType = this.appService.orgUserType;
  protected readonly isAdmin = computed(() => this.orgUserType() !== 'employee');
  protected readonly canEdit = computed(() => this.orgUserType() === 'admin-edit' || this.orgUserType() === 'conglomerate-admin');

  protected readonly activeTab = signal<PeopleTab>('access');
  protected readonly accessSubTab = signal<AccessSubTab>('employee');
  protected readonly boardView = signal<BoardView>('by-foundation');
  protected readonly correctionSearch = signal('');
  protected readonly correctionSearched = signal(false);

  protected readonly accessSummary = {
    employees: { total: 234, viewedLens: 198 },
    adminReadOnly: { total: 14, viewedLens: 12 },
    adminWrite: { total: 8, viewedLens: 8 },
    conglomerate: { total: 3, viewedLens: 3 },
  };

  protected readonly boardSummary = {
    boardMembers: { total: 18, foundations: 15, loggedIn: 14, vacancies: 1 },
    committeeMembers: { total: 24, committees: 6, loggedIn: 19, openSeats: 3 },
  };

  protected readonly employeeUsers: EmployeeUser[] = [
    { name: 'Sarah Chen', email: 'sarah.chen@canonical.com', lastViewedOrgLens: 'Today', activeProjects: 4 },
    { name: 'Marcus Rivera', email: 'm.rivera@canonical.com', lastViewedOrgLens: 'Yesterday', activeProjects: 3 },
    { name: 'Priya Sharma', email: 'priya.sharma@canonical.com', lastViewedOrgLens: 'Mar 24, 2026', activeProjects: 5 },
    { name: 'James Wu', email: 'james.wu@canonical.com', lastViewedOrgLens: 'Mar 20, 2026', activeProjects: 2 },
    { name: 'Elena Popov', email: 'elena.popov@canonical.com', lastViewedOrgLens: 'Never', activeProjects: 2, never: true },
  ];

  protected readonly adminViewUsers: AdminUser[] = [
    { name: 'Sarah Wilson', email: 'sarah.wilson@canonical.com', lastViewedOrgLens: 'Today', permissions: 'View Only' },
    { name: 'Mark Davis', email: 'mark.davis@canonical.com', lastViewedOrgLens: '2 days ago', permissions: 'View Only' },
  ];

  protected readonly adminEditUsers: AdminUser[] = [
    { name: 'Jennifer Lee', email: 'jennifer.lee@canonical.com', lastViewedOrgLens: 'Today', permissions: 'Edit' },
    { name: 'Michael Brown', email: 'michael.brown@canonical.com', lastViewedOrgLens: 'Yesterday', permissions: 'Edit' },
  ];

  protected readonly conglomerateUsers: ConglomerateUser[] = [
    { name: 'David Kumar', email: 'd.kumar@corporation.io', subsidiary: 'Red Hat', lastViewedOrgLens: 'Today' },
    { name: 'Emily Zhang', email: 'emily.z@corp.net', subsidiary: 'Google', lastViewedOrgLens: '3 days ago' },
    { name: 'James Miller', email: 'j.miller@intel.com', subsidiary: 'Intel', lastViewedOrgLens: '1 week ago' },
  ];

  protected readonly boardSeats: BoardSeat[] = [
    { foundation: 'Linux Foundation', committee: 'Governing Board', type: 'Board', representative: 'Jennifer Lee', representativeInitials: 'JL', vacant: false, nextMeeting: 'Apr 15, 2026' },
    { foundation: 'Linux Foundation', committee: 'Governing Board', type: 'Board', representative: 'Michael Brown', representativeInitials: 'MB', vacant: false, nextMeeting: 'Apr 15, 2026' },
    { foundation: 'Linux Foundation', committee: 'Governing Board', type: 'Board', representative: 'Sarah Wilson', representativeInitials: 'SW', vacant: false, nextMeeting: 'Apr 15, 2026' },
    { foundation: 'Linux Foundation', committee: 'Governing Board', type: 'Board', representative: 'David Kumar', representativeInitials: 'DK', vacant: false, nextMeeting: 'Apr 15, 2026' },
    { foundation: 'Linux Foundation', committee: 'Governing Board', type: 'Board', representative: null, representativeInitials: null, vacant: true, nextMeeting: 'Apr 15, 2026' },
    { foundation: 'CNCF', committee: 'Technical Steering Committee', type: 'Committee', representative: 'Emily Zhang', representativeInitials: 'EZ', vacant: false, nextMeeting: 'Apr 8, 2026' },
    { foundation: 'CNCF', committee: 'Technical Steering Committee', type: 'Committee', representative: 'James Miller', representativeInitials: 'JM', vacant: false, nextMeeting: 'Apr 8, 2026' },
    { foundation: 'CNCF', committee: 'Governing Board', type: 'Board', representative: 'Lars Andersen', representativeInitials: 'LA', vacant: false, nextMeeting: 'Apr 20, 2026' },
    { foundation: 'CNCF', committee: 'Governing Board', type: 'Board', representative: null, representativeInitials: null, vacant: true, nextMeeting: 'Apr 20, 2026' },
  ];

  protected readonly foundationGroups = computed(() => {
    const map = new Map<string, BoardSeat[]>();
    for (const seat of this.boardSeats) {
      if (!map.has(seat.foundation)) map.set(seat.foundation, []);
      map.get(seat.foundation)!.push(seat);
    }
    return Array.from(map.entries()).map(([foundation, seats]) => ({ foundation, seats }));
  });

  protected readonly employeeGroups = computed(() => {
    const map = new Map<string, BoardSeat[]>();
    for (const seat of this.boardSeats.filter((s) => !s.vacant)) {
      const key = seat.representative!;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(seat);
    }
    return Array.from(map.entries()).map(([name, seats]) => ({
      name,
      initials: name.split(' ').map((n) => n[0]).join(''),
      seats,
    }));
  });

  protected setTab(tab: PeopleTab): void {
    this.activeTab.set(tab);
  }

  protected setAccessSubTab(tab: string): void {
    this.accessSubTab.set(tab as AccessSubTab);
  }

  protected setBoardView(view: BoardView): void {
    this.boardView.set(view);
  }

  protected searchCorrection(): void {
    this.correctionSearched.set(true);
  }
}
