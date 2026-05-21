// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { LowerCasePipe } from '@angular/common';
import { Component, effect, model, input, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '@components/button/button.component';
import { InputTextComponent } from '@components/input-text/input-text.component';
import { TextareaComponent } from '@components/textarea/textarea.component';
import { CrowdfundingInitiativeDetail } from '@lfx-one/shared/interfaces';
import { InputTextModule } from 'primeng/inputtext';
import { DrawerModule } from 'primeng/drawer';

interface SettingsTab {
  id: string;
  label: string;
}

interface Beneficiary {
  name: string;
  email: string;
}

@Component({
  selector: 'lfx-initiative-settings-drawer',
  imports: [DrawerModule, InputTextComponent, TextareaComponent, ButtonComponent, ReactiveFormsModule, InputTextModule, LowerCasePipe],
  templateUrl: './initiative-settings-drawer.component.html',
  styleUrl: './initiative-settings-drawer.component.scss',
})
export class InitiativeSettingsDrawerComponent {
  public readonly initiative = input.required<CrowdfundingInitiativeDetail>();
  public readonly visible = model(false);

  protected readonly activeSettingsTab = signal<string>('details');

  protected readonly settingsTabs: SettingsTab[] = [
    { id: 'details', label: 'Initiative details' },
    { id: 'branding', label: 'Branding' },
    { id: 'beneficiaries', label: 'Beneficiaries' },
    { id: 'funding', label: 'Funding' },
  ];

  protected readonly form: FormGroup = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    description: new FormControl('', [Validators.maxLength(500)]),
    websiteUrl: new FormControl(''),
    goal: new FormControl<number | null>(null),
  });

  protected readonly tags = signal<string[]>([]);
  protected readonly newTagValue = signal<string>('');
  protected readonly beneficiaries = signal<Beneficiary[]>([]);

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.value });
  protected readonly nameLength = computed(() => this.formValue().name?.length ?? 0);
  protected readonly descriptionLength = computed(() => this.formValue().description?.length ?? 0);

  constructor() {
    effect(() => {
      if (this.visible()) {
        const init = this.initiative();
        this.form.patchValue({
          name: init.name,
          description: init.description,
          websiteUrl: init.publicUrl ?? '',
          goal: init.goal,
        });
        this.tags.set([...init.tags]);
        this.beneficiaries.set([]);
        this.activeSettingsTab.set('details');
      }
    });
  }

  protected onClose(): void {
    this.visible.set(false);
  }

  protected addTag(): void {
    const tag = this.newTagValue().trim();
    if (tag && !this.tags().includes(tag)) {
      this.tags.update((tags) => [...tags, tag]);
    }
    this.newTagValue.set('');
  }

  protected removeTag(tag: string): void {
    this.tags.update((tags) => tags.filter((t) => t !== tag));
  }

  protected addBeneficiary(): void {
    this.beneficiaries.update((list) => [...list, { name: '', email: '' }]);
  }

  protected removeBeneficiary(index: number): void {
    this.beneficiaries.update((list) => list.filter((_, i) => i !== index));
  }

  protected updateBeneficiary(index: number, field: 'name' | 'email', value: string): void {
    this.beneficiaries.update((list) => list.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
  }
}
