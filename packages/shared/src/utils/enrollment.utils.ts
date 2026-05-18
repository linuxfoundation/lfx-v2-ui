// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { EnrollmentDisplayStatus, IndividualEnrollment } from '../interfaces/enrollment.interface';

// Status derivation mirrors enrollment.plugin.js:197–226 from myprofile
export function deriveEnrollmentStatus(item: IndividualEnrollment): EnrollmentDisplayStatus {
  const { membership, price } = item;
  if (!membership) return 'Not Enrolled';
  if (!price) return 'Active';
  if (membership.Status === 'Expired') return 'Expired';
  if (membership.AutoRenew && membership.ExtPaymentType === 'stripe') return 'Active';
  const endDate = new Date(membership.EndDate);
  const now = new Date();
  if (endDate < now) return 'Expired';
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (endDate < thirtyDaysFromNow) return 'Expiring Soon';
  return 'Active';
}

export function enrollmentStatusSeverity(status: EnrollmentDisplayStatus): 'success' | 'warn' | 'danger' | 'secondary' {
  switch (status) {
    case 'Active':
      return 'success';
    case 'Expiring Soon':
      return 'warn';
    case 'Expired':
      return 'danger';
    default:
      return 'secondary';
  }
}
