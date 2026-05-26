# Self Serve Project Stewardship Program

## Context

The Osprey / Tier 2 npm + Maven work still needs a Self Serve coordination layer
for splitting package review and hardening work across a large set of
dependencies. However, the MVP direction from product leadership is broader:
validate that surfacing at-risk projects produces real stewards.

The first release should therefore be a **Project Stewardship Program** surface
where companies and individuals can find projects that need help, express
interest, and move through a lightweight handoff. Package security stewardship
remains important, but it should sit under the program as a specialized workflow
and future dependency-anchored matching path.

Insights and CDP should remain the source-data and analytics layer. Self Serve
should own authentication, permissions, marketplace discovery, stewardship
interest, assignment, coordination, contributor workflow, and review/status
tracking.

## MVP Direction

### Phase 1: Open-Discovery Project Stewardship

This is the MVP. It requires no new SBOM ingestion and validates whether
surfacing stewardship needs turns into real commitments.

- Project health status on every project health surface:
  - `healthy`
  - `under_maintained`
  - `maintainer_orphaned`
- Project stewardship status on every project health surface:
  - `not_open`
  - `open_for_stewardship`
  - `stewarded`
  - `closed`
- Handoff status for active interests:
  - `interest_expressed`
  - `program_review`
  - `connected`
  - `onboarding`
  - `active`
  - `blocked`
  - `closed`
- Browsable marketplace of projects open for stewardship.
- Project detail cards with health metrics, bus factor, tech stack, recent
  activity, security response time, and concrete asks.
- Per-project concrete ask field, for example succession, security triage,
  dependency upgrades, release management, documentation, or maintainer
  reinforcement.
- Filters by skill, language, urgency, foundation, and stewardship type.
- One-click `Express interest` action that connects the person or company to
  maintainers or program staff.
- Maintainer-initiated `Request a steward` submission.
- Basic handoff tracking: interest expressed -> program review -> maintainer
  connected -> steward onboarded.

### Phase 2: Dependency-Anchored Matching

This is the differentiated supply-chain path, but it depends on reliable SBOM
ingestion and dependency graph matching.

- Surface under-maintained projects in a user's or organization's SBOM.
- Rank "where you would help most" by criticality-to-user and project risk.
- Org-level dashboard ranking dependency trees by stewardship need.
- Supply-chain risk flags for security teams.
- Notifications when a depended-on project's stewardship status changes.

### Phase 3: Program Operations and Retention

This layer turns the program into an operated workflow.

- Contributor stewardship profiles with skills, availability, and current
  commitments.
- Personalized recommendations from prior activity and expertise.
- Distinct intake paths for succession and reinforcement.
- Scope-of-commitment indicators: time required, one-time vs. ongoing, solo vs.
  team.
- Company sponsorship: assign employees to steward priority projects.
- Stewardship status history and time-to-resolution metrics.
- Program throughput and at-risk backlog reporting for foundation staff.

## Product Surface

### Entry Points

- **Me lens:** `My Stewardship`
  - Shows projects and packages I am stewarding, expressed interests, assigned
    work, due items, blocked items, and review/status.
- **Foundation lens / Admin Mode:** `Project Stewardship`
  - ED/admin coordination dashboard for the selected foundation or LF-wide
    stewardship program.
- **Project lens:** `Stewardship`
  - Shows project health, stewardship status, concrete asks, current stewards,
    and a maintainer path to request a steward.
- **Security / Osprey workflow:** `Security Stewardship`
  - Specialized package security queue for npm/Maven and later ecosystems,
    reachable from Admin Mode and project/package security context.

## End-to-End Flow

The MVP product flow is centered on **open-discovery project stewardship**.
People and companies find projects with concrete stewardship needs, express
interest, and are connected to maintainers or program staff.

```mermaid
flowchart TD
  health["Insights / LFX health data<br/>project health, bus factor, activity, security response"] --> marketplace["Project Stewardship Marketplace"]
  maintainer["Maintainer / ED / Admin"] --> request["Request a steward<br/>add concrete ask"]
  request --> marketplace
  marketplace --> detail["Project stewardship detail<br/>health, asks, tech stack, urgency"]
  contributor["Company or individual"] --> detail
  detail --> interest["Express interest"]
  interest --> review["Program staff review<br/>fit, scope, availability"]
  review --> connect["Connect with maintainers"]
  connect --> onboard["Steward onboarded"]
  onboard --> active["Track stewardship status<br/>handoff, progress, outcomes"]
  active --> metrics["Measure trust and security improvement"]
```

Package security stewardship is a specialized flow under the same program. It is
centered on **creating a stewardship record from a package security signal**. A
package signal can exist without a stewardship record. Stewardship starts only
when an admin assigns a steward, opens the package for contributors, or a
contributor claims available work.

```mermaid
flowchart TD
  source["Insights / CDP data foundation<br/>npm + Maven Tier 2 package data"] --> sync["Security stewardship API<br/>packages, risk signals, assignments"]
  sync --> admin["Foundation Security Stewardship<br/>ED / Admin Mode"]
  sync --> me["My Stewardship<br/>Contributor view"]

  admin --> triage["Triage package signal queue<br/>filter by ecosystem, risk, status, owner"]
  triage --> detail["Open package detail drawer"]
  detail --> assign{"Create stewardship<br/>direct assign or open?"}
  assign --> direct["Assign steward"]
  assign --> open["Open for stewardship"]

  direct --> assigned["Assigned"]
  open --> discover["Contributor discovers package"]
  me --> discover
  discover --> claim["Claim package"]
  claim --> checklist["Complete verification checklist"]
  checklist --> submit["Submit for review"]

  assigned --> checklist
  submit --> review["ED / admin review"]
  review --> changes{"Review outcome"}
  changes --> request["Request changes"]
  request --> checklist
  changes --> blocked["Mark blocked"]
  changes --> complete["Mark complete"]

  checklist --> return["Return stewardship with reason"]
  return --> disposition["Admin disposition<br/>reopen or reassign"]
  disposition --> open
  disposition --> assigned
  checklist --> stale["Stale by aging policy"]
  stale --> open
  blocked --> triage
  complete --> reverify["Needs reverification<br/>new advisory, maintainer change, age policy"]
  reverify --> triage
  complete --> insights["Status visible in Self Serve<br/>Analytics link opens Insights"]
```

## Project Stewardship Status Model

Project stewardship uses three related but separate statuses. Do not collapse
them into one enum: the marketplace needs to filter project health, whether the
project is open for stewardship, and the lifecycle of a specific handoff.

### Health Status

| Persisted state       | UI label           | Meaning                                                          |
| --------------------- | ------------------ | ---------------------------------------------------------------- |
| `healthy`             | `Healthy`          | Project does not currently need stewardship help.                |
| `under_maintained`    | `Under-maintained` | Health signals show maintainer, activity, or response-time risk. |
| `maintainer_orphaned` | `Maintainer gap`   | Maintainer coverage is below the threshold for the project.      |

### Stewardship Status

| Persisted state        | UI label    | Meaning                                                  |
| ---------------------- | ----------- | -------------------------------------------------------- |
| `not_open`             | `Not open`  | Project is not seeking a steward.                        |
| `open_for_stewardship` | `Open`      | Project has at least one concrete ask open for interest. |
| `stewarded`            | `Stewarded` | At least one steward is active for an ask.               |
| `closed`               | `Closed`    | Stewardship ask is no longer active.                     |

### Handoff Status

| Persisted state      | UI label             | Meaning                                                                            |
| -------------------- | -------------------- | ---------------------------------------------------------------------------------- |
| `interest_expressed` | `Interest expressed` | A person or company expressed interest.                                            |
| `program_review`     | `Program review`     | Program staff is reviewing fit, scope, and availability.                           |
| `connected`          | `Connected`          | Program staff connected the interested steward with maintainers or program owners. |
| `onboarding`         | `Onboarding`         | Handoff is accepted and onboarding is underway.                                    |
| `active`             | `Active`             | Steward is actively helping the project.                                           |
| `blocked`            | `Blocked`            | Handoff cannot proceed until a blocker is resolved.                                |
| `closed`             | `Closed`             | Interest or handoff ended.                                                         |

```mermaid
flowchart TD
  health["health_status<br/>healthy, under_maintained, maintainer_orphaned"] --> open["stewardship_status<br/>open_for_stewardship"]
  open --> interest["handoff_status<br/>interest_expressed"]
  interest --> review["handoff_status<br/>program_review"]
  review --> connected["handoff_status<br/>connected"]
  connected --> onboarding["handoff_status<br/>onboarding"]
  onboarding --> active["handoff_status<br/>active"]
  active --> stewarded["stewardship_status<br/>stewarded"]
  active --> blocked["handoff_status<br/>blocked"]
  blocked --> connected
  stewarded --> closed["stewardship_status<br/>closed"]
```

### Project Stewardship Record

The project-level record should be small enough to ship in the MVP and explicit
enough to measure whether the program works.

| Field                 | Purpose                                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `project_uid`         | LFX project identity.                                                                                                                    |
| `foundation_uid`      | Foundation scope for permissions and reporting.                                                                                          |
| `stewardship_status`  | Current project-level status.                                                                                                            |
| `health_status`       | Healthy, under-maintained, maintainer-orphaned, or other derived health tier.                                                            |
| `concrete_asks`       | Structured list of asks such as succession, security triage, dependency upgrades, release management, docs, or maintainer reinforcement. |
| `skills`              | Languages, ecosystems, and maintainer skills requested.                                                                                  |
| `urgency`             | Low, medium, high, urgent.                                                                                                               |
| `scope_of_commitment` | Time required, one-time vs. ongoing, solo vs. team.                                                                                      |
| `interest_count`      | Number of people or companies that expressed interest.                                                                                   |
| `current_stewards`    | Active stewards or sponsor organizations.                                                                                                |
| `handoff_status`      | Interest expressed, program review, connected, onboarding, active, blocked, closed.                                                      |

## Package Security Stewardship State Model

```mermaid
stateDiagram-v2
  [*] --> Unassigned
  Unassigned --> OpenForStewardship: admin opens package
  Unassigned --> Assigned: admin assigns owner
  OpenForStewardship --> Claimed: contributor claims
  Assigned --> InProgress: owner starts checklist
  Assigned --> Returned: owner declines with reason
  Claimed --> InProgress: owner starts checklist
  Claimed --> Returned: owner returns work
  Returned --> OpenForStewardship: admin reopens to pool
  Returned --> Assigned: admin reassigns
  InProgress --> Submitted: submit for review
  InProgress --> Returned: owner returns work
  InProgress --> Stale: no progress past aging threshold
  Stale --> OpenForStewardship: auto-release or admin release
  Stale --> InProgress: owner resumes before release
  Submitted --> ChangesRequested: reviewer requests changes
  Submitted --> Blocked: reviewer marks blocked
  ChangesRequested --> InProgress: owner updates work
  Submitted --> Complete: reviewer approves
  InProgress --> Blocked: owner flags blocker
  Blocked --> InProgress: blocker resolved
  Blocked --> Assigned: admin reassigns (history preserved)
  Complete --> NeedsReverification: new advisory, maintainer change, age policy, manual reopen
  NeedsReverification --> Unassigned: admin reopens
  NeedsReverification --> Assigned: admin assigns reviewer/steward
  Unassigned --> NoLongerInScope: package removed/deprecated/out of scope
  OpenForStewardship --> NoLongerInScope: package removed/deprecated/out of scope
  Complete --> [*]
  NoLongerInScope --> [*]
```

State simplifications vs. original:

- **`adopted` → `claimed`**: Avoids confusion with "technology adoption." Clearer
  intent: the contributor claimed responsibility.
- **`open_for_adoption` → `open_for_stewardship`**: Consistent rename.
- **`released` + `declined` → `returned`**: Both return work to the pool with a
  reason. Differentiate via `returned_reason` (`declined_before_start`,
  `released_during_work`, `capacity`, `not_the_right_steward`).
- **`reassigning` removed**: Reassignment is an admin action that atomically
  moves to `assigned` with a new owner and writes a history event — not a
  durable state. A transient "reassigning" state creates edge cases (admin
  abandons mid-reassignment) without clear benefit.
- **`no_longer_adoptable` → `no_longer_in_scope`**: Consistent rename.

### Canonical Status Mapping

Persisted API states should stay stable and machine-readable. UI labels can be
friendlier, but filters, tags, and transitions should map back to this canonical
set.

| Persisted state        | UI label                 | Meaning                                                                                             |
| ---------------------- | ------------------------ | --------------------------------------------------------------------------------------------------- |
| `unassigned`           | `Unassigned`             | Package is in the queue and has no owner.                                                           |
| `open_for_stewardship` | `Open` / `Available`     | Package is available for a contributor to claim.                                                    |
| `assigned`             | `Assigned`               | Admin assigned an owner, but work has not started.                                                  |
| `claimed`              | `Claimed`                | Contributor claimed the package, but work has not started.                                          |
| `in_progress`          | `In progress`            | Owner is actively working through the checklist.                                                    |
| `submitted`            | `In review`              | Owner submitted the checklist for ED/admin review.                                                  |
| `changes_requested`    | `Changes requested`      | Reviewer sent the work back with required updates.                                                  |
| `blocked`              | `Blocked`                | Work cannot proceed until the blocker is resolved.                                                  |
| `stale`                | `Stale`                  | No checklist progress past the stale threshold.                                                     |
| `returned`             | `Returned`               | Owner returned stewardship to the queue with a required reason.                                     |
| `complete`             | `Complete` / `Completed` | Reviewer approved the submission.                                                                   |
| `needs_reverification` | `Needs reverification`   | Completed stewardship was reopened by new advisory, maintainer change, age policy, or admin action. |
| `no_longer_in_scope`   | `No longer in scope`     | Package is deprecated, transferred, removed, or out of scope.                                       |

The table filters should use persisted states in query params and request
payloads. Display-only labels such as `Available` or `Completed`
should be derived in the UI from the persisted state plus owner context.

`assigned` and `claimed` are behaviorally equivalent once work starts; both move
to `in_progress` on the first checklist update. Keep both states because the
provenance matters for reporting: admin-assigned work and contributor-claimed
work answer different coordination questions. The stewardship record's `origin`
field (`admin_assigned` | `self_claimed`) preserves this distinction independent
of current state.

The `returned` state replaces the original `released` and `declined` states. The
reason for returning is captured in a `returned_reason` field with controlled
values: `declined_before_start`, `released_during_work`, `capacity`,
`not_the_right_steward`. This preserves the reporting signal without adding
extra states and transitions.

`returned` is a durable holding state that preserves why stewardship left a
person's queue. The package becomes available again only when an admin or system
policy reopens it to `open_for_stewardship`, or when an admin assigns a new
steward and moves it to `assigned`.

### Aging and Reverification Policy

Default thresholds (configurable per foundation):

- Warn owner after **30 days** with no checklist progress.
- Move to `stale` after **45 days** with no checklist progress.
- Auto-release stale work back to `open_for_stewardship` after **60 days** unless
  an admin overrides.

"Checklist progress" is defined as: any checklist item state change (incomplete
→ complete or vice versa), or a contributor note added to the stewardship
record. Opening the drawer or viewing the record does not count as progress.

Additional policies:

- Allow owners to self-return `claimed` or `in_progress` work with a required
  reason.
- Reopen `complete` as `needs_reverification` when a new advisory appears,
  maintainer/security contact changes, package ownership changes, package status
  changes, or an annual verification policy fires.
- Preserve stewardship history, checklist evidence, comments, blocker reasons,
  and reviewer notes through reassignment and reverification.

## Project Stewardship Marketplace Flow

1. User opens `Project Stewardship`.
2. The marketplace shows projects open for stewardship with:
   - Stewardship status
   - Foundation
   - Health tier
   - Concrete ask
   - Skills / languages
   - Urgency
   - Recent activity
   - Security response time
   - Current interest / steward count
3. User filters by skill, language, urgency, foundation, and stewardship type.
4. User opens a project detail drawer or page.
5. User clicks `Express interest`.
6. Self Serve captures:
   - Individual or company identity
   - Relevant skills
   - Availability
   - Interest type
   - Note to maintainers/program staff
7. Program staff or ED/admin reviews the expression of interest.
8. Staff connects the interested steward to maintainers or program owners.
9. The handoff is tracked until the steward is onboarded or the interest is
   closed.

### Maintainer Request Flow

1. Maintainer or ED/admin opens project stewardship context.
2. Maintainer clicks `Request a steward`.
3. Maintainer selects one or more concrete asks:
   - Succession
   - Security triage
   - Dependency upgrades
   - Release management
   - Documentation
   - Maintainer reinforcement
   - Other
4. Maintainer adds scope, urgency, required skills, and optional notes.
5. Request appears in the marketplace after permission and quality checks.

## Package Security Admin Flow

1. ED/admin opens `Foundation -> Security Stewardship`.
2. The page shows top metrics:
   - Total packages in scope
   - Unassigned percentage
   - Critical packages
   - In review
   - Blocked
   - Completed this week
3. ED/admin filters the work queue:
   - Ecosystem: supported ecosystems
   - Status: unassigned, open, assigned/claimed, in progress, in review,
     changes requested, blocked, stale, complete, needs reverification
   - Risk: critical advisory, high dependents, single maintainer, stale repo
   - Source confidence: declared, deps.dev, heuristic, manual
4. ED/admin opens a package detail drawer.
5. ED/admin creates a stewardship record by assigning a steward or marking the
   package open for stewardship.
6. ED/admin tracks progress across stewards.
7. ED/admin uses bulk actions for high-volume queue management.
8. ED/admin links back to Insights for analytics-heavy views.

### Queue Scale and Bulk Operations

The queue can contain hundreds of thousands of packages, so the admin workflow
cannot assume one-row-at-a-time triage.

- Table supports multi-select across the current page and filtered result set.
- Bulk actions:
  - `Open for stewardship`
  - `Assign steward`
  - `Reassign steward`
  - `Mark blocked`
  - `Apply tag`
  - `Auto-release stale stewardships`
- Bulk actions above a configurable row threshold run as async jobs with a
  progress drawer/toast and a downloadable result summary. The threshold should
  be determined during implementation based on actual API response times.
- Saved views are per-user and shareable by URL. Suggested defaults for v1:
  - `Critical unassigned`
  - `Stale stewardships`
  - `Needs reverification`
- Additional saved views can be added as the underlying data matures, including
  ecosystem-specific filters such as `npm owner unclear` or
  `Maven needs maintainer`.
- Server uses optimistic locking on stewardship records. If a row changed after
  it was loaded, the UI shows conflict copy such as: "This package was just
  claimed by {user}. Refresh to see the latest state."

### Assignment Policies

Manual assignment ships first, but the data model should support routing rules
from the start.

- Named assignee pools per foundation or project.
- Optional round-robin assignment inside a pool.
- Optional rules:
  - auto-open packages matching critical-risk criteria
  - auto-assign packages with known project maintainers
  - require reviewer pool for high-criticality packages
- Rules should write normal stewardship records so history, review, and
  analytics remain consistent with manually-created stewardships.

## Package Contributor Flow

1. User opens `Me -> My Stewardship` and filters to package security work.
2. User sees available packages to claim plus assigned/claimed packages.
3. User opens a package drawer with:
   - Package identity
   - Ecosystem
   - Repository mapping
   - Downloads/dependents
   - Advisories
   - Maintainer/contact info
   - Suggested verification tasks
4. User clicks `Claim package` or accepts an admin assignment.
5. User completes the checklist:
   - Verify upstream repo
   - Verify maintainer/security contacts
   - Confirm latest version / release activity
   - Flag suspicious/stale metadata
   - Add notes
6. User submits for review.
7. User can return work with a required reason if they are not the right steward
   or no longer have capacity.
8. ED/admin reviews, requests changes, or marks complete.

## Notifications

Minimum notification surface:

- In-app and email when work is assigned to me.
- In-app and email when someone claims a package I opened for stewardship.
- In-app and email when review is requested from me.
- In-app and email when my submission is approved, blocked, or has requested
  changes.
- In-app and email warning before stale auto-release.
- Admin digest for high-volume queue events, grouped by foundation, status, and
  saved view.
- Notification payloads should link directly to the package drawer in the
  correct lens/context.

## Role and Action Matrix

| State                  | Contributor / owner                                       | ED/admin / reviewer                                                                            |
| ---------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `unassigned`           | View                                                      | Create stewardship, assign steward, open for stewardship, bulk assign, mark no longer in scope |
| `open_for_stewardship` | Claim package                                             | Assign steward, close availability, bulk assign                                                |
| `assigned`             | Accept/start, return with reason                          | Reassign, return, mark blocked                                                                 |
| `claimed`              | Start checklist, return                                   | Reassign, return, mark blocked                                                                 |
| `in_progress`          | Update checklist, submit for review, mark blocked, return | Reassign, mark blocked, request update                                                         |
| `submitted`            | View submission, reply to comments                        | Approve, request changes, mark blocked                                                         |
| `changes_requested`    | Update checklist, reply, resubmit, return                 | Reassign, mark blocked                                                                         |
| `blocked`              | Add blocker details, resolve if owner can                 | Resolve, reassign, return, mark no longer in scope                                             |
| `returned`             | View read-only history                                    | Reopen for stewardship, assign steward, mark no longer in scope                                |
| `stale`                | Resume before auto-release, return                        | Auto-release to open queue, reassign, extend due date                                          |
| `complete`             | View history                                              | Reopen as needs reverification, open in Insights                                               |
| `needs_reverification` | Claim if open                                             | Assign steward, open for stewardship, mark no longer in scope                                  |
| `no_longer_in_scope`   | View read-only history                                    | View read-only history, reopen only if package returns to scope                                |

Review notes:

- `Approve` allows an optional reviewer note.
- `Request changes` requires a note.
- `Mark blocked` requires a blocker reason.
- `Return` and reassignment require a reason.

### Blocker Reasons

Use controlled categories plus optional free text:

- `awaiting_maintainer_response`
- `repo_mapping_unclear`
- `advisory_disputed`
- `package_deprecated_or_transferred`
- `out_of_scope_for_ecosystem`
- `owner_capacity`
- `other`

## Design Direction

Use a dense operational layout consistent with existing LFX One dashboards and
tables. This is not a marketing-style page.

### Page Header

- Title: `Project Stewardship`
- Subtitle: `Find projects that need stewardship and connect contributors with concrete asks.`
- Primary action: `Express interest` on project detail and `Request a steward`
  for maintainers/admins.
- Secondary action: `Open in Insights` where analytics depth is needed.

### Primary MVP Screen: Project Stewardship Marketplace

The first screen should be the marketplace, not the package queue.

Main filters:

- Skill
- Language / ecosystem
- Urgency
- Foundation
- Stewardship type
- Health status

Main table/card fields:

- Project
- Foundation
- Stewardship status
- Health status
- Concrete ask
- Skills
- Urgency
- Recent activity
- Security response time
- Interest / steward count

Project detail should show health metrics, bus factor, tech stack, recent
activity, security response time, concrete asks, current stewards, and handoff
status. The primary CTA is `Express interest`. Maintainers and admins also see
`Request a steward`.

### Secondary Screen: Package Security Stewardship

The package queue remains a dense Admin Mode workflow for Osprey/Tier 2 package
security stewardship. It should be linked from the broader program surface as a
specialized security operations queue.

### Stats Band

Use compact metric tiles via the existing stat-card patterns.

Project stewardship marketplace metrics:

- Open stewardship asks
- Interest expressed
- Stewards onboarding
- Active stewards
- Handoffs completed
- Under-maintained projects

Package security queue metrics:

- Total packages in scope
- Unassigned percentage
- Critical signals
- In review
- Stale
- Blocked
- Complete this week

Use neutral gray, blue, amber, red, and emerald accents. Each tile should show a
week-over-week delta when the upstream summary API supports it.

### Package Workspace

Filter row:

- Search input
- Ecosystem select
- Status tabs
- Risk filter
- Assignment filter

Main table columns:

- Package
- Ecosystem
- Risk
- Impact
- Repo confidence
- Advisory
- Owner
- Status
- Last activity

Row click opens a detail drawer.

`Risk` should render as a Critical / High / Medium / Low tag with numeric score
available on hover. `Impact` combines downloads and dependents to preserve scan
density. `Last activity` should summarize what changed, for example
`Status -> In review by A. User · 2h ago`.

### Package Drawer

Tabs:

- `Overview`
- `Stewardship`
- `Security`
- `Provenance`

History should be a scrollable timeline at the bottom of the drawer (always
visible below the active tab content) rather than a separate tab. Reviewers
check history most often — hiding it behind a tab adds clicks in the most
common review workflow. The `3 new` unread indicator should appear as a
section header badge rather than a tab pill.

Sticky footer actions:

- `Claim package`
- `Assign steward`
- `Submit review`
- `Mark blocked`
- `Open in Insights`

## Screen Designs

These designs map directly to existing Self Serve structure: left lens rail,
280px navigation panel, content inside the `MainLayoutComponent` outlet, compact
operational spacing, `lfx-table`, `lfx-stat-card-grid`, `lfx-filter-pills`,
`lfx-tag`, `lfx-button`, and drawer-based details.

### Project Stewardship Marketplace

Purpose: open-discovery MVP where individuals and companies find projects that
need stewardship.

```text
+------------------------------------------------------------------------------+
| Project Stewardship                           [Request a steward] [Insights] |
| Find projects that need stewardship and connect contributors with asks.      |
+------------------------------------------------------------------------------+
| [ Open asks 184 ] [ Interest expressed 57 ] [ Onboarding 12 ] [ Active 28 ] |
| [ Under-maintained 96 ] [ Completed handoffs 9 ]                            |
+------------------------------------------------------------------------------+
| Skill: Any     Language: Any     Urgency: High     Type: Security triage     |
| [All] [Open] [Interest expressed] [Onboarding] [Stewarded] [Blocked]         |
+------------------------------------------------------------------------------+
| Project        Foundation  Health             Ask              Urgency       |
| OpenTelemetry  CNCF        Under-maintained   Security triage  High          |
| Sigstore       OpenSSF     Healthy            Release mgmt     Medium        |
| Yocto Project  LF          Maintainer gap     Succession       Urgent        |
+------------------------------------------------------------------------------+
```

Design notes:

- Marketplace can use table or compact cards depending on viewport, but desktop
  should still prioritize scan density.
- Project names, concrete ask, urgency, and skills must be visible before
  opening detail.
- Primary row action is `Express interest`.
- Maintainers/admins see `Request a steward`; contributors do not need that CTA.
- Use health/stewardship tags, not raw scores, as the primary visual language.
- Detail view should expose why the project needs help and what commitment is
  expected before asking a user to express interest.

### Project Stewardship Detail

Purpose: explain the project need and collect interest without making the user
leave context.

```text
+----------------------------------------------+
| OpenTelemetry                        [Close] |
| CNCF     Health: Under-maintained            |
+----------------------------------------------+
| Ask                                          |
| Security triage and release support          |
|                                              |
| Tech stack        Go, Collector, Kubernetes  |
| Recent activity   412 commits / 30d          |
| Bus factor        Medium risk                |
| Response time     9d median security reply   |
|                                              |
| Scope                                        |
| Ongoing, team welcome, 2-4 hrs/week          |
|                                              |
| Handoff                                      |
| Interest expressed -> Program review         |
+----------------------------------------------+
| [Express interest] [Open in Insights]        |
+----------------------------------------------+
```

Interest form fields:

- Individual or company
- Relevant skills
- Availability
- Stewardship type
- Note to maintainer/program staff

### My Stewardship

Purpose: personal queue for expressed interests, onboarding, active stewardship,
and package security work.

```text
+------------------------------------------------------------------------------+
| My Stewardship                                                              |
| Track projects and packages you are helping steward.                         |
+------------------------------------------------------------------------------+
| [ Interests 5 ] [ Onboarding 2 ] [ Active 4 ] [ Blocked 1 ]                |
+------------------------------------------------------------------------------+
| [All] [Projects] [Packages] [Interests] [Active] [Completed]               |
|                                                                              |
| Search...       Foundation: All       Status: All       Type: All           |
+------------------------------------------------------------------------------+
| Name           Type     Foundation  Status       Ask / Work       Activity  |
| OpenTelemetry  Project  CNCF        Review       Security triage  Today     |
| Sigstore       Project  OpenSSF     Active       Release mgmt     May 26    |
| lodash         Package  OpenSSF     In review    Contact verify   May 25    |
+------------------------------------------------------------------------------+
```

Design notes:

- This route replaces the package-only `My Security Work` as the primary Me-lens
  surface.
- Project and package work can share the same status/chip system, but rows must
  clearly identify type.
- Contributor actions include `Continue handoff`, `Update checklist`,
  `Submit review`, `Mark blocked`, and `Return`.

### Foundation Security Stewardship Queue

Purpose: ED/admin command center for the Osprey package queue. This is a
specialized security stewardship workflow, not the MVP front door.

```text
+------------------------------------------------------------------------------+
| Security Stewardship                        [Create stewardship] [Insights] |
| Coordinate critical package review and stewardship across supported          |
| ecosystems.                                                                  |
+------------------------------------------------------------------------------+
| [ Total in scope 600k ] [ Unassigned 69.7% ]                                  |
| [ Critical 1.8k ] [ In review 241 ] [ Stale 93 ] [ Complete this week 32 ]    |
+------------------------------------------------------------------------------+
| Saved: [Critical unassigned] [Needs maintainer] [Stale stewardships]         |
| [Signals] [Unassigned] [Open] [In progress] [In review] [Blocked] [Complete] |
|                                                                              |
| Search packages...     Ecosystem: All     Risk: All     Owner: All           |
+------------------------------------------------------------------------------+
| Package            Ecosystem  Risk      Impact        Repo   Owner   Status |
| lodash             npm        Critical  52.1M / 142k  High   --      Signal |
| org.slf4j:slf4j    Maven      Critical  -- / 81k      Med    Maya    Review |
| express            npm        High      31.4M / 72k   High   Lee     Stale  |
+------------------------------------------------------------------------------+
```

Design notes:

- Header is a compact page header, not a hero.
- Primary action appears only for users who can create stewardships.
- `Open in Insights` is secondary because analytics stays in Insights.
- Metrics are scan-first and should use understated status color:
  - critical advisory: red
  - blocked: amber
  - complete/claimed: emerald
  - neutral totals: gray/blue
- Table is the primary surface. No card-per-package view for desktop.
- Multi-select appears when the user has bulk permissions.
- Bulk actions run as async jobs when the affected row count exceeds the UI
  threshold.

### Package Security Work

Purpose: filtered package-security workspace within `My Stewardship`.

```text
+------------------------------------------------------------------------------+
| My Stewardship / Packages                                                   |
| Review critical packages you're stewarding or were assigned.                 |
+------------------------------------------------------------------------------+
| [ Assigned to me 18 ] [ Due soon 4 ] [ In review 3 ] [ Blocked 1 ]          |
+------------------------------------------------------------------------------+
| [My work] [Available to claim] [Completed]                                  |
|                                                                              |
| Search packages...     Foundation: All     Ecosystem: All     Risk: High    |
+------------------------------------------------------------------------------+
| Package       Foundation  Status       Checklist  Risk signal   Last activity|
| react         CNCF        In progress  3 / 6      High impact   Today        |
| minimist      OpenSSF     Blocked      2 / 6      Advisory      Yesterday    |
| jackson-core  OpenSSF     Available    --         Low maint.    May 25       |
+------------------------------------------------------------------------------+
```

Design notes:

- This route is task-first and should not require a foundation selector.
- Available packages should rank by criticality and readiness for stewardship.
- Contributor actions are limited to `Claim package`, `Update checklist`,
  `Submit review`, `Mark blocked`, and `Return`.
- Include Foundation so cross-foundation work is legible.
- When opening a package drawer, show related peer activity such as
  `2 other open stewardships in this org` when applicable.

### Package Detail Drawer

Purpose: one place to inspect package data and act without leaving the queue.

```text
+----------------------------------------------+
| lodash                              [Close]  |
| pkg:npm/lodash     npm     Risk: Critical    |
+----------------------------------------------+
| [Overview] [Stewardship] [Security]          |
| [Provenance]                                 |
+----------------------------------------------+
| Overview                                     |
| Downloads last month        52.1M            |
| Dependent packages          142k             |
| Dependent repos             39k              |
| Latest version              4.17.21          |
| Latest release              2021-02-20       |
|                                              |
| Repository                                   |
| github.com/lodash/lodash                     |
| Source: deps.dev + declared URL              |
| Confidence: High                             |
+----------------------------------------------+
| [Claim package] [Assign steward] [Block]     |
| [Open in Insights]                           |
+----------------------------------------------+
```

Drawer tab content:

- `Overview`: identity, purl, ecosystem, namespace/name, registry URL,
  criticality score, downloads, dependents, latest release, repo summary.
- `Stewardship`: current owner, status, checklist progress, reviewer, due date,
  assignment history.
- `Security`: OSV/GHSA advisories, critical vulnerability flag, security
  contact links, vulnerability policy links.
- `Provenance`: declared repository URL, normalized repository URL, mapping
  source, confidence, monorepo notes, manual override state.

History timeline (always visible below active tab content): threaded comments,
reviewer notes, contributor notes, blocked reason, audit trail, status changes,
package/advisory updates, repo stars, last commit, OpenSSF Scorecard, release
cadence, and maintainer responsiveness when available.

If the drawer has unread changes since the viewer last opened it, the history
section header shows a count badge such as `3 new`.

### Admin Review Drawer State

Purpose: review a submitted stewardship without navigating away from the queue.

```text
+----------------------------------------------+
| Review submission                            |
| express               Submitted by A. User   |
+----------------------------------------------+
| Checklist                                    |
| [x] Upstream repo verified                   |
| [x] Maintainer/security contacts checked     |
| [x] Latest release confirmed                 |
| [x] Advisory data reviewed                   |
| [!] Repo mapping confidence is medium        |
|                                              |
| Contributor notes                            |
| The declared repository redirects to GitHub. |
| deps.dev maps to the same canonical repo.    |
+----------------------------------------------+
| [Request changes] [Mark blocked] [Approve]  |
+----------------------------------------------+
```

Design notes:

- Review actions should be explicit and mutually clear.
- `Approve` moves the item to `Complete`.
- `Request changes` requires a note.
- `Mark blocked` requires a reason and optional owner reassignment.
- `Approve` can include an optional note.
- Highest-criticality packages can require multiple reviewers when a foundation
  policy sets `required_reviewers > 1`.

## Responsive Behavior

- Desktop: table remains primary, filters in a single horizontal row where
  space allows, drawer opens from the right.
- Tablet: filters wrap to two rows; table remains horizontal with the existing
  `lfx-table` behavior.
- Mobile: metrics become a two-column grid; filters stack; table rows should
  collapse into compact rows with package name, ecosystem, status, and primary
  risk signal visible before opening the drawer.

## Visual System

- Use existing Tailwind/LFX tokens only; no hard-coded brand hex values.
- Prefer Font Awesome icons already used in the app:
  - `fa-shield` for Security
  - `fa-box` or `fa-cube` for Package
  - `fa-triangle-exclamation` for Risk / advisory
  - `fa-user-check` for Claimed / Steward
  - `fa-clock` for In review / due soon
  - `fa-ban` for Blocked
  - `fa-arrow-up-right-from-square` for Insights
- Tags:
  - `Unassigned`: neutral
  - `Open`: info
  - `Claimed`: info
  - `In progress`: warning
  - `In review`: warning
  - `Changes requested`: warning
  - `Stale`: warning
  - `Blocked`: danger
  - `Returned`: neutral
  - `Needs reverification`: warning
  - `No longer in scope`: neutral
  - `Complete`: success
- Keep cards at the existing 8px radius or less.
- Do not put UI cards inside other cards; repeated package rows belong in a
  table, not nested cards.

## Empty, Loading, and Error States

- No foundation selected:
  - Title: `Select a foundation to view security work`
  - Body: `Use the foundation selector in the sidebar to choose a foundation.`
- Empty queue:
  - Title: `No packages match these filters`
  - Body: `Clear filters or switch to all statuses.`
- No assigned work:
  - Title: `No security work assigned`
  - Body: `Browse available packages to claim one when you're ready.`
- Error:
  - Title: `Failed to load security work`
  - CTA: `Retry`
- Loading:
  - Use existing table skeleton behavior with six to ten rows.

## Accessibility

- Status must not rely on color alone; every status appears as text in a tag.
- Package rows are keyboard reachable and open the drawer with Enter/Space.
- Drawer tabs use tablist semantics and preserve focus when switching tabs.
- Drawer close returns focus to the triggering table row.
- Review actions that require notes should focus the note field after selection.
- Drawer tab changes move focus to the first interactive element in the new tab.
- Sticky drawer footers use a single labeled `role="group"` landmark so screen
  readers announce the footer actions once on drawer open.
- Package queue keyboard shortcuts can support next/previous row navigation
  (`J` / `K`) after alignment with existing LFX table conventions.

## Codebase Fit

Relevant existing patterns:

- `apps/lfx-one/src/app/app.routes.ts` for flat routes under
  `MainLayoutComponent`.
- `apps/lfx-one/src/app/layouts/main-layout/main-layout.component.ts` for
  lens-aware sidebar entries.
- `apps/lfx-one/src/app/modules/dashboards/foundation-projects/` for dense
  operational table + filters + stats.
- `apps/lfx-one/src/app/modules/newsletters/` for list/create/detail patterns
  and ED-only feature routing.
- `apps/lfx-one/src/app/shared/components/table/`,
  `stat-card-grid/`, `filter-pills/`, `empty-state/`, `tag/`, and `button/`.

Suggested module:

```text
apps/lfx-one/src/app/modules/stewardship/
|-- stewardship.routes.ts
|-- project-stewardship-marketplace/
|-- project-stewardship-detail/
|-- my-stewardship/
|-- package-security-dashboard/
|-- stewardship-request-drawer/
`-- components/
```

Suggested routes:

- `/stewardship` with `data: { lens: 'me' }`
- `/foundation/stewardship` with `data: { lens: 'foundation' }`, ED/admin gated
- `/project/:slug/stewardship` for project stewardship status, concrete asks,
  current stewards, and maintainer `Request a steward`
- `/foundation/security/stewardship` for the specialized package security queue

## Backend/API Contract

Do not build the frontend against mock data. Minimum real API surface:

### Project Stewardship MVP API

- `GET /api/stewardship/projects`
  - filters: `foundation_id`, `q`, `health_status`, `stewardship_status`,
    `handoff_status`, `skill`, `language`, `urgency`, `stewardship_type`
  - cursor pagination and sort
- `GET /api/stewardship/projects/:project_uid`
- `POST /api/stewardship/projects/:project_uid/requests`
  - maintainer/admin creates a concrete ask and opens project stewardship
- `PATCH /api/stewardship/requests/:request_id`
  - update concrete ask, urgency, skills, status, or close request
- `POST /api/stewardship/requests/:request_id/interests`
  - contributor or company expresses interest
- `PATCH /api/stewardship/interests/:interest_id`
  - program staff updates handoff status, assignee, notes, and blocker state
- `GET /api/stewardship/my-work`
  - interests, onboarding, active stewardship, and package security work
- `GET /api/stewardship/summary`
  - marketplace and program metrics

Shared project-level interfaces should live in:

```text
packages/shared/src/interfaces/stewardship.interface.ts
```

### Package Security Stewardship API

- `GET /api/security/packages`
  - filters, cursor pagination, sort
- `GET /api/security/packages/:id`
- `PATCH /api/security/packages/:id`
  - admin package-level overrides such as manual repo mapping corrections
- `POST /api/security/packages/:id/stewardships`
- `PATCH /api/security/stewardships/:id`
- `POST /api/security/stewardships/:id/submit`
- `POST /api/security/stewardships/:id/review`
- `GET /api/security/my-work`
  - cursor pagination matching `/api/security/packages`
  - supports `foundation_id` filter for cross-foundation contributors
- `GET /api/security/summary`
- `POST /api/security/bulk-jobs`
- `GET /api/security/bulk-jobs/:id`

Shared interfaces should live in:

```text
packages/shared/src/interfaces/security-stewardship.interface.ts
```

Note: `no_longer_in_scope` is set via `PATCH /api/security/packages/:id` (a
package-level state change), not via the stewardship endpoints. There is no
`DELETE` endpoint — all state transitions are patches that preserve history.

### Search Behavior

The search input on `GET /api/security/packages` should support:

- Package name (exact and substring)
- purl
- Owner name (when a stewardship exists)

The `q` query param searches across these fields. Ecosystem and status
filtering remain separate query params.

### Example Stewardship Record

```json
{
  "id": "stw_123",
  "package_id": "pkg_npm_lodash",
  "scope": {
    "type": "foundation",
    "uid": "foundation_123",
    "name": "Cloud Native Computing Foundation"
  },
  "state": "in_progress",
  "state_version": 7,
  "origin": "admin_assigned",
  "owner": {
    "uid": "user_123",
    "name": "Maya Chen"
  },
  "reviewers": [
    {
      "uid": "user_456",
      "name": "ED Reviewer",
      "required": true,
      "approved_at": null
    }
  ],
  "required_reviewers": 1,
  "due_at": "2026-06-07T00:00:00Z",
  "checklist_template_id": "core_v1",
  "checklist": [
    {
      "id": "repo_verified",
      "label": "Verify upstream repository",
      "category": "core",
      "state": "complete",
      "evidence": "Declared URL and deps.dev both resolve to github.com/lodash/lodash",
      "updated_at": "2026-05-25T18:30:00Z"
    },
    {
      "id": "security_contact",
      "label": "Confirm maintainer/security contact",
      "category": "core",
      "state": "incomplete",
      "evidence": null,
      "updated_at": null
    }
  ],
  "blocker_reason": null,
  "history": [
    {
      "id": "event_123",
      "type": "state_changed",
      "actor_uid": "user_456",
      "from_state": "assigned",
      "to_state": "in_progress",
      "created_at": "2026-05-25T18:15:00Z"
    }
  ],
  "created_at": "2026-05-25T18:00:00Z",
  "updated_at": "2026-05-25T18:30:00Z"
}
```

### Concurrency

Every stewardship mutation must include `state_version` or equivalent optimistic
locking metadata. On conflict, the API returns a typed conflict response with
the latest owner/state summary so the UI can refresh the row without guessing.

Common conflict scenarios that need explicit UX:

- Two admins assign the same package simultaneously.
- A contributor claims a package that was just assigned by an admin.
- An admin marks a package `no_longer_in_scope` while a contributor is mid-
  checklist.

In all cases, the loser sees a conflict toast with the new state and owner, and
the row refreshes in place without a full page reload.

### Outbound Events

Self Serve should emit stewardship lifecycle events for Insights and reporting
even if v1 only publishes them internally:

- `security_stewardship.created`
- `security_stewardship.state_changed`
- `security_stewardship.review_requested`
- `security_stewardship.review_completed`
- `security_stewardship.blocked`
- `security_stewardship.returned`
- `security_stewardship.needs_reverification`
- `security_stewardship.stale_warning` (system-initiated, 30-day threshold)
- `security_stewardship.auto_released` (system-initiated, 60-day threshold)

The `stale_warning` and `auto_released` events are system-initiated and distinct
from actor-initiated `state_changed` events. They should carry the same payload
shape but with `actor: "system"` and the applicable aging policy threshold.

Each event includes stewardship id, package id, scope, previous state, next
state, actor, owner, reviewer, reason, and timestamp.

## Suggested PR Sequence

1. Project stewardship shared types and read API for marketplace listings.
2. Project Stewardship Marketplace with filters and project detail in read-only
   mode.
3. `Express interest` and maintainer/admin `Request a steward` intake.
4. Program staff review, maintainer connection, and handoff tracking.
5. `My Stewardship` for expressed interests, onboarding, and active stewardship.
6. Package security stewardship queue after project-level marketplace MVP is
   validated, or in parallel if Osprey package operations require it.
7. Dependency/SBOM-anchored matching once ingestion and dependency graph quality
   are reliable.

## Open Decisions

- Which upstream service owns the security stewardship API: new Osprey/security
  service, Insights API, or an existing LFX service?
  - Leaning: a dedicated stewardship workflow service, with Insights/CDP as
    source-data providers, because stewardship state, interest, and handoff are
    workflow data rather than analytics data.
- Should project stewardship and package security stewardship share one API?
  - Leaning: share core stewardship primitives (`status`, `interest`,
    `handoff`, `history`, `permissions`) but keep project and package resource
    shapes separate. Project MVP should not wait on package data model
    complexity.
- Should this be LF-wide first or foundation-scoped first?
  - Leaning: foundation-scoped first with an LF-wide admin aggregate, because
    review ownership, SLA, and assignment pools will differ by foundation.
- What roles can assign/review stewardship work beyond ED/admin?
  - Leaning: ED/admin plus delegated security reviewers configured per
    foundation. Decision needed before API permission work starts. Model the
    delegated reviewer role in v1 even if the UI only exposes ED/admin
    initially — adding a role later is a schema migration, not a UI tweak.
- What fields should count as completion across ecosystems?
  - Leaning: shared checklist core plus ecosystem-specific checklist items.
    Avoid npm/Maven-only field names in shared routes and interfaces. The
    `checklist_template_id` and `category` fields in the stewardship record
    support this.
- Should Mythos be surfaced directly in the drawer or only linked out?
  - Leaning: link out from the drawer for v1 unless the upstream API provides a
    stable summary field. Self Serve should not become the analytics surface.
- How much of this is one-time Osprey workflow versus permanent Self Serve
  security surface?
  - Leaning: build permanent primitives (`package`, `stewardship`, `review`,
    `history`) and let Osprey be the first program using them.
- **Who owns composite risk signals?** The UI depends on a composite risk score
  (Critical/High/Medium/Low), repo mapping confidence, single-maintainer flag,
  and stale-repo flag. CDP collects the raw ingredients but does not currently
  expose pre-computed tiers. Decision: CDP provides computed tiers, or Self
  Serve builds a scoring layer on top of raw data?
- **How does the package list sync from CDP?** Batch import, real-time feed, or
  API pull? How often does the package list refresh? What happens when a package
  is added or removed upstream?
- **What is the source of concrete asks?** Maintainer submission, ED/admin
  curation, derived health signals, or all three? The MVP should allow manual
  maintainer/admin asks first and layer derived recommendations later.
- **Who reviews expressions of interest?** Program staff, ED/admin, maintainers,
  or delegated reviewers? The handoff path needs an owner before API permission
  work starts.

## Data Pipeline Gap Analysis

Cross-referenced the UI requirements against the CDP Tier 2 + Tier 3 data
currently being implemented. Raw ingredients are mostly covered, but several
composite or derived signals the UI depends on are not yet in the pipeline.

### Covered by CDP Pipeline

- Package identity (name, ecosystem, purl) — Tier 2 registries
- Downloads / dependents (impact column) — Tier 3 deps.dev + npm/sonatype
- Latest version / release date — Tier 2 registries
- Repo mapping — Tier 2 deps.dev
- OpenSSF Scorecard — Tier 2 deps.dev
- Advisories / critical vuln flag — Tier 2 osv.dev / GitHub advisories
- Repo stars, forks, last commit — Tier 2 GitHub
- Maintainer info — Tier 2 registries
- Licenses — Tier 2 registries

### Gaps

| Gap                        | Priority | Detail                                                                                                                                                                                   |
| -------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Composite risk score       | High     | Risk column is the primary sort/filter axis. Raw signals exist (advisories, dependents, scorecard, maintainer count, last commit) but no composite tier. Who computes it?                |
| Repo mapping confidence    | High     | UI shows confidence level + source. deps.dev has the mapping but does not expose a confidence signal. Need to derive: `declared` = high, `deps.dev inferred` = medium, `heuristic` = low |
| Security contact / policy  | Medium   | Checklist includes "verify security contacts." Pipeline has maintainers but not SECURITY.md presence, security policy, or dedicated security contact. Small addition to GitHub fetch.    |
| Package deprecation status | Medium   | `no_longer_in_scope` needs npm deprecation flags and Maven artifact relocation/removal. Confirm registry `status` field covers these.                                                    |
| Monorepo awareness         | Medium   | Many npm packages map to the same repo. Without repo → packages cardinality, admin queue shows duplicated work with no grouping.                                                         |
| Single maintainer flag     | Low      | Derivable from maintainer records. Should be exposed as queryable boolean, not raw records Self Serve counts client-side.                                                                |
| Stale repo flag            | Low      | Last commit is collected. Needs threshold definition + computed flag.                                                                                                                    |

## Permissions Model

The role and action matrix above defines what each role can do per state, but
does not define how roles are determined. This must be resolved before API
permission work starts.

Proposed model:

- **ED / admin**: Existing LFX foundation-level ED and admin roles. Can triage,
  assign, review, and bulk-manage within their foundation scope.
- **Delegated security reviewer**: New role, configured per foundation by an ED.
  Can review submissions and request changes, but cannot bulk-assign or manage
  assignment pools.
- **Contributor**: Any authenticated LFX user. Can claim open packages, work
  checklists, submit for review, and return stewardship.

The API should enforce foundation-scoped permissions: an ED for Foundation A
cannot assign packages scoped to Foundation B.

## Priority Updates From Spec Review

1. Make Project Stewardship Marketplace the MVP front door.
2. Keep package security stewardship as a specialized Osprey workflow under the
   broader program.
3. Add project-level concrete asks, express-interest, maintainer request, and
   handoff tracking before package review complexity.
4. Resolve state lifecycle gaps before package workflow implementation:
   `needs_reverification`, `stale`, `returned`, and `no_longer_in_scope`.
5. Design for real queue volume: bulk actions, saved views, assignment policies,
   async jobs, and optimistic locking.
6. Keep explicit role x state x action matrices in the spec and QA plan for both
   project stewardship and package stewardship.
7. Treat History as a first-class collaboration and audit surface, not a single
   notes textarea.
8. Keep copy and API fields ecosystem-agnostic so PyPI, RubyGems, Cargo, NuGet,
   and Go modules can join later without route or data-model churn.
9. Resolve composite risk signal ownership (CDP vs Self Serve scoring layer)
   before package queue UI implementation.
10. Resolve data sync mechanism (batch, real-time, API pull) and refresh cadence
    from CDP before package backend work starts.
