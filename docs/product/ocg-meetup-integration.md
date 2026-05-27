<!-- Copyright The Linux Foundation and each contributor to LFX. -->
<!-- SPDX-License-Identifier: MIT -->

# OCG Meetup Integration

## Purpose

LFX Self Serve should consume meetup/community activation data from OCG and show
it in the right LFX context across Me, Project, and Foundation lenses.

OCG should remain the operational system for meetup/community activation:
communities, meetup groups, public events, RSVPs, attendance, and organizer
workflows. LFX Self Serve should remain canonical for foundation/project/group
structure, identity, permissions, and reporting.

## Related Systems

- OCG site: <https://ocgroups.dev/>
- LF Energy OCG example: <https://ocgroups.dev/lf-energy>
- OCG source: <https://github.com/cncf/open-community-groups>
- OCG issues: <https://github.com/cncf/open-community-groups/issues>
- OCG RISC-V migration issue:
  <https://github.com/cncf/open-community-groups/issues/428>
- LFX Self Serve source:
  <https://github.com/linuxfoundation/lfx-self-serve>
- LFX Skills source:
  <https://github.com/linuxfoundation/lfx-skills>
- LFX public groups spec: [Public Groups Experience](./public-groups.md)

## Product Principles

- OCG owns meetup operations and the public meetup/event experience.
- LFX Self Serve owns canonical foundation, project, WG/SIG/group, profile,
  permissions, and reporting context.
- LFX Self Serve consumes OCG activity as linked activity, not as canonical
  group structure unless an explicit mapping says otherwise.
- LFID authentication is not enough by itself; profile, affiliation, and entity
  mapping are needed for LFX reporting and lens experiences.
- Data shown in LFX must preserve source labels so users can distinguish OCG
  meetup activity from canonical LFX group membership.
- OCG user-dashboard or call-for-speakers capability should be treated as
  community/event operations unless it requires canonical LFID/Profile,
  project/foundation/group, reviewer, or reporting context. In those cases, LFX
  Self Serve/PCC should own the canonical workflow and OCG should link or feed
  activity into it.
- OCG should contribute LFX-adjacent workflow needs directly into LFX Self
  Serve when the work depends on canonical LFX data. LFX Self Serve is open
  source, and the public LFX Skills repository provides development workflows
  for LFX research, product architecture, UI work, backend work, setup, testing,
  and preflight validation.

## Recommended OCG Delivery Model

OCG can achieve its LFX-facing goals fastest by treating LFX Self Serve as the
canonical contribution target for LFX-owned workflows instead of building a
parallel participant, group, profile, CFP, or reporting surface inside OCG.

The recommended model is:

- OCG owns and continues to improve meetup/community activation: community
  pages, meetup groups, public events, RSVPs, attendance, check-in, organizer
  workflows, and event operations.
- LFX Self Serve/PCC owns canonical workflows when the experience depends on
  LFID/Profile, affiliation, foundation/project/group context, permissions,
  reviewer workflows, reporting, or lens visibility.
- OCG contributes LFX-adjacent features directly into the open LFX Self Serve
  repository or the relevant LFX v2 service repository.
- OCG uses `linuxfoundation/lfx-skills` to accelerate delivery. The skills
  provide a plain-language `/lfx` entry point plus focused workflows for
  research, product architecture, backend implementation, UI implementation,
  environment setup, journey testing, and pre-PR validation.
- Product work should start with `/lfx-product-architect` or `/lfx-research` to
  decide whether the workflow belongs in OCG, LFX Self Serve, or a shared
  service contract.
- Implementation work should use `/lfx-coordinator`, `/lfx-backend-builder`,
  and `/lfx-ui-builder` when LFX code changes are needed.
- Before PR submission, OCG contributors should use `/lfx-preflight` and follow
  the LFX Self Serve contribution rules for license headers, tests, linting,
  build checks, DCO sign-off, and focused PR scope.

This keeps OCG moving quickly while avoiding duplicate sources of truth. It also
preserves data integrity because canonical LFX writes, permissions, and
reporting remain inside LFX-owned contracts.

## User Experience

### Me Lens

Show the user's meetup/community activity across LF:

- Upcoming OCG events the user RSVP'd to.
- Past OCG events the user attended or checked into.
- OCG groups the user follows or joined.
- Call-for-speakers submissions, speaker status, or review actions only when
  mapped to canonical LFX Profile and project/foundation context.
- Recommended meetup/community events based on project affiliations,
  memberships, and interests.
- Links back to OCG for event operations such as RSVP updates, check-in, and
  event details.

### Project Lens

Show meetup/community activation for the active project:

- Upcoming OCG events mapped to the project.
- Past events and participation trends.
- OCG groups mapped to the project.
- Organizer/chair context where available.
- Conversion indicators that connect meetup activity to LFX participation, such
  as profile completion, group join/apply actions, mailing-list joins, or WG/SIG
  engagement.
- CFP activity when the call is explicitly mapped to the active project and the
  review/reporting path is owned by LFX.

### Foundation Lens

Show foundation-wide meetup/community activation:

- Upcoming events across foundation and child projects.
- Activity by project, geography, and community group.
- Participation trends and repeat attendance.
- Meetup-to-LFX engagement funnel.
- Coverage gaps where a foundation/project has no meetup activity.
- Cross-project CFP activity only as source-labeled activity unless LFX owns the
  canonical call, reviewer, and reporting workflow.

## Data Contract

LFX Self Serve should consume OCG data through a stable public or partner API,
or through a data lake feed with the same logical contract.

### OCG Community

```ts
interface OcgCommunity {
  provider: 'ocg';
  community_id: string;
  slug: string;
  name: string;
  url: string;
  mapped_foundation_uid?: string;
  mapped_project_uid?: string;
}
```

### OCG Group

```ts
interface OcgGroup {
  provider: 'ocg';
  group_id: string;
  community_id: string;
  slug: string;
  name: string;
  description?: string;
  url: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  mapped_foundation_uid?: string;
  mapped_project_uid?: string;
  mapped_lfx_group_uid?: string;
}
```

### OCG Event

```ts
interface OcgEvent {
  provider: 'ocg';
  event_id: string;
  group_id: string;
  community_id: string;
  slug: string;
  title: string;
  description?: string;
  url: string;
  starts_at: string;
  ends_at?: string;
  timezone?: string;
  format: 'in_person' | 'virtual' | 'hybrid';
  location?: {
    venue?: string;
    city?: string;
    region?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  mapped_foundation_uid?: string;
  mapped_project_uid?: string;
  mapped_lfx_group_uid?: string;
}
```

### OCG Participation

```ts
interface OcgParticipation {
  provider: 'ocg';
  event_id: string;
  group_id: string;
  community_id: string;
  lfx_profile_uid?: string;
  lfid?: string;
  email_hash?: string;
  status: 'rsvp_yes' | 'waitlisted' | 'attended' | 'checked_in' | 'canceled';
  occurred_at: string;
}
```

### OCG Call For Speakers Activity

CFP data is optional in the meetup feed. It should only be consumed by LFX when
the activity can be mapped to a canonical profile and LFX project/foundation
context.

```ts
interface OcgCfpActivity {
  provider: 'ocg';
  cfp_id: string;
  event_id: string;
  community_id: string;
  group_id?: string;
  title: string;
  url: string;
  status: 'open' | 'closed' | 'reviewing' | 'accepted' | 'rejected';
  mapped_foundation_uid?: string;
  mapped_project_uid?: string;
  mapped_lfx_group_uid?: string;
}
```

## Mapping Model

OCG records must map to LFX records through explicit IDs, not name matching.

```ts
interface OcgLfxMapping {
  provider: 'ocg';
  ocg_entity_type: 'community' | 'group' | 'event';
  ocg_entity_id: string;
  lfx_entity_type: 'foundation' | 'project' | 'group';
  lfx_entity_uid: string;
  relationship: 'activity_for' | 'related_to' | 'canonical_lfx_group';
}
```

Mapping rules:

- OCG community -> LFX foundation/project identifies broad context.
- OCG group -> LFX project/group only when explicitly mapped.
- OCG event -> LFX foundation/project/group as activity, never as canonical
  structure by implication.
- OCG user-dashboard and CFP records -> LFX Profile and project/foundation/group
  context only through explicit IDs. They should not create LFX participants,
  group memberships, project relationships, or review workflows by name match.
- OCG participant -> LFX Profile through LFID/profile UID when available, with
  email hash only as a fallback for analytics matching.

## Profile Integration

OCG needs profile enrichment for LFID-authenticated users. LFX Self Serve should
not duplicate profile detail from OCG; it should consume profile identity from
LFX Profile.

Profile fields likely needed by OCG:

- Display name.
- Avatar URL.
- Public profile URL.
- Current organization/affiliation.
- Public location, if allowed.
- Social links, if allowed.

Profile fields should come from the Profile API, not the OCG activity feed.
OCG activity should carry stable user identity references, such as profile UID
or LFID, so LFX can enrich and reconcile participation.

## LFX Consumption Surfaces

### Dashboard Cards

- Upcoming meetup events.
- Recent meetup activity.
- Top active meetup groups.
- Participation trend cards.
- Meetup-to-LFX engagement conversion.

### Group Detail

When an OCG group is mapped to an LFX group, the LFX public group detail page can
show:

- Related OCG group link.
- Upcoming OCG events.
- Recent OCG activity.
- Source label: `Powered by OCG`.

### Insights

OCG activity should feed Insights as source-labeled activity:

- `source = ocg`
- `activity_type = meetup_event | meetup_rsvp | meetup_attendance`
- `foundation_uid`
- `project_uid`
- `group_uid`, when mapped
- `profile_uid`, when available

## MVP Scope

- Define the OCG -> LFX mapping model.
- Ingest or fetch OCG communities, groups, events, and participation summaries.
- Show OCG upcoming events in Project and Foundation lenses.
- Show user-specific OCG event activity in Me Lens when identity mapping exists.
- Link back to OCG for RSVP, check-in, and full event detail.
- Display OCG activity as source-labeled, non-canonical meetup activity.
- Identify any LFX-adjacent OCG dashboard, CFP, or Profile needs as candidate
  LFX Self Serve contributions instead of OCG-owned canonical surfaces.

## Out Of Scope For MVP

- Moving OCG event operations into LFX Self Serve.
- Letting OCG write canonical LFX groups.
- Full member roster sync from OCG into LFX groups.
- Replacing LFX meetings, votes, surveys, mailing lists, or WG/SIG workflows.
- Replacing LFX user dashboards, Profile, CFP/reviewer workflows, or project
  participation workflows.
- Inferring canonical LFX groups from OCG names.

## Implementation Plan

### Phase 1: Contract And Mapping

- Agree on stable OCG IDs and API/feed shape.
- Create or identify mapping storage for OCG entity -> LFX entity links.
- Define identity matching rules for LFID/Profile.
- Define source labels and privacy constraints.
- Use LFX Skills research/product architecture workflows to confirm whether
  each proposed feature belongs in OCG, LFX Self Serve, or a shared data
  contract.

### Phase 2: Read Integration

- Add BFF read endpoints or data-access services for OCG activity.
- Normalize OCG activity into shared interfaces.
- Add Project/Foundation lens upcoming-event cards.
- Add Me Lens activity when identity is mapped.
- Use the LFX backend/UI builder workflows for LFX Self Serve changes so the
  implementation follows existing repo patterns.

### Phase 3: Public Group Integration

- Show related OCG activity on public LFX group detail pages.
- Show OCG links on public group summaries when mapped.
- Keep OCG activity visually distinct from canonical group fields.

### Phase 4: Insights

- Feed OCG source-labeled activity into Insights.
- Add conversion/reporting metrics for meetup-to-LFX engagement.
- Add data quality checks for unmapped OCG groups/events.

### Phase 5: OCG Contribution Path

- Open focused LFX Self Serve issues or JIRA tickets for any dashboard, CFP,
  Profile, lens, or reporting changes that belong in LFX.
- Use the public LFX Self Serve repository for implementation PRs.
- Use the public LFX Skills repository to accelerate research, implementation,
  validation, and PR readiness.
- Keep OCG code focused on meetup/event operations and link or feed activity to
  the canonical LFX workflows.

## Open Questions

- Will LFX consume OCG via API, data lake, or both?
- Where should OCG -> LFX mappings be maintained?
- What exact Profile API fields are approved for OCG display?
- Which OCG participation states are reliable enough for Insights metrics?
- Should public LFX group pages show OCG event cards in MVP or a later phase?
- Which OCG feature requests should become LFX Self Serve contribution issues
  because they depend on LFID/Profile, canonical group context, CFP/reviewer
  workflows, or reporting?
