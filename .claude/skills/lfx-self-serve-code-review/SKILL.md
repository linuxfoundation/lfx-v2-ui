---
name: lfx-self-serve-code-review
description: "Audits recently written or modified lfx-self-serve code against this repo's documented rule surface — `.claude/rules/`, the four `docs/reviews/` checklists, architecture docs, the protected-files hook, and upstream API contracts. Operates in constrained-audit mode: every finding must quote a loaded source. Invoke post-commit (mode:local) to render a markdown report, or against an opened PR (mode:pr) to return JSON findings for the post-PR flow to compose. The skill body launches a code-reviewer subagent in the background with the playbook below."
allowed-tools: Agent
---

Launch a subagent in the background (`subagent_type: code-reviewer`, `run_in_background: true`) with the **entire content below** as the Agent `prompt` parameter. Append the caller's runtime args (`mode`, `base`, `number`, `extra`) at the end so the subagent sees both the playbook and its inputs.

**Launcher discipline — non-negotiable:** pass the playbook **verbatim**. The playbook contains its own routing logic (Step 2 picks which checklists / architecture docs to load based on changed paths). Trimming it strips routing → the subagent can't quote rules that weren't loaded → Step 3 cross-check collapses → severity calibration and the output template drift.

---

# LFX Self-Serve Code Reviewer

You audit changes to the LFX Self-Serve codebase against this repo's documented rule surface. **Constrained-audit mode:** emit findings ONLY when you can quote the source (rule file / checklist / hook / architecture doc). Unsourced findings are dropped — empirical-pattern matches against past PR review comments belong to `/lfx-self-serve-learnings-review`, not here. You cover the documented rule surface; that skill covers the empirical surface.

## Inputs

The caller hands you a free-form prompt. Parse:

- **`mode: <local | pr>`** — required. `local` renders markdown; `pr` returns JSON.
- **`base: <ref>`** — base for `mode: local` (default `origin/main`). Normalize: if no `/` in the ref, prefix with `origin/` so the comparison runs against the freshly-fetched remote ref.
- **`number: <N>`** — PR number for `mode: pr`.
- **`extra: <free text>`** — optional priority hint.

Defaults if missing: `mode: local`, `base: origin/main`, no extra focus.

## Step 1 — Compute the diff (mode-dispatched)

### `mode: local`

Audit the union of (a) commits since `<base>` and (b) any staged-but-uncommitted changes. In the typical post-commit invocation the staged diff is empty; in mid-edit it isn't. Treat them as a single combined audit.

```bash
git fetch origin
git rev-parse --abbrev-ref HEAD                                 # current branch

# Committed work since base (three-dot = merge-base..HEAD):
git diff --name-only <base>...HEAD                              # committed file list
git diff <base>...HEAD                                          # committed full diff
git diff --shortstat <base>...HEAD                              # shortstat

# Staged-but-uncommitted:
git diff --name-only --cached                                   # staged file list
git diff --cached                                               # staged full diff
git diff --cached --shortstat                                   # shortstat
```

If both diffs are empty, abort: `No changes to review against <base>.`

If the combined diff is too large to hold in context, save to `/tmp/standards-diff.patch` and Read changed source files individually.

### `mode: pr`

```bash
gh repo view --json nameWithOwner --jq '.nameWithOwner'   # store as {owner}/{repo}
gh pr view <N> --json title,body,headRefName,baseRefName,author,files,additions,deletions,state,number
gh pr diff <N>
# Fetch base + PR head via GitHub's pull/<N>/head refspec (works uniformly for fork PRs
# and same-repo PRs — local destination `refs/pr/<N>/head` is a private namespace):
git fetch origin <baseRefName>
git fetch origin "+pull/<N>/head:refs/pr/<N>/head"
```

For per-file reads use `git show "refs/pr/<N>/head:<path>"`. If the diff is too large, save to `/tmp/pr-<N>.diff` and Read only the changed source files.

Prior review comments and commit-level data (subjects, signatures, sign-off trailers) are NOT your concern — the caller handles those. You audit code only.

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
4. **Cross-check before emitting:** for each candidate finding, locate the exact rule, checklist item, hook entry, or architecture-doc paragraph it violates and put its source in the `rule` field. **If you cannot quote the source, drop the finding.** Hallucinated rules are worse than missed ones.
5. **Account for the full checklist surface:** if you cannot account for having considered every applicable checklist item, mark the output **INCOMPLETE** (mode:local) or set `status: incomplete` (mode:pr) rather than ship a partial report.

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

**On `gh api` failure** (404, auth, network): emit `severity: Important`, `category: upstream-api`, `rule: upstream-api/unverified`, `message: "Upstream API contract for <service> could not be verified — manual validation required."` Don't silently skip.

## Step 5 — Protected files

Parse `.claude/hooks/guard-protected-files.sh` (loaded in Step 2) — extract paths from its `case` statements / `if` conditions. **Never hardcode the list.**

For each changed file matching the parsed list, emit:

```text
severity: Important
category: protected-files
rule: protected-files/<path>
message: "Part of core infrastructure — requires extra review scrutiny. Surface in PR description and tag a code owner."
```

## Step 6 — Output (mode-dispatched)

### `mode: local`

Lead with what you're reviewing (branch, files changed, additions / deletions).

Render findings in three sections:

1. **Protected files touched** — list from `category: protected-files` findings with the hook's warning reason. Or "None modified" if empty.
2. **Upstream API validation** — list from `category: upstream-api` findings. Or "Skipped — no backend changes" if no backend was touched.
3. **Findings** — `category: code` findings grouped by severity (**Critical** for confidence 90-100, **Important** for confidence 80-89). For each: confidence score, file path and line number, quoted source citation (rule file / checklist item / hook entry / architecture-doc paragraph), and a concrete fix.

If no `code` findings exist at or above the ≥80 confidence floor, confirm the code meets standards with a brief summary.

If a required checklist or architecture doc couldn't be loaded, lead with `INCOMPLETE — couldn't load <file>` and recommend a re-run.

If `extra` was applied, note it.

### `mode: pr` — return JSON

Single JSON array. One object per finding. No prose around it — the caller composes the final review.

```json
[
  {
    "file": "apps/lfx-one/src/server/services/foo.service.ts",
    "line": 42,
    "severity": "Critical | Important",
    "category": "code | upstream-api | protected-files",
    "rule": "<source-file>:<section>",
    "message": "What's wrong, in 1–2 sentences.",
    "suggestion": "Corrected code or concrete fix.",
    "confidence": 95
  }
]
```

`category: protected-files` and `category: upstream-api` findings emit regardless of the confidence floor (deterministic flags, not quality judgments). Set `severity: Important` and `line: null` for protected-files. Set `severity: Important` for unverified upstream contracts.

If a required checklist couldn't be loaded, return `{"status": "incomplete", "findings": [...]}` instead of the array.

## Severity calibration

- **Critical** (confidence 90-100) — runtime bugs, security issues, M2M misuse in protected routes, SQL bind mismatches, upstream contract violations that will fail at runtime, `as unknown as` casts, raw `new Error()` / manual `res.status().json()` for errors, bypassed user authorization, missing `getEffectiveEmail(req)`.
- **Important** (confidence 80-89) — documented style / structure violations (component section order, logger usage, license headers, PrimeNG wrappers, `@if`/`@for` over `*ngIf`/`*ngFor`, `inject()` over constructor DI, `page_size` over `limit`), unverified upstream contracts, protected-file modifications.

## Known false positives — DO NOT emit

- Missing `ChangeDetectionStrategy.OnPush` — the app uses stable zoneless change detection.
- Missing `standalone: true` — Angular 20+ defaults to standalone.
- `provideZonelessChangeDetection()` flagged as experimental — it is stable in Angular 20.
- Any finding whose `rule` field cannot be quoted from a loaded rule file / hook / checklist / architecture doc — drop.

## Scope boundaries — NOT this skill's job

- **PR-shape sanity** (branch name, JIRA, conventional commits, rebase, DCO + GPG, diff size) → `/lfx-self-serve-pr-readiness`.
- **Empirical pattern matching** (KB of past-PR review comments) → `/lfx-self-serve-learnings-review`.

If a finding fits one of those surfaces, drop it.
