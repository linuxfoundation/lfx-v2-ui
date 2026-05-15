---
name: lfx-self-serve-pr-readiness
description: >
  Pre-PR readiness check on local lfx-self-serve work. Audits PR-shape
  health (branch name, JIRA, conventional commits, rebase, DCO + GPG,
  diff size) AND simulates the behavioural / correctness findings
  CodeRabbit and GitHub Copilot reliably catch on this repo —
  empirical patterns from ~30 sampled PRs plus the union of their
  published rubrics. Runs in a forked context with no subagent. Use
  before opening a PR, alongside /lfx-self-serve-self-review (which
  handles code-convention audits via the code-standards-enforcer
  agent). Together the two pre-PR skills form the work-cycle gate.
context: fork
allowed-tools: Bash, Read, Glob, Grep
---

# LFX Self-Serve PR Readiness

You are checking whether **local work is ready to be opened as a PR**. The audit covers two surfaces that aren't in the code itself:

1. **PR shape** — branch name, JIRA reference in commits, conventional-commit format, rebase, DCO + GPG signing, diff size.
2. **Bot-reviewer simulation** — the behavioural / correctness patterns CodeRabbit + GitHub Copilot reliably flag on opened PRs (empirical patterns from this repo's last 2 months of bot comments, plus the union of their published review rubrics).

The companion skill `/lfx-self-serve-self-review` handles repo-convention code review via the `code-standards-enforcer` agent. That one and this one together are the pre-PR gate — both must pass before a PR opens, per the work-cycle in `CLAUDE.md`.

This skill runs `context: fork` but with **no subagent**. The entire workflow lives in this body. The reasoning: the content this skill enforces (PR-shape checks + bot rubric + common-find patterns) is consumed by only one caller (this skill itself), so there's no system-prompt-reuse benefit from extracting an agent. References live in `docs/reviews/` and are read directly.

**Output:** structured findings report printed to the terminal with verdict `NOT READY | READY WITH CHANGES | READY`. No git mutations, no PR side-effects.

---

## ⚠ Mandatory: read these references before any audit work

Each finding you emit must trace back to a quotable item in one of these files. If you cannot quote the source, drop the finding. Hallucinated rules are worse than missed ones.

- **`.claude/skills/lfx-self-serve-pr-readiness/references/pr-shape.md`** — PR-shape sanity checklist (pre-PR subset). Defines branch / JIRA / conventional-commit / rebase / DCO+GPG / diff-size checks with severity per item.
- **`.claude/skills/lfx-self-serve-pr-readiness/references/bot-rubric.md`** — unioned CodeRabbit + GitHub Copilot review rubric: 11 categories, severity map (CodeRabbit's Critical/Major/Minor/Trivial → our CRITICAL/SHOULD_FIX/NIT), index into the common-finds files.
- **`.claude/skills/lfx-self-serve-pr-readiness/references/bot-finds/*.md`** — per-category checklists of repo-specific empirical patterns observed in the last 2 months of CodeRabbit + Copilot comments. Each pattern cites its origin PR# + file. Read conditionally per the routing table in Phase 3.
- **`.claude/skills/lfx-self-serve-pr-readiness/references/known-false-positives.md`** — applied LAST to drop findings the bots still surface that aren't real for this codebase (e.g., zoneless `OnPush` flags, Angular-20 standalone defaults, prettier-on-MD nits already covered by `/preflight`).

**If you emit findings without reading every reference relevant to the diff, your audit is invalid.** The verdict will be unreliable.

---

## Phase 1 — Parse arguments

Args format: `[base-branch] [extra instructions]`.

- First token, if it looks like a ref (contains `/`, or is a plain branch name like `main`), is the base branch.
- Default base: `origin/main`.
- Everything else is extra focus (e.g. "focus on security").

## Phase 2 — Compute the local diff

Run in parallel:

```bash
git fetch origin
git rev-parse --abbrev-ref HEAD                                 # current branch
git merge-base <base> HEAD                                      # → $MB
git diff --name-only $MB..HEAD                                  # changed-file list
git diff $MB..HEAD                                              # full diff
git diff --shortstat $MB..HEAD                                  # additions/deletions
git log --format='%H %s' $MB..HEAD                              # commit subjects
git log --format='%G? %h %s' $MB..HEAD                          # signature status
git log --format=%B $MB..HEAD                                   # commit bodies (for Signed-off-by)
```

If the diff is too large to hold in context, save to `/tmp/pr-readiness-diff.patch` and Read changed source files individually as needed.

If there are no commits between base and HEAD, abort: "No commits to audit against `<base>` — make at least one commit on this branch."

## Phase 3 — Load references (routed by diff)

### Always read (regardless of diff)

- `.claude/skills/lfx-self-serve-pr-readiness/references/pr-shape.md`
- `.claude/skills/lfx-self-serve-pr-readiness/references/bot-rubric.md`
- `.claude/skills/lfx-self-serve-pr-readiness/references/known-false-positives.md`

### Conditionally read `.claude/skills/lfx-self-serve-pr-readiness/references/bot-finds/*.md` based on changed-file paths


| Bot-find file | Read when |
|---|---|
| `security.md` | always (secrets, sanitization, auth bypass can hit any change) |
| `type-safety.md` | any `.ts` file changed |
| `async-correctness.md` | any `.ts` file changed |
| `rxjs-signals-timing.md` | any `.component.ts` / `.service.ts` under `apps/lfx-one/src/app/` |
| `guards-interceptors-ordering.md` | `app.config.ts`, anything under `app/shared/guards/` or `app/shared/interceptors/`, or any `*.routes.ts` |
| `route-auth-surface.md` | any new file in `apps/lfx-one/src/server/routes/`, `apps/lfx-one/src/server/server.ts`, or `middleware/auth*` |
| `query-param-hardening.md` | any file under `apps/lfx-one/src/server/controllers/` or `apps/lfx-one/src/server/services/` |
| `snowflake-rowshape-schema.md` | `apps/lfx-one/src/server/services/snowflake.service.ts` or any file with direct Snowflake SQL |
| `template-binding-traps.md` | any `.component.html` file |
| `sanitizer-and-public-urls.md` | any frontend file using `[href]`, `bypassSecurityTrust*`, or non-http URL schemes (`webcal:`, `tel:`, `mailto:`) |
| `accessibility.md` | any `.component.html` file |
| `otel-and-rate-limit-drift.md` | `apps/lfx-one/otel.mjs`, `apps/lfx-one/src/server/middleware/rate-limit.ts`, or new route additions registered in `server.ts` |
| `log-metric-correctness.md` | any file using `logger.info` / `logger.warning` / `logger.debug` |
| `cookie-trust.md` | any backend file referencing `req.cookies` |
| `docs-comments-drift.md` | any file with JSDoc, route-mounting comments, or under `docs/**` |
| `testing.md` | any new feature module/service/component without a matching `*.spec.ts` |

The table is a guideline. When in doubt, read the file. Reading too much wastes context but missing a relevant pattern means a missed finding.

## Phase 4 — PR-shape pass

Walk every item in `.claude/skills/lfx-self-serve-pr-readiness/references/pr-shape.md` against the Phase 2 outputs. Each item produces 0 or 1 finding.

Emit each finding with `category: pr-shape`:

```json
{ "file": null, "line": null, "severity": "CRITICAL | SHOULD_FIX | NIT",
  "category": "pr-shape", "rule": "pr-shape/<item-id>",
  "message": "...", "suggestion": "..." }
```

Reference Phase 2 outputs:
- Branch name → `git rev-parse --abbrev-ref HEAD`
- JIRA reference → `grep -oE 'LFXV2-[0-9]+'` over commit subjects + bodies
- Conventional commits → check each commit subject against the regex in `pr-shape.md`
- Rebase → `git merge-base --is-ancestor <base> HEAD` exit code
- DCO + GPG → `%G?` codes + `Signed-off-by:` trailer presence per commit
- Diff size → `additions` from `git diff --shortstat`

## Phase 5 — Bot-rubric pass

For each `.claude/skills/lfx-self-serve-pr-readiness/references/bot-finds/<category>.md` file loaded in Phase 3:

1. Walk every pattern in the file against the diff (full `git diff` from Phase 2, plus targeted `Read` of changed files for line-level detail).
2. For each match, emit a finding with `category: bot-finds`:

```json
{ "file": "<path>", "line": <line>, "severity": "CRITICAL | SHOULD_FIX | NIT",
  "category": "bot-finds", "rule": "bot-finds/<category>/<pattern-id>",
  "message": "...", "suggestion": "..." }
```

Each pattern's default severity is set in its bot-finds file; deviate only with reasoning (e.g., the same `any` cast might be CRITICAL in a security-sensitive path and SHOULD_FIX elsewhere).

## Phase 6 — Cross-check discipline

Before emitting any finding, locate its anchor:

- `category: pr-shape` finding → must quote a checklist item in `.claude/skills/lfx-self-serve-pr-readiness/references/pr-shape.md`.
- `category: bot-finds` finding → must quote a specific pattern in one of the `.claude/skills/lfx-self-serve-pr-readiness/references/bot-finds/*.md` files.

If you cannot quote the source text, drop the finding.

If you couldn't read a reference that the Phase 3 routing said you should have, return `status: incomplete` rather than ship a partial verdict.

## Phase 7 — Apply known false positives

Read `.claude/skills/lfx-self-serve-pr-readiness/references/known-false-positives.md`. For each finding from Phases 4–5, check whether it matches a documented false-positive pattern. Drop matches.

## Phase 8 — Render the report

Print to terminal — no `/review` chaining, no `gh pr ...` mutation.

```markdown
# LFX Self-Serve PR Readiness

**Branch:** `<current-branch>` → `<base>`
**Files changed:** N | **Additions:** +A | **Deletions:** -D
**Verdict:** NOT READY | READY WITH CHANGES | READY

## 1. PR-shape sanity

<table from `category: pr-shape` findings; one row per check>

| Check               | Status | Detail                          |
| ------------------- | ------ | ------------------------------- |
| Branch name         | PASS   | feat/LFXV2-1234                 |
| JIRA ticket         | PASS   | Found LFXV2-1234 in commits     |
| Conventional commit | PASS   | All 3 commits valid             |
| Branch rebased      | PASS   | origin/main is an ancestor      |
| Diff size           | PASS   | 342 additions                   |
| DCO + GPG signing   | PASS   | 3/3 commits signed + signed-off |

## 2. Bot-reviewer simulation findings

Grouped by severity. Each finding cites its bot-finds source.

### 🔴 Critical (N)

- `<file>:<line>` — <message>. Source: `<rule>`. Fix: <suggestion>.

### 🟡 Should fix (N)

- ...

### 🔵 Nit (N)

- ...

## 3. Verdict reasoning

<one line per CRITICAL plus a roll-up>
```

### Verdict rules

- **NOT READY** — any CRITICAL finding (PR-shape CRITICAL = unsigned commit or missing DCO; bot-finds CRITICAL = secrets / SQL injection / auth bypass / etc.).
- **READY WITH CHANGES** — zero CRITICAL; SHOULD_FIX findings present. Address or document the trade-off in the PR description.
- **READY** — zero CRITICAL, zero SHOULD_FIX. NITs are fine to carry forward.

### Extra user instructions

If the user passed extra instructions after the base-branch (e.g. "focus on security"), prioritize those categories. Note in the report header that extra focus was applied.

---

## References used

- **`.claude/skills/lfx-self-serve-pr-readiness/references/pr-shape.md`** — PR-shape sanity checklist (pre-PR subset)
- **`.claude/skills/lfx-self-serve-pr-readiness/references/bot-rubric.md`** — unioned CodeRabbit + Copilot rubric + severity map
- **`.claude/skills/lfx-self-serve-pr-readiness/references/bot-finds/*.md`** — 16 per-category empirical-pattern checklists (read conditionally per Phase 3 routing)
- **`.claude/skills/lfx-self-serve-pr-readiness/references/known-false-positives.md`** — applied LAST to drop known false matches

## Companion skills

- `/lfx-self-serve-self-review` — code-convention audit via the `code-standards-enforcer` agent. Run alongside this one before opening a PR.
- `/preflight` — mechanical checks (license, format, lint, build, protected files). Run after both reviews pass.
- `/lfx-review-pr` — post-PR reviewer flow. Not part of pre-PR; CodeRabbit and Copilot will do the bot-review pass on the opened PR themselves.
