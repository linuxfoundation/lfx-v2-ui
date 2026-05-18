---
description: Guides Claude to suggest the right skill based on user intent
paths:
  - '*'
---

# Available Skills

This project has guided skills for common workflows. **Proactively suggest the relevant skill** when a user's request matches one of these:

| Skill                            | When to Suggest                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `/setup`                         | Getting started, first-time setup, broken environments, install failures, missing env vars, 1Password, how to run the app             |
| `/develop`                       | Add a feature, fix a bug, modify code, create components/services/endpoints/types, refactor, build, implement any code change         |
| `/lfx-self-serve-self-review`    | Before pushing or opening a PR — code-convention audit via the lfx-self-serve-code-reviewer agent (rules, checklists, upstream API)        |
| `/lfx-self-serve-pr-readiness`   | Before pushing or opening a PR — PR-shape sanity (branch, JIRA, commits, DCO+GPG) + bot-reviewer simulation. Run alongside self-review |
| `/preflight`                     | Mechanical pre-PR checks — license headers, format, lint, build, protected files, commit signoff                                      |
| `/lfx-review-pr`                 | Review an **existing** PR by number — audit a PR's diff, validate against standards, draft inline comments                            |

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

**`/lfx-self-serve-self-review`** — match any of these intents (development is finished but no PR is open yet; code-convention focus):

- "Ready for PR", "Is my branch ready?", "Review my work"
- "Before I open a PR", "Audit my changes", "Self-review"
- "Check this branch", "Validate my diff"
- Any "is this ready" question where there is no PR number

Suggest **both** `/lfx-self-serve-self-review` AND `/lfx-self-serve-pr-readiness` — they're sibling pre-PR audits and the work-cycle gate requires both.

**`/lfx-self-serve-pr-readiness`** — match any of these intents (development is finished but no PR is open yet; PR-shape + bot focus):

- "PR readiness", "Is this ready to be a PR?"
- "Check PR shape", "Validate my commits", "Are my commits signed?"
- "What would CodeRabbit flag?", "What would Copilot say?", "Bot review check"
- "Did I forget the JIRA ticket?", "Is my branch named right?"
- Suggest alongside `/lfx-self-serve-self-review` for any "is this ready" question pre-PR

**`/preflight`** — match any of these intents (mechanical checks; usually after both pre-PR review skills):

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
- After any development work is complete, remind them to run BOTH `/lfx-self-serve-self-review` AND `/lfx-self-serve-pr-readiness`, then `/preflight`, before creating a PR
- If you are unsure which skill applies, ask the user what they're trying to accomplish
- When a skill references architecture docs in `docs/`, read those docs before generating code — they are the source of truth
