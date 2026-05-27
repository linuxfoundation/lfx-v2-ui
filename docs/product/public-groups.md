<!-- Copyright The Linux Foundation and each contributor to LFX. -->
<!-- SPDX-License-Identifier: MIT -->

# Public Groups Experience

## Purpose

LFX Self Serve should provide the canonical public groups experience for Linux
Foundation foundations and projects. Public visitors should be able to discover
official groups, understand what each group does, see how to participate, and
move into the appropriate join or application flow.

This experience should also expose a public-safe API contract that other LF
properties can consume. OCG can use that contract to enrich meetup/community
activation experiences without recreating the canonical LFX group model.

## Related Context

OCG is the Open Community Groups platform used for meetup/community activation.
It replaced Bevy for CNCF meetup groups and is also being used by LF Energy.

Reference links:

- OCG site: <https://ocgroups.dev/>
- OCG documentation:
  <https://cncf-open-community-groups.mintlify.app/introduction>
- LF Energy OCG example: <https://ocgroups.dev/lf-energy>
- OCG source: <https://github.com/cncf/open-community-groups>
- OCG feedback/issues:
  <https://github.com/cncf/open-community-groups/issues>
- OCG RISC-V migration issue:
  <https://github.com/cncf/open-community-groups/issues/428>
- OCG public group example with Call for Speakers:
  <https://ocgroups.dev/cncf/group/39aenb6>

The alignment assumption for this spec is:

- OCG owns public meetup/community activation and event operations.
- LFX Self Serve owns canonical public groups, WG/SIG/project structure,
  identity, permissions, and reporting.
- OCG's immediate LFX dependency is access to profile data/API so LFID users can
  show useful public profile information and link back to LFX Profile.
- OCG is also discussing adjacent surfaces such as user dashboards and call for
  speakers. Those are useful community workflows, but in LFX context they should
  resolve through LFX Profile, project/foundation/group context, and product
  ownership rather than become a parallel canonical experience.
- LFX Self Serve still needs meetup/group activity visible in Me, Project, and
  Foundation lenses.

## Product Principles

- LFX Self Serve is canonical for official foundation/project groups, WG/SIG
  structure, group classification, join rules, permissions, and reporting.
- OCG owns meetup/community activation and event operations.
- LFX remains the source of truth for foundations, projects, official groups,
  communities, LFID/Profile, and governance-adjacent workflows.
- Meetup activity can appear in LFX Self Serve, but meetup/community groups
  should be visually distinct from official LFX groups.
- User dashboards, call for speakers, and other participant-facing workflows may
  link to OCG operations, but the LFX experience should own the canonical user
  journey when those workflows are tied to projects, foundations, or official
  groups.
- Public APIs must expose only public-safe fields and honor group/member
  visibility settings.
- External apps can build their own UI from the public contract, but writes to
  canonical group data remain owned by LFX unless a separate write contract is
  approved.

## Personas

- Public visitor: discovers groups and learns how to participate.
- Contributor: finds groups they can join, apply to, or follow.
- Maintainer/group chair: points people to the official public group page.
- ED/Admin Mode user: needs public group structure and participation to be
  consistent with PCC reporting.
- External app/team: consumes public-safe group data for related experiences.

## MVP Scope

### Public Foundation Groups Page

Public route:

- `/foundations/:foundationSlug/groups`

The page lists public groups connected to a foundation.
The public page handler resolves `foundationSlug` to the canonical foundation
UID before calling the UID-based public API.

MVP behavior:

- Show foundation identity: name, logo, short description.
- Show public foundation-level groups.
- Show public project-level groups under the foundation by default.
- Separate canonical LFX group types from meetup/community activation groups.
- Filter by group type, project, and join mode.
- Link to each public group detail page.
- Show safe summary data: group name, type/category, parent project,
  description, member count when allowed, join mode, and key public links.

### Public Project Groups Page

Public route:

- `/projects/:projectSlug/groups`

The page lists public groups connected to a project.
The public page handler resolves `projectSlug` to the canonical project UID
before calling the UID-based public API.

MVP behavior:

- Show project identity and parent foundation context.
- Show public project-level groups.
- Filter by group type and join mode.
- Link to each public group detail page.
- Show safe summary data matching the foundation page.

### Public Group Detail Page

Public route:

- `/groups/:groupUid/:slug`

The page shows one public group.

MVP behavior:

- Enforce `public === true`; otherwise return not found.
- Show group name, display name, category/type, description, and parent
  foundation/project context.
- Show join mode and appropriate CTA:
  - `open`: sign in to join / join group.
  - `application`: sign in to apply / apply to join.
  - `invite_only`: invite-only status and contact guidance.
  - `closed`: closed status.
- Show public links: website, mailing list, chat channel, calendar.
- Show public meeting/calendar information when allowed.
- Show member count when public-safe.
- Show chairs and vice chairs when visibility and profile policy allow it.
- Link to related OCG/meetup activity when a mapping exists.

## API Contract

The public group pages should use public BFF endpoints rather than authenticated
app endpoints.

### Directory Endpoints

```text
GET /public/api/foundations/:foundationUid/groups
GET /public/api/projects/:projectUid/groups
```

Returns public group summaries.

Public summary shape:

```ts
interface PublicGroupSummary {
  uid: string;
  slug: string;
  name: string;
  display_name?: string;
  description?: string;
  category: string;
  behavioral_class: string;
  context: PublicGroupContext;
  public: true;
  join_mode?: 'open' | 'invite_only' | 'application' | 'closed';
  total_members?: number;
  website?: string | null;
  mailing_list?: string | null;
  chat_channel?: string | null;
  has_public_calendar?: boolean;
  external_sources?: PublicGroupExternalSource[];
}
```

Context shape:

```ts
interface PublicGroupContext {
  scope: 'foundation' | 'project';
  foundation_uid: string;
  foundation_name: string;
  foundation_slug: string;
  project_uid?: string;
  project_name?: string;
  project_slug?: string;
}
```

### Detail Endpoint

```text
GET /public/api/groups/:groupUid
```

Returns public-safe detail for one group.

Public detail shape:

```ts
interface PublicGroupDetail extends PublicGroupSummary {
  calendar_url?: string;
  upcoming_meetings?: PublicGroupMeeting[];
  chairs?: PublicGroupMember[];
  member_visibility: 'hidden' | 'basic_profile';
  links: {
    website?: string | null;
    mailing_list?: string | null;
    chat_channel?: string | null;
    calendar?: string | null;
    ocg?: string | null;
  };
}
```

Only chairs and vice chairs are included in `chairs` by default. Full member
lists are out of MVP scope for public pages.

External source shape:

```ts
interface PublicGroupExternalSource {
  provider: 'ocg';
  entity_type: 'community' | 'group' | 'event';
  label: string;
  url: string;
  external_id?: string;
}
```

Member shape:

```ts
interface PublicGroupMember {
  name: string;
  organization?: string;
  role?: string;
  profile_url?: string;
  avatar_url?: string;
}
```

Meeting shape:

```ts
interface PublicGroupMeeting {
  uid: string;
  title: string;
  starts_at: string;
  ends_at?: string;
  timezone?: string;
  url?: string;
}
```

## Current Backend Support

Available now:

- Committee service supports core group fields: `project_uid`, `public`,
  `category`, `description`, `join_mode`, `member_visibility`,
  `calendar.public`, `mailing_list`, `chat_channel`, `website`, and
  `total_members`.
- Query service supports `type=committee` with `tags`, `tags_all`, and direct
  filters.
- LFX Self Serve already lists authenticated groups by project with
  `tags=project_uid:<uid>`.
- Foundation scoping pattern exists for "my committees" by expanding a
  foundation to child project UIDs.
- Public calendar route exists for a committee:
  `/public/api/committees/:id/calendar.ics`.

Gaps:

- No merged public unauthenticated endpoint for group directory.
- No merged public unauthenticated endpoint for group detail.
- No public API that aggregates foundation-level and child-project groups.
- Existing `PublicCommittee` type is too narrow for the foundation/project
  directory and detail vision.
- Member/chair exposure needs a clear privacy rule tied to `member_visibility`
  and LFX Profile policy.
- OCG/meetup mapping fields do not exist yet.
- User dashboard and call-for-speakers boundaries need explicit product
  decisions so OCG does not become a parallel LFX participant or project
  workflow surface by default.

## Product Decisions

- Foundation public groups include both foundation-level groups and child
  project groups by default. The project filter narrows the full list rather
  than revealing collapsed content.
- Public page routes are:
  - `/foundations/:foundationSlug/groups`
  - `/projects/:projectSlug/groups`
  - `/groups/:groupUid/:slug`
- Public API routes remain UID-based:
  - `GET /public/api/foundations/:foundationUid/groups`
  - `GET /public/api/projects/:projectUid/groups`
  - `GET /public/api/groups/:groupUid`
- Public page routes may be slug-based, but page handlers must resolve slugs to
  canonical UIDs before calling the public APIs.
- Public people exposure is limited to chairs and vice chairs in the MVP.
- Public group detail shows chairs and vice chairs by default, not all members.
- The public group API should return person display fields only for the group
  context: name, role, organization, avatar URL, and `profile_url` when allowed.
- The Profile API remains responsible for profile detail, profile privacy,
  affiliation detail, and the canonical public profile URL. Consumers should use
  `profile_url` returned by the Profile API rather than constructing profile
  links from usernames.
- OCG should receive canonical group/project/foundation context from the public
  group API and person enrichment from the Profile API.
- Call for speakers belongs in the LFX product boundary when it depends on LFID,
  Profile, affiliation, project/foundation context, review workflows, or
  reporting. OCG can host public event/meetup operations and link back to LFX
  for the canonical participant and project context.

## OCG Mapping Model

OCG mappings should be stored as explicit external-source links rather than
inferred from names.

```ts
interface PublicGroupExternalMapping {
  provider: 'ocg';
  lfx_group_uid?: string;
  lfx_project_uid?: string;
  lfx_foundation_uid: string;
  external_community_id?: string;
  external_group_id?: string;
  external_event_id?: string;
  external_url: string;
  relationship: 'source' | 'related_activity' | 'canonical_lfx_group';
}
```

Mapping rules:

- OCG community records map to an LFX foundation or project context.
- OCG group records map to an LFX group only when there is an explicit
  relationship.
- OCG event records remain activity records and should not create canonical LFX
  groups by implication.
- Names are display hints only; UIDs and explicit mappings drive joins.

## Implementation Plan

### Phase 1: Public API Contract

- Add shared public group summary/detail interfaces.
- Add BFF directory endpoints:
  - `GET /public/api/foundations/:foundationUid/groups`
  - `GET /public/api/projects/:projectUid/groups`
- Add BFF detail endpoint:
  - `GET /public/api/groups/:groupUid`
- Use M2M for upstream reads.
- Enforce `public === true`.
- Strip private fields.
- Respect `member_visibility`.

### Phase 2: LFX Self Serve Public UI

- Build public foundation groups page.
- Build public project groups page.
- Build public group detail page.
- Include clear classification for official LFX groups vs meetup/community
  activation groups.
- Add join/apply/sign-in CTAs using existing join mode semantics.

### Phase 3: External Consumption

- Document public API contract for OCG and foundation websites.
- Add stable links from OCG groups/events to canonical LFX groups where mapped.
- Add optional OCG source links on public group detail pages.

### Phase 4: Lens Integration

- Surface meetup/group activity in Me, Project, and Foundation lenses.
- Keep LFX groups canonical while displaying OCG meetup activity in context.
- Feed activity and participation into Insights with clear source labels.

## Open Questions

- What is the canonical LFX Profile public URL shape?
- Which Profile API fields are approved for OCG display beyond name, avatar,
  profile URL, and current organization?
- Should OCG mappings be maintained in LFX Self Serve, OCG, or a shared
  integration service?
