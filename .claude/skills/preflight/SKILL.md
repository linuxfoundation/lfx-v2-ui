---
name: preflight
description: Pre-PR validation — license headers, lint, format, build, and protected file check
allowed-tools: Bash, Read, Glob, Grep
---

# Pre-Submission Preflight Check

You are running a comprehensive validation before the contributor submits a pull request.
Run each check in order, report results clearly, and help fix any issues found.

## Check 1: License Headers

```bash
./check-headers.sh
```

Every source file (`.ts`, `.html`, `.scss`) must have the license header:

- TypeScript/SCSS: `// Copyright The Linux Foundation and each contributor to LFX.` + `// SPDX-License-Identifier: MIT`
- HTML: `<!-- Copyright The Linux Foundation and each contributor to LFX. -->` + `<!-- SPDX-License-Identifier: MIT -->`

If any files are missing headers, add them.

## Check 2: Linting

```bash
yarn lint
```

If there are lint errors, fix them. Common issues:

- Missing imports
- Unused variables
- Component selector prefix (must be `lfx-`)
- Import ordering

## Check 3: Formatting

```bash
yarn format
```

This applies Prettier formatting with Tailwind class sorting. It modifies files in place.

## Check 4: Build Verification

```bash
yarn build
```

The build must succeed. If it fails:

- Check for TypeScript errors (missing types, wrong imports)
- Verify shared package exports are correct
- Check for circular dependencies

## Check 5: Protected Files Check

Verify no protected infrastructure files were modified:

```bash
git diff --name-only HEAD
```

**Flag any changes to these files** — they should NOT be modified without code owner approval:

- `apps/lfx-one/src/server/server.ts`
- `apps/lfx-one/src/server/server-logger.ts`
- `apps/lfx-one/src/server/middleware/*`
- `apps/lfx-one/src/server/services/logger.service.ts`
- `apps/lfx-one/src/server/services/microservice-proxy.service.ts`
- `apps/lfx-one/src/server/services/nats.service.ts`
- `apps/lfx-one/src/server/services/snowflake.service.ts`
- `apps/lfx-one/src/server/services/supabase.service.ts`
- `apps/lfx-one/src/server/services/ai.service.ts`
- `apps/lfx-one/src/server/services/project.service.ts`
- `apps/lfx-one/src/server/services/etag.service.ts`
- `apps/lfx-one/src/server/helpers/error-serializer.ts`
- `apps/lfx-one/src/app/app.routes.ts`
- `.husky/*`
- `eslint.config.*`
- `.prettierrc*`
- `turbo.json`
- `angular.json`
- `CLAUDE.md`
- `check-headers.sh`
- `package.json` / `*/package.json`
- `yarn.lock`

If protected files appear in the diff, warn the contributor and ask them to revert those changes or get code owner approval.

## Check 6: Change Summary

Generate a summary of all changes for the PR description:

```bash
git diff --stat HEAD
```

List:

1. **New files created** — with their purpose
2. **Modified files** — with what changed
3. **Shared package changes** — any new interfaces/enums/constants
4. **Backend changes** — any new controllers/services/routes
5. **Frontend changes** — any new components/services

## Results Report

Present a clear report:

```text
PREFLIGHT RESULTS
─────────────────────────────────
✓ License headers      — All files have headers
✓ Linting              — No errors
✓ Formatting           — Applied
✓ Build                — Succeeded
✓ Protected files      — None modified
─────────────────────────────────
READY FOR PR
```

Or if there are issues:

```text
PREFLIGHT RESULTS
─────────────────────────────────
✓ License headers      — All files have headers
✗ Linting              — 3 errors (see above)
✓ Formatting           — Applied
✗ Build                — Failed (see above)
✓ Protected files      — None modified
─────────────────────────────────
ISSUES FOUND — Fix before submitting
```
