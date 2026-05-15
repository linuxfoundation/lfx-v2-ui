# Async correctness

Patterns where async lifecycle, timers, races, or unhandled rejections leak through. Most observed cases are timer/destroy races and async-readiness flag mismatches.

Read when any `.ts` file changed. Cross-checked by Phase 5; findings without a quotable pattern below are dropped.

---

## `bot-finds/async-correctness/setTimeout-no-cleanup` — SHOULD_FIX

**Pattern:** `setTimeout(...)` in a component / dialog / service that does not clear the timer on destroy. The callback can fire after the host is gone, setting state on a destroyed component or executing logic against stale references.

**Detect:** grep for `setTimeout\(` in `*.component.ts` / `*.dialog.ts` / `*.directive.ts`. For each match, verify either (a) a corresponding `clearTimeout(timerId)` in `DestroyRef` / `ngOnDestroy`, or (b) the timer body is wrapped in a `takeUntilDestroyed()`-aware idiom.

**Empirical citation:** PR #689 `apps/lfx-one/src/app/.../ical-subscribe-dialog.component.ts:69` — "`setTimeout(() => this.copied.set(false), 2000)` can race if the user clicks Copy multiple times… It can also fire after the dialog is closed."

**Failure message:** `setTimeout` without cleanup can fire after the host is destroyed.

**Fix:** store the timer id and call `clearTimeout` in `DestroyRef.onDestroy(...)`, or replace with a signal-driven pattern (`timer(2000)` piped through `takeUntilDestroyed()`).

---

## `bot-finds/async-correctness/take1-against-async-readiness` — SHOULD_FIX

**Pattern:** `take(1)` subscribed to an observable whose downstream short-circuits based on a readiness flag, when that flag is flipped by a separate async callback (e.g., `script.onload`). If the observable emits before the flag is true, the single value is dropped.

**Detect:** harder to grep mechanically — look for `take(1)` near subscriptions that consume a `ready` / `loaded` / `initialized` flag, and check whether that flag is set in an async callback that may resolve after the subscription fires.

**Empirical citation:** PR #709 `apps/lfx-one/src/app/.../meeting-join.component.ts:1171` — "Race condition: `trackPage()` short-circuits when `!this.analyticsReady`, and `analyticsReady` is only flipped to `true` inside `script.onload`. The deferred subscription here uses `take(1)`, so if the `project` signal resolves before the Plausible script finishes loading, the single enriched pageview will be silently dropped."

**Failure message:** `take(1)` can fire before the async readiness flag is set, silently dropping the subscription.

**Fix:** chain on the readiness signal with `filter(() => this.analyticsReady)` BEFORE `take(1)`, or combine the readiness observable into a `combineLatest` so emission waits for both.

---

## `bot-finds/async-correctness/timer-races-parent-fetch` — SHOULD_FIX

**Pattern:** UI state transition driven by a `setTimeout` / interval races against a parent fetch that resolves on its own schedule. Final state depends on which finishes first.

**Detect:** review components that set state both inside a `setTimeout`/`setInterval` callback AND inside a `subscribe(...)` / `effect(...)` consuming a fetch result, where the two state-setters target the same field.

**Empirical citation:** general pattern flagged by Copilot in 9 PRs sampled (PRs #708, #709, #685, others). The clearest instance is PR #689's ical-subscribe-dialog where copy state races against dialog close.

**Failure message:** Timer races against async fetch — final state is non-deterministic.

**Fix:** drive the state from the fetch resolution, not from a parallel timer. If the timer is for UX feedback (e.g., "Copied!"), make sure it doesn't conflict with state managed by the fetch path.
