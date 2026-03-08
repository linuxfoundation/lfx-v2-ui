// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { LENS_CONFIG } from '@lfx-one/shared/constants';
import { LensQueryParams, LensSSEEvent, LensSSEEventType, LfxLensApiResponse } from '@lfx-one/shared/interfaces';
import { Request } from 'express';

import { logger } from './logger.service';

export class LensService {
  private readonly apiUrl = process.env['LENS_API_URL'] || LENS_CONFIG.DEFAULT_API_URL;
  private readonly apiKey = process.env['LENS_API_KEY'] || '';

  /**
   * Stream query — tries stream=true first. If the upstream returns a non-streaming
   * JSON response (e.g. when they don't support streaming yet), falls back to
   * parsing the full response and yielding blocks.
   */
  public async *streamQuery(req: Request, params: LensQueryParams, abortSignal?: AbortSignal): AsyncGenerator<LensSSEEvent> {
    logger.debug(req, 'lens_stream_query', 'Calling LFX Lens API (stream=true)', {
      user_id: params.userId,
      has_session: !!params.sessionId,
      has_context: !!params.context,
    });

    const formData = new FormData();
    formData.append('message', params.message);
    formData.append('stream', 'true');
    formData.append('user_id', params.userId);

    if (params.sessionId) {
      formData.append('session_id', params.sessionId);
    }

    if (params.context) {
      formData.append('additional_data', JSON.stringify(params.context));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LENS_CONFIG.REQUEST_TIMEOUT_MS);

    // Link caller's abort signal
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const url = `${this.apiUrl}${LENS_CONFIG.WORKFLOW_PATH}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LFX Lens API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const contentType = response.headers.get('content-type') || '';

      // If upstream returns SSE stream, read it chunk by chunk
      if (contentType.includes('text/event-stream') && response.body) {
        yield* this.readUpstreamSSE(req, response);
      } else {
        // Fallback: upstream returned JSON (stream=false behavior)
        yield* this.handleSyncResponse(req, response);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Read upstream SSE stream from LFX Lens API and re-emit as our events.
   * The upstream sends events like: status, content, block, session_id, done, error.
   */
  private async *readUpstreamSSE(req: Request, response: Response): AsyncGenerator<LensSSEEvent> {
    const reader = (response.body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() || '';

        for (const block of blocks) {
          if (!block.trim()) continue;

          const event = this.parseUpstreamSSEBlock(block);
          if (event) {
            yield event;
          }
        }
      }

      // Handle remaining buffer
      if (buffer.trim()) {
        const event = this.parseUpstreamSSEBlock(buffer);
        if (event) {
          yield event;
        }
      }
    } finally {
      reader.cancel().catch(() => undefined);
    }

    logger.debug(req, 'lens_stream_query', 'Upstream SSE stream completed');
  }

  /**
   * Fallback: parse a synchronous JSON response and yield blocks individually.
   */
  private async *handleSyncResponse(req: Request, response: Response): AsyncGenerator<LensSSEEvent> {
    const result = (await (response as unknown as globalThis.Response).json()) as LfxLensApiResponse;

    if (result.status === 'ERROR') {
      throw new Error(`LFX Lens workflow error: ${JSON.stringify(result.content)}`);
    }

    logger.debug(req, 'lens_stream_query', 'LFX Lens API sync response received', {
      session_id: result.session_id,
      run_id: result.run_id,
      block_count: result.content?.blocks?.length ?? 0,
    });

    yield { type: 'session_id', data: result.session_id };

    for (const block of result.content.blocks) {
      // For message blocks, emit as content events (character-streamable on the client)
      if (block.type === 'message') {
        yield { type: 'content', data: block.content };
      } else {
        yield { type: 'block', data: block };
      }
    }

    yield { type: 'done', data: '' };
  }

  private parseUpstreamSSEBlock(block: string): LensSSEEvent | null {
    let eventType = '';
    let data = '';

    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        data = line.slice(6);
      }
    }

    if (!eventType && !data) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      parsed = data;
    }

    // Map upstream event types to our SSE event types
    const mappedType = this.mapUpstreamEventType(eventType);
    if (!mappedType) return null;

    return { type: mappedType, data: parsed };
  }

  private mapUpstreamEventType(upstreamType: string): LensSSEEventType | null {
    switch (upstreamType) {
      case 'status':
        return 'status';
      case 'content':
        return 'content';
      case 'block':
        return 'block';
      case 'session_id':
        return 'session_id';
      case 'done':
        return 'done';
      case 'error':
        return 'error';
      default:
        return null;
    }
  }
}
