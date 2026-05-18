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

Conduct a comprehensive code review of the local diff. Your system prompt (`bot-rubric-agent`) carries the review areas, severity vocabulary, KB routing table, cross-check discipline, scope boundaries, and procedure. Follow that playbook end-to-end, then render the JSON findings as a human-readable terminal report.

The companion skill `/lfx-self-serve-self-review` handles repo-convention code review (rules / checklists / architecture / upstream API contracts / protected files) via the `lfx-self-serve-code-reviewer` agent. Both run pre-commit per the work-cycle in `CLAUDE.md`.

**Output:** structured findings report printed to the terminal with verdict `NOT READY | READY WITH CHANGES | READY`. No git mutations.

---

## Phase 1 — Parse arguments

Args format: `[base-branch] [extra instructions]`.

- First token, if it looks like a ref (contains `/`, or is a bare branch name like `main`), is the base.
- Default base: `origin/main`.
- Everything else is extra focus (e.g. "focus on security", "focus on the new SSE endpoint").

## Phase 2 — Run the bot-rubric playbook

Execute your system prompt's procedure with these inputs as the first lines of context:

```text
base: <parsed base, or origin/main>
extra: <parsed extra focus, or empty>
```

The agent will: compute the diff (committed + staged), load only the pattern files whose Read-when condition matches the changed-file paths, apply the 5 review areas with KB cross-check, drop known false positives, return JSON.

If the playbook returns `{"status": "no_changes"}`, abort the report with: "No changes to audit against `<base>`."

## Phase 3 — Render the report

Format the JSON findings into the report below. Print to the terminal — no `/review` chaining, no `gh pr ...` mutation.

```markdown
# LFX Self-Serve Learnings Review

**Branch:** `<current-branch>` → `<base>`
**Files changed:** N | **Additions:** +A | **Deletions:** -D
**Verdict:** NOT READY | READY WITH CHANGES | READY

## Findings

Grouped by severity. Each finding cites its rule (`<area-or-category>/<id>`).

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

### Extra user instructions

If extra focus was applied (echoed in the playbook output's `extra_focus_applied` field), note it in the report header.

### Incomplete audits

If the playbook returns `incomplete: true`, surface this prominently — the verdict is unreliable. The user should rerun once the underlying issue (missing pattern file, unreadable diff) is resolved.

---

## Companion skills

- `/lfx-self-serve-self-review` — code-convention audit via the `lfx-self-serve-code-reviewer` agent. Run alongside this one before every commit.
- `/lfx-self-serve-pr-readiness` — PR-shape sanity (branch, JIRA, commits, DCO + GPG, rebase, diff size). Run once before opening the PR.
- `/preflight` — mechanical checks (license, format, lint, build, protected files). Run after the pre-PR readiness pass.
- `/lfx-review-pr` — post-PR reviewer flow. Not part of pre-PR; CodeRabbit and Copilot will do their automated review pass on the opened PR themselves.
