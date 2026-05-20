# Code truthiness

Patterns where the code lies about itself — docstrings, inline comments, JSDoc tags, hard-coded duplicates of config, PR descriptions diverging from shipped behavior, and entirely-new services / components shipped without tests. The highest-volume bucket in the research (~35 docs-drift finds + 6 testing finds across CodeRabbit + Copilot). Copilot is the strongest reviewer for this — it cross-correlates across files and notices when one file claims behavior another file actually implements.

**Read when:** any JSDoc / inline comment, anything under `docs/**`, or any new feature module / service / component without a matching `*.spec.ts`. Cross-checked in Steps 3-4 of the learnings-review playbook (KB-match gate in Step 3, false-positive filter in Step 4); findings without a quotable pattern below are dropped.

---

## `code-truthiness/jsdoc-route-mismatch` — Important

**Pattern:** JSDoc on a controller method or route handler declares a path (`@route GET /...`) that doesn't match the path the router actually mounts.

**Detect:** grep for `@route\s+(GET|POST|PUT|DELETE|PATCH)\s+\S+` in `apps/lfx-one/src/server/controllers/*.ts`. For each match, find the corresponding `router.<method>('<path>', ...)` registration and compare. Watch for `/api/` vs `/public/api/` prefix differences.

**Empirical citation:** PR #697 `apps/lfx-one/src/server/controllers/project.controller.ts:856` — "The JSDoc route for this endpoint says `GET /projects/:id/calendar.ics`, but the router is registered under `/public/api/projects/:id/calendar.ics`."

**Failure message:** JSDoc route differs from actual mounting — misleading for future maintainers.

**Fix:** update the JSDoc to match the mounted path. Include the full prefix (`/api/...` or `/public/api/...`).

---

## `code-truthiness/docstring-describes-stale-behavior` — Important

**Pattern:** docstring on a constant, function, or module describes a behavior that has since moved or been removed elsewhere. Reading the docstring sends maintainers down the wrong path.

**Detect:** when a file has prose JSDoc/JSON5 docstrings on exported items, verify the docstring's claim matches the file's current contents (not just the original implementation).

**Empirical citation:** PR #678 `packages/shared/src/constants/profile.constants.ts:95` — "The docstring says this map is used as a fallback when CDP returns identities without `type`, but the current fallback logic is implemented in … `cdp.service.ts` by inferring from the identity value shape."

**Failure message:** Docstring describes behavior moved or removed elsewhere.

**Fix:** rewrite the docstring to reflect current behavior, OR if the constant is no longer needed for its documented purpose, remove it.

---

## `code-truthiness/inline-comment-lies-about-side-effects` — Important

**Pattern:** inline comment near a piece of code claims "no navigation" / "no guard re-evaluation" / "no side effects" / "in-memory only" — when the surrounding code actually has those side effects.

**Detect:** when reviewing diffs that touch `router.navigate`, `location.replaceState`, `effect()`, `signal.set` near other side-effecting code, check adjacent comments for misleading assertions.

**Empirical citation:** PR #701 — "`syncProjectQueryParam` comment claims 'no new navigation' but `router.navigate(...)` actually re-evaluates guards. The comment is wrong about behavior."

**Failure message:** Inline comment contradicts the side effects of the surrounding code.

**Fix:** remove the misleading comment, or update it to accurately describe what runs (e.g., "navigates but with replaceUrl; guards re-evaluate").

---

## `code-truthiness/ssr-guard-claimed-but-not-implemented` — Important

**Pattern:** a component injects `PLATFORM_ID` and has a comment / PR description claiming an `isPlatformBrowser` SSR guard is applied — but the guard is never called. The HTTP request still fires during SSR, wasting work and producing 401 noise.

**Detect:** in `.component.ts` files that inject `PLATFORM_ID`, verify `isPlatformBrowser(this.platformId)` is actually called before HTTP work. Also check adjacent comments that claim an SSR optimisation — verify the code matches. Cross-check `apps/lfx-one/src/server/server-logger.ts` for routes generating 401s that suggest the guard is missing.

**Empirical citation:** PR #247 `apps/lfx-one/src/app/shared/components/sidebar/sidebar.component.ts:27` (also `:42`) — "The PR description mentions adding an `isPlatformBrowser` guard to prevent wasted SSR calls, and `PLATFORM_ID` is injected on line 27, but it's never actually used in the code. The `initProjects` method should check if it's running in the browser before making the HTTP call to properly implement the SSR optimization mentioned in the PR summary."

**Failure message:** `PLATFORM_ID` injected but `isPlatformBrowser` guard never called — SSR optimisation claimed but missing.

**Fix:** either add the guard (`if (isPlatformBrowser(this.platformId)) { this.initProjects(); }`) or update the comment / PR description to accurately reflect what's optimised (e.g., `shareReplay(1)` caching only).

---

## `code-truthiness/helm-values-drift-vs-pr-desc` — Important

**Pattern:** `charts/**/values.yaml` has changes (e.g., new `startupProbe`, `livenessProbe`, resource limits) that aren't mentioned in the PR description. Reviewers approve the code change without realizing deployment behavior is also changing.

**Detect:** when the diff touches `charts/**/values.yaml` or any helm chart YAML, verify the PR body mentions the change.

**Empirical citation:** PR #639 — "PR #639 added `startupProbe` not mentioned in the description. Helm-chart values.yaml drift vs PR description / actual probe behavior."

**Failure message:** Helm values changed but not mentioned in PR description — deployment behavior change can slip through review.

**Fix:** add a "Deployment changes" section to the PR description listing every modified `values.yaml` field.

---

## `code-truthiness/hardcoded-list-duplicates-config` — Important

**Pattern:** a short hard-coded list/array in code (typically 3–6 strings) duplicates a value that already exists as a config constant or can be derived programmatically (Object.keys, Object.values of a config object).

**Detect:** review small arrays of strings/IDs in component/service code. Cross-check against shared constants in `packages/shared/src/constants/`.

**Empirical citation:** PR #690 — "behavioralClassKeys hard-coded instead of derived from config."

**Failure message:** Hard-coded list duplicates a config-driven source of truth.

**Fix:** import from the config source and derive (`Object.keys(config.x)`), so future config additions propagate automatically.

---

## `code-truthiness/pr-desc-vs-code-mismatch` — Important

**Pattern:** the PR description claims one behavior, the code implements another. Reviewers approve based on description without comparing.

**Detect:** hand-review — read the PR body against the diff. Flag when the body says "X" but the code does "Y".

**Empirical citation:** observed by Copilot across ~10 PRs in the dataset; clearest in PR #678 (CDP identity fallback) and PR #697 (ICS calendar route prefix). Note: only flag SHOULD*FIX when the mismatch is \_semantic*, not just paraphrasing.

**Failure message:** PR description doesn't match shipped behavior.

**Fix:** update the PR description to describe what the code actually does. The PR body is the most-read summary; keep it accurate.

---

## `code-truthiness/new-service-without-spec` — Important

**Pattern:** a new `.service.ts` file is added to the diff without a corresponding `.service.spec.ts` in the same directory. Same applies to new `.module.ts` / non-trivial `.component.ts`.

**Detect:** from the changed-file list, identify new `.service.ts` / `.module.ts` / `.component.ts` files. For each, check whether a sibling `*.spec.ts` exists in the same directory.

**Empirical citation:** PR #706 — "No test file added for the new `OrgLensFoundationsService`."

**Failure message:** New service shipped without any test coverage.

**Fix:** add a `<name>.service.spec.ts` (or `.component.spec.ts`) covering at minimum the happy path and one error/edge case. Use the existing spec patterns in nearby modules.

---

## `code-truthiness/missing-e2e-for-empty-state` — Important

**Pattern:** a new empty-state UI (no-data card, zero-mentions panel, fallback message) is added without an e2e spec exercising it. Empty-states are notoriously easy to break silently when data shapes change.

**Detect:** when changes touch empty-state templates (`@if (!data())` / `@if (items().length === 0)` branches in `.component.html`), look for a matching e2e spec under `e2e/` that asserts on the empty-state copy/element.

**Empirical citation:** PR #685 — "Missing e2e for zero-mentions Brand Health drawer."

**Failure message:** New empty-state UI has no e2e coverage; can silently regress.

**Fix:** add an e2e spec under `e2e/<feature>/` that mocks zero-data and asserts the empty-state element renders. Use `data-testid` for stable selectors.

---

## `code-truthiness/non-trivial-logic-without-unit` — Important

**Pattern:** an existing service gains a non-trivial method (>10 lines, branching, transforms data) without a corresponding new test case in the sibling `.spec.ts`.

**Detect:** when a `.service.ts` file in the diff has new exported method(s), check the sibling `.spec.ts` for a matching `describe`/`it` block.

**Empirical citation:** general pattern from CodeRabbit + Copilot in 6 PRs; not always a hard flag but a recurring Nit-to-SHOULD-FIX.

**Failure message:** New method added to service without a corresponding unit test.

**Fix:** add a unit test exercising the method's happy path and at least one edge case. If the method is genuinely trivial (e.g., a single property getter), document why in a comment and downgrade to Nit.
