# Enrolled Trainings Tab — Design Spec

## Overview

Add a functional "Enrolled Trainings" tab to the Training & Certifications page (`/me/training`), replacing the current "Coming soon" placeholder. The tab displays two sections — ongoing enrollments and completed trainings — sourced from two Snowflake tables. Additionally, update the existing Certifications tab to filter by `product_type = 'Certification'` only.

**Design reference:** `https://ui-pr-378.dev.v2.cluster.linuxfound.info/me/training` → Enrolled Trainings tab

**Coordinated deploy:** This feature requires DBT model changes (new `USER_COURSE_ENROLLMENTS` table, `PRODUCT_TYPE` and `LEVEL` columns added to `USER_CERTIFICATES`). Frontend and backend ship together with the DBT deploy.

## Data Sources

### Ongoing Trainings — `ANALYTICS.PLATINUM_LFX_ONE.USER_COURSE_ENROLLMENTS`

New table created by DBT model.

| Column                     | Type      | UI Usage                                            |
| -------------------------- | --------- | --------------------------------------------------- |
| `ENROLLMENT_ID`            | string    | Unique record ID                                    |
| `ENROLLMENT_TS`            | timestamp | "Enrolled" date                                     |
| `USER_NAME`                | string    | User filtering (LFID)                               |
| `LOGO_URL`                 | string    | Course logo                                         |
| `COURSE_NAME`              | string    | Course name                                         |
| `COURSE_GROUP_DESCRIPTION` | string    | Course description                                  |
| `PRODUCT_TYPE`             | string    | Filter: `'Training'` only                           |
| `PROJECT_NAME`             | string    | Issuing project                                     |
| `LEVEL`                    | string    | Difficulty level (e.g., "Beginner", "Intermediate") |

Columns present in table but not used in UI: `USER_ID`, `LEARNER_NAME`, `COURSE_GROUP_ID`, `COURSE_ID`, `INSTRUCTION_TYPE`, `PROJECT_ID`.

### Completed Trainings — `ANALYTICS.PLATINUM_LFX_ONE.USER_CERTIFICATES`

Existing table, updated with new columns: `PRODUCT_TYPE`, `LEVEL`.

Completed trainings are certificates with `PRODUCT_TYPE = 'Training'`. Reuses the existing `Certification` interface with `level` added.

**Key field mapping for completed trainings:**

- Completion date → `ISSUED_TS`
- Download certificate → `DOWNLOAD_URL`
- No enrollment date available (not in this table)

## Shared Package

### New constants in `packages/shared/src/constants/training.constants.ts`

```typescript
export const TRAINING_PRODUCT_TYPE = 'Training' as const;
export const CERTIFICATION_PRODUCT_TYPE = 'Certification' as const;
export type ProductType = typeof TRAINING_PRODUCT_TYPE | typeof CERTIFICATION_PRODUCT_TYPE;

export const CONTINUE_LEARNING_URL = 'https://trainingportal.linuxfoundation.org/learn/dashboard';
```

These constants are used by both frontend (service calls) and backend (Snowflake queries) to avoid inline string literals.

### New interfaces in `packages/shared/src/interfaces/training.interface.ts`

```typescript
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

export interface TrainingEnrollment {
  id: string; // ENROLLMENT_ID
  name: string; // COURSE_NAME
  description: string; // COURSE_GROUP_DESCRIPTION
  imageUrl: string; // LOGO_URL
  issuedBy: string; // PROJECT_NAME
  enrolledDate: string; // ENROLLMENT_TS (ISO string)
  level: string; // LEVEL
}
```

### Updated existing interfaces

- `Certification`: add `level: string`
- `CertificateRow`: add `LEVEL: string`, `PRODUCT_TYPE: string`

## Backend

### New endpoint: `GET /api/training/enrollments`

Returns ongoing training enrollments for the authenticated user.

**Route:** Added to `apps/lfx-one/src/server/routes/training.route.ts`

**Controller method:** `getEnrollments(req, res, next)`

- Extracts username via `getUsernameFromAuth(req)` + `stripAuthPrefix()`
- Throws `AuthenticationError` if no username
- Calls `trainingService.getEnrollments(req, username)`
- Logging: `startOperation` / `success` / `error` lifecycle

**Service method:** `getEnrollments(req, username): Promise<TrainingEnrollment[]>`

```sql
SELECT ENROLLMENT_ID, ENROLLMENT_TS, COURSE_NAME, COURSE_GROUP_DESCRIPTION,
       LOGO_URL, PROJECT_NAME, LEVEL
FROM ANALYTICS.PLATINUM_LFX_ONE.USER_COURSE_ENROLLMENTS
WHERE USER_NAME = ? AND PRODUCT_TYPE = 'Training'
ORDER BY ENROLLMENT_TS DESC
```

Maps rows via `mapRowToEnrollment()`. Returns `[]` on Snowflake failure (graceful degradation).

### Updated endpoint: `GET /api/training/certifications`

Add required `productType` query parameter.

**Controller:** Extracts via `req.query['productType'] ? String(req.query['productType']) : undefined` (matching `events.controller.ts` pattern). Passes to service.

**Service:** Updated signature: `getCertifications(req, username, productType?: string)`

Updated Snowflake query — `LEVEL` added to SELECT, conditional `PRODUCT_TYPE` filter:

```sql
-- When productType is provided:
SELECT _KEY, IDENTIFIER, COURSE_NAME, COURSE_GROUP_DESCRIPTION,
       LOGO_URL, PROJECT_NAME, ISSUED_TS, EXPIRATION_DATE, DOWNLOAD_URL, LEVEL
FROM ANALYTICS.PLATINUM_LFX_ONE.USER_CERTIFICATES
WHERE USER_NAME = ? AND PRODUCT_TYPE = ?
ORDER BY ISSUED_TS DESC

-- When not provided (backwards compat, not used by frontend):
SELECT _KEY, IDENTIFIER, COURSE_NAME, COURSE_GROUP_DESCRIPTION,
       LOGO_URL, PROJECT_NAME, ISSUED_TS, EXPIRATION_DATE, DOWNLOAD_URL, LEVEL
FROM ANALYTICS.PLATINUM_LFX_ONE.USER_CERTIFICATES
WHERE USER_NAME = ?
ORDER BY ISSUED_TS DESC
```

Row mapping updated: `mapRowToCertification` maps `LEVEL` to `level`.

## Frontend

### Frontend Service

Update `apps/lfx-one/src/app/shared/services/training.service.ts`:

```typescript
// New method
public getEnrollments(): Observable<TrainingEnrollment[]> {
  return this.http.get<TrainingEnrollment[]>('/api/training/enrollments')
    .pipe(catchError(() => of([])));
}

// Updated — add optional productType filter using HttpParams
public getCertifications(productType?: string): Observable<Certification[]> {
  let params = new HttpParams();
  if (productType) {
    params = params.set('productType', productType);
  }
  return this.http.get<Certification[]>('/api/training/certifications', { params })
    .pipe(catchError(() => of([])));
}
```

Uses `HttpParams` for query parameter construction (matching `project.service.ts`, `search.service.ts` patterns).

### TrainingsDashboardComponent updates

**New signals (via private init functions per component-organization rules):**

- `enrollments: Signal<TrainingEnrollment[] | undefined>` — from `trainingService.getEnrollments()`
- `completedTrainings: Signal<Certification[] | undefined>` — from `trainingService.getCertifications(TRAINING_PRODUCT_TYPE)`

**Updated signals:**

- `certifications` — now calls `trainingService.getCertifications(CERTIFICATION_PRODUCT_TYPE)`

All three signals initialized eagerly on component init (no lazy loading per tab — tab switching is instant). Uses `toSignal()` without `initialValue` so the signal starts as `undefined`, enabling loading state detection (same pattern as existing `certifications` signal).

**Template for Enrolled Trainings tab:**

```
@if (activeTab() === 'enrolled-trainings') {
  <!-- Loading state if either is still loading -->

  <!-- Ongoing trainings section (hidden if empty) -->
  <h2>Ongoing trainings</h2>
  @for (enrollment of enrollments()) { <lfx-training-card [training]="enrollment" /> }

  <!-- Completed trainings section (hidden if empty) -->
  <h2>Completed trainings</h2>
  @for (cert of completedTrainings()) { <lfx-training-card [training]="cert" variant="completed" /> }

  <!-- Empty state if BOTH are empty -->
}
```

### New Component: TrainingCardComponent

**Location:** `modules/trainings/components/training-card/`

**Inputs (matching `input()` / `input.required()` pattern from `certification-card.component.ts`):**

```typescript
public readonly training = input.required<TrainingEnrollment | Certification>();
public readonly variant = input<'ongoing' | 'completed'>('ongoing');
```

**Card layout:**

- **Left:** 56x56 logo with fallback book icon (fa-light fa-book-open)
- **Right column:**
  - **Row 1:** Course name (h3) + Level badge (pill) + Project name | "Continue Learning" button (ongoing only)
  - **Row 2:** Description (line-clamp-2)
  - **Row 3 (meta, border-top):**
    - Ongoing: Enrolled date only
    - Completed: Completed date (from `issuedDate`) | "Download certificate" button (if `downloadUrl`)

**Computed signals (via private init functions):**

- `hasImage` — whether `imageUrl` is non-empty
- `isOngoing` — derived from `variant() === 'ongoing'`
- `date` — returns `enrolledDate` (ongoing) or `issuedDate` (completed) based on variant
- `dateLabel` — returns `'Enrolled'` or `'Completed'` based on variant

**Level badge styling:**

- Simple inline pill with light background and colored text
- Color varies by level value (e.g., Beginner = blue, Intermediate = purple, Advanced = orange)

**"Continue Learning" button:**

- Links to `CONTINUE_LEARNING_URL` constant (hardcoded for now)
- Opens in new tab

**"Download certificate" button:**

- Links to `downloadUrl` from `Certification` interface
- Opens in new tab
- Only shown when variant is `'completed'` and `downloadUrl` is non-null

## States

**Loading:** 3 skeleton cards per section (same pulse animation pattern as certifications tab).

**Empty states:**

- Both sections empty → single centered empty state: book icon, "No enrolled trainings yet", CTA "Browse Courses →" linking to `https://training.linuxfoundation.org`
- Only ongoing empty → hide "Ongoing trainings" heading, show completed only
- Only completed empty → hide "Completed trainings" heading, show ongoing only

## What's NOT Included

- Course code display — already part of course name, not shown separately
- Duration — not available in data
- Pagination/search/filter — personal enrollment count is small
- Per-course "Continue Learning" URL — hardcoded to training portal dashboard for now
- Deduplication between ongoing and completed — intentional, a course can exist in both
- Rewards tab — remains "Coming soon" placeholder
