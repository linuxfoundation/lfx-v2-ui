# TypeScript correctness

TypeScript-soundness and async-lifecycle patterns CodeRabbit + Copilot flag — generics whose return types lie, non-null assertions on async results, deep imports that route around the barrel, timer leaks, and observable readiness races.

**Read when:** any `.ts` file changed. Cross-checked by Phase 5; findings without a quotable pattern below are dropped.

---

## `typescript-correctness/generic-return-type-lies` — CRITICAL

**Pattern:** generic utility function whose declared return type doesn't account for runtime `null` / `undefined` when the type parameter resolves to a primitive (string, number).

**Detect:** grep for `function <name><T>(...)` where the body can return `null` but the return type is declared as `T` (or any type that doesn't include null). Especially look at object-mapping utilities, ID helpers, deep-clone-like functions.

**Empirical citation:** PR #673 `packages/shared/src/utils/object.utils.ts` — "`nullifyEmptyStrings<T>` returns `null` for `T = string`. The generic claims `T` but returns null at runtime, breaking caller assumptions."

**Failure message:** Generic claims `T` but returns null at runtime — the type lies.

**Fix:** narrow the type parameter with a constraint (`T extends object`), or widen the return type to `T | null` and require callers to handle the null case.

---

## `typescript-correctness/non-null-assertion-on-async-result` — SHOULD_FIX

**Pattern:** non-null assertion (`!`) on a value that's the result of an async call, an array `.find(...)`, an HTTP response field, a route param, or a `signal()` value — any of which can be undefined at runtime.

**Detect:** grep for `\.(find|first|get)\s*\([^)]*\)!` or `(request[a-zA-Z]+)\([^)]*\)!` or `\.signal\(\)!`.

**Empirical citation:** PR #673 area — non-null on `find(...)` in object-utils chains; multiple other PRs flagged similar patterns.

**Failure message:** Non-null assertion on a potentially-undefined async result will throw at runtime if the result is missing.

**Fix:** handle the undefined case explicitly with an `if` guard or a default value (`?? defaultValue`). If the value is genuinely guaranteed non-null by an invariant, prefer a type-narrowing helper that asserts the invariant explicitly.

---

## `typescript-correctness/deep-shared-import` — SHOULD_FIX

**Pattern:** importing from `@lfx-one/shared/<category>/<file>` instead of the barrel (`@lfx-one/shared/<category>`). Bypasses the curated public surface and risks importing internal helpers.

**Detect:** grep for `from '@lfx-one/shared/(interfaces|enums|constants|utils|validators)/[^'"]+'` (matches a path with a deeper segment after the category).

**Empirical citation:** 8 Copilot finds across multiple PRs (PRs sampled: #706, #678, others) — typically `from '@lfx-one/shared/interfaces/org-involvement.interface'` instead of `from '@lfx-one/shared/interfaces'`.

**Failure message:** Deep import bypasses the barrel; you may be reaching into the internal surface.

**Fix:** import from `@lfx-one/shared/interfaces` (or the appropriate sub-barrel). If the type isn't exported from the barrel, add it to `index.ts` rather than deep-importing.

---

## `typescript-correctness/setTimeout-no-cleanup` — SHOULD_FIX

**Pattern:** `setTimeout(...)` in a component / dialog / service that does not clear the timer on destroy. The callback can fire after the host is gone, setting state on a destroyed component or executing logic against stale references.

**Detect:** grep for `setTimeout\(` in `*.component.ts` / `*.dialog.ts` / `*.directive.ts`. For each match, verify either (a) a corresponding `clearTimeout(timerId)` in `DestroyRef` / `ngOnDestroy`, or (b) the timer body is wrapped in a `takeUntilDestroyed()`-aware idiom.

**Empirical citation:** PR #689 `apps/lfx-one/src/app/.../ical-subscribe-dialog.component.ts:69` — "`setTimeout(() => this.copied.set(false), 2000)` can race if the user clicks Copy multiple times… It can also fire after the dialog is closed."

**Failure message:** `setTimeout` without cleanup can fire after the host is destroyed.

**Fix:** store the timer id and call `clearTimeout` in `DestroyRef.onDestroy(...)`, or replace with a signal-driven pattern (`timer(2000)` piped through `takeUntilDestroyed()`).

---

## `typescript-correctness/take1-against-async-readiness` — SHOULD_FIX

**Pattern:** `take(1)` subscribed to an observable whose downstream short-circuits based on a readiness flag, when that flag is flipped by a separate async callback (e.g., `script.onload`). If the observable emits before the flag is true, the single value is dropped.

**Detect:** harder to grep mechanically — look for `take(1)` near subscriptions that consume a `ready` / `loaded` / `initialized` flag, and check whether that flag is set in an async callback that may resolve after the subscription fires.

**Empirical citation:** PR #709 `apps/lfx-one/src/app/.../meeting-join.component.ts:1171` — "Race condition: `trackPage()` short-circuits when `!this.analyticsReady`, and `analyticsReady` is only flipped to `true` inside `script.onload`. The deferred subscription here uses `take(1)`, so if the `project` signal resolves before the Plausible script finishes loading, the single enriched pageview will be silently dropped."

**Failure message:** `take(1)` can fire before the async readiness flag is set, silently dropping the subscription.

**Fix:** chain on the readiness signal with `filter(() => this.analyticsReady)` BEFORE `take(1)`, or combine the readiness observable into a `combineLatest` so emission waits for both.

---

## `typescript-correctness/timer-races-parent-fetch` — SHOULD_FIX

**Pattern:** UI state transition driven by a `setTimeout` / interval races against a parent fetch that resolves on its own schedule. Final state depends on which finishes first.

**Detect:** review components that set state both inside a `setTimeout`/`setInterval` callback AND inside a `subscribe(...)` / `effect(...)` consuming a fetch result, where the two state-setters target the same field.

**Empirical citation:** general pattern flagged by Copilot in 9 PRs sampled (PRs #708, #709, #685, others). The clearest instance is PR #689's ical-subscribe-dialog where copy state races against dialog close.

**Failure message:** Timer races against async fetch — final state is non-deterministic.

**Fix:** drive the state from the fetch resolution, not from a parallel timer. If the timer is for UX feedback (e.g., "Copied!"), make sure it doesn't conflict with state managed by the fetch path.
