// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Injectable } from '@angular/core';
import { datadogRum } from '@datadog/browser-rum';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DatadogRumService {
  private isInitialized = false;

  public initialize(): void {
    if (this.isInitialized || !environment.datadog.enabled) {
      return;
    }

    if (!environment.datadog.applicationId || !environment.datadog.clientToken) {
      console.warn('Datadog RUM: Missing applicationId or clientToken in environment configuration');
      return;
    }

    try {
      datadogRum.init({
        applicationId: environment.datadog.applicationId,
        clientToken: environment.datadog.clientToken,
        site: environment.datadog.site as 'datadoghq.com',
        service: environment.datadog.service,
        env: environment.datadog.env,
        version: '1.0.0',
        sessionSampleRate: 100,
        sessionReplaySampleRate: 20,
        trackUserInteractions: true,
        trackResources: true,
        trackLongTasks: true,
        defaultPrivacyLevel: 'mask-user-input',
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Datadog RUM:', error);
    }
  }

  public addAction(name: string, context?: object): void {
    if (this.isInitialized) {
      datadogRum.addAction(name, context);
    }
  }

  public addError(error: Error, context?: object): void {
    if (this.isInitialized) {
      datadogRum.addError(error, context);
    }
  }

  public setUser(user: { id?: string; name?: string; email?: string }): void {
    if (this.isInitialized) {
      datadogRum.setUser(user);
    }
  }

  public setUserProperty(key: string, value: any): void {
    if (this.isInitialized) {
      datadogRum.setUserProperty(key, value);
    }
  }

  public setGlobalContextProperty(key: string, value: any): void {
    if (this.isInitialized) {
      datadogRum.setGlobalContextProperty(key, value);
    }
  }

  public removeGlobalContextProperty(key: string): void {
    if (this.isInitialized) {
      datadogRum.removeGlobalContextProperty(key);
    }
  }

  public startView(name: string): void {
    if (this.isInitialized) {
      datadogRum.startView(name);
    }
  }
}
