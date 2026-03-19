---
name: lfx-design
description: >
  Component builder for the apps/lfx design system. Generates custom Tailwind v4
  components with correct token usage, signal input/output patterns, Storybook stories,
  and accessibility attributes. Only applies to base UI components in
  apps/lfx/src/app/shared/components/.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion, mcp__plugin_figma_figma__get_design_context, mcp__plugin_figma_figma__get_screenshot
---

<!-- Copyright The Linux Foundation and each contributor to LFX. -->
<!-- SPDX-License-Identifier: MIT -->

# LFX Design System Component Builder

You generate custom Tailwind v4 base UI components for `apps/lfx`. Every component is a building block of the LFX design system — consistent, accessible, and built on established design tokens from the Coherence UI Kit in Figma.

**This skill only generates base UI components** (buttons, inputs, cards, badges, chips, tooltips, etc.). For feature-level components (pages, forms, data tables with business logic), use `/lfx-ui-builder`.

## Figma-to-Code Workflow

All components in this design system are built from the **Coherence UI Kit** in Figma. When a Figma URL or node ID is provided, use the Figma MCP to extract the design spec before writing any code.

### Step 1 — Fetch the design context

```text
mcp__plugin_figma_figma__get_design_context(
  fileKey: "<extracted-from-url>",
  nodeId: "<extracted-from-url>",
  clientFrameworks: "angular",
  clientLanguages: "typescript,html,css"
)
```

**URL parsing:** Given `https://figma.com/design/:fileKey/:fileName?node-id=:nodeId`, extract `fileKey` and convert `nodeId` dashes to colons (e.g., `299-87` → `299:87`).

### Step 2 — Interpret the Figma output

The MCP returns React+Tailwind reference code and a screenshot. **Do NOT copy the React code.** Instead, extract:

- **Variants and their visual differences** (colors, sizes, states)
- **Spacing values** — map Figma `spacing/spacing-*` to standard Tailwind utilities
- **Colors** — map Figma `neutral/neutral-*`, `info/info-*`, etc. to our `@theme` tokens
- **Typography** — map `font-size/text-*` and `line-height/leading-*` to Tailwind utilities
- **Border radius** — map `border-radius/rounded-*` to Tailwind utilities
- **Icons** — Font Awesome icon names appear as text content in the Figma output

### Step 3 — Map to our token system

| Figma token                           | Our Tailwind class    |
| ------------------------------------- | --------------------- |
| `var(--neutral/neutral-900, #0f172b)` | `text-neutral-900`    |
| `var(--info/info-500, #009aff)`       | `bg-info-500`         |
| `var(--spacing/spacing-4, 4px)`       | `gap-1` or `p-1`      |
| `var(--spacing/spacing-6, 6px)`       | `gap-1.5` or `p-1.5`  |
| `var(--spacing/spacing-8, 8px)`       | `gap-2` or `p-2`      |
| `var(--spacing/spacing-10, 10px)`     | `gap-2.5` or `px-2.5` |
| `var(--font-size/text-xs, 12px)`      | `text-xs`             |
| `var(--font-size/text-sm, 14px)`      | `text-sm`             |
| `var(--line-height/leading-text-xs)`  | `leading-4`           |
| `var(--line-height/leading-text-sm)`  | `leading-5`           |
| `var(--border-radius/rounded-full)`   | `rounded-full`        |
| `var(--border-radius/rounded-md)`     | `rounded-md`          |

### Step 4 — Build the component

Follow the patterns documented below. Use the screenshot for visual verification of the expected output.

If no Figma URL is provided, you can also use `mcp__plugin_figma_figma__get_screenshot` to visually verify a node when you only have a file key and node ID.

## Input Validation

| Required                                        | If Missing                           |
| ----------------------------------------------- | ------------------------------------ |
| Component name and purpose                      | Ask — don't guess                    |
| Figma URL or node reference                     | Ask — all components come from Figma |
| Variants needed (e.g., primary/secondary/ghost) | Extract from Figma design context    |
| Size variants (sm/lg)                           | Extract from Figma or assume `lg`    |

## Read Before Generating — MANDATORY

Before writing ANY code:

**1. Fetch the Figma design context** (if a URL/node ID was provided)

**2. Read these project files:**

```bash
# Check current design tokens
cat apps/lfx/src/styles.css

# Check what components already exist
ls apps/lfx/src/app/shared/components/

# Read an existing component as a pattern reference
cat apps/lfx/src/app/shared/components/badge/badge.ts
cat apps/lfx/src/app/shared/components/badge/badge.html
cat apps/lfx/src/app/shared/components/badge/badge.stories.ts
```

**Never duplicate an existing component. If it exists, extend it.**

## File Structure & Naming

```text
apps/lfx/src/app/shared/components/<component-name>/
├── <component-name>.ts          # NOT .component.ts
├── <component-name>.html        # NOT .component.html
├── <component-name>.css         # Empty with license header (NOT .scss)
└── <component-name>.stories.ts  # Storybook stories — ALWAYS required
```

**Do NOT use Angular CLI to generate.** Create files directly following the naming pattern above. The class name is the PascalCase component name without a `Component` suffix (e.g., `Badge`, `Button`, `Chip` — not `BadgeComponent`).

## Component Architecture

### Class Structure (11-section order)

```typescript
// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input, model, output } from '@angular/core';

type BadgeVariant = 'neutral' | 'info' | 'success';
type BadgeSize = 'sm' | 'lg';

@Component({
  selector: 'lfx-badge',
  imports: [],
  templateUrl: './badge.html',
  styleUrl: './badge.css',
  host: {
    '[attr.data-testid]': '"badge"',
  },
})
export class Badge {
  // 1. Private injections (inject(), readonly)
  // 2. Public inputs
  public variant = input<BadgeVariant>('neutral');
  public size = input<BadgeSize>('sm');
  // 3. Model signals (model()) — for two-way binding (checked, visible, etc.)
  // 4. Writable signals (signal())
  // 5. Computed signals
  public badgeClasses = computed(() => {
    const sizeClasses: Record<BadgeSize, string> = {
      sm: 'px-1.5 py-0.5 text-xs gap-0.5',
      lg: 'px-2 py-1 text-sm gap-1',
    };
    return `${sizeClasses[this.size()]} ${this.variantClasses()}`;
  });
  // 6. Outputs
  public readonly clicked = output<MouseEvent>();
  // 7. Constructor
  // 8. Public methods
  // 9. Protected methods
  // 10. Private initializer functions
  // 11. Private helper methods
  private variantClasses(): string {
    /* ... */
  }
}
```

### Key Rules

- **Standalone** — `imports: []` array, direct imports only (no barrels)
- **Signal API** — `input()`, `model()`, `output()` — never `@Input()` / `@Output()`
- **`model()`** for two-way binding — use for `checked`, `visible`, `selectedValue` etc.
- **Computed signals** — use `computed()` for derived class strings
- **No `Component` suffix** — class is `Badge`, not `BadgeComponent`
- **Selector prefix** — always `lfx-` (e.g., `lfx-badge`)
- **Host data-testid** — `host: { '[attr.data-testid]': '"component-name"' }`
- **`.css` only** — never `.scss`

## Template Pattern — Class Binding

**Critical: Static base classes on `class`, dynamic classes on `[class]`.** Angular v20 merges them intelligently — they don't overwrite each other.

```html
<!-- Copyright The Linux Foundation and each contributor to LFX. -->
<!-- SPDX-License-Identifier: MIT -->

<!-- CORRECT: static base + dynamic computed merge together -->
<span class="inline-flex items-center rounded-full font-semibold whitespace-nowrap" [class]="badgeClasses()" data-testid="badge-content">
  <ng-content />
</span>
```

**What goes where:**

| `class="..."` (static)                   | `[class]="computed()"` (dynamic)            |
| ---------------------------------------- | ------------------------------------------- |
| Layout: `inline-flex`, `items-center`    | Size-dependent: `px-2 py-1 text-sm`         |
| Shape: `rounded-full`, `overflow-hidden` | Variant-dependent: `bg-info-500 text-white` |
| Typography base: `font-semibold`         | State-dependent: `opacity-50`, `bg-white`   |
| Transitions: `transition-colors`         |                                             |

**For individual boolean toggles**, use `[class.xxx]="condition"`:

```html
<label [class.cursor-not-allowed]="disabled()" [class.cursor-pointer]="!disabled()"></label>
```

**For preventing layout shift**, use `[class.invisible]` instead of `@if` for small toggle elements (icons, dots) inside fixed-size containers:

```html
<!-- CORRECT: always in DOM, just hidden -->
<span [class.invisible]="!checked()" data-testid="radio-dot"></span>

<!-- WRONG: causes layout recalculation -->
@if (checked()) {
<span data-testid="radio-dot"></span>
}
```

## Template Rules

- Always `@if` / `@for` — never `*ngIf` / `*ngFor`
- Always `flex + flex-col + gap-*` — never `space-y-*`
- `data-testid` on all interactive and container elements
- Never nest ternary expressions
- `type="button"` on all `<button>` elements that aren't submit buttons
- Icons use Font Awesome: `fa-light fa-{name}` for regular, `fa-solid fa-{name}` for filled

## Design Token Usage

All components use the Tailwind v4 theme tokens defined in `apps/lfx/src/styles.css`. Reference these via Tailwind utility classes — never hardcode hex values.

**Color scales available:**

| Scale         | Usage                           | Example classes                       |
| ------------- | ------------------------------- | ------------------------------------- |
| `neutral-*`   | Text, borders, backgrounds      | `text-neutral-900`, `bg-neutral-100`  |
| `info-*`      | Primary actions, links, accents | `bg-info-500`, `text-info-500`        |
| `success-*`   | Positive states                 | `bg-success-100 text-success-600`     |
| `warning-*`   | Caution states                  | `bg-warning-100 text-warning-600`     |
| `danger-*`    | Error/destructive states        | `bg-danger-500 text-white`            |
| `discovery-*` | New/promotional states          | `bg-discovery-100 text-discovery-600` |

**Semantic tokens** (for surfaces, borders, text hierarchy):

```html
<div class="bg-surface text-text border-border">...</div>
<p class="text-text-secondary">...</p>
<span class="text-text-muted">...</span>
```

## Spacing — Use Standard Tailwind Utilities

**Never use arbitrary values when a standard utility exists.** Only use `[arbitrary]` syntax when absolutely no standard utility matches.

| Instead of      | Use          | Value |
| --------------- | ------------ | ----- |
| `p-[2px]`       | `p-0.5`      | 2px   |
| `p-[4px]`       | `p-1`        | 4px   |
| `gap-[6px]`     | `gap-1.5`    | 6px   |
| `px-[10px]`     | `px-2.5`     | 10px  |
| `rounded-[2px]` | `rounded-sm` | ~2px  |

Legitimate uses of arbitrary values: `w-[30px]` (no standard width), `text-[10px]` (no standard font size between `text-xs` 12px and nothing smaller).

## Storybook Stories — ALWAYS Required

Every component MUST have a `.stories.ts` file with individual variant stories AND an `AllVariants` story.

**Running Storybook:** `yarn storybook` from repo root (or `cd apps/lfx && yarn storybook`) → opens at `http://localhost:6006`. Stories are sorted alphabetically. After creating a component, remind the user to verify it visually in Storybook.

```typescript
// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { Meta, StoryObj } from '@storybook/angular';
import { Badge } from './badge';

const meta: Meta<Badge> = {
  title: 'Components/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['neutral', 'info', 'success', 'warning', 'danger', 'discovery'],
    },
    size: {
      control: 'select',
      options: ['sm', 'lg'],
    },
  },
  render: (args) => ({
    props: args,
    template: `<lfx-badge [variant]="variant" [size]="size">Tag</lfx-badge>`,
  }),
};

export default meta;
type Story = StoryObj<Badge>;

// Individual stories for each meaningful variant
export const Neutral: Story = {
  args: { variant: 'neutral', size: 'sm' },
};

export const Info: Story = {
  args: { variant: 'info', size: 'sm' },
};

// ... more individual stories ...

// REQUIRED: AllVariants story showing every combination
export const AllVariants: Story = {
  render: () => ({
    template: `
      <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-neutral-500 uppercase">Section Label</span>
          <div class="flex flex-wrap items-center gap-2">
            <lfx-badge variant="neutral">Neutral</lfx-badge>
            <lfx-badge variant="info">Info</lfx-badge>
            <!-- ... all variants ... -->
          </div>
        </div>
      </div>
    `,
  }),
};
```

**AllVariants story pattern:**

- Wrap in `<div class="flex flex-col gap-6">`
- Each section: `<div class="flex flex-col gap-3">` with a label span
- Section labels: `class="text-xs font-semibold text-neutral-500 uppercase"`
- Items row: `<div class="flex flex-wrap items-center gap-2">` (or `gap-3` for buttons)
- Group by: sizes, styles, states (disabled, loading), with/without icons

## Reference Examples

These are the actual components already built. Read them before generating new ones:

| Component       | Good example of                                      |
| --------------- | ---------------------------------------------------- |
| `badge`         | Variant + size Record maps, icon slot                |
| `button`        | Loading/disabled states, icon-only mode, Spinner dep |
| `checkbox`      | `model()` for checked, `[class.invisible]` pattern   |
| `radio-button`  | CSS-only dot indicator, model() binding              |
| `toggle-switch` | Flexbox justify for knob positioning                 |
| `chip`          | Multiple type variants, Avatar integration, dismiss  |
| `tooltip`       | Simple vs description variant, `role="tooltip"`      |
| `card`          | Padding variants, hoverable state                    |
| `avatar`        | Multiple type/size combinations, fallback initials   |

## Checklist

- [ ] Read `styles.css` tokens and existing components before generating
- [ ] Files named `<name>.ts`, `<name>.html`, `<name>.css` (no `.component.` prefix)
- [ ] Class named in PascalCase without `Component` suffix
- [ ] Signal `input()` / `model()` / `output()` API (not decorators)
- [ ] `model()` used for two-way bound state (checked, visible, etc.)
- [ ] Static base classes on template `class`, dynamic on `[class]="computed()"`
- [ ] `[class.invisible]` for toggle elements inside fixed containers (not `@if`)
- [ ] `[class.xxx]="condition"` for individual boolean class toggles
- [ ] File extension is `.css` (not `.scss`)
- [ ] No arbitrary Tailwind values when standard utilities exist
- [ ] All variants covered with `Record<Type, string>` maps
- [ ] `data-testid` on all interactive/container elements
- [ ] `host: { '[attr.data-testid]': '"component-name"' }` on component
- [ ] `type="button"` on non-submit button elements
- [ ] License headers on ALL files (TS, HTML, CSS)
- [ ] Storybook `.stories.ts` with individual stories + `AllVariants`
- [ ] Uses design tokens from theme — no hardcoded hex colors

## Scope Boundaries

**This skill DOES:**

- Generate base Tailwind v4 UI components in `apps/lfx/src/app/shared/components/`
- Generate Storybook stories for every component
- Extend or add variants to existing design system components

**This skill does NOT:**

- Generate feature-level components (pages, forms with business logic) — use `/lfx-ui-builder`
- Generate backend code — use `/lfx-backend-builder`
- Apply to `apps/lfx-one`
