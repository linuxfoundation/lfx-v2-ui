// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApplicationReviewComponent } from './application-review.component';
import { CommitteeService } from '@services/committee.service';
import { MessageService } from 'primeng/api';
import { Committee, GroupJoinApplication } from '@lfx-one/shared/interfaces';
import { Observable, Subject } from 'rxjs';
import { ComponentRef } from '@angular/core';

function makeCommittee(uid: string): Committee {
  return {
    uid,
    name: `Committee ${uid}`,
    project_uid: 'proj-1',
    category: 'Working Group',
    description: '',
    public: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  } as Committee;
}

function makeApplication(uid: string, committeeUid: string): GroupJoinApplication {
  return {
    uid,
    committee_uid: committeeUid,
    applicant_email: `${uid}@example.com`,
    applicant_uid: `user-${uid}`,
    status: 'pending',
    created_at: '2025-01-01T00:00:00Z',
  };
}

describe('ApplicationReviewComponent — stale load guard', () => {
  let fixture: ComponentFixture<ApplicationReviewComponent>;
  let component: ApplicationReviewComponent;
  let componentRef: ComponentRef<ApplicationReviewComponent>;
  let getApplicationsSpy: jest.Mock;

  let committee1Response$: Subject<GroupJoinApplication[]>;
  let committee2Response$: Subject<GroupJoinApplication[]>;

  beforeEach(async () => {
    committee1Response$ = new Subject();
    committee2Response$ = new Subject();

    let callCount = 0;
    getApplicationsSpy = jest.fn().mockImplementation((): Observable<GroupJoinApplication[]> => {
      callCount++;
      if (callCount === 1) return committee1Response$.asObservable();
      return committee2Response$.asObservable();
    });

    await TestBed.configureTestingModule({
      imports: [ApplicationReviewComponent],
      providers: [
        {
          provide: CommitteeService,
          useValue: {
            getApplications: getApplicationsSpy,
            approveApplication: jest.fn(),
            rejectApplication: jest.fn(),
          },
        },
        { provide: MessageService, useValue: { add: jest.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ApplicationReviewComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should ignore a stale response when the committee input changes before it resolves', async () => {
    const appsForCommittee1 = [makeApplication('app-1', 'committee-1')];
    const appsForCommittee2 = [makeApplication('app-2', 'committee-2')];

    // 1. Set first committee input — triggers effect → loadApplications('committee-1')
    componentRef.setInput('committee', makeCommittee('committee-1'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(getApplicationsSpy).toHaveBeenCalledTimes(1);
    expect(component.loading()).toBe(true);

    // 2. Before the first response arrives, switch to committee-2
    componentRef.setInput('committee', makeCommittee('committee-2'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(getApplicationsSpy).toHaveBeenCalledTimes(2);

    // 3. Now the STALE response for committee-1 arrives
    committee1Response$.next(appsForCommittee1);
    committee1Response$.complete();

    // The stale response must NOT have been applied — applications should still be empty
    expect(component.applications()).toEqual([]);

    // 4. The fresh response for committee-2 arrives
    committee2Response$.next(appsForCommittee2);
    committee2Response$.complete();

    // This one should be applied
    expect(component.applications()).toEqual(appsForCommittee2);
    expect(component.loading()).toBe(false);
  });
});
