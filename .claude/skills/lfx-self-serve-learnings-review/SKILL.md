---
name: lfx-self-serve-learnings-review
description: "Post-commit empirical-pattern review for lfx-self-serve. Matches the diff against `docs/reviews/knowledge-base/` — patterns extracted from past PR review comments on this repo. Findings are gated by KB matches: every finding must quote a pattern entry; unsourced findings are dropped. Skill body launches a code-reviewer subagent in the background that renders a markdown review of the cumulative branch state."
allowed-tools: Agent
---

Launch a subagent in the background (`subagent_type: code-reviewer`, `run_in_background: true`) with the **entire content below** as the Agent `prompt` parameter. Append the caller's runtime args (`base`, `extra`) at the end so the subagent sees both the playbook and its inputs.

**Launcher discipline — non-negotiable:** pass the playbook **verbatim**. The playbook contains its own routing logic (Step 2 picks which pattern files in `docs/reviews/knowledge-base/` to load based on changed paths). Trimming it strips routing → the subagent can't quote pattern entries that weren't loaded → Step 3's KB-match gate collapses → Step 4 false-positive filtering breaks → severity (taken per-entry) and the report template drift.

---

# LFX Self-Serve Learnings Reviewer

You match a local git diff against the empirical pattern knowledge base in `docs/reviews/knowledge-base/`. Each pattern entry was extracted from a real PR review comment on this repo. **Findings are gated by KB matches:** every emitted finding must quote a pattern entry's rule ID + a phrase from its `**Pattern:**` or `**Detect:**` clause. If you can't quote, you drop.

Generic-rubric findings (security / performance / quality / architecture / testing intuitions not grounded in a KB entry) belong to `/lfx-self-serve-code-review`, which audits the documented rule surface. You cover the empirical surface — the patterns the bots and human reviewers have actually flagged.

## Inputs

Parse the caller's prompt for:

- **`base: <ref>`** — base branch to compare against (default `origin/main`). If `<base>` contains no `/` (bare `main`), prefix with `origin/` so the comparison runs against the freshly-fetched remote ref.
- **`extra: <free text>`** — optional priority hint.

## Step 1 — Compute the diff

Audit the union of (a) commits since `<base>` and (b) any staged-but-uncommitted changes. In the typical post-commit invocation the staged diff is empty (the commit cleaned it); stay robust to the mid-edit case where both are non-empty.

```bash
git fetch origin
git rev-parse --abbrev-ref HEAD                # current branch

# Committed work since base (three-dot = merge-base..HEAD):
git diff --name-only <base>...HEAD             # committed file list
git diff <base>...HEAD                         # committed full diff
git diff --shortstat <base>...HEAD             # shortstat

# Staged-but-uncommitted:
git diff --name-only --cached                  # staged file list
git diff --cached                              # staged full diff
git diff --cached --shortstat                  # shortstat
```

If both diffs are empty, render: `No changes to audit against <base>.` and stop.

If the combined diff is too large to hold in context, save to `/tmp/learnings-reviewer-diff.patch` and Read changed source files individually.

## Step 2 — Load pattern files (routed by diff)

**Always read:**

- `docs/reviews/knowledge-base/known-false-positives.md` — applied LAST (Step 4) to drop findings that aren't real for this codebase.
- `docs/reviews/knowledge-base/security.md` — secrets / sanitization / auth-state leakage / untrusted cookies / untrusted URLs can hit any change.

**Conditionally read** the per-category pattern files based on changed-file paths:

| Pattern file                     | Read when                                                                                                                                                                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `typescript-correctness.md`      | any `.ts` file changed                                                                                                                                                                                                                                             |
| `templates-and-accessibility.md` | any `.component.html` changed                                                                                                                                                                                                                                      |
| `frontend-state-and-timing.md`   | any `.component.ts` / `.service.ts` under `apps/lfx-one/src/app/`                                                                                                                                                                                                  |
| `server-request-handling.md`     | `app.config.ts`, `app/shared/guards/`, `app/shared/interceptors/`, any `*.routes.ts`, any new file under `apps/lfx-one/src/server/routes/`, `apps/lfx-one/src/server/server.ts`, `middleware/auth*`, or any file under `server/controllers/` or `server/services/` |
| `observability-and-logging.md`   | `apps/lfx-one/otel.mjs`, `apps/lfx-one/src/server/middleware/rate-limit.ts`, new route registrations in `server.ts`, or any file using `logger.info` / `logger.warning` / `logger.debug`                                                                           |
| `data-and-snowflake.md`          | `apps/lfx-one/src/server/services/snowflake.service.ts` or any file with direct Snowflake SQL                                                                                                                                                                      |
| `code-truthiness.md`             | any JSDoc / inline comments, anything under `docs/**`, or any new feature module / service / component without a matching `*.spec.ts`                                                                                                                              |

Read ONLY the rows whose condition matches. Do NOT blanket-read — wasted context with no audit value. When borderline, lean toward reading.

Each pattern entry uses this format:

```text
## `<category>/<pattern-id>` — CRITICAL | SHOULD_FIX | NIT

**Pattern:** what it looks like.
**Detect:** how to spot it.
**Empirical citation:** PR #X file:line — "<quote>".
**Failure message:** message to emit.
**Fix:** how to fix.
```

If a routed pattern file fails to load, mark the verdict **INCOMPLETE** in Step 6.

## Step 3 — KB match pass

For each pattern entry in every loaded pattern file (excluding `known-false-positives.md`):

1. **Check `**Detect:**`** — use grep / file reads as the entry directs. Don't infer the match from the `**Pattern:**` description alone; the `**Detect:**` clause is the operational rule.
2. **If matched, emit a finding:**
   - **Severity:** taken from the entry header (CRITICAL / SHOULD_FIX / NIT) — don't promote, don't demote.
   - **Rule:** the entry's full ID (e.g., `security/secrets-in-diff`).
   - **Message:** the entry's `**Failure message:**`, scoped to the specific file + line.
   - **Fix:** the entry's `**Fix:**`.
   - **Citation:** quote the entry's `**Pattern:**` or `**Detect:**` phrase that triggered the match.
3. **If you can't quote the entry, drop the finding.** The KB is the bar — no quote, no ship.

**Findings without a matching pattern entry do not ship.** Generic code-review intuition belongs to `/lfx-self-serve-code-review`.

## Step 4 — Apply known false positives

Walk `known-false-positives.md`. For each Step 3 finding, check whether it matches a documented false-positive pattern. If matched, drop. **False positives win even over quotable pattern matches** — this list is the floor.

## Step 5 — Apply extra focus

If `extra` was passed, prioritise those areas when ordering the report. Don't suppress other findings — `extra` is a priority hint, not a filter.

## Step 6 — Render the report

Print to terminal — no git mutations.

```markdown
# Post-commit learnings review (KB-matched)

**Branch:** `<current-branch>` → `<base>`
**Files changed:** N | **Additions:** +A | **Deletions:** -D
**Pattern files loaded:** <comma-separated short list>
**Verdict:** NOT READY | READY WITH CHANGES | READY | INCOMPLETE

## Findings

Each finding cites its KB rule ID and quotes the pattern entry it matched.

### 🔴 Critical (N)
- `<file>:<line>` — <message>. Source: `<rule>` ("<quoted Pattern: or Detect: phrase>"). Fix: <suggestion>.

### 🟡 Should fix (N)
- ...

### 🔵 Nit (N)
- ...

## Verdict reasoning

<one line per CRITICAL plus a roll-up>
```

If `extra` was applied, note it in the header.

## Verdict rules

- **NOT READY** — any CRITICAL.
- **READY WITH CHANGES** — zero CRITICAL; SHOULD_FIX present.
- **READY** — zero CRITICAL, zero SHOULD_FIX. NITs are fine to carry forward.
- **INCOMPLETE** — a routed pattern file couldn't be loaded; re-run once resolved.

## Scope boundaries — NOT this skill's job

- **PR-shape sanity** (branch / JIRA / commits / DCO+GPG / rebase / diff size) → `/lfx-self-serve-pr-readiness`.
- **Documented rule-surface audits** (Angular structure, repo rule files, architecture checklists, upstream API contracts, protected files) → `/lfx-self-serve-code-review`.
- **Generic code-review intuition** not grounded in a KB pattern entry → drop.

## Constraints

- Be specific — every finding cites file + line.
- Be actionable — quote the entry's `**Fix:**` directly.
- Be fair — severity is what the entry says; don't promote NITs to CRITICAL.
- Don't invent pattern matches — quote the entry's exact phrase or drop the finding.
- Don't blanket-read all pattern files — read ONLY the routed rows.
