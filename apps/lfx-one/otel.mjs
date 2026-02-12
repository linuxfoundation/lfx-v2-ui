// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import otelApi from '@opentelemetry/api';
import otelExporter from '@opentelemetry/exporter-trace-otlp-proto';
import otelExpress from '@opentelemetry/instrumentation-express';
import otelHttp from '@opentelemetry/instrumentation-http';
import otelUndici from '@opentelemetry/instrumentation-undici';
import otelResources from '@opentelemetry/resources';
import otelSdk from '@opentelemetry/sdk-node';
import otelSemconv from '@opentelemetry/semantic-conventions';

const { diag, DiagConsoleLogger, DiagLogLevel } = otelApi;
const { OTLPTraceExporter } = otelExporter;
const { ExpressInstrumentation } = otelExpress;
const { HttpInstrumentation } = otelHttp;
const { UndiciInstrumentation } = otelUndici;
const { resourceFromAttributes } = otelResources;
const { NodeSDK } = otelSdk;
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = otelSemconv;

const otlpEndpoint = process.env['OTEL_EXPORTER_OTLP_ENDPOINT'];

if (!otlpEndpoint) {
  console.log('[otel] OTEL_EXPORTER_OTLP_ENDPOINT not set, tracing disabled');
} else {
  if (process.env['OTEL_LOG_LEVEL'] === 'debug') {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  }

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env['OTEL_SERVICE_NAME'] || 'lfx-one-ssr',
    [ATTR_SERVICE_VERSION]: process.env['APP_VERSION'] || '1.0.0',
    'deployment.environment': process.env['NODE_ENV'] || 'development',
  });

  const traceExporter = new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
  });

  const sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      new HttpInstrumentation({
        ignoreIncomingRequestHook: (req) => {
          const url = req.url || '';
          return url === '/health' || url === '/api/health' || url.startsWith('/.well-known');
        },
      }),
      new ExpressInstrumentation(),
      new UndiciInstrumentation({
        headersToSpanAttributes: {
          requestHeaders: ['content-type'],
          responseHeaders: ['content-type'],
        },
      }),
    ],
  });

  sdk.start();
  console.log(`[otel] Tracing enabled, exporting to ${otlpEndpoint}`);

  const shutdown = async () => {
    try {
      await sdk.shutdown();
      console.log('[otel] SDK shut down successfully');
    } catch (err) {
      console.error('[otel] Error shutting down SDK:', err);
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
