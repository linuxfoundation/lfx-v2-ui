---
name: lfx-backend-builder
description: >
  Generate Express proxy code for apps/lfx — services, controllers, routes, and
  shared TypeScript types. Encodes the controller-service-route pattern, logger
  service usage, MicroserviceProxyService conventions, and shared package structure.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion
---

<!-- Copyright The Linux Foundation and each contributor to LFX. -->
<!-- SPDX-License-Identifier: MIT -->

# LFX Backend Code Generation

You generate Express proxy code and shared TypeScript types for `apps/lfx`. This skill handles the backend layer — the thin proxy between the Angular frontend and the upstream Go microservices.

**Prerequisites:** The upstream API contract must be validated before generating proxy code. No mock data, no placeholder responses.

## Input Validation

| Required                                             | If Missing                               |
| ---------------------------------------------------- | ---------------------------------------- |
| Specific task (what to build/modify)                 | Stop and ask                             |
| Absolute repo path                                   | Stop and ask                             |
| Upstream API endpoint (path, method, response shape) | Stop — cannot build a proxy without this |

**If invoked with a `FIX:` prefix**, read the error, find the file, apply the fix, re-validate.

## Read Before Generating — MANDATORY

1. **Read the target file** (if modifying)
2. **Read an existing example** in the same domain
3. **Read the relevant interface file** in `packages/shared/src/interfaces/`

```bash
ls apps/lfx/src/server/services/
ls apps/lfx/src/server/controllers/
ls packages/shared/src/interfaces/
```

## Build Order

**Strict order — do not skip ahead:**

```text
Shared Types → Service → Controller → Route
```

---

### 1. Shared Types (`packages/shared/src/interfaces/<name>.interface.ts`)

```typescript
// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

export interface MyItem {
  uid: string;
  name: string;
  description?: string;
  created_at: string;
}
```

- License header required
- `interface` for object shapes, `type` for literal unions
- `as const` for constant objects
- Export from barrel `index.ts` in the same directory
- File suffixes: `.interface.ts`, `.enum.ts`, `.constants.ts`

---

### 2. Service (`apps/lfx/src/server/services/<name>.service.ts`)

```typescript
// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { QueryServiceResponse } from '@lfx-one/shared/interfaces';
import { Request } from 'express';

import { logger } from './logger.service';
import { MicroserviceProxyService } from './microservice-proxy.service';

class MyService {
  private microserviceProxy = new MicroserviceProxyService();

  public async getItems(req: Request): Promise<MyItem[]> {
    logger.debug(req, 'get_items', 'Fetching items from upstream', {});

    const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<MyItem>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
      resource_type: 'my_items',
    });

    logger.debug(req, 'get_items', 'Fetched items', { count: resources.length });
    return resources.map((r: any) => r.data);
  }
}

export const myService = new MyService();
```

Service rules:

- `MicroserviceProxyService` for ALL external API calls — never raw `fetch` or `axios`
- Default to user bearer token (`req.bearerToken`) — M2M tokens only for `/public/api/` endpoints
- `logger.debug()` for step-by-step tracing
- `logger.info()` for significant operations (transformations, enrichments)
- `logger.warning()` for recoverable errors (returning null/empty)
- Never use `serverLogger` directly — always `logger` from `./logger.service`

---

### 3. Controller (`apps/lfx/src/server/controllers/<name>.controller.ts`)

```typescript
// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NextFunction, Request, Response } from 'express';

import { logger } from '../services/logger.service';
import { myService } from '../services/my.service';

export const getItems = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = logger.startOperation(req, 'get_items', {});

  try {
    const items = await myService.getItems(req);
    logger.success(req, 'get_items', startTime, { count: items.length });
    return res.json(items);
  } catch (error) {
    logger.error(req, 'get_items', startTime, error, {});
    return next(error);
  }
};
```

Controller rules:

- `logger.startOperation()` → `try/catch` → `logger.success()` or `next(error)`
- Never `res.status(500).json()` — always `next(error)`
- Operation names in `snake_case`
- One `startOperation` per HTTP endpoint

---

### 4. Route (`apps/lfx/src/server/routes/<name>.route.ts`)

```typescript
// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Router } from 'express';

import { getItems, createItem } from '../controllers/my.controller';

const router = Router();

router.get('/items', getItems);
router.post('/items', createItem);

export default router;
```

---

### 5. Route Registration

`server.ts` is a **protected file**. Always tell the contributor:

> "The route file is created. It needs to be registered in `apps/lfx/src/server/server.ts` — a protected infrastructure file. Include this change in your PR for code owner review."

## Checklist

- [ ] Shared types created/updated in `packages/shared/src/interfaces/`
- [ ] Shared types exported from barrel `index.ts`
- [ ] Service uses `MicroserviceProxyService` (not raw fetch/axios)
- [ ] Service uses `logger` (not `serverLogger`)
- [ ] Controller uses `logger.startOperation()` / `logger.success()` / `logger.error()`
- [ ] Controller passes errors to `next(error)` (never `res.status(500)`)
- [ ] License headers on all files
- [ ] Contributor informed about `server.ts` registration

## Scope Boundaries

**This skill DOES:**

- Generate Express proxy services, controllers, and routes for `apps/lfx`
- Create/update shared TypeScript types in `packages/shared`

**This skill does NOT:**

- Generate Angular frontend code — use `/lfx-ui-builder` or `/lfx-design`
- Modify `apps/lfx-one` — use the existing `/develop` skill for that
- Modify `server.ts` directly — flag for code owner
