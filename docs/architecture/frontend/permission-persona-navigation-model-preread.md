# Permission, Persona, and Navigation Model

Alignment record for how LFX One decides where users can go, what they see, and what they can do.

Tracking epic: LFXV2-1654 - https://linuxfoundation.atlassian.net/browse/LFXV2-1654

## How to Read This

This document started as a preread and now records the agreed model plus the implementation work that remains:

1. Agree on the product/security contract.
2. Confirm where the current code already follows that contract.
3. Decide what work belongs under the epic.
4. Sequence the remaining implementation work by risk and priority.

## Where We Are Now

Updated May 19, 2026.

| Area | Current state | Implication |
| --- | --- | --- |
| Team agreement | The meeting agreement is captured below: view permission controls context eligibility, persona/role controls visible experience, and manage/write permission controls actions. | The model is no longer just a proposal; remaining work should implement and test the agreed contract. |
| Jira tracking | Epic [LFXV2-1654](https://linuxfoundation.atlassian.net/browse/LFXV2-1654) exists, with individual work items [LFXV2-1655](https://linuxfoundation.atlassian.net/browse/LFXV2-1655) through [LFXV2-1662](https://linuxfoundation.atlassian.net/browse/LFXV2-1662) mapped in this document. | Engineering work can be planned and reviewed independently by decision boundary. |
| GitHub document branch | The standalone docs branch `docs/permission-persona-preread` exists and is scoped to this markdown file plus the DOCX version. | The document work remains independent from unrelated feature branches. |
| Pull request | No PR is open yet for `docs/permission-persona-preread`. | Next operational step is to open the docs-only PR for review. |
| Slack signal | The notification channel has GitHub bot activity but no visible discussion for `LFXV2-1654`, the preread branch, or the document filename. Nirav separately raised the hybrid persona/lens simplification question: nested project dropdown under foundation, ideally three lenses rather than four. | The doc still matches the direction: simplify persona/lens presentation without using persona as the access-control mechanism. |

## Purpose

This preread proposes a clear separation between access, experience, and authority. The goal is to make the product easier to reason about and to keep persona-driven UX from accidentally becoming authorization logic.

The simplest way to state the model:

```text
View permission decides where the user can go.
Persona/role decides what the user sees there.
Manage/write permission decides what the user can do there.
```

## Core Contract

| Decision | Source of Truth | Meaning |
| --- | --- | --- |
| Where can I go? | View permission | Foundation/Project selector eligibility. |
| What do I see there? | Persona / role | Sidebar links, page sections, dashboard variants, content shape. |
| What can I do? | Manage / write permission | Create, edit, delete, configure, invite, assign, administer. |

## Decision Boundaries

### 1. Context Selector: Where Can I Go?

- Foundation and Project selector eligibility should be based on view permission.
- If a context appears in the selector, the user should be allowed to enter that context.
- Persona may narrow or prioritize the experience, but it should not be the authority for selector eligibility.

### 2. Sidebar and Page Content: What Do I See There?

- Once inside a view-permitted context, persona/role should shape navigation links, page sections, dashboards, tabs, cards, metrics, and content variants.
- This is where Executive Director, Board Member, Maintainer, Contributor, and committee roles can create different product experiences.

### 3. Actions and Routes: What Can I Do?

- Create, edit, delete, configure, invite, assign, permission management, and admin operations should require manage/write permission.
- Buttons should be hidden or disabled, direct routes should be guarded, and backend/downstream authorization should remain authoritative.

## Default Foundation and Project Selection

Defaulting should happen only after the selector candidate list has already been filtered by view permission.

| Step | Foundation Lens | Project Lens |
| --- | --- | --- |
| 1 | Keep existing selected foundation if still view-permitted. | Keep existing selected project if still view-permitted. |
| 2 | Choose Executive Director foundation if view-permitted. | Choose Maintainer project if view-permitted. |
| 3 | Choose Board Member foundation if view-permitted. | Choose Contributor project if view-permitted. |
| 4 | Choose first view-permitted foundation in stable order. | Choose first view-permitted project in stable order. |

## Implementation Priority

```text
Priority 1:
Make Foundation/Project selector eligibility explicitly view-permission scoped.

Candidate contexts + view permission check = selector items
```

## Current Code Status

Verified against `origin/main` on May 6, 2026.

| Area | Target behavior | Current status | What is done | What still needs to be done |
| --- | --- | --- | --- | --- |
| Foundation/Project selector | Show only contexts where the user has view permission. | Partially aligned. | The server navigation service now sources selector items through the query/resource API using the user's bearer token. If that upstream API enforces viewer access, the selector is effectively view-permission scoped. | Confirm and document the upstream contract. If the BFF must own this explicitly, add a batch `viewer` access check before returning selector items, including selected-item injection. |
| Default Foundation/Project selection | Default only from view-permitted contexts, then use persona priority. | Mostly aligned. | The frontend keeps the existing selected context if still present, then chooses by persona priority, then falls back to the first returned item. Foundation and project priorities are separated. | Keep this logic, but make the dependency clear: persona priority should only run after the candidate list has already been filtered by view permission. Add focused tests for multiple-foundation and multiple-project users. |
| Lens availability | Show available lenses based on the user's valid product context and persona. | Partially aligned. | Lens availability is persona/root-writer based today. `Me` and `Organization` are always available; Foundation and Project lenses depend on board/project persona or root writer. | Decide whether Foundation/Project lens buttons should also require at least one view-permitted Foundation/Project candidate. If yes, wire lens availability to selector/context availability without coupling it to page content rules. |
| Sidebar links | Decide visible links by persona/role once the user is inside a valid context. | Mostly aligned. | Sidebar content is lens/persona driven. For example, Foundation Health Metrics is Executive Director only, and Project navigation changes for board-scoped versus project-scoped personas. | Document the persona-to-link matrix and add regression tests. Keep sidebar visibility separate from action authorization. Review data-driven exceptions such as the Foundation `Projects` link. |
| Page content | Shape dashboards, sections, cards, tabs, and metrics by persona. | Partially aligned. | Some content variants already use persona and lens-specific logic. | Create an explicit page-content matrix for key personas: Executive Director, Board Member, Maintainer, Contributor, committee roles. Add tests for high-risk pages. |
| Quick links and create buttons | Show write/manage actions only when the user can perform them. | Mostly aligned for common dashboard actions. | Many quick links and dashboard create actions are gated by `canWrite()` or `writer`. | Audit all action surfaces so buttons, menus, empty states, and inline actions consistently use manage/write permission. |
| Direct create/edit routes | Prevent navigation to write flows without manage/write permission. | Gap remains. | A writer guard exists. | Wire create/edit/admin routes through manage/write guards, not only `authGuard`. This includes committees, meetings, mailing lists, votes, surveys, settings/admin flows, and any new management routes. |
| Settings and permission management | Admin actions require manage/write/admin authority. | Gap remains. | Settings screens exist and route through authentication. | Gate actions such as Add User, role update, and removal by manage/write/admin permission. Hide or disable UI affordances and protect direct routes/API calls. |
| Backend/downstream authorization | Backend remains authoritative even if UI hides something. | Needs confirmation per surface. | Several services enrich resources with writer/organizer flags through access-check patterns. | Confirm downstream APIs reject unauthorized writes. UI guards should improve UX, not become the only enforcement layer. |

## Proposed Work Plan and Estimate

All work below rolls up to epic LFXV2-1654.

| Jira | Priority | Current Jira status | Work item | Why it matters | Estimated effort |
| --- | --- | --- | --- | --- | --- |
| [LFXV2-1655](https://linuxfoundation.atlassian.net/browse/LFXV2-1655) | P0 | Backlog | Confirm Foundation/Project selector permission contract with query/resource API owners. | This decides whether the BFF can rely on upstream filtering or must explicitly check `viewer`. | 0.5 day |
| [LFXV2-1656](https://linuxfoundation.atlassian.net/browse/LFXV2-1656) | P1 | Backlog | Add explicit viewer check to Foundation/Project selector in BFF. | Makes "where can I go" locally testable and prevents persona from acting as access control. | 1-2 days |
| [LFXV2-1657](https://linuxfoundation.atlassian.net/browse/LFXV2-1657) | P1 | Backlog | Add tests for default Foundation/Project selection. | Protects the highest-priority flow: multiple contexts, persona priority, and fallback behavior. | 1 day |
| [LFXV2-1658](https://linuxfoundation.atlassian.net/browse/LFXV2-1658) | P1 | Backlog | Wire manage/write guard to direct create/edit/admin routes. | Hidden buttons are not enough; direct URLs must be protected. | 1-2 days |
| [LFXV2-1659](https://linuxfoundation.atlassian.net/browse/LFXV2-1659) | P1 | Backlog | Gate Settings and permission-management admin actions by manage/write/admin. | These are high-impact admin operations and should not be visible or executable without authority. | 1 day |
| [LFXV2-1660](https://linuxfoundation.atlassian.net/browse/LFXV2-1660) | P2 | Backlog | Document persona-to-sidebar and persona-to-page-content matrix. | Gives product, architecture, and engineering one shared contract for "what I see." | 0.5-1 day |
| [LFXV2-1661](https://linuxfoundation.atlassian.net/browse/LFXV2-1661) | P2 | Backlog | Add persona/navigation regression tests for sidebar and key page content. | Prevents future accidental coupling between persona visibility and permission authority. | 1-2 days |
| [LFXV2-1662](https://linuxfoundation.atlassian.net/browse/LFXV2-1662) | P2 | Backlog | Review backend write enforcement per managed domain. | Confirms UI guards are UX helpers, not the only security control. | 1 day |

## Known Follow-Up Areas

- Confirm whether upstream query/resource APIs already enforce view permission; if not, add explicit batch view checks.
- Keep persona/lens logic for sidebar and page composition, but avoid using persona as action authority.
- Guard direct create/edit/admin routes with manage/write permission, not only hidden buttons.
- Gate Permissions page admin actions such as Add User, role update, and removal by manage/write permission.

## Meeting Agreement

The team aligned on this contract in the meeting:

```text
Context selector eligibility -> view permission
Sidebar/page/content visibility -> persona/role
Action authority -> manage/write permission
```

The remaining work is tracked under epic [LFXV2-1654](https://linuxfoundation.atlassian.net/browse/LFXV2-1654) and the individual Jira items listed above.
