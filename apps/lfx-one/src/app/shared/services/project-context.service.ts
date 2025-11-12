// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Injectable, signal, WritableSignal } from '@angular/core';

export interface ProjectContext {
  projectId: string;
  name: string;
  slug: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProjectContextService {
  private readonly storageKey = 'lfx-selected-project';
  public readonly selectedProject: WritableSignal<ProjectContext | null> = signal<ProjectContext | null>(null);

  public constructor() {
    const storedProjectId = this.loadStoredProjectId();
    if (storedProjectId) {
      // Store the projectId, will be set when projects are loaded
      this.selectedProject.set({ projectId: storedProjectId, name: '', slug: '' });
    }
  }

  /**
   * Set the selected project and persist to storage
   */
  public setProject(project: ProjectContext): void {
    this.selectedProject.set(project);
    this.persistProjectId(project.projectId);
  }

  /**
   * Get the currently selected project ID
   */
  public getProjectId(): string | null {
    return this.selectedProject()?.projectId || null;
  }

  /**
   * Clear the selected project
   */
  public clearProject(): void {
    this.selectedProject.set(null);
    localStorage.removeItem(this.storageKey);
  }

  private persistProjectId(projectId: string): void {
    localStorage.setItem(this.storageKey, projectId);
  }

  private loadStoredProjectId(): string | null {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored || null;
    } catch {
      // Invalid data in localStorage, ignore
      return null;
    }
  }
}

