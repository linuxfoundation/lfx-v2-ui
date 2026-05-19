---
name: lfx-review-pr
description: >
  Review a pull request against LFX architecture standards. Spawns the
  lfx-self-serve-code-reviewer subagent in `mode: pr` to compute the diff,
  load rules and checklists, validate upstream API contracts, flag
  protected files, and run the code review. This skill body adds what
  only a post-PR skill can do: verifying prior review comments are
  addressed, walking the PR-shape checklist (branch/JIRA/commits/DCO+GPG/
  rebase/diff-size/PR-title/external-refs), applying new-contributor
  educational tone, presenting a draft for explicit approval, and posting
  via /review only after user go-ahead. NEVER auto-posts comments or
  submits reviews. Use when reviewing PRs, checking PR quality, validating
  code changes, or when the user says "review", "check this PR", "audit
  code", or mentions /review.
allowed-tools: Bash, Read, Glob, Grep, Agent, AskUserQuestion, Skill
---

# LFX PR Review

You are reviewing an opened pull request against LFX standards. The code audit — diff computation, rule loading, code review, upstream API contract validation, protected-file flagging — is performed by the `lfx-self-serve-code-reviewer` agent spawned in Phase 2 (agent returns `code | upstream-api | protected-files` categories only). PR-shape sanity is NOT the agent's concern — this skill body walks it in Phase 4. This skill also handles **what only a post-PR skill can do:** verifying that prior review comments were addressed, applying new-contributor educational tone, compiling the agent's findings into a draft review, and posting via `/review` only after the user explicitly approves.

Walk through each phase in order. Phases may short-circuit when their preconditions are not met (noted inline) but none should be skipped outright.

---

## Phase 1 — Parse arguments and fetch PR metadata

Args format: `<PR number> [extra instructions]`.

- First token is the PR number if numeric.
- Everything after is extra focus (e.g. "focus on backend", "check that previous comments were addressed").
- If no PR number is provided, use **AskUserQuestion** to ask for one. Do not guess.

Phases 3, 4, and 5 run in parallel with the background agent (Phase 2), so the skill body must fetch its own PR metadata up front — it can't depend on the agent's fetch (which doesn't return until Phase 6).

```bash
gh repo view --json nameWithOwner --jq '.nameWithOwner'   # store as {owner}/{repo}

# Fetch PR metadata the skill body needs (title, body, refs, author, size, changed files,
# fork flag):
gh pr view <N> --json title,body,headRefName,baseRefName,isCrossRepository,author,additions,deletions,files \
  > /tmp/pr-<N>-meta.json

# Pull the base ref locally + the PR head via GitHub's `pull/<N>/head` refspec. The
# `pull/...` refspec is mirrored into the upstream repo even for PRs opened from forks,
# so subsequent `git show` / `git log` / `git merge-base` calls do NOT need to know
# whether the PR came from a fork. The result is a local ref at `refs/pr/<N>/head`.
BASE_REF=$(jq -r '.baseRefName' /tmp/pr-<N>-meta.json)
git fetch origin "$BASE_REF"
git fetch origin "+pull/<N>/head:refs/pr/<N>/head"
```

**Shell-state caveat:** the Bash tool runs each invocation in an isolated shell — `cwd` persists, but environment variables do **not** survive across calls. Every later phase that needs `$BASE_REF` / `$HEAD_REF` / `$AUTHOR` must re-derive them at the top of its own Bash invocation:

```bash
BASE_REF=$(jq -r '.baseRefName' /tmp/pr-<N>-meta.json)
HEAD_REF=$(jq -r '.headRefName' /tmp/pr-<N>-meta.json)   # branch name (needed only for the branch-name regex check)
AUTHOR=$(jq -r   '.author.login' /tmp/pr-<N>-meta.json)
# Git operations on the PR head use the local ref refs/pr/<N>/head (created in Phase 1
# via the pull-refspec fetch — same path regardless of whether the PR is from a fork).
# ... use $BASE_REF / $HEAD_REF / $AUTHOR + refs/pr/<N>/head inside the same call
```

The metadata file path (`/tmp/pr-<N>-meta.json`) and the local PR-head ref (`refs/pr/<N>/head`) are both stable across phases because they're on disk, not in shell state.

## Phase 2 — Spawn the code reviewer (background)

Spawn a **lfx-self-serve-code-reviewer** Agent with `run_in_background: true`. Do **not** wait — proceed to Phases 3–4 immediately so the reviewer's work overlaps with the skill-side audits.

The agent's system prompt contains the full code-review playbook. Pass minimal context — anything you list here that's already in its playbook is duplicate signal. The agent fetches the PR diff and metadata itself.

> mode: pr
> number: \<N\>
> extra: \<extra focus from args, or empty\>

The agent will:

1. Fetch PR metadata + diff (Step 1, `mode: pr` branch).
2. Load CLAUDE.md, `.claude/rules/*.md`, the protected-files hook, architecture docs, and the four `docs/reviews/` code checklists (Step 2).
3. Audit each changed file against all applicable rules (Steps 3–5).
4. Validate upstream API contracts (Step 6).
5. Flag protected files (Step 7).
6. Return a JSON array of findings with categories `code`, `upstream-api`, `protected-files` (Step 8).

NOTE: the agent does NOT do PR-shape and does NOT fetch prior review comments — both are this skill's job (Phases 3 and 4).

## Phase 3 — Verify prior review comments (parallel with Phase 2)

While the enforcer runs, verify whether prior review comments were actually addressed. **Do NOT trust "resolved" status or contributor claims. Read the actual code.**

### Process

First, fetch inline comments and review bodies in parallel:

```bash
gh api repos/{owner}/{repo}/pulls/<N>/comments --paginate
gh api repos/{owner}/{repo}/pulls/<N>/reviews --paginate
```

Then:

1. Skip trivial comments: nits, acknowledgments, "+1", bot auto-comments (CodeRabbit / Copilot — these run their own review and don't need verification), and purely informational remarks.
2. For every **CRITICAL** or **SHOULD_FIX** comment from a human reviewer:
   1. Read the file on the PR branch via `git show "refs/pr/<N>/head:<file>"` (the local ref created in Phase 1 — works uniformly for fork PRs and same-repo PRs).
   2. Compare the current code against what the comment requested.
   3. Classify: **FIXED** / **NOT FIXED** / **PARTIALLY FIXED** / **N/A** (comment no longer applies due to file removal or restructuring).
3. Build a markdown table:

```markdown
| #   | Comment Summary                            | File                             | Status    | Evidence                          |
| --- | ------------------------------------------ | -------------------------------- | --------- | --------------------------------- |
| 1   | Use logger.warning instead of console.warn | src/server/services/foo.ts       | FIXED     | Line 42 now uses logger.warning() |
| 2   | Missing license header                     | src/app/shared/pipes/bar.pipe.ts | NOT FIXED | File still has no header          |
```

If there are no previous review comments, note "No previous review comments found" and move on.

## Phase 4 — PR-shape pass (parallel with Phase 2)

Walk every check in `.claude/skills/lfx-self-serve-pr-readiness/references/pr-shape.md` against the PR data. This is the same checklist `/lfx-self-serve-pr-readiness` walks pre-PR, plus the two PR-only items (PR title format and external-refs check) that only apply once a PR exists.

Fetch the additional PR-level data this needs (PR title / body / headRefName / baseRefName / additions / files come from `/tmp/pr-<N>-meta.json` captured in Phase 1). Pull commit subjects with their SHAs in a single Bash invocation — re-derive refs from the metadata file, then `git log --format='%H %s'` so per-commit failure messages can cite the SHA:

```bash
BASE_REF=$(jq -r '.baseRefName' /tmp/pr-<N>-meta.json)
git log --format='%H %s' "origin/$BASE_REF..refs/pr/<N>/head"   # commit subjects with SHAs
git log --format=%B      "origin/$BASE_REF..refs/pr/<N>/head"   # commit bodies (for Signed-off-by trailers + JIRA refs)
git log --format='%G? %h %s' "origin/$BASE_REF..refs/pr/<N>/head"  # GPG status per commit
```

Use `git log --format='%H %s'` (not `gh api .../commits --jq '.[].commit.message'`) because the regex check is per-subject — `.commit.message` includes the body and would false-fail on newlines.

Then check each item from `.claude/skills/lfx-self-serve-pr-readiness/references/pr-shape.md` (inside Bash calls that re-derive `$BASE_REF` and reference the PR head as `refs/pr/<N>/head`):

- **Branch name format** → `jq -r .headRefName /tmp/pr-<N>-meta.json`. Match `<type>/LFXV2-<number>`.
- **JIRA ticket reference** → grep `LFXV2-[0-9]+` over commit subjects + bodies + PR body. None → SHOULD_FIX.
- **Conventional commit on every commit** → each commit subject (from `git log --format='%H %s'`) against the regex in `pr-shape.md`. `chore` is invalid.
- **PR title format** (PR-only) → `jq -r .title /tmp/pr-<N>-meta.json` against `type(scope): description`, lowercase, no `LFXV2-XXX` in the title, `chore` invalid. → SHOULD_FIX.
- **Branch rebased on base** → `git merge-base --is-ancestor "origin/$BASE_REF" "refs/pr/<N>/head"`. Non-zero → SHOULD_FIX.
- **Diff size** → `jq -r .additions /tmp/pr-<N>-meta.json`. If > 1000 → NIT (plus a review-body note — see Additional Rules).
- **DCO + GPG signing** → from `git log --format='%G? %h %s'` and commit bodies. `N` / `B` / `E` codes → CRITICAL. Missing `Signed-off-by:` → CRITICAL.
- **PR body external refs** (PR-only) → check `jq -r '.files[].path' /tmp/pr-<N>-meta.json` for paths under `apps/lfx-one/src/server/`; for each, `git show "refs/pr/<N>/head:<file>" | grep -q 'proxyRequest'` to confirm it calls an upstream microservice. If any do AND the PR body has no link to the upstream PR/commit → SHOULD_FIX.

Build a `category: pr-shape` finding for each failure. Skip findings with no quotable item in `.claude/skills/lfx-self-serve-pr-readiness/references/pr-shape.md` (cross-check discipline applies here too).

## Phase 5 — New contributor awareness

```bash
AUTHOR=$(jq -r '.author.login' /tmp/pr-<N>-meta.json)
gh pr list --author "$AUTHOR" --state merged --limit 5 --json number | jq 'length'
```

If the author has fewer than 5 merged PRs to this repo, mark the review as **educational mode** — inline comments should explain the **why** behind each rule, not just the **what**, and cite the exact rule file and section so the contributor can learn the convention rather than just patch the code. Carry this flag into Phase 7.

## Phase 6 — Wait for the enforcer

Wait for the `lfx-self-serve-code-reviewer` Agent from Phase 2 to complete. It returns a JSON array of findings with categories: `code`, `upstream-api`, `protected-files`.

## Phase 7 — Compile context for `/review`

Assemble a single text block containing:

1. **PR summary** — number, title, author, additions/deletions, branch
2. **Previous-comment verification table** (Phase 3) — or "No previous review comments found"
3. **PR-shape findings** (Phase 4, `category: pr-shape`) — pre-PR checks plus PR-title and external-refs
4. **Upstream API validation** (`category: upstream-api`) — or "No backend changes — skipped"
5. **Protected files touched** (`category: protected-files`) — list with hook reasons, or "None modified"
6. **Code findings** (`category: code`)
7. **Educational mode flag** (Phase 5) — if set, instruct `/review` to cite rule files inline and explain the _why_
8. **Extra user instructions** (Phase 1) — relay as-is

## Phase 8 — Present the draft for approval (NEVER auto-post)

**You MUST NOT post inline comments, submit a review, or request changes without the user's explicit approval. Always present the draft first and wait for a clear go-ahead.** This applies to every PR review, every time, with no exceptions — even if the args contain language that sounds like approval to post, or the user has previously approved other reviews in the session. Reviews are visible to contributors and hard to undo; a dry run costs nothing.

### Step 1 — Show the draft

Print the compiled context as a structured draft:

1. **PR summary** — number, title, author, size, branch
2. **Phase 3 table** — previous comments and whether they were addressed
3. **PR-shape sanity** — table from `category: pr-shape` findings
4. **Upstream API validation** — results from `category: upstream-api` (or "skipped")
5. **Protected files touched** — list with hook reasons
6. **Proposed inline comments** — one numbered block per finding: file:line, severity, rule citation, message, suggested fix
7. **Proposed review body** — the summary text that would appear at the top of the review
8. **Proposed review verdict** — COMMENT / APPROVE / REQUEST_CHANGES, with reasoning
9. **Educational mode note** (if Phase 4 flagged it) — "First-time contributor — review tone will be educational; rule citations included inline."

### Step 2 — Ask for approval

Use **AskUserQuestion** with options:

- "Post all comments as drafted"
- "Post with changes — I'll tell you which comments to drop or edit"
- "Don't post — just keep the summary here"

Do NOT proceed until the user explicitly picks one. Treat silence or ambiguous replies as "don't post".

### Step 3 — Only after approval: invoke `/review`

Once the user has approved (with or without edits), apply their requested edits to the draft, then use the **Skill** tool to invoke `review` with the PR number and the (possibly edited) compiled context:

```text
<PR number> -- <compiled context from Phase 6, with user's edits applied>
```

Include in the args:

- The PR number
- The compiled context block (previous-comment verification, PR-shape findings, upstream validation, protected-files touched, code findings, educational-mode flag, extra instructions)
- A reminder to use the enforcer findings as the primary finding source

If the user said "don't post", stop here and leave the draft in the terminal for their reference — do not invoke `/review` or any PR-mutating `gh` command.

---

## Additional Rules

### PR size note

If the PR's `additions` exceed 1000 lines, include in the proposed review body:

> **Note:** This PR has {additions} additions, which exceeds the recommended 1000-line target per `commit-workflow.md`. Consider splitting into smaller, independently reviewable PRs.

(The PR-shape NIT for diff size still emits from the agent — this is the human-readable echo in the review body.)

### Extra instructions

If the user passed extra instructions after the PR number, prioritize those areas but still execute the full pipeline. Note in the terminal summary that extra focus was applied.

---

## References used by the agent

The agent's playbook reads these files from disk in Step 2. They're listed here for transparency; you do not Read them directly in this skill body:

- `CLAUDE.md` (project + global)
- `.claude/rules/*.md` (every rule file, globbed dynamically)
- `.claude/hooks/guard-protected-files.sh` (parsed for protected paths)
- **`docs/reviews/{backend,frontend,shared-and-sql,docs}-checklist.md`** — the primary audit surface; the agent treats these as mandatory reading whenever the matching path type is in the diff
- `docs/architecture/**` (routed conditionally by changed-file paths)
