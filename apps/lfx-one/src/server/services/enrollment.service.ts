// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { IndividualEnrollment } from '@lfx-one/shared/interfaces';
import { Request } from 'express';

import { logger } from './logger.service';
import { MicroserviceProxyService } from './microservice-proxy.service';

export class EnrollmentService {
  private readonly microserviceProxy = new MicroserviceProxyService();

  public async getIndividualEnrollments(req: Request): Promise<IndividualEnrollment[]> {
    logger.debug(req, 'get_individual_enrollments', 'Fetching individual enrollments from myprofile');

    const enrollments = await this.microserviceProxy.proxyRequest<IndividualEnrollment[]>(
      req,
      'MYPROFILE_API',
      '/enrollment/individual-enrollment-data',
      'GET'
    );

    logger.debug(req, 'get_individual_enrollments', 'Fetched individual enrollments', { count: enrollments.length });

    return enrollments;
  }
}
