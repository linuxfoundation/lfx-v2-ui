// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import {
  BatchRegistrantOperationResponse,
  CreateMeetingRegistrantRequest,
  CreateMeetingRequest,
  GenerateAgendaRequest,
  GenerateAgendaResponse,
  Meeting,
  MeetingAttachment,
  MeetingJoinURL,
  MeetingRegistrant,
  MeetingRegistrantWithState,
  PastMeeting,
  PastMeetingParticipant,
  PastMeetingRecording,
  PastMeetingSummary,
  Project,
  QueryServiceCountResponse,
  UpdateMeetingRegistrantRequest,
  UpdateMeetingRequest,
  UploadFileResponse,
} from '@lfx-one/shared/interfaces';
import { catchError, defer, Observable, of, map, switchMap, take, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MeetingService {
  public meeting: WritableSignal<Meeting | null> = signal(null);

  private readonly http = inject(HttpClient);

  public getMeetings(params?: HttpParams): Observable<Meeting[]> {
    return this.http.get<Meeting[]>('/api/meetings', { params }).pipe(
      catchError((error) => {
        console.error('Failed to load meetings:', error);
        return of([]);
      })
    );
  }

  public getPastMeetings(params?: HttpParams): Observable<PastMeeting[]> {
    return this.http.get<PastMeeting[]>('/api/past-meetings', { params }).pipe(
      catchError((error) => {
        console.error('Failed to load past meetings:', error);
        return of([]);
      })
    );
  }

  public getMeetingsByProject(projectId: string, limit?: number, orderBy?: string): Observable<Meeting[]> {
    let params = new HttpParams().set('tags', `project_uid:${projectId}`);

    if (limit) {
      params = params.set('limit', limit.toString());
    }

    if (orderBy) {
      params = params.set('order', orderBy);
    }

    return this.getMeetings(params);
  }

  public getMeetingsCountByProject(projectId: string): Observable<number> {
    const params = new HttpParams().set('tags', `project_uid:${projectId}`);
    return this.http
      .get<QueryServiceCountResponse>('/api/meetings/count', { params })
      .pipe(
        catchError((error) => {
          console.error('Failed to load meetings count:', error);
          return of({ count: 0 });
        })
      )
      .pipe(
        // Extract just the count number from the response
        map((response) => response.count)
      );
  }

  public getRecentMeetingsByProject(projectId: string, limit: number = 3): Observable<Meeting[]> {
    return this.getMeetingsByProject(projectId, limit, 'updated_at.desc');
  }

  public getUpcomingMeetingsByProject(projectId: string, limit: number = 3): Observable<Meeting[]> {
    let params = new HttpParams().set('tags', `project_uid:${projectId}`);

    // TODO: Add filter for upcoming meetings
    if (limit) {
      params = params.set('limit', limit.toString());
    }

    return this.getMeetings(params);
  }

  public getPastMeetingsByProject(projectId: string, limit: number = 3): Observable<PastMeeting[]> {
    let params = new HttpParams().set('tags', `project_uid:${projectId}`);

    if (limit) {
      params = params.set('limit', limit.toString());
    }

    return this.getPastMeetings(params);
  }

  public getMeeting(id: string): Observable<Meeting> {
    return this.http.get<Meeting>(`/api/meetings/${id}`).pipe(
      catchError((error) => {
        console.error(`Failed to load meeting ${id}:`, error);
        return throwError(() => error);
      }),
      tap((meeting) => this.meeting.set(meeting))
    );
  }

  public getPastMeeting(id: string): Observable<PastMeeting> {
    return this.http.get<PastMeeting>(`/api/past-meetings/${id}`).pipe(
      catchError((error) => {
        console.error(`Failed to load past meeting ${id}:`, error);
        return throwError(() => error);
      }),
      tap((meeting) => this.meeting.set(meeting))
    );
  }

  public getPublicMeeting(id: string, password: string | null): Observable<{ meeting: Meeting; project: Project }> {
    let params = new HttpParams();
    if (password) {
      params = params.set('password', password);
    }
    return this.http.get<{ meeting: Meeting; project: Project }>(`/public/api/meetings/${id}`, { params }).pipe(
      catchError((error) => {
        console.error(`Failed to load public meeting ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  public getPublicMeetingJoinUrl(
    id: string,
    password: string | null,
    body?: { email?: string; name?: string; organization?: string }
  ): Observable<MeetingJoinURL> {
    let params = new HttpParams();

    if (password) {
      params = params.set('password', password);
    }

    return this.http.post<MeetingJoinURL>(`/public/api/meetings/${id}/join-url`, body, { params }).pipe(
      catchError((error) => {
        console.error(`Failed to load public meeting join url ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  public createMeeting(meeting: CreateMeetingRequest): Observable<Meeting> {
    return this.http.post<Meeting>('/api/meetings', meeting).pipe(
      take(1),
      catchError((error) => {
        console.error('Failed to create meeting:', error);
        return throwError(() => error);
      })
    );
  }

  public updateMeeting(id: string, meeting: UpdateMeetingRequest, editType?: 'single' | 'future'): Observable<Meeting> {
    let params = new HttpParams();
    if (editType) {
      params = params.set('editType', editType);
    }
    return this.http.put<Meeting>(`/api/meetings/${id}`, meeting, { params }).pipe(
      take(1),
      catchError((error) => {
        console.error(`Failed to update meeting ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  public deleteMeeting(id: string, deleteType?: 'single' | 'series' | 'future'): Observable<void> {
    let params = new HttpParams();
    if (deleteType) {
      params = params.set('deleteType', deleteType);
    }
    return this.http.delete<void>(`/api/meetings/${id}`, { params }).pipe(
      take(1),
      catchError((error) => {
        console.error(`Failed to delete meeting ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  public getMeetingAttachments(meetingId: string): Observable<MeetingAttachment[]> {
    return this.http.get<MeetingAttachment[]>(`/api/meetings/${meetingId}/attachments`).pipe(
      catchError((error) => {
        console.error(`Failed to load attachments for meeting ${meetingId}:`, error);
        return of([]);
      })
    );
  }

  public uploadFileToStorage(file: File): Observable<UploadFileResponse> {
    return defer(() => this.readFileAsBase64(file)).pipe(
      switchMap((base64Data: string) => {
        // Generate a temporary path for the file
        const timestamp = Date.now();
        const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const tempPath = `temp/${timestamp}_${sanitizedFilename}`;

        const uploadData = {
          fileName: file.name,
          fileData: base64Data,
          mimeType: file.type,
          fileSize: file.size,
          filePath: tempPath,
        };

        return this.http.post<UploadFileResponse>('/api/meetings/storage/upload', uploadData);
      }),
      catchError((error) => {
        console.error(`Failed to upload file ${file.name}:`, error);
        return throwError(() => error);
      })
    );
  }

  public uploadAttachment(meetingId: string, file: File): Observable<{ message: string; attachment: MeetingAttachment }> {
    return new Observable((observer) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = (reader.result as string).split(',')[1];

        const uploadData = {
          fileName: file.name,
          fileData: base64Data,
          mimeType: file.type,
          fileSize: file.size,
        };

        this.http
          .post<{ message: string; attachment: MeetingAttachment }>(`/api/meetings/${meetingId}/attachments/upload`, uploadData)
          .pipe(
            take(1),
            catchError((error) => {
              console.error(`Failed to upload attachment to meeting ${meetingId}:`, error);
              return throwError(() => error);
            })
          )
          .subscribe(observer);
      };

      reader.onerror = () => {
        observer.error(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  }

  public createAttachmentFromUrl(meetingId: string, fileName: string, fileUrl: string, fileSize: number, mimeType: string): Observable<MeetingAttachment> {
    const attachmentData = {
      meeting_id: meetingId,
      file_name: fileName,
      file_url: fileUrl,
      file_size: fileSize,
      mime_type: mimeType,
    };

    return this.http.post<MeetingAttachment>(`/api/meetings/${meetingId}/attachments`, attachmentData).pipe(
      take(1),
      catchError((error) => {
        console.error(`Failed to create attachment for meeting ${meetingId}:`, error);
        return throwError(() => error);
      })
    );
  }

  public deleteAttachment(meetingId: string, attachmentId: string): Observable<void> {
    return this.http.delete<void>(`/api/meetings/${meetingId}/attachments/${attachmentId}`).pipe(
      take(1),
      catchError((error) => {
        console.error(`Failed to delete attachment ${attachmentId} from meeting ${meetingId}:`, error);
        return throwError(() => error);
      })
    );
  }

  public generateAgenda(request: GenerateAgendaRequest): Observable<GenerateAgendaResponse> {
    return this.http.post<GenerateAgendaResponse>('/api/meetings/generate-agenda', request).pipe(
      take(1),
      catchError((error) => {
        console.error('Failed to generate meeting agenda:', error);
        return throwError(() => error);
      })
    );
  }

  public getMeetingRegistrants(meetingUid: string): Observable<MeetingRegistrant[]> {
    return this.http.get<MeetingRegistrant[]>(`/api/meetings/${meetingUid}/registrants`).pipe(
      catchError((error) => {
        console.error(`Failed to load registrants for meeting ${meetingUid}:`, error);
        return of([]);
      })
    );
  }

  public getPastMeetingParticipants(pastMeetingUid: string): Observable<PastMeetingParticipant[]> {
    return this.http.get<PastMeetingParticipant[]>(`/api/past-meetings/${pastMeetingUid}/participants`).pipe(
      catchError((error) => {
        console.error(`Failed to load participants for past meeting ${pastMeetingUid}:`, error);
        return of([]);
      })
    );
  }

  public getPastMeetingRecording(pastMeetingUid: string): Observable<PastMeetingRecording | null> {
    return this.http.get<PastMeetingRecording>(`/api/past-meetings/${pastMeetingUid}/recording`).pipe(
      catchError((error) => {
        if (error.status === 404) {
          return of(null);
        }
        console.error(`Failed to load recording for past meeting ${pastMeetingUid}:`, error);
        return of(null);
      })
    );
  }

  public getPastMeetingSummary(pastMeetingUid: string): Observable<PastMeetingSummary | null> {
    return this.http.get<PastMeetingSummary>(`/api/past-meetings/${pastMeetingUid}/summary`).pipe(
      catchError((error) => {
        if (error.status === 404) {
          return of(null);
        }
        console.error(`Failed to load summary for past meeting ${pastMeetingUid}:`, error);
        return of(null);
      })
    );
  }

  public addMeetingRegistrants(
    meetingUid: string,
    registrantData: CreateMeetingRegistrantRequest[]
  ): Observable<BatchRegistrantOperationResponse<MeetingRegistrant>> {
    return this.http.post<BatchRegistrantOperationResponse<MeetingRegistrant>>(`/api/meetings/${meetingUid}/registrants`, registrantData).pipe(
      take(1),
      catchError((error) => {
        console.error(`Failed to add registrants to meeting ${meetingUid}:`, error);
        return throwError(() => error);
      })
    );
  }

  public updateMeetingRegistrants(
    meetingUid: string,
    updateData: { uid: string; changes: UpdateMeetingRegistrantRequest }[]
  ): Observable<BatchRegistrantOperationResponse<MeetingRegistrant>> {
    return this.http.put<BatchRegistrantOperationResponse<MeetingRegistrant>>(`/api/meetings/${meetingUid}/registrants`, updateData).pipe(
      take(1),
      catchError((error) => {
        console.error(`Failed to update registrants in meeting ${meetingUid}:`, error);
        return throwError(() => error);
      })
    );
  }

  public deleteMeetingRegistrants(meetingUid: string, registrantUids: string[]): Observable<BatchRegistrantOperationResponse<string>> {
    return this.http.delete<BatchRegistrantOperationResponse<string>>(`/api/meetings/${meetingUid}/registrants`, { body: registrantUids }).pipe(
      take(1),
      catchError((error) => {
        console.error(`Failed to delete registrants from meeting ${meetingUid}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Strips metadata from MeetingRegistrantWithState to create CreateMeetingRegistrantRequest
   */
  public stripMetadata(meetingUid: string, registrant: MeetingRegistrantWithState): CreateMeetingRegistrantRequest {
    return {
      meeting_uid: meetingUid,
      email: registrant.email,
      first_name: registrant.first_name,
      last_name: registrant.last_name,
      host: registrant.host || false,
      job_title: registrant.job_title || null,
      org_name: registrant.org_name || null,
    };
  }

  /**
   * Gets changed fields from MeetingRegistrantWithState to create UpdateMeetingRegistrantRequest
   */
  public getChangedFields(registrant: MeetingRegistrantWithState): UpdateMeetingRegistrantRequest {
    return {
      meeting_uid: registrant.meeting_uid,
      email: registrant.email,
      first_name: registrant.first_name,
      last_name: registrant.last_name,
      host: registrant.host || false,
      job_title: registrant.job_title || null,
      org_name: registrant.org_name || null,
      occurrence_id: registrant.occurrence_id || null,
      avatar_url: registrant.avatar_url || null,
      username: registrant.username || null,
    };
  }

  /**
   * Creates a form group for registrant data entry
   */
  public createRegistrantFormGroup(includeAddMore: boolean = false): FormGroup {
    const controls: any = {
      first_name: new FormControl('', [Validators.required, Validators.minLength(2)]),
      last_name: new FormControl('', [Validators.required, Validators.minLength(2)]),
      email: new FormControl('', [Validators.required, Validators.email]),
      job_title: new FormControl(''),
      org_name: new FormControl(''),
      host: new FormControl(false),
    };

    // Add the add_more_registrants control only if requested (for modal)
    if (includeAddMore) {
      controls.add_more_registrants = new FormControl(false);
    }

    return new FormGroup(controls);
  }

  public resendMeetingInvitation(meetingUid: string, registrantId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`/api/meetings/${meetingUid}/registrants/${registrantId}/resend`, {}).pipe(
      take(1),
      catchError((error) => {
        console.error('Failed to resend meeting invitation:', error);
        return throwError(() => error);
      })
    );
  }

  private readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  }

  // Meeting-specific utility functions for registrant data handling
}
