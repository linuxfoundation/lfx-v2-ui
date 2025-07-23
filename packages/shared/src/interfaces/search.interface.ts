// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

export interface ProjectSearchResult {
  project_id: string;
  project_name: string;
  project_slug: string;
  project_description: string;
  status: string;
  logo: string;
  meetings_count: number;
  mailing_list_count: number;
  project_search_vector?: any;
  committee_names?: string[];
  meeting_topics?: string[];
  combined_search_vector?: any;
}

export interface ProjectSearchParams {
  query: string;
  limit?: number;
  offset?: number;
}
