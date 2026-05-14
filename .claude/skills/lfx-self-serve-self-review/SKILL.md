---
name: lfx-self-serve-self-review
description: >
  Pre-PR self-review of local lfx-self-serve work against a target base branch
  (default origin/main). Computes local diff, validates branch name and JIRA
  in commits, runs upstream API contract checks, runs code-standards
  enforcement, compiles a structured findings report. Use before opening a PR.
context: fork
agent: code-standards-enforcer
allowed-tools: Bash, Read, Glob, Grep
---

# LFX Self-Serve Pre-PR Self-Review

You are reviewing **local work that has not yet been opened as a PR** against LFX One standards. There is no `gh pr` to read — operate on the local diff between the current branch and a target base (default `origin/main`).

This skill runs in a **forked context** using the `code-standards-enforcer` subagent type. The implication: re-read every rule and architecture doc rather than relying on memory from the implementation thread that just produced the diff. The agent's system prompt already loaded the enforcement playbook — this skill's body layers a workflow and report shape on top.

**Output:** a structured findings report printed to the terminal with a verdict — `NOT READY` / `READY WITH CHANGES` / `READY`. No `/review` chaining, no `gh pr ...` mutation. The reviewer skill (`/lfx-review-pr`) handles the post-open lifecycle.

---

## Phase 1: Parse args & compute the local diff

### Parse arguments

Args format: `[base-branch] [extra instructions]`.

- First token, if it looks like a ref (contains `/`, or is a plain branch name like `main`), is the base branch.
- Default base: `origin/main`.
- Everything else is extra focus (e.g. "focus on backend").

### Fetch refs and compute the diff

Run in parallel:

```bash
git fetch origin                                                # refresh tracking refs
git rev-parse --abbrev-ref HEAD                                 # current branch
git merge-base <base> HEAD                                      # → $MB
git diff --name-only $MB..HEAD                                  # changed-file list
git diff $MB..HEAD                                              # full diff
git diff --shortstat $MB..HEAD                                  # additions/deletions
git log --format='%H %s' $MB..HEAD                              # commit subjects
git log --format='%G? %h %s' $MB..HEAD                          # signature status
git log --format=%B $MB..HEAD                                   # full commit bodies (for Signed-off-by)
```

If the diff is too large to hold in context, save it to `/tmp/self-review-diff.patch` and `Read` only the changed source files individually.

If there are no commits between base and HEAD, abort: "No commits to review against `<base>` — make at least one commit on this branch."

---

## Phase 2: Load rules, hooks, architecture docs, and checklists

The review is backed by four living sources — always pull current contents:

- `.claude/rules/*.md` — all project rules
- `.claude/hooks/guard-protected-files.sh` — authoritative protected-files list
- `CLAUDE.md` — project conventions
- `docs/architecture/**` — architecture decisions, loaded contextually

### Load all project rules (dynamic — do not hardcode)

`Glob` `.claude/rules/*.md` and Read every file. Never hand-maintain the rule list here.

### Load the protected-files hook

Read `.claude/hooks/guard-protected-files.sh`. Parse its `case` statements and `if` conditions to build the authoritative protected-paths list (used in Phase 4). Never mirror it by hand.

### Load architecture docs (contextual routing)

Inspect the changed-file list and Read only the relevant docs in one parallel call.

**Baseline (always):** `CLAUDE.md`.

**Frontend changes (`apps/lfx-one/src/app/`):**

- `docs/architecture/frontend/angular-patterns.md`
- `docs/architecture/frontend/component-architecture.md`
- `docs/architecture/frontend/styling-system.md`
- If a drawer component or `DialogService.open` usage changed → `docs/architecture/frontend/drawer-pattern.md`

**Backend changes (`apps/lfx-one/src/server/`):**

- `docs/architecture/backend/README.md`
- `docs/architecture/backend/error-handling-architecture.md`
- `docs/architecture/backend/logging-monitoring.md`
- `docs/architecture/backend/server-helpers.md`

**Conditional backend docs:**

| Changed area                                   | Doc to load                        |
| ---------------------------------------------- | ---------------------------------- |
| Auth / OIDC / `middleware/auth*`               | `backend/authentication.md`        |
| Impersonation helpers (`auth-helper`, persona) | `backend/impersonation.md`         |
| `/public/**` routes, public meetings           | `backend/public-meetings.md`       |
| Pagination helpers, list endpoints             | `backend/pagination.md`            |
| `ai.service.ts`, AI proxy calls                | `backend/ai-service.md`            |
| `nats.service.ts`, project NATS RPCs           | `backend/nats-integration.md`      |
| `snowflake.service.ts`, direct SQL             | `backend/snowflake-integration.md` |
| SSR / `server.ts` / render pipeline            | `backend/ssr-server.md`            |

**Shared package (`packages/shared/`):** `docs/architecture/shared/package-architecture.md`.

**E2E or `*.spec.ts` changed:** `docs/architecture/testing/e2e-testing.md` + `docs/architecture/testing/testing-best-practices.md`.

### Load domain checklists

Read the four bundled checklists in `references/` (symlinked from `/lfx-review-pr`):

- `references/frontend-checklist.md`
- `references/backend-checklist.md`
- `references/shared-and-sql-checklist.md`
- `references/docs-checklist.md`

Every finding must trace back to a documented rule, hook, architecture doc, or checklist. If you cannot quote the source, drop the finding.

---

## Phase 3: Validate local PR-shape sanity

Build a metadata-checks table. Each item below is one row.

1. **Branch name format** — must match `<type>/LFXV2-<number>` per `.claude/rules/commit-workflow.md`. Non-conforming → **SHOULD_FIX**.

2. **JIRA ticket reference** — at least one commit message must include a `LFXV2-XXX` reference. Extract with `grep -oE 'LFXV2-[0-9]+'` over the commit subjects + bodies from Phase 1. None → **SHOULD_FIX**.

3. **Conventional commit format** — every commit subject must match `type(scope): description`, lowercase, valid type per commitlint (`@commitlint/config-angular`): `feat fix docs style refactor perf test build ci revert` — **`chore` is invalid**. Header capped at 72 characters. Each violation → **SHOULD_FIX**.

4. **Branch rebased on `<base>`** — `git merge-base --is-ancestor <base> HEAD`. Non-zero exit → **SHOULD_FIX**: needs rebase.

5. **Diff size** — if `additions > 1000`, **NIT** (informational; reviewers expect a justification in the PR body or a split).

6. **DCO + GPG signing on every commit** — from `git log --format='%G? %h %s' <base>..HEAD`, acceptable signature codes are `G` (good) or `U` (good, untrusted key). `N` / `B` / `E` → **CRITICAL**: unsigned commit. Then confirm each commit body contains a `Signed-off-by:` trailer; missing trailer → **CRITICAL**: DCO sign-off missing.

Table format:

```markdown
| Check               | Status | Detail                          |
| ------------------- | ------ | ------------------------------- |
| Branch name         | PASS   | feat/LFXV2-1234                 |
| JIRA ticket         | PASS   | Found LFXV2-1234 in commits     |
| Conventional commit | PASS   | All 3 commits valid             |
| Branch rebased      | PASS   | origin/main is an ancestor      |
| Diff size           | PASS   | 342 additions                   |
| DCO + GPG signing   | PASS   | 3/3 commits signed + signed-off |
```

---

## Phase 4: Flag protected-file touches

Cross-reference the changed-file list against the protected-paths list parsed in Phase 2. For each match, emit a **NIT** finding citing the hook's warning reason: "This file is part of core infrastructure — requires extra review scrutiny. Surface it in the PR description and tag a code owner."

If no protected files were touched, note "None modified" and move on.

---

## Phase 5: Run code-standards enforcement against every changed file

For each changed source file (`.ts`, `.html`, `.scss`, `.md`, `.sql`):

1. `Read` the file at HEAD (you are on the branch already).
2. Cross-check against every loaded rule (`.claude/rules/*.md`) and against the enforcement playbook already in the agent's system prompt.
3. Cross-check against the relevant domain checklist:
   - Frontend (`apps/lfx-one/src/app/**`) → `references/frontend-checklist.md`
   - Backend (`apps/lfx-one/src/server/**`) → `references/backend-checklist.md`
   - Shared / SQL (`packages/shared/**`, Snowflake) → `references/shared-and-sql-checklist.md`
   - `docs/**` → `references/docs-checklist.md`

### Finding format (JSON)

Collect findings as a JSON array — one element per violation:

```json
[
  {
    "file": "apps/lfx-one/src/server/services/foo.ts",
    "line": 42,
    "severity": "CRITICAL | SHOULD_FIX | NIT",
    "rule": "<rule-file>:<section>",
    "message": "...",
    "suggestion": "..."
  }
]
```

### Severity calibration (review-specific — overrides the agent's default)

- **CRITICAL** — runtime bugs, security issues, M2M in protected routes, SQL bind mismatches, upstream contract violations that will fail at runtime, `as unknown as` casts, raw `new Error()` / manual `res.status().json()` for errors, bypassed user authorization, missing `getEffectiveEmail(req)`, unsigned commits, missing DCO trailer.
- **SHOULD_FIX** — documented style/structure violations (component section order, logger usage, license headers, PrimeNG wrappers, `@if`/`@for` over `*ngIf`/`*ngFor`, `inject()` over constructor DI, `page_size` over `limit`), conventional-commit format violations, branch-name non-conformance, missing JIRA reference, branch not rebased.
- **NIT** — preferences, minor improvements, file naming, protected-file awareness, PR size over the 1000-line target.

### Known false positives — DO NOT flag

- Missing `ChangeDetectionStrategy.OnPush` — the app uses stable zoneless change detection.
- Missing `standalone: true` — Angular 20+ defaults to standalone.
- `provideZonelessChangeDetection()` flagged as experimental — it is stable in Angular 20.
- Findings whose `rule` field cannot be quoted from a loaded rule file, hook, checklist, or architecture doc — drop them. Hallucinated rules are worse than missed ones.

---

## Phase 6: Validate upstream API contracts (skip if no backend changes)

**Skip this phase entirely if no files under `apps/lfx-one/src/server/` were changed.**

For each changed backend service or controller that makes proxy calls, identify the target upstream service and fetch its OpenAPI spec:

```bash
gh api repos/linuxfoundation/<repo>/contents/gen/http/openapi3.yaml \
  --jq '.content' | base64 -d
```

**Repo map:**

| Domain        | Repo                          |
| ------------- | ----------------------------- |
| Queries       | `lfx-v2-query-service`        |
| Projects      | `lfx-v2-project-service`      |
| Meetings      | `lfx-v2-meeting-service`      |
| Mailing Lists | `lfx-v2-mailing-list-service` |
| Committees    | `lfx-v2-committee-service`    |
| Voting        | `lfx-v2-voting-service`       |
| Surveys       | `lfx-v2-survey-service`       |

**Validate per upstream call:**

1. Endpoint path exists in the spec.
2. HTTP method (GET/POST/PUT/DELETE) matches.
3. Request body / query params field names + types match the schema.
4. Response shape matches the TypeScript interface used in the service/controller.
5. Query Service pagination uses `page_size` (NOT `limit`) and `page_token` for cursor pagination.

For direct Snowflake SQL (not proxy calls): verify every `?` placeholder has a corresponding value in the binds array, in the correct order. Bind mismatch → **CRITICAL**.

If `gh api` fails (404, auth, network), include a **WARNING** in the report: "Upstream API contract for `<service>` could not be verified — manual validation required." An unverified contract is **not** a passing check.

---

## Phase 7: Compile and emit the findings report

Assemble a single report printed to the terminal in this exact structure:

```markdown
# LFX Self-Serve Self-Review

**Branch:** `<current-branch>` → `<base>`
**Files changed:** N | **Additions:** +A | **Deletions:** -D
**Verdict:** NOT READY | READY WITH CHANGES | READY

## 1. Local PR-shape sanity
<table from Phase 3>

## 2. Protected files touched
<list with hook reasons, or "None modified">

## 3. Upstream API validation
<results from Phase 6, or "Skipped — no backend changes">

## 4. Findings

### 🔴 Critical (N)
- `<file>:<line>` — <message>. Source: `<rule>`. Fix: <suggestion>.

### 🟡 Should fix (N)
- ...

### 🔵 Nit (N)
- ...

## 5. Verdict reasoning
- <one line per CRITICAL plus a roll-up>
```

### Verdict rules

- **NOT READY** — any CRITICAL finding, any unsigned commit, or any confirmed upstream contract mismatch (not just unverified).
- **READY WITH CHANGES** — zero CRITICAL; SHOULD_FIX findings present. Address them or explicitly document the trade-off in the PR description.
- **READY** — zero CRITICAL, zero SHOULD_FIX. NITs are fine to carry forward.

### Extra user instructions

If the user passed extra instructions after the base-branch (e.g. "focus on backend"), prioritize those areas but still execute every phase. Note in the report header that extra focus was applied.
