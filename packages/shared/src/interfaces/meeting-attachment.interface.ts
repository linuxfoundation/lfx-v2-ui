// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Meeting attachment entity with file metadata
 * @description Represents a file attached to a meeting with storage and tracking information
 */
export interface MeetingAttachment {
  /** Unique attachment identifier */
  uid: string;
  /** Meeting this attachment belongs to */
  meeting_uid: string;
  /** Attachment type: 'file' for uploaded files, 'link' for external URLs */
  type: 'file' | 'link';
  /** Attachment name */
  name: string;
  /** External link URL for link-type attachments */
  link?: string;
  /** File size in bytes */
  file_size?: number;
  /** MIME type of the file */
  mime_type?: string;
  /** Description of the attachment */
  description?: string;
  /** User ID who uploaded the file */
  uploaded_by?: string;
  /** Timestamp when attachment was created */
  created_at: string;
  /** Timestamp when attachment was last updated */
  updated_at?: string;
}

/**
 * Data required to create a meeting attachment
 * @description Input payload for attaching files to meetings
 */
export interface CreateMeetingAttachmentRequest {
  /** Meeting ID to attach file to */
  meeting_id: string;
  /** Original filename */
  file_name: string;
  /** Storage URL for the uploaded file */
  file_url: string;
  /** File size in bytes */
  file_size?: number;
  /** MIME type of the file */
  mime_type?: string;
  /** User ID uploading the file */
  uploaded_by?: string;
}

/**
 * Temporary attachment during upload process
 * @description Represents an attachment being uploaded with status tracking
 */
export interface PendingAttachment {
  /** Temporary identifier for the pending attachment */
  id: string;
  /** Original filename */
  fileName: string;
  /** The actual File object to be uploaded */
  file: File;
  /** File size in bytes */
  fileSize: number;
  /** MIME type of the file */
  mimeType: string;
  /** Whether upload is currently in progress */
  uploading?: boolean;
  /** Whether upload completed successfully */
  uploaded?: boolean;
  /** Error message if upload failed */
  uploadError?: string;
}
