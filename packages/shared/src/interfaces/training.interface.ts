// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Certification status derived from expiration date
 */
export type CertificationStatus = 'active' | 'expired';

/**
 * A Linux Foundation certification earned by the user
 */
export interface Certification {
  /** Unique record identifier (_KEY) */
  id: string;
  /** Certificate identifier (from IDENTIFIER column) */
  certificateId: string;
  /** Full certification/course name */
  name: string;
  /** Description of what the certification covers */
  description: string;
  /** Certification seal/logo image URL */
  imageUrl: string;
  /** Issuing project name */
  issuedBy: string;
  /** ISO date string for when the certification was issued */
  issuedDate: string;
  /** ISO date string for expiry; null means no expiry (perpetual) */
  expiryDate: string | null;
  /** Current certification status, derived from expiryDate */
  status: CertificationStatus;
  /** URL to download the certificate; null if unavailable */
  downloadUrl: string | null;
  /** Difficulty level (e.g. Beginner, Intermediate, Advanced) */
  level: string;
}

/**
 * Snowflake row shape for ANALYTICS.PLATINUM_LFX_ONE.USER_CERTIFICATES
 */
export interface CertificateRow {
  _KEY: string;
  IDENTIFIER: string;
  COURSE_NAME: string;
  COURSE_GROUP_DESCRIPTION: string;
  LOGO_URL: string;
  PROJECT_NAME: string;
  ISSUED_TS: string;
  EXPIRATION_DATE: string | null;
  DOWNLOAD_URL: string | null;
  LEVEL: string;
}

/**
 * Snowflake row shape for ANALYTICS.PLATINUM_LFX_ONE.USER_COURSE_ENROLLMENTS
 */
export interface EnrollmentRow {
  ENROLLMENT_ID: string;
  ENROLLMENT_TS: string;
  LOGO_URL: string | null;
  COURSE_NAME: string;
  COURSE_GROUP_DESCRIPTION: string | null;
  PROJECT_NAME: string | null;
  LEVEL: string | null;
  COURSE_SLUG: string | null;
}

/**
 * A training course the user is currently enrolled in
 */
export interface TrainingEnrollment {
  /** ENROLLMENT_ID */
  id: string;
  /** COURSE_NAME */
  name: string;
  /** COURSE_GROUP_DESCRIPTION */
  description: string;
  /** LOGO_URL */
  imageUrl: string;
  /** PROJECT_NAME */
  issuedBy: string;
  /** ENROLLMENT_TS (ISO string) */
  enrolledDate: string;
  /** Difficulty level (e.g. Beginner, Intermediate, Advanced) */
  level: string;
  /** URL slug for the specific course page; null if unavailable */
  courseSlug: string | null;
}

/**
 * A redeemable discount coupon issued via the LFX rewards system
 */
export interface RewardCoupon {
  /** Unique coupon identifier */
  id: string;
  /** Coupon code string (e.g., "LFX-CKA-20") */
  code: string;
  /** Short heading for the coupon (e.g., "20% Off CKA Exam") */
  title: string;
  /** Human-readable description of what the coupon applies to */
  description: string;
  /** ISO date string for when the coupon expires */
  expiryDate: string;
}

/**
 * An active reward incentive the user can work toward
 */
export interface RewardIncentive {
  /** Unique incentive identifier */
  id: string;
  /** Font Awesome icon class (e.g., "fa-light fa-star") */
  icon: string;
  /** Incentive title (e.g., "Course Completion Bonus") */
  title: string;
  /** Short description of how to earn it */
  description: string;
  /** What the user earns (e.g., "500 Points", "Free Retake Voucher") */
  rewardLabel: string;
  /** Numeric progress toward completion; null if not applicable */
  progress: { current: number; total: number } | null;
  /** Status label shown when no numeric progress (e.g., "Pending") */
  statusLabel: string | null;
}

/**
 * Aggregated rewards data for the current user
 */
export interface RewardsData {
  /** Total accumulated reward points */
  points: number;
  /** Points threshold for the next reward milestone */
  nextRewardPoints: number;
  /** Available redeemable coupons */
  coupons: RewardCoupon[];
  /** Active incentives the user is working toward */
  incentives: RewardIncentive[];
}
