---
name: lfx-setup
description: >
  Environment setup for apps/lfx — prerequisites, install, env vars, and dev server.
  Use for getting started with the new app, first-time setup, broken environments,
  or install failures.
allowed-tools: Bash, Read, Glob, Grep, AskUserQuestion
---

<!-- Copyright The Linux Foundation and each contributor to LFX. -->
<!-- SPDX-License-Identifier: MIT -->

# LFX App Setup

You are helping a contributor set up their `apps/lfx` development environment. Verify each step before moving on — do not assume success.

## What You'll Need

- **Access to the LFX GitHub organization** — can you see private repos at github.com/linuxfoundation?
- **Access to the team 1Password vault** — "LFX One Dev Environment" vault for secrets
- **About 15 minutes** for first-time setup

## Step 1: Prerequisites

```bash
echo "=== Prerequisites Check ==="
echo -n "Node.js: " && node --version 2>/dev/null || echo "NOT INSTALLED"
echo -n "Yarn: " && yarn --version 2>/dev/null || echo "NOT INSTALLED"
echo -n "Git: " && git --version 2>/dev/null || echo "NOT INSTALLED"
echo -n "Angular CLI: " && ng version --skip-git 2>/dev/null | head -1 || echo "NOT INSTALLED"
```

**Required:**

1. **Node.js v22+** — If wrong version: `nvm install 22 && nvm use 22`
2. **Yarn v4+** — If missing: `corepack enable && corepack prepare yarn@4.9.2 --activate`
3. **Angular CLI** — If missing: `npm install -g @angular/cli`
4. **Git** — Any recent version

**macOS notes:**

- `corepack enable` permission error → `sudo corepack enable`
- Homebrew Node missing corepack → `npm install -g corepack` first
- Xcode tools required → `xcode-select --install`

## Step 2: Install Dependencies

```bash
cd /path/to/lfx-v2-ui
yarn install
```

**Troubleshooting:**

| Symptom                | Fix                                                         |
| ---------------------- | ----------------------------------------------------------- |
| `EACCES` errors        | Don't use `sudo` — use nvm instead of system Node           |
| Corepack errors        | `corepack enable && corepack prepare yarn@4.9.2 --activate` |
| `node-gyp` errors      | `xcode-select --install`                                    |
| `ERR_MODULE_NOT_FOUND` | `rm -rf node_modules && yarn install`                       |

## Step 3: Environment Variables

```bash
cp apps/lfx/.env.example apps/lfx/.env
```

Get credentials from **1Password → LFX One Dev Environment** vault.

Validate critical vars:

```bash
echo "=== apps/lfx Env Var Check ==="
for key in PCC_AUTH0_CLIENT_ID PCC_AUTH0_CLIENT_SECRET PCC_AUTH0_ISSUER_BASE_URL PCC_AUTH0_AUDIENCE PCC_AUTH0_SECRET PCC_BASE_URL LFX_V2_SERVICE; do
  if grep -qE "^${key}=.+" apps/lfx/.env 2>/dev/null; then
    echo "✓ $key"
  else
    echo "✗ $key — MISSING"
  fi
done
```

## Step 4: Start Development Server

```bash
yarn start --filter=lfx
```

The app should be available at `http://localhost:4201` (or the port configured in `.env`).

Verify:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:4201
# Expected: 200 or 302 (redirect to Auth0 login)
```

**If the server fails to start:**

- Port in use → `lsof -i :4201` then `kill <PID>`
- Auth errors → Verify `.env` values from 1Password
- Build errors → Run `yarn build --filter=lfx` to see detailed errors
- Node version → Confirm Node v22+: `node --version`

## Step 5: Figma MCP (for design system work)

The Figma MCP server allows Claude Code to pull design specs directly from Figma. This is **required** for building design system components with `/lfx-design`.

**Check if already configured:**

```bash
# Look for Figma MCP in Claude Code settings
cat ~/.claude/plugins.json 2>/dev/null | grep -c figma || echo "0"
```

**If not configured**, install the official Figma plugin:

```bash
claude plugin install figma@claude-plugins-official
```

This will prompt the user to authenticate with their Figma account via OAuth. Follow the browser prompts to authorize access.

**Verify it works:**

After setup, the tool `mcp__plugin_figma_figma__get_design_context` should be available. If the user reports it's not working, check:

- Token hasn't expired
- Token has the correct scopes
- Claude Code was restarted after adding the MCP

## Step 6: Storybook (design system preview)

Storybook provides a visual catalog of all design system components. Use it to preview and verify components in isolation.

```bash
# From repo root
yarn storybook

# Or from the app directory
cd apps/lfx && yarn storybook
```

Storybook opens at `http://localhost:6006`. Components are listed alphabetically under **Components/** in the sidebar.

**First run:** Storybook requires a Compodoc build for autodocs. If you see a missing `documentation.json` error:

```bash
cd apps/lfx
npx compodoc -p tsconfig.json -e json -d .
yarn storybook
```

## Done

```text
═══════════════════════════════════════════
SETUP COMPLETE ✓
═══════════════════════════════════════════
App:      apps/lfx
Running:  http://localhost:4201
═══════════════════════════════════════════
```

**Next steps:**

- Build a feature → `/lfx-coordinator`
- Build a design system component → `/lfx-design`
- Validate before a PR → `/lfx-preflight`
