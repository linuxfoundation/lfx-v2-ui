---
description: Guides Claude to suggest the right skill based on user intent
paths:
  - '*'
---

# Available Skills

This project has guided skills for common workflows. **Proactively suggest the relevant skill** when a user's request matches one of these:

| Skill                              | When to Suggest                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `/setup`                           | Getting started, first-time setup, broken environments, install failures, missing env vars, 1Password, how to run the app                  |
| `/develop`                         | Add a feature, fix a bug, modify code, create components/services/endpoints/types, refactor, build, implement any code change              |
| `/lfx-self-serve-self-review`      | Before every commit — code-convention audit via the lfx-self-serve-code-reviewer agent (rules, checklists, architecture, upstream API)     |
| `/lfx-self-serve-learnings-review` | Before every commit — knowledge-base audit against past-PR patterns (bot + human) and the CodeRabbit + Copilot rubrics                     |
| `/lfx-self-serve-pr-readiness`     | Before opening a PR — PR-shape sanity (branch, JIRA, conventional commits, rebase, DCO + GPG, diff size)                                   |
| `/preflight`                       | Mechanical pre-PR checks — license headers, format, lint, build, protected files, commit signoff                                           |
| `/lfx-review-pr`                   | Review an **existing** PR by number — audit a PR's diff, validate against standards, draft inline comments                                 |

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

**`/lfx-self-serve-self-review`** — pre-commit, code-convention focus. Match any of these intents:

- "Ready to commit", "About to commit", "Review my work"
- "Audit my changes", "Self-review", "Code-convention check"
- "Check this branch", "Validate my diff"
- Any "is this ready" question where no PR number is given

Suggest **both** `/lfx-self-serve-self-review` AND `/lfx-self-serve-learnings-review` together — they're the pre-commit pair and the work-cycle gate requires both before every commit.

**`/lfx-self-serve-learnings-review`** — pre-commit, knowledge-base focus. Match any of these intents:

- "Knowledge-base check", "Learnings review"
- "What would CodeRabbit flag?", "What would Copilot say?", "Bot review check"
- "Has this codebase hit this pattern before?", "Past-PR pattern check"
- Suggest alongside `/lfx-self-serve-self-review` for any pre-commit review

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
- **Before every commit**, remind them to run BOTH `/lfx-self-serve-self-review` AND `/lfx-self-serve-learnings-review`.
- **Before opening a PR**, remind them to run `/lfx-self-serve-pr-readiness`, then `/preflight`.
- If you are unsure which skill applies, ask the user what they're trying to accomplish
- When a skill references architecture docs in `docs/`, read those docs before generating code — they are the source of truth
