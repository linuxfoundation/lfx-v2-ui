# RxJS / signals timing

Patterns the bots reliably flag at the signals ↔ observables interface — double-emissions from `toObservable + startWith`, missing `distinctUntilChanged` after primitive projections, and identity-equal-object re-emissions triggering redundant downstream work.

Read when any `.component.ts` / `.service.ts` under `apps/lfx-one/src/app/` changed. Cross-checked by Phase 5; findings without a quotable pattern below are dropped.

---

## `bot-finds/rxjs-signals-timing/toObservable-startWith-double-emit` — SHOULD_FIX

**Pattern:** `toObservable(signal).pipe(startWith(initialValue))` — `toObservable` already synchronously emits the signal's current value on subscribe. Adding `startWith` prepends a second synchronous emission, doubling downstream firing (e.g., `combineLatest` fires twice on mount, refetches data twice).

**Detect:** grep for `toObservable\([^)]+\)\s*\.pipe\([^)]*startWith\(` in `*.component.ts` / `*.service.ts`.

**Empirical citation:** PR #706 `apps/lfx-one/src/app/.../org-overview-foundations-and-projects.component.ts:101` — "`retryTrigger$` is `toObservable(this.retryTrigger)`, which already emits the signal's current value (0) on subscribe. Adding `.pipe(startWith(0))` prepends a second synchronous 0, so `combineLatest` will fire twice on mount…"

**Failure message:** `toObservable + startWith` double-emits — causes duplicate downstream firing.

**Fix:** drop the `startWith`. `toObservable` already emits the initial value. If you need an initial DIFFERENT value, refactor to emit it from the signal itself.

---

## `bot-finds/rxjs-signals-timing/missing-distinctUntilChanged-after-id-projection` — SHOULD_FIX

**Pattern:** `toObservable(obj-signal).pipe(map(x => x.id))` — when the wrapping object can be re-emitted with the same `id` but a new object identity (e.g., context service enriches and re-sets the signal), downstream re-fires unnecessarily, triggering redundant fetches.

**Detect:** grep for `\.pipe\([^)]*map\([^)]*=>\s*[^.)]+\.(id|uid|key|accountId|projectId|meetingId)[^)]*\)\)` — a `map` projecting a stable primitive ID from an object. Verify a `distinctUntilChanged()` follows.

**Empirical citation:** PR #708 `apps/lfx-one/src/app/.../org-overview-foundations-and-projects.component.ts:46` — "`selectedAccountId$` will emit again when `AccountContextService` enriches the selected account (same `accountId`, new object), which can trigger an unnecessary full refetch."

**Failure message:** Missing `distinctUntilChanged` after primitive projection — same value triggers downstream re-fire.

**Fix:** append `.pipe(map(x => x.id), distinctUntilChanged())` so downstream only fires when the projected value actually changes.

---

## `bot-finds/rxjs-signals-timing/effect-resets-on-identity-equal-input` — SHOULD_FIX

**Pattern:** `effect()` reads a signal whose value is identity-different but semantically-equal (e.g., the same account enriched with extra metadata). The effect runs again and resets state that was set inside the effect — clobbering downstream state.

**Detect:** when reviewing `effect()` callbacks that READ a signal AND SET another signal, check whether the input signal can be re-emitted with new object identity but the same semantic content.

**Empirical citation:** general pattern from Copilot, related to PR #706 / #708 timing finds.

**Failure message:** `effect()` reads identity-different input and resets downstream state — same content re-fires.

**Fix:** use `computed()` instead of `effect()` if you're just deriving state. If you genuinely need an effect, project the input to a primitive ID and gate on `equal` (the `effect()` config option) or `distinctUntilChanged` on a toObservable bridge.
