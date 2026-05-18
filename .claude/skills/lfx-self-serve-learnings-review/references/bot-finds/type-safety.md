# Type safety

TypeScript-soundness patterns the bots flag — generics whose return types lie, non-null assertions on async results, raw `as` casts that bypass guards, deep imports that route around the barrel.

Read when any `.ts` file changed. Cross-checked by Phase 5; findings without a quotable pattern below are dropped.

---

## `bot-finds/type-safety/generic-return-type-lies` — CRITICAL

**Pattern:** generic utility function whose declared return type doesn't account for runtime `null` / `undefined` when the type parameter resolves to a primitive (string, number).

**Detect:** grep for `function <name><T>(...)` where the body can return `null` but the return type is declared as `T` (or any type that doesn't include null). Especially look at object-mapping utilities, ID helpers, deep-clone-like functions.

**Empirical citation:** PR #673 `packages/shared/src/utils/object.utils.ts` — "`nullifyEmptyStrings<T>` returns `null` for `T = string`. The generic claims `T` but returns null at runtime, breaking caller assumptions."

**Failure message:** Generic claims `T` but returns null at runtime — the type lies.

**Fix:** narrow the type parameter with a constraint (`T extends object`), or widen the return type to `T | null` and require callers to handle the null case.

---

## `bot-finds/type-safety/non-null-assertion-on-async-result` — SHOULD_FIX

**Pattern:** non-null assertion (`!`) on a value that's the result of an async call, an array `.find(...)`, an HTTP response field, a route param, or a `signal()` value — any of which can be undefined at runtime.

**Detect:** grep for `\.(find|first|get)\s*\([^)]*\)!` or `(request[a-zA-Z]+)\([^)]*\)!` or `\.signal\(\)!`.

**Empirical citation:** PR #673 area — non-null on `find(...)` in object-utils chains; multiple other PRs flagged similar patterns.

**Failure message:** Non-null assertion on a potentially-undefined async result will throw at runtime if the result is missing.

**Fix:** handle the undefined case explicitly with an `if` guard or a default value (`?? defaultValue`). If the value is genuinely guaranteed non-null by an invariant, prefer a type-narrowing helper that asserts the invariant explicitly.

---

## `bot-finds/type-safety/raw-query-param-string-cast` — SHOULD_FIX

**Pattern:** `req.query['name'] as string` cast that bypasses the `getStringQueryParam` query-param hardening used elsewhere in the codebase. The cast loses type safety AND ignores the multi-value case (`?name=a&name=b` yields an array).

**Detect:** grep for `req\.query\[['"][^'"]+['"]\]\s+as\s+string` in `apps/lfx-one/src/server/**`.

**Empirical citation:** PR #665 `apps/lfx-one/src/server/controllers/project.controller.ts:774` — "`documentType` is read via `req.query['type'] as string`, which bypasses the `getStringQueryParam` hardening used elsewhere (and can yield an array when the client sends repeated keys)."

**Failure message:** Raw query-param cast bypasses input hardening; can yield arrays from repeated keys; loses runtime safety.

**Fix:** use `getStringQueryParam(req, 'type')` (from `apps/lfx-one/src/server/helpers/validation.ts`). This is a project-wide convention.

---

## `bot-finds/type-safety/deep-shared-import` — SHOULD_FIX

**Pattern:** importing from `@lfx-one/shared/<category>/<file>` instead of the barrel (`@lfx-one/shared/<category>`). Bypasses the curated public surface and risks importing internal helpers.

**Detect:** grep for `from '@lfx-one/shared/(interfaces|enums|constants|utils|validators)/[^'"]+'` (matches a path with a deeper segment after the category).

**Empirical citation:** 8 Copilot finds across multiple PRs (PRs sampled: #706, #678, others) — typically `from '@lfx-one/shared/interfaces/org-involvement.interface'` instead of `from '@lfx-one/shared/interfaces'`.

**Failure message:** Deep import bypasses the barrel; you may be reaching into the internal surface.

**Fix:** import from `@lfx-one/shared/interfaces` (or the appropriate sub-barrel). If the type isn't exported from the barrel, add it to `index.ts` rather than deep-importing.
