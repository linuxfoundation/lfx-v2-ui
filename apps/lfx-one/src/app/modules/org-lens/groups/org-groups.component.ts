// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, signal } from '@angular/core';
import { AppService } from '@services/app.service';

type PeopleTab = 'access' | 'board' | 'correct';
type BoardView = 'by-foundation' | 'by-employee';

interface LfxUser {
  name: string;
  initials: string;
  email: string;
  jobTitle: string;
  roleType: 'Employee' | 'Admin – View Only' | 'Admin – Edit' | 'Conglomerate Admin';
  roleClass: string;
  lastLogin: string;
  status: 'Active' | 'Pending';
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
  templateUrl: './org-groups.component.html',
})
export class OrgGroupsComponent {
  private readonly appService = inject(AppService);

  protected readonly orgUserType = this.appService.orgUserType;
  protected readonly isAdmin = computed(() => this.orgUserType() !== 'employee');
  protected readonly canEdit = computed(() => this.orgUserType() === 'admin-edit' || this.orgUserType() === 'conglomerate-admin');

  protected readonly activeTab = signal<PeopleTab>('access');
  protected readonly boardView = signal<BoardView>('by-foundation');
  protected readonly correctionSearch = signal('');
  protected readonly correctionSearched = signal(false);

  protected readonly accessStats = {
    total: 6,
    employees: 3,
    adminView: 1,
    adminEdit: 2,
    conglomerateAdmin: 0,
  };

  protected readonly users: LfxUser[] = [
    { name: 'Jane Smith', initials: 'JS', email: 'jane.smith@company.com', jobTitle: 'VP Engineering', roleType: 'Admin – Edit', roleClass: 'bg-blue-50 text-blue-700 border border-blue-200', lastLogin: 'Today', status: 'Active' },
    { name: 'John Doe', initials: 'JD', email: 'john.doe@company.com', jobTitle: 'CTO', roleType: 'Admin – Edit', roleClass: 'bg-blue-50 text-blue-700 border border-blue-200', lastLogin: 'Yesterday', status: 'Active' },
    { name: 'Alice Chen', initials: 'AC', email: 'alice.chen@company.com', jobTitle: 'Principal Engineer', roleType: 'Admin – View Only', roleClass: 'bg-slate-50 text-slate-600 border border-slate-200', lastLogin: '3 days ago', status: 'Active' },
    { name: 'Bob Wilson', initials: 'BW', email: 'bob.wilson@company.com', jobTitle: 'Staff Engineer', roleType: 'Employee', roleClass: 'bg-gray-50 text-gray-500 border border-gray-200', lastLogin: '1 week ago', status: 'Active' },
    { name: 'Carol Martinez', initials: 'CM', email: 'carol.martinez@company.com', jobTitle: 'Software Engineer', roleType: 'Employee', roleClass: 'bg-gray-50 text-gray-500 border border-gray-200', lastLogin: '2 weeks ago', status: 'Active' },
    { name: 'David Park', initials: 'DP', email: 'david.park@company.com', jobTitle: 'Engineering Manager', roleType: 'Employee', roleClass: 'bg-gray-50 text-gray-500 border border-gray-200', lastLogin: 'Never', status: 'Pending' },
  ];

  protected readonly boardSeats: BoardSeat[] = [
    { foundation: 'CNCF', committee: 'Governing Board', type: 'Board', representative: 'Jane Smith', representativeInitials: 'JS', vacant: false, nextMeeting: 'Apr 15, 2025' },
    { foundation: 'CNCF', committee: 'Technical Oversight Committee', type: 'Committee', representative: 'Alice Chen', representativeInitials: 'AC', vacant: false, nextMeeting: 'Apr 8, 2025' },
    { foundation: 'CNCF', committee: 'Security TAG', type: 'Committee', representative: 'Bob Wilson', representativeInitials: 'BW', vacant: false, nextMeeting: 'Apr 10, 2025' },
    { foundation: 'CNCF', committee: 'End User TAG', type: 'Committee', representative: null, representativeInitials: null, vacant: true, nextMeeting: 'Apr 22, 2025' },
    { foundation: 'Linux Foundation', committee: 'Board of Directors', type: 'Board', representative: 'John Doe', representativeInitials: 'JD', vacant: false, nextMeeting: 'May 1, 2025' },
    { foundation: 'ASWF', committee: 'Premier Member Board Seat', type: 'Board', representative: null, representativeInitials: null, vacant: true, nextMeeting: 'May 6, 2025' },
    { foundation: 'OpenSSF', committee: 'Governing Board', type: 'Board', representative: 'Jane Smith', representativeInitials: 'JS', vacant: false, nextMeeting: 'Apr 30, 2025' },
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

  protected setBoardView(view: BoardView): void {
    this.boardView.set(view);
  }

  protected searchCorrection(): void {
    this.correctionSearched.set(true);
  }
}
