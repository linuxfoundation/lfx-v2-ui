// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, ContentChild, input, output, TemplateRef } from '@angular/core';
import { TreeNode } from 'primeng/api';
import { TreeTableModule } from 'primeng/treetable';

@Component({
  selector: 'lfx-treetable',
  standalone: true,
  imports: [CommonModule, TreeTableModule],
  templateUrl: './treetable.component.html',
})
export class TreeTableComponent {
  // Template references for content projection - CRITICAL: Use descendants: false
  @ContentChild('header', { static: false, descendants: false }) public headerTemplate?: TemplateRef<any>;
  @ContentChild('body', { static: false, descendants: false }) public bodyTemplate?: TemplateRef<any>;
  @ContentChild('emptymessage', { static: false, descendants: false }) public emptyMessageTemplate?: TemplateRef<any>;

  // Core data properties
  public readonly value = input<TreeNode[]>([]);
  public readonly columns = input<any[]>([]);

  // Styling properties
  public readonly styleClass = input<string | undefined>(undefined);

  // Events we need for committee dashboard
  public readonly onNodeExpand = output<any>();
  public readonly onNodeCollapse = output<any>();

  // Event handlers
  protected handleNodeExpand(event: any): void {
    this.onNodeExpand.emit(event);
  }

  protected handleNodeCollapse(event: any): void {
    this.onNodeCollapse.emit(event);
  }
}
