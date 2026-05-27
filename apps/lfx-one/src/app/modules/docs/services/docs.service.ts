// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { HttpClient } from '@angular/common/http';
import { inject, Injectable, makeStateKey, TransferState } from '@angular/core';
import { catchError, Observable, of, tap } from 'rxjs';

export interface DocFrontmatter {
  title: string;
  description: string;
  product_area: string;
  audience?: string[];
  tags?: string[];
  last_updated?: string;
  intercom_collection?: string;
}

export interface DocTopic {
  slug: string;
  title: string;
  description: string;
  path: string;
}

export interface DocSection {
  slug: string;
  title: string;
  description: string;
  topics: DocTopic[];
}

export interface DocArticle {
  frontmatter: DocFrontmatter;
  html: string;
  slug: string[];
  breadcrumbs: { label: string; path: string }[];
}

const SECTIONS_KEY = makeStateKey<{ sections: DocSection[] }>('docs_sections');

@Injectable({ providedIn: 'root' })
export class DocsService {
  private readonly http = inject(HttpClient);
  private readonly transferState = inject(TransferState);

  getSections(): Observable<{ sections: DocSection[] }> {
    if (this.transferState.hasKey(SECTIONS_KEY)) {
      const cached = this.transferState.get(SECTIONS_KEY, { sections: [] });
      this.transferState.remove(SECTIONS_KEY);
      return of(cached);
    }
    return this.http.get<{ sections: DocSection[] }>('/public/api/docs').pipe(
      tap((data) => this.transferState.set(SECTIONS_KEY, data)),
      catchError(() => of({ sections: [] }))
    );
  }

  getArticle(slugParts: string[]): Observable<DocArticle | null> {
    const key = makeStateKey<DocArticle | null>(`docs_article_${slugParts.join('_')}`);
    if (this.transferState.hasKey(key)) {
      const cached = this.transferState.get(key, null);
      this.transferState.remove(key);
      return of(cached);
    }
    const path = `/public/api/docs/${slugParts.join('/')}`;
    return this.http.get<DocArticle>(path).pipe(
      tap((data) => this.transferState.set(key, data)),
      catchError(() => of(null))
    );
  }
}
