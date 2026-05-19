// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { TLF_INDIVIDUAL_SUPPORTER } from '@lfx-one/shared/constants';
import { EnrollmentMembership, IndividualEnrollment } from '@lfx-one/shared/interfaces';
import { Request } from 'express';

import { getApiGatewayBaseUrl } from '../helpers/api-gateway.helper';
import { getUsernameFromAuth } from '../utils/auth-helper';
import { logger } from './logger.service';

const DEMO_USER = 'johnlf2727';

const DEMO_ENROLLMENTS: IndividualEnrollment[] = [
  {
    ...TLF_INDIVIDUAL_SUPPORTER,
    membership: {
      Status: 'Expired',
      AutoRenew: false,
      PurchaseDate: '2020-06-09',
      EndDate: '2021-06-09',
      Price: 0,
      ID: '02i2M00000QTirbQAD',
      ExtPaymentType: '836366',
    },
  },
];

export class EnrollmentService {
  public async getIndividualEnrollments(req: Request): Promise<IndividualEnrollment[]> {
    const username = await getUsernameFromAuth(req);

    if (username === DEMO_USER) {
      logger.debug(req, 'get_individual_enrollments', 'Returning demo data for test user');
      return DEMO_ENROLLMENTS;
    }

    const baseUrl = getApiGatewayBaseUrl('get_individual_enrollments', 'member-service');
    const url = `${baseUrl}/member-service/v2/me/memberships?productID=${TLF_INDIVIDUAL_SUPPORTER.productId}&status=Purchased,Active,Expired&membershipType=Individual`;

    logger.debug(req, 'get_individual_enrollments', 'Fetching individual memberships from member-service');

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${req.bearerToken}` },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`member-service returned ${response.status}: ${body}`);
    }

    const data = await response.json();
    const rawMemberships: any[] = data?.Data ?? data?.data ?? [];

    const membershipMap = new Map<string, EnrollmentMembership>();
    for (const m of rawMemberships) {
      const productId = m.Product?.ID;
      if (!productId) continue;
      const existing = membershipMap.get(productId);
      if (!existing || new Date(existing.PurchaseDate) < new Date(m.PurchaseDate)) {
        membershipMap.set(productId, {
          Status: m.Status,
          AutoRenew: m.AutoRenew ?? false,
          PurchaseDate: m.PurchaseDate,
          EndDate: m.EndDate,
          Price: m.Price,
          ID: m.ID,
          ExtPaymentType: m.ExtPaymentID ? m.ExtPaymentID.split(':')[0] : '',
        });
      }
    }

    logger.debug(req, 'get_individual_enrollments', 'Fetched individual memberships', { count: rawMemberships.length });

    return [
      {
        ...TLF_INDIVIDUAL_SUPPORTER,
        membership: membershipMap.get(TLF_INDIVIDUAL_SUPPORTER.productId) ?? null,
      },
    ];
  }
}
