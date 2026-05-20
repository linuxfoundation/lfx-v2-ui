---
name: lfx-self-serve-learnings-review
description: "Post-commit empirical-pattern review for lfx-self-serve. Audits the latest commit against `docs/reviews/knowledge-base/` — patterns extracted from past PR review comments on this repo. Findings are gated by KB matches: every finding must quote a pattern entry; unsourced findings are dropped. Optionally audits the cumulative diff against a base via `base: <ref>` (used for the pre-PR full-branch sweep on multi-commit branches, and by `/lfx-review-pr`). Renders a markdown review. Skill body launches a general-purpose subagent in the background."
allowed-tools: Agent
---

Launch a subagent in the background (`subagent_type: general-purpose`, `model: "opus"`, `run_in_background: true`) with the **entire content below** as the Agent `prompt` parameter. Append the caller's runtime args (`extra`, `base`) at the end so the subagent sees both the playbook and its inputs.

The explicit `model: "opus"` pins the review to Opus (currently 4.7) — `general-purpose` has no default model, so without this it would inherit from the parent.

**Launcher discipline — non-negotiable:** pass the playbook **verbatim**. The playbook contains its own routing logic (Step 2 picks which pattern files in `docs/reviews/knowledge-base/` to load based on changed paths). Trimming it strips routing → the subagent can't quote pattern entries that weren't loaded → Step 3's KB-match gate collapses → Step 4 false-positive filtering breaks → confidence mapping and the report template drift.

---

# LFX Self-Serve Learnings Reviewer

You match the latest commit on the local branch against the empirical pattern knowledge base in `docs/reviews/knowledge-base/`. Each pattern entry was extracted from a real PR review comment on this repo. **Findings are gated by KB matches:** every emitted finding must quote a pattern entry's rule ID + a phrase from its `**Pattern:**` or `**Detect:**` clause. If you can't quote, you drop.

Generic-rubric findings (security / performance / quality / architecture / testing intuitions not grounded in a KB entry) belong to `/lfx-self-serve-code-review`, which audits the documented rule surface. You cover the empirical surface — the patterns the bots and human reviewers have actually flagged.

## Inputs

Parse the caller's prompt for:

- **`extra: <free text>`** — optional priority hint.
- **`base: <ref>`** — OPTIONAL. If passed, audit the cumulative diff between `<ref>` and HEAD (`<ref>...HEAD`) instead of the latest commit. Used for the pre-PR full-branch sweep on multi-commit branches AND by `/lfx-review-pr`.

## Step 1 — Compute the diff

Default: audit **only the latest commit** on the current branch. Do not include unstaged or staged work-in-progress — review HEAD's diff, nothing else.

```bash
git rev-parse --abbrev-ref HEAD                # current branch
git log -1 --format='%H %s'                    # commit SHA + subject (the commit under review)
git show --stat -p HEAD                        # stat header + full patch (one shot)
```

With `--stat -p`, the stat block at the top of `git show`'s output is followed by the full patch. The stat block is the canonical changed-file list — use those paths to drive Step 2's pattern-file routing. The shortstat line feeds the Step 6 report header.

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

If the diff is too large to hold in context, save to `/tmp/learnings-reviewer-diff.patch` and Read changed source files individually.

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
## `<category>/<pattern-id>` — Critical | Important | Nit

**Pattern:** what it looks like.
**Detect:** how to spot it.
**Empirical citation:** PR #X file:line — "<quote>".
**Failure message:** message to emit.
**Fix:** how to fix.
```

If a routed pattern file fails to load, mark the report **INCOMPLETE** in Step 6.

## Step 3 — KB match pass

For each pattern entry in every loaded pattern file (excluding `known-false-positives.md`):

1. **Check `**Detect:**`** — use grep / file reads as the entry directs. Don't infer the match from the `**Pattern:**` description alone; the `**Detect:**` clause is the operational rule.
2. **If matched, emit a finding** with:
   - **Confidence** derived from the entry's severity header: `Critical` → 90-100, `Important` → 80-89, `Nit` → below 80 (suppressed by the floor in Step 6).
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

Lead with what you're reviewing — `<commit-sha> — <subject>` for the default case, or `<base>...HEAD (<branch-name>, N commits)` if `base: <ref>` was passed. Then files changed, additions / deletions, and pattern files loaded.

Group findings under `### Critical (N)` (confidence 90-100) and `### Important (N)` (confidence 80-89). Each finding is a bullet of this form (parser-friendly for downstream consumers):

`- **<file>:<line>** (conf <0-100>) — <KB failure message>. _Source:_ `<rule-id>` — "<quoted Pattern: or Detect: phrase>". _Fix:_ <KB fix text>.`

Findings with confidence below 80 are suppressed.

If no findings at or above the ≥80 confidence floor exist, confirm the code meets the empirical-pattern bar with a brief summary.

If a routed pattern file couldn't be loaded, lead with `INCOMPLETE — couldn't load <file>` and recommend a re-run after the underlying issue is resolved.

If `extra` was applied, note it.

## Scope boundaries — NOT this skill's job

- **PR-shape sanity** (branch / JIRA / commits / DCO+GPG / rebase / diff size) → `/lfx-self-serve-pr-readiness`.
- **Documented rule-surface audits** (Angular structure, repo rule files, architecture checklists, upstream API contracts, protected files) → `/lfx-self-serve-code-review`.
- **Generic code-review intuition** not grounded in a KB pattern entry → drop.

## Constraints

- Be specific — every finding cites file + line.
- Be actionable — quote the entry's `**Fix:**` directly.
- Be fair — confidence is derived from the KB entry's severity header (per Step 3); don't bump it up or down based on intuition.
- Don't invent pattern matches — quote the entry's exact phrase or drop the finding.
- Don't blanket-read all pattern files — read ONLY the routed rows.
