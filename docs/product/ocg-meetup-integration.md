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

## User Experience

### Me Lens

Show the user's meetup/community activity across LF:

- Upcoming OCG events the user RSVP'd to.
- Past OCG events the user attended or checked into.
- OCG groups the user follows or joined.
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

### Foundation Lens

Show foundation-wide meetup/community activation:

- Upcoming events across foundation and child projects.
- Activity by project, geography, and community group.
- Participation trends and repeat attendance.
- Meetup-to-LFX engagement funnel.
- Coverage gaps where a foundation/project has no meetup activity.

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

## Out Of Scope For MVP

- Moving OCG event operations into LFX Self Serve.
- Letting OCG write canonical LFX groups.
- Full member roster sync from OCG into LFX groups.
- Replacing LFX meetings, votes, surveys, mailing lists, or WG/SIG workflows.
- Inferring canonical LFX groups from OCG names.

## Implementation Plan

### Phase 1: Contract And Mapping

- Agree on stable OCG IDs and API/feed shape.
- Create or identify mapping storage for OCG entity -> LFX entity links.
- Define identity matching rules for LFID/Profile.
- Define source labels and privacy constraints.

### Phase 2: Read Integration

- Add BFF read endpoints or data-access services for OCG activity.
- Normalize OCG activity into shared interfaces.
- Add Project/Foundation lens upcoming-event cards.
- Add Me Lens activity when identity is mapped.

### Phase 3: Public Group Integration

- Show related OCG activity on public LFX group detail pages.
- Show OCG links on public group summaries when mapped.
- Keep OCG activity visually distinct from canonical group fields.

### Phase 4: Insights

- Feed OCG source-labeled activity into Insights.
- Add conversion/reporting metrics for meetup-to-LFX engagement.
- Add data quality checks for unmapped OCG groups/events.

## Open Questions

- Will LFX consume OCG via API, data lake, or both?
- Where should OCG -> LFX mappings be maintained?
- What exact Profile API fields are approved for OCG display?
- Which OCG participation states are reliable enough for Insights metrics?
- Should public LFX group pages show OCG event cards in MVP or a later phase?
