# Guards & interceptors ordering

CodeRabbit's strongest signal — interceptor and guard ordering bugs that break SSR cookies, leak unauthorized context mutations, and wipe Router internals. Both bots' highest-Critical-severity findings on this codebase.

Read when `app.config.ts`, anything under `app/shared/guards/` or `app/shared/interceptors/`, or any `*.routes.ts` changed. Cross-checked by Phase 5.

---

## `bot-finds/guards-interceptors-ordering/interceptor-order-breaks-ssr-cookies` — CRITICAL

**Pattern:** in `app.config.ts`'s `withInterceptors([...])` array, a URL-rewriting interceptor (e.g., `ssrBaseUrlInterceptor` that absolutizes paths for SSR loopback) is placed BEFORE the authentication interceptor that adds session cookies based on URL prefix. The auth interceptor only matches `/api/` or `/public/api/` prefixes; once the URL is rewritten to `http://127.0.0.1:PORT/...`, the prefix match fails and cookies are dropped.

**Detect:** in `app.config.ts`, locate the `withInterceptors([...])` array. Check that authentication interceptor appears BEFORE any URL-rewriting interceptor. (Interceptors run in array order on outgoing requests.)

**Empirical citation:** PR #632 `apps/lfx-one/src/app/app.config.ts:40` — CodeRabbit 🔴 Critical — "Placing `ssrBaseUrlInterceptor` before `authenticationInterceptor` breaks authenticated SSR API calls. `authenticationInterceptor` only adds the incoming cookies when `req.url` starts with `/api/` or `/public/api/`, but after the rewrite the URL is `http://127.0.0.1:PORT/…`"

**Failure message:** URL-rewriting interceptor runs before auth interceptor — auth check fails post-rewrite.

**Fix:** reorder the array so the authentication interceptor runs first; URL-rewriting interceptors run after, on already-authenticated requests.

---

## `bot-finds/guards-interceptors-ordering/guard-runs-before-its-prerequisite` — CRITICAL

**Pattern:** in a route's `canActivate: [guardA, guardB]` array, a context-mutating guard (e.g., `projectQueryParamGuard` which looks up + sets the active project) runs BEFORE an access-control guard (e.g., `executiveDirectorGuard`). Non-authorized users hitting the route with the relevant query param still trigger the context mutation before being redirected away — leaking work AND mutating state for unauthenticated requests.

**Detect:** in `*.routes.ts`, for every `canActivate: [...]` array, check the order. Authz guards (executive director, writer, auth) must precede context-mutating guards (query-param resolvers, project setters).

**Empirical citation:** PR #701 — "For ED-only routes, `projectQueryParamGuard` runs before `executiveDirectorGuard`. Because Angular evaluates guards in order, non-ED users hitting `…?project=` will still trigger the project lookup + context mutation before being redirected."

**Failure message:** Context-mutating guard runs before access-control guard — unauthorized users trigger context changes before redirect.

**Fix:** reorder `canActivate` so authz guards come first. Context-mutating guards should only run when authorization has already passed.

---

## `bot-finds/guards-interceptors-ordering/replaceState-loses-history-state` — SHOULD_FIX

**Pattern:** `Location.replaceState(url)` is called with only one argument, wiping `history.state`. Angular Router stores its `navigationId` in `history.state`; wiping it breaks `Router.getCurrentNavigation()` and back-button behavior.

**Detect:** grep for `\.replaceState\(\s*[^,)]+\s*\)` — calls with only the URL arg, no state preservation.

**Empirical citation:** PR #701 — "`Location.replaceState(...)` without preserving `history.state` — Angular Router's `navigationId` gets wiped."

**Failure message:** `replaceState` without state preservation breaks Router internals.

**Fix:** either (a) pass `history.state` as the third argument: `this.location.replaceState(url, '', history.state)`, OR (b) use `this.router.navigate(...)` with `replaceUrl: true` and `skipLocationChange: false` if you actually need Router-aware navigation.
