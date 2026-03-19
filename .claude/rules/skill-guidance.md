---
description: Guides Claude to suggest the right skill based on user intent
globs: '*'
---

# Available Skills

This project has guided skills for `apps/lfx` (the primary app). **Always route through `/lfx` as the entry point** — it classifies intent and delegates to the right specialist skill.

---

## Entry Point

| Skill  | When to Suggest                                                                            |
| ------ | ------------------------------------------------------------------------------------------ |
| `/lfx` | **Always** — any request related to `apps/lfx` development, research, setup, or validation |

**`/lfx` is the default entry point for ALL work.** It auto-detects what the user needs and routes to the right specialist skill. Users never need to know about the specialist skills below.

### Trigger Phrases

- Any code change: "Add a feature", "Fix this bug", "Build a component", "Implement this Figma URL"
- Research: "What endpoints exist?", "How does X work?", "Does the API support Y?"
- Validation: "Ready for PR", "Check my code", "Preflight"
- Setup: "Set up my environment", "Install", "Getting started"

---

## Specialist Skills (routed by `/lfx` — rarely invoked directly)

| Skill                  | Purpose                                                                        |
| ---------------------- | ------------------------------------------------------------------------------ |
| `/lfx-coordinator`     | Plans and delegates code changes — routes to builder skills                    |
| `/lfx-design`          | Builds base UI components (buttons, inputs, cards) from Figma                  |
| `/lfx-research`        | Read-only exploration — upstream API validation, codebase discovery            |
| `/lfx-backend-builder` | Generates Express proxy endpoints, services, controllers, routes, shared types |
| `/lfx-ui-builder`      | Generates Angular frontend components, services, pages                         |
| `/lfx-preflight`       | Pre-PR validation — lint, build, license headers                               |
| `/lfx-setup`           | Environment setup — prerequisites, install, env vars, dev server               |

## Skill Hierarchy

```text
/lfx (entry point — classifies intent, routes)
  ├── /lfx-coordinator (plans + delegates code changes)
  │     ├── /lfx-research    (read-only exploration)
  │     ├── /lfx-design      (base UI components)
  │     ├── /lfx-ui-builder  (feature components)
  │     └── /lfx-backend-builder (Express proxy code)
  ├── /lfx-research   (direct research without building)
  ├── /lfx-preflight   (pre-PR validation)
  └── /lfx-setup       (environment setup)
```

**Key rules:**

- `/lfx` routes via Agent subagents — never inline Skill calls
- `/lfx-coordinator` delegates via Agent subagents — never writes code itself
- Builder skills (`/lfx-design`, `/lfx-ui-builder`, `/lfx-backend-builder`) are the only skills that write code
- No skill should call Figma MCP tools inline — only `/lfx-design` calls them within its Agent subprocess

## For Cowork Sessions

- Contributor describes any task → suggest `/lfx`
- After development work → remind to run `/lfx-preflight` (or let `/lfx` suggest it)
- When a skill references architecture docs in `docs/`, read those docs before generating code
