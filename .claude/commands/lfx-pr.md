---
description: Ship a PR for lfx-v2-ui — runs quality gates, signs commits (DCO+GPG), pushes branch, opens PR with LFXV2 linkage.
argument-hint: [optional: "<commit subject>" — if working tree has uncommitted changes]
---

# /lfx-pr — Ship a PR for lfx-v2-ui

You are running in the lfx-v2-ui monorepo. The user is invoking this command to ship the current branch as a PR. Follow these steps in order. Fail fast — stop immediately if any step fails and surface the error.

User-provided argument (if any): $ARGUMENTS

## Step 1: Pre-flight state checks

Run these in order. If any fail, stop and report:

- git rev-parse --abbrev-ref HEAD → if "main", stop: "Refusing to PR from main."
- git rev-list --count main..HEAD → if 0, stop: "No commits ahead of main."
- git status --porcelain

If git status --porcelain is non-empty:

- If user passed an argument, treat it as commit subject and proceed to Step 2
- If no argument, stop and ask for one

If working tree is clean, skip Step 2.

## Step 2: Commit (only if dirty + subject provided)

Validate subject:

- Format: <type>(<scope>): <subject> — Angular convention
- Allowed types: feat, fix, refactor, perf, test, docs, style, build, ci, revert
- Banned: chore:
- Length: ≤72 chars
- Scope: lowercase module name or shared/bff/ssr

If invalid, stop and report. Otherwise:
git add -A

# Note: -S (GPG signing) is recommended but not enforced by repo policy. Add it if you have GPG configured.

git commit --signoff -m "<subject>"

--signoff is mandatory (DCO). -S adds GPG signing — recommended but not enforced by repo policy. If --signoff fails, stop.

## Step 3: Quality gates (fail-fast)

Run sequentially, stop on first failure, surface output:
yarn check-types
yarn lint
yarn format
yarn test
yarn build

Do not auto-fix beyond what --fix flags do. Do not skip yarn build (catches SSR breaks).

## Step 4: Self-review

git diff main...HEAD — read it. Check against CLAUDE.md and .claude/rules/:

- Consider: any browser-only APIs (window, document, etc.) — if found outside isPlatformBrowser guards, flag for the user to confirm (SSR risk)
- Consider: hard-coded brand hex values — if found, suggest using lfxColors scales instead (avoids drift when LF brand updates)
- Module scope respected
- No nested ternaries
- No interface Foo {} inside apps/
- License headers on new files
- Commit messages: Angular format, ≤72, no chore:
- Every commit has Signed-off-by trailer

These are advisory checks — surface findings to the user but do not block. The user decides whether to fix before pushing.

## Step 5: Push

git push -u origin HEAD

If rejected, stop. Do not force-push. Suggest git pull --rebase origin main.

## Step 6: Open PR

Find LFXV2 ticket:

1. Branch name pattern LFXV2-XXXX
2. Commit messages
3. Ask user if neither

PR body template:

- Summary (generated from diff + commits)
- Linked ticket with JIRA URL
- Changes (grouped by module)
- How to test
- Screenshots placeholder
- Pre-merge checklist (rendered into the PR body):
  - [x] `yarn check-types` clean
  - [x] `yarn lint` clean
  - [x] `yarn test` passing
  - [x] `yarn build` passing (SSR safe)
  - [x] DCO sign-off on every commit (`--signoff`)
  - [x] Self-reviewed against `CLAUDE.md` conventions
  - [ ] CodeRabbit review addressed
  - [ ] Code-owner review (required for `lfx-preflight` protected files)
  - [ ] e2e run if UI flow changed

- Footer: 🤖 Drafted via /lfx-pr — Claude Code

gh pr create --base main --title "<first commit subject or branch name>" --body-file <body>

If gh unavailable, print branch URL + body for manual open.

## Step 7: Output

✅ PR opened
URL: <URL>
Branch: <branch>
Ticket: LFXV2-XXXX
Commits: <count>
Diff: +<add> / -<del> across <N> files

Next:

- CodeRabbit will auto-review
- Ping code-owner for lfx-preflight protected files
- Watch CI; address comments inline

## Failure handling

Enforce discipline, don't bypass it. Auto-fix OK for lint --fix and prettier. Never auto-fix: types, tests, build, conventions, missing DCO, force-push.

## When to use

✅ End of focused session, ready for review
✅ After CodeRabbit pre-review
✅ Branch represents one cohesive change

❌ Not for save-progress
❌ Not for drafts (use gh pr create --draft)
❌ Not from main, no commits, broken build
