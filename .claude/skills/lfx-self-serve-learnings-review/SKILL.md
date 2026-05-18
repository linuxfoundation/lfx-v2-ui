---
name: lfx-self-serve-learnings-review
description: >
  Pre-commit check on local lfx-self-serve work against an accumulating
  knowledge base of patterns this codebase has hit before — patterns
  flagged by CodeRabbit + Copilot in past PR review comments, patterns
  human reviewers have called out, and codebase gotchas. Also applies
  the union of CodeRabbit + Copilot's published review rubrics. Runs in
  a forked context with no subagent. Use before every commit, alongside
  /lfx-self-serve-self-review.
context: fork
allowed-tools: Bash, Read, Glob, Grep
---

# LFX Self-Serve Learnings Review

You are checking whether **local uncommitted (or about-to-be-committed) work** matches any patterns this codebase has hit before. The knowledge base is the union of:

1. **Automated review patterns** — what CodeRabbit + GitHub Copilot reliably flag on opened PRs against this repo. Empirical, sampled from PR-comment history.
2. **Human-flagged patterns** — patterns reviewers have called out in past PRs that aren't yet covered by automated tooling. (Grows over time as reviewer feedback is folded in.)
3. **Codebase gotchas** — failure modes from past incidents or post-mortems on this codebase. (Grows over time.)

The companion skill `/lfx-self-serve-self-review` handles repo-convention code review (rules / checklists / architecture / upstream API contracts / protected files) via the `lfx-self-serve-code-reviewer` agent. Both run pre-commit per the work-cycle in `CLAUDE.md`.

This skill runs `context: fork` but with **no subagent**. The entire workflow lives in this body — knowledge-base entries are consumed only by this skill, so there's no system-prompt-reuse benefit from extracting an agent. References live in `references/` and are read directly.

**Output:** structured findings report printed to the terminal with verdict `NOT READY | READY WITH CHANGES | READY`. No git mutations.

---

## ⚠ Mandatory: read these references before any audit work

Each finding you emit must trace back to a quotable item in one of these files. If you cannot quote the source, drop the finding. Hallucinated rules are worse than missed ones.

- **`.claude/skills/lfx-self-serve-learnings-review/references/review-rubric.md`** — unioned CodeRabbit + GitHub Copilot review rubric: 8 consolidated buckets, severity map (CodeRabbit's Critical/Major/Minor/Trivial → our CRITICAL/SHOULD_FIX/NIT), index into the per-category pattern files.
- **`.claude/skills/lfx-self-serve-learnings-review/references/*.md`** — per-category checklists of repo-specific empirical patterns observed in past PR comments. Each pattern cites its origin PR# + file. Read conditionally per the routing table in Phase 3.
- **`.claude/skills/lfx-self-serve-learnings-review/references/known-false-positives.md`** — applied LAST to drop findings CodeRabbit + Copilot still surface that aren't real for this codebase.

**If you emit findings without reading every reference relevant to the diff, your audit is invalid.**

---

## Phase 1 — Parse arguments

Args format: `[base-branch] [extra instructions]`.

- First token, if it looks like a ref (contains `/`, or is a plain branch name like `main`), is the base branch.
- Default base: `origin/main`.
- Everything else is extra focus (e.g. "focus on security").

## Phase 2 — Compute the local diff

```bash
git fetch origin
git rev-parse --abbrev-ref HEAD                                 # current branch
git merge-base <base> HEAD                                      # → $MB
git diff --name-only $MB..HEAD                                  # changed-file list
git diff $MB..HEAD                                              # full diff
git diff --shortstat $MB..HEAD                                  # additions/deletions
```

Also fold in staged-but-uncommitted changes for the pre-commit case:

```bash
git diff --name-only --cached                                   # staged changes
git diff --cached                                               # staged full diff
```

Audit the union of `$MB..HEAD` and the staged diff — pre-commit, the staged changes are exactly what the user is about to commit.

If both are empty, abort: "No changes to audit against `<base>`."

## Phase 3 — Load references (routed by diff)

### Always read

- `.claude/skills/lfx-self-serve-learnings-review/references/review-rubric.md`
- `.claude/skills/lfx-self-serve-learnings-review/references/known-false-positives.md`

### Conditionally read `.claude/skills/lfx-self-serve-learnings-review/references/*.md` based on changed-file paths

| Pattern file                       | Read when                                                                                                                                                                                                                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `security.md`                      | always (secrets, sanitization, auth-state leakage, untrusted cookies, untrusted URLs can hit any change)                                                                                                                                                                            |
| `typescript-correctness.md`        | any `.ts` file changed (type-soundness + async lifecycle + timer leaks)                                                                                                                                                                                                            |
| `templates-and-accessibility.md`   | any `.component.html` file changed (ARIA, semantic HTML, class-binding clobbering, `@for` track, lens param)                                                                                                                                                                       |
| `frontend-state-and-timing.md`     | any `.component.ts` / `.service.ts` under `apps/lfx-one/src/app/` (signals ↔ observables timing)                                                                                                                                                                                  |
| `server-request-handling.md`       | `app.config.ts`, anything under `app/shared/guards/` or `app/shared/interceptors/`, any `*.routes.ts`, any new file under `apps/lfx-one/src/server/routes/`, `apps/lfx-one/src/server/server.ts`, `middleware/auth*`, or any file under `server/controllers/` or `server/services/` |
| `observability-and-logging.md`     | `apps/lfx-one/otel.mjs`, `apps/lfx-one/src/server/middleware/rate-limit.ts`, new route registrations in `server.ts`, or any file using `logger.info` / `logger.warning` / `logger.debug`                                                                                            |
| `data-and-snowflake.md`            | `apps/lfx-one/src/server/services/snowflake.service.ts` or any file with direct Snowflake SQL                                                                                                                                                                                      |
| `code-truthiness.md`               | any JSDoc / inline comment, anything under `docs/**`, or any new feature module / service / component without a matching `*.spec.ts`                                                                                                                                              |

The table is a guideline. When in doubt, read the file. Reading too much wastes context; missing a relevant pattern means a missed finding.

## Phase 4 — Knowledge-base pass

For each `<category>.md` file loaded in Phase 3:

1. Walk every pattern in the file against the diff (Phase 2 outputs, plus targeted `Read` of changed files for line-level detail).
2. For each match, emit a finding:

```json
{
  "file": "<path>",
  "line": <line>,
  "severity": "CRITICAL | SHOULD_FIX | NIT",
  "rule": "<category>/<pattern-id>",
  "message": "...",
  "suggestion": "..."
}
```

Each pattern's default severity is set in its pattern file; deviate only with reasoning (e.g., the same `any` cast might be CRITICAL in a security-sensitive path and SHOULD_FIX elsewhere).

## Phase 5 — Cross-check discipline

Every finding must quote the specific pattern in a `<file>.md` file. If you cannot quote the source, drop the finding.

If you couldn't read a reference that the Phase 3 routing said you should have, return `status: incomplete` rather than ship a partial verdict.

## Phase 6 — Apply known false positives

Read `.claude/skills/lfx-self-serve-learnings-review/references/known-false-positives.md`. For each Phase 4 finding, check whether it matches a documented false-positive pattern. Drop matches.

## Phase 7 — Render the report

Print to terminal — no `/review` chaining, no `gh pr ...` mutation.

```markdown
# LFX Self-Serve Learnings Review

**Branch:** `<current-branch>` → `<base>`
**Files changed:** N | **Additions:** +A | **Deletions:** -D
**Verdict:** NOT READY | READY WITH CHANGES | READY

## Findings against the knowledge base

Grouped by severity. Each finding cites its pattern source.

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
- **READY** — zero CRITICAL, zero SHOULD_FIX. NITs fine to carry forward.

### Extra user instructions

If the user passed extra instructions after the base-branch (e.g. "focus on security"), prioritise those categories. Note in the report header that extra focus was applied.

---

## References used

- **`.claude/skills/lfx-self-serve-learnings-review/references/review-rubric.md`** — unioned CodeRabbit + Copilot rubric + severity map
- **`.claude/skills/lfx-self-serve-learnings-review/references/*.md`** — 8 per-category empirical-pattern checklists (read conditionally per Phase 3 routing)
- **`.claude/skills/lfx-self-serve-learnings-review/references/known-false-positives.md`** — applied LAST to drop known false matches

## Companion skills

- `/lfx-self-serve-self-review` — code-convention audit via the `lfx-self-serve-code-reviewer` agent. Run alongside this one before every commit.
- `/lfx-self-serve-pr-readiness` — PR-shape sanity (branch, JIRA, commits, DCO + GPG, rebase, diff size). Run once before opening the PR.
- `/preflight` — mechanical checks (license, format, lint, build, protected files). Run after the pre-PR readiness pass.
- `/lfx-review-pr` — post-PR reviewer flow. Not part of pre-PR; CodeRabbit and Copilot will do their automated review pass on the opened PR themselves.
