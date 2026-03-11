---
description: General development rules — shared package conventions, license headers, testing, formatting, layout patterns
globs: '*'
---

# Development Rules

## Shared Package

- All shared types, interfaces, and constants are centralized in `@lfx-one/shared` package
- Use TypeScript interfaces instead of union types for better maintainability
- Shared package uses direct source imports during development for hot reloading
- All interfaces, reusable constants, and enums should live in the shared package

## AI Service

- **AI Service Integration**: Claude Sonnet 4 model via LiteLLM proxy for meeting agenda generation
- **AI Environment Variables**: `AI_PROXY_URL` and `AI_API_KEY` required for AI functionality
- **M2M Environment Variables**: `M2M_AUTH_CLIENT_ID`, `M2M_AUTH_CLIENT_SECRET` for machine-to-machine auth

## Authentication: User Tokens vs M2M Tokens

**Default: Always use user bearer tokens.** The vast majority of endpoints use the authenticated user's bearer token (`req.bearerToken` from the OIDC session). This is the normal auth flow — do NOT reach for M2M tokens unless you are in a public endpoint context.

**M2M tokens are ONLY for public-facing endpoints where no user session exists.** They represent the application, not a user. Current legitimate use cases:

| Use Case                                         | Why M2M Is Needed                                  |
| ------------------------------------------------ | -------------------------------------------------- |
| Public meeting page (`/public/api/meetings/:id`) | Unauthenticated users view public meetings         |
| Public meeting registration                      | Unauthenticated users register for public meetings |

**Do NOT use M2M tokens when:**

- The request has an authenticated user session (`req.oidc.isAuthenticated()`)
- Building a new protected API endpoint (`/api/...`)
- Making server-side calls where the user's identity or permissions matter
- Building any feature behind the login wall

**Why this matters:** M2M tokens lose all user identity, permissions, and audit trail. Using them where a user token is available means the backend cannot enforce per-user authorization, and audit logs cannot attribute actions to the correct user.

## External Microservice Repos

When building or modifying API integrations, always check the upstream microservice repo to verify the actual API contract before writing proxy calls or defining interfaces:

| Domain        | Repo                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------- |
| Queries       | [lfx-v2-query-service](https://github.com/linuxfoundation/lfx-v2-query-service)               |
| Projects      | [lfx-v2-project-service](https://github.com/linuxfoundation/lfx-v2-project-service)           |
| Meetings      | [lfx-v2-meeting-service](https://github.com/linuxfoundation/lfx-v2-meeting-service)           |
| Mailing Lists | [lfx-v2-mailing-list-service](https://github.com/linuxfoundation/lfx-v2-mailing-list-service) |
| Committees    | [lfx-v2-committee-service](https://github.com/linuxfoundation/lfx-v2-committee-service)       |

- Use `gh api repos/linuxfoundation/<repo>/contents/<path>` to browse and read files
- Check route definitions, request validation, response schemas, and query parameters
- The LFX One backend is a thin proxy layer — request/response shapes must match upstream

## Code Quality

- **License headers are required on all source files** — run `./check-headers.sh` to verify
- **Pre-commit hooks enforce license headers** — commits will fail without proper headers
- Always run `yarn format` from the root of the project to ensure formatting is done after all changes
- Always run `yarn lint` before `yarn build` to validate linting
- Always run `yarn build` to validate that changes compile correctly
- Do not nest ternary expressions
- Always use `flex + flex-col + gap-*` instead of `space-y-*`
- Always prepend "Generated with [Claude Code](https://claude.ai/code)" if you assisted with the code
- Always use sequential thinking MCP for planning before making changes

## Testing

- **E2E tests use dual architecture** — both content-based (`*.spec.ts`) and structural (`*-robust.spec.ts`) tests
- **Always add `data-testid` attributes** when creating new components for reliable test targeting
- **Run `yarn e2e` before major changes** to ensure all tests pass consistently
- **Use `data-testid` naming convention** — `[section]-[component]-[element]` for hierarchical structure
- **Test responsive behavior** — validate mobile, tablet, and desktop viewports appropriately
- When running tests to validate UI tests, use `reporter=list`

## Documentation Maintenance

When editing files in `docs/`:

- **Keep all explanations** — code examples, pattern demonstrations, config snippets, checklists, implementation steps, and cross-references are explanations, not clutter
- **Remove exhaustive per-item listings** — if the same pattern is repeated for every instance (e.g., listing every wrapper component's API individually), keep one representative example and summarize the rest
- **Remove true duplicates** — if the same code block or configuration appears twice in a file, keep the more detailed version
- **Replace stale status trackers** — "Implemented / Not Implemented" checklists go stale; replace with a concise summary of what's implemented
- **Remove aspirational schedules** — "Weekly/Monthly/Quarterly" maintenance schedules that aren't enforced by code don't belong in architecture docs
- **Remove stale version footers** — "Last Updated" dates go stale silently
- **Keep related documentation and external resource links** — cross-references help readers navigate the docs
- **Keep examples** — real-world examples are explanations, even if they demonstrate similar patterns; they show different use cases
- **Keep ops debugging commands only if architecture-relevant** — kubectl/snowsql commands belong in runbooks, not architecture docs
- **Remove specific benchmark numbers** — values like "Current: ~1.5MB ✅" go stale and are hard to maintain

## JIRA

- The JIRA project key for this is `LFXV2`. All tickets associated to this repo should generally be in there.
- JIRA sprint field is `customfield_10020`. When creating tickets, assign to the current user and current sprint.
