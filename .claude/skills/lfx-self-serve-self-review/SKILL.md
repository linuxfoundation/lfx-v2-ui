---
name: lfx-self-serve-self-review
description: >
  Pre-commit self-review of local lfx-self-serve work against a target base
  branch (default origin/main). Delegates the full audit to the
  lfx-self-serve-code-reviewer subagent — diff
  computation, rule loading, code review, upstream API contract validation,
  protected-file flagging — and renders the agent's findings as a structured
  report with verdict `NOT READY | READY WITH CHANGES | READY`. PR-shape
  (branch, JIRA, commits, DCO+GPG, rebase, diff size) is NOT this skill's
  concern — that's `/lfx-self-serve-pr-readiness`. Use before every commit.
context: fork
agent: lfx-self-serve-code-reviewer
allowed-tools: Bash, Read, Glob, Grep
---

# LFX Self-Serve Pre-commit Self-Review

You are reviewing **local work that has not yet been opened as a PR** against LFX One standards. There is no `gh pr` to read — the audit operates on the local diff between the current branch and a target base (default `origin/main`).

The `lfx-self-serve-code-reviewer` agent's system prompt contains the full audit playbook (diff computation, rule loading, code review, upstream API contract validation, protected-file flagging, severity calibration, false-positive list, findings JSON format). Your job in this body is to **parse args, hand off to the agent's playbook with the right mode flag, and render the agent's JSON findings into a human-readable report.**

**Not in scope:** PR-shape sanity (branch name, JIRA, conventional commits, rebase, DCO + GPG, diff size). That's `/lfx-self-serve-pr-readiness`. The agent returns `code | upstream-api | protected-files` categories only.

**Output:** a structured findings report printed to the terminal with a verdict. No `/review` chaining, no `gh pr ...` mutation. The reviewer skill (`/lfx-review-pr`) handles the post-open lifecycle.

---

## Phase 1 — Parse arguments

Args format: `[base-branch] [extra instructions]`.

- First token, if it looks like a ref (contains `/`, or is a plain branch name like `main`), is the base branch.
- Default base: `origin/main`.
- Everything else is extra focus (e.g. "focus on backend").

## Phase 2 — Run the standards playbook

Execute your system prompt's playbook (you are the `lfx-self-serve-code-reviewer` subagent — the playbook is in scope) with these inputs as the first lines of context:

```text
mode: local
base: <parsed base, or origin/main>
extra: <parsed extra focus, or empty>
```

The playbook will:

1. Compute the local diff — union of `<base>..HEAD` and staged-but-uncommitted changes (Step 1, `mode: local` branch).
2. Load CLAUDE.md, `.claude/rules/*.md`, the protected-files hook, conditionally relevant architecture docs, and the four review checklists (Step 2).
3. Audit each changed file against all applicable rules and checklists (Steps 3–5).
4. Validate upstream API contracts for any backend changes (Step 6).
5. Flag protected files (Step 7).
6. Return a JSON array of findings with categories `code`, `upstream-api`, `protected-files` (Step 8).

Apply the severity calibration and known-false-positives discipline from the playbook. If the diff is too large to hold in context, the playbook saves it to `/tmp/standards-diff.patch` and Reads source files individually.

If both the committed and the staged diff are empty, the playbook aborts with: "No changes to review against `<base>`." Surface that abort to the user as the entire skill output.

## Phase 3 — Render the report

Format the JSON findings into the report below. Print to the terminal — no `/review` chaining, no `gh pr ...` mutation.

```markdown
# LFX Self-Serve Self-Review

**Branch:** `<current-branch>` → `<base>`
**Files changed:** N | **Additions:** +A | **Deletions:** -D
**Verdict:** NOT READY | READY WITH CHANGES | READY

## 1. Protected files touched

<list rendered from `category: protected-files` findings, each with the hook's warning reason; or "None modified">

## 2. Upstream API validation

<results rendered from `category: upstream-api` findings; or "Skipped — no backend changes">

## 3. Findings

### 🔴 Critical (N)

- `<file>:<line>` — <message>. Source: `<rule>`. Fix: <suggestion>.

### 🟡 Should fix (N)

- ...

### 🔵 Nit (N)

- ...

## 4. Verdict reasoning

<one line per CRITICAL plus a roll-up>
```

### Verdict rules

- **NOT READY** — any CRITICAL finding (e.g. confirmed upstream contract mismatch, protected file edited without code-owner review).
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
