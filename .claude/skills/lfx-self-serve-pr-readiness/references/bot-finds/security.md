# Security

Repo-specific patterns where security boundaries leak — credential disclosure, identity enumeration, public-meeting visibility, generic secrets-in-code. Sampled from CodeRabbit / GitHub Copilot PR comments 2026-03-15 → 2026-05-15.

Read in every pr-readiness run (always relevant). Cross-checked by `/lfx-self-serve-pr-readiness` Phase 5 — findings without a quotable pattern below are dropped.

---

## `bot-finds/security/secrets-in-diff` — CRITICAL

**Pattern:** hardcoded tokens, API keys, `Bearer ey...`, `sk_live_`, `sk_test_`, AWS keys, or any other credential committed to the diff.

**Detect:** grep the diff for `(api[_-]?key|secret|token|password|Bearer\s+ey|sk_live|sk_test|AKIA[0-9A-Z]{16})\s*[:=]\s*['"]` (case-insensitive). Also flag any new `.env` / `*.local.json` / `*.pem` file that doesn't have a corresponding `.gitignore` entry.

**Empirical citation:** not observed in our sampled PRs (which is good). Preventive — CodeRabbit's Gitleaks scan catches this for every PR; we mirror the check pre-PR.

**Failure message:** Hardcoded secret detected — never commit credentials.

**Fix:** move to environment variable, fetch via 1Password (`op://...`), or revert the change. If the secret leaked already, rotate it before merging.

---

## `bot-finds/security/error-message-identity-leak` — SHOULD_FIX

**Pattern:** error messages that disclose whether a username/email/identifier matched (timing or content-based account enumeration). The denial response differs based on which lookup failed.

**Detect:** grep for error responses that branch on `if (user)` / `if (registrant)` / `if (member)` with different `res.status(...).json({ message: ... })` per branch.

**Empirical citation:** PR #636 `apps/lfx-one/src/server/services/meeting.service.ts` — "restricted-meeting denial message exposes whether the email or username matched. The denial should be opaque about which lookup failed."

**Failure message:** Differentiated error messages allow account enumeration.

**Fix:** return a single generic "not authorized" response regardless of which lookup failed. Log the specifics server-side at DEBUG; don't leak to the client.

---

## `bot-finds/security/public-meeting-visibility-filter` — CRITICAL

**Pattern:** a public endpoint serving meeting/event data must filter by `visibility: 'public'` before pagination — otherwise the page response can contain private items.

**Detect:** for any new endpoint under `/public/api/*` returning meeting/event data, verify that the upstream query (`MicroserviceProxyService.proxyRequest` call) includes a visibility filter, and that filtering happens BEFORE `page_size` / `page_token` paging.

**Empirical citation:** PR #697 `apps/lfx-one/src/server/controllers/project.controller.ts` (`/public/api/projects/:id/calendar.ics` endpoint) — public ICS calendar endpoint didn't filter by visibility before paginating; private meetings could appear in anonymous ICS feeds.

**Failure message:** Public endpoint paginates over data that may contain private items.

**Fix:** apply the visibility filter in the upstream query (not in post-processing), so paging is bounded to public-only data.
