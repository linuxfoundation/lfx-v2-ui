# Cookie trust

Patterns where cookie payloads are treated as trusted input — parsed as JSON, used as identity, or driving authorization decisions — without shape/signature validation. Low volume (1 cited PR) but high severity when missed.

Read when any backend file references `req.cookies`. Cross-checked by Phase 5.

---

## `bot-finds/cookie-trust/cookie-as-identity-no-validation` — CRITICAL

**Pattern:** a cookie value is parsed as JSON or destructured as an identity/account/session object, and the resulting data is used to drive authorization, queries, or UI state — without validating the shape or verifying a signature.

**Detect:** grep for `req\.cookies\[` followed within ~5 lines by `JSON\.parse(` or destructuring of an expected shape. Verify there's either (a) a zod/joi/yup schema validation, OR (b) signed-cookie verification (HMAC / express-session signature check) before the value is trusted.

**Empirical citation:** PR #667 — "`selectedAccount` initialized from cookie value without validation. Cookie payload treated as trusted." A malicious user could craft a cookie that injects an arbitrary `accountId` into downstream queries.

**Failure message:** Cookie payload used as identity / trusted data without shape or signature validation. Tampering exposure.

**Fix:** (a) define a zod schema for the expected cookie payload and parse-or-reject; (b) if cookie is supposed to be signed, verify the signature before parsing; (c) treat the value as untrusted input and validate against a known list of acceptable account IDs from the authenticated session.

---

## `bot-finds/cookie-trust/cookie-payload-bigger-than-headers` — NIT

**Pattern:** cookie payload contains a large object (>1KB) that's pushed on every request. Network overhead; also can hit reverse-proxy header size limits.

**Detect:** when setting cookies, check that the value is small (typically just an ID, not a full object). Anything > 1KB is suspect.

**Empirical citation:** general best-practice; observed in CodeRabbit suggestions on PR #667 area.

**Failure message:** Cookie payload is large; consider storing in session and only the ID in the cookie.

**Fix:** persist the full object in session storage (Redis / express-session); put only the session key in the cookie.
