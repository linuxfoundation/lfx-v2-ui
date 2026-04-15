// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { MarketingKeyInsight, MarketingRecommendedAction } from '../interfaces/analytics-data.interface';

export interface MarketingSplitByPriority {
  attentionActions: MarketingRecommendedAction[];
  attentionInsights: MarketingKeyInsight[];
  performingActions: MarketingRecommendedAction[];
  performingInsights: MarketingKeyInsight[];
}

export function splitByPriority(actions: MarketingRecommendedAction[], insights: MarketingKeyInsight[]): MarketingSplitByPriority {
  return {
    attentionActions: actions.filter((a) => a.priority === 'high' || a.priority === 'medium'),
    attentionInsights: insights.filter((i) => i.type === 'warning'),
    performingActions: actions.filter((a) => a.priority === 'low'),
    performingInsights: insights.filter((i) => i.type === 'driver' || i.type === 'info'),
  };
}
