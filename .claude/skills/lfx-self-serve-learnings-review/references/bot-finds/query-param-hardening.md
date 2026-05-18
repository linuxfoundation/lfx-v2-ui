# Query-param hardening

Patterns where Express query / body / route params are consumed without the project's hardening helpers. Both bots flag these — Copilot catches the structural pattern, CodeRabbit reinforces with project-convention recall.

Read when any file under `apps/lfx-one/src/server/controllers/` or `apps/lfx-one/src/server/services/` changed. Cross-checked by Phase 5.

---

## `bot-finds/query-param-hardening/raw-query-string-cast` — SHOULD_FIX

**Pattern:** `req.query['name'] as string` cast instead of using the project's `getStringQueryParam(req, 'name')` helper. Bypasses input hardening; can yield an array when the client sends repeated keys (`?name=a&name=b`).

**Detect:** grep for `req\.query\[['"][^'"]+['"]\]\s+as\s+string` in `apps/lfx-one/src/server/**`.

**Empirical citation:** PR #665 `apps/lfx-one/src/server/controllers/project.controller.ts:774` — "`documentType` is read via `req.query['type'] as string`, which bypasses the `getStringQueryParam` hardening used elsewhere (and can yield an array when the client sends repeated keys). Use `getStringQueryParam(req, 'type')`."

**Failure message:** Raw query-param cast bypasses input hardening.

**Fix:** use `getStringQueryParam(req, 'name')` from `apps/lfx-one/src/server/helpers/validation.ts`. Project-wide convention. Same applies to `getNumberQueryParam`, `getBooleanQueryParam`, etc.

---

## `bot-finds/query-param-hardening/untrimmed-query-value` — SHOULD_FIX

**Pattern:** a query parameter is fetched via `getStringQueryParam(...)` (good) but not trimmed (bad). A whitespace-only value (`?name=%20`) is then treated as an active search/filter.

**Detect:** review every `getStringQueryParam` consumer — verify the value is either checked for emptiness after trim, or trimmed before use.

**Empirical citation:** PR #638 `apps/lfx-one/src/app/.../navigation.service.ts:202` — "`name` comes from a raw query param (via getStringQueryParam) and is not trimmed, so a whitespace-only value (e.g. `?name=%20`) will be treated as an active search."

**Failure message:** Query param value not trimmed; whitespace-only values treated as content.

**Fix:** trim the value: `const name = getStringQueryParam(req, 'name').trim()`. Then check for empty: `if (!name) return ...`. The pattern should be: trim first, validate non-empty, then use.

---

## `bot-finds/query-param-hardening/missing-typeof-string-validation` — SHOULD_FIX

**Pattern:** `validateRequiredParameter(req.params.id, 'id')` (or analogous validator) only checks presence, not type. If a route accepts repeated keys or the helper doesn't narrow type, downstream code may receive an array where it expects a string.

**Detect:** review `validateRequiredParameter` / `validateRequiredField` consumers. Verify the validator (in `apps/lfx-one/src/server/helpers/validation.ts`) narrows to `string`, not just `any`.

**Empirical citation:** general pattern from CodeRabbit on multiple PRs; called out as a recurring gap in the validation-helper coverage.

**Failure message:** Required-parameter validator doesn't enforce string type — downstream type-safety gap.

**Fix:** either (a) extend the validator to enforce `typeof value === 'string'`, (b) use `getStringQueryParam` / `getStringRouteParam` which already narrow, or (c) add an explicit type guard at the controller layer before passing to the service.

---

## `bot-finds/query-param-hardening/regex-too-loose-for-id-format` — SHOULD_FIX

**Pattern:** a regex used to validate an identifier (account ID, project UID, slug, UUID) is too permissive — accepts lengths or character classes the upstream spec doesn't.

**Detect:** review identifier-validation regexes against the documented format (Salesforce account IDs are exactly 15 or 18 chars; UUIDs have a specific length and dash pattern).

**Empirical citation:** PR #706 `apps/lfx-one/src/server/controllers/org-lens-foundations.controller.ts:11` — Copilot — "`ACCOUNT_ID_PATTERN = /^001[A-Za-z0-9]{12,15}$/` allows lengths 15–18 (`001` + 12..15 chars), but Salesforce account IDs are exactly 15 or 18 characters."

**Failure message:** Regex accepts lengths the spec doesn't; will let through invalid IDs.

**Fix:** tighten the regex to match the actual spec. For Salesforce account IDs: `/^001[A-Za-z0-9]{12}([A-Za-z0-9]{3})?$/` (exactly 15, optionally extended to 18). For UUIDs, use a tested regex from a library or pin to the v4/v5 format you actually accept.
