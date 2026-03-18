---
name: lfx-design
description: >
  Component builder for the apps/lfx design system. Generates custom Tailwind v4
  components with correct token usage, signal input/output patterns, and accessibility
  attributes. Only applies to base UI components in apps/lfx/src/app/shared/components/.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion
---

<!-- Copyright The Linux Foundation and each contributor to LFX. -->
<!-- SPDX-License-Identifier: MIT -->

# LFX Design System Component Builder

You generate custom Tailwind v4 base UI components for `apps/lfx`. Every component is a building block of the LFX design system — consistent, accessible, and built on established design tokens.

**This skill only generates base UI components** (buttons, inputs, cards, badges, modals, etc.). For feature-level components (pages, forms, data tables with business logic), use `/lfx-ui-builder`.

## Input Validation

| Required                                        | If Missing                        |
| ----------------------------------------------- | --------------------------------- |
| Component name and purpose                      | Ask — don't guess                 |
| Variants needed (e.g., primary/secondary/ghost) | Ask or infer from description     |
| Size variants (sm/md/lg)                        | Assume `md` only unless specified |

## Read Before Generating — MANDATORY

```bash
# Check current design tokens
cat apps/lfx/src/styles.css

# Check what components already exist
ls apps/lfx/src/app/shared/components/

# Read an existing component as a pattern
cat apps/lfx/src/app/shared/components/<nearest-example>/<name>.component.ts
```

**Never duplicate an existing component. If it exists, extend it.**

## Design Token Usage

All components use CSS custom properties from the `@theme` block in `apps/lfx/src/styles.css`. Never hardcode colors, spacing, or values that have tokens.

**Token categories:**

- `--color-canvas-*` — page background layers
- `--color-surface-*` — card/panel backgrounds
- `--color-border-*` — border colors
- `--color-text-*` — text hierarchy (primary, secondary, muted)
- `--color-brand-*` — LFX brand blues
- `--color-success-*`, `--color-warning-*`, `--color-error-*` — semantic colors

```html
<!-- Use tokens, not hardcoded values -->
<button class="bg-brand-600 hover:bg-brand-700 text-white">...</button>
<div class="bg-surface-default border border-border-default text-text-primary">...</div>
```

## Component Architecture

Every design system component:

- Is **standalone** — `standalone: true`, direct imports only
- Uses **signal `input()` / `output()` API** — never `@Input()` / `@Output()`
- Uses **Tailwind v4 classes only** — `.component.css`, no inline styles, no SCSS
- Has `data-testid` on all interactive and container elements
- Is **accessible** — ARIA labels, keyboard navigation, focus management

## File Structure

```text
apps/lfx/src/app/shared/components/<component-name>/
├── <component-name>.component.ts
├── <component-name>.component.html
└── <component-name>.component.css
```

Generate scaffolding with the Angular CLI:

```bash
cd apps/lfx
ng generate component shared/components/<component-name> --skip-tests
```

Then implement the component following the patterns below.

## Reference Pattern: ButtonComponent

```typescript
// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, input, output } from '@angular/core';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'lfx-button',
  standalone: true,
  imports: [],
  templateUrl: './button.component.html',
  styleUrl: './button.component.css',
})
export class ButtonComponent {
  public readonly variant = input<ButtonVariant>('primary');
  public readonly size = input<ButtonSize>('md');
  public readonly loading = input(false);
  public readonly disabled = input(false);
  public readonly type = input<'button' | 'submit' | 'reset'>('button');

  public readonly clicked = output<MouseEvent>();

  protected get classes(): string {
    const base =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
    const sizes: Record<ButtonSize, string> = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-5 py-2.5 text-base gap-2',
    };
    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50',
      secondary: 'bg-surface-default border border-border-default text-text-primary hover:bg-surface-hover',
      ghost: 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
      danger: 'bg-error-600 text-white hover:bg-error-700 disabled:opacity-50',
    };
    return `${base} ${sizes[this.size()]} ${variants[this.variant()]}`;
  }
}
```

```html
<!-- Copyright The Linux Foundation and each contributor to LFX. -->
<!-- SPDX-License-Identifier: MIT -->

<button
  [type]="type()"
  [class]="classes"
  [disabled]="disabled() || loading()"
  [attr.aria-busy]="loading() || null"
  (click)="clicked.emit($event)"
  data-testid="button">
  @if (loading()) {
  <lfx-spinner size="sm" />
  }
  <ng-content />
</button>
```

## Checklist

- [ ] Read `styles.css` tokens and existing components before generating
- [ ] Used Angular CLI to generate file scaffolding (`ng generate component --skip-tests`)
- [ ] Signal `input()` / `output()` API (not `@Input()` / `@Output()`)
- [ ] File extension is `.css` (not `.scss`)
- [ ] All variants covered
- [ ] Loading and disabled states handled
- [ ] `data-testid` on interactive/container elements
- [ ] Accessible: ARIA attributes, keyboard navigation, focus ring
- [ ] License headers on all files
- [ ] Uses design tokens — no hardcoded colors or values

## Scope Boundaries

**This skill DOES:**

- Generate base Tailwind v4 UI components in `apps/lfx/src/app/shared/components/`
- Extend or add variants to existing design system components

**This skill does NOT:**

- Generate feature-level components (pages, forms with business logic) — use `/lfx-ui-builder`
- Generate backend code — use `/lfx-backend-builder`
- Apply to `apps/lfx-one`
