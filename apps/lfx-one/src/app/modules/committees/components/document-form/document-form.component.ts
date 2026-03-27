// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '@components/button/button.component';
import { InputTextComponent } from '@components/input-text/input-text.component';
import { SelectComponent } from '@components/select/select.component';
import { TextareaComponent } from '@components/textarea/textarea.component';
import { CommitteeDocument, CommitteeDocumentType, CreateCommitteeDocumentRequest, UpdateCommitteeDocumentRequest } from '@lfx-one/shared/interfaces';
import { CommitteeService } from '@services/committee.service';
import { MessageService } from 'primeng/api';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'lfx-document-form',
  imports: [ReactiveFormsModule, ButtonComponent, InputTextComponent, SelectComponent, TextareaComponent],
  templateUrl: './document-form.component.html',
  styleUrl: './document-form.component.scss',
})
export class DocumentFormComponent {
  private readonly config = inject(DynamicDialogConfig);
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly committeeService = inject(CommitteeService);
  private readonly messageService = inject(MessageService);

  public submitting = signal<boolean>(false);

  // Config-based properties
  public readonly isEditing: boolean;
  public readonly committeeId: string;
  public readonly document: CommitteeDocument | undefined;

  public typeOptions = [
    { label: 'Link', value: 'link' },
    { label: 'Folder', value: 'folder' },
  ];

  public form: FormGroup;

  public constructor() {
    this.isEditing = this.config.data?.isEditing || false;
    this.committeeId = this.config.data?.committeeId;
    this.document = this.config.data?.document;

    this.form = this.createForm();
    this.initializeForm();
  }

  public get isLink(): boolean {
    return this.form.get('type')?.value === 'link';
  }

  public onCancel(): void {
    this.dialogRef.close();
  }

  public onSubmit(): void {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const formValue = this.form.getRawValue();

    if (this.isEditing && this.document) {
      const updateData: UpdateCommitteeDocumentRequest = {
        name: formValue.name,
        ...(formValue.type === 'link' && { url: formValue.url }),
        description: formValue.description || undefined,
      };

      this.committeeService.updateCommitteeDocument(this.committeeId, this.document.uid, updateData).subscribe({
        next: () => {
          this.submitting.set(false);
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Document updated successfully' });
          this.dialogRef.close(true);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err.error?.message || 'Failed to update document',
          });
        },
      });
    } else {
      const createData: CreateCommitteeDocumentRequest = {
        type: formValue.type as CommitteeDocumentType,
        name: formValue.name,
        ...(formValue.type === 'link' && { url: formValue.url }),
        description: formValue.description || undefined,
      };

      this.committeeService.createCommitteeDocument(this.committeeId, createData).subscribe({
        next: () => {
          this.submitting.set(false);
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Document created successfully' });
          this.dialogRef.close(true);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err.error?.message || 'Failed to create document',
          });
        },
      });
    }
  }

  private createForm(): FormGroup {
    const typeControl = new FormControl<string>('link', [Validators.required]);

    const form = new FormGroup({
      type: typeControl,
      name: new FormControl('', [Validators.required]),
      url: new FormControl('', [Validators.required]),
      description: new FormControl(''),
    });

    // Dynamically toggle url validation based on type
    typeControl.valueChanges.subscribe((type) => {
      const urlControl = form.get('url');
      if (type === 'link') {
        urlControl?.setValidators([Validators.required]);
      } else {
        urlControl?.clearValidators();
        urlControl?.setValue('');
      }
      urlControl?.updateValueAndValidity();
    });

    return form;
  }

  private initializeForm(): void {
    if (this.isEditing && this.document) {
      this.form.patchValue({
        type: this.document.type,
        name: this.document.name,
        url: this.document.url || '',
        description: this.document.description || '',
      });

      // Disable type field when editing
      this.form.get('type')?.disable();
    }
  }
}
