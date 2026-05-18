# Route auth surface

Patterns where new backend routes are mounted without the right auth middleware, or where existing routes leak identity in their error responses. Critical-severity territory — auth bugs are runtime security bugs.

Read when any new file in `apps/lfx-one/src/server/routes/`, `apps/lfx-one/src/server/server.ts`, or `middleware/auth*` changed. Cross-checked by Phase 5.

---

## `bot-finds/route-auth-surface/new-api-route-no-auth-middleware` — CRITICAL

**Pattern:** a new `/api/<X>` route prefix is mounted in `server.ts` (via `app.use('/api/<X>', router)`) but no `authMiddleware` is applied — either at the prefix mount point or inside the router itself. Anyone hitting the endpoint without a session can access it.

**Detect:** in `server.ts`, find each `app.use('/api/<prefix>', router)` line. Verify that either (a) `authMiddleware` is applied immediately before the route mount (e.g., `app.use('/api/<prefix>', authMiddleware, router)`), or (b) the router itself applies `authMiddleware` at the top via `router.use(authMiddleware)`. If neither, fail — the route is unauthenticated.

**Empirical citation:** PR #706 `apps/lfx-one/src/server/controllers/org-lens-foundations.controller.ts:63` — Copilot — "`getFoundationsAndProjects` performs no AuthN/AuthZ check before querying for an arbitrary `accountId` — the route is mounted in `server.ts` without any visible auth middleware on this prefix in the diff."

**Failure message:** New `/api/*` route is mounted without auth middleware — unauthenticated access possible.

**Fix:** apply `authMiddleware` to the prefix in `server.ts` (e.g., `app.use('/api/org-lens', authMiddleware, orgLensRouter)`), OR if intentional, mount under `/public/api/` and add a comment explaining the public exposure.

---

## `bot-finds/route-auth-surface/router-navigate-re-evaluates-guards` — SHOULD_FIX

**Pattern:** `this.router.navigate([...], {...})` is called with an accompanying comment claiming "no navigation" or "no guard re-evaluation". This is wrong — `router.navigate` ALWAYS triggers a navigation event and ALWAYS re-runs guards on the target route. Side effects in those guards (project context mutation, telemetry, fetches) will re-fire.

**Detect:** review comments adjacent to `router.navigate(...)` calls. Flag any that claim it doesn't navigate or doesn't trigger guards.

**Empirical citation:** PR #701 — "`syncProjectQueryParam` comment claims 'no new navigation' but `router.navigate(...)` actually re-evaluates guards. The comment is wrong about behavior."

**Failure message:** Comment misrepresents `router.navigate` — it does trigger guard re-evaluation.

**Fix:** use `Location.go()` or `Location.replaceState()` (with state preservation) for URL-only updates with no navigation event. Or remove the misleading comment and accept that guards will re-evaluate.

---

## `bot-finds/route-auth-surface/error-reveals-auth-state` — SHOULD_FIX

**Pattern:** error response from an authenticated endpoint reveals whether a specific user/registrant/member exists. Same shape of error must be returned regardless of which lookup failed.

**Detect:** review error response construction in controllers handling lookup failures. Check that the error payload is identical whether the user wasn't found, the registrant wasn't found, or the permission check failed.

**Empirical citation:** PR #636 — "Error-message identity leakage — restricted-meeting denial message exposes whether the email or username matched."

**Failure message:** Error message reveals which lookup failed; enables enumeration.

**Fix:** return a generic "Not authorized" response. Log the specific failure server-side at DEBUG, never to the client. See also `bot-finds/security/error-message-identity-leak`.
