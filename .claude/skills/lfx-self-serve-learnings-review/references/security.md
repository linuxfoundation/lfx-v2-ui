# Security

Trust-boundary patterns across the stack — credential disclosure, identity enumeration, public-meeting visibility, untrusted URL binding, sanitizer bypass, and cookie-as-identity. Sampled from CodeRabbit / GitHub Copilot PR comments 2026-03-15 → 2026-05-15.

**Read when:** always — secrets, sanitization, auth-state leakage, untrusted cookies and untrusted URLs can hit any change. Cross-checked by `/lfx-self-serve-learnings-review` Phase 4 — findings without a quotable pattern below are dropped.

---

## `security/secrets-in-diff` — CRITICAL

**Pattern:** hardcoded tokens, API keys, `Bearer ey...`, `sk_live_`, `sk_test_`, AWS keys, or any other credential committed to the diff.

**Detect:** grep the diff for `(api[_-]?key|secret|token|password|Bearer\s+ey|sk_live|sk_test|AKIA[0-9A-Z]{16})\s*[:=]\s*['"]` (case-insensitive). Also flag any new `.env` / `*.local.json` / `*.pem` file that doesn't have a corresponding `.gitignore` entry.

**Empirical citation:** not observed in our sampled PRs (which is good). Preventive — CodeRabbit's Gitleaks scan catches this for every PR; we mirror the check pre-PR.

**Failure message:** Hardcoded secret detected — never commit credentials.

**Fix:** move to environment variable, fetch via 1Password (`op://...`), or revert the change. If the secret leaked already, rotate it before merging.

---

## `security/public-meeting-visibility-filter` — CRITICAL

**Pattern:** a public endpoint serving meeting/event data must filter by `visibility: 'public'` before pagination — otherwise the page response can contain private items.

**Detect:** for any new endpoint under `/public/api/*` returning meeting/event data, verify that the upstream query (`MicroserviceProxyService.proxyRequest` call) includes a visibility filter, and that filtering happens BEFORE `page_size` / `page_token` paging.

**Empirical citation:** PR #697 `apps/lfx-one/src/server/controllers/project.controller.ts` (`/public/api/projects/:id/calendar.ics` endpoint) — public ICS calendar endpoint didn't filter by visibility before paginating; private meetings could appear in anonymous ICS feeds.

**Failure message:** Public endpoint paginates over data that may contain private items.

**Fix:** apply the visibility filter in the upstream query (not in post-processing), so paging is bounded to public-only data.

---

## `security/href-from-untrusted-source` — CRITICAL

**Pattern:** an element's `[href]` is bound to a value sourced from user input or an external API response without validation. Risk of `javascript:` URL injection.

**Detect:** find `[href]="..."` bindings whose source is a service / API response / user-provided field. Verify the value is either (a) constructed from known-safe template literals, or (b) validated against an allowlist of schemes (`http`, `https`).

**Empirical citation:** general security best-practice; bot-flagged occasionally in PRs touching external-link rendering.

**Failure message:** `[href]` bound to untrusted value — `javascript:` URL injection risk.

**Fix:** validate the URL scheme before binding. Reject (or substitute) any URL whose scheme isn't `http` or `https`. Don't rely solely on the sanitizer — Angular's default protection is for runtime sanitization, but explicit validation is safer.

---

## `security/cookie-as-identity-no-validation` — CRITICAL

**Pattern:** a cookie value is parsed as JSON or destructured as an identity/account/session object, and the resulting data is used to drive authorization, queries, or UI state — without validating the shape or verifying a signature.

**Detect:** grep for `req\.cookies\[` followed within ~5 lines by `JSON\.parse(` or destructuring of an expected shape. Verify there's either (a) a zod/joi/yup schema validation, OR (b) signed-cookie verification (HMAC / express-session signature check) before the value is trusted.

**Empirical citation:** PR #667 — "`selectedAccount` initialized from cookie value without validation. Cookie payload treated as trusted." A malicious user could craft a cookie that injects an arbitrary `accountId` into downstream queries.

**Failure message:** Cookie payload used as identity / trusted data without shape or signature validation. Tampering exposure.

**Fix:** (a) define a zod schema for the expected cookie payload and parse-or-reject; (b) if cookie is supposed to be signed, verify the signature before parsing; (c) treat the value as untrusted input and validate against a known list of acceptable account IDs from the authenticated session.

---

## `security/error-message-identity-leak` — SHOULD_FIX

**Pattern:** error messages that disclose whether a username/email/identifier matched (timing or content-based account enumeration). The denial response differs based on which lookup failed. Applies to both unauthenticated lookups and authenticated endpoints whose error payloads vary by which lookup failed (user vs. registrant vs. permission check).

**Detect:** grep for error responses that branch on `if (user)` / `if (registrant)` / `if (member)` with different `res.status(...).json({ message: ... })` per branch. Also review controllers handling lookup failures — check that the error payload is identical whether the user wasn't found, the registrant wasn't found, or the permission check failed.

**Empirical citation:** PR #636 `apps/lfx-one/src/server/services/meeting.service.ts` — "restricted-meeting denial message exposes whether the email or username matched. The denial should be opaque about which lookup failed." Same PR also surfaced the route-side variant ("error-message identity leakage — restricted-meeting denial message exposes whether the email or username matched") — both kept under this pattern.

**Failure message:** Differentiated error messages allow account enumeration.

**Fix:** return a single generic "not authorized" response regardless of which lookup failed. Log the specifics server-side at DEBUG; don't leak to the client.

---

## `security/non-http-scheme-stripped` — SHOULD_FIX

**Pattern:** a non-http URL scheme (`webcal:`, `tel:`, `mailto:`, `sms:`) bound to `[href]` (or interpolated into a template-bound `href`) is silently stripped by Angular's `DomSanitizer` to `unsafe:...`. The link looks present in source but doesn't navigate at runtime.

**Detect:** grep for `\[href\]="[^"]*(webcal|tel|mailto|sms):` or interpolations like `${webcalUrl}` bound to `[href]`. Also flag any component code constructing such URLs without explicitly bypassing the sanitizer.

**Empirical citation:** PR #697 `apps/lfx-one/src/app/.../ical-subscribe-dialog.component.ts` — "`webcal://` blocked by Angular sanitizer."

**Failure message:** Non-http URL scheme in `[href]` — Angular sanitizer strips at runtime; link doesn't navigate.

**Fix:** use `DomSanitizer.bypassSecurityTrustUrl(url)` to mark the URL as safe, bind via `[innerHTML]` or `[attr.href]`. Be explicit about the security trade-off; only do this for known-safe URLs you constructed (not user input).

---

## `security/missing-encodeURIComponent-on-slug` — SHOULD_FIX

**Pattern:** a template-literal URL or query-param construction interpolates a user-input or variable value (slug, search term, ID) into the URL without `encodeURIComponent`. Special characters break the URL or enable injection.

**Detect:** grep for template literals containing `https?://` or `/api/` with `${...}` interpolations. Verify the interpolated values are wrapped in `encodeURIComponent(...)`.

**Empirical citation:** general pattern from CodeRabbit + Copilot in multiple PRs; not always specific to one but a recurring NIT-to-SHOULD-FIX.

**Failure message:** User input in URL slug/query without encoding — breaks on special characters; potential injection.

**Fix:** wrap the interpolated value: `` `/api/users/${encodeURIComponent(name)}` ``. For query-string assembly, use `URLSearchParams`.

---

## `security/cookie-payload-bigger-than-headers` — NIT

**Pattern:** cookie payload contains a large object (>1KB) that's pushed on every request. Network overhead; also can hit reverse-proxy header size limits.

**Detect:** when setting cookies, check that the value is small (typically just an ID, not a full object). Anything > 1KB is suspect.

**Empirical citation:** general best-practice; observed in CodeRabbit suggestions on PR #667 area.

**Failure message:** Cookie payload is large; consider storing in session and only the ID in the cookie.

**Fix:** persist the full object in session storage (Redis / express-session); put only the session key in the cookie.
