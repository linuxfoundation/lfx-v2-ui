# LFX App — Architecture & Build Plan

> **Purpose:** This document is the source of truth for building `apps/lfx` — a new Angular 20 SSR application that will eventually replace `apps/lfx-one`. It is organized into phases, each independently deliverable. No phase should begin before the prior one is complete and merged.

---

## Overview

`apps/lfx` is a ground-up rewrite of LFX One using a cleaner architecture modeled after `lfx-changelog`. The key differences from `lfx-one`:

| Concern          | `lfx-one`                                   | `lfx` (new)                              |
| ---------------- | ------------------------------------------- | ---------------------------------------- |
| UI Library       | PrimeNG 20 + wrapper components             | Custom components, Tailwind v4 only      |
| Tailwind         | v3, config file, `tailwindcss-primeui`      | v4, `@theme` CSS block, no plugin        |
| Auth             | Auth0 + Authelia + `express-openid-connect` | Auth0 + `express-openid-connect` only    |
| Change Detection | Zoneless (stable)                           | Zoneless (stable)                        |
| Shared Package   | `@lfx-one/shared`                           | Extends `@lfx-one/shared` (same package) |
| State            | Signals + RxJS                              | Signals + RxJS                           |
| Routing          | Flat, lazy-loaded                           | Flat, lazy-loaded                        |
| Long-term goal   | Being replaced                              | Full replacement of `lfx-one`            |

---

## Agent Team

Work in this app is orchestrated through a team of specialized Claude skills. The **Coordinator** is the entry point — it plans, breaks work into scoped tasks, and delegates to the appropriate specialist. No specialist should be used directly for a multi-step feature without going through the Coordinator first.

```text
┌────────────────────────────────────────────────────────┐
│                    /lfx-coordinator                     │
│  Plans features, scopes PRs, delegates to specialists  │
└────────┬──────────────┬──────────────┬─────────────────┘
         │              │              │
         ▼              ▼              ▼
  /lfx-research  /lfx-ui-builder  /lfx-backend-builder
  Read-only API  Frontend code    Backend proxy +
  & code recon   generation       shared types
                      │
                      ▼
                /lfx-design
                Tailwind v4
                component builder
                (apps/lfx only)
```

### Skill Descriptions

| Skill                  | Location                              | Role                                                                                                       |
| ---------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `/lfx-coordinator`     | `.claude/skills/lfx-coordinator/`     | Entry point for all multi-step features. Plans, scopes PRs, delegates. Never writes code directly.         |
| `/lfx-research`        | `.claude/skills/lfx-research/`        | Read-only. Validates upstream API contracts, explores codebase, returns structured findings.               |
| `/lfx-ui-builder`      | `.claude/skills/lfx-ui-builder/`      | Generates Angular frontend code for both `lfx-one` and `lfx`. Knows both PrimeNG and Tailwind v4 patterns. |
| `/lfx-backend-builder` | `.claude/skills/lfx-backend-builder/` | Generates Express proxy endpoints (service + controller + route) and shared types.                         |
| `/lfx-design`          | `.claude/skills/lfx-design/`          | Component builder for the `lfx` design system only. Custom Tailwind v4 components.                         |
| `/lfx-preflight`       | `.claude/skills/lfx-preflight/`       | Pre-PR validation — format, lint, build, license headers, protected files.                                 |
| `/lfx-setup`           | `.claude/skills/lfx-setup/`           | Environment setup from scratch for any contributor.                                                        |

---

## Architecture Decisions

### 1. Shared Package Strategy

`apps/lfx` extends — not forks — the existing `packages/shared` (`@lfx-one/shared`). New interfaces, enums, and constants are added alongside existing `lfx-one` types. The `tsconfig.json` in `apps/lfx` uses the same path alias:

```json
{ "@lfx-one/shared/*": ["../../packages/shared/src/*"] }
```

### 2. Tailwind v4

No `tailwind.config.js`. All design tokens live in a `@theme` block in `src/styles.css`. Component files use `.css` not `.scss`. This mirrors `lfx-changelog`.

### 3. Component Architecture

All UI components are custom-built with Tailwind v4. No PrimeNG dependency. Components use the wrapper pattern and are located in `apps/lfx/src/app/shared/components/`. Generated with `/lfx-design`.

### 4. Server Architecture

Same controller-service-route pattern as `lfx-one`, simplified:

- **Auth**: `express-openid-connect` only (no Authelia)
- **Logging**: Pino-based logger service, but only error-handler middleware logs errors — controllers and domain services do NOT log
- **Upstream calls**: `LfxService` — flat fetch client replacing `MicroserviceProxyService` + `ApiClientService`
- **Errors**: Single `ApiError` class with factory methods (replaces 5-class error hierarchy)

### 5. App Scaffolding via Angular CLI

The app is generated with the Angular CLI, not hand-crafted:

```bash
cd apps
ng new lfx --ssr --style css --zoneless --prefix lfx --skip-tests
```

Post-generation modifications replace the generated server entry with full Express setup, add Tailwind v4 `@theme` tokens, and wire up `@lfx-one/shared` path aliases.

---

## Phases

---

### Phase 1 — Claude Skills

**Goal:** All Claude Code skills written and in place **before any code is generated**. Every subsequent phase uses `/lfx-coordinator` as the entry point.

**Why first:** The skills encode project conventions, patterns, and guardrails. Having them in place from the start means all generated code is consistent and reviewable from Phase 2 onward.

**Deliverables:**

- [x] `/lfx-coordinator` — Orchestrates multi-step features. Delegates to specialists. Never writes code.
- [x] `/lfx-research` — Read-only. Validates upstream APIs and explores codebase. Returns structured findings.
- [x] `/lfx-ui-builder` — Generates Angular frontend code for both `lfx-one` and `lfx`.
- [x] `/lfx-backend-builder` — Generates Express proxy endpoints and shared TypeScript types.
- [x] `/lfx-design` — Custom Tailwind v4 component builder for `apps/lfx` design system only.
- [x] `/lfx-preflight` — Pre-PR validation (replaces old `/preflight`).
- [x] `/lfx-setup` — Environment setup (replaces old `/setup`).
- [x] `.claude/rules/skill-guidance.md` updated to reference new skill names.
- [x] `CLAUDE.md` updated to reference both apps and new skill names.
- [x] Old skills (`develop`, `preflight`, `setup`) removed.

**Definition of Done:** A contributor can run `/lfx-coordinator` and have it plan, research, and delegate code generation without manual guidance.

---

### Phase 2 — App Scaffolding

**Goal:** A running Angular 20 SSR application at `apps/lfx/` with all infrastructure wired — no features, no PrimeNG, no placeholder content.

**Use `/lfx-coordinator` to orchestrate this phase.**

**Step 1 — Generate with Angular CLI:**

```bash
cd apps
ng new lfx --ssr --style css --zoneless --prefix lfx --skip-tests
```

**Step 2 — Post-generation modifications:**

- [x] `src/styles.css` — Tailwind v4 `@import "tailwindcss"` + `@theme` block with LFX design tokens (skeleton)
- [x] `src/app/app.config.ts` — zoneless, hydration, HTTP client
- [x] `src/app/app.config.server.ts` — server rendering config
- [x] `src/app/app.routes.ts` — shell routes (empty)
- [x] `src/app/app.routes.server.ts` — all routes `RenderMode.Server`
- [x] `src/server/server.ts` — Express: compression, static files, Pino HTTP, Auth0 OIDC, auth middleware, error handler, SSR handler
- [x] `src/server/helpers/server-logger.ts` — Pino base instance (port from `lfx-one`)
- [x] `src/server/services/logger.service.ts` — singleton logger (port from `lfx-one`)
- [x] `src/server/middleware/auth.middleware.ts` — Auth0 selective auth
- [x] `src/server/middleware/error-handler.middleware.ts` — centralized error logging (single place for all error logging)
- [x] `src/server/helpers/api-error.ts` — single `ApiError` class with factory methods (replaces `errors/` hierarchy)
- [x] `src/server/services/lfx.service.ts` — flat fetch client for upstream Go services (replaces `microservice-proxy.service.ts`)
- [x] `src/server/helpers/` — error-serializer, url-validation
- [x] `src/types/express.d.ts` — Express request type augmentation
- [x] `tsconfig.json` — strict mode + `@lfx-one/shared` path aliases
- [x] `ecosystem.config.js` — PM2 config
- [x] `turbo.json` — auto-discovered via workspaces
- [x] License headers on all source files

**Definition of Done:**

- `yarn build --filter=lfx` succeeds
- `yarn start --filter=lfx` serves without error
- Auth redirect works (hitting `/` redirects to Auth0)
- No PrimeNG dependencies

---

### Phase 3 — Design System Foundation

**Goal:** Base UI component library for `apps/lfx` built with Tailwind v4. All components are built from the **Coherence UI Kit** in Figma using `/lfx-design` with the Figma MCP.

**Workflow:** Each component is built by providing a Figma node URL to `/lfx-design`, which fetches the design context via MCP, extracts tokens/variants, and generates the component with Storybook stories. Components are NOT built speculatively — they are added as needed from Figma designs.

**Step 1 — Finalize `@theme` tokens in `styles.css`:**

- [x] Color scales: neutral, info, success, warning, danger, discovery (50–950)
- [x] Semantic tokens: surface, border, text, text-secondary, text-muted
- [x] Typography: Inter font family, standard Tailwind scale
- [x] Spacing, radius, shadow tokens

**Step 2 — Build base components from Figma** (all custom Tailwind, no PrimeNG):

Built:

- [x] `Badge` — variants: neutral, info, success, warning, danger, discovery; sizes: sm/lg; icon slot
- [x] `Button` — variants: primary, secondary, ghost, danger; sizes: sm/lg; loading/disabled states; icon-only mode
- [x] `Spinner` — sizes: sm/md/lg; color variants
- [x] `Avatar` — types: photo/logo/initials; sizes: xs/sm/md/lg/xl
- [x] `Card` — padding variants; hoverable state
- [x] `Checkbox` — model() for checked; [class.invisible] pattern
- [x] `RadioButton` — CSS-only dot indicator; model() binding
- [x] `ToggleSwitch` — flexbox justify for knob positioning
- [x] `Chip` — styles: bordered/neutral; types: label/icon/avatar-photo/avatar-logo; dismissable
- [x] `Tooltip` — simple (centered label) and with-description variants

Remaining (build from Figma when needed):

- [ ] `Input` — text, email, password; error state; label slot
- [ ] `Select` — custom dropdown with keyboard navigation
- [ ] `Textarea`
- [ ] `Modal` — dialog with backdrop
- [ ] `Table` — sorting support
- [ ] `Tabs`
- [ ] `Toast` — notification system
- [ ] `Pagination`
- [ ] `DropdownMenu`
- [ ] `SidebarNav`
- [ ] `Topbar`
- [ ] `MainLayout`

**Storybook:** All components have `.stories.ts` files with individual variant stories + `AllVariants` story. Run `yarn storybook` from root to preview at `http://localhost:6006`.

**Definition of Done:** Core interaction components (Badge, Button, Checkbox, RadioButton, ToggleSwitch, Chip, Tooltip, Card, Avatar, Spinner) available in Storybook. Remaining components built on-demand as features require them.

---

### Phase 4 — Infrastructure Services

**Goal:** Wire up remaining infrastructure services. Use `/lfx-coordinator` to orchestrate.

- [ ] **NATS** — `nats.service.ts` + `project.service.ts`
- [ ] **Snowflake** — `snowflake.service.ts` singleton with connection pooling
- [ ] **LaunchDarkly** — Feature flags provider + `LaunchDarklyService`
- [ ] **AI Service** — `ai.service.ts` with LiteLLM proxy
- [ ] **ETag Service** — `etag.service.ts`
- [ ] Environment variable documentation updated

---

### Phase 5 — First Feature: Dashboards

**Goal:** First real feature in `apps/lfx`, validating the end-to-end architecture.

**Pre-requisite:** All upstream dashboard APIs verified via `/lfx-research` before any code is written.

- [ ] `modules/dashboards/` feature module
- [ ] Role-based dashboard routing
- [ ] Dashboard components built with Phase 3 component library
- [ ] Backend proxy endpoints
- [ ] E2E tests with `data-testid` selectors

---

### Phase 6 — Module Migration

**Goal:** Migrate remaining `lfx-one` modules into `lfx`, one at a time. Use `/lfx-coordinator` to plan each migration.

**Migration order** (subject to priority changes):

1. Meetings
2. Committees
3. Mailing Lists
4. Votes
5. Surveys
6. My Activity
7. Profile
8. Settings

Each module gets its own PR. `/lfx-research` verifies API parity before any module begins.

---

### Phase 7 — Cutover

**Goal:** `apps/lfx` is feature-complete, `apps/lfx-one` is deprecated.

- [ ] Feature parity audit complete
- [ ] Performance benchmarks meet or exceed `lfx-one`
- [ ] `lfx-one` routing redirects to `lfx`
- [ ] `lfx-one` removed from turbo pipeline
- [ ] `CLAUDE.md` updated to reference `apps/lfx` as the primary app

---

## Guiding Principles

1. **Phase 1 (skills) ships before any code is written.** Every subsequent phase relies on the coordinator.
2. **No phase starts before the prior one is merged.**
3. **No PrimeNG, ever** in `apps/lfx`. Build with `/lfx-design`.
4. **No mock data, no stubs.** Use `/lfx-research` to verify APIs before building.
5. **Angular CLI generates, humans configure.** Always use `ng generate` for new components, services, guards, and pipes within `apps/lfx`.
6. **Shared package is the source of truth for types.** No local interfaces in components.
7. **Coordinate, don't solo.** For anything spanning more than one layer, use `/lfx-coordinator`.
