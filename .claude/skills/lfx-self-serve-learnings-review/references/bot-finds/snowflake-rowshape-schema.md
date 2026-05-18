# Snowflake row-shape & schema

Patterns where Snowflake query results don't match TypeScript interface declarations, or where dev / per-engineer schema paths leak into production code. Critical-severity for the dev-schema leak; row-shape drift is SHOULD_FIX (causes runtime null bugs).

Read when `apps/lfx-one/src/server/services/snowflake.service.ts` or any file containing direct Snowflake SQL changed. Cross-checked by Phase 5.

---

## `bot-finds/snowflake-rowshape-schema/dev-schema-leak` — CRITICAL

**Pattern:** hard-coded `ANALYTICS_DEV.*` schema name, per-engineer workspace path (e.g., `LF_<NAME>_PLATINUM_LFX_ONE`), or any non-production database path in code on the release path.

**Detect:** grep for `ANALYTICS_DEV\.`, `LF_[A-Z_]+\.PLATINUM`, or any per-user schema literal in `apps/lfx-one/src/server/**/*.ts` and `apps/lfx-one/src/server/**/*.sql`.

**Empirical citation:** PR #706 `apps/lfx-one/src/server/services/organization.service.ts:909` — Copilot — "`ANALYTICS_DEV.LF_AOPEYEMI_PLATINUM_LFX_ONE.ORG_LENS_ACCOUNT_CONTEXT` is a single-engineer dev workspace and must be reverted to `ANALYTICS.PLATINUM_LFX_ONE.ORG_LENS_ACCOUNT_CONTEXT` before this stack merges to main."

**Failure message:** Dev-schema / per-engineer workspace path referenced in production code.

**Fix:** revert to the production schema path (`ANALYTICS.PLATINUM_LFX_ONE.*`). If the path needs to vary by environment, parameterise via an env var (`SNOWFLAKE_SCHEMA_PREFIX`) and reject any value containing `_DEV` or per-user patterns when running in prod.

---

## `bot-finds/snowflake-rowshape-schema/select-mismatch-row-interface` — SHOULD_FIX

**Pattern:** the SELECT list in a Snowflake query selects columns that aren't present in the corresponding TypeScript `Row` interface — or selects fewer than the interface declares. Either case produces runtime undefined fields and type confusion.

**Detect:** in any `.ts` file with embedded Snowflake SQL, find the SELECT list and cross-check every column against the adjacent `Row` / `<X>Result` interface. Look for: (a) interface fields not in SELECT (will be undefined at runtime), (b) SELECT columns not in interface (silently dropped).

**Empirical citation:** general pattern from Copilot in multiple PRs (#667, #706 areas).

**Failure message:** SELECT list and Row interface don't match — runtime fields missing or unused.

**Fix:** align the SELECT list with the Row interface exactly. If the interface has optional fields, mark them `?` and document why they're optional (column added later, conditional aggregation, etc.).

---

## `bot-finds/snowflake-rowshape-schema/date-column-typed-as-Date` — SHOULD_FIX

**Pattern:** a Snowflake `DATE` / `TIMESTAMP_NTZ` / `TIMESTAMP_TZ` column is typed as `Date` in the TypeScript Row interface, but the Snowflake Node.js driver returns ISO strings, not `Date` instances. Downstream code calling `.getTime()` or `Date` methods on the value will throw.

**Detect:** in Row interfaces for Snowflake query results, look for `: Date` fields. Verify the Snowflake driver config OR a wrapping helper actually converts to Date — otherwise type as `string`.

**Empirical citation:** general pattern; clearest in `survey_cutoff_date` handling and similar timestamp fields across multiple PRs.

**Failure message:** Field typed as `Date` but Snowflake returns ISO string — runtime type mismatch.

**Fix:** type as `string` (ISO 8601). Add a helper to parse to `Date` at the boundary where you need date arithmetic. Or configure the Snowflake driver to coerce — but document the choice.

---

## `bot-finds/snowflake-rowshape-schema/placeholder-bind-count-mismatch` — CRITICAL

**Pattern:** the SQL string has N `?` placeholders but the binds array passed to the Snowflake helper has a different count of values. Snowflake driver will error at runtime (or silently misbind).

**Detect:** for any direct Snowflake SQL invocation, count `?` occurrences in the SQL string and compare against the binds array length.

**Empirical citation:** general pattern surfaced in CodeRabbit comments on PRs touching `snowflake.service.ts` callers. The `lfx-self-serve-code-reviewer` agent also flags this in its Snowflake direct-SQL check, but pre-PR catching it is cheaper.

**Failure message:** SQL placeholder count doesn't match binds-array length.

**Fix:** match placeholder count to binds. If using template-string SQL composition, switch to a named-parameters helper to avoid the manual count.
