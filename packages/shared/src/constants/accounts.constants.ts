// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { Account } from '../interfaces/account.interface';

export const ACCOUNT_COOKIE_KEY = 'lfx-selected-account';

const IBM_FAMILY: Account[] = [
  { accountId: '0014100000kgVoqAAE', accountName: 'International Business Machines Corporation', accountSlug: 'ibm' },
  { accountId: '0014100000TdzYmAAJ', accountName: 'Apptio', accountSlug: 'apptio' },
  { accountId: '0012M00002ZLGHsQAP', accountName: 'IBM Watson Health', accountSlug: 'ibm-watson-health' },
  { accountId: '0012M000027Enn8QAC', accountName: 'Nordcloud, an IBM Company', accountSlug: 'nordcloud' },
  { accountId: '0014100000Te2QjAAJ', accountName: 'Red Hat, Inc.', accountSlug: 'red-hat' },
  { accountId: '0012M00002F2mObQAJ', accountName: 'Stackwatch Inc', accountSlug: 'stackwatch' },
  { accountId: '0014100000Te2qeAAB', accountName: 'Turbonomic, an IBM Company', accountSlug: 'turbonomic' },
];

/**
 * Available accounts for board member dashboard
 * @description Predefined list of organizations with their account IDs
 */
export const ACCOUNTS: Account[] = [
  { accountId: '0012M00002kMtLDQA0', accountName: 'Axcelis Technologies' },
  { accountId: '0014100000TdzqcAAB', accountName: 'Credit Suisse' },
  { accountId: '0012M00002GDRWBQA5', accountName: 'Ericsson Software Technology' },
  { accountId: '0014100000TdzJHAAZ', accountName: 'Fujitsu Limited' },
  { accountId: '0014100000TdzJQAAZ', accountName: 'GitLab Inc.' },
  { accountId: '0014100000Te02DAAR', accountName: 'Google LLC' },
  { accountId: '0014100000TdzABAAZ', accountName: 'Huawei Technologies Co., Ltd' },
  { accountId: '0014100000TdzA7AAJ', accountName: 'Intel Corporation' },
  ...IBM_FAMILY.filter((acc) => acc.accountId !== '0014100000Te2QjAAJ'),
  { accountId: '0014100000TdzwSAAR', accountName: 'Meta Platforms, Inc.' },
  { accountId: '0014100000Te0OKAAZ', accountName: 'Microsoft Corporation' },
  { accountId: '0014100000Te0QfAAJ', accountName: 'NEC Corporation' },
  { accountId: '0014100000Te2MfAAJ', accountName: 'Oracle America Inc.' },
  { accountId: 'lflowfQUSzqglPDJtp', accountName: 'Panasonic Corporation' },
  { accountId: '0014100000Te2PpAAJ', accountName: 'Qualcomm, Inc.' },
  {
    accountId: '0014100000Te2QjAAJ',
    accountName: 'Red Hat, Inc.',
    accountSlug: 'red-hat',
    membershipTier: 'Platinum Member',
    accountsRelated: IBM_FAMILY,
  },
  { accountId: '0012M00002KB7YYQA1', accountName: 'Redpoint Ventures' },
  { accountId: '0014100000Te0bvAAB', accountName: 'Renesas Electronics Corporation' },
  { accountId: '0014100000Te0dPAAR', accountName: 'Samsung Electronics Co. Ltd.' },
  { accountId: '0014100000Te0jpAAB', accountName: 'Sony Group Corporation' },
  { accountId: '0014100000Te2ovAAB', accountName: 'The Linux Foundation' },
  {
    accountId: '0012M00002ND5yOQAT',
    accountName: 'Toyota Motor Corporation',
    accountSlug: 'toyota-motor-corporation',
    membershipTier: 'Gold Member',
    accountsRelated: [],
  },
];

/**
 * Default account for board member dashboard
 * @description The Linux Foundation is used as the default selection
 */
export const DEFAULT_ACCOUNT: Account = {
  accountId: '0014100000Te2ovAAB',
  accountName: 'The Linux Foundation',
};
