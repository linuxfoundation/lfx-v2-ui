# Enrolled Trainings Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Coming soon" placeholder on the Enrolled Trainings tab at `/me/training` with a functional two-section view (ongoing + completed trainings), backed by two Snowflake tables.

**Architecture:** Add `EnrollmentRow` / `TrainingEnrollment` interfaces and `TRAINING_PRODUCT_TYPE` / `CERTIFICATION_PRODUCT_TYPE` constants to the shared package. Extend the backend `TrainingService` with a `getEnrollments()` method and update `getCertifications()` to accept a `productType` filter. Wire a new `GET /api/training/enrollments` endpoint through the Express route → controller → service chain. On the frontend, create a `TrainingCardComponent` for card rendering and update `TrainingsDashboardComponent` to load all three signals eagerly.

**Tech Stack:** Angular 20 (zoneless, signals, `toSignal()`), Express.js, TypeScript, Snowflake via `SnowflakeService`, Tailwind CSS, Font Awesome icons, `HttpParams` for query params.

---

## File Map

### New files

| File                                                                                           | Purpose                                                                        |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `packages/shared/src/constants/training.constants.ts`                                          | `TRAINING_PRODUCT_TYPE`, `CERTIFICATION_PRODUCT_TYPE`, `CONTINUE_LEARNING_URL` |
| `apps/lfx-one/src/app/modules/trainings/components/training-card/training-card.component.ts`   | Training card component logic                                                  |
| `apps/lfx-one/src/app/modules/trainings/components/training-card/training-card.component.html` | Training card template                                                         |

### Modified files

| File                                                                                            | What changes                                                                                                             |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `packages/shared/src/interfaces/training.interface.ts`                                          | Add `EnrollmentRow`, `TrainingEnrollment`; add `level` to `Certification` and `LEVEL`/`PRODUCT_TYPE` to `CertificateRow` |
| `packages/shared/src/constants/index.ts`                                                        | Export `training.constants`                                                                                              |
| `apps/lfx-one/src/server/services/training.service.ts`                                          | Add `getEnrollments()`; update `getCertifications()` with `productType` filter + `LEVEL`                                 |
| `apps/lfx-one/src/server/controllers/training.controller.ts`                                    | Add `getEnrollments()`; update `getCertifications()` to extract `productType` from query                                 |
| `apps/lfx-one/src/server/routes/training.route.ts`                                              | Add `GET /enrollments` route                                                                                             |
| `apps/lfx-one/src/app/shared/services/training.service.ts`                                      | Add `getEnrollments()`; update `getCertifications()` with `HttpParams`                                                   |
| `apps/lfx-one/src/app/modules/trainings/trainings-dashboard/trainings-dashboard.component.ts`   | Add `enrollments` + `completedTrainings` signals; pass `productType` to `getCertifications()`                            |
| `apps/lfx-one/src/app/modules/trainings/trainings-dashboard/trainings-dashboard.component.html` | Replace "Coming soon" placeholder with real enrolled-trainings tab content                                               |

---

## Task 1: Shared Package — Constants

**Files:**

- Create: `packages/shared/src/constants/training.constants.ts`
- Modify: `packages/shared/src/constants/index.ts`

- [ ] **Step 1: Create the constants file**

```typescript
// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

export const TRAINING_PRODUCT_TYPE = 'Training' as const;
export const CERTIFICATION_PRODUCT_TYPE = 'Certification' as const;
export type ProductType = typeof TRAINING_PRODUCT_TYPE | typeof CERTIFICATION_PRODUCT_TYPE;

export const CONTINUE_LEARNING_URL = 'https://trainingportal.linuxfoundation.org/learn/dashboard';
```

- [ ] **Step 2: Export from shared package index**

In `packages/shared/src/constants/index.ts`, add at the end of the existing exports:

```typescript
export * from './training.constants';
```

- [ ] **Step 3: Verify the build compiles**

```bash
yarn build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/constants/training.constants.ts packages/shared/src/constants/index.ts
git commit --signoff -m "feat(training): add training constants to shared package"
```

---

## Task 2: Shared Package — Interfaces

**Files:**

- Modify: `packages/shared/src/interfaces/training.interface.ts`

- [ ] **Step 1: Update the interfaces file**

Replace the entire file content with:

```typescript
// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Certification status derived from expiration date
 */
export type CertificationStatus = 'active' | 'expired';

/**
 * A Linux Foundation certification earned by the user
 */
export interface Certification {
  /** Unique record identifier (_KEY) */
  id: string;
  /** Certificate identifier (from IDENTIFIER column) */
  certificateId: string;
  /** Full certification/course name */
  name: string;
  /** Description of what the certification covers */
  description: string;
  /** Certification seal/logo image URL */
  imageUrl: string;
  /** Issuing project name */
  issuedBy: string;
  /** ISO date string for when the certification was issued */
  issuedDate: string;
  /** ISO date string for expiry; null means no expiry (perpetual) */
  expiryDate: string | null;
  /** Current certification status, derived from expiryDate */
  status: CertificationStatus;
  /** URL to download the certificate; null if unavailable */
  downloadUrl: string | null;
  /** Difficulty level (e.g. Beginner, Intermediate, Advanced) */
  level: string;
}

/**
 * Snowflake row shape for ANALYTICS.PLATINUM_LFX_ONE.USER_CERTIFICATES
 */
export interface CertificateRow {
  _KEY: string;
  IDENTIFIER: string;
  COURSE_NAME: string;
  COURSE_GROUP_DESCRIPTION: string;
  LOGO_URL: string;
  PROJECT_NAME: string;
  ISSUED_TS: string;
  EXPIRATION_DATE: string | null;
  DOWNLOAD_URL: string | null;
  LEVEL: string;
  PRODUCT_TYPE: string;
}

/**
 * Snowflake row shape for ANALYTICS.PLATINUM_LFX_ONE.USER_COURSE_ENROLLMENTS
 */
export interface EnrollmentRow {
  ENROLLMENT_ID: string;
  ENROLLMENT_TS: string;
  USER_NAME: string;
  LOGO_URL: string;
  COURSE_NAME: string;
  COURSE_GROUP_DESCRIPTION: string;
  PRODUCT_TYPE: string;
  PROJECT_NAME: string;
  LEVEL: string;
}

/**
 * A training course the user is currently enrolled in
 */
export interface TrainingEnrollment {
  /** ENROLLMENT_ID */
  id: string;
  /** COURSE_NAME */
  name: string;
  /** COURSE_GROUP_DESCRIPTION */
  description: string;
  /** LOGO_URL */
  imageUrl: string;
  /** PROJECT_NAME */
  issuedBy: string;
  /** ENROLLMENT_TS (ISO string) */
  enrolledDate: string;
  /** Difficulty level (e.g. Beginner, Intermediate, Advanced) */
  level: string;
}
```

- [ ] **Step 2: Verify the build compiles**

```bash
yarn build 2>&1 | tail -20
```

Expected: no errors. Note: the `level` addition to `Certification` may trigger a TypeScript error in the backend `mapRowToCertification` — that is expected and will be fixed in Task 3.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/interfaces/training.interface.ts
git commit --signoff -m "feat(training): add EnrollmentRow, TrainingEnrollment; extend Certification and CertificateRow with level"
```

---

## Task 3: Backend Service

**Files:**

- Modify: `apps/lfx-one/src/server/services/training.service.ts`

The service currently has a single `getCertifications()` method and a hard-coded `CERTIFICATES_QUERY` with no `PRODUCT_TYPE` filter. We need to:

- Add `LEVEL` to the SELECT
- Add an optional `productType` parameter with conditional `WHERE` clause
- Add `mapRowToEnrollment()` and `getEnrollments()` for the new endpoint
- Map `LEVEL` to `level` in `mapRowToCertification()`

- [ ] **Step 1: Replace the file content**

```typescript
// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { CertificateRow, Certification, CertificationStatus, EnrollmentRow, TrainingEnrollment } from '@lfx-one/shared/interfaces';
import { Request } from 'express';

import { logger } from './logger.service';
import { SnowflakeService } from './snowflake.service';

const CERTIFICATES_BASE_QUERY = `
  SELECT _KEY, IDENTIFIER, COURSE_NAME, COURSE_GROUP_DESCRIPTION,
         LOGO_URL, PROJECT_NAME, ISSUED_TS, EXPIRATION_DATE, DOWNLOAD_URL, LEVEL
  FROM ANALYTICS.PLATINUM_LFX_ONE.USER_CERTIFICATES
  WHERE USER_NAME = ?
`;

const CERTIFICATES_FILTERED_QUERY = `${CERTIFICATES_BASE_QUERY}  AND PRODUCT_TYPE = ?
  ORDER BY ISSUED_TS DESC
`;

const CERTIFICATES_UNFILTERED_QUERY = `${CERTIFICATES_BASE_QUERY}  ORDER BY ISSUED_TS DESC
`;

const ENROLLMENTS_QUERY = `
  SELECT ENROLLMENT_ID, ENROLLMENT_TS, COURSE_NAME, COURSE_GROUP_DESCRIPTION,
         LOGO_URL, PROJECT_NAME, LEVEL
  FROM ANALYTICS.PLATINUM_LFX_ONE.USER_COURSE_ENROLLMENTS
  WHERE USER_NAME = ? AND PRODUCT_TYPE = 'Training'
  ORDER BY ENROLLMENT_TS DESC
`;

export class TrainingService {
  private readonly snowflakeService: SnowflakeService;

  public constructor() {
    this.snowflakeService = SnowflakeService.getInstance();
  }

  public async getCertifications(req: Request, username: string, productType?: string): Promise<Certification[]> {
    logger.debug(req, 'get_certifications', 'Fetching certifications from Snowflake', { username, productType });

    let result: { rows: CertificateRow[] };

    try {
      if (productType) {
        result = await this.snowflakeService.execute<CertificateRow>(CERTIFICATES_FILTERED_QUERY, [username, productType]);
      } else {
        result = await this.snowflakeService.execute<CertificateRow>(CERTIFICATES_UNFILTERED_QUERY, [username]);
      }
    } catch (error) {
      logger.warning(req, 'get_certifications', 'Snowflake query failed, returning empty certifications', {
        error: error instanceof Error ? error.message : String(error),
      });

      return [];
    }

    logger.debug(req, 'get_certifications', 'Fetched certifications', { count: result.rows.length });

    return result.rows.map((row) => this.mapRowToCertification(row));
  }

  public async getEnrollments(req: Request, username: string): Promise<TrainingEnrollment[]> {
    logger.debug(req, 'get_enrollments', 'Fetching enrollments from Snowflake', { username });

    let result: { rows: EnrollmentRow[] };

    try {
      result = await this.snowflakeService.execute<EnrollmentRow>(ENROLLMENTS_QUERY, [username]);
    } catch (error) {
      logger.warning(req, 'get_enrollments', 'Snowflake query failed, returning empty enrollments', {
        error: error instanceof Error ? error.message : String(error),
      });

      return [];
    }

    logger.debug(req, 'get_enrollments', 'Fetched enrollments', { count: result.rows.length });

    return result.rows.map((row) => this.mapRowToEnrollment(row));
  }

  private mapRowToCertification(row: CertificateRow): Certification {
    return {
      id: row._KEY,
      certificateId: row.IDENTIFIER,
      name: row.COURSE_NAME,
      description: row.COURSE_GROUP_DESCRIPTION ?? '',
      imageUrl: row.LOGO_URL ?? '',
      issuedBy: row.PROJECT_NAME ?? '',
      issuedDate: row.ISSUED_TS,
      expiryDate: row.EXPIRATION_DATE ?? null,
      status: this.deriveStatus(row.EXPIRATION_DATE),
      downloadUrl: row.DOWNLOAD_URL ?? null,
      level: row.LEVEL ?? '',
    };
  }

  private mapRowToEnrollment(row: EnrollmentRow): TrainingEnrollment {
    return {
      id: row.ENROLLMENT_ID,
      name: row.COURSE_NAME,
      description: row.COURSE_GROUP_DESCRIPTION ?? '',
      imageUrl: row.LOGO_URL ?? '',
      issuedBy: row.PROJECT_NAME ?? '',
      enrolledDate: row.ENROLLMENT_TS,
      level: row.LEVEL ?? '',
    };
  }

  private deriveStatus(expirationDate: string | null): CertificationStatus {
    if (!expirationDate) return 'active';
    return new Date(expirationDate) < new Date() ? 'expired' : 'active';
  }
}
```

- [ ] **Step 2: Verify the build compiles**

```bash
yarn build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/lfx-one/src/server/services/training.service.ts
git commit --signoff -m "feat(training): add getEnrollments; add productType filter and LEVEL to getCertifications"
```

---

## Task 4: Backend Controller & Route

**Files:**

- Modify: `apps/lfx-one/src/server/controllers/training.controller.ts`
- Modify: `apps/lfx-one/src/server/routes/training.route.ts`

- [ ] **Step 1: Replace the controller file**

```typescript
// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { NextFunction, Request, Response } from 'express';

import { AuthenticationError } from '../errors';
import { logger } from '../services/logger.service';
import { TrainingService } from '../services/training.service';
import { getUsernameFromAuth, stripAuthPrefix } from '../utils/auth-helper';

export class TrainingController {
  private readonly trainingService = new TrainingService();

  /**
   * GET /api/training/certifications
   * Get certifications for the authenticated user, optionally filtered by productType
   */
  public async getCertifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'get_certifications');

    try {
      const rawUsername = await getUsernameFromAuth(req);

      if (!rawUsername) {
        throw new AuthenticationError('User authentication required', {
          operation: 'get_certifications',
        });
      }

      const username = stripAuthPrefix(rawUsername);
      const productType = req.query['productType'] ? String(req.query['productType']) : undefined;
      const certifications = await this.trainingService.getCertifications(req, username, productType);

      logger.success(req, 'get_certifications', startTime, {
        result_count: certifications.length,
        product_type: productType,
      });

      res.json(certifications);
    } catch (error) {
      logger.error(req, 'get_certifications', startTime, error);
      next(error);
    }
  }

  /**
   * GET /api/training/enrollments
   * Get ongoing training enrollments for the authenticated user
   */
  public async getEnrollments(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'get_enrollments');

    try {
      const rawUsername = await getUsernameFromAuth(req);

      if (!rawUsername) {
        throw new AuthenticationError('User authentication required', {
          operation: 'get_enrollments',
        });
      }

      const username = stripAuthPrefix(rawUsername);
      const enrollments = await this.trainingService.getEnrollments(req, username);

      logger.success(req, 'get_enrollments', startTime, {
        result_count: enrollments.length,
      });

      res.json(enrollments);
    } catch (error) {
      logger.error(req, 'get_enrollments', startTime, error);
      next(error);
    }
  }
}
```

- [ ] **Step 2: Update the route file**

```typescript
// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { Router } from 'express';

import { TrainingController } from '../controllers/training.controller';

const router = Router();
const trainingController = new TrainingController();

router.get('/certifications', (req, res, next) => trainingController.getCertifications(req, res, next));
router.get('/enrollments', (req, res, next) => trainingController.getEnrollments(req, res, next));

export default router;
```

- [ ] **Step 3: Verify the build compiles**

```bash
yarn build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/lfx-one/src/server/controllers/training.controller.ts apps/lfx-one/src/server/routes/training.route.ts
git commit --signoff -m "feat(training): add getEnrollments endpoint; add productType query param to getCertifications"
```

---

## Task 5: Frontend Service

**Files:**

- Modify: `apps/lfx-one/src/app/shared/services/training.service.ts`

The current service has a single `getCertifications()` that uses no query params. We need to add `HttpParams` support and a new `getEnrollments()` method.

- [ ] **Step 1: Replace the file content**

```typescript
// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Certification, TrainingEnrollment } from '@lfx-one/shared/interfaces';
import { catchError, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TrainingService {
  private readonly http = inject(HttpClient);

  public getCertifications(productType?: string): Observable<Certification[]> {
    let params = new HttpParams();
    if (productType) {
      params = params.set('productType', productType);
    }
    return this.http.get<Certification[]>('/api/training/certifications', { params }).pipe(catchError(() => of([])));
  }

  public getEnrollments(): Observable<TrainingEnrollment[]> {
    return this.http.get<TrainingEnrollment[]>('/api/training/enrollments').pipe(catchError(() => of([])));
  }
}
```

- [ ] **Step 2: Verify the build compiles**

```bash
yarn build 2>&1 | tail -20
```

Expected: no errors. Note: `TrainingsDashboardComponent` still calls `getCertifications()` without args — that's still valid (undefined passes through without adding a query param).

- [ ] **Step 3: Commit**

```bash
git add apps/lfx-one/src/app/shared/services/training.service.ts
git commit --signoff -m "feat(training): add getEnrollments and productType param to frontend training service"
```

---

## Task 6: TrainingCardComponent

**Files:**

- Create: `apps/lfx-one/src/app/modules/trainings/components/training-card/training-card.component.ts`
- Create: `apps/lfx-one/src/app/modules/trainings/components/training-card/training-card.component.html`

This component renders a single card for either an ongoing enrollment or a completed training. It accepts a union type input (`TrainingEnrollment | Certification`) and a `variant` input (`'ongoing' | 'completed'`).

Level badge color mapping:

- `'Beginner'` → blue (`bg-blue-50 text-blue-700 border-blue-200`)
- `'Intermediate'` → purple (`bg-purple-50 text-purple-700 border-purple-200`)
- `'Advanced'` → orange (`bg-orange-50 text-orange-700 border-orange-200`)
- any other / empty → gray (`bg-gray-50 text-gray-500 border-gray-200`)

- [ ] **Step 1: Create the component TypeScript file**

```typescript
// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, Signal } from '@angular/core';
import { Certification, TrainingEnrollment } from '@lfx-one/shared/interfaces';
import { CONTINUE_LEARNING_URL } from '@lfx-one/shared/constants';

import { ButtonComponent } from '@components/button/button.component';

@Component({
  selector: 'lfx-training-card',
  imports: [ButtonComponent, DatePipe],
  templateUrl: './training-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingCardComponent {
  // ─── Inputs ────────────────────────────────────────────────────────────────
  public readonly training = input.required<TrainingEnrollment | Certification>();
  public readonly variant = input<'ongoing' | 'completed'>('ongoing');

  // ─── Public constants (used in template) ───────────────────────────────────
  protected readonly continueLearningUrl = CONTINUE_LEARNING_URL;

  // ─── Computed Signals ──────────────────────────────────────────────────────
  protected readonly hasImage: Signal<boolean> = this.initHasImage();
  protected readonly isOngoing: Signal<boolean> = this.initIsOngoing();
  protected readonly date: Signal<string> = this.initDate();
  protected readonly dateLabel: Signal<string> = this.initDateLabel();
  protected readonly levelClasses: Signal<string> = this.initLevelClasses();
  protected readonly downloadUrl: Signal<string | null> = this.initDownloadUrl();

  // ─── Private Initializers ──────────────────────────────────────────────────
  private initHasImage(): Signal<boolean> {
    return computed(() => !!this.training().imageUrl);
  }

  private initIsOngoing(): Signal<boolean> {
    return computed(() => this.variant() === 'ongoing');
  }

  private initDate(): Signal<string> {
    return computed(() => {
      const t = this.training();
      if (this.variant() === 'ongoing') {
        return (t as TrainingEnrollment).enrolledDate ?? '';
      }
      return (t as Certification).issuedDate ?? '';
    });
  }

  private initDateLabel(): Signal<string> {
    return computed(() => (this.variant() === 'ongoing' ? 'Enrolled' : 'Completed'));
  }

  private initLevelClasses(): Signal<string> {
    return computed(() => {
      const level = this.training().level;
      if (level === 'Beginner') return 'bg-blue-50 text-blue-700 border border-blue-200';
      if (level === 'Intermediate') return 'bg-purple-50 text-purple-700 border border-purple-200';
      if (level === 'Advanced') return 'bg-orange-50 text-orange-700 border border-orange-200';
      return 'bg-gray-50 text-gray-500 border border-gray-200';
    });
  }

  private initDownloadUrl(): Signal<string | null> {
    return computed(() => {
      if (this.variant() !== 'completed') return null;
      const t = this.training() as Certification;
      return t.downloadUrl ?? null;
    });
  }
}
```

- [ ] **Step 2: Create the component HTML template**

```html
<!-- Copyright The Linux Foundation and each contributor to LFX. -->
<!-- SPDX-License-Identifier: MIT -->

<div class="bg-white rounded-xl border shadow-sm hover:border-blue-400 transition-all" data-testid="training-card">
  <div class="p-5 flex items-start gap-5">
    <!-- Col 1: Logo -->
    <div
      class="flex-shrink-0 w-14 h-14 flex items-center justify-center overflow-hidden rounded-xl bg-gray-50 border border-gray-100"
      data-testid="training-card-image-container">
      @if (hasImage()) {
      <img [src]="training().imageUrl" [alt]="training().name" class="w-14 h-14 object-contain" data-testid="training-card-image" />
      } @else {
      <i class="fa-light fa-book-open text-2xl text-gray-400" data-testid="training-card-icon-fallback"></i>
      }
    </div>

    <!-- Col 2: Main content -->
    <div class="flex-1 min-w-0 flex flex-col gap-3">
      <!-- Top row: name + level badge + issuedBy | Continue Learning button -->
      <div class="flex items-start justify-between gap-4">
        <div class="flex flex-col gap-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="text-sm font-semibold text-gray-900 leading-snug" data-testid="training-card-name">{{ training().name }}</h3>
            @if (training().level) {
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {{ levelClasses() }}" data-testid="training-card-level-badge">
              {{ training().level }}
            </span>
            }
          </div>
          <p class="text-xs text-gray-500" data-testid="training-card-issued-by">{{ training().issuedBy }}</p>
        </div>

        @if (isOngoing()) {
        <div class="flex-shrink-0" data-testid="training-card-continue-action">
          <lfx-button
            severity="secondary"
            styleClass="!text-xs !h-8 !py-0"
            label="Continue Learning"
            icon="fa-light fa-arrow-right"
            [href]="continueLearningUrl"
            target="_blank"
            rel="noopener noreferrer"
            [outlined]="true"
            data-testid="training-card-continue-btn" />
        </div>
        }
      </div>

      <!-- Description -->
      <p class="text-sm text-gray-600 line-clamp-2" [title]="training().description" data-testid="training-card-description">{{ training().description }}</p>

      <!-- Bottom row: date meta + download button (completed only) -->
      <div class="flex items-end justify-between gap-4 border-t border-gray-100 pt-3" data-testid="training-card-meta-row">
        <div class="flex flex-wrap gap-x-8 gap-y-1.5 text-xs" data-testid="training-card-meta">
          <div class="flex flex-col gap-0.5">
            <span class="text-gray-400">{{ dateLabel() }}</span>
            <span class="text-gray-700 font-medium" data-testid="training-card-date">{{ date() | date: 'MMM d, y' }}</span>
          </div>
        </div>

        @if (downloadUrl()) {
        <div class="flex-shrink-0" data-testid="training-card-actions">
          <lfx-button
            severity="secondary"
            styleClass="!text-xs !h-8 !py-0"
            label="Download Certificate"
            icon="fa-light fa-arrow-down-to-line"
            [href]="downloadUrl()!"
            target="_blank"
            rel="noopener noreferrer"
            [outlined]="true"
            data-testid="training-card-download-btn" />
        </div>
        }
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Verify the build compiles**

```bash
yarn build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/lfx-one/src/app/modules/trainings/components/training-card/
git commit --signoff -m "feat(training): add TrainingCardComponent for ongoing and completed trainings"
```

---

## Task 7: TrainingsDashboardComponent — Logic

**Files:**

- Modify: `apps/lfx-one/src/app/modules/trainings/trainings-dashboard/trainings-dashboard.component.ts`

Changes:

1. Import `TrainingEnrollment` and the two product-type constants
2. Import `TrainingCardComponent`
3. Add `enrollments` and `completedTrainings` signals
4. Update `certifications` signal to pass `CERTIFICATION_PRODUCT_TYPE`

- [ ] **Step 1: Replace the component TypeScript file**

```typescript
// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { ChangeDetectionStrategy, Component, inject, signal, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CERTIFICATION_PRODUCT_TYPE, TRAINING_PRODUCT_TYPE } from '@lfx-one/shared/constants';
import { Certification, FilterPillOption, TrainingEnrollment } from '@lfx-one/shared/interfaces';

import { ButtonComponent } from '@components/button/button.component';
import { FilterPillsComponent } from '@components/filter-pills/filter-pills.component';
import { TrainingService } from '@shared/services/training.service';
import { CertificationCardComponent } from '../components/certification-card/certification-card.component';
import { TrainingCardComponent } from '../components/training-card/training-card.component';

const PAGE_SUBTITLE = 'Track your Linux Foundation learning journey — active certifications, enrolled courses, rewards, and resources all in one place.';

const TAB_OPTIONS: FilterPillOption[] = [
  { id: 'certifications', label: 'Certifications' },
  { id: 'enrolled-trainings', label: 'Enrolled Trainings' },
  { id: 'rewards', label: 'Rewards' },
];

const USEFUL_LINKS = [
  {
    label: 'LF Training Portal',
    url: 'https://trainingportal.linuxfoundation.org',
    description: 'Access your enrolled courses, track learning progress, and resume where you left off.',
  },
  {
    label: 'LF Education & Certification',
    url: 'https://training.linuxfoundation.org',
    description: 'Browse certifications, explore the full course catalog, and register for exams.',
  },
];

@Component({
  selector: 'lfx-trainings-dashboard',
  imports: [ButtonComponent, CertificationCardComponent, FilterPillsComponent, TrainingCardComponent],
  templateUrl: './trainings-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingsDashboardComponent {
  // ─── Private Injections ────────────────────────────────────────────────────
  private readonly trainingService = inject(TrainingService);

  // ─── Configuration ─────────────────────────────────────────────────────────
  protected readonly subtitle = PAGE_SUBTITLE;
  protected readonly tabOptions = TAB_OPTIONS;
  protected readonly usefulLinks = USEFUL_LINKS;

  // ─── Writable Signals ──────────────────────────────────────────────────────
  protected readonly activeTab = signal<string>('certifications');

  // ─── Computed Signals ──────────────────────────────────────────────────────
  protected readonly certifications: Signal<Certification[] | undefined> = this.initCertifications();
  protected readonly enrollments: Signal<TrainingEnrollment[] | undefined> = this.initEnrollments();
  protected readonly completedTrainings: Signal<Certification[] | undefined> = this.initCompletedTrainings();

  // ─── Protected Methods ─────────────────────────────────────────────────────
  protected onTabChange(tabId: string): void {
    this.activeTab.set(tabId);
  }

  // ─── Private Initializers ──────────────────────────────────────────────────
  private initCertifications(): Signal<Certification[] | undefined> {
    return toSignal(this.trainingService.getCertifications(CERTIFICATION_PRODUCT_TYPE));
  }

  private initEnrollments(): Signal<TrainingEnrollment[] | undefined> {
    return toSignal(this.trainingService.getEnrollments());
  }

  private initCompletedTrainings(): Signal<Certification[] | undefined> {
    return toSignal(this.trainingService.getCertifications(TRAINING_PRODUCT_TYPE));
  }
}
```

- [ ] **Step 2: Verify the build compiles**

```bash
yarn build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/lfx-one/src/app/modules/trainings/trainings-dashboard/trainings-dashboard.component.ts
git commit --signoff -m "feat(training): wire enrollments and completedTrainings signals in dashboard"
```

---

## Task 8: TrainingsDashboardComponent — Template

**Files:**

- Modify: `apps/lfx-one/src/app/modules/trainings/trainings-dashboard/trainings-dashboard.component.html`

Replace the "Coming soon" enrolled-trainings placeholder with the real content. The template needs three states:

1. **Loading** — either `enrollments()` or `completedTrainings()` is `undefined`
2. **Both empty** — single centered empty state with CTA
3. **Content** — show ongoing section (if non-empty) and/or completed section (if non-empty)

- [ ] **Step 1: Replace the enrolled-trainings tab section in the template**

Find the current placeholder block (lines 68–77 of the existing template):

```html
<!-- ── TAB: Enrolled Trainings (placeholder) ────────────────────────── -->
@if (activeTab() === 'enrolled-trainings') {
<div class="flex flex-col items-center justify-center py-20 text-center gap-4" data-testid="trainings-empty-state">
  <i class="fa-light fa-book-open text-6xl text-gray-300"></i>
  <div class="flex flex-col gap-2 max-w-md">
    <h2 class="text-lg font-semibold text-gray-700">Coming soon</h2>
    <p class="text-gray-500 text-sm">Enrolled trainings will be available here soon.</p>
  </div>
</div>
}
```

Replace it with:

```html
<!-- ── TAB: Enrolled Trainings ──────────────────────────────────────── -->
@if (activeTab() === 'enrolled-trainings') { @if (enrollments() === undefined || completedTrainings() === undefined) {
<!-- Loading state -->
<div class="flex flex-col gap-4" data-testid="trainings-loading">
  @for (i of [1, 2, 3]; track i) {
  <div class="bg-white rounded-xl border shadow-sm p-5 animate-pulse">
    <div class="flex items-start gap-5">
      <div class="w-14 h-14 bg-gray-200 rounded-xl"></div>
      <div class="flex-1 flex flex-col gap-3">
        <div class="h-4 bg-gray-200 rounded w-1/3"></div>
        <div class="h-3 bg-gray-200 rounded w-2/3"></div>
        <div class="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  </div>
  }
</div>
} @else if (enrollments()!.length === 0 && completedTrainings()!.length === 0) {
<!-- Empty state: both sections empty -->
<div class="flex flex-col items-center justify-center py-20 text-center gap-4" data-testid="trainings-empty-state">
  <i class="fa-light fa-book-open text-6xl text-gray-300"></i>
  <div class="flex flex-col gap-2 max-w-md">
    <h2 class="text-lg font-semibold text-gray-700">No enrolled trainings yet</h2>
    <p class="text-gray-500 text-sm">Browse the Linux Foundation course catalog to start your learning journey.</p>
  </div>
  <lfx-button
    label="Browse Courses →"
    href="https://training.linuxfoundation.org"
    target="_blank"
    rel="noopener noreferrer"
    severity="secondary"
    [outlined]="true"
    data-testid="trainings-empty-cta" />
</div>
} @else {
<!-- Content: show non-empty sections only -->
<div class="flex flex-col gap-8" data-testid="trainings-content">
  @if (enrollments()!.length > 0) {
  <div data-testid="trainings-ongoing-section">
    <h2 class="text-base font-semibold text-gray-800 mb-4">Ongoing trainings</h2>
    <div class="flex flex-col gap-4" data-testid="trainings-ongoing-list">
      @for (enrollment of enrollments()!; track enrollment.id) {
      <lfx-training-card [training]="enrollment" variant="ongoing" data-testid="training-card-item" />
      }
    </div>
  </div>
  } @if (completedTrainings()!.length > 0) {
  <div data-testid="trainings-completed-section">
    <h2 class="text-base font-semibold text-gray-800 mb-4">Completed trainings</h2>
    <div class="flex flex-col gap-4" data-testid="trainings-completed-list">
      @for (cert of completedTrainings()!; track cert.id) {
      <lfx-training-card [training]="cert" variant="completed" data-testid="training-completed-item" />
      }
    </div>
  </div>
  }
</div>
} }
```

- [ ] **Step 2: Verify the build compiles**

```bash
yarn build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Run lint**

```bash
yarn lint 2>&1 | tail -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/lfx-one/src/app/modules/trainings/trainings-dashboard/trainings-dashboard.component.html
git commit --signoff -m "feat(training): implement enrolled trainings tab with ongoing and completed sections"
```

---

## Task 9: Final Validation

- [ ] **Step 1: Full build**

```bash
yarn build 2>&1 | tail -30
```

Expected: successful compilation with no TypeScript or Angular template errors.

- [ ] **Step 2: Full lint**

```bash
yarn lint 2>&1 | tail -30
```

Expected: no lint errors.

- [ ] **Step 3: License header check**

```bash
./check-headers.sh 2>&1 | tail -20
```

Expected: all new files have `// Copyright The Linux Foundation and each contributor to LFX.` and `// SPDX-License-Identifier: MIT` headers (HTML files use `<!-- ... -->`).

- [ ] **Step 4: Format**

```bash
yarn format
```

Then verify no unexpected diffs:

```bash
git diff --stat
```

If any files changed, stage and commit the formatting fix:

```bash
git add -p
git commit --signoff -m "style: apply formatting"
```

- [ ] **Step 5: Manual smoke test**

Start the dev server:

```bash
yarn dev
```

Navigate to `http://localhost:4200/me/training` and verify:

1. Certifications tab loads (filtered to `productType=Certification` — check Network tab)
2. Enrolled Trainings tab shows skeleton loader while fetching, then:
   - If no data: empty state with "No enrolled trainings yet" and "Browse Courses →" CTA
   - If data: "Ongoing trainings" and/or "Completed trainings" sections with cards
3. Each card shows: logo (or book icon fallback), course name, level badge, issuing project, description, date
4. Ongoing cards: "Continue Learning" button links to `https://trainingportal.linuxfoundation.org/learn/dashboard`
5. Completed cards with `downloadUrl`: "Download Certificate" button

---

## Notes for Implementation

- **DBT deploy coordination:** The `USER_COURSE_ENROLLMENTS` table and `PRODUCT_TYPE`/`LEVEL` columns on `USER_CERTIFICATES` must exist in Snowflake before the backend goes live. Ship frontend + backend together with the DBT deploy.
- **`@lfx-one/shared/constants` import path:** Verify this alias resolves correctly in the Angular app by checking `tsconfig.json` path mappings. If the alias doesn't exist, use the full relative path `../../../../../packages/shared/src/constants`.
- **No deduplication:** A course that appears in both `USER_COURSE_ENROLLMENTS` (ongoing) and `USER_CERTIFICATES` (completed) will show in both sections. This is intentional.
- **`level` field on `Certification`** is a new required field — existing `mapRowToCertification` calls must be updated (done in Task 3). The build will fail until Task 3 is complete.
