# Accessibility

Patterns the bots flag around ARIA roles, focus management, keyboard parity, and semantic HTML. Heavily concentrated in `.component.html` files for table rows, custom toggle buttons, and icon-only buttons.

Read when any `.component.html` file changed. Cross-checked by Phase 5; findings without a quotable pattern below are dropped.

---

## `bot-finds/accessibility/nested-interactive-elements` — SHOULD_FIX

**Pattern:** an interactive element (`role="button"`, `tabindex="0"`, anchor, button) contains another interactive element. Invalid HTML; breaks screen-reader navigation; keyboard focus order is unpredictable.

**Detect:** in `.component.html`, look for `<tr role="button"` / `<div role="button"` / `<a` that contains a `<button>`, `<a>`, or another `<… tabindex>` child.

**Empirical citation:** PR #706 `apps/lfx-one/src/app/.../foundation-row.component.html:21` — "The foundations row `<tr>` carries `role=\"button\"` and `tabindex=\"0\"` while also containing an actual `<button>` (the chevron) and, when expanded, the inline detail rows contain further `<tr role=\"button\" tabindex=\"0\">` project rows. Nesting interactive elements inside an interactive ancestor is invalid."

**Failure message:** Nested interactive elements — invalid HTML, breaks assistive tech.

**Fix:** flatten the structure. Either (a) make only the outer element interactive and remove the inner button (use an icon-only visual cue), or (b) keep the inner button and remove the outer `role="button"`. Don't have both.

---

## `bot-finds/accessibility/icon-only-button-no-aria-label` — SHOULD_FIX

**Pattern:** a button whose only visible content is an icon (`<svg>`, `<i class="fa-...">`, `<fa-icon>`) without an `aria-label` attribute. Screen readers will announce "button" with no description.

**Detect:** grep for `<button[^>]*>` that contains a `<svg`, `<i\s+class="(fa|pi)`, or `<fa-icon` without an `aria-label=` attribute on the button itself.

**Empirical citation:** PR #706 multiple chevron / close / toggle buttons missing labels — observed across `foundation-row.component.html` and sibling templates.

**Failure message:** Icon-only button has no accessible name; screen readers will announce only "button".

**Fix:** add `aria-label="<action>"` to the button (e.g., `aria-label="Expand row"`, `aria-label="Close dialog"`).

---

## `bot-finds/accessibility/missing-aria-pressed-on-toggle` — SHOULD_FIX

**Pattern:** a button representing a binary on/off state (toggle, filter chip, tab, selection) without `[attr.aria-pressed]` bound to the active state. State is invisible to assistive tech.

**Detect:** grep for `<button` elements with class names suggesting toggle behavior (`active`, `selected`, `toggle`, `chip`) without `aria-pressed`, `aria-selected`, or `role="tab"` semantics.

**Empirical citation:** PR #641 `apps/lfx-one/src/app/.../marketing-impact.component.html:66` — CodeRabbit 🟠 Major — "Add proper tab semantics for screen reader and keyboard parity."

**Failure message:** Toggle button missing `aria-pressed` — state inaccessible to assistive tech.

**Fix:** bind `[attr.aria-pressed]="isActive()"` (signal/getter returning boolean). For tab-list patterns, use `role="tab"` + `aria-selected` + the correct ancestor `role="tablist"`.

---

## `bot-finds/accessibility/click-without-keydown` — SHOULD_FIX

**Pattern:** custom `(click)="..."` on a non-button element (`<div>`, `<span>`, `<tr>`) without a corresponding `(keydown.enter)` / `(keydown.space)` handler. Mouse-only interaction; keyboard users are excluded.

**Detect:** grep for `(click)=` on elements that aren't `<button>` / `<a>` / native form controls. Check for a sibling `(keydown.*)` handler.

**Empirical citation:** Implied by PR #706's nested-interactive findings — when the bot recommends flattening, the keyboard-parity gap is part of the same fix.

**Failure message:** Click handler without keyboard equivalent; keyboard users can't trigger the action.

**Fix:** either (a) use a `<button>` element instead, or (b) add `(keydown.enter)` and `(keydown.space)` handlers calling the same method, plus `tabindex="0"` and an appropriate `role`.
