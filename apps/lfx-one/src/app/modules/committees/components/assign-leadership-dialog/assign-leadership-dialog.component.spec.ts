// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { AssignLeadershipDialogComponent } from './assign-leadership-dialog.component';
import { CommitteeService } from '@services/committee.service';
import { MessageService } from 'primeng/api';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Committee, CommitteeMember } from '@lfx-one/shared/interfaces';
import { of, throwError } from 'rxjs';

function makeCommittee(): Committee {
  return {
    uid: 'committee-1',
    name: 'Test Committee',
    project_uid: 'proj-1',
    category: 'Working Group',
    description: '',
    public: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  } as Committee;
}

function makeMember(uid: string, firstName: string): CommitteeMember {
  return {
    uid,
    committee_uid: 'committee-1',
    committee_name: 'Test Committee',
    email: `${firstName.toLowerCase()}@example.com`,
    first_name: firstName,
    last_name: 'Test',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  } as CommitteeMember;
}

describe('AssignLeadershipDialogComponent — demotion failure surfaces', () => {
  let fixture: ComponentFixture<AssignLeadershipDialogComponent>;
  let component: AssignLeadershipDialogComponent;
  let updateCommitteeMemberSpy: jest.Mock;
  let messageAddSpy: jest.Mock;
  let dialogCloseSpy: jest.Mock;

  const currentLeader = { uid: 'member-old', first_name: 'Old', last_name: 'Leader', email: 'old@example.com' };
  const newMember = makeMember('member-new', 'New');

  beforeEach(async () => {
    updateCommitteeMemberSpy = jest.fn();
    messageAddSpy = jest.fn();
    dialogCloseSpy = jest.fn();

    await TestBed.configureTestingModule({
      imports: [AssignLeadershipDialogComponent],
      providers: [
        {
          provide: CommitteeService,
          useValue: { updateCommitteeMember: updateCommitteeMemberSpy },
        },
        { provide: MessageService, useValue: { add: messageAddSpy } },
        { provide: DynamicDialogRef, useValue: { close: dialogCloseSpy } },
        {
          provide: DynamicDialogConfig,
          useValue: {
            data: {
              role: 'chair',
              committee: makeCommittee(),
              members: [makeMember('member-old', 'Old'), newMember],
              currentLeader,
            },
          },
        },
        { provide: ActivatedRoute, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignLeadershipDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should show an error toast and NOT close with success when demoting the previous leader fails', () => {
    // Step 1 (assign new leader) succeeds
    updateCommitteeMemberSpy.mockReturnValueOnce(of({}));
    // Step 2 (demote old leader) fails
    updateCommitteeMemberSpy.mockReturnValueOnce(throwError(() => new Error('Demotion failed')));

    // Select the new member in the form
    component.form.patchValue({ member_uid: 'member-new' });

    // Submit — of() and throwError() emit synchronously
    component.onSubmit();

    // The error handler should have been called — error toast shown
    expect(messageAddSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
      })
    );

    // The dialog should NOT have closed with a success result
    expect(dialogCloseSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'chair',
        leadership: expect.anything(),
      })
    );

    // submitting flag should be reset
    expect(component.submitting()).toBe(false);
  });
});
