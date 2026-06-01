// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Internal (server-only) shapes for the Org People → Key Contacts tab BFF.
 * Mirrors the precedent in `org-key-contacts.internal.interface.ts` (membership-detail
 * surface owned by spec 024) — fields are intentionally optional because query-service
 * search hits can omit any field that wasn't indexed for a given row.
 */

/** Indexed `key_contact.data` shape on query-service — only the fields the org-wide read consumes. */
export interface KeyContactIndexedDoc {
  uid?: string;
  membership_uid?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  title?: string | null;
  role?: string;
  status?: string | null;
}

/** Indexed `project_membership.data` shape on query-service — only the fields the org-wide read consumes. */
export interface ProjectMembershipIndexedDoc {
  uid?: string;
  project_slug?: string;
  project_name?: string | null;
  status?: string;
}
