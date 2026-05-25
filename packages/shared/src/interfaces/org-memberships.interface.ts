// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

export interface OrgMembershipsSummary {
  activeMemberships: number;
  renewingWithin90Days: number;
  governanceRoles: number;
}

export interface OrgActiveMembership {
  foundationId: string;
  foundationName: string;
  foundationLogo: string | null;
  projectCount: number;
  memberCount: number;
  membershipTier: string;
  tierStartDate: string | null;
  tierEndDate: string | null;
  memberSince: string | null;
  boardMembers: number;
  committeeMembers: number;
  orgProjects: number;
}

export interface OrgActiveMembershipsResponse {
  accountId: string;
  summary: OrgMembershipsSummary;
  memberships: OrgActiveMembership[];
}

export interface OrgExpiredMembership {
  foundationId: string;
  foundationName: string;
  foundationLogo: string | null;
  membershipTier: string;
  tierStartDate: string | null;
  tierEndDate: string | null;
  expirationDate: string | null;
  actionType: 'renew' | 'contact';
}

export interface OrgExpiredMembershipsResponse {
  accountId: string;
  memberships: OrgExpiredMembership[];
}

export interface OrgDiscoverOpportunity {
  foundationId: string;
  foundationName: string;
  foundationLogo: string | null;
  category: string;
  suggestedTier: string;
  relevantProjects: number;
  contributors: number;
  contributions: number;
}

export interface OrgDiscoverOpportunitiesResponse {
  accountId: string;
  opportunities: OrgDiscoverOpportunity[];
}

// Membership Detail page (spec 015) ---------------------------------------------------------

export type OrgMembershipKeyContactType = 'representative' | 'technical' | 'marketing' | 'pr' | 'legal' | 'billing';

export interface OrgMembershipKeyContactPerson {
  personId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  jobTitle: string | null;
  initials: string;
}

export interface OrgMembershipKeyContact {
  contactType: OrgMembershipKeyContactType;
  contactTypeLabel: string;
  minContacts: number;
  maxContacts: number;
  people: OrgMembershipKeyContactPerson[];
}

export interface OrgMembershipFoundationHeader {
  foundationId: string;
  foundationName: string;
  foundationLogo: string | null;
  membershipTier: string;
  tierStartDate: string | null;
  tierEndDate: string | null;
  memberSince: string | null;
  status: 'active' | 'expired';
}

export interface OrgMembershipDetailResponse {
  foundation: OrgMembershipFoundationHeader | null;
  keyContacts: OrgMembershipKeyContact[];
}

// Membership Detail page — Board & Committee tab (spec 016) ----------------------------------

/**
 * One row in the Board Seats table. Carries an embedded `person` (reuses the
 * spec 015 `OrgMembershipKeyContactPerson`), the seat name, a categorical
 * `tagLabel` (distinct from seat name — e.g., "Voting Rep"), voting
 * percentage, and the `isOrgEditable` boolean that drives whether the
 * Actions cell renders a pencil OR a "Why can't I edit?" link.
 */
export interface BoardSeat {
  seatId: string;
  person: OrgMembershipKeyContactPerson;
  seatName: string;
  tagLabel: string;
  votingPercentage: number | null;
  isOrgEditable: boolean;
  reason: string | null;
}

/**
 * One row in the Committee Seats table. Asymmetric with `BoardSeat`:
 * `seatName` is replaced by `committeeName`, a `role` field is added (the
 * person's role within the committee — e.g., "Chair", "Member"), and
 * `tagLabel` is OMITTED (the Role column AND the Reassign modal pill both
 * source from `role` directly per spec 016 Q1 round 3 clarification).
 */
export interface CommitteeSeat {
  seatId: string;
  person: OrgMembershipKeyContactPerson;
  committeeName: string;
  role: string;
  votingPercentage: number | null;
  isOrgEditable: boolean;
  reason: string | null;
}

/** One row in the read-only Voting History table. No Action affordance. */
export interface VotingRecord {
  voteId: string;
  /** ISO 8601 date (`YYYY-MM-DD`). */
  date: string;
  resolution: string;
  vote: 'Yes' | 'No' | 'Abstain';
  outcome: string;
}

/** Response envelope for `GET /api/orgs/:accountId/lens/memberships/:foundationId/board-seats`. */
export interface OrgMembershipBoardSeatsResponse {
  accountId: string;
  foundationId: string;
  boardSeats: BoardSeat[];
}

/** Response envelope for `GET /api/orgs/:accountId/lens/memberships/:foundationId/committee-seats`. */
export interface OrgMembershipCommitteeSeatsResponse {
  accountId: string;
  foundationId: string;
  committeeSeats: CommitteeSeat[];
}

/** Response envelope for `GET /api/orgs/:accountId/lens/memberships/:foundationId/voting-history`. */
export interface OrgMembershipVotingHistoryResponse {
  accountId: string;
  foundationId: string;
  /** Default order: reverse-chronological (newest first). */
  votingHistory: VotingRecord[];
}

/**
 * Body shape for the future `PATCH /…/board-seats/:seatId` and
 * `PATCH /…/committee-seats/:seatId` write proxy endpoints (FR-009g). Pinned
 * now so the Reassign modal output event can use the canonical type even
 * though no HTTP call is made in v1.
 *
 * Note: `jobTitle` is intentionally NOT included — it is upstream-authoritative
 * (FR-009g / round 5 Q5).
 */
export interface ReassignSeatBody {
  firstName: string;
  lastName: string;
  email: string;
}

// Org Memberships list page — view-model types -----------------------------------------------

export type OrgMembershipsPageState = 'loading' | 'error' | 'ready' | 'empty';
export type OrgMembershipTab = 'active' | 'expired' | 'discover';

export interface OrgDropdownOption {
  label: string;
  value: string;
}

export interface ActiveMembershipRow extends OrgActiveMembership {
  initials: string;
  tierRange: string;
  memberSinceFormatted: string;
}

export interface ExpiredMembershipRow extends OrgExpiredMembership {
  initials: string;
  logoClasses: string;
  expirationDateFormatted: string;
  tierStartFormatted: string;
  tierEndFormatted: string;
  renewUrl: string;
}

export interface DiscoverOpportunityRow extends OrgDiscoverOpportunity {
  initials: string;
  logoClasses: string;
  joinUrl: string;
}

// Membership Detail page — component types ---------------------------------------------------

export type OrgMembershipDetailPageState = 'loading' | 'error' | 'ready' | 'empty' | 'notFound';
export type MembershipDetailTab = 'key-contacts' | 'board' | 'docs' | 'governance';

export interface ModalOpenState {
  contact: OrgMembershipKeyContact;
  editingPersonId: string | null;
}

export type ModalKind = 'closed' | 'replace-form' | 'chooser' | 'add-form' | 'remove-list' | 'single-add-form';

export interface EditKeyContactSubmitEvent {
  contactType: OrgMembershipKeyContactType;
  contactTypeLabel: string;
  editingPersonId: string | null;
  person: OrgMembershipKeyContactPerson;
}

export interface EditKeyContactRemoveEvent {
  contactType: OrgMembershipKeyContactType;
  contactTypeLabel: string;
  personId: string;
}

export interface ReassignSubmitEvent {
  seatId: string;
  seatKind: 'board' | 'committee';
  body: ReassignSeatBody;
}

export type SectionLoadState = 'idle' | 'loading' | 'success' | 'error';

export interface VotingRecordRow extends VotingRecord {
  formattedDate: string;
  chipClass: string;
}

// Membership Detail page — Dialog contracts (centralised per coderabbitai review) --------------

export interface EditKeyContactDialogData {
  contact: OrgMembershipKeyContact;
  foundationName: string;
  editingPersonId: string | null;
}

export type EditKeyContactDialogResult =
  | { kind: 'replace'; event: EditKeyContactSubmitEvent }
  | { kind: 'add'; event: EditKeyContactSubmitEvent }
  | { kind: 'remove'; event: EditKeyContactRemoveEvent }
  | null;

export interface ReassignBoardRolesDialogData {
  seat: BoardSeat | CommitteeSeat;
  seatKind: 'board' | 'committee';
  foundationName: string;
}

export type ReassignBoardRolesDialogResult = ReassignSubmitEvent | null;

export interface WhyCantEditDialogData {
  reason: string | null;
  seatId: string;
}

export type WhyCantEditDialogResult = { contactFoundation: boolean } | null;

// Membership Detail page — Documentation tab (spec 017 baseline + spec 018 Snowflake extension)

/**
 * One agreement document in the Documentation tab list.
 *
 * Spec 018 changes (round 1 + round 2):
 * - `fileSizeKb` widened from `number` → `number | null` (FR-014/FR-018). Snowflake/Salesforce
 *   do not store file size; the BFF returns null for Snowflake-backed responses. UI drops the
 *   `· {size} KB` metadata segment via `@if (agreement.fileSizeKb !== null)` when null.
 * - `downloadUrl: string | null` added (round 2 FR-031). Sourced from
 *   `Opportunity.Membership_Doc_Download_URL__c` via bronze → silver → platinum chain. NULL
 *   for older agreements (pre-UAT-2023 process change) — UI renders the View link as
 *   disabled with `"Document not available"` tooltip (FR-028a).
 * - `statusRaw: string` added (round 2 FR-032b). One of 'Active' / 'At Risk' / 'Purchased' /
 *   'Completed' / 'Expired'. Used by the CSV export (FR-032a column 6); not rendered on screen.
 * - `tier: string` added (round 2 FR-032b). The full membership tier display label
 *   (e.g., "Platinum Membership"). Used by the CSV export (FR-032a column 7); not rendered.
 */
export interface OrgMembershipAgreement {
  id: string;
  name: string;
  signedDate: string;
  format: string;
  fileSizeKb: number | null;
  isCurrent: boolean;
  downloadUrl: string | null;
  statusRaw: string;
  tier: string;
}

/**
 * Certificate of Membership card payload — per-`accountId`, NOT per-foundation.
 * The same payload is returned for every foundation under a given org because
 * the certificate represents the org's Linux Foundation parent membership, not
 * its sub-foundation tier (e.g., an org holding both AGL Platinum and TLF Gold
 * sees "Linux Foundation Gold Membership Certificate" on every foundation page).
 *
 * Spec 019-lfx-one-tlf-certificate-data (FR-011):
 * - Extended from spec 018's `{ downloadUrl }` to the 7-field shape below.
 * - Pre-formatted `title` and `subtitle` come directly from the dbt model
 *   (`ANALYTICS.PLATINUM_LFX_ONE.ORG_LENS_TLF_CERTIFICATE.{certificate_title,
 *   certificate_subtitle}`) so the UI is a pure data passthrough — no
 *   client-side derivation from per-foundation inputs.
 * - `downloadUrl` is the membership-agreement PDF URL (reused from spec 018's
 *   `bronze_fivetran_salesforce_b2b_opportunities.membership_doc_download_url`).
 *   v1 simplification: one URL serves both the Agreements card current-row
 *   View link and the Certificate card Download button.
 */
export interface OrgMembershipCertificateTemplate {
  /** Pre-formatted card title. E.g. "Linux Foundation Gold Membership Certificate". */
  title: string;
  /** Pre-formatted card subtitle. E.g. "Member since Jul 2011 · Issued to TOYOTA MOTOR CORPORATION". */
  subtitle: string;
  /** Verbatim membership tier including " Membership" suffix. E.g. "Gold Membership". */
  membershipTier: string;
  /** Verbatim Salesforce account name. */
  issuedTo: string;
  /** Pre-formatted "Mon YYYY" date string. E.g. "Jul 2011". */
  memberSinceFormatted: string;
  /** ISO YYYY-MM-DD date string for downstream re-formatting if needed. */
  memberSinceDate: string;
  /** Membership-agreement PDF URL. NULL when the upstream Opportunity has no URL recorded. */
  downloadUrl: string | null;
}

/**
 * Response envelope for `GET /api/orgs/:accountId/lens/memberships/:foundationId/documents`.
 *
 * Spec 019 FR-012: `certificateTemplate` widened to `... | null`. `null` means
 * either (a) the org has no active TLF Corporate Membership (legitimate non-TLF
 * member) OR (b) the cert query degraded silently per FR-010a (Promise.allSettled
 * rejected only the cert query while agreements succeeded). In both cases the UI
 * hides the Certificate card via `@if (certificateTemplate(); as cert)`.
 */
export interface OrgMembershipDocumentsResponse {
  accountId: string;
  foundationId: string;
  agreements: OrgMembershipAgreement[];
  certificateTemplate: OrgMembershipCertificateTemplate | null;
}
