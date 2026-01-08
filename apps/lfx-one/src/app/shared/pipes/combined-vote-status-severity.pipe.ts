// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Pipe, PipeTransform } from '@angular/core';
import { COMBINED_VOTE_STATUS_SEVERITY, PollStatus, VoteResponseStatus } from '@lfx-one/shared';
import { TagSeverity } from '@lfx-one/shared/interfaces';
import { UserVote } from '@lfx-one/shared/interfaces';

type CombinedVoteStatus = 'open' | 'submitted' | 'closed';

@Pipe({
  name: 'combinedVoteStatusSeverity',
})
export class CombinedVoteStatusSeverityPipe implements PipeTransform {
  public transform(vote: UserVote): TagSeverity {
    const status = this.getCombinedStatus(vote);
    return COMBINED_VOTE_STATUS_SEVERITY[status];
  }

  private getCombinedStatus(vote: UserVote): CombinedVoteStatus {
    if (vote.poll_status === PollStatus.ENDED) {
      return 'closed';
    }

    if (vote.poll_status === PollStatus.ACTIVE) {
      return vote.vote_status === VoteResponseStatus.RESPONDED ? 'submitted' : 'open';
    }

    return 'closed';
  }
}
