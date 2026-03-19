// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ComponentRef, DestroyRef, Directive, ElementRef, PLATFORM_ID, Renderer2, ViewContainerRef, inject, input } from '@angular/core';
import { Tooltip } from './tooltip';

type TooltipPosition = 'top' | 'bottom';

const TOOLTIP_GAP = 8;
const ARROW_SIZE = 5;

@Directive({
  selector: '[lfxTooltip]',
  host: {
    '[attr.data-testid]': '"tooltip-trigger"',
    '(mouseenter)': 'show()',
    '(mouseleave)': 'hide()',
    '(focusin)': 'show()',
    '(focusout)': 'hide()',
  },
})
export class TooltipTrigger {
  private readonly vcr = inject(ViewContainerRef);
  private readonly el = inject(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  public lfxTooltip = input.required<string>();
  public lfxTooltipDescription = input<string>();
  public lfxTooltipPosition = input<TooltipPosition>('top');

  private tooltipRef: ComponentRef<Tooltip> | null = null;
  private tooltipWrapper: HTMLElement | null = null;

  public constructor() {
    this.destroyRef.onDestroy(() => this.hide());
  }

  public show(): void {
    if (!isPlatformBrowser(this.platformId) || this.tooltipRef) {
      return;
    }

    this.tooltipRef = this.vcr.createComponent(Tooltip);
    this.tooltipRef.setInput('label', this.lfxTooltip());

    const description = this.lfxTooltipDescription();
    if (description) {
      this.tooltipRef.setInput('description', description);
    }

    this.tooltipRef.changeDetectorRef.detectChanges();

    const tooltipEl = this.tooltipRef.location.nativeElement as HTMLElement;

    this.tooltipWrapper = this.renderer.createElement('div') as HTMLElement;
    this.renderer.setStyle(this.tooltipWrapper, 'position', 'fixed');
    this.renderer.setStyle(this.tooltipWrapper, 'z-index', '9999');
    this.renderer.setStyle(this.tooltipWrapper, 'pointer-events', 'none');
    this.renderer.setStyle(this.tooltipWrapper, 'opacity', '0');
    this.renderer.setStyle(this.tooltipWrapper, 'transition', 'opacity 150ms ease-in-out');
    this.renderer.setStyle(this.tooltipWrapper, 'width', 'max-content');
    this.renderer.setStyle(this.tooltipWrapper, 'max-width', '24rem');

    this.renderer.appendChild(this.tooltipWrapper, tooltipEl);
    this.createArrow();
    this.renderer.appendChild(this.document.body, this.tooltipWrapper);

    this.positionTooltip();

    requestAnimationFrame(() => {
      if (this.tooltipWrapper) {
        this.renderer.setStyle(this.tooltipWrapper, 'opacity', '1');
      }
    });
  }

  public hide(): void {
    if (this.tooltipWrapper) {
      this.renderer.removeChild(this.document.body, this.tooltipWrapper);
      this.tooltipWrapper = null;
    }

    if (this.tooltipRef) {
      this.tooltipRef.destroy();
      this.tooltipRef = null;
    }
  }

  private createArrow(): void {
    if (!this.tooltipWrapper) {
      return;
    }

    const arrow = this.renderer.createElement('div') as HTMLElement;
    const position = this.lfxTooltipPosition();

    this.renderer.setStyle(arrow, 'position', 'absolute');
    this.renderer.setStyle(arrow, 'left', '50%');
    this.renderer.setStyle(arrow, 'transform', 'translateX(-50%)');
    this.renderer.setStyle(arrow, 'width', '0');
    this.renderer.setStyle(arrow, 'height', '0');
    this.renderer.setStyle(arrow, 'border-left', `${ARROW_SIZE}px solid transparent`);
    this.renderer.setStyle(arrow, 'border-right', `${ARROW_SIZE}px solid transparent`);

    if (position === 'top') {
      this.renderer.setStyle(arrow, 'bottom', `-${ARROW_SIZE}px`);
      this.renderer.setStyle(arrow, 'border-top', `${ARROW_SIZE}px solid #0f172a`);
    } else {
      this.renderer.setStyle(arrow, 'top', `-${ARROW_SIZE}px`);
      this.renderer.setStyle(arrow, 'border-bottom', `${ARROW_SIZE}px solid #0f172a`);
    }

    this.renderer.setAttribute(arrow, 'data-testid', 'tooltip-arrow');
    this.renderer.appendChild(this.tooltipWrapper, arrow);
  }

  private positionTooltip(): void {
    if (!this.tooltipWrapper) {
      return;
    }

    const triggerRect = (this.el.nativeElement as HTMLElement).getBoundingClientRect();
    const tooltipRect = this.tooltipWrapper.getBoundingClientRect();
    const position = this.lfxTooltipPosition();

    const left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;

    let top: number;
    if (position === 'top') {
      top = triggerRect.top - tooltipRect.height - TOOLTIP_GAP;
    } else {
      top = triggerRect.bottom + TOOLTIP_GAP;
    }

    const clampedLeft = Math.max(4, Math.min(left, window.innerWidth - tooltipRect.width - 4));

    this.renderer.setStyle(this.tooltipWrapper, 'top', `${top}px`);
    this.renderer.setStyle(this.tooltipWrapper, 'left', `${clampedLeft}px`);

    if (clampedLeft !== left) {
      const arrowEl = this.tooltipWrapper.querySelector('[data-testid="tooltip-arrow"]') as HTMLElement;
      if (arrowEl) {
        const arrowLeft = triggerRect.left + triggerRect.width / 2 - clampedLeft;
        this.renderer.setStyle(arrowEl, 'left', `${arrowLeft}px`);
      }
    }
  }
}
