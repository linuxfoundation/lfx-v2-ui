# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📋 Table of Contents

### 🏗 Architecture & Setup

- [Project Overview](#project-overview) - Turborepo monorepo with Angular 20 SSR
- [Monorepo Structure](#monorepo-structure) - Apps, packages, and organization
- [Application Architecture](#application-architecture) - Directory structure and patterns
- [Common Commands](#common-commands) - Development and production commands

### 🚀 Development Patterns

- [Angular Patterns](docs/architecture/frontend/angular-patterns.md) - Zoneless change detection, signals, components
- [Full-Stack Feature Pattern](#full-stack-feature-pattern) - How every feature is built: route → controller → service → proxy
- [Angular Service Pattern](#angular-service-pattern) - Injectable services, signals, Observable returns, error handling
- [Component Organization Pattern](#component-organization-pattern) - Standardized component structure
- [Feature Modules](#feature-modules) - 9 application feature modules
- [Shared Package (@lfx-one/shared)](#shared-package-lfx-oneshared) - Types, interfaces, constants
- [Shared Package Utilities](#shared-package-utilities) - Generic utility modules
- [Shared Package Validators](#shared-package-validators) - Form validators
- [PrimeNG Component Wrappers](#primeng-component-wrappers) - UI library abstraction
- [Path Mappings](#path-mappings) - Import aliases and conventions

### 🎨 UI & Layout

- [CSS Architecture & Styling](#css-architecture--styling) - Tailwind, fonts, theming

### 🔧 Technical Stack

- [Frontend Technologies](#frontend-technologies) - Angular 20, PrimeNG, Tailwind
- [Backend Stack](#backend-stack) - Express.js server with SSR
- [Development Tools](#development-tools) - ESLint, Prettier, Turborepo
- [Code Quality](#code-quality) - Linting and formatting standards

### 🚀 Operations

- [Authentication & Authorization](#authentication--authorization) - Auth0 integration
- [Logging](#logging) - Pino structured logging
- [Server-Side Rendering (SSR)](#server-side-rendering-ssr) - Angular 20 built-in SSR
- [Production Deployment](#production-deployment) - PM2, health checks
- [Testing](#testing) - Test framework and commands
- [Environment Configuration](#environment-configuration) - Dev/prod setup

### 📚 Documentation Links

- [Component Architecture](docs/architecture/frontend/component-architecture.md) - Detailed wrapper patterns
- [Angular Patterns](docs/architecture/frontend/angular-patterns.md) - Angular 20 development
- [Styling System](docs/architecture/frontend/styling-system.md) - CSS and theming
- [Authentication](docs/architecture/backend/authentication.md) - Auth0 setup
- [SSR Server](docs/architecture/backend/ssr-server.md) - Server-side rendering
- [Logging & Monitoring](docs/architecture/backend/logging-monitoring.md) - Structured logging
- [E2E Testing](docs/architecture/testing/e2e-testing.md) - Comprehensive end-to-end testing with dual architecture
- [Testing Best Practices](docs/architecture/testing/testing-best-practices.md) - Testing patterns and implementation guide

### 🧪 Testing & Local Dev

- [Mock Data & Local Development Pattern](#mock-data--local-development-pattern) - Playwright-only mocking, no server-side fallbacks
- [Anti-Patterns](#anti-patterns) - Things we never do in this codebase

### 💡 Quick Reference

- [Application Flow](#application-flow) - User journey and navigation
- [Current State & Development Roadmap](#current-state--development-roadmap) - Implementation status
- [Development Memories](#development-memories) - Important reminders and patterns

## Project Overview

LFX One is a Turborepo monorepo containing an Angular 20 SSR application with stable zoneless change detection and Express.js server.

## Monorepo Structure

```text
lfx-v2-ui/
├── apps/
│   └── lfx-one/              # Angular 20 SSR application with stable zoneless change detection
│       ├── src/app/
│       │   ├── layouts/      # Layout components
│       │   ├── modules/      # 9 Feature modules (see Feature Modules section)
│       │   └── shared/       # Shared application code
│       │       ├── components/   # 46 UI components
│       │       ├── pipes/        # 34 custom pipes
│       │       └── services/     # 20 services
│       ├── eslint.config.mjs # Angular-specific ESLint rules
│       ├── .prettierrc       # Prettier configuration with Tailwind integration
│       └── tailwind.config.js # Tailwind with PrimeUI plugin and LFX colors
├── packages/
│   └── shared/               # Shared types, interfaces, constants, utilities, and validators
│       ├── src/
│       │   ├── interfaces/   # TypeScript interfaces for components, auth, projects
│       │   ├── constants/    # Design tokens (colors, font-sizes)
│       │   ├── enums/        # Shared enumerations
│       │   ├── utils/        # 12 utility modules (date, string, url, etc.)
│       │   └── validators/   # 3 form validators (meeting, mailing-list, vote)
│       ├── package.json      # Package configuration with proper exports
│       └── tsconfig.json     # TypeScript configuration
├── docs/                     # Architecture and deployment documentation
├── turbo.json               # Turborepo pipeline configuration
└── package.json             # Root workspace configuration
```

[... rest of the existing content remains unchanged ...]

## Full-Stack Feature Pattern

Every feature follows the same four-layer chain. **Never skip a layer or combine them.**

```
HTTP request
    │
    ▼
Route file          (/src/server/routes/foo.route.ts)
    │  thin — only registers controller methods on Express Router
    ▼
Controller          (/src/server/controllers/foo.controller.ts)
    │  HTTP boundary — logging, validation, response format
    ▼
Service             (/src/server/services/foo.service.ts)
    │  business logic — data transformation, enrichment, orchestration
    ▼
MicroserviceProxyService
    │  network — forwards to LFX_V2_SERVICE with auth token
    ▼
LFX V2 backend      (http://lfx-api.k8s.orb.local by default)
```

### Route File

Thin — only creates a Router, instantiates one controller, and wires methods. No logic.

```typescript
// src/server/routes/votes.route.ts
import { Router } from 'express';
import { VoteController } from '../controllers/vote.controller';

const router = Router();
const voteController = new VoteController();

// GET /api/votes
router.get('/', (req, res, next) => voteController.getVotes(req, res, next));
// GET /api/votes/:uid
router.get('/:uid', (req, res, next) => voteController.getVoteById(req, res, next));
// POST /api/votes
router.post('/', (req, res, next) => voteController.createVote(req, res, next));
// PUT /api/votes/:uid
router.put('/:uid', (req, res, next) => voteController.updateVote(req, res, next));
// DELETE /api/votes/:uid
router.delete('/:uid', (req, res, next) => voteController.deleteVote(req, res, next));

export default router;
```

### Controller

HTTP boundary only. Logs the operation, calls the service, responds. **Always** delegates errors to `next(error)`.

```typescript
// src/server/controllers/vote.controller.ts
export class VoteController {
  // Services instantiated as class properties — NOT in constructor
  private voteService: VoteService = new VoteService();

  public async getVotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'get_votes', {
      query_params: logger.sanitize(req.query as Record<string, any>),
    });

    try {
      const { data, page_token } = await this.voteService.getVotes(req, req.query as Record<string, any>);

      logger.success(req, 'get_votes', startTime, {
        vote_count: data.length,
        has_more_pages: !!page_token,
      });

      res.json({ data, page_token });       // always res.json(), never res.send()
    } catch (error) {
      next(error);                           // always next(error), never inline handling
    }
  }
}
```

Rules:
- `logger.startOperation()` first thing, `logger.success()` before `res.json()`
- List responses: `res.json({ data, page_token })`
- Single resource: `res.json(resource)`
- Create: `res.status(201).json(resource)`
- Delete: `res.status(204).send()`
- **Never** catch and re-handle — always `next(error)`

### Service

Business logic layer. First parameter is always `req: Request` (for logging correlation).

```typescript
// src/server/services/vote.service.ts
export class VoteService {
  // Dependencies instantiated in constructor
  private microserviceProxy: MicroserviceProxyService;

  public constructor() {
    this.microserviceProxy = new MicroserviceProxyService();
  }

  /**
   * Fetches all votes with pagination support.
   * @param req - Express request (for auth + logging)
   * @param query - Query parameters for filtering/pagination
   */
  public async getVotes(req: Request, query: Record<string, any> = {}): Promise<PaginatedResponse<Vote>> {
    logger.debug(req, 'get_votes', 'Starting vote fetch', { query_params: Object.keys(query) });

    const { resources, page_token } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<Vote>>(
      req,
      'LFX_V2_SERVICE',
      '/query/resources',
      'GET',
      { ...query, type: 'vote' }
    );

    return { data: resources.map(r => r.data), page_token };
  }

  // Use Promise.all() for independent parallel fetches
  public async getVoteWithDetails(req: Request, uid: string): Promise<VoteDetail> {
    logger.debug(req, 'get_vote_with_details', 'Fetching vote and comments', { uid });

    const [vote, comments] = await Promise.all([
      this.microserviceProxy.proxyRequest<Vote>(req, 'LFX_V2_SERVICE', `/itx/votes/${uid}`),
      this.microserviceProxy.proxyRequest<Comment[]>(req, 'LFX_V2_SERVICE', `/itx/votes/${uid}/comments`),
    ]);

    return { ...vote, comments };
  }

  // Graceful degradation — return null/[] on failure, log as warning
  private async enrichWithProject(req: Request, vote: Vote): Promise<Vote> {
    try {
      const project = await this.projectService.getProject(req, vote.project_uid);
      return { ...vote, project_name: project.name };
    } catch {
      logger.warning(req, 'enrich_with_project', 'Could not enrich vote with project, proceeding without', {
        vote_uid: vote.uid,
      });
      return vote;
    }
  }
}
```

Rules:
- Constructor instantiates all dependencies (`new ServiceName()`)
- `logger.debug()` at the start of every public method
- `logger.info()` for significant transformations or enrichments
- `logger.warning()` when returning a fallback (null / empty array) due to error
- Private methods for data transformation / enrichment
- `Promise.all()` for independent parallel operations (comment why they're independent)

### MicroserviceProxyService Call Signatures

```typescript
// GET — most common
const data = await this.microserviceProxy.proxyRequest<MyType>(req, 'LFX_V2_SERVICE', '/path');

// GET with query params
const data = await this.microserviceProxy.proxyRequest<MyType>(req, 'LFX_V2_SERVICE', '/path', 'GET', queryParams);

// POST / PUT / DELETE with body
const data = await this.microserviceProxy.proxyRequest<MyType>(req, 'LFX_V2_SERVICE', '/path', 'POST', undefined, body);

// Query service (list endpoints)
const { resources, page_token } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<MyType>>(
  req, 'LFX_V2_SERVICE', '/query/resources', 'GET', { type: 'my-type', ...query }
);
```

### Registering a New Route in server.ts

```typescript
// server.ts — add after the other route imports
import myRouter from './routes/my-feature.route';

// Add after the other app.use() route registrations
app.use('/api/my-feature', myRouter);
```

## Angular Service Pattern

Angular services that call server endpoints follow a strict, consistent pattern.

```typescript
// src/app/shared/services/vote.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';
import { Vote, CreateVoteRequest } from '@lfx-one/shared/interfaces';

@Injectable({
  providedIn: 'root',   // always 'root' for singleton
})
export class VoteService {
  private readonly http = inject(HttpClient);   // inject() not constructor param

  /**
   * Get all votes for the current user.
   * @returns Observable of paginated vote response
   */
  public getVotes(): Observable<{ data: Vote[]; page_token?: string }> {
    return this.http.get<{ data: Vote[]; page_token?: string }>('/api/votes').pipe(
      catchError(() => of({ data: [] }))       // always catchError with typed default
    );
  }

  /**
   * Get a single vote by UID.
   */
  public getVoteById(uid: string): Observable<Vote | null> {
    return this.http.get<Vote>(`/api/votes/${uid}`).pipe(
      catchError(() => of(null))
    );
  }

  /**
   * Create a new vote.
   */
  public createVote(payload: CreateVoteRequest): Observable<Vote | null> {
    return this.http.post<Vote>('/api/votes', payload).pipe(
      catchError(() => of(null))
    );
  }
}
```

Rules:
- `@Injectable({ providedIn: 'root' })` — always
- `inject()` function, never constructor parameter injection
- All public methods return `Observable<T>` — never subscribe internally
- Every observable has `.pipe(catchError(() => of(defaultValue)))` — never let errors propagate raw
- Default fallback matches the type exactly (`of([])` for arrays, `of(null)` for single resources)
- Full JSDoc on every public method

## Component Organization Pattern

When creating Angular components with signals and computed values, follow this structure:

### 1. WritableSignals - Initialize directly for simple values

Simple WritableSignals with basic initial values should be initialized inline:

```typescript
export class MyComponent {
  // Simple WritableSignals - initialize directly
  public loading = signal(false);
  public count = signal(0);
  public name = signal('');
  public items = signal<string[]>([]);
}
```

### 2. Model Signals - Use for two-way binding

For properties that require two-way binding (e.g., dialog visibility, form values), use `model()` instead of `signal()`:

```typescript
import { model } from '@angular/core';

export class MyComponent {
  // Two-way binding properties - use model()
  public visible = model(false);
  public selectedValue = model<string>('');
}
```

In templates, model signals can use the `[(ngModel)]`-style two-way binding syntax:

```html
<!-- Two-way binding with model() - cleaner syntax -->
<p-dialog [(visible)]="visible">...</p-dialog>

<!-- Regular signals would require split binding -->
<p-dialog [visible]="visible()" (visibleChange)="visible.set($event)">...</p-dialog>
```

### 3. Computed/toSignal - Use private init functions for complex logic

Computed signals and toSignal conversions with complex logic should use private initializer functions:

```typescript
export class MyComponent {
  // Simple WritableSignals - direct initialization
  public loading = signal(false);
  public searchTerm = signal('');

  // Complex computed/toSignal - use private init functions
  public filteredItems: Signal<Item[]> = this.initFilteredItems();
  public dataFromServer: Signal<Data[]> = this.initDataFromServer();

  // Private initializer functions at the bottom of the class
  private initFilteredItems(): Signal<Item[]> {
    return computed(() => {
      const term = this.searchTerm().toLowerCase();
      return this.items().filter((item) => item.name.toLowerCase().includes(term));
    });
  }

  private initDataFromServer(): Signal<Data[]> {
    return toSignal(
      toObservable(this.event).pipe(
        filter((event) => !!event?.id),
        switchMap((event) => this.service.getData(event.id)),
        catchError(() => of([] as Data[]))
      ),
      { initialValue: [] as Data[] }
    );
  }
}
```

### 4. Component structure order

1. Private injections (with `readonly`)
2. Public fields from inputs/dialog data (with `readonly`)
3. Forms
4. Model signals for two-way binding (`model()`)
5. Simple WritableSignals (direct initialization)
6. Complex computed/toSignal signals (via private init functions)
7. Constructor
8. Public methods
9. Protected methods
10. Private initializer functions (grouped together)
11. Other private helper methods

### 5. Interfaces belong in the shared package

All interfaces, even component-specific ones, should be defined in `@lfx-one/shared/interfaces`. This ensures:

- Consistent type definitions across the codebase
- Reusability if the interface is needed elsewhere later
- Clear separation of type definitions from implementation

```typescript
// ❌ Don't define interfaces locally in components
interface RelativeDateInfo {
  text: string;
  color: string;
}

// ✅ Import from shared package
import { RelativeDateInfo } from '@lfx-one/shared/interfaces';
```

## Feature Modules

The application is organized into 9 feature modules under `apps/lfx-one/src/app/modules/`:

| Module            | Description                                                                      |
| ----------------- | -------------------------------------------------------------------------------- |
| **committees**    | Committee management - view, create, and manage project committees               |
| **dashboards**    | Role-based dashboards - personalized views for different user roles              |
| **mailing-lists** | Mailing list management - subscribe, unsubscribe, and manage lists               |
| **meetings**      | Meeting scheduling - create, manage, and join meetings with calendar integration |
| **my-activity**   | User activity tracking - personal activity history and notifications             |
| **profile**       | User profile - profile management and account settings                           |
| **settings**      | Application settings - preferences and configuration                             |
| **surveys**       | Survey management - create surveys, collect responses, view NPS analytics        |
| **votes**         | Voting system - create polls, cast votes, and view results                       |

## Shared Package Utilities

The shared package (`@lfx-one/shared`) provides utility modules in `packages/shared/src/utils/`:

**Generic Utilities:**

- `date-time.utils.ts` - Date formatting, timezone handling (`formatDate`, `formatTime`, `getRelativeDate`)
- `string.utils.ts` - String manipulation (`parseToInt`, `truncate`)
- `url.utils.ts` - URL parsing and construction (`buildUrl`, `parseQueryParams`)
- `file.utils.ts` - File type detection (`getFileType`, `getFileExtension`)
- `form.utils.ts` - Form helpers (`markFormControlsAsTouched`)
- `html-utils.ts` - HTML sanitization (`stripHtml`)

**Usage:**

```typescript
import { formatDate, getRelativeDate } from '@lfx-one/shared/utils';
import { buildUrl, parseQueryParams } from '@lfx-one/shared/utils';
```

> **Note**: Domain-specific utilities (meetings, surveys, polls, etc.) are also available. See [Package Architecture docs](docs/architecture/shared/package-architecture.md) for complete documentation.

## Shared Package Validators

The shared package provides form validators in `packages/shared/src/validators/`. Import and use them in Angular reactive forms as needed.

> **Note**: See [Package Architecture docs](docs/architecture/shared/package-architecture.md) for validator details and usage examples.

## Development Memories

- Always reference PrimeNG's component interface when trying to define types
- The project logo display is currently hardcoded but will be dynamic once API is integrated
- Metrics data is hardcoded but structured to match future API responses
- All PrimeNG components are wrapped in LFX components for UI library independence
- Always use direct imports for standalone components - no barrel exports
- **Authentication uses selective pattern** - public routes bypass auth, protected routes require authentication
- **Public routes include** `/meeting` and `/public/api` endpoints
- **M2M tokens are used** for server-side API calls from public endpoints
- **Protected routes middleware** handles selective authentication logic
- **Custom login handler** at `/login` with URL validation and secure redirects
- Authentication is handled by Auth0/Authelia with express-openid-connect middleware

## Logging System

### Architecture Overview

- **Base Logger**: `serverLogger` created in `server.ts` - base Pino instance with all configuration
- **HTTP Logger**: `pinoHttp` middleware uses `serverLogger` as base, creates `req.log` for each request
- **Logger Service**: Singleton service (`logger.service.ts`) - unified interface for all application logging
- **Format**: Structured JSON logs with Pino for AWS CloudWatch compatibility

### Logger Service Pattern (Primary Interface)

**Import and Usage:**

```typescript
import { logger } from './logger.service';

// In controllers/routes with request context:
const startTime = logger.startOperation(req, 'operation_name', metadata);
logger.success(req, 'operation_name', startTime, metadata);

// In services/utilities without request context:
const startTime = logger.startOperation(undefined, 'nats_connect', metadata);
logger.success(undefined, 'nats_connect', startTime, metadata);
```

**Available Methods:**

- `logger.startOperation(req|undefined, 'operation', metadata, options?)` → Returns startTime, logs at INFO (silent option available)
- `logger.success(req|undefined, 'operation', startTime, metadata)` → Logs at INFO with duration
- `logger.error(req|undefined, 'operation', startTime, error, metadata, options?)` → Logs at ERROR with 'err' field
- `logger.info(req|undefined, 'operation', message, metadata)` → Logs at INFO for significant operations
- `logger.warning(req|undefined, 'operation', message, metadata)` → Logs at WARN
- `logger.validation(req|undefined, 'operation', errors[], metadata)` → Logs at ERROR with validation details
- `logger.debug(req|undefined, 'operation', message, metadata)` → Logs at DEBUG
- `logger.etag(req|undefined, 'operation', resourceType, resourceId, etag?, metadata)` → Logs ETag operations

**When to Use Each Pattern:**

- **Request-scoped** (pass `req`): Controllers, route handlers, service methods called from routes
- **Infrastructure** (pass `undefined`): NATS connections, Snowflake pool, server startup/shutdown, scheduled jobs

### Logging Layer Responsibility

**Controllers (HTTP Boundary):**

- ✅ **Always** use `logger.startOperation()` / `logger.success()` / `logger.error()` for HTTP operations
- Operation names should match HTTP semantics (e.g., `get_meeting_rsvps`, `create_meeting`)
- Duration represents full HTTP request → response cycle
- One startOperation per HTTP endpoint

**Services (Business Logic):**

- ✅ **Always** use `logger.debug()` for step-by-step tracing
- ✅ Use `logger.info()` for significant business operations visible in production:
  - Data transformations (V1→V2 conversions)
  - Data enrichment (adding project names, committee data)
  - Complex multi-step orchestrations
  - Operations with notable business impact
- ✅ Use `logger.warning()` for recoverable errors when returning null/empty arrays
- ❌ **Never** use `logger.startOperation()` with the same operation name as the calling controller
- ❌ **Never** call `serverLogger` directly

**Why This Pattern:**

- Prevents duplicate logging (no double startOperation calls)
- Clear separation: Controllers log HTTP, Services log business logic
- Production visibility: INFO logs for significant operations, DEBUG for detailed tracing
- Consistent duration semantics: HTTP duration in controllers, not inflated by double-counting

### Error Logging Standard

**Always use `err` field** for proper error serialization:

```typescript
// ✅ CORRECT
logger.error(req, 'operation', startTime, error, metadata);
logger.error(undefined, 'operation', startTime, error, metadata);

// ❌ INCORRECT
serverLogger.error({ error: error.message }, 'message'); // Don't use serverLogger directly
req.log.error({ error: error }, 'message'); // Should use logger service
{
  error: error.message;
} // Loses stack trace
```

**Benefits:**

- Complete stack traces in production/debug
- Clean single-line errors in development
- Proper AWS CloudWatch format
- Custom serializer: `/server/helpers/error-serializer.ts`

### Log Level Guidelines

**INFO** - Business operation completions and significant operations:

- **In Controllers**: HTTP operation success with duration (via `startOperation` / `success`)
- **In Services**: Significant business operations visible in production (via `logger.info()`):
  - Data transformations (V1→V2 conversions)
  - Data enrichment (project names, committee data)
  - Complex orchestrations
  - Operations with notable business impact

**WARN** - Recoverable issues:

- Error conditions with graceful degradation (returning null/empty arrays)
- Data quality issues, user not found
- Fallback behaviors, NATS failures with graceful handling
- Service errors that don't propagate to controller

**DEBUG** - Internal operations and tracing:

- **In Services**: Step-by-step operation tracing
- Method entry/exit with key parameters
- Preparation steps (sanitizing, creating payload)
- Internal lookups (NATS, database queries)
- Simple data fetches
- Infrastructure operations (connections, pool state)

**ERROR** - Critical failures:

- **In Controllers**: HTTP operation failures (via `logger.error()` with startTime)
- System failures, unhandled exceptions
- Critical errors requiring immediate attention
- Operations that cannot continue

### Features

- **Deduplication**: Prevents duplicate logs for same operation (request-scoped only)
- **Duration Tracking**: Automatic calculation from startTime to completion
- **Request Correlation**: `request_id` field for tracing (when req provided)
- **Sensitive Data Redaction**: Automatic redaction of tokens, auth headers, cookies
- **AWS Trace ID**: Automatic capture from Lambda environment
- **Filtered URLs**: Health checks (`/health`, `/api/health`) and `/.well-known` not logged

### Logging Architecture

```text
server-logger.ts (breaks circular dependency)
  └─ Creates and exports serverLogger (base Pino instance)
      └─ Configuration: levels, serializers, formatters, redaction

server.ts
  ├─ Imports serverLogger from server-logger.ts
  └─ Creates httpLogger (pinoHttp middleware)
      └─ Uses serverLogger as base
      └─ Attaches req.log to each request

logger.service.ts
  ├─ Imports serverLogger from server-logger.ts
  └─ Singleton logger service
      ├─ Request-scoped: uses req.log when req provided
      ├─ Infrastructure: uses serverLogger when req = undefined
      └─ Provides unified API for all logging
```

**Direct serverLogger Usage:**

- ❌ **Never** call `serverLogger` directly from services/routes/controllers
- ✅ **Always** use `logger` service methods
- ℹ️ `serverLogger` only exists in `server-logger.ts` (created), `server.ts` (imported), and `logger.service.ts` (imported)

### Common Logging Patterns

**Controller/Route Handler Pattern:**

```typescript
export const getUser = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = logger.startOperation(req, 'get_user', { userId: req.params.id });

  try {
    const user = await userService.getUserById(req, req.params.id);

    logger.success(req, 'get_user', startTime, { userId: user.id });
    return res.json(user);
  } catch (error) {
    logger.error(req, 'get_user', startTime, error, { userId: req.params.id });
    return next(error);
  }
};
```

**Service Method - Simple (DEBUG only):**

```typescript
public async getUserById(req: Request, userId: string): Promise<User> {
  logger.debug(req, 'get_user_by_id', 'Fetching user from database', { userId });

  const user = await this.database.findUser(userId);

  return user;
}
```

**Service Method - Complex (INFO + DEBUG):**

```typescript
public async getMeetings(req: Request, query: QueryParams): Promise<Meeting[]> {
  logger.debug(req, 'get_meetings', 'Starting meeting fetch', { query });

  const { resources } = await this.microserviceProxy.proxyRequest(...);

  logger.debug(req, 'get_meetings', 'Fetched resources', { count: resources.length });

  // Significant transformation - use INFO level for production visibility
  if (isV1) {
    logger.info(req, 'transform_v1_meetings', 'Transforming V1 meetings to V2 format', {
      count: resources.length,
    });
    meetings = meetings.map(transformV1MeetingToV2);
  }

  // Enrichment step - DEBUG for tracing
  logger.debug(req, 'get_meetings', 'Enriching with project names', { count: meetings.length });
  meetings = await this.enrichWithProjects(req, meetings);

  // Significant enrichment - use INFO level
  if (meetings.some((m) => m.committees?.length > 0)) {
    logger.info(req, 'enrich_committees', 'Enriching meetings with committee data', {
      total_meetings: meetings.length,
    });
    meetings = await this.getMeetingCommittees(req, meetings);
  }

  logger.debug(req, 'get_meetings', 'Completed meeting fetch', { final_count: meetings.length });

  return meetings;
}
```

**Service Method - Graceful Error Handling:**

```typescript
public async getPastMeetingRecording(req: Request, meetingUid: string): Promise<Recording | null> {
  logger.debug(req, 'get_past_meeting_recording', 'Fetching recording', { meeting_uid: meetingUid });

  try {
    const { resources } = await this.microserviceProxy.proxyRequest(...);

    if (!resources || resources.length === 0) {
      logger.warning(req, 'get_past_meeting_recording', 'No recording found', {
        meeting_uid: meetingUid,
      });
      return null;
    }

    return resources[0].data;
  } catch (error) {
    logger.warning(req, 'get_past_meeting_recording', 'Failed to fetch recording, returning null', {
      meeting_uid: meetingUid,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}
```

**Infrastructure Operation (No Request Context):**

```typescript
public async connect(): Promise<void> {
  const startTime = logger.startOperation(undefined, 'db_connect', { host: this.config.host });

  try {
    await this.pool.connect();
    logger.success(undefined, 'db_connect', startTime, { poolSize: this.pool.size });
  } catch (error) {
    logger.error(undefined, 'db_connect', startTime, error, { host: this.config.host });
    throw error;
  }
}
```

**Internal Service Operation (Called from method with req):**

```typescript
// Parent method has req
public async getProjectBySlug(req: Request, slug: string): Promise<Project> {
  return this.fetchFromNats(req, slug); // Pass req down
}

// Internal method receives req for logging correlation
private async fetchFromNats(req: Request, slug: string): Promise<Project> {
  logger.debug(req, 'fetch_from_nats', 'Fetching project from NATS', { slug });
  // ... implementation
}
```

### Logging Checklist

**Before logging:**

- [ ] Using `logger` service, not `serverLogger` directly?
- [ ] Passing `req` if available, `undefined` if infrastructure?
- [ ] Using `err` field for errors (not `error`)?
- [ ] Appropriate log level (INFO/WARN/DEBUG/ERROR)?
- [ ] Operation name in snake_case?
- [ ] Sensitive data sanitized?

**For Controllers:**

- [ ] Using `logger.startOperation()` for HTTP operations?
- [ ] Calling `logger.success()` or `logger.error()` with `startTime`?
- [ ] Not duplicating service-level logging?

**For Services:**

- [ ] Using `logger.debug()` for step-by-step tracing?
- [ ] Using `logger.info()` for significant operations (transformations, enrichments)?
- [ ] Using `logger.warning()` for graceful error handling (returning null/empty)?
- [ ] NOT using `logger.startOperation()` if controller already logs the same operation?
- [ ] Passing relevant metadata for debugging?
- All shared types, interfaces, and constants are centralized in @lfx-one/shared package
- **AI Service Integration**: Claude Sonnet 4 model via LiteLLM proxy for meeting agenda generation
- **AI Environment Variables**: AI_PROXY_URL and AI_API_KEY required for AI functionality
- **M2M Environment Variables**: M2M_AUTH_CLIENT_ID, M2M_AUTH_CLIENT_SECRET for machine-to-machine auth
- Use TypeScript interfaces instead of union types for better maintainability
- Shared package uses direct source imports during development for hot reloading
- **Interfaces go into the shared packages**
- **License headers are required on all source files** - run `./check-headers.sh` to verify
- **Pre-commit hooks enforce license headers** - commits will fail without proper headers
- Always run yarn format from the root of the project to ensure formatting is done after you have made all your changes
- Always prepend "Generated with [Claude Code](https://claude.ai/code)" if you assisted with the code
- Do not nest ternary expressions
- Always run yarn lint before yarn build to validate your linting
- The JIRA project key for this is LFXV2. All tickets associated to this repo should generally be in there.
- **E2E tests use dual architecture** - both content-based (_.spec.ts) and structural (_-robust.spec.ts) tests
- **Always add data-testid attributes** when creating new components for reliable test targeting
- **Run yarn e2e before major changes** to ensure all 85+ tests pass consistently
- **Use data-testid naming convention** - `[section]-[component]-[element]` for hierarchical structure
- **Test responsive behavior** - validate mobile, tablet, and desktop viewports appropriately
- When running tests to validate UI tests, use reporter=list
- Follow Angular commit conventions: `type(scope): description`
- Valid types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
- Scope should be lowercase and describe the affected area (e.g., auth, ui, api, docs) and follow the angular scope conventions
- Use present tense, imperative mood: "add feature" not "added feature"
- Examples:
  - `feat(auth): add OAuth2 integration`
  - `fix(ui): resolve mobile button alignment`
- All commits and pull requests need to be associated to a JIRA ticket. If there isn't one, we need to create it and reference it moving forward.
- Branch names should be following the commit types (feat,fix,docs, etc) followed by the JIRA ticket number. i.e; feat/LFXV2-123 or ci/LFXV2-456
- PR titles must also follow a similar format as conventional commits - `type(scope): description`. The scope has to follow the angular config for conventional commit and not include the JIRA ticket in the title, and everything should be in lowercase.
- All interfaces, reusable constants, and enums should live in the shared package.

## Mock Data & Local Development Pattern

**Rule: Server routes are always pure proxies. Never add mock data or upstream-fallback logic to the Express server.**

### Architecture

The codebase separates concerns strictly:

| Layer | Role | Where |
|---|---|---|
| **Express server** | Proxy only — forwards requests to `LFX_V2_SERVICE` via `MicroserviceProxyService` | `src/server/routes/`, `src/server/controllers/`, `src/server/services/` |
| **E2E mock data** | Fixture objects returned by Playwright's `page.route()` interceptors | `apps/lfx-one/e2e/fixtures/mock-data/` |
| **E2E interceptors** | `page.route()` helpers that intercept HTTP at the network level during tests | `apps/lfx-one/e2e/helpers/api-mock.helper.ts` |
| **Dev toolbar** | Client-side persona / account / project context switching | `src/app/layouts/dev-toolbar/` |

### ❌ Never Do This

```typescript
// ❌ DO NOT add mock middleware or fallback logic to the Express server
if (process.env['NODE_ENV'] !== 'production') {
  app.use(createDevMockRouter()); // Wrong — violates the proxy-only rule
}

// ❌ DO NOT add upstream-reachability probes or in-memory stores to server code
async function isUpstreamReachable(): Promise<boolean> { ... } // Wrong
const MOCK_DATA = new Map<string, MyType[]>(); // Wrong
```

### ✅ Correct Pattern: Playwright `page.route()` for Test Mocking

When you need mock data for local development or e2e tests, intercept at the **Playwright network layer**, not the server.

**Step 1 — Define fixtures in `e2e/fixtures/mock-data/`:**

```typescript
// apps/lfx-one/e2e/fixtures/mock-data/committees.mock.ts
import { CommitteeMember } from '@lfx-one/shared/interfaces';
import { CommitteeMemberStatus } from '@lfx-one/shared/enums';

export const mockCommitteeMembers: CommitteeMember[] = [
  {
    uid: 'mock-member-001',
    committee_uid: 'mock-committee-001',
    committee_name: 'Technical Advisory Council',
    email: 'alice@example.org',
    first_name: 'Alice',
    last_name: 'Smith',
    status: CommitteeMemberStatus.ACTIVE,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];
```

**Step 2 — Intercept using `page.route()` in a helper or directly in the test:**

```typescript
// apps/lfx-one/e2e/helpers/api-mock.helper.ts  (extend the existing class)
import { mockCommitteeMembers } from '../fixtures/mock-data/committees.mock';

export class ApiMockHelper {
  /** Mock GET /api/committees/:id/members */
  static async setupCommitteeMembersMock(page: Page, committeeId: string): Promise<void> {
    await page.route(`**/api/committees/${committeeId}/members`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockCommitteeMembers }),
      });
    });
  }

  /** Mock POST /api/committees/:id/members */
  static async setupCreateMemberMock(page: Page, committeeId: string): Promise<void> {
    await page.route(`**/api/committees/${committeeId}/members`, async (route) => {
      if (route.request().method() !== 'POST') { await route.continue(); return; }
      const body = await route.request().postDataJSON();
      const created = {
        ...body,
        uid: `mock-${Date.now()}`,
        committee_uid: committeeId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(created) });
    });
  }
}
```

**Step 3 — Use in tests:**

```typescript
// apps/lfx-one/e2e/committees/members.spec.ts
test('shows member list', async ({ page }) => {
  await ApiMockHelper.setupCommitteeMembersMock(page, 'mock-committee-001');
  await page.goto('/committees/mock-committee-001');
  await expect(page.getByTestId('member-row')).toHaveCount(1);
});
```

### Local Dev Without Mock Data

For manual local development (non-test), simply point at the real upstream:

```bash
# The server auto-connects to the real backend if reachable
LFX_V2_SERVICE=http://lfx-api.k8s.orb.local yarn dev
```

If the backend is unavailable, use the e2e test suite as your development harness — it fully controls API responses via `page.route()` and doesn't require a live backend.

### Reference Implementations

- **Fixture pattern** (Asitha): `apps/lfx-one/e2e/fixtures/mock-data/projects.mock.ts`
- **Interceptor pattern** (Asitha): `apps/lfx-one/e2e/helpers/api-mock.helper.ts` → `setupProjectSlugMock()`
- **Pure proxy server service** (Asitha): `apps/lfx-one/src/server/services/vote.service.ts`
- **Pure proxy controller** (Asitha): `apps/lfx-one/src/server/controllers/vote.controller.ts`

## Anti-Patterns

Things the codebase never does. If you find yourself writing any of these, stop and reconsider.

**Server-side**
- `console.log` / `console.error` — use `logger` service always
- `res.send()` / `res.status(200).send(text)` — use `res.json()` always
- Inline `catch` blocks in controllers that don't call `next(error)` — always delegate
- Mock data, in-memory stores, or upstream-reachability probes in Express code
- Hardcoded URLs — always `process.env['SERVICE_URL'] ?? 'default'`
- Calling `serverLogger` directly outside of `server.ts` / `logger.service.ts`
- Duplicate `logger.startOperation()` calls for the same operation in both controller and service

**Frontend**
- Constructor parameter injection — use `inject()` function
- Subscribing inside a service — services return Observables, components subscribe
- Observables without `catchError()` — every HTTP call must have a fallback
- `console.error` / `console.log` in components — no logging in the UI layer
- Barrel exports (`index.ts`) for standalone components — always direct imports
- `space-y-*` Tailwind utility — always `flex flex-col gap-*` instead
- Nested ternary expressions in templates or TypeScript
- Interfaces / enums defined locally in a component file — always in `@lfx-one/shared`

**General**
- Missing copyright/SPDX header on any source file
- Commits without a JIRA ticket reference
- Components without `data-testid` attributes on key interactive elements
- Skipping `yarn lint` before `yarn build`

## Commit Workflow with JIRA Tracking

Before starting any work or commits:

1. **Check if there is a JIRA ticket** we always want to track our work. Do not use discarded or resolved tickets
2. **Create JIRA ticket if needed** for untracked work
3. **Include JIRA ticket in commit message** (e.g., LFXV2-XXX)
4. **Link PR to JIRA ticket** when creating pull requests

- Always use sequential thinking mcp for planning before doing any changes
- Always run yarn build to validate that your changes are building too for validation
- Always remember that our JIRA sprint field is customfield_10020. When we create tickets, we need to assign them to the current user and set it to the current sprint.
- Always use `flex + flex-col + gap-*` instead of `space-y-*`
