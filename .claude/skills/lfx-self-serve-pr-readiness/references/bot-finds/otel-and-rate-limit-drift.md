# OTEL & rate-limit drift

Patterns where renaming routes or adding new health endpoints causes drift in OpenTelemetry's ignore-list and the rate limiter's whitelist. Low volume but recurring — every time routes change, these two files need cross-check.

Read when `apps/lfx-one/otel.mjs`, `apps/lfx-one/src/server/middleware/rate-limit.ts`, or any new route registration in `server.ts` changed. Cross-checked by Phase 5.

---

## `bot-finds/otel-and-rate-limit-drift/otel-ignore-list-drift` — SHOULD_FIX

**Pattern:** when health/probe routes are renamed (e.g., `/health` → `/livez`, `/readyz`), the `ignoreIncomingRequestHook` in `apps/lfx-one/otel.mjs` must be updated or the new probe paths generate spans on every k8s probe (typically every 5 seconds = ~17,000 spans/day per pod, all useless).

**Detect:** when the diff renames or adds health/probe routes in `server.ts`, cross-check `apps/lfx-one/otel.mjs` `ignoreIncomingRequestHook` for matching path patterns. Flag if the OTEL list doesn't include the new paths.

**Empirical citation:** PR #639 — "OTel `ignoreIncomingRequestHook` still references old `/health` path. Renaming routes without updating OTEL produces probe-traffic spans."

**Failure message:** OTEL ignore-list still references old health-route paths — probe traffic now generates spans.

**Fix:** update `apps/lfx-one/otel.mjs` `ignoreIncomingRequestHook` to match the current health/probe endpoint paths. Use a regex/glob covering both old and new names if you're in a transition window.

---

## `bot-finds/otel-and-rate-limit-drift/health-endpoint-inside-rate-limiter` — SHOULD_FIX

**Pattern:** liveness / readiness / health endpoints (`/livez`, `/readyz`, `/healthz`) are mounted INSIDE the `/api` rate-limit middleware. Kubernetes probes fire on a fixed cadence; under load (or with multiple pods), probe traffic can exhaust the rate-limit budget and cause probes to fail, triggering pod restarts.

**Detect:** check that health/probe routes are mounted OUTSIDE the `/api` (or any rate-limited) prefix. In `server.ts`, the probes should be `app.use('/livez', ...)` etc., NOT under `app.use('/api', rateLimiter, ...)`.

**Empirical citation:** PR #639 — "Rate limiting placement — `/livez` and `/readyz` should remain outside the `/api` rate limiter."

**Failure message:** Health endpoint inside rate limiter — k8s probes can exhaust the budget; risk of probe-induced restarts.

**Fix:** mount probes outside `/api`, OR add them to the rate limiter's whitelist (skip rate-limit for probe IPs / paths). See `docs/architecture/backend/rate-limiting.md` for the recommended structure.

---

## `bot-finds/otel-and-rate-limit-drift/missing-route-in-tracer-config` — NIT

**Pattern:** a new high-traffic Express route is added without checking whether its span attributes are being captured correctly by `server-tracer.ts`. Custom span attributes (route name, user ID) might not propagate.

**Detect:** when new routes are mounted with non-trivial traffic, verify `server-tracer.ts` configuration would tag spans appropriately.

**Empirical citation:** general infrastructure pattern; flagged in PR #635 area ("tag APM spans with matched Express route").

**Failure message:** New route may not propagate matched-route span attribute.

**Fix:** ensure the route is registered with Express in a way that `req.route.path` is populated (use Router, not raw `app.use` with regex), and `server-tracer.ts` reads from `req.route.path` for span naming.
