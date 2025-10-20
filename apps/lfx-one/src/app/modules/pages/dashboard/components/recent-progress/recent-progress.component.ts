// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { CardComponent } from '@components/card/card.component';
import { ChartComponent } from '@components/chart/chart.component';
import type { ProgressItemWithChart } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-recent-progress',
  standalone: true,
  imports: [CommonModule, CardComponent, ChartComponent],
  templateUrl: './recent-progress.component.html',
  styleUrl: './recent-progress.component.scss',
})
export class RecentProgressComponent {
  @ViewChild('progressScroll') protected progressScrollContainer!: ElementRef;

  protected readonly progressItems: ProgressItemWithChart[] = [
    {
      label: 'Pull requests merged',
      value: '12',
      trend: 'up',
      chartData: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            data: [3, 5, 2, 8, 6, 10, 12],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    },
    {
      label: 'Code reviews completed',
      value: '8',
      trend: 'up',
      chartData: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            data: [2, 3, 4, 3, 5, 6, 8],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    },
    {
      label: 'Issues closed',
      value: '15',
      trend: 'down',
      chartData: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            data: [20, 18, 19, 17, 18, 16, 15],
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    },
    {
      label: 'Commits pushed',
      value: '24',
      trend: 'up',
      chartData: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            data: [15, 18, 20, 19, 21, 22, 24],
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    },
    {
      label: 'Active branches',
      value: '6',
      trend: 'up',
      chartData: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            data: [3, 4, 4, 5, 5, 6, 6],
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    },
    {
      label: 'Documentation updates',
      value: '5',
      trend: 'up',
      chartData: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            data: [1, 2, 2, 3, 3, 4, 5],
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    },
  ];

  protected scrollLeft(): void {
    const container = this.progressScrollContainer.nativeElement;
    container.scrollBy({ left: -300, behavior: 'smooth' });
  }

  protected scrollRight(): void {
    const container = this.progressScrollContainer.nativeElement;
    container.scrollBy({ left: 300, behavior: 'smooth' });
  }
}
