// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY_ORGANIZATIONS_RESPONSE, EMPTY_TRAVEL_FUND_REQUESTS_RESPONSE, EMPTY_VISA_REQUESTS_RESPONSE } from '@lfx-one/shared/constants';
import {
  EventsResponse,
  GetCertificateParams,
  GetEventOrganizationsParams,
  GetEventRequestsParams,
  GetEventsParams,
  GetMyEventsParams,
  GetUpcomingCountriesResponse,
  MyEventOrganizationsResponse,
  MyEventsResponse,
  TravelFundApplication,
  TravelFundApplicationResponse,
  TravelFundRequestsResponse,
  VisaRequestsResponse,
} from '@lfx-one/shared/interfaces';
import { catchError, Observable, of, take } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EventsService {
  private readonly http = inject(HttpClient);

  public getMyEvents(params: GetMyEventsParams = {}): Observable<MyEventsResponse> {
    let httpParams = new HttpParams();

    if (params.isPast !== undefined) httpParams = httpParams.set('isPast', String(params.isPast));
    if (params.eventId) httpParams = httpParams.set('eventId', params.eventId);
    if (params.projectName) httpParams = httpParams.set('projectName', params.projectName);
    if (params.searchQuery) httpParams = httpParams.set('searchQuery', params.searchQuery);
    if (params.role) httpParams = httpParams.set('role', params.role);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.sortField) httpParams = httpParams.set('sortField', params.sortField);
    if (params.pageSize) httpParams = httpParams.set('pageSize', String(params.pageSize));
    if (params.offset !== undefined) httpParams = httpParams.set('offset', String(params.offset));
    if (params.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder);
    if (params.registeredFirst) httpParams = httpParams.set('registeredFirst', 'true');
    if (params.startDateFrom) httpParams = httpParams.set('startDateFrom', params.startDateFrom);
    if (params.startDateTo) httpParams = httpParams.set('startDateTo', params.startDateTo);
    if (params.country) httpParams = httpParams.set('country', params.country);

    return this.http.get<MyEventsResponse>('/api/events', { params: httpParams });
  }

  public getEvents(params: GetEventsParams = {}): Observable<EventsResponse> {
    let httpParams = new HttpParams();

    if (params.isPast !== undefined) httpParams = httpParams.set('isPast', String(params.isPast));
    if (params.eventId) httpParams = httpParams.set('eventId', params.eventId);
    if (params.projectNames && params.projectNames.length > 0) {
      params.projectNames.forEach((name) => {
        httpParams = httpParams.append('projectName', name);
      });
    }
    if (params.searchQuery) httpParams = httpParams.set('searchQuery', params.searchQuery);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.sortField) httpParams = httpParams.set('sortField', params.sortField);
    if (params.pageSize) httpParams = httpParams.set('pageSize', String(params.pageSize));
    if (params.offset !== undefined) httpParams = httpParams.set('offset', String(params.offset));
    if (params.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder);

    return this.http.get<EventsResponse>('/api/events/all', { params: httpParams });
  }

  public getEventOrganizations(params: GetEventOrganizationsParams = {}): Observable<MyEventOrganizationsResponse> {
    let httpParams = new HttpParams();

    if (params.projectName) httpParams = httpParams.set('projectName', params.projectName);
    if (params.isPast !== undefined) httpParams = httpParams.set('isPast', String(params.isPast));

    return this.http
      .get<MyEventOrganizationsResponse>('/api/events/organizations', { params: httpParams })
      .pipe(catchError(() => of(EMPTY_ORGANIZATIONS_RESPONSE)));
  }

  public getVisaRequests(params: GetEventRequestsParams = {}): Observable<VisaRequestsResponse> {
    let httpParams = new HttpParams();

    if (params.searchQuery) httpParams = httpParams.set('searchQuery', params.searchQuery);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.sortField) httpParams = httpParams.set('sortField', params.sortField);
    if (params.pageSize) httpParams = httpParams.set('pageSize', String(params.pageSize));
    if (params.offset !== undefined) httpParams = httpParams.set('offset', String(params.offset));
    if (params.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder);

    return this.http.get<VisaRequestsResponse>('/api/events/visa-requests', { params: httpParams }).pipe(catchError(() => of(EMPTY_VISA_REQUESTS_RESPONSE)));
  }

  public getTravelFundRequests(params: GetEventRequestsParams = {}): Observable<TravelFundRequestsResponse> {
    let httpParams = new HttpParams();

    if (params.searchQuery) httpParams = httpParams.set('searchQuery', params.searchQuery);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.sortField) httpParams = httpParams.set('sortField', params.sortField);
    if (params.pageSize) httpParams = httpParams.set('pageSize', String(params.pageSize));
    if (params.offset !== undefined) httpParams = httpParams.set('offset', String(params.offset));
    if (params.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder);

    return this.http
      .get<TravelFundRequestsResponse>('/api/events/travel-fund-requests', { params: httpParams })
      .pipe(catchError(() => of(EMPTY_TRAVEL_FUND_REQUESTS_RESPONSE)));
  }

  public getUpcomingCountries(): Observable<GetUpcomingCountriesResponse> {
    return this.http.get<GetUpcomingCountriesResponse>('/api/events/countries').pipe(catchError(() => of({ data: [] as string[] })));
  }

  public submitTravelFundApplication(payload: TravelFundApplication): Observable<TravelFundApplicationResponse> {
    return this.http.post<TravelFundApplicationResponse>('/api/events/travel-fund-applications', payload).pipe(take(1));
  }

  public getCertificate(params: GetCertificateParams): Observable<Blob | null> {
    let httpParams = new HttpParams();

    if (params.eventId) httpParams = httpParams.set('eventId', params.eventId);

    return this.http.get('/api/events/certificate', { params: httpParams, responseType: 'blob' }).pipe(catchError(() => of(null)));
  }
}
