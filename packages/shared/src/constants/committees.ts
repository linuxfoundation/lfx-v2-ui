// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

export const COMMITTEE_CATEGORIES = [
  { label: 'Legal Committee', value: 'Legal Committee' },
  { label: 'Finance Committee', value: 'Finance Committee' },
  { label: 'Special Interest Group', value: 'Special Interest Group' },
  { label: 'Board', value: 'Board' },
  { label: 'Technical Oversight Committee/Technical Advisory Committee', value: 'Technical Oversight Committee/Technical Advisory Committee' },
  { label: 'Technical Steering Committee', value: 'Technical Steering Committee' },
  { label: 'Marketing Oversight Committee/Marketing Advisory Committee', value: 'Marketing Oversight Committee/Marketing Advisory Committee' },
  { label: 'Marketing Committee/Sub Committee', value: 'Marketing Committee/Sub Committee' },
  { label: 'Code of Conduct', value: 'Code of Conduct' },
  { label: 'Product Security', value: 'Product Security' },
  { label: 'Technical Mailing List', value: 'Technical Mailing List' },
  { label: 'Marketing Mailing List', value: 'Marketing Mailing List' },
  { label: 'Working Group', value: 'Working Group' },
  { label: 'Committers', value: 'Committers' },
  { label: 'Maintainers', value: 'Maintainers' },
  { label: 'Ambassador', value: 'Ambassador' },
  { label: 'Government Advisory Council', value: 'Government Advisory Council' },
  { label: 'Expert Group', value: 'Expert Group' },
  { label: 'Other', value: 'Other' },
];

export const MEMBER_ROLES = [
  { label: 'Chair', value: 'Chair' },
  { label: 'Counsel', value: 'Counsel' },
  { label: 'Developer Seat', value: 'Developer Seat' },
  { label: 'TAC/TOC Representative', value: 'TAC/TOC Representative' },
  { label: 'Director', value: 'Director' },
  { label: 'Lead', value: 'Lead' },
  { label: 'None', value: 'None' },
  { label: 'Secretary', value: 'Secretary' },
  { label: 'Treasurer', value: 'Treasurer' },
  { label: 'Vice Chair', value: 'Vice Chair' },
  { label: 'LF Staff', value: 'LF Staff' },
  { label: 'Technical Lead', value: 'Technical Lead' },
];

export const VOTING_STATUSES = [
  { label: 'Alternate Voting Rep', value: 'Alternate Voting Rep' },
  { label: 'Observer', value: 'Observer' },
  { label: 'Voting Rep', value: 'Voting Rep' },
  { label: 'Emeritus', value: 'Emeritus' },
];

/**
 * Committee type color mappings for consistent styling across the application
 * Colors match corresponding meeting types for consistency
 */
export const COMMITTEE_TYPE_COLORS = {
  Board: 'text-red-500', // Matches meeting type
  'Technical Steering Committee': 'text-purple-500', // Matches "Technical" meeting type
  Maintainers: 'text-blue-500', // Matches meeting type
  'Working Group': 'text-orange-700',
  'Special Interest Group': 'text-yellow-600',
  'Technical Oversight Committee/Technical Advisory Committee': 'text-purple-500', // Matches "Technical" meeting type
  'Legal Committee': 'text-amber-500', // Matches meeting type
} as const;

/**
 * Default color scheme for unknown committee types
 */
export const DEFAULT_COMMITTEE_TYPE_COLOR = 'text-gray-500';

/**
 * Get color class for a committee type
 */
export function getCommitteeTypeColor(type: string): string {
  return COMMITTEE_TYPE_COLORS[type as keyof typeof COMMITTEE_TYPE_COLORS] || DEFAULT_COMMITTEE_TYPE_COLOR;
}
