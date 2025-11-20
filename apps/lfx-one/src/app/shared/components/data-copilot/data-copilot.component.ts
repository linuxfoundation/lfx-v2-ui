// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { afterNextRender, Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { ButtonComponent } from '@app/shared/components/button/button.component';
import { AccountContextService } from '@app/shared/services/account-context.service';
import { ProjectContextService } from '@app/shared/services/project-context.service';
import { DrawerModule } from 'primeng/drawer';

@Component({
  selector: 'lfx-data-copilot',
  standalone: true,
  imports: [DrawerModule, ButtonComponent],
  templateUrl: './data-copilot.component.html',
  styleUrl: './data-copilot.component.scss',
})
export class DataCopilotComponent {
  public readonly iframeContainer = viewChild<ElementRef<HTMLDivElement>>('iframeContainer');

  private readonly accountContextService = inject(AccountContextService);
  private readonly projectContextService = inject(ProjectContextService);

  // Computed values from context services
  private readonly organizationId = computed(() => this.accountContextService.selectedAccount().accountId);
  private readonly organizationName = computed(() => this.accountContextService.selectedAccount().accountName);
  private readonly projectContext = computed(() => this.projectContextService.selectedProject() || this.projectContextService.selectedFoundation());
  private readonly projectSlug = computed(() => this.projectContext()?.slug || '');
  private readonly projectName = computed(() => this.projectContext()?.name || '');

  // Drawer visibility control
  public readonly visible = signal<boolean>(false);

  private iframeCreated = false;

  public constructor() {
    afterNextRender(() => {
      // Create iframe only when drawer is visible and hasn't been created yet
      if (this.visible() && !this.iframeCreated) {
        this.createIframe();
      }
    });
  }

  /**
   * Open the drawer
   */
  protected openDrawer(): void {
    this.visible.set(true);

    // Create iframe after drawer opens if not already created
    if (!this.iframeCreated) {
      setTimeout(() => this.createIframe(), 100);
    }
  }

  /**
   * Handle drawer visibility change
   */
  protected onVisibleChange(isVisible: boolean): void {
    this.visible.set(isVisible);

    // Destroy iframe when drawer is closed
    if (!isVisible) {
      this.destroyIframe();
    }
  }

  /**
   * Destroy the iframe and cleanup resources
   */
  private destroyIframe(): void {
    const container = this.iframeContainer();
    if (container?.nativeElement) {
      // Remove all child nodes (iframe)
      while (container.nativeElement.firstChild) {
        container.nativeElement.removeChild(container.nativeElement.firstChild);
      }
    }
    this.iframeCreated = false;
  }

  /**
   * Create and append the iframe to the container
   */
  private createIframe(): void {
    const container = this.iframeContainer();
    if (this.iframeCreated || !container?.nativeElement) {
      return;
    }

    const iframe = document.createElement('iframe');

    // Construct the iframe src with query parameters
    const params = new URLSearchParams({
      organization_id: this.organizationId(),
      organization_name: this.organizationName(),
      project_slug: this.projectSlug(),
      project_name: this.projectName(),
    });

    iframe.src = `https://lfx-data-copilot.onrender.com/embed?${params.toString()}`;
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.style.border = 'none';
    iframe.title = 'LFX Data Copilot';

    // Append the iframe to the container
    container.nativeElement.appendChild(iframe);
    this.iframeCreated = true;
  }
}
