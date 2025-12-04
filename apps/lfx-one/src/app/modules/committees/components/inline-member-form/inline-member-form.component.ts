// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, input, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputTextComponent } from '@components/input-text/input-text.component';
import { OrganizationSearchComponent } from '@components/organization-search/organization-search.component';
import { UserSearchComponent } from '@components/user-search/user-search.component';
import { CommitteeMember } from '@lfx-one/shared/interfaces';
import { filter, take } from 'rxjs';

@Component({
  selector: 'lfx-inline-member-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextComponent, OrganizationSearchComponent, UserSearchComponent],
  templateUrl: './inline-member-form.component.html',
})
export class InlineMemberFormComponent {
  // Inputs
  public form = input.required<FormGroup>();
  public member = input<CommitteeMember | null>(null);

  // State to track whether we're showing search or individual fields
  public showIndividualFields = signal(false);

  public constructor() {
    // If we have an existing member, show individual fields immediately
    toObservable(this.member)
      .pipe(
        filter((member) => member !== null),
        take(1)
      )
      .subscribe(() => {
        this.showIndividualFields.set(true);
      });
  }

  /**
   * Handle user selection from search component
   * The form controls are already populated by the search component
   */
  public handleUserSelection(): void {
    // The search component has already populated the form controls
    // Now show the individual input fields
    this.showIndividualFields.set(true);
    this.form().markAsDirty();
  }

  /**
   * Switch to manual entry mode when user clicks "Enter details manually"
   */
  public switchToManualEntry(): void {
    // Clear the form for manual entry
    this.form().reset();

    // Show individual fields for manual entry
    this.showIndividualFields.set(true);
  }

  /**
   * Go back to search mode
   */
  public backToSearch(): void {
    // Reset form
    this.form().reset();

    // Switch back to search mode
    this.showIndividualFields.set(false);
  }
}
