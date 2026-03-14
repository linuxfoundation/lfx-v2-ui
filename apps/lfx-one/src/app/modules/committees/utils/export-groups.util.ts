// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Committee } from '@lfx-one/shared/interfaces';

const CSV_HEADERS = ['Group Name', 'Category', 'Visibility', 'Join Mode', 'Members Count', 'Voting Enabled', 'Created Date', 'Updated Date'];

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDate(isoDate: string | undefined): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatJoinMode(joinMode: string | undefined): string {
  switch (joinMode) {
    case 'open':
      return 'Open';
    case 'invite_only':
      return 'Invite Only';
    case 'application':
      return 'Application';
    case 'closed':
      return 'Closed';
    default:
      return '';
  }
}

function committeeToRow(committee: Committee): string {
  const fields = [
    committee.name || '',
    committee.category || '',
    committee.public ? 'Public' : 'Private',
    formatJoinMode(committee.join_mode),
    String(committee.total_members ?? 0),
    committee.enable_voting ? 'Yes' : 'No',
    formatDate(committee.created_at),
    formatDate(committee.updated_at),
  ];
  return fields.map(escapeCsvField).join(',');
}

/**
 * Exports the given committees array as a CSV file download.
 * Includes UTF-8 BOM for Excel compatibility.
 */
export function exportGroupsToCsv(groups: Committee[]): void {
  const headerRow = CSV_HEADERS.join(',');
  const dataRows = groups.map(committeeToRow);
  const csvContent = [headerRow, ...dataRows].join('\n');

  // UTF-8 BOM for Excel compatibility
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'groups-export.csv';
  link.click();
  URL.revokeObjectURL(url);
}
