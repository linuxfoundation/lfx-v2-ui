// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { Account } from '../interfaces/account.interface';

export const ACCOUNT_COOKIE_KEY = 'lfx-selected-account';

const IBM_FAMILY: Account[] = [
  { accountId: '0014100000kgVoqAAE', accountName: 'International Business Machines Corporation', accountSlug: 'ibm', membershipTier: 'Platinum Member' },
  { accountId: '0014100000Te2QjAAJ', accountName: 'Red Hat, Inc.', accountSlug: 'red-hat', membershipTier: 'Platinum Member' },
  { accountId: '0014100000TdzYmAAJ', accountName: 'Apptio', accountSlug: 'apptio', membershipTier: 'Platinum Member' },
  { accountId: '0012M00002ZLGHsQAP', accountName: 'IBM Watson Health', accountSlug: 'ibm-watson-health', membershipTier: 'Platinum Member' },
  { accountId: '0012M000027Enn8QAC', accountName: 'Nordcloud, an IBM Company', accountSlug: 'nordcloud', membershipTier: 'Platinum Member' },
  { accountId: '0012M00002F2mObQAJ', accountName: 'Stackwatch Inc', accountSlug: 'stackwatch', membershipTier: 'Platinum Member' },
  { accountId: '0014100000Te2qeAAB', accountName: 'Turbonomic, an IBM Company', accountSlug: 'turbonomic', membershipTier: 'Platinum Member' },
];

for (const member of IBM_FAMILY) {
  member.accountsRelated = IBM_FAMILY;
}

const TOYOTA: Account = {
  accountId: '0012M00002ND5yOQAT',
  accountName: 'Toyota Motor Corporation',
  accountSlug: 'toyota-motor-corporation',
  membershipTier: 'Gold Member',
};

export const ACCOUNTS: Account[] = [TOYOTA, ...IBM_FAMILY];

export const DEFAULT_ACCOUNT: Account = IBM_FAMILY.find((account) => account.accountSlug === 'red-hat') ?? IBM_FAMILY[0];
