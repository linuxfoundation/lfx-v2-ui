// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, DestroyRef, effect, inject, input, model, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { EditorComponent } from '@components/editor/editor.component';
import { InputTextComponent } from '@components/input-text/input-text.component';
import { GenerateNewsletterResponse, NewsletterContextType } from '@lfx-one/shared/interfaces';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { startWith } from 'rxjs';

import { NewsletterGenerateDrawerComponent } from '../newsletter-generate-drawer/newsletter-generate-drawer.component';

@Component({
  selector: 'lfx-newsletter-content-step',
  imports: [ReactiveFormsModule, EditorComponent, InputTextComponent, NewsletterGenerateDrawerComponent, ConfirmDialogModule],
  templateUrl: './newsletter-content-step.component.html',
})
export class NewsletterContentStepComponent {
  // === Services ===
  private readonly confirmationService = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  // === Inputs ===
  public readonly form = input.required<FormGroup>();
  public readonly contextType = input.required<NewsletterContextType>();
  public readonly contextName = input.required<string>();
  public readonly hasContext = input<boolean>(false);
  public readonly savedLabel = input<string | null>(null);

  // === Outputs ===
  public readonly generated = output<GenerateNewsletterResponse>();

  // === Model signals ===
  public readonly generateDrawerVisible = model<boolean>(false);

  // === Internal signals mirroring form values ===
  protected readonly subjectValue = signal<string>('');
  protected readonly bodyValue = signal<string>('');
  protected readonly bodyFilled = computed(() => stripHtml(this.bodyValue()).trim().length > 0);

  public constructor() {
    effect((onCleanup) => {
      const formGroup = this.form();
      const subjectCtrl = formGroup.get('subject');
      const bodyCtrl = formGroup.get('bodyHtml');
      if (!subjectCtrl || !bodyCtrl) return;

      this.subjectValue.set(subjectCtrl.value ?? '');
      this.bodyValue.set(bodyCtrl.value ?? '');

      const subSubject = subjectCtrl.valueChanges
        .pipe(startWith(subjectCtrl.value), takeUntilDestroyed(this.destroyRef))
        .subscribe((v) => this.subjectValue.set(v ?? ''));
      const subBody = bodyCtrl.valueChanges.pipe(startWith(bodyCtrl.value), takeUntilDestroyed(this.destroyRef)).subscribe((v) => this.bodyValue.set(v ?? ''));

      onCleanup(() => {
        subSubject.unsubscribe();
        subBody.unsubscribe();
      });
    });
  }

  protected openGenerateDrawer(): void {
    if (!this.hasContext()) return;
    this.generateDrawerVisible.set(true);
  }

  protected onGenerated(result: GenerateNewsletterResponse): void {
    const hasSubject = this.subjectValue().trim().length > 0;
    const hasBody = this.bodyFilled();
    if (hasSubject || hasBody) {
      this.confirmationService.confirm({
        header: 'Replace existing content?',
        message: 'This will overwrite your current subject and body with the AI-generated newsletter. You can still edit the result before sending.',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Replace',
        rejectLabel: 'Keep current',
        acceptButtonStyleClass: 'p-button-sm',
        rejectButtonStyleClass: 'p-button-secondary p-button-sm p-button-outlined',
        accept: () => this.generated.emit(result),
      });
      return;
    }
    this.generated.emit(result);
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
}
