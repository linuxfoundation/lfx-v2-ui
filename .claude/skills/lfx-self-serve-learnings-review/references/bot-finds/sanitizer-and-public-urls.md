# Sanitizer & public URLs

Patterns around Angular's URL sanitizer silently stripping non-http schemes, missing `encodeURIComponent` on user-input slugs, and unsafe URL construction generally.

Read when any frontend file uses `[href]`, `bypassSecurityTrust*`, or non-http URL schemes (`webcal:`, `tel:`, `mailto:`, `sms:`). Cross-checked by Phase 5.

---

## `bot-finds/sanitizer-and-public-urls/non-http-scheme-stripped` — SHOULD_FIX

**Pattern:** a non-http URL scheme (`webcal:`, `tel:`, `mailto:`, `sms:`) bound to `[href]` (or interpolated into a template-bound `href`) is silently stripped by Angular's `DomSanitizer` to `unsafe:...`. The link looks present in source but doesn't navigate at runtime.

**Detect:** grep for `\[href\]="[^"]*(webcal|tel|mailto|sms):` or interpolations like `${webcalUrl}` bound to `[href]`. Also flag any component code constructing such URLs without explicitly bypassing the sanitizer.

**Empirical citation:** PR #697 `apps/lfx-one/src/app/.../ical-subscribe-dialog.component.ts` — "`webcal://` blocked by Angular sanitizer."

**Failure message:** Non-http URL scheme in `[href]` — Angular sanitizer strips at runtime; link doesn't navigate.

**Fix:** use `DomSanitizer.bypassSecurityTrustUrl(url)` to mark the URL as safe, bind via `[innerHTML]` or `[attr.href]`. Be explicit about the security trade-off; only do this for known-safe URLs you constructed (not user input).

---

## `bot-finds/sanitizer-and-public-urls/missing-encodeURIComponent-on-slug` — SHOULD_FIX

**Pattern:** a template-literal URL or query-param construction interpolates a user-input or variable value (slug, search term, ID) into the URL without `encodeURIComponent`. Special characters break the URL or enable injection.

**Detect:** grep for template literals containing `https?://` or `/api/` with `${...}` interpolations. Verify the interpolated values are wrapped in `encodeURIComponent(...)`.

**Empirical citation:** general pattern from CodeRabbit + Copilot in multiple PRs; not always specific to one but a recurring NIT-to-SHOULD-FIX.

**Failure message:** User input in URL slug/query without encoding — breaks on special characters; potential injection.

**Fix:** wrap the interpolated value: `` `/api/users/${encodeURIComponent(name)}` ``. For query-string assembly, use `URLSearchParams`.

---

## `bot-finds/sanitizer-and-public-urls/href-from-untrusted-source` — CRITICAL

**Pattern:** an element's `[href]` is bound to a value sourced from user input or an external API response without validation. Risk of `javascript:` URL injection.

**Detect:** find `[href]="..."` bindings whose source is a service / API response / user-provided field. Verify the value is either (a) constructed from known-safe template literals, or (b) validated against an allowlist of schemes (`http`, `https`).

**Empirical citation:** general security best-practice; bot-flagged occasionally in PRs touching external-link rendering.

**Failure message:** `[href]` bound to untrusted value — `javascript:` URL injection risk.

**Fix:** validate the URL scheme before binding. Reject (or substitute) any URL whose scheme isn't `http` or `https`. Don't rely solely on the sanitizer — Angular's default protection is for runtime sanitization, but explicit validation is safer.
