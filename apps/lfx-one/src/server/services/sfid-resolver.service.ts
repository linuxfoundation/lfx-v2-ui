// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ORG_SFID_LOOKUP_NATS_SUBJECT, ORG_SFID_LOOKUP_NATS_TIMEOUT_MS, SALESFORCE_ID_SUFFIX_CHARS } from '@lfx-one/shared/constants';
import { UuidToSfidNatsResponse } from '@lfx-one/shared/interfaces';

import { logger } from './logger.service';
import { NatsService } from './nats.service';

/** Append the standard 3-char case-encoding suffix to produce the portable 18-char Salesforce ID. */
function sfid15To18(id15: string): string {
  if (id15.length !== 15) return id15;
  let result = id15;
  for (let group = 0; group < 3; group++) {
    let bits = 0;
    for (let j = 0; j < 5; j++) {
      const ch = id15.charCodeAt(group * 5 + j);
      if (ch >= 65 && ch <= 90) bits |= 1 << j;
    }
    result += SALESFORCE_ID_SUFFIX_CHARS[bits];
  }
  return result;
}

/** Resolves UUID v8 org uids to 18-char Salesforce IDs via the member-service NATS RPC `lfx.member.uuid-to-sfid.lookup`. */
export class SfidResolverService {
  private readonly natsService: NatsService;

  public constructor() {
    this.natsService = new NatsService();
  }

  /** Resolve a single uid to its 18-char sfid via NATS RPC. Returns null on failure. */
  public async resolve(uid: string): Promise<string | null> {
    return this.resolveViaNats(uid);
  }

  /** Resolve a batch of uids in parallel via NATS RPC. */
  public async resolveBatch(uids: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    if (uids.length === 0) return results;

    const settled = await Promise.allSettled(uids.map(async (uid) => ({ uid, sfid: await this.resolveViaNats(uid) })));

    for (const entry of settled) {
      if (entry.status === 'fulfilled' && entry.value.sfid) {
        results.set(entry.value.uid, entry.value.sfid);
      }
    }

    return results;
  }

  private async resolveViaNats(uid: string): Promise<string | null> {
    try {
      const codec = this.natsService.getCodec();
      const payload = JSON.stringify({ uuid: uid });
      const response = await this.natsService.request(ORG_SFID_LOOKUP_NATS_SUBJECT, codec.encode(payload), {
        timeout: ORG_SFID_LOOKUP_NATS_TIMEOUT_MS,
      });
      const decoded = codec.decode(response.data);
      const parsed: UuidToSfidNatsResponse = JSON.parse(decoded);

      if (parsed.error || !parsed.sfid) {
        return null;
      }

      return sfid15To18(parsed.sfid);
    } catch (error) {
      logger.debug(undefined, 'sfid_resolver', 'NATS uuid-to-sfid lookup failed', {
        uid,
        err: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}
