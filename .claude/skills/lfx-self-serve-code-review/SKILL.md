---
name: lfx-self-serve-code-review
description: "Audits the latest commit on the local branch against this repo's documented rule surface — `.claude/rules/`, the four `docs/reviews/` checklists, architecture docs, the protected-files hook, and upstream API contracts. Operates in constrained-audit mode: every finding must quote a loaded source. Optionally audits the cumulative diff against a base via `base: <ref>` (used for the pre-PR full-branch sweep on multi-commit branches, and by `/lfx-review-pr`). Renders a markdown review. Skill body launches a code-reviewer subagent in the background."
allowed-tools: Agent
---

Launch a subagent in the background (`subagent_type: code-reviewer`, `model: "opus"`, `run_in_background: true`) with the **entire content below** as the Agent `prompt` parameter. Append the caller's runtime args (`extra`, `base`) at the end so the subagent sees both the playbook and its inputs.

The explicit `model: "opus"` pins the review to Opus (currently 4.7) for the depth this audit needs — defensive against the `code-reviewer` agent definition's load-order ambiguity (the `feature-dev` variant declares `sonnet`).

**Launcher discipline — non-negotiable:** pass the playbook **verbatim**. The playbook contains its own routing logic (Step 2 picks which checklists / architecture docs to load based on changed paths). Trimming it strips routing → the subagent can't quote rules that weren't loaded → Step 3 cross-check collapses → severity calibration and the report template drift.

---

# LFX Self-Serve Code Reviewer

You audit the latest commit on the LFX Self-Serve branch against this repo's documented rule surface. **Constrained-audit mode:** emit findings ONLY when you can quote the source (rule file / checklist / hook / architecture doc). Unsourced findings are dropped — empirical-pattern matches against past PR review comments belong to `/lfx-self-serve-learnings-review`, not here. You cover the documented rule surface; that skill covers the empirical surface.

## Inputs

Parse the caller's prompt for:

- **`extra: <free text>`** — optional priority hint.
- **`base: <ref>`** — OPTIONAL. If passed, audit the cumulative diff between `<ref>` and HEAD (`<ref>...HEAD`) instead of the latest commit. Used for the pre-PR full-branch sweep on multi-commit branches AND by `/lfx-review-pr` (which passes `base: origin/<baseRefName>`).

## Step 1 — Compute the diff

Default: audit **only the latest commit** on the current branch. Do not include unstaged or staged work-in-progress — review HEAD's diff, nothing else.

```bash
git rev-parse --abbrev-ref HEAD                # current branch
git log -1 --format='%H %s'                    # commit SHA + subject (the commit under review)
git show --stat -p HEAD                        # stat header + full patch (one shot)
```

With `--stat -p`, the stat block at the top of `git show`'s output is followed by the full patch. The stat block is the canonical changed-file list — use those paths to drive Step 2's path-conditional document loads and Step 3's per-file audit. The shortstat line (e.g., "2 files changed, 12 insertions(+), 3 deletions(-)") feeds the Step 6 report header.

If no `N files changed,` shortstat line appears in the output (empty commit), abort: `No changes to review in the latest commit.`

If `base: <ref>` was provided, audit the cumulative diff between `<ref>` and HEAD instead — used for the pre-PR full-branch sweep on multi-commit branches, and by `/lfx-review-pr`:

```bash
git fetch origin                                          # ensure base is fresh
git rev-parse --abbrev-ref HEAD                           # current branch
git log <ref>..HEAD --format='%H %s'                      # commits being reviewed
git diff --stat <ref>...HEAD                              # file list + counts (three-dot computes merge-base)
git diff <ref>...HEAD                                     # full diff
```

Normalize `<ref>` first: if it contains no `/` (e.g., bare `main`), prefix with `origin/` so the comparison runs against the freshly-fetched remote ref. If no commits exist between `<ref>` and HEAD, abort: `No commits between <ref> and HEAD.`

For per-file reads in any mode: `git show "HEAD:<path>"`. If the diff is too large to hold in context, save to `/tmp/code-review-diff.patch` and Read changed source files individually.

Commit-level data (signatures, sign-off trailers) and prior PR review comments are NOT your concern — `/lfx-review-pr` handles those.

## Step 2 — Load reference documents

Always pull current contents — never rely on memory of these files from prior runs.

### Always read (in parallel)

- `CLAUDE.md` at the repo root
- `~/.claude/CLAUDE.md` if it exists
- Every file matching `.claude/rules/*.md` — Glob dynamically; never hand-maintain a list
- `.claude/hooks/guard-protected-files.sh` — parse its `case` / `if` blocks to build the authoritative protected-paths list (used in Step 5)

### ⚠ Mandatory: the four `docs/reviews/` checklists

These are the **primary audit surface** — each item exists because it broke a real PR on this repo. Skipping a relevant checklist invalidates the audit. If you cannot Read a required checklist, mark the report as **INCOMPLETE**.

| Touched paths                                    | Required checklist                         |
| ------------------------------------------------ | ------------------------------------------ |
| `apps/lfx-one/src/app/**`                        | `docs/reviews/frontend-checklist.md`       |
| `apps/lfx-one/src/server/**`                     | `docs/reviews/backend-checklist.md`        |
| `packages/shared/**` or Snowflake SQL            | `docs/reviews/shared-and-sql-checklist.md` |
| `docs/**`                                        | `docs/reviews/docs-checklist.md`           |

You audit **by these checklists**, not against your general framework knowledge. Locate a specific checklist item, rule file entry, hook path, or architecture-doc paragraph for every finding (see Step 3).

### Architecture docs — load conditionally by changed-file paths

| Touched paths                                  | Load                                                                                                                                                                                                |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/lfx-one/src/app/**`                      | `docs/architecture/frontend/angular-patterns.md`, `component-architecture.md`, `styling-system.md`                                                                                                  |
| Drawer component or `DialogService.open` usage | `docs/architecture/frontend/drawer-pattern.md`                                                                                                                                                      |
| `apps/lfx-one/src/server/**`                   | `docs/architecture/backend/README.md`, `error-handling-architecture.md`, `logging-monitoring.md`, `server-helpers.md`                                                                               |
| `middleware/auth*`                             | `docs/architecture/backend/authentication.md`                                                                                                                                                       |
| `auth-helper`, persona helpers                 | `docs/architecture/backend/impersonation.md`                                                                                                                                                        |
| `/public/**` routes, public meetings           | `docs/architecture/backend/public-meetings.md`                                                                                                                                                      |
| Pagination helpers, list endpoints             | `docs/architecture/backend/pagination.md`                                                                                                                                                           |
| `ai.service.ts`, AI proxy calls                | `docs/architecture/backend/ai-service.md`                                                                                                                                                           |
| `nats.service.ts`, project NATS RPCs           | `docs/architecture/backend/nats-integration.md`                                                                                                                                                     |
| `snowflake.service.ts`, direct SQL             | `docs/architecture/backend/snowflake-integration.md`                                                                                                                                                |
| SSR / `server.ts` / render pipeline            | `docs/architecture/backend/ssr-server.md`                                                                                                                                                           |
| `packages/shared/**`                           | `docs/architecture/shared/package-architecture.md`                                                                                                                                                  |
| `*.spec.ts` or `e2e/**`                        | `docs/architecture/testing/e2e-testing.md`, `docs/architecture/testing/testing-best-practices.md`                                                                                                   |

If `.claude/skills/develop/references/` exists, also Read the relevant reference files (`backend-endpoint.md` for server changes, `frontend-component.md` for components, etc.).

## Step 3 — Audit pass with cross-check discipline

For each changed file:

1. **Read the full file at the current revision** — don't audit from diff alone; context matters.
2. **Categorize** — frontend component / frontend service / SSR / backend service / controller / route / shared / SQL / docs / mixed.
3. **Walk every applicable item** in the relevant `docs/reviews/` checklist + every applicable rule in `.claude/rules/` + the architecture docs loaded in Step 2.
4. **Cross-check before emitting:** for each candidate finding, locate the exact rule, checklist item, hook entry, or architecture-doc paragraph it violates. Quote that source in the finding's `Source:` citation. **If you cannot quote the source, drop the finding.** Hallucinated rules are worse than missed ones.
5. **Account for the full checklist surface:** if you cannot account for having considered every applicable checklist item, mark the report **INCOMPLETE** in Step 6 rather than ship a partial report.

## Step 4 — Upstream API contract validation (backend only)

**Skip this entirely if no files under `apps/lfx-one/src/server/` were changed.**

The LFX One backend is a thin proxy to external Go microservices. New or modified proxy endpoints must align with the upstream API contract.

Required for:

- Any new file in `services/`, `controllers/`, or `routes/`
- Any modified service that calls `MicroserviceProxyService.proxyRequest()`
- Any new API path or changed request/response shape

For modifications to existing endpoints (not new ones), a lighter check is acceptable — verify the endpoint still exists rather than a full schema comparison.

```bash
gh api repos/linuxfoundation/<repo-name>/contents/gen/http/openapi3.yaml --jq '.content' | base64 -d
gh api repos/linuxfoundation/<repo-name>/contents/design --jq '.[].name'
gh api repos/linuxfoundation/<repo-name>/contents/design/<file>.go --jq '.content' | base64 -d
```

Upstream repo map:

| Domain        | Repo                          |
| ------------- | ----------------------------- |
| Queries       | `lfx-v2-query-service`        |
| Projects      | `lfx-v2-project-service`      |
| Meetings      | `lfx-v2-meeting-service`      |
| Mailing Lists | `lfx-v2-mailing-list-service` |
| Committees    | `lfx-v2-committee-service`    |
| Voting        | `lfx-v2-voting-service`       |
| Surveys       | `lfx-v2-survey-service`       |

Validate:

- Endpoint paths and HTTP methods match upstream
- Request body / query params match upstream schema (no extra fields, no missing required)
- Response shape matches upstream
- Query Service conventions: `page_size` (NOT `limit`), `page_token` for cursor pagination, `filters` format `field:value`
- No fabricated endpoints — if upstream doesn't expose it, the proxy shouldn't pretend it exists

**Snowflake direct SQL:** every `?` placeholder must have a corresponding value in the binds array, in the correct order. Bind mismatch is always Critical.

**On `gh api` failure** (404, auth, network): surface in Step 6's "Upstream API validation" section as "Upstream API contract for `<service>` could not be verified — manual validation required." Treat as Important severity. Don't silently skip.

## Step 5 — Protected files

Parse `.claude/hooks/guard-protected-files.sh` (loaded in Step 2) — extract paths from its `case` statements / `if` conditions. **Never hardcode the list.**

For each changed file matching the parsed list, surface it in Step 6's "Protected files touched" section with the path + the warning reason: "Part of core infrastructure — requires extra review scrutiny. Surface in PR description and tag a code owner." These flags always render, regardless of the ≥80 confidence floor (they're deterministic presence indicators, not quality judgments).

## Step 6 — Render the report

Lead with what you're reviewing — `<commit-sha> — <subject>` for the default case, or `<base>...HEAD (<branch-name>, N commits)` if `base: <ref>` was passed. Then files changed and additions / deletions.

Render findings in three sections:

1. **Protected files touched** — list files from Step 5 with the warning reason, or "None modified" if empty. Always rendered (deterministic flag bypasses the ≥80 floor).
2. **Upstream API validation** — Step 4 results: paths verified, or unverified contracts flagged with the "manual validation required" message. Or "Skipped — no backend changes" if no backend was touched. Always rendered.
3. **Findings** — code-review findings grouped under `### Critical (N)` (confidence 90-100) and `### Important (N)` (confidence 80-89). Each finding is a bullet of this form (parser-friendly for downstream consumers):

   `- **<file>:<line>** (conf <0-100>) — <issue, 1-2 sentences>. _Source:_ <quoted rule citation>. _Fix:_ <concrete suggestion>.`

If no findings exist at or above the ≥80 confidence floor, confirm the code meets standards with a brief summary.

If a required checklist or architecture doc couldn't be loaded, lead with `INCOMPLETE — couldn't load <file>` and recommend a re-run.

If `extra` was applied, note it.

## Severity calibration

The examples below are illustrative, not exhaustive — apply the same severity bucket to any violation that fits the same pattern of impact, not just the specific cases listed.

- **Critical** (confidence 90-100) — runtime bugs, security issues, M2M misuse in protected routes, SQL bind mismatches, upstream contract violations that will fail at runtime, `as unknown as` casts, raw `new Error()` / manual `res.status().json()` for errors, bypassed user authorization, missing `getEffectiveEmail(req)`.
- **Important** (confidence 80-89) — documented style / structure violations (component section order, logger usage, license headers, PrimeNG wrappers, `@if`/`@for` over `*ngIf`/`*ngFor`, `inject()` over constructor DI, `page_size` over `limit`), unverified upstream contracts.
- **Nit** (confidence below 80) — preferences, minor improvements, file naming, comment phrasing, protected-file awareness. Suppressed from the report by the ≥80 floor **except** for `category: protected-files` and `category: upstream-api` deterministic flags, which bypass the floor.

## Known false positives — DO NOT emit

- Missing `ChangeDetectionStrategy.OnPush` — the app uses stable zoneless change detection.
- Missing `standalone: true` — Angular 20+ defaults to standalone.
- `provideZonelessChangeDetection()` flagged as experimental — it is stable in Angular 20.
- Any finding whose `Source:` citation cannot be quoted from a loaded rule file / hook / checklist / architecture doc — drop.

## Scope boundaries — NOT this skill's job

- **PR-shape sanity** (branch name, JIRA, conventional commits, rebase, DCO + GPG, diff size) → `/lfx-self-serve-pr-readiness`.
- **Empirical pattern matching** (KB of past-PR review comments) → `/lfx-self-serve-learnings-review`.

If a finding fits one of those surfaces, drop it.
