// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommitteeMemberVisibility } from '../enums/committee.enum';
import { CommitteeMemberVotingStatus } from '../enums/committee-member.enum';

/**
 * Lightweight committee reference for cross-module use
 * @description Minimal committee data with voting status eligibility
 */
export interface CommitteeReference {
  /** Committee UID */
  uid: string;
  /** Committee display name */
  name?: string;
  /** Allowed voting statuses: Voting Rep, Alternate Voting Rep, Observer, Emeritus, None */
  allowed_voting_statuses?: CommitteeMemberVotingStatus[];
}

/**
 * Committee entity with complete details
 * @description Represents a committee/working group within a project with full metadata
 */
export interface Committee {
  /** Unique identifier for the committee */
  uid: string;
  /** Committee name */
  name: string;
  /** Display name for UI presentation (optional override) */
  display_name?: string;
  /** Write access permission for current user (response only) */
  writer?: boolean;
  /** Committee category/type (e.g., "Technical", "Legal", "Board") */
  category: string;
  /** Optional description of the committee's purpose */
  description?: string;
  /** UID of parent committee for hierarchical structures */
  parent_uid?: string;
  /** Whether voting functionality is enabled for this committee */
  enable_voting: boolean;
  /** Whether the committee is publicly visible */
  public: boolean;
  /** Whether SSO group integration is enabled */
  sso_group_enabled: boolean;
  /** Associated SSO group name for membership sync */
  sso_group_name?: string;
  /** Committee website URL */
  website?: string;
  /** Whether committee membership requires review */
  requires_review?: boolean;
  /** Timestamp when committee was created */
  created_at: string;
  /** Timestamp when committee was last updated */
  updated_at: string;
  /** Total number of committee members */
  total_members: number;
  /** Total number of voting representatives */
  total_voting_reps: number;
  /** Associated project UID */
  project_uid: string;
  /** Associated project name (populated from project data) */
  project_name?: string;
  /** Foundation name this committee belongs to (populated from project hierarchy) */
  foundation_name?: string;
  /** Calendar visibility settings */
  calendar?: {
    /** Whether committee calendar is public */
    public: boolean;
  };
  /** Whether business email is required for membership (from settings) */
  business_email_required?: boolean;
  /** Whether audit logging is enabled (from settings) */
  is_audit_enabled?: boolean;
  /** Member profile visibility setting */
  member_visibility?: CommitteeMemberVisibility;
  /** Whether to show meeting attendees by default */
  show_meeting_attendees?: boolean;
  /** Whether users can join the committee directly */
  joinable?: boolean;
  /** Committee mailing list information */
  mailing_list?: GroupMailingList;
  /** Committee chat channel information (Slack/Discord) */
  chat_channel?: GroupChatChannel;
  /** Committee chair leadership */
  chair?: CommitteeLeader;
  /** Committee co-chair leadership */
  co_chair?: CommitteeLeader;
}

/**
 * Mailing list associated with a committee
 */
export interface GroupMailingList {
  name: string;
  url?: string;
  subscriber_count?: number;
}

/**
 * Chat channel associated with a committee (Slack/Discord)
 */
export interface GroupChatChannel {
  platform: 'slack' | 'discord';
  name: string;
  url?: string;
}

/**
 * Committee leadership position (Chair/Co-Chair)
 */
export interface CommitteeLeader {
  first_name?: string;
  last_name?: string;
  organization?: string;
  elected_date?: string;
}

/**
 * Data required to create a new committee
 * @description Input payload for committee creation API
 */
export interface CommitteeCreateData {
  /** Committee name (required) */
  name: string;
  /** Committee category (required) */
  category: string;
  /** Optional committee description */
  description?: string;
  /** Parent committee UID for hierarchical structure */
  parent_uid?: string;
  /** Require business email for membership */
  business_email_required?: boolean;
  /** Enable voting functionality */
  enable_voting?: boolean;
  /** Enable audit logging */
  is_audit_enabled?: boolean;
  /** Make committee publicly visible */
  public?: boolean;
  /** Display name override */
  display_name?: string;
  /** Enable SSO group integration */
  sso_group_enabled?: boolean;
  /** SSO group name for membership sync */
  sso_group_name?: string;
  /** Committee website URL */
  website?: string;
  /** Associated project UID */
  project_uid?: string;
  /** Whether committee is open for self-joining */
  joinable?: boolean;
  /** Member profile visibility setting */
  member_visibility?: CommitteeMemberVisibility;
  /** Whether to show meeting attendees by default */
  show_meeting_attendees?: boolean;
}

/**
 * Data for updating existing committee
 * @description Partial update payload allowing any field from create data to be modified
 */
export interface CommitteeUpdateData extends Partial<CommitteeCreateData> {}

/**
 * Committee settings update data
 * @description Specific settings that can be updated independently
 */
export interface CommitteeSettingsData {
  /** Update business email requirement */
  business_email_required?: boolean;
  /** Update audit logging setting */
  is_audit_enabled?: boolean;
  /** Update member profile visibility setting */
  member_visibility?: CommitteeMemberVisibility;
  /** Update show meeting attendees setting */
  show_meeting_attendees?: boolean;
}

// ── Committee Dashboard Data Types ─────────────────────────────────────

/** Vote status */
export type CommitteeVoteStatus = 'open' | 'closed' | 'cancelled';

/** An open or recent vote associated with a committee */
export interface CommitteeVote {
  uid: string;
  title: string;
  status: CommitteeVoteStatus;
  deadline: string;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  totalEligible: number;
  created_by: string;
}

/** A single budget category line item */
export interface CommitteeBudgetCategory {
  name: string;
  allocated: number;
  spent: number;
}

/** Budget summary for a governing board's fiscal year */
export interface CommitteeBudgetSummary {
  fiscal_year: string;
  total_budget: number;
  spent: number;
  committed: number;
  remaining: number;
  categories: CommitteeBudgetCategory[];
}

/** A passed/failed resolution from a governing or oversight committee */
export interface CommitteeResolution {
  uid: string;
  title: string;
  date: string;
  result: string;
  votesFor: number;
  votesAgainst: number;
}

/** Activity type for collaboration-class groups */
export type CommitteeActivityType = 'pr_merged' | 'issue_opened' | 'release' | 'discussion' | 'comment' | 'review';

/** A recent activity event shown in working-group / oversight-committee dashboards */
export interface CommitteeActivity {
  uid: string;
  type: CommitteeActivityType;
  title: string;
  author: string;
  repo: string;
  timestamp: string;
  icon: string;
  color: string;
}

/** A top contributor shown in working-group / oversight-committee dashboards */
export interface CommitteeContributor {
  name: string;
  commits: number;
  prs: number;
  reviews: number;
  org: string;
}

/** Status of a working-group deliverable */
export type CommitteeDeliverableStatus = 'not-started' | 'in-progress' | 'completed' | 'blocked';

/** A deliverable / milestone tracked by a working group */
export interface CommitteeDeliverable {
  uid: string;
  title: string;
  status: CommitteeDeliverableStatus;
  progress: number;
  owner: string;
  dueDate: string;
}

/** A discussion thread in a special-interest-group dashboard */
export interface CommitteeDiscussionThread {
  uid: string;
  title: string;
  author: string;
  replies: number;
  lastActivity: string;
  tags: string[];
}

/** Format of a committee-hosted event */
export type CommitteeEventType = 'Webinar' | 'In-Person' | 'Virtual' | 'Hybrid';

/** An upcoming event shown in a special-interest-group dashboard */
export interface CommitteeEvent {
  uid: string;
  title: string;
  type: CommitteeEventType;
  date: string;
  speaker: string;
  attendees: number;
}

/** Status of an ambassador outreach campaign */
export type CommitteeCampaignStatus = 'active' | 'upcoming' | 'ended' | 'paused';

/** An outreach campaign shown in an ambassador-program dashboard */
export interface CommitteeOutreachCampaign {
  uid: string;
  title: string;
  status: CommitteeCampaignStatus;
  reach: number;
  conversions: number;
  conversionRate: number;
  icon: string;
  color: string;
}

/** Aggregate engagement metrics for an ambassador-program dashboard */
export interface CommitteeEngagementMetrics {
  totalReach: number;
  newMembers30d: number;
  eventAttendance: number;
  newsletterOpenRate: number;
  socialImpressions: number;
  ambassadorCount: number;
}

/** Type of a committee document entry */
export type CommitteeDocumentType = 'file' | 'link';

/** A document or resource link associated with a committee */
export interface CommitteeDocument {
  uid: string;
  type: CommitteeDocumentType;
  name: string;
  url?: string;
  mime_type?: string;
  file_size?: number;
  updated_at?: string;
  uploaded_by?: string;
}
