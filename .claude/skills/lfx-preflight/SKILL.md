---
name: lfx-preflight
description: >
  Pre-PR validation for apps/lfx — license headers, format, lint, build, and
  protected file check. Use before submitting any PR for the new app.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion
---

<!-- Copyright The Linux Foundation and each contributor to LFX. -->
<!-- SPDX-License-Identifier: MIT -->

# Pre-Submission Preflight Check

You are running pre-PR validation for `apps/lfx`. Auto-fix issues where possible (formatting, license headers). If the user says "report only" or "dry run", just report without fixing.

## Check 0: Working Tree Status

```bash
git status
git diff --stat origin/main...HEAD
git log --format="%h %s%n%b" origin/main...HEAD
```

Evaluate:

- **Uncommitted changes?** — Ask: commit now or stash?
- **No commits ahead of main?** — Nothing to validate.
- **Missing JIRA ticket?** — Flag commits without `LFXV2-` reference.
- **Missing `--signoff`?** — Flag commits without `Signed-off-by:` lines.

## Check 1: License Headers

```bash
./check-headers.sh
```

Every source file (`.ts`, `.html`, `.css`) must have the license header.

**Auto-fix if missing:**

- `.ts`: `// Copyright The Linux Foundation and each contributor to LFX.\n// SPDX-License-Identifier: MIT\n\n`
- `.html`: `<!-- Copyright The Linux Foundation and each contributor to LFX. -->\n<!-- SPDX-License-Identifier: MIT -->\n\n`
- `.css`: `/* Copyright The Linux Foundation and each contributor to LFX. */\n/* SPDX-License-Identifier: MIT */\n\n`

## Check 2: Formatting

```bash
yarn format
```

Auto-fixes formatting. Report which files were reformatted.

## Check 3: Linting

```bash
yarn lint
```

Auto-fix fixable issues. For non-fixable issues, report and ask the contributor.

Re-run after fixes to confirm:

```bash
yarn lint
```

## Check 4: Build

```bash
yarn build --filter=lfx
```

If build fails:

1. Read the error — identify file and line
2. Simple fix (missing import, typo) → fix in auto-fix mode
3. Structural issue → report with context

## Check 5: Protected Files

```bash
git diff --name-only origin/main...HEAD
```

Flag any changes to these files — they require code owner review:

- `apps/lfx/src/server/server.ts`
- `apps/lfx/src/server/helpers/server-logger.ts`
- `apps/lfx/src/server/middleware/*`
- `apps/lfx/src/server/services/logger.service.ts`
- `apps/lfx/src/server/services/microservice-proxy.service.ts`
- `apps/lfx/src/app/app.routes.ts`
- `turbo.json`
- `CLAUDE.md`
- `PLAN.md`
- `check-headers.sh`
- `package.json` / `*/package.json`
- `yarn.lock`

## Check 6: Commit Verification

```bash
git log --format="%h %s%n%b" origin/main...HEAD
```

- Commit messages follow `type(scope): description`?
- `--signoff` on all commits?
- JIRA ticket referenced (`LFXV2-XXX`)?

If auto-fixes created uncommitted changes, ask:

> "Preflight auto-fixed some issues. Would you like me to commit these fixes?"

## Results Report

```text
═══════════════════════════════════════════
PREFLIGHT RESULTS — apps/lfx
═══════════════════════════════════════════

[ONE-LINE VERDICT]

✓/✗ Working tree      — [status]
✓/✗ License headers   — [status]
✓/✗ Formatting        — [status]
✓/✗ Linting           — [status]
✓/✗ Build             — [status]
✓/✗ Protected files   — [status]
✓/✗ Commits           — [status]
═══════════════════════════════════════════
Changes: [N] files in apps/lfx/, [N] in packages/shared/
Auto-fixes: [list or none]
[READY FOR PR ✓ / ISSUES TO RESOLVE ✗]
═══════════════════════════════════════════
```

If all checks pass: "Your changes look good! Would you like me to create the pull request?"

## Scope Boundaries

**This skill DOES:**

- Run format, lint, build for `apps/lfx`
- Auto-fix formatting and license headers
- Report protected file changes
- Verify commit conventions

**This skill does NOT:**

- Apply to `apps/lfx-one` — use the existing `/preflight` skill for that
- Generate new code — use `/lfx-coordinator`
