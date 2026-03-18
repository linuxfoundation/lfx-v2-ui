---
name: lfx-ui-builder
description: >
  Generate Angular 20 frontend code for apps/lfx — feature components, services,
  and templates. Encodes signal patterns, component structure, Tailwind v4 styling,
  and all frontend conventions. For base design system components, use /lfx-design instead.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion
---

<!-- Copyright The Linux Foundation and each contributor to LFX. -->
<!-- SPDX-License-Identifier: MIT -->

# LFX Frontend Code Generation

You generate Angular 20 frontend code for `apps/lfx` that must be PR-ready. This skill handles feature-level components and services — pages, forms, module components, and shared services.

**For new base UI components** (buttons, inputs, cards, modals): use `/lfx-design` instead.

**Prerequisites:** Backend endpoints must already exist. No mock data, no placeholder APIs.

## Input Validation

| Required                                  | If Missing                                           |
| ----------------------------------------- | ---------------------------------------------------- |
| Specific task (what to build/modify)      | Stop and ask — do not guess                          |
| Absolute repo path                        | Stop and ask                                         |
| Which module (committees, meetings, etc.) | Infer from context or ask                            |
| Type definitions being used               | Must be provided or derivable from `packages/shared` |

**If invoked with a `FIX:` prefix**, read the error, find the file, apply the targeted fix, re-validate.

## Read Before Generating — MANDATORY

Before writing ANY code:

1. **Read the target file** (if modifying) — understand what's already there
2. **Read one example file** in the same module — match the exact current patterns
3. **Read the relevant interface/type file** in `packages/shared/src/interfaces/`

```bash
ls apps/lfx/src/app/modules/
ls apps/lfx/src/app/shared/components/   # available base components
ls packages/shared/src/interfaces/
```

## Component Structure

Generate components using the Angular CLI when adding to an existing module:

```bash
cd apps/lfx
ng generate component modules/<module>/<component-name> --skip-tests
```

Then implement following this class structure:

```typescript
// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, Signal, inject, input, model, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { filter, switchMap } from 'rxjs';
import { MyItem } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-my-component',
  standalone: true,
  imports: [],
  templateUrl: './my-component.component.html',
  styleUrl: './my-component.component.css',
})
export class MyComponentComponent {
  // 1. Private injections (inject(), readonly)
  private readonly myService = inject(MyService);

  // 2. Public fields from inputs (readonly)
  public readonly itemId = input.required<string>();

  // 3. Forms (if applicable)

  // 4. Model signals (model()) — for two-way binding
  public visible = model(false);

  // 5. WritableSignals (signal())
  public loading = signal(false);

  // 6. Complex computed/toSignal — via private init functions
  public item: Signal<MyItem | null> = this.initItem();

  // 7. Constructor (only if needed)

  // 8. Public methods
  public onSave(): void {
    /* ... */
  }

  // 9. Protected methods

  // 10. Private initializer functions (grouped)
  private initItem(): Signal<MyItem | null> {
    return toSignal(
      toObservable(this.itemId).pipe(
        filter((id) => !!id),
        switchMap((id) => this.myService.getItem(id))
      ),
      { initialValue: null }
    );
  }

  // 11. Private helper methods
}
```

## Template Rules

```html
<!-- Copyright The Linux Foundation and each contributor to LFX. -->
<!-- SPDX-License-Identifier: MIT -->

@if (loading()) {
<lfx-spinner />
} @else {
<div class="flex flex-col gap-4" data-testid="my-section">
  @for (item of items(); track item.id) {
  <div data-testid="item-card">{{ item.name }}</div>
  }
</div>
}
```

- Always `@if` / `@for` — never `*ngIf` / `*ngFor`
- Always `flex + flex-col + gap-*` — never `space-y-*`
- `data-testid` on all interactive and container elements
- Never nest ternary expressions
- Selector prefix: `lfx-`
- Use base components from `apps/lfx/src/app/shared/components/` (built by `/lfx-design`)

## Frontend Service Pattern

```bash
cd apps/lfx
ng generate service shared/services/<name> --skip-tests
```

```typescript
// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, of, take } from 'rxjs';
import { MyItem } from '@lfx-one/shared/interfaces';

@Injectable({ providedIn: 'root' })
export class MyService {
  private readonly http = inject(HttpClient);

  public items = signal<MyItem[]>([]);

  public getItems() {
    return this.http.get<MyItem[]>('/api/items').pipe(catchError(() => of([] as MyItem[])));
  }

  public createItem(payload: Partial<MyItem>) {
    return this.http.post<MyItem>('/api/items', payload).pipe(take(1));
  }
}
```

Service rules:

- `@Injectable({ providedIn: 'root' })` — always tree-shakeable
- `inject(HttpClient)` — never constructor-based DI
- GET requests: `catchError(() => of(defaultValue))`
- POST/PUT/DELETE: `take(1)` and let errors propagate
- **Signals can't use RxJS pipes** — use `computed()` or `toSignal()` for reactive transforms
- Interfaces from `@lfx-one/shared/interfaces` — never define locally

## Component Placement

| Category                  | Location                                               |
| ------------------------- | ------------------------------------------------------ |
| Route/page component      | `apps/lfx/src/app/modules/<module>/<name>/`            |
| Module-specific component | `apps/lfx/src/app/modules/<module>/components/<name>/` |
| Shared feature component  | `apps/lfx/src/app/shared/components/<name>/`           |

## Checklist

- [ ] Read the existing example before generating
- [ ] Used Angular CLI to generate file scaffolding
- [ ] Component is standalone with direct imports (no barrels)
- [ ] File extension is `.css` (not `.scss`)
- [ ] 11-section class structure followed
- [ ] `input()` / `output()` signal API (not `@Input()` / `@Output()`)
- [ ] Uses `@if`/`@for` (not `*ngIf`/`*ngFor`)
- [ ] Uses `flex + gap-*` (not `space-y-*`)
- [ ] `data-testid` on all key elements
- [ ] Selector prefixed with `lfx-`
- [ ] No nested ternary expressions
- [ ] License headers on all files
- [ ] Interfaces from `@lfx-one/shared/interfaces`
- [ ] Signals don't use RxJS pipes directly

## Scope Boundaries

**This skill DOES:**

- Generate feature-level Angular components, services, and templates for `apps/lfx`

**This skill does NOT:**

- Generate base design system components — use `/lfx-design`
- Generate backend Express code — use `/lfx-backend-builder`
- Apply to `apps/lfx-one` — use the existing `/develop` skill for that
