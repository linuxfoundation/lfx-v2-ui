// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

export enum MeetingVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  RESTRICTED = 'restricted',
}

export interface Meeting {
  id: string;
  created_at: string;
  project_id: number;
  visibility: MeetingVisibility | null;
  youtube_enabled: boolean | null;
  zoom_ai_enabled: boolean | null;
  recording_enabled: boolean | null;
  transcripts_enabled: boolean | null;
  timezone: string | null;
  meeting_type: string | null;
  recording_access: string | null;
  recurrence: Record<string, any> | null;
  topic: string | null;
  agenda: string | null;
  start_time: string | null;
  end_time: string | null;
  duration: number | null;
  status: string | null;
}
