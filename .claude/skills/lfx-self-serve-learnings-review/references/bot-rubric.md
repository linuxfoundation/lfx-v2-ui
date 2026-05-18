# Bot-reviewer rubric (unioned CodeRabbit + GitHub Copilot)

This file is the umbrella for the knowledge-base audit that `/lfx-self-serve-learnings-review` performs. It defines:

1. The **8 consolidated review buckets** (originally 11 unioned categories from CodeRabbit's wrapped tools and Copilot's documented code-reviewer instructions, folded into 8 routing-friendly files).
2. The **severity vocabulary mapping** from CodeRabbit's tags to our `CRITICAL / SHOULD_FIX / NIT`.
3. **Pointers to the `pr-knowledge/*.md` files** where the actual repo-specific patterns live.
4. **Behavioural guidance** the bot-rubric pass should follow.

This file is itself not a finding source — empirical patterns are in `pr-knowledge/`. This file is the index and the calibration.

---

## Severity mapping

| CodeRabbit | Ours | Reasoning |
|---|---|---|
| 🔴 Critical | CRITICAL | Direct match |
| 🟠 Major | CRITICAL or SHOULD_FIX | Case-by-case — security / data-integrity → CRITICAL, structural → SHOULD_FIX |
| 🟡 Minor | SHOULD_FIX | Direct match |
| 🔵 Trivial / 🧹 Nitpick | NIT | Direct match |
| ⚪ Info | **drop** | Not actionable |

Copilot publishes no severity vocabulary. Default Copilot findings to **SHOULD_FIX**, except when the pattern is in `pr-knowledge/security.md`, on an async / error-handling path in `pr-knowledge/typescript-correctness.md` or `pr-knowledge/server-request-handling.md`, or on a framework-specific runtime-breakage path (auth-ordering, guard-ordering, signals-timing) — those default to **CRITICAL**.

---

## The 8 pr-knowledge files

| # | File | Read when | Absorbs (originally) |
|---|---|---|---|
| 1 | `pr-knowledge/security.md` | always | security + sanitizer-and-public-urls + cookie-trust |
| 2 | `pr-knowledge/typescript-correctness.md` | any `.ts` file changed | type-safety + async-correctness |
| 3 | `pr-knowledge/templates-and-accessibility.md` | any `.component.html` changed | accessibility + template-binding-traps |
| 4 | `pr-knowledge/frontend-state-and-timing.md` | any `.component.ts` / `.service.ts` under `apps/lfx-one/src/app/` | rxjs-signals-timing |
| 5 | `pr-knowledge/server-request-handling.md` | `app.config.ts`, `app/shared/guards/`, `app/shared/interceptors/`, any `*.routes.ts`, new route files in `src/server/routes/`, controllers, services | route-auth-surface + guards-interceptors-ordering + query-param-hardening |
| 6 | `pr-knowledge/observability-and-logging.md` | `otel.mjs`, `middleware/rate-limit.ts`, new route additions, files using `logger.info` / `logger.warning` / `logger.debug` | otel-and-rate-limit-drift + log-metric-correctness |
| 7 | `pr-knowledge/data-and-snowflake.md` | `snowflake.service.ts` or any file with direct Snowflake SQL | snowflake-rowshape-schema |
| 8 | `pr-knowledge/code-truthiness.md` | any JSDoc / inline comments / `docs/**`; any new feature module / service / component without `*.spec.ts` | docs-comments-drift + testing |

(The original CodeRabbit + Copilot taxonomy had separate "Performance", "Error handling", "Resource lifecycle", and "Code quality" buckets. Those categories had insufficient empirical evidence on this codebase to warrant their own files; their patterns are folded into the 8 above. Split out later if volume justifies it.)

---

## Behavioural guidance for the bot-rubric pass

1. **Repo-specific empirical evidence over generic best-practice.** Every pattern in `pr-knowledge/*.md` cites the PR# where CodeRabbit or Copilot flagged it on this codebase. Patterns without a citation should not be added — generic "Angular best practice" lists drift into noise.

2. **Severity is per-pattern, not per-category.** Each pattern in a `pr-knowledge/<file>.md` declares its own default severity. The category is for routing/loading, not severity assignment.

3. **Apply `known-false-positives.md` LAST.** A finding can match a pr-knowledge pattern AND a known-false-positive. The false-positive list wins.

4. **Distinguish "the bots flagged this" from "we agree with the bots."** A pattern lives in `pr-knowledge/` because the bots reliably catch it AND we agree it matters. Patterns the bots flag that we've decided aren't relevant for this codebase belong in `known-false-positives.md` instead.

5. **Cross-check discipline.** Every finding must quote the specific pattern in a `pr-knowledge/<file>.md` file. If you cannot quote the source, drop the finding. Hallucinated rules — especially "generic" bot-style suggestions that aren't in any file — are worse than missed ones.

---

## What this rubric explicitly does NOT cover

- **Code-convention violations** (Angular component structure, logger usage, `inject()` vs constructor DI, `@if`/`@for` over `*ngIf`/`*ngFor`, etc.) → these are in `.claude/rules/` and `docs/reviews/{frontend,backend,shared-and-sql,docs}-checklist.md`, enforced by `/lfx-self-serve-self-review` via the `lfx-self-serve-code-reviewer` agent.
- **Upstream API contract validation** → also in the `lfx-self-serve-code-reviewer` agent.
- **Protected-files flagging** → also in the agent.
- **PR-shape sanity** → in `.claude/skills/lfx-self-serve-pr-readiness/references/pr-shape.md`, walked by `/lfx-self-serve-pr-readiness` and `/lfx-review-pr`.

This rubric covers the *behavioural / correctness* patterns that CodeRabbit and Copilot catch which our rule library doesn't — the empirical signal accumulated from watching what they flag on this codebase.

---

## Source provenance

This rubric was built from:

1. **CodeRabbit's documented wrapped-tool catalog** ([docs.coderabbit.ai](https://docs.coderabbit.ai/)) — ESLint, Biome, Gitleaks, Semgrep, ast-grep, eslint-jsx-a11y, etc. The categories above are the union of what these tools cover for TypeScript / Angular / Express projects.
2. **GitHub Copilot's official code-reviewer custom-instructions example** ([docs.github.com](https://docs.github.com/en/copilot/tutorials/customization-library/custom-instructions/code-reviewer)) — Security, Performance, Code quality, TypeScript-specific, Testing categories.
3. **Empirical observation** — review of CodeRabbit + Copilot comments on ~30 PRs from this repo over a 2-month window (2026-03-15 to 2026-05-15). Patterns that appeared in ≥2 PRs were canonicalised into `pr-knowledge/*.md`.
