---
name: lfx-self-serve-learnings-review
description: >
  Pre-commit code review of local lfx-self-serve work — runs a
  comprehensive code-review rubric against the diff, cross-checked
  against this repo's empirical-pattern knowledge base. Use before
  every commit, alongside /lfx-self-serve-self-review.
context: fork
agent: bot-rubric-agent
allowed-tools: Bash, Read, Glob, Grep
---

# LFX Self-Serve Learnings Review

Conduct a comprehensive code review of the local diff using the rubric in your system prompt (review areas, severity scale, output format), layered with this repo's empirical-pattern knowledge base. This skill body provides the diff and the relevant KB context; your system prompt provides the review approach.

The companion skill `/lfx-self-serve-self-review` handles repo-convention code review (rules / checklists / architecture / upstream API contracts / protected files) via the `lfx-self-serve-code-reviewer` agent. Both run pre-commit per the work-cycle in `CLAUDE.md`.

**Output:** structured findings report printed to the terminal with verdict `NOT READY | READY WITH CHANGES | READY`. No git mutations.

---

## ⚠ Mandatory: read ONLY the pattern files relevant to the diff

Each finding tied to a pattern entry must trace back to a quotable item in a pattern file. If you cannot quote the source, drop the finding. Hallucinated rules are worse than missed ones.

**Always read:**

- **`.claude/skills/lfx-self-serve-learnings-review/references/known-false-positives.md`** — applied LAST to drop findings the rubric still surfaces but aren't real for this codebase.

**Conditionally read** the per-category pattern files in `.claude/skills/lfx-self-serve-learnings-review/references/` — **only** the ones whose "Read when" condition matches the changed-file paths in the diff (routing table in Phase 3 below). Each pattern entry cites its origin PR# + file.

**Do NOT read pattern files whose condition does not match the diff** — that's wasted context with no audit value. If a row in the routing table doesn't apply, skip it.

**If you emit findings without reading the pattern files that DO apply to the diff, your audit is invalid.**

---

## Phase 1 — Parse arguments

Args format: `[base-branch] [extra instructions]`.

- First token, if it looks like a ref (contains `/`, or is a bare branch name like `main`), is the base.
- Default base: `origin/main`.
- Everything else is extra focus (e.g. "focus on security", "focus on the new SSE endpoint").

## Phase 2 — Compute the local diff

**Normalize `<base>` first:** if it contains no `/` (e.g., bare `main`), prefix with `origin/` so the comparison runs against the freshly-fetched remote ref rather than a possibly-stale local branch.

```bash
git fetch origin
git rev-parse --abbrev-ref HEAD                                 # current branch

# Committed work since base (three-dot = merge-base..HEAD):
git diff --name-only <base>...HEAD                              # changed-file list
git diff <base>...HEAD                                          # full diff
git diff --shortstat <base>...HEAD                              # additions/deletions
```

Also fold in staged-but-uncommitted changes for the pre-commit case:

```bash
git diff --name-only --cached                                   # staged changes
git diff --cached                                               # staged full diff
```

Audit the union of the committed and staged diffs — pre-commit, the staged changes are exactly what the user is about to commit.

If both are empty, abort: "No changes to audit against `<base>`."

## Phase 3 — Load pattern files (routed by diff)

### Always read

- `.claude/skills/lfx-self-serve-learnings-review/references/known-false-positives.md`

### Conditionally read `.claude/skills/lfx-self-serve-learnings-review/references/<category>.md` based on changed-file paths

| Pattern file                     | Read when                                                                                                                                                                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `security.md`                    | always (secrets / sanitization / auth-state leakage / untrusted cookies / untrusted URLs can hit any change)                                                                                                                                                       |
| `typescript-correctness.md`      | any `.ts` file changed                                                                                                                                                                                                                                             |
| `templates-and-accessibility.md` | any `.component.html` changed                                                                                                                                                                                                                                      |
| `frontend-state-and-timing.md`   | any `.component.ts` / `.service.ts` under `apps/lfx-one/src/app/`                                                                                                                                                                                                  |
| `server-request-handling.md`     | `app.config.ts`, `app/shared/guards/`, `app/shared/interceptors/`, any `*.routes.ts`, any new file under `apps/lfx-one/src/server/routes/`, `apps/lfx-one/src/server/server.ts`, `middleware/auth*`, or any file under `server/controllers/` or `server/services/` |
| `observability-and-logging.md`   | `apps/lfx-one/otel.mjs`, `apps/lfx-one/src/server/middleware/rate-limit.ts`, new route registrations in `server.ts`, or any file using `logger.info` / `logger.warning` / `logger.debug`                                                                           |
| `data-and-snowflake.md`          | `apps/lfx-one/src/server/services/snowflake.service.ts` or any file with direct Snowflake SQL                                                                                                                                                                      |
| `code-truthiness.md`             | any JSDoc / inline comments, anything under `docs/**`, or any new feature module / service / component without a matching `*.spec.ts`                                                                                                                              |

Read ONLY the rows whose condition matches the diff. If a row's condition doesn't apply, skip the file — don't read it.

When in doubt about a borderline row, lean toward reading — a missed pattern is worse than wasted context. But never blanket-read all 8 files "to be safe".

## Phase 4 — Review pass against the rubric + KB cross-check

For each changed file (committed or staged), apply the rubric's five review areas (from your system prompt). Where a finding matches a pattern entry from the files loaded in Phase 3, cite the pattern's rule ID (e.g., `security/secrets-in-diff`). Where a finding matches a review area but not any pattern entry, cite `<area>/<short-id>` (e.g., `code-quality/dead-code`).

Each pattern file entry uses this format:

```text
## `<category>/<pattern-id>` — CRITICAL | SHOULD_FIX | NIT

**Pattern:** what it looks like.
**Detect:** how to spot it.
**Empirical citation:** PR #X file:line — "<quote>".
**Failure message:** message to emit.
**Fix:** how to fix.
```

Each pattern's default severity is set in the file; deviate only with reasoning (e.g., the same `any` cast might be CRITICAL in a security-sensitive path and SHOULD_FIX elsewhere).

## Phase 5 — Cross-check discipline

A finding tied to a pattern file MUST quote the specific entry (rule ID + a phrase from `**Pattern:**` or `**Detect:**`). Drop hallucinated matches.

A generic-area finding must cite file + line and clearly identify which sub-rule of the review area it violates.

If you couldn't read a reference that the Phase 3 routing said you should have, return `incomplete: true` rather than ship a partial verdict.

## Phase 6 — Apply known false positives

Walk `known-false-positives.md`. Drop any finding that matches a documented false-positive pattern. The false-positive list wins over both pattern matches and generic-area findings.

## Phase 7 — Apply extra focus

If the user passed extra focus (Phase 1), prioritise those areas. Don't suppress other findings — extra is a priority hint, not a filter.

## Phase 8 — Render the report

Print to terminal — no `/review` chaining, no `gh pr ...` mutation.

```markdown
# LFX Self-Serve Learnings Review

**Branch:** `<current-branch>` → `<base>`
**Files changed:** N | **Additions:** +A | **Deletions:** -D
**Verdict:** NOT READY | READY WITH CHANGES | READY

## Findings

Grouped by severity. Each finding cites its rule.

### 🔴 Critical (N)

- `<file>:<line>` — <message>. Source: `<rule>`. Fix: <suggestion>.

### 🟡 Should fix (N)

- ...

### 🔵 Nit (N)

- ...

## Verdict reasoning

<one line per CRITICAL plus a roll-up>
```

### Verdict rules

- **NOT READY** — any CRITICAL finding (secrets / SQL injection / auth bypass / etc.).
- **READY WITH CHANGES** — zero CRITICAL; SHOULD_FIX findings present. Address or document the trade-off in the commit body / PR description.
- **READY** — zero CRITICAL, zero SHOULD_FIX. NITs are fine to carry forward.

### Incomplete audits

If `incomplete: true`, surface this prominently — the verdict is unreliable. The user should rerun once the underlying issue (missing pattern file, unreadable diff) is resolved.

---

## References used

- **`bot-rubric-agent` system prompt** — review areas, severity scale, output format, cross-check discipline (loaded ambiently as the agent backing this skill)
- **`.claude/skills/lfx-self-serve-learnings-review/references/<category>.md`** — 8 per-category empirical-pattern files (read conditionally per Phase 3 routing)
- **`.claude/skills/lfx-self-serve-learnings-review/references/known-false-positives.md`** — applied LAST to drop known false matches

## Companion skills

- `/lfx-self-serve-self-review` — code-convention audit via the `lfx-self-serve-code-reviewer` agent. Run alongside this one before every commit.
- `/lfx-self-serve-pr-readiness` — PR-shape sanity (branch, JIRA, commits, DCO + GPG, rebase, diff size). Run once before opening the PR.
- `/preflight` — mechanical checks (license, format, lint, build, protected files). Run after the pre-PR readiness pass.
- `/lfx-review-pr` — post-PR reviewer flow. Not part of pre-PR; CodeRabbit and Copilot will do their automated review pass on the opened PR themselves.
