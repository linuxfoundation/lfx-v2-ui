# Documentation & comment drift

The highest-volume bucket in the research (~35 finds across CodeRabbit + Copilot). Patterns where docstrings, inline comments, JSDoc tags, and PR descriptions diverge from the actual shipped behavior. Copilot is the strongest reviewer for this — it cross-correlates across files and notices when one file claims behavior another file actually implements.

Read when any JSDoc / inline comment / `docs/**` file changed (which is nearly every PR). Cross-checked by Phase 5; findings without a quotable pattern below are dropped.

---

## `bot-finds/docs-comments-drift/jsdoc-route-mismatch` — SHOULD_FIX

**Pattern:** JSDoc on a controller method or route handler declares a path (`@route GET /...`) that doesn't match the path the router actually mounts.

**Detect:** grep for `@route\s+(GET|POST|PUT|DELETE|PATCH)\s+\S+` in `apps/lfx-one/src/server/controllers/*.ts`. For each match, find the corresponding `router.<method>('<path>', ...)` registration and compare. Watch for `/api/` vs `/public/api/` prefix differences.

**Empirical citation:** PR #697 `apps/lfx-one/src/server/controllers/project.controller.ts:856` — "The JSDoc route for this endpoint says `GET /projects/:id/calendar.ics`, but the router is registered under `/public/api/projects/:id/calendar.ics`."

**Failure message:** JSDoc route differs from actual mounting — misleading for future maintainers.

**Fix:** update the JSDoc to match the mounted path. Include the full prefix (`/api/...` or `/public/api/...`).

---

## `bot-finds/docs-comments-drift/docstring-describes-stale-behavior` — SHOULD_FIX

**Pattern:** docstring on a constant, function, or module describes a behavior that has since moved or been removed elsewhere. Reading the docstring sends maintainers down the wrong path.

**Detect:** when a file has prose JSDoc/JSON5 docstrings on exported items, verify the docstring's claim matches the file's current contents (not just the original implementation).

**Empirical citation:** PR #678 `packages/shared/src/constants/profile.constants.ts:95` — "The docstring says this map is used as a fallback when CDP returns identities without `type`, but the current fallback logic is implemented in … `cdp.service.ts` by inferring from the identity value shape."

**Failure message:** Docstring describes behavior moved or removed elsewhere.

**Fix:** rewrite the docstring to reflect current behavior, OR if the constant is no longer needed for its documented purpose, remove it.

---

## `bot-finds/docs-comments-drift/inline-comment-lies-about-side-effects` — SHOULD_FIX

**Pattern:** inline comment near a piece of code claims "no navigation" / "no guard re-evaluation" / "no side effects" / "in-memory only" — when the surrounding code actually has those side effects.

**Detect:** when reviewing diffs that touch `router.navigate`, `location.replaceState`, `effect()`, `signal.set` near other side-effecting code, check adjacent comments for misleading assertions.

**Empirical citation:** PR #701 — "`syncProjectQueryParam` comment claims 'no new navigation' but `router.navigate(...)` actually re-evaluates guards. The comment is wrong about behavior."

**Failure message:** Inline comment contradicts the side effects of the surrounding code.

**Fix:** remove the misleading comment, or update it to accurately describe what runs (e.g., "navigates but with replaceUrl; guards re-evaluate").

---

## `bot-finds/docs-comments-drift/helm-values-drift-vs-pr-desc` — SHOULD_FIX

**Pattern:** `charts/**/values.yaml` has changes (e.g., new `startupProbe`, `livenessProbe`, resource limits) that aren't mentioned in the PR description. Reviewers approve the code change without realizing deployment behavior is also changing.

**Detect:** when the diff touches `charts/**/values.yaml` or any helm chart YAML, verify the PR body mentions the change.

**Empirical citation:** PR #639 — "PR #639 added `startupProbe` not mentioned in the description. Helm-chart values.yaml drift vs PR description / actual probe behavior."

**Failure message:** Helm values changed but not mentioned in PR description — deployment behavior change can slip through review.

**Fix:** add a "Deployment changes" section to the PR description listing every modified `values.yaml` field.

---

## `bot-finds/docs-comments-drift/hardcoded-list-duplicates-config` — SHOULD_FIX

**Pattern:** a short hard-coded list/array in code (typically 3–6 strings) duplicates a value that already exists as a config constant or can be derived programmatically (Object.keys, Object.values of a config object).

**Detect:** review small arrays of strings/IDs in component/service code. Cross-check against shared constants in `packages/shared/src/constants/`.

**Empirical citation:** PR #690 — "behavioralClassKeys hard-coded instead of derived from config."

**Failure message:** Hard-coded list duplicates a config-driven source of truth.

**Fix:** import from the config source and derive (`Object.keys(config.x)`), so future config additions propagate automatically.

---

## `bot-finds/docs-comments-drift/pr-desc-vs-code-mismatch` — SHOULD_FIX

**Pattern:** the PR description claims one behavior, the code implements another. Reviewers approve based on description without comparing.

**Detect:** hand-review — read the PR body against the diff. Flag when the body says "X" but the code does "Y".

**Empirical citation:** observed by Copilot across ~10 PRs in the dataset; clearest in PR #678 (CDP identity fallback) and PR #697 (ICS calendar route prefix). Note: only flag SHOULD_FIX when the mismatch is *semantic*, not just paraphrasing.

**Failure message:** PR description doesn't match shipped behavior.

**Fix:** update the PR description to describe what the code actually does. The PR body is the most-read summary; keep it accurate.
