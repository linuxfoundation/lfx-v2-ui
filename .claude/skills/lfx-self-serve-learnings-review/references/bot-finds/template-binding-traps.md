# Template binding traps

Patterns specific to Angular templates — class-binding clobbering, wrong `@for` track keys, missing `lens=` query params. Moderate volume but high impact when missed.

Read when any `.component.html` file changed. Cross-checked by Phase 5.

---

## `bot-finds/template-binding-traps/class-binding-clobbers-static-class` — SHOULD_FIX

**Pattern:** an element has both `[class]="boundExpression"` and `class="static classes"` attributes. Angular replaces (clobbers) the static class string with the bound expression's result — the static classes silently disappear at runtime.

**Detect:** in `.component.html`, find any element with both `[class]=` AND `class=` attributes. Multi-line check; both attributes can be on different lines.

**Empirical citation:** PR #690 `apps/lfx-one/src/app/.../committee-table.component.html:129` — "`[class]` binding on the badge `<span>` overrides the static `class=\"inline-flex …\"` attribute, so the base layout/typography classes will be removed at runtime. Use `ngClass` (or include the base classes in the bound string)." Confirmed at a second site: `committee-dashboard.component.html:68`.

**Failure message:** `[class]` binding clobbers static `class=` on the same element.

**Fix:** use `[ngClass]="..."` which is additive (merges with static class), OR include the static classes in the bound string. Don't have both `[class]` and `class` on the same element.

---

## `bot-finds/template-binding-traps/for-track-not-stable-identity` — SHOULD_FIX

**Pattern:** `@for (item of items(); track item.id)` is fine if items have a stable `id`. But `track $index` (or `track item.name`) for an array that can reorder breaks Angular's diff and produces wrong DOM updates (animations skip, focus jumps, etc.).

**Detect:** in `.component.html`, find every `@for (... ; track ...)` and check the track expression. Prefer stable identity fields (`id`, `uid`, `key`). `$index` is only safe for arrays that never reorder.

**Empirical citation:** general pattern from CodeRabbit comments across multiple PRs touching new `@for` loops.

**Failure message:** `@for` track key isn't a stable identity — reorder breaks DOM diffing.

**Fix:** use the stable identity field. If items have no natural ID, derive one (synthetic key from content hash) or use `$index` ONLY when you can guarantee no reordering.

---

## `bot-finds/template-binding-traps/missing-lens-query-param-on-link` — SHOULD_FIX

**Pattern:** a router link or navigation in templates omits the `lens=` query param when navigating to a lens-aware route. Users navigating land on the wrong lens (or get redirected unexpectedly).

**Detect:** find `[routerLink]=` / `router.navigate(...)` calls targeting lens-aware routes (under `/project/:id/` etc.). Check whether `lens=<currentLens>` is in `queryParams`.

**Empirical citation:** PR #701 area — "Missing `lens=` query param" appeared in routing/guard-related Copilot finds.

**Failure message:** Navigation to lens-aware route missing `lens=` query param — wrong lens on landing.

**Fix:** add `queryParams: { lens: this.activeLens() }` to the navigation call, or include it in the routerLink expression. Use `LensService.getCurrentLens()` to fetch the active lens.

---

## `bot-finds/template-binding-traps/style-binding-vs-class-utility` — NIT

**Pattern:** `[style.color]="..."` inline style binding when an equivalent Tailwind utility class exists. Violates the project's "Tailwind first" rule per `.claude/rules/styling.md`.

**Detect:** grep for `\[style\.(color|background|padding|margin|width|height|font-size|font-weight)]=` in `.component.html`.

**Empirical citation:** general pattern; CodeRabbit occasionally surfaces.

**Failure message:** Inline `[style.*]` binding when a Tailwind utility could be used.

**Fix:** use `[ngClass]` or a Tailwind utility class. Reserve `[style.*]` for genuinely dynamic values (computed colors, dynamic dimensions) that can't be expressed with utilities.
