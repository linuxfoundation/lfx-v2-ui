# Testing

Patterns the bots flag when non-trivial logic ships without a matching test. The signal is moderate (3 + 3 finds) — bots don't aggressively police test coverage, but they reliably flag entirely-new services/components shipped without any spec.

Read when any new feature module / service / component is added without a matching `*.spec.ts`. Cross-checked by Phase 5.

---

## `bot-finds/testing/new-service-without-spec` — SHOULD_FIX

**Pattern:** a new `.service.ts` file is added to the diff without a corresponding `.service.spec.ts` in the same directory. Same applies to new `.module.ts` / non-trivial `.component.ts`.

**Detect:** from the changed-file list, identify new `.service.ts` / `.module.ts` / `.component.ts` files. For each, check whether a sibling `*.spec.ts` exists in the same directory.

**Empirical citation:** PR #706 — "No test file added for the new `OrgLensFoundationsService`."

**Failure message:** New service shipped without any test coverage.

**Fix:** add a `<name>.service.spec.ts` (or `.component.spec.ts`) covering at minimum the happy path and one error/edge case. Use the existing spec patterns in nearby modules.

---

## `bot-finds/testing/missing-e2e-for-empty-state` — SHOULD_FIX

**Pattern:** a new empty-state UI (no-data card, zero-mentions panel, fallback message) is added without an e2e spec exercising it. Empty-states are notoriously easy to break silently when data shapes change.

**Detect:** when changes touch empty-state templates (`@if (!data())` / `@if (items().length === 0)` branches in `.component.html`), look for a matching e2e spec under `e2e/` that asserts on the empty-state copy/element.

**Empirical citation:** PR #685 — "Missing e2e for zero-mentions Brand Health drawer."

**Failure message:** New empty-state UI has no e2e coverage; can silently regress.

**Fix:** add an e2e spec under `e2e/<feature>/` that mocks zero-data and asserts the empty-state element renders. Use `data-testid` for stable selectors.

---

## `bot-finds/testing/non-trivial-logic-without-unit` — SHOULD_FIX

**Pattern:** an existing service gains a non-trivial method (>10 lines, branching, transforms data) without a corresponding new test case in the sibling `.spec.ts`.

**Detect:** when a `.service.ts` file in the diff has new exported method(s), check the sibling `.spec.ts` for a matching `describe`/`it` block.

**Empirical citation:** general pattern from CodeRabbit + Copilot in 6 PRs; not always a hard flag but a recurring NIT-to-SHOULD-FIX.

**Failure message:** New method added to service without a corresponding unit test.

**Fix:** add a unit test exercising the method's happy path and at least one edge case. If the method is genuinely trivial (e.g., a single property getter), document why in a comment and downgrade to NIT.
