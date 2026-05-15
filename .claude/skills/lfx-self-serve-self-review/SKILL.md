---
name: lfx-self-serve-self-review
description: >
  Pre-PR self-review of local lfx-self-serve work against a target base branch
  (default origin/main). Delegates the full audit to the code-standards-enforcer
  subagent in a forked context — diff computation, rule loading, PR-shape
  sanity, code-standards enforcement, upstream API contract validation,
  protected-file flagging — and renders the agent's findings as a structured
  report with verdict `NOT READY | READY WITH CHANGES | READY`. Use before
  opening a PR.
context: fork
agent: code-standards-enforcer
allowed-tools: Bash, Read, Glob, Grep
---

# LFX Self-Serve Pre-PR Self-Review

You are reviewing **local work that has not yet been opened as a PR** against LFX One standards. There is no `gh pr` to read — the audit operates on the local diff between the current branch and a target base (default `origin/main`).

This skill runs in a **forked context** using the `code-standards-enforcer` subagent type. The agent's system prompt contains the full audit playbook (diff computation, rule loading, code-standards enforcement, upstream API contract validation, PR-shape sanity, protected-file flagging, severity calibration, false-positive list, findings JSON format). Your job in this body is to **parse args, hand off to the agent's playbook with the right mode flag, and render the agent's JSON findings into a human-readable report.**

**Output:** a structured findings report printed to the terminal with a verdict. No `/review` chaining, no `gh pr ...` mutation. The reviewer skill (`/lfx-review-pr`) handles the post-open lifecycle.

---

## Phase 1 — Parse arguments

Args format: `[base-branch] [extra instructions]`.

- First token, if it looks like a ref (contains `/`, or is a plain branch name like `main`), is the base branch.
- Default base: `origin/main`.
- Everything else is extra focus (e.g. "focus on backend").

## Phase 2 — Run the standards playbook

Execute your system prompt's playbook (you are the `code-standards-enforcer` subagent — the playbook is in scope) with these inputs as the first lines of context:

```
mode: local
base: <parsed base, or origin/main>
extra: <parsed extra focus, or empty>
```

The playbook will:

1. Compute the local diff (Step 1, `mode: local` branch).
2. Load CLAUDE.md, `.claude/rules/*.md`, the protected-files hook, conditionally relevant architecture docs, and the four review checklists (Step 2).
3. Audit each changed file against all applicable rules and checklists (Steps 3–5).
4. Validate upstream API contracts for any backend changes (Step 6).
5. Flag protected files (Step 7).
6. Run PR-shape sanity — branch name, JIRA, conventional commits, rebase, diff size, DCO+GPG signing (Step 8, both-modes section only).
7. Return a JSON array of findings with categories `code`, `upstream-api`, `protected-files`, `pr-shape` (Step 9).

Apply the severity calibration and known-false-positives discipline from the playbook. If the diff is too large to hold in context, the playbook saves it to `/tmp/standards-diff.patch` and Reads source files individually.

If there are no commits between base and HEAD, the playbook aborts with: "No commits to review against `<base>` — make at least one commit on this branch." Surface that abort to the user as the entire skill output.

## Phase 3 — Render the report

Format the JSON findings into the report below. Print to the terminal — no `/review` chaining, no `gh pr ...` mutation.

```markdown
# LFX Self-Serve Self-Review

**Branch:** `<current-branch>` → `<base>`
**Files changed:** N | **Additions:** +A | **Deletions:** -D
**Verdict:** NOT READY | READY WITH CHANGES | READY

## 1. PR-shape sanity

<table rendered from `category: pr-shape` findings; one row per check>

| Check               | Status | Detail                          |
| ------------------- | ------ | ------------------------------- |
| Branch name         | PASS   | feat/LFXV2-1234                 |
| JIRA ticket         | PASS   | Found LFXV2-1234 in commits     |
| Conventional commit | PASS   | All 3 commits valid             |
| Branch rebased      | PASS   | origin/main is an ancestor      |
| Diff size           | PASS   | 342 additions                   |
| DCO + GPG signing   | PASS   | 3/3 commits signed + signed-off |

(For each row, if there's a corresponding `pr-shape` finding, mark FAIL and show the finding's `message` in Detail.)

## 2. Protected files touched

<list rendered from `category: protected-files` findings, each with the hook's warning reason; or "None modified">

## 3. Upstream API validation

<results rendered from `category: upstream-api` findings; or "Skipped — no backend changes">

## 4. Findings

### 🔴 Critical (N)

- `<file>:<line>` — <message>. Source: `<rule>`. Fix: <suggestion>.

### 🟡 Should fix (N)

- ...

### 🔵 Nit (N)

- ...

## 5. Verdict reasoning

<one line per CRITICAL plus a roll-up>
```

### Verdict rules

- **NOT READY** — any CRITICAL finding (including unsigned commits, missing DCO, or confirmed upstream contract mismatch).
- **READY WITH CHANGES** — zero CRITICAL; SHOULD_FIX findings present. Address them or explicitly document the trade-off in the PR description.
- **READY** — zero CRITICAL, zero SHOULD_FIX. NITs are fine to carry forward.

### Extra user instructions

If the user passed extra instructions after the base-branch (e.g. "focus on backend"), the playbook receives them via `extra:` and prioritizes those areas. Note in the report header that extra focus was applied.

---

## References used by the agent

The agent's playbook reads these files from disk in Step 2. They're listed here for transparency; you do not Read them directly in this skill body:

- `CLAUDE.md` (project + global)
- `.claude/rules/*.md` (every rule file, globbed dynamically)
- `.claude/hooks/guard-protected-files.sh` (parsed for protected paths)
- **`docs/reviews/{backend,frontend,shared-and-sql,docs}-checklist.md`** — the primary audit surface; the agent treats these as mandatory reading whenever the matching path type is in the diff
- `docs/architecture/**` (routed conditionally by changed-file paths)
