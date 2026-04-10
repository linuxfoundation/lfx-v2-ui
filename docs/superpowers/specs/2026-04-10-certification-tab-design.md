# Certification Tab — Design Spec

## Overview

Add a "Certifications" page to the Training & Certifications module (`/me/training`). The page displays the current user's Linux Foundation certifications fetched from a Snowflake analytics table. This is the first tab of a three-tab layout (Certifications, Enrolled Trainings, Rewards) — only the Certifications tab is functional in this iteration.

**Design reference:** `https://ui-pr-378.dev.v2.cluster.linuxfound.info/me/training` (Certification tab only)

## Data Source

**Table:** `ANALYTICS.PLATINUM_LFX_ONE.CERTIFICATES`

| Column | Type | Notes |
|---|---|---|
| `_KEY` | string | Unique record ID |
| `CERTIFICATE_ID` | string | Certificate identifier |
| `USER_ID` | string | Platform ID |
| `USER_NAME` | string | LFID (used for filtering) |
| `ISSUED_TS` | timestamp | Certificate issue timestamp |
| `LEARNER_NAME` | string | Not used in UI |
| `LOGO_URL` | string | Cert logo URL |
| `COURSE_GROUP_ID` | string | Not used in UI |
| `COURSE_ID` | string | Not used in UI |
| `COURSE_NAME` | string | Certification name |
| `CODE` | string | Short code (e.g. "CKA") |
| `COURSE_DESCRIPTION` | string | Description text |
| `DOWNLOAD_URL` | string/null | Certificate download URL |
| `TECHNOLOGIES_LIST` | string | Not used in UI |
| `DID_EXPIRE` | boolean | Not used — status derived from EXPIRATION_DATE |
| `EXPIRATION_DATE` | date/null | null = perpetual (no expiry) |
| `PROJECT_ID` | string | Not used in UI |
| `PROJECT_NAME` | string | Issuing project name |

**User filtering:** `WHERE USER_NAME = ?` using LFID extracted from `req.oidc.user.sub.split('|')[1]` via the existing `getUsernameFromAuth()` helper.

**Status derivation:** `expired` if `EXPIRATION_DATE` is non-null and in the past, `active` otherwise.

## Shared Package

### Updated `Certification` interface

Located at `packages/shared/src/interfaces/training.interface.ts`:

```typescript
type CertificationStatus = 'active' | 'expired';

interface Certification {
  id: string;               // _KEY
  certificateId: string;    // CERTIFICATE_ID
  name: string;             // COURSE_NAME
  code: string;             // CODE
  description: string;      // COURSE_DESCRIPTION
  imageUrl: string;         // LOGO_URL
  issuedBy: string;         // PROJECT_NAME
  issuedDate: string;       // ISSUED_TS (ISO string)
  expiryDate: string | null; // EXPIRATION_DATE (null = perpetual)
  status: CertificationStatus; // Derived from EXPIRATION_DATE
  downloadUrl: string | null; // DOWNLOAD_URL
}
```

Removed from PR #378 interface: `verifyUrl`, `verified`, `topics`, `pending` status.

### FilterPillOption

Already exists in `packages/shared/src/interfaces/dashboard-metric.interface.ts`. No changes needed.

## Backend

### Endpoint

`GET /api/training/certifications`

No query parameters. Returns all certifications for the authenticated user.

**Response:**
```json
{
  "data": [Certification],
  "total": number
}
```

### Three-file pattern

**Route** — `apps/lfx-one/src/server/routes/training.route.ts`
- `router.get('/certifications', ...)` 
- Mounted at `/api/training` in `server.ts`

**Controller** — `apps/lfx-one/src/server/controllers/training.controller.ts`
- Extracts LFID via `getUsernameFromAuth(req)`
- Throws `AuthenticationError` if no username
- Calls `trainingService.getCertifications(req, username)`
- Logging: `startOperation` / `success` / `error` lifecycle

**Service** — `apps/lfx-one/src/server/services/training.service.ts`
- Parameterized Snowflake query:
  ```sql
  SELECT _KEY, CERTIFICATE_ID, COURSE_NAME, CODE, COURSE_DESCRIPTION,
         LOGO_URL, PROJECT_NAME, ISSUED_TS, EXPIRATION_DATE, DOWNLOAD_URL
  FROM ANALYTICS.PLATINUM_LFX_ONE.CERTIFICATES
  WHERE USER_NAME = ?
  ORDER BY ISSUED_TS DESC
  ```
- Maps rows to `Certification[]` interface
- Derives `status` from `EXPIRATION_DATE`: expired if `< now()`, active otherwise
- Graceful degradation: returns `{ data: [], total: 0 }` on Snowflake failure

## Frontend

### Module structure

```
modules/trainings/
├── trainings.routes.ts
├── trainings-dashboard/
│   ├── trainings-dashboard.component.ts
│   └── trainings-dashboard.component.html
├── components/
│   └── certification-card/
│       ├── certification-card.component.ts
│       └── certification-card.component.html
└── training.service.ts
```

### Route registration

In `app.routes.ts`:
```typescript
{
  path: 'me/training',
  loadChildren: () => import('./modules/trainings/trainings.routes').then(m => m.TRAINING_ROUTES),
}
```

Sidebar entry already exists on main (`main-layout.component.ts:109`) — no changes needed.

### TrainingService (frontend)

`@Injectable({ providedIn: 'root' })` with `inject(HttpClient)`.

- `getCertifications(): Observable<{ data: Certification[], total: number }>`
- GET request to `/api/training/certifications`
- `catchError(() => of({ data: [], total: 0 }))` for graceful degradation

### TrainingsDashboardComponent

**Layout:** Two-column — main content (flex-1) + right sidebar (w-64, border-left).

**Tab switcher:** Three `FilterPill` buttons — Certifications (functional), Enrolled Trainings, Rewards (show empty/placeholder state).

**Certifications tab content:**
- Count label: "N certifications" / "1 certification"
- Certification card list (`@for` loop)
- Empty state: graduation cap icon, "No certifications yet" message, CTA button linking to `https://training.linuxfoundation.org`

**Right sidebar:** "Useful links" section with:
- LF Training Portal (`https://trainingportal.linuxfoundation.org`)
- LF Education & Certification (`https://training.linuxfoundation.org`)

**Signals:**
- `activeTab = signal<string>('certifications')`
- `certifications` — loaded via `toSignal()` from `trainingService.getCertifications()`
- `loading` — derived from signal state

### CertificationCardComponent

**Input:** `cert = input.required<Certification>()`

**Layout (per design):**
- Left: 56x56 logo/image with fallback icon
- Right column:
  - Row 1: Name (h3, 15px semibold) + issuer (xs gray) | "Expired" badge (red, top-right) when expired
  - Row 2: Description (sm gray, line-clamp-2)
  - Row 3 (border-top separator): Date Earned | Valid Until | Credential ID | "Download" button

**Valid Until color logic:**
- Red: expired (`expiryDate` in the past)
- Amber: expiring within 90 days
- Gray: otherwise
- "No Expiry" text when `expiryDate` is null

**Download button:** Only shown when `downloadUrl` is non-null. Opens in new tab.

## What is NOT included

- Verify button / Verified badge — dropped, not in Snowflake
- Pagination — personal cert count is small
- Search/filter within certifications
- Enrolled Trainings tab functionality
- Rewards tab functionality
- Topics/technologies display
- Sidebar label changes (stays "Trainings & Certs" as on main)
