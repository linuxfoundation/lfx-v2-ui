// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, inject, input, signal, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { CardComponent } from '@components/card/card.component';
import { SURVEY_LABEL } from '@lfx-one/shared/constants';
import { Survey } from '@lfx-one/shared/interfaces';
import { SurveyService } from '@services/survey.service';
import { MessageService } from 'primeng/api';
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
  private readonly messageService = inject(MessageService);

  // === Constants ===
  protected readonly surveyLabelPlural = SURVEY_LABEL.plural;

  // === Inputs ===
  public readonly committeeUid = input.required<string>();
  public readonly committeeName = input<string>('');
  public readonly hasPMOAccess = input<boolean>(false);

  // === Subjects ===
  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  // === Writable Signals ===
  protected readonly loading = signal<boolean>(true);
  protected readonly loadError = signal<boolean>(false);
  protected readonly resultsDrawerVisible = signal<boolean>(false);
  protected readonly selectedSurveyId = signal<string | null>(null);
  protected readonly selectedListSurvey = signal<Survey | null>(null);

  // === Computed Signals ===
  protected readonly surveys: Signal<Survey[]> = this.initSurveys();

  // === Protected Methods ===
  protected onViewResults(surveyId: string): void {
    this.selectedSurveyId.set(surveyId);
    this.selectedListSurvey.set(this.surveys().find((s) => s.uid === surveyId) ?? null);
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

  protected onDuplicateSurvey(): void {
    this.messageService.add({ severity: 'info', summary: 'Coming Soon', detail: 'Survey duplication is not yet available' });
  }

  protected onCloseSurvey(): void {
    this.messageService.add({ severity: 'info', summary: 'Coming Soon', detail: 'Survey close is not yet available' });
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
          this.resultsDrawerVisible.set(false);
          this.selectedSurveyId.set(null);
          this.selectedListSurvey.set(null);
          return this.refresh$.pipe(
            switchMap(() => {
              this.loading.set(true);
              return this.surveyService.getSurveysByCommittee(committeeUid).pipe(
                catchError(() => {
                  this.loadError.set(true);
                  return of([]);
                }),
                finalize(() => this.loading.set(false))
              );
            })
          );
        })
      ),
      { initialValue: [] }
    );
  }
}
