---
description: Guides Claude to suggest the right skill based on user intent
globs: '*'
---

# Available Skills

This project has two sets of skills — one for `apps/lfx` (new app, primary focus) and one for `apps/lfx-one` (existing app, maintenance only). **Proactively suggest the relevant skill** based on which app the user is working in.

---

## Skills for `apps/lfx` (new app — primary focus)

| Skill              | When to Suggest                                                                         |
| ------------------ | --------------------------------------------------------------------------------------- |
| `/lfx-setup`       | Getting started with `apps/lfx`, first-time setup, broken environment, install failures |
| `/lfx-coordinator` | Add a feature, fix a bug, modify code, implement anything in `apps/lfx`                 |
| `/lfx-design`      | Create a new base UI component, add a variant, work with Tailwind v4 design tokens      |
| `/lfx-research`    | Validate an upstream API, explore what endpoints exist before building                  |
| `/lfx-preflight`   | Before submitting a PR for `apps/lfx` — lint, build, license headers                    |

### Trigger Phrases (apps/lfx)

**`/lfx-coordinator`** — any code change in `apps/lfx`:

- "Add a feature", "Create a component", "Build an endpoint"
- "Fix this bug", "Modify the service", "Update the page"
- Any feature request, bug fix, or code change in the new app

**`/lfx-design`** — new base UI components:

- "Create a button/input/card/modal/badge"
- "Add a variant to the component"
- "Build a design system component"
- "Tailwind v4 component"

**`/lfx-research`** — upstream API exploration before building:

- "Does the upstream API support X?"
- "What endpoints does the committee service have?"
- "What fields are in the meeting response?"

**`/lfx-preflight`** — after work in `apps/lfx`:

- "Ready for PR", "Check my code", "Validate changes", "Lint and build"

---

## Skills for `apps/lfx-one` (existing app — maintenance only)

| Skill        | When to Suggest                                         |
| ------------ | ------------------------------------------------------- |
| `/setup`     | Getting started with `apps/lfx-one`, broken environment |
| `/develop`   | Feature or bug fix work in `apps/lfx-one`               |
| `/preflight` | Before submitting a PR for `apps/lfx-one`               |

---

## Skill Relationships (apps/lfx)

```text
/lfx-coordinator  ──delegates──▶  /lfx-research
                                  /lfx-backend-builder
                                  /lfx-ui-builder
                                  /lfx-design
```

The coordinator is the entry point for all feature work in `apps/lfx`. For anything spanning more than one layer, always use `/lfx-coordinator`.

## For Cowork Sessions

- Contributor describes a feature for `apps/lfx` → suggest `/lfx-coordinator`
- Setup questions for the new app → suggest `/lfx-setup`
- After development work in `apps/lfx` → remind to run `/lfx-preflight`
- If unsure which app → ask "Are you working in the new `lfx` app or the existing `lfx-one`?"
- When a skill references architecture docs in `docs/`, read those docs before generating code
