---
description: Guides Claude to suggest the right skill or subagent based on user intent
paths:
  - '*'
---

# Available Skills and Subagents

This project has guided skills and code-review subagents for common workflows. **Proactively suggest the relevant one** when a user's request matches.

## Skills

| Skill                          | When to Suggest                                                                                                               |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `/setup`                       | Getting started, first-time setup, broken environments, install failures, missing env vars, 1Password, how to run the app     |
| `/develop`                     | Add a feature, fix a bug, modify code, create components/services/endpoints/types, refactor, build, implement any code change |
| `/lfx-self-serve-pr-readiness` | Before opening a PR — PR-shape sanity (branch, JIRA, conventional commits, rebase, DCO + GPG, diff size)                      |
| `/preflight`                   | Mechanical pre-PR checks — license headers, format, lint, build, protected files, commit signoff                              |
| `/lfx-review-pr`               | Review an **existing** PR by number — audit a PR's diff, validate against standards, draft inline comments                    |

## Post-commit review subagents (spawn via the Agent tool)

The two post-commit reviews are **subagents**, not skills — they're spawned in parallel via the Agent tool with `run_in_background: true` immediately after each commit, while you keep working on the next commit. The latest in-flight pair is drained and addressed at the PR boundary, not the commit boundary (see the work cycle in `CLAUDE.md`).

| Subagent                            | When to spawn                                                                                                                                                                                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lfx-self-serve-code-reviewer`      | Immediately after every commit — code-convention audit (`.claude/rules/`, `docs/reviews/` checklists, architecture, upstream API contracts, protected files). Use `mode: local` for the in-branch post-commit review; `mode: pr` is reserved for `/lfx-review-pr`. |
| `lfx-self-serve-learnings-reviewer` | Immediately after every commit — comprehensive code-review rubric (security, performance, code quality, architecture, testing) cross-checked against the empirical pattern KB at `docs/reviews/knowledge-base/`.                                                   |

Spawn both in parallel by issuing two Agent tool calls in a single message, each with `run_in_background: true`. Keep working on the next commit while they run. When the pair returns, roll every CRITICAL and reasonable SHOULD_FIX into the next commit. Drain the queue before opening a PR.

## Trigger Phrases

**`/setup`** — match any of these intents:

- "How do I set up?", "Getting started", "First time here"
- "yarn install fails", "corepack error", "node version"
- "env vars", "1Password", "app won't start"
- "broken environment", "fresh install", "missing dependencies"

**`/develop`** — match any of these intents:

- "Add a feature", "Create a component", "Build an endpoint"
- "Fix this bug", "Modify the service", "Update the page"
- "Refactor", "Implement", "Change the behavior"
- "New interface", "Add a filter", "Create a form"
- Describes any code change, feature request, or bug fix

**Post-commit review subagents** — match any of these intents (commit just landed, or work is wrapping up):

- "Just committed", "Review my last commit", "Review the branch"
- "Self-review", "Code-convention check", "Check this branch"
- "Validate my diff", "Audit my changes"
- "What would CodeRabbit flag?", "What would Copilot say?", "Post-commit review"
- Any "is this ready" question where no PR number is given

Spawn **both** `lfx-self-serve-code-reviewer` AND `lfx-self-serve-learnings-reviewer` in parallel via the Agent tool with `run_in_background: true` — they're the post-commit pair and the work-cycle gate requires both after every commit, drained clean before any PR opens.

**`/lfx-self-serve-pr-readiness`** — pre-PR, shape focus (run once, before opening the PR). Match any of these intents:

- "PR readiness", "Is this ready to open as a PR?"
- "Check PR shape", "Validate my commits", "Are my commits signed?"
- "Did I forget the JIRA ticket?", "Is my branch named right?"
- "Diff size OK?", "Is my branch rebased?"

**`/preflight`** — mechanical checks; usually after pr-readiness passes. Match any of these intents:

- "Run checks", "Lint and build", "Pre-PR validation"
- "Format check", "License check"
- "Check my code" when the user wants the mechanical pipeline rather than a standards audit

**`/lfx-review-pr`** — match any of these intents (an existing PR with a number):

- "Review this PR", "Check PR quality", "Audit PR #123"
- "Review #123", "Is PR #123 ready to merge?"
- Any mention of reviewing or auditing a pull request by number

## For Cowork Sessions

Non-developer contributors use these skills as guided workflows. Follow these rules:

- If the user describes a feature they want to build, suggest `/develop` — it walks them through the full process step-by-step
- If the user asks about setup or getting started, suggest `/setup`
- **After every commit**, spawn the two post-commit review subagents (`lfx-self-serve-code-reviewer` + `lfx-self-serve-learnings-reviewer`) in parallel with `run_in_background: true` — keep working on the next commit while they run. When the pair returns, roll findings into the next commit.
- **Before opening a PR**, drain the post-commit review queue (wait for the latest in-flight pair, address findings), then run `/lfx-self-serve-pr-readiness`, then `/preflight`.
- If you are unsure which workflow applies, ask the user what they're trying to accomplish.
- When a skill or subagent references architecture docs in `docs/`, read those docs before generating code — they are the source of truth.
