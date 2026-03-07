# Mock Service Worker (MSW) Setup

This directory contains the MSW configuration for mocking API responses during local development and testing.

## Quick Start

```bash
# 1. Install MSW (one-time)
yarn add -D msw

# 2. Initialize the service worker (one-time, generates mockServiceWorker.js)
npx msw init apps/lfx-one/src --save
```

## File Structure

| File | Purpose |
|------|---------|
| `handlers.ts` | API mock handlers shared across all environments |
| `browser.ts` | Browser/dev mode setup (Service Worker) |
| `node.ts` | SSR and test setup (Node.js interceptor) |

## Adding New Handlers

Add new handlers to `handlers.ts` following the existing pattern:

```typescript
const myHandlers = [
  http.get('/api/v2/my-endpoint', () => {
    return HttpResponse.json({ data: mockData });
  }),
];

// Add to the combined export
export const handlers = [...groupsHandlers, ...meetingsHandlers, ...myHandlers];
```

## Integration Points

### Dev Mode (Browser)

In `main.ts`, conditionally start the worker:

```typescript
if (environment.useMocks) {
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}
```

### E2E Tests (Playwright)

In Playwright's `globalSetup.ts`:

```typescript
import { server } from '../src/mocks/node';

export default async function globalSetup() {
  server.listen({ onUnhandledRequest: 'bypass' });
}

export async function globalTeardown() {
  server.close();
}
```

### SSR (Express Server)

For server-side mock data during development:

```typescript
import { server } from './mocks/node';

if (process.env['USE_MOCKS'] === 'true') {
  server.listen({ onUnhandledRequest: 'bypass' });
}
```

## JIRA

Tracked under [LFXV2-1215](https://linuxfoundation.atlassian.net/browse/LFXV2-1215).
