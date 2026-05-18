# Logging & metric correctness

Patterns where logged metrics are misleading or log levels are mis-chosen. Low volume (6 finds total) but high cost — bad metrics drive bad decisions silently.

Read when any file uses `logger.info` / `logger.warning` / `logger.debug`. Cross-checked by Phase 5.

---

## `bot-finds/log-metric-correctness/count-variable-mismatch` — SHOULD_FIX

**Pattern:** a `logger.info({ count: ... })` (or similar metric field) is logged with the wrong variable — typically `Set.size` of a related-but-different set, or array length of the un-deduped collection rather than the deduped one.

**Detect:** review every `logger.info` / `logger.warning` call that includes a count/total/size field. Verify the variable being logged is the one the message describes.

**Empirical citation:** PR #680 — "`responded_count` logs the wrong set." The operation name said `responded_count` but the actual logged value was `Set.size` of the wrong set, producing a misleading metric.

**Failure message:** Logged count uses the wrong variable — metric is misleading.

**Fix:** use the correct collection's size for the metric. Cross-check the operation name (`responded_count`, `attendee_count`, etc.) against the value source.

---

## `bot-finds/log-metric-correctness/info-for-high-frequency-fetch` — SHOULD_FIX

**Pattern:** `logger.info` used in a code path that runs frequently (per-page-load, per-signal-change, per-keystroke), producing log noise. `logger.info` is for significant business operations; high-frequency ops should be `logger.debug`.

**Detect:** look for `logger.info` calls in code paths that aren't gated by a once-per-session condition — typical culprits are signal effects, route resolvers, and data-fetch services.

**Empirical citation:** general pattern from CodeRabbit comments across multiple PRs; specifically called out in PR #700 / #708 areas.

**Failure message:** INFO level used for a high-frequency operation — produces log noise that drowns signal.

**Fix:** downgrade to `logger.debug`. Per `.claude/rules/logging-patterns.md`: INFO is for significant business operations; DEBUG is for step-by-step tracing.

---

## `bot-finds/log-metric-correctness/err-field-vs-error-message` — SHOULD_FIX

**Pattern:** error logged as `{ error: error.message }` instead of `{ err: error }`. The `error.message` form loses the stack trace and any custom error properties; the `err` field with the Error object preserves both.

**Detect:** grep for `\{\s*error\s*:\s*\w+\.message\s*\}` or `\{\s*error\s*:\s*err\s*\}` in `apps/lfx-one/src/server/**`.

**Empirical citation:** general pattern from `.claude/rules/logging-patterns.md` plus several CodeRabbit comments echoing it.

**Failure message:** Error logged as `error.message` — loses stack trace and custom properties.

**Fix:** log as `{ err: error }` (the Pino-recognised field). The serializer will preserve the stack and any non-standard properties.
