# Templates and accessibility

Patterns CodeRabbit + Copilot flag in Angular templates — ARIA roles, focus management, keyboard parity, semantic HTML, class-binding clobbering, wrong `@for` track keys, missing `lens=` query params, and inline-style misuse. Heavily concentrated in `.component.html` files for table rows, custom toggle buttons, and icon-only buttons.

**Read when:** any `.component.html` file changed. Cross-checked by Phase 5; findings without a quotable pattern below are dropped.

---

## `templates-and-accessibility/nested-interactive-elements` — SHOULD_FIX

**Pattern:** an interactive element (`role="button"`, `tabindex="0"`, anchor, button) contains another interactive element. Invalid HTML; breaks screen-reader navigation; keyboard focus order is unpredictable.

**Detect:** in `.component.html`, look for `<tr role="button"` / `<div role="button"` / `<a` that contains a `<button>`, `<a>`, or another `<… tabindex>` child.

**Empirical citation:** PR #706 `apps/lfx-one/src/app/.../foundation-row.component.html:21` — "The foundations row `<tr>` carries `role=\"button\"` and `tabindex=\"0\"` while also containing an actual `<button>` (the chevron) and, when expanded, the inline detail rows contain further `<tr role=\"button\" tabindex=\"0\">` project rows. Nesting interactive elements inside an interactive ancestor is invalid."

**Failure message:** Nested interactive elements — invalid HTML, breaks assistive tech.

**Fix:** flatten the structure. Either (a) make only the outer element interactive and remove the inner button (use an icon-only visual cue), or (b) keep the inner button and remove the outer `role="button"`. Don't have both.

---

## `templates-and-accessibility/icon-only-button-no-aria-label` — SHOULD_FIX

**Pattern:** a button whose only visible content is an icon (`<svg>`, `<i class="fa-...">`, `<fa-icon>`) without an `aria-label` attribute. Screen readers will announce "button" with no description.

**Detect:** grep for `<button[^>]*>` that contains a `<svg`, `<i\s+class="(fa|pi)`, or `<fa-icon` without an `aria-label=` attribute on the button itself.

**Empirical citation:** PR #706 multiple chevron / close / toggle buttons missing labels — observed across `foundation-row.component.html` and sibling templates.

**Failure message:** Icon-only button has no accessible name; screen readers will announce only "button".

**Fix:** add `aria-label="<action>"` to the button (e.g., `aria-label="Expand row"`, `aria-label="Close dialog"`).

---

## `templates-and-accessibility/missing-aria-pressed-on-toggle` — SHOULD_FIX

**Pattern:** a button representing a binary on/off state (toggle, filter chip, tab, selection) without `[attr.aria-pressed]` bound to the active state. State is invisible to assistive tech.

**Detect:** grep for `<button` elements with class names suggesting toggle behavior (`active`, `selected`, `toggle`, `chip`) without `aria-pressed`, `aria-selected`, or `role="tab"` semantics.

**Empirical citation:** PR #641 `apps/lfx-one/src/app/.../marketing-impact.component.html:66` — CodeRabbit 🟠 Major — "Add proper tab semantics for screen reader and keyboard parity."

**Failure message:** Toggle button missing `aria-pressed` — state inaccessible to assistive tech.

**Fix:** bind `[attr.aria-pressed]="isActive()"` (signal/getter returning boolean). For tab-list patterns, use `role="tab"` + `aria-selected` + the correct ancestor `role="tablist"`.

---

## `templates-and-accessibility/click-without-keydown` — SHOULD_FIX

**Pattern:** custom `(click)="..."` on a non-button element (`<div>`, `<span>`, `<tr>`) without a corresponding `(keydown.enter)` / `(keydown.space)` handler. Mouse-only interaction; keyboard users are excluded.

**Detect:** grep for `(click)=` on elements that aren't `<button>` / `<a>` / native form controls. Check for a sibling `(keydown.*)` handler.

**Empirical citation:** Implied by PR #706's nested-interactive findings — when CodeRabbit + Copilot recommend flattening, the keyboard-parity gap is part of the same fix.

**Failure message:** Click handler without keyboard equivalent; keyboard users can't trigger the action.

**Fix:** either (a) use a `<button>` element instead, or (b) add `(keydown.enter)` and `(keydown.space)` handlers calling the same method, plus `tabindex="0"` and an appropriate `role`.

---

## `templates-and-accessibility/class-binding-clobbers-static-class` — SHOULD_FIX

**Pattern:** an element has both `[class]="boundExpression"` and `class="static classes"` attributes. Angular replaces (clobbers) the static class string with the bound expression's result — the static classes silently disappear at runtime.

**Detect:** in `.component.html`, find any element with both `[class]=` AND `class=` attributes. Multi-line check; both attributes can be on different lines.

**Empirical citation:** PR #690 `apps/lfx-one/src/app/.../committee-table.component.html:129` — "`[class]` binding on the badge `<span>` overrides the static `class=\"inline-flex …\"` attribute, so the base layout/typography classes will be removed at runtime. Use `ngClass` (or include the base classes in the bound string)." Confirmed at a second site: `committee-dashboard.component.html:68`.

**Failure message:** `[class]` binding clobbers static `class=` on the same element.

**Fix:** use `[ngClass]="..."` which is additive (merges with static class), OR include the static classes in the bound string. Don't have both `[class]` and `class` on the same element.

---

## `templates-and-accessibility/for-track-not-stable-identity` — SHOULD_FIX

**Pattern:** `@for (item of items(); track item.id)` is fine if items have a stable `id`. But `track $index` (or `track item.name`) for an array that can reorder breaks Angular's diff and produces wrong DOM updates (animations skip, focus jumps, etc.).

**Detect:** in `.component.html`, find every `@for (... ; track ...)` and check the track expression. Prefer stable identity fields (`id`, `uid`, `key`). `$index` is only safe for arrays that never reorder.

**Empirical citation:** general pattern from CodeRabbit comments across multiple PRs touching new `@for` loops.

**Failure message:** `@for` track key isn't a stable identity — reorder breaks DOM diffing.

**Fix:** use the stable identity field. If items have no natural ID, derive one (synthetic key from content hash) or use `$index` ONLY when you can guarantee no reordering.

---

## `templates-and-accessibility/missing-lens-query-param-on-link` — SHOULD_FIX

**Pattern:** a router link or navigation in templates omits the `lens=` query param when navigating to a lens-aware route. Users navigating land on the wrong lens (or get redirected unexpectedly).

**Detect:** find `[routerLink]=` / `router.navigate(...)` calls targeting lens-aware routes (under `/project/:id/` etc.). Check whether `lens=<currentLens>` is in `queryParams`.

**Empirical citation:** PR #701 area — "Missing `lens=` query param" appeared in routing/guard-related Copilot finds.

**Failure message:** Navigation to lens-aware route missing `lens=` query param — wrong lens on landing.

**Fix:** add `queryParams: { lens: this.activeLens() }` to the navigation call, or include it in the routerLink expression. `activeLens` is a `Signal<Lens>` exposed by `LensService` (`apps/lfx-one/src/app/shared/services/lens.service.ts`) — read it by calling `lensService.activeLens()`.

---

## `templates-and-accessibility/style-binding-vs-class-utility` — NIT

**Pattern:** `[style.color]="..."` inline style binding when an equivalent Tailwind utility class exists. Violates the project's "Tailwind first" rule per `.claude/rules/styling.md`.

**Detect:** grep for `\[style\.(color|background|padding|margin|width|height|font-size|font-weight)]=` in `.component.html`.

**Empirical citation:** general pattern; CodeRabbit occasionally surfaces.

**Failure message:** Inline `[style.*]` binding when a Tailwind utility could be used.

**Fix:** use `[ngClass]` or a Tailwind utility class. Reserve `[style.*]` for genuinely dynamic values (computed colors, dynamic dimensions) that can't be expressed with utilities.
