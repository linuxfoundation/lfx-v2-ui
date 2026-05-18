# Bot-reviewer rubric (unioned CodeRabbit + GitHub Copilot)

This file is the umbrella for the knowledge-base audit that `/lfx-self-serve-learnings-review` performs. It defines:

1. The **11 unioned review categories** that map to both CodeRabbit's wrapped tools and Copilot's documented code-reviewer instructions.
2. The **severity vocabulary mapping** from CodeRabbit's tags to our `CRITICAL / SHOULD_FIX / NIT`.
3. **Pointers to the `bot-finds/*.md` files** where the actual repo-specific patterns live.
4. **Behavioural guidance** the bot-rubric pass should follow.

This file is itself not a finding source — empirical patterns are in `bot-finds/`. This file is the index and the calibration.

---

## Severity mapping

| CodeRabbit | Ours | Reasoning |
|---|---|---|
| 🔴 Critical | CRITICAL | Direct match |
| 🟠 Major | CRITICAL or SHOULD_FIX | Case-by-case — security / data-integrity → CRITICAL, structural → SHOULD_FIX |
| 🟡 Minor | SHOULD_FIX | Direct match |
| 🔵 Trivial / 🧹 Nitpick | NIT | Direct match |
| ⚪ Info | **drop** | Not actionable |

Copilot publishes no severity vocabulary. Default Copilot findings to **SHOULD_FIX**, except when the pattern is in category 1 (security), 4 (error handling on async paths), or 11 (framework-specific runtime breakage) — those default to **CRITICAL**.

---

## The 11 categories — each maps to one file under `bot-finds/`

| # | Category | File | Read when |
|---|---|---|---|
| 1 | **Security** | `bot-finds/security.md` | always |
| 2 | **Type safety** | `bot-finds/type-safety.md` | any `.ts` file changed |
| 3 | **Performance** | `bot-finds/performance.md` | (folded into framework-specific for now) |
| 4 | **Error handling** | `bot-finds/error-handling.md` | (folded into async-correctness and framework-specific for now) |
| 5 | **Async / concurrency** | `bot-finds/async-correctness.md` | any `.ts` file changed |
| 6 | **Resource lifecycle** | `bot-finds/resource-lifecycle.md` | any `.component.ts` / `.service.ts` |
| 7 | **Accessibility** | `bot-finds/accessibility.md` | any `.component.html` |
| 8 | **Documentation correctness** | `bot-finds/docs-comments-drift.md` | any JSDoc/inline-comment touched, any `docs/**` |
| 9 | **Testing** | `bot-finds/testing.md` | any new feature without a matching `*.spec.ts` |
| 10 | **Code quality** | `bot-finds/code-quality.md` | any source file |
| 11 | **Framework-specific** | `bot-finds/rxjs-signals-timing.md`, `bot-finds/guards-interceptors-ordering.md`, `bot-finds/route-auth-surface.md`, `bot-finds/query-param-hardening.md`, `bot-finds/snowflake-rowshape-schema.md`, `bot-finds/template-binding-traps.md`, `bot-finds/sanitizer-and-public-urls.md`, `bot-finds/otel-and-rate-limit-drift.md`, `bot-finds/log-metric-correctness.md`, `bot-finds/cookie-trust.md` | per learnings-review Phase 3 routing |

(Some categories are still consolidating — performance and error-handling have empirical evidence spread across the framework-specific files; if they accumulate enough volume to warrant their own files, split out later.)

---

## Behavioural guidance for the bot-rubric pass

1. **Repo-specific empirical evidence over generic best-practice.** Every pattern in `bot-finds/*.md` cites the PR# where CodeRabbit or Copilot flagged it on this codebase. Patterns without a citation should not be added — generic "Angular best practice" lists drift into noise.

2. **Severity is per-pattern, not per-category.** Each pattern in a `bot-finds/<file>.md` declares its own default severity. The category is for routing/loading, not severity assignment.

3. **Apply `known-false-positives.md` LAST.** A finding can match a bot-finds pattern AND a known-false-positive. The false-positive list wins.

4. **Distinguish "the bots flagged this" from "we agree with the bots."** A pattern lives in `bot-finds/` because the bots reliably catch it AND we agree it matters. Patterns the bots flag that we've decided aren't relevant for this codebase belong in `known-false-positives.md` instead.

5. **Cross-check discipline.** Every finding must quote the specific pattern in a `bot-finds/<file>.md` file. If you cannot quote the source, drop the finding. Hallucinated rules — especially "generic" bot-style suggestions that aren't in any file — are worse than missed ones.

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
3. **Empirical observation** — review of CodeRabbit + Copilot comments on ~30 PRs from this repo over a 2-month window (2026-03-15 to 2026-05-15). Patterns that appeared in ≥2 PRs were canonicalised into `bot-finds/*.md`.
