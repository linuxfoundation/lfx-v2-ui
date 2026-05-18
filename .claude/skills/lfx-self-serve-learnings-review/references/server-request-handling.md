# Server request handling

Patterns where new backend routes are mounted without the right auth middleware, guards / interceptors are ordered wrong, history state is wiped on URL updates, or Express query / body / route params are consumed without the project's hardening helpers. CodeRabbit's strongest signal on this codebase — auth and ordering bugs are runtime security bugs.

**Read when:** `app.config.ts`, anything under `app/shared/guards/` or `app/shared/interceptors/`, any `*.routes.ts`, any new file under `apps/lfx-one/src/server/routes/`, `apps/lfx-one/src/server/server.ts`, `middleware/auth*`, or any file under `apps/lfx-one/src/server/controllers/` or `apps/lfx-one/src/server/services/`. Cross-checked by Phase 5.

---

## `server-request-handling/interceptor-order-breaks-ssr-cookies` — CRITICAL

**Pattern:** in `app.config.ts`'s `withInterceptors([...])` array, a URL-rewriting interceptor (e.g., `ssrBaseUrlInterceptor` that absolutizes paths for SSR loopback) is placed BEFORE the authentication interceptor that adds session cookies based on URL prefix. The auth interceptor only matches `/api/` or `/public/api/` prefixes; once the URL is rewritten to `http://127.0.0.1:PORT/...`, the prefix match fails and cookies are dropped.

**Detect:** in `app.config.ts`, locate the `withInterceptors([...])` array. Check that authentication interceptor appears BEFORE any URL-rewriting interceptor. (Interceptors run in array order on outgoing requests.)

**Empirical citation:** PR #632 `apps/lfx-one/src/app/app.config.ts:40` — CodeRabbit 🔴 Critical — "Placing `ssrBaseUrlInterceptor` before `authenticationInterceptor` breaks authenticated SSR API calls. `authenticationInterceptor` only adds the incoming cookies when `req.url` starts with `/api/` or `/public/api/`, but after the rewrite the URL is `http://127.0.0.1:PORT/…`"

**Failure message:** URL-rewriting interceptor runs before auth interceptor — auth check fails post-rewrite.

**Fix:** reorder the array so the authentication interceptor runs first; URL-rewriting interceptors run after, on already-authenticated requests.

---

## `server-request-handling/guard-runs-before-its-prerequisite` — CRITICAL

**Pattern:** in a route's `canActivate: [guardA, guardB]` array, a context-mutating guard (e.g., `projectQueryParamGuard` which looks up + sets the active project) runs BEFORE an access-control guard (e.g., `executiveDirectorGuard`). Non-authorized users hitting the route with the relevant query param still trigger the context mutation before being redirected away — leaking work AND mutating state for unauthenticated requests.

**Detect:** in `*.routes.ts`, for every `canActivate: [...]` array, check the order. Authz guards (executive director, writer, auth) must precede context-mutating guards (query-param resolvers, project setters).

**Empirical citation:** PR #701 — "For ED-only routes, `projectQueryParamGuard` runs before `executiveDirectorGuard`. Because Angular evaluates guards in order, non-ED users hitting `…?project=` will still trigger the project lookup + context mutation before being redirected."

**Failure message:** Context-mutating guard runs before access-control guard — unauthorized users trigger context changes before redirect.

**Fix:** reorder `canActivate` so authz guards come first. Context-mutating guards should only run when authorization has already passed.

---

## `server-request-handling/new-api-route-no-auth-middleware` — CRITICAL

**Pattern:** a new `/api/<X>` route prefix is mounted in `server.ts` (via `app.use('/api/<X>', router)`) but no `authMiddleware` is applied — either at the prefix mount point or inside the router itself. Anyone hitting the endpoint without a session can access it.

**Detect:** in `server.ts`, find each `app.use('/api/<prefix>', router)` line. Verify that either (a) `authMiddleware` is applied immediately before the route mount (e.g., `app.use('/api/<prefix>', authMiddleware, router)`), or (b) the router itself applies `authMiddleware` at the top via `router.use(authMiddleware)`. If neither, fail — the route is unauthenticated.

**Empirical citation:** PR #706 `apps/lfx-one/src/server/controllers/org-lens-foundations.controller.ts:63` — Copilot — "`getFoundationsAndProjects` performs no AuthN/AuthZ check before querying for an arbitrary `accountId` — the route is mounted in `server.ts` without any visible auth middleware on this prefix in the diff."

**Failure message:** New `/api/*` route is mounted without auth middleware — unauthenticated access possible.

**Fix:** apply `authMiddleware` to the prefix in `server.ts` (e.g., `app.use('/api/org-lens', authMiddleware, orgLensRouter)`), OR if intentional, mount under `/public/api/` and add a comment explaining the public exposure.

---

## `server-request-handling/replaceState-loses-history-state` — SHOULD_FIX

**Pattern:** `Location.replaceState(url)` is called with only one argument, wiping `history.state`. Angular Router stores its `navigationId` in `history.state`; wiping it breaks `Router.getCurrentNavigation()` and back-button behavior.

**Detect:** grep for `\.replaceState\(\s*[^,)]+\s*\)` — calls with only the URL arg, no state preservation.

**Empirical citation:** PR #701 — "`Location.replaceState(...)` without preserving `history.state` — Angular Router's `navigationId` gets wiped."

**Failure message:** `replaceState` without state preservation breaks Router internals.

**Fix:** either (a) pass `history.state` as the third argument: `this.location.replaceState(url, '', history.state)`, OR (b) use `this.router.navigate(...)` with `replaceUrl: true` and `skipLocationChange: false` if you actually need Router-aware navigation.

---

## `server-request-handling/router-navigate-re-evaluates-guards` — SHOULD_FIX

**Pattern:** `this.router.navigate([...], {...})` is called with an accompanying comment claiming "no navigation" or "no guard re-evaluation". This is wrong — `router.navigate` ALWAYS triggers a navigation event and ALWAYS re-runs guards on the target route. Side effects in those guards (project context mutation, telemetry, fetches) will re-fire.

**Detect:** review comments adjacent to `router.navigate(...)` calls. Flag any that claim it doesn't navigate or doesn't trigger guards.

**Empirical citation:** PR #701 — "`syncProjectQueryParam` comment claims 'no new navigation' but `router.navigate(...)` actually re-evaluates guards. The comment is wrong about behavior."

**Failure message:** Comment misrepresents `router.navigate` — it does trigger guard re-evaluation.

**Fix:** use `Location.go()` or `Location.replaceState()` (with state preservation) for URL-only updates with no navigation event. Or remove the misleading comment and accept that guards will re-evaluate.

---

## `server-request-handling/raw-query-string-cast` — SHOULD_FIX

**Pattern:** `req.query['name'] as string` cast instead of using the project's `getStringQueryParam(req, 'name')` helper. Bypasses input hardening; can yield an array when the client sends repeated keys (`?name=a&name=b`). Also loses runtime type safety.

**Detect:** grep for `req\.query\[['"][^'"]+['"]\]\s+as\s+string` in `apps/lfx-one/src/server/**`.

**Empirical citation:** PR #665 `apps/lfx-one/src/server/controllers/project.controller.ts:774` — "`documentType` is read via `req.query['type'] as string`, which bypasses the `getStringQueryParam` hardening used elsewhere (and can yield an array when the client sends repeated keys). Use `getStringQueryParam(req, 'type')`." Same PR was also flagged from the type-safety lens — the cast loses runtime safety and ignores the multi-value case.

**Failure message:** Raw query-param cast bypasses input hardening; can yield arrays from repeated keys; loses runtime safety.

**Fix:** use `getStringQueryParam(req, 'name')` from `apps/lfx-one/src/server/helpers/validation.ts`. Project-wide convention. Same applies to `getNumberQueryParam`, `getBooleanQueryParam`, etc.

---

## `server-request-handling/untrimmed-query-value` — SHOULD_FIX

**Pattern:** a query parameter is fetched via `getStringQueryParam(...)` (good) but not trimmed (bad). A whitespace-only value (`?name=%20`) is then treated as an active search/filter.

**Detect:** review every `getStringQueryParam` consumer — verify the value is either checked for emptiness after trim, or trimmed before use.

**Empirical citation:** PR #638 `apps/lfx-one/src/app/.../navigation.service.ts:202` — "`name` comes from a raw query param (via getStringQueryParam) and is not trimmed, so a whitespace-only value (e.g. `?name=%20`) will be treated as an active search."

**Failure message:** Query param value not trimmed; whitespace-only values treated as content.

**Fix:** trim the value: `const name = getStringQueryParam(req, 'name').trim()`. Then check for empty: `if (!name) return ...`. The pattern should be: trim first, validate non-empty, then use.

---

## `server-request-handling/missing-typeof-string-validation` — SHOULD_FIX

**Pattern:** `validateRequiredParameter(req.params.id, 'id')` (or analogous validator) only checks presence, not type. If a route accepts repeated keys or the helper doesn't narrow type, downstream code may receive an array where it expects a string.

**Detect:** review `validateRequiredParameter` / `validateRequiredField` consumers. Verify the validator (in `apps/lfx-one/src/server/helpers/validation.ts`) narrows to `string`, not just `any`.

**Empirical citation:** general pattern from CodeRabbit on multiple PRs; called out as a recurring gap in the validation-helper coverage.

**Failure message:** Required-parameter validator doesn't enforce string type — downstream type-safety gap.

**Fix:** either (a) extend the validator to enforce `typeof value === 'string'`, (b) use `getStringQueryParam` / `getStringRouteParam` which already narrow, or (c) add an explicit type guard at the controller layer before passing to the service.

---

## `server-request-handling/regex-too-loose-for-id-format` — SHOULD_FIX

**Pattern:** a regex used to validate an identifier (account ID, project UID, slug, UUID) is too permissive — accepts lengths or character classes the upstream spec doesn't.

**Detect:** review identifier-validation regexes against the documented format (Salesforce account IDs are exactly 15 or 18 chars; UUIDs have a specific length and dash pattern).

**Empirical citation:** PR #706 `apps/lfx-one/src/server/controllers/org-lens-foundations.controller.ts:11` — Copilot — "`ACCOUNT_ID_PATTERN = /^001[A-Za-z0-9]{12,15}$/` allows lengths 15–18 (`001` + 12..15 chars), but Salesforce account IDs are exactly 15 or 18 characters."

**Failure message:** Regex accepts lengths the spec doesn't; will let through invalid IDs.

**Fix:** tighten the regex to match the actual spec. For Salesforce account IDs: `/^001[A-Za-z0-9]{12}([A-Za-z0-9]{3})?$/` (exactly 15, optionally extended to 18). For UUIDs, use a tested regex from a library or pin to the v4/v5 format you actually accept.

**See also:** `security/error-message-identity-leak` — when an authenticated endpoint's error response reveals which lookup failed, that's the security-leak variant of route auth-surface hygiene.
