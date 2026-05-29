// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// ─── Org Training page constants ───────────────────────────────────────────

export const DEFAULT_ORG_TRAINING_TAB_ID = 'certifications' as const;

export const VALID_ORG_TRAINING_TAB_IDS = new Set(['certifications', 'trainings']);

export const ORG_TRAINING_TABS = [
  { id: 'certifications' as const, label: 'Certifications', icon: 'fa-light fa-award' },
  { id: 'trainings' as const, label: 'Trainings', icon: 'fa-light fa-book-open' },
];

export const ORG_TRAINING_LEVEL_OPTIONS = [
  { label: 'All Levels', value: null },
  { label: 'Beginner', value: 'BEGINNER' },
  { label: 'Intermediate', value: 'INTERMEDIATE' },
  { label: 'Advanced', value: 'ADVANCED' },
];

// ─── Me-lens training constants ────────────────────────────────────────────

export const TRAINING_PRODUCT_TYPE = 'Training' as const;
export const CERTIFICATION_PRODUCT_TYPE = 'Certification' as const;
export type ProductType = typeof TRAINING_PRODUCT_TYPE | typeof CERTIFICATION_PRODUCT_TYPE;

export const CONTINUE_LEARNING_URL = 'https://trainingportal.linuxfoundation.org/learn/dashboard';
export const COURSE_URL_PREFIX = 'https://trainingportal.linuxfoundation.org/learn/course/';
export const ENROLL_AGAIN_URL = 'https://trainingportal.linuxfoundation.org/courses';
export const ENROLL_AGAIN_URL_PREFIX = 'https://trainingportal.linuxfoundation.org/courses/';
