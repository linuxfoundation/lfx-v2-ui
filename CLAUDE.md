# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LFX One is a Turborepo monorepo containing two Angular 20 SSR applications and an Express.js server:

- **`apps/lfx`** — New application (primary focus). Angular 20 SSR with Tailwind v4, custom UI components (no PrimeNG).
- **`apps/lfx-one`** — Existing application (being replaced). Angular 20 SSR with PrimeNG wrapper components and Tailwind v3.

## Monorepo Structure

```text
lfx-v2-ui/
├── apps/
│   ├── lfx/                  # New Angular 20 SSR app — Tailwind v4, custom components (no PrimeNG)
│   └── lfx-one/              # Existing Angular 20 SSR app — PrimeNG wrappers, Tailwind v3 (being replaced)
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

## Shared Package

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

> **Note**: Domain-specific utilities (meetings, surveys, polls, etc.) are also available. See [Package Architecture docs](docs/architecture/shared/package-architecture.md) for complete documentation including validators.

## Development Memories

- **`apps/lfx`** uses custom Tailwind v4 components — no PrimeNG dependency
- **`apps/lfx-one`** — reference PrimeNG's component interface when defining types; all PrimeNG components are wrapped in LFX components for UI library independence
- Always use direct imports for standalone components - no barrel exports
- **Authentication uses selective pattern** - public routes bypass auth, protected routes require authentication
- **Public routes include** `/meeting` and `/public/api` endpoints
- **M2M tokens are used** for server-side API calls from public endpoints
- **Custom login handler** at `/login` with URL validation and secure redirects
- Authentication is handled by Auth0/Authelia with express-openid-connect middleware

## Rule Files

Detailed patterns are in `.claude/rules/` and loaded contextually based on file globs:

| Rule File                   | Glob                | Topics                                                                                           |
| --------------------------- | ------------------- | ------------------------------------------------------------------------------------------------ |
| `component-organization.md` | `**/*.component.ts` | Signal initialization, component structure order, model signals, interfaces                      |
| `logging-patterns.md`       | `**/server/**`      | Logger service API, layer responsibilities, log levels, code examples                            |
| `development-rules.md`      | `*`                 | Shared package, license headers, testing, formatting, doc maintenance                            |
| `commit-workflow.md`        | `*`                 | Commit conventions, branch naming, PR format, PR sizing, JIRA tracking                           |
| `skill-guidance.md`         | `*`                 | Guides Claude to suggest `/lfx-setup`, `/lfx-coordinator`, `/lfx-preflight` and other lfx skills |

## Architecture Documentation

| Document                                                                       | Topics                                             |
| ------------------------------------------------------------------------------ | -------------------------------------------------- |
| [Angular Patterns](docs/architecture/frontend/angular-patterns.md)             | Zoneless change detection, signals, components     |
| [Component Architecture](docs/architecture/frontend/component-architecture.md) | PrimeNG wrapper patterns                           |
| [Styling System](docs/architecture/frontend/styling-system.md)                 | Tailwind, fonts, theming                           |
| [Drawer Pattern](docs/architecture/frontend/drawer-pattern.md)                 | Drawer components, lazy loading, chart integration |
| [Backend Architecture](docs/architecture/backend/README.md)                    | Controller-Service pattern, Express.js server      |
| [Authentication](docs/architecture/backend/authentication.md)                  | Auth0 setup, selective auth middleware             |
| [SSR Server](docs/architecture/backend/ssr-server.md)                          | Server-side rendering                              |
| [Logging & Monitoring](docs/architecture/backend/logging-monitoring.md)        | Structured logging with Pino                       |
| [Error Handling](docs/architecture/backend/error-handling-architecture.md)     | Error classification, middleware                   |
| [Server Helpers](docs/architecture/backend/server-helpers.md)                  | Validation, pagination, URL utilities              |
| [Pagination](docs/architecture/backend/pagination.md)                          | Cursor-based pagination, infinite scroll           |
| [AI Service](docs/architecture/backend/ai-service.md)                          | LiteLLM proxy, agenda generation                   |
| [NATS Integration](docs/architecture/backend/nats-integration.md)              | Inter-service messaging                            |
| [Snowflake Integration](docs/architecture/backend/snowflake-integration.md)    | Analytics queries, connection pooling              |
| [Public Meetings](docs/architecture/backend/public-meetings.md)                | Unauthenticated access, M2M tokens                 |
| [Shared Package](docs/architecture/shared/package-architecture.md)             | Types, interfaces, utilities, validators           |
| [E2E Testing](docs/architecture/testing/e2e-testing.md)                        | Dual architecture testing                          |
| [Testing Best Practices](docs/architecture/testing/testing-best-practices.md)  | Testing patterns and guide                         |
