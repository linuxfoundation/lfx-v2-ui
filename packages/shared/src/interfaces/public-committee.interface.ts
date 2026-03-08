// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Public-safe committee member representation.
 * Strips emails, internal IDs, and other private fields.
 */
export interface PublicCommitteeMember {
  name: string;
  organization?: string;
  role?: string;
}

/**
 * Public-safe meeting schedule information.
 */
export interface PublicCommitteeMeeting {
  time: string;
  timezone: string;
  duration: number;
  recurrence?: string;
  video_link?: string;
}

/**
 * External links associated with a committee.
 */
export interface PublicCommitteeLinks {
  website?: string;
  mailing_list_url?: string;
  chat_channel_url?: string;
}

/**
 * Public-safe committee representation for unauthenticated consumers.
 * Used by foundation websites and external integrations.
 */
export interface PublicCommitteeMailingList {
  name: string;
  url?: string;
}

export interface PublicCommitteeChatChannel {
  platform: string;
  name: string;
  url?: string;
}

/**
 * Public-safe committee representation for unauthenticated consumers.
 * Used by foundation websites and external integrations.
 */
export interface PublicCommittee {
  uid: string;
  name: string;
  display_name?: string;
  description?: string;
  category: string;
  public: boolean;
  enable_voting: boolean;
  project_name?: string;
  foundation_name?: string;
  chairs: PublicCommitteeMember[];
  members: PublicCommitteeMember[];
  total_members: number;
  mailing_list?: PublicCommitteeMailingList;
  chat_channel?: PublicCommitteeChatChannel;
  meeting_schedule?: PublicCommitteeMeeting;
  external_links: PublicCommitteeLinks;
}
