// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '@components/button/button.component';
import { CAMPAIGN_BUDGET_DEFAULTS, CAMPAIGN_CHAR_LIMITS } from '@lfx-one/shared/constants';
import { CampaignService } from '@services/campaign.service';
import { Subscription } from 'rxjs';

import type { CampaignBriefOutput, CampaignCreateResponse, CampaignCreateResult, CampaignKeyword, CampaignType } from '@lfx-one/shared/interfaces';

type ImplementationStep = 'form' | 'creating' | 'results';

@Component({
  selector: 'lfx-implementation-tab',
  imports: [ReactiveFormsModule, ButtonComponent],
  templateUrl: './implementation-tab.component.html',
  styleUrl: './implementation-tab.component.scss',
})
export class ImplementationTabComponent {
  // === Services ===
  private readonly campaignService = inject(CampaignService);
  private readonly fb = inject(FormBuilder);

  // === Inputs ===
  public readonly briefData = input<CampaignBriefOutput | null>(null);

  // === Constants ===
  protected readonly charLimits = CAMPAIGN_CHAR_LIMITS;
  protected readonly todayDate = new Date().toISOString().split('T')[0];
  protected readonly defaultEndDate = new Date(Date.now() + 30 * 86_400_000).toISOString().split('T')[0];

  // === Forms ===
  protected readonly campaignForm = this.fb.nonNullable.group({
    eventName: ['', [Validators.required]],
    eventSlug: [''],
    countryCode: ['US'],
    registrationUrl: ['', [Validators.required]],
    budgetUsd: [500, [Validators.required, Validators.min(1)]],
    searchBudgetPct: [CAMPAIGN_BUDGET_DEFAULTS.searchBudgetPct],
    startDate: ['', [Validators.required]],
    endDate: ['', [Validators.required]],
    includeSearch: [true],
    includeDemandGen: [true],
    headlines: this.fb.array([this.fb.control('', [Validators.required, Validators.maxLength(CAMPAIGN_CHAR_LIMITS.searchHeadline)])]),
    descriptions: this.fb.array([this.fb.control('', [Validators.required, Validators.maxLength(CAMPAIGN_CHAR_LIMITS.searchDescription)])]),
  });

  // === WritableSignals ===
  protected readonly step = signal<ImplementationStep>('form');
  protected readonly creationProgress = signal<string[]>([]);
  protected readonly results = signal<CampaignCreateResult[]>([]);
  protected readonly errors = signal<string[]>([]);
  protected readonly briefKeywords = signal<CampaignKeyword[]>([]);
  protected readonly briefHsToken = signal<string | null>(null);
  protected readonly briefDriveFolderUrl = signal('');

  // === Computed Signals ===
  protected readonly displayBudgetPct = computed(() => 100 - this.campaignForm.controls.searchBudgetPct.value);
  protected readonly headlinesArray = computed(() => this.campaignForm.controls.headlines as FormArray);
  protected readonly descriptionsArray = computed(() => this.campaignForm.controls.descriptions as FormArray);
  protected readonly campaignName = computed(() => {
    const name = this.campaignForm.controls.eventName.value;
    const region = this.campaignForm.controls.countryCode.value || 'NA';
    const startDate = this.campaignForm.controls.startDate.value || '';
    return name ? `Events | ${name} | ${region} | Conversions | Prospecting | Search | Linux Foundation | BoFU | ${startDate}` : '';
  });

  // === Private State ===
  private jobSubscription: Subscription | null = null;

  // === Lifecycle ===
  public constructor() {
    effect(() => {
      const brief = this.briefData();
      if (!brief) return;
      this.populateFromBrief(brief);
    });
  }

  // === Protected Methods ===
  protected addHeadline(): void {
    (this.campaignForm.controls.headlines as FormArray).push(
      this.fb.control('', [Validators.required, Validators.maxLength(CAMPAIGN_CHAR_LIMITS.searchHeadline)])
    );
  }

  protected removeHeadline(index: number): void {
    const arr = this.campaignForm.controls.headlines as FormArray;
    if (arr.length > 1) arr.removeAt(index);
  }

  protected addDescription(): void {
    (this.campaignForm.controls.descriptions as FormArray).push(
      this.fb.control('', [Validators.required, Validators.maxLength(CAMPAIGN_CHAR_LIMITS.searchDescription)])
    );
  }

  protected removeDescription(index: number): void {
    const arr = this.campaignForm.controls.descriptions as FormArray;
    if (arr.length > 1) arr.removeAt(index);
  }

  protected submit(): void {
    if (this.campaignForm.invalid) return;

    this.step.set('creating');
    this.creationProgress.set(['Submitting campaign...']);
    this.results.set([]);
    this.errors.set([]);

    const form = this.campaignForm.getRawValue();
    const campaignTypes: CampaignType[] = [];
    if (form.includeSearch) campaignTypes.push('search');
    if (form.includeDemandGen) campaignTypes.push('demand-gen');

    const request = {
      eventName: form.eventName,
      eventSlug: form.eventSlug || form.eventName.toLowerCase().replace(/\s+/g, '-'),
      countryCode: form.countryCode,
      registrationUrl: form.registrationUrl,
      hsToken: this.briefHsToken() ?? undefined,
      campaignTypes,
      budgetUsd: form.budgetUsd,
      searchBudgetPct: form.searchBudgetPct,
      startDate: form.startDate,
      endDate: form.endDate,
      keywords: this.briefKeywords(),
      headlines: (form.headlines as string[]).filter((h) => h.trim()),
      descriptions: (form.descriptions as string[]).filter((d) => d.trim()),
      geoTargets: [form.countryCode],
      driveFolderUrl: this.briefDriveFolderUrl() || undefined,
    };

    this.campaignService.createCampaign(request).subscribe({
      next: (response) => {
        if (!response.jobId) {
          this.errors.set(['Failed to start campaign creation.']);
          this.step.set('form');
          return;
        }
        this.creationProgress.update((msgs) => [...msgs, `Job started: ${response.jobId}`]);
        this.pollJob(response.jobId);
      },
      error: () => {
        this.errors.set(['Campaign creation request failed.']);
        this.step.set('form');
      },
    });
  }

  protected reset(): void {
    this.jobSubscription?.unsubscribe();
    this.jobSubscription = null;
    this.step.set('form');
    this.creationProgress.set([]);
    this.results.set([]);
    this.errors.set([]);
  }

  // === Private Methods ===
  private populateFromBrief(brief: CampaignBriefOutput): void {
    const details = brief.eventDetails;
    this.campaignForm.patchValue({
      eventName: details.name,
      eventSlug: details.slug,
      countryCode: details.countryCode || 'US',
      registrationUrl: details.registrationUrl,
      budgetUsd: brief.totalBudget ?? 500,
      startDate: this.todayDate,
      endDate: this.defaultEndDate,
    });

    const searchCopy = brief.structuredCopy?.['google_search'] as Record<string, unknown> | undefined;
    if (searchCopy) {
      const headlines = (searchCopy['headlines'] as string[]) ?? [];
      const descriptions = (searchCopy['descriptions'] as string[]) ?? [];

      const headlinesArr = this.campaignForm.controls.headlines as FormArray;
      headlinesArr.clear();
      for (const h of headlines) {
        headlinesArr.push(this.fb.control(h, [Validators.required, Validators.maxLength(CAMPAIGN_CHAR_LIMITS.searchHeadline)]));
      }

      const descriptionsArr = this.campaignForm.controls.descriptions as FormArray;
      descriptionsArr.clear();
      for (const d of descriptions) {
        descriptionsArr.push(this.fb.control(d, [Validators.required, Validators.maxLength(CAMPAIGN_CHAR_LIMITS.searchDescription)]));
      }
    }

    this.briefKeywords.set(brief.keywords);
    this.briefHsToken.set(brief.hsUtm);
    this.briefDriveFolderUrl.set(brief.driveFolderUrl);
  }

  private pollJob(jobId: string): void {
    this.jobSubscription = this.campaignService.getCreateResult(jobId).subscribe({
      next: (result: CampaignCreateResponse | null) => {
        if (result) {
          this.results.set(result.campaigns);
          this.errors.set(result.errors);
          this.step.set('results');
        }
      },
      error: () => {
        this.errors.set(['Failed to retrieve campaign results.']);
        this.step.set('results');
      },
    });
  }
}
