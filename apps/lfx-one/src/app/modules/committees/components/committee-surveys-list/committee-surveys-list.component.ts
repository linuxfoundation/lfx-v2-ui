// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, input, signal, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { CardComponent } from '@components/card/card.component';
import { SURVEY_LABEL } from '@lfx-one/shared';
import { Survey, SurveyResultsDetail } from '@lfx-one/shared/interfaces';
import { SurveyService } from '@services/survey.service';
import { BehaviorSubject, catchError, finalize, of, switchMap } from 'rxjs';

import { SurveyResultsDrawerComponent } from '@app/modules/surveys/components/survey-results-drawer/survey-results-drawer.component';
import { SurveysTableComponent } from '@app/modules/surveys/components/surveys-table/surveys-table.component';

@Component({
  selector: 'lfx-committee-surveys-list',
  imports: [CardComponent, SurveysTableComponent, SurveyResultsDrawerComponent],
  templateUrl: './committee-surveys-list.component.html',
})
export class CommitteeSurveysListComponent {
  // === Services ===
  private readonly surveyService = inject(SurveyService);

  // === Constants ===
  protected readonly surveyLabelPlural = SURVEY_LABEL.plural;

  // === Inputs ===
  public readonly committeeUid = input.required<string>();
  public readonly committeeName = input.required<string>();
  public readonly hasPMOAccess = input<boolean>(false);

  // === Subjects ===
  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  // === Writable Signals ===
  protected readonly loading = signal<boolean>(true);
  protected readonly loadError = signal<boolean>(false);
  protected readonly resultsDrawerVisible = signal<boolean>(false);
  protected readonly selectedSurveyId = signal<string | null>(null);

  // === Computed Signals ===
  protected readonly surveys: Signal<Survey[]> = this.initSurveys();
  protected readonly selectedSurvey: Signal<SurveyResultsDetail | null> = this.initSelectedSurvey();

  // === Protected Methods ===
  protected onViewResults(surveyId: string): void {
    this.selectedSurveyId.set(surveyId);
    this.resultsDrawerVisible.set(true);
  }

  protected onRowClick(survey: Survey): void {
    this.onViewResults(survey.uid);
  }

  protected refreshSurveys(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.refresh$.next();
  }

  protected onDuplicateSurvey(surveyId: string): void {
    console.warn('Survey duplication not yet implemented for:', surveyId);
  }

  protected onCloseSurvey(surveyId: string): void {
    console.warn('Survey close not yet implemented for:', surveyId);
  }

  // === Private Initializers ===
  private initSurveys(): Signal<Survey[]> {
    const committeeUid$ = toObservable(this.committeeUid);

    return toSignal(
      committeeUid$.pipe(
        switchMap((committeeUid) => {
          if (!committeeUid) {
            this.loading.set(false);
            return of([]);
          }

          this.loading.set(true);
          this.loadError.set(false);
          return this.refresh$.pipe(
            switchMap(() =>
              this.surveyService.getSurveysByCommittee(committeeUid).pipe(
                catchError(() => {
                  this.loadError.set(true);
                  return of([]);
                }),
                finalize(() => this.loading.set(false))
              )
            )
          );
        })
      ),
      { initialValue: [] }
    );
  }

  private initSelectedSurvey(): Signal<SurveyResultsDetail | null> {
    return computed(() => {
      const surveyId = this.selectedSurveyId();
      if (!surveyId) return null;

      const survey = this.surveys().find((s) => s.uid === surveyId);
      if (!survey) return null;

      const committeeData = this.getCommitteeData(survey);

      return {
        ...survey,
        nps_score: this.calculateNpsScore(survey, committeeData),
        nps_breakdown: this.calculateNpsBreakdown(survey, committeeData),
        additional_comments: [],
      };
    });
  }

  // === Private Helpers ===
  private getCommitteeData(survey: Survey): Survey['committees'] {
    const uid = this.committeeUid();
    return survey.committees?.filter((c) => c.committee_uid === uid) ?? [];
  }

  private calculateNpsScore(survey: Survey, committeeData: Survey['committees']): number | undefined {
    if (!survey.is_nps_survey || !committeeData?.length) return undefined;

    const totalResponses = committeeData.reduce((sum, c) => sum + c.total_responses, 0);
    if (totalResponses === 0) return 0;

    const weightedNps = committeeData.reduce((sum, c) => sum + c.nps_value * c.total_responses, 0);
    return Math.round(weightedNps / totalResponses);
  }

  private calculateNpsBreakdown(
    survey: Survey,
    committeeData: Survey['committees']
  ): { promoters: number; passives: number; detractors: number; nonResponses: number } | undefined {
    if (!survey.is_nps_survey || !committeeData?.length) return undefined;

    const totalResponses = committeeData.reduce((sum, c) => sum + c.total_responses, 0);
    const totalRecipients = committeeData.reduce((sum, c) => sum + (c.total_recipients ?? 0), 0);

    return {
      promoters: committeeData.reduce((sum, c) => sum + c.num_promoters, 0),
      passives: committeeData.reduce((sum, c) => sum + c.num_passives, 0),
      detractors: committeeData.reduce((sum, c) => sum + c.num_detractors, 0),
      nonResponses: Math.max(0, totalRecipients - totalResponses),
    };
  }
}
