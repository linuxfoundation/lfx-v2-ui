// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { CertificateRow, Certification, CertificationStatus } from '@lfx-one/shared/interfaces';
import { Request } from 'express';

import { logger } from './logger.service';
import { SnowflakeService } from './snowflake.service';

const CERTIFICATES_QUERY = `
  SELECT _KEY, CERTIFICATE_ID, COURSE_NAME, CODE, COURSE_DESCRIPTION,
         LOGO_URL, PROJECT_NAME, ISSUED_TS, EXPIRATION_DATE, DOWNLOAD_URL
  FROM ANALYTICS.PLATINUM_LFX_ONE.CERTIFICATES
  WHERE USER_NAME = ?
  ORDER BY ISSUED_TS DESC
`;

export class TrainingService {
  private readonly snowflakeService: SnowflakeService;

  public constructor() {
    this.snowflakeService = SnowflakeService.getInstance();
  }

  public async getCertifications(req: Request, username: string): Promise<Certification[]> {
    logger.debug(req, 'get_certifications', 'Fetching certifications from Snowflake', { username });

    let result: { rows: CertificateRow[] };

    try {
      result = await this.snowflakeService.execute<CertificateRow>(CERTIFICATES_QUERY, [username]);
    } catch (error) {
      logger.warning(req, 'get_certifications', 'Snowflake query failed, returning empty certifications', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }

    logger.debug(req, 'get_certifications', 'Fetched certifications', { count: result.rows.length });

    const certifications = result.rows.map((row) => this.mapRowToCertification(row));

    // TODO: Remove once ANALYTICS.PLATINUM_LFX_ONE.CERTIFICATES table is populated
    if (certifications.length === 0 && process.env['NODE_ENV'] !== 'production') {
      logger.debug(req, 'get_certifications', 'No certifications found, returning mock data (non-production)');
      return this.getMockCertifications();
    }

    return certifications;
  }

  private mapRowToCertification(row: CertificateRow): Certification {
    return {
      id: row._KEY,
      certificateId: row.CERTIFICATE_ID,
      name: row.COURSE_NAME,
      code: row.CODE ?? '',
      description: row.COURSE_DESCRIPTION ?? '',
      imageUrl: row.LOGO_URL ?? '',
      issuedBy: row.PROJECT_NAME ?? '',
      issuedDate: row.ISSUED_TS,
      expiryDate: row.EXPIRATION_DATE ?? null,
      status: this.deriveStatus(row.EXPIRATION_DATE),
      downloadUrl: row.DOWNLOAD_URL ?? null,
    };
  }

  private deriveStatus(expirationDate: string | null): CertificationStatus {
    if (!expirationDate) return 'active';
    return new Date(expirationDate) < new Date() ? 'expired' : 'active';
  }

  // TODO: Remove once ANALYTICS.PLATINUM_LFX_ONE.CERTIFICATES table is populated
  private getMockCertifications(): Certification[] {
    return [
      {
        id: 'mock-1',
        certificateId: 'LF-abc123def',
        name: 'Certified Kubernetes Administrator (CKA)',
        code: 'CKA',
        description: 'Earners of this designation demonstrated the skills, knowledge, and competencies to perform the responsibilities of a Kubernetes administrator.',
        imageUrl: 'https://training.linuxfoundation.org/wp-content/uploads/2024/11/CKA.svg',
        issuedBy: 'Cloud Native Computing Foundation',
        issuedDate: '2025-06-15T00:00:00Z',
        expiryDate: '2028-06-15T00:00:00Z',
        status: 'active',
        downloadUrl: 'https://example.com/cert/cka-mock.pdf',
      },
      {
        id: 'mock-2',
        certificateId: 'LF-xyz789ghi',
        name: 'Certified Kubernetes Application Developer (CKAD)',
        code: 'CKAD',
        description: 'Earners of this designation demonstrated the skills, knowledge, and competencies to perform the responsibilities of a Kubernetes application developer.',
        imageUrl: 'https://training.linuxfoundation.org/wp-content/uploads/2024/11/CKAD.svg',
        issuedBy: 'Cloud Native Computing Foundation',
        issuedDate: '2025-01-10T00:00:00Z',
        expiryDate: '2026-05-01T00:00:00Z',
        status: 'active',
        downloadUrl: null,
      },
      {
        id: 'mock-3',
        certificateId: 'LF-expired456',
        name: 'Linux Foundation Certified System Administrator (LFCS)',
        code: 'LFCS',
        description: 'Earners of this designation demonstrated the skills necessary to do basic to intermediate system administration from the command-line for Linux systems.',
        imageUrl: '',
        issuedBy: 'The Linux Foundation',
        issuedDate: '2023-03-20T00:00:00Z',
        expiryDate: '2025-03-20T00:00:00Z',
        status: 'expired',
        downloadUrl: 'https://example.com/cert/lfcs-mock.pdf',
      },
      {
        id: 'mock-4',
        certificateId: 'LF-perpetual789',
        name: 'Introduction to Kubernetes (LFS158)',
        code: 'LFS158',
        description: 'This course will teach you the basics of Kubernetes, a powerful container orchestration platform.',
        imageUrl: 'https://training.linuxfoundation.org/wp-content/uploads/2024/11/LFS158.svg',
        issuedBy: 'The Linux Foundation',
        issuedDate: '2024-11-05T00:00:00Z',
        expiryDate: null,
        status: 'active',
        downloadUrl: 'https://example.com/cert/lfs158-mock.pdf',
      },
    ];
  }
}
