// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { APP_BASE_HREF } from '@angular/common';
import { REQUEST } from '@angular/core';
import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node';
import { AuthContext, User } from '@lfx-one/shared/interfaces';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import { attemptSilentLogin, auth, ConfigParams } from 'express-openid-connect';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pinoHttp from 'pino-http';

import { ApiError } from './helpers/api-error';
import { customErrorSerializer } from './helpers/error-serializer';
import { reqSerializer, resSerializer, serverLogger } from './helpers/server-logger';
import { validateAndSanitizeUrl } from './helpers/url-validation';
import { authMiddleware } from './middleware/auth.middleware';
import { apiErrorHandler } from './middleware/error-handler.middleware';
import { logger } from './services/logger.service';

if (process.env['NODE_ENV'] !== 'production') {
  dotenv.config();
}

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const angularApp = new AngularNodeAppEngine();
const app = express();

/**
 * Enable gzip/deflate compression for all responses.
 *
 * Configuration optimized for SSR:
 * - Compresses HTML, CSS, JS, JSON, and other text-based responses
 * - Uses level 6 (balanced compression/speed ratio)
 * - 1KB threshold to avoid compressing small responses
 * - Uses default filter for text-based content types
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const compression = require('compression');
app.use(
  compression({
    level: 6, // Balanced compression level (1=fastest, 9=best compression)
    threshold: 1024, // Only compress responses larger than 1KB
  })
);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

/**
 * Serve static files from /browser
 */
app.get(
  '**',
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false, // Let Angular SSR handle the index route
  })
);

// Add health endpoint before logger middleware
app.get('/health', (_req: Request, res: Response) => {
  res.send('OK');
});

/**
 * HTTP request/response logging middleware using Pino.
 *
 * Provides:
 * - Automatic HTTP request/response logging
 * - Request-scoped logger accessible via req.log in route handlers
 * - Request correlation and timing
 * - Consistent configuration with serverLogger
 *
 * Usage in routes: req.log.info({...}, 'message')
 */
const httpLogger = pinoHttp({
  logger: serverLogger, // Use the same base logger for consistency
  serializers: {
    err: customErrorSerializer,
    error: customErrorSerializer,
    req: reqSerializer,
    res: resSerializer,
  },
  // Disable automatic request/response logging - our LoggerService handles operation logging
  autoLogging: false,
});

// Add HTTP logger middleware after health endpoint to avoid logging health check
app.use(httpLogger);

const authConfig: ConfigParams = {
  authRequired: false, // Disable global auth requirement to handle it in selective middleware
  auth0Logout: true,
  baseURL: process.env['PCC_BASE_URL'] || 'http://localhost:4200',
  clientID: process.env['PCC_AUTH0_CLIENT_ID'] || 'local-dev-placeholder',
  issuerBaseURL: process.env['PCC_AUTH0_ISSUER_BASE_URL'] || 'https://example.com',
  secret: process.env['PCC_AUTH0_SECRET'] || 'local-dev-secret-minimum-32-chars-long',
  authorizationParams: {
    response_type: 'code',
    audience: process.env['PCC_AUTH0_AUDIENCE'] || 'https://example.com',
    scope: 'openid email profile access:api offline_access',
  },
  clientSecret: process.env['PCC_AUTH0_CLIENT_SECRET'] || 'local-dev-placeholder',
  routes: {
    login: false,
  },
};

app.use(auth(authConfig));

// Silent login attempt for meeting join pages only
// If user has SSO session elsewhere, they'll be authenticated automatically
// If not, they proceed as unauthenticated (route is optional auth)
app.use('/meetings/', attemptSilentLogin());

app.use('/login', (req: Request, res: Response) => {
  if (req.oidc?.isAuthenticated() && !req.oidc?.accessToken?.isExpired()) {
    const returnTo = req.query['returnTo'] as string;
    const validatedReturnTo = validateAndSanitizeUrl(returnTo, [process.env['PCC_BASE_URL'] as string]);
    if (validatedReturnTo) {
      res.redirect(validatedReturnTo);
    } else {
      res.redirect('/');
    }
  } else {
    const returnTo = req.query['returnTo'] as string;
    const validatedReturnTo = validateAndSanitizeUrl(returnTo, [process.env['PCC_BASE_URL'] as string]);
    if (validatedReturnTo) {
      res.oidc.login({ returnTo: validatedReturnTo });
    } else {
      res.oidc.login({ returnTo: '/' });
    }
  }
});

// Apply authentication middleware to all routes
app.use(authMiddleware);

// API routes will be mounted here

// Catch unmatched API routes and return 404 before falling through to SSR
app.use(['/api/*', '/public/api/*'], (req: Request, _res: Response, next: NextFunction) => {
  next(ApiError.notFound(`No API route matches ${req.method} ${req.path}`));
});

// Add API error handler middleware
app.use(['/api/*', '/public/api/*'], apiErrorHandler);

/**
 * Handle all other requests by rendering the Angular application.
 * Require authentication for all non-API routes.
 */
app.use('/**', async (req: Request, res: Response, next: NextFunction) => {
  const ssrStartTime = Date.now();
  const authContext: AuthContext = {
    authenticated: false,
    user: null,
  };

  if (req.oidc?.isAuthenticated() && !req.oidc?.accessToken?.isExpired()) {
    authContext.authenticated = true;
    try {
      // Fetch user info from OIDC
      authContext.user = req.oidc?.user as User;

      if (!authContext.user?.name) {
        authContext.user = await req.oidc.fetchUserInfo();
      }
    } catch (error) {
      // If userinfo fetch fails, fall back to basic user info from token
      // Do NOT logout — a transient Auth0/userinfo failure should not sign out valid sessions
      logger.warning(req, 'ssr_user_info', 'Failed to fetch user info, using basic user data from token', {
        err: error,
        path: req.path,
      });
    }
  }

  angularApp
    .handle(req, {
      auth: authContext,
      providers: [
        { provide: APP_BASE_HREF, useValue: process.env['PCC_BASE_URL'] },
        { provide: REQUEST, useValue: req },
      ],
    })
    .then((response) => {
      if (response) {
        return writeResponseToNodeResponse(response, res);
      }

      return next();
    })
    .catch((error: unknown) => {
      const err = error instanceof Error ? error : new Error(String(error));
      const code = error instanceof Error ? (error as Error & { code?: string }).code : undefined;

      if (code === 'NOT_FOUND') {
        res.status(404).send('Not Found');
      } else if (code === 'UNAUTHORIZED') {
        res.status(401).send('Unauthorized');
      } else {
        logger.error(req, 'ssr_render', ssrStartTime, err, {
          url: req.url,
          method: req.method,
        });
        res.status(500).send('Internal Server Error');
      }
    });
});

// Global error handler for all routes (must be last)
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    next(error);
    return;
  }

  // Use the same error handler logic for all routes
  apiErrorHandler(error, req, res, next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4200.
 */
export function startServer() {
  const port = process.env['PORT'] || 4201;
  app.listen(port, () => {
    logger.debug(undefined, 'server_startup', 'Node Express server started', {
      port,
      url: `http://localhost:${port}`,
      node_env: process.env['NODE_ENV'] || 'development',
      pm2: process.env['PM2'] === 'true',
    });
  });
}

const metaUrl = import.meta.url;
const isMain = isMainModule(metaUrl);
const isPM2 = process.env['PM2'] === 'true';

if (isMain || isPM2) {
  startServer();
}

/**
 * The request handler used by the Angular CLI (dev-server and during build).
 */
export const reqHandler = createNodeRequestHandler(app);
