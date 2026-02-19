// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import otelApi from '@opentelemetry/api';
import otelCore from '@opentelemetry/core';
import otelExporterGrpc from '@opentelemetry/exporter-trace-otlp-grpc';
import otelExporterProto from '@opentelemetry/exporter-trace-otlp-proto';
import otelExpress from '@opentelemetry/instrumentation-express';
import otelHttp from '@opentelemetry/instrumentation-http';
import otelUndici from '@opentelemetry/instrumentation-undici';
import otelB3 from '@opentelemetry/propagator-b3';
import otelJaeger from '@opentelemetry/propagator-jaeger';
import otelResources from '@opentelemetry/resources';
import otelSdk from '@opentelemetry/sdk-node';
import otelTraceBase from '@opentelemetry/sdk-trace-base';
import otelSemconv from '@opentelemetry/semantic-conventions';
import { ATTR_DEPLOYMENT_ENVIRONMENT_NAME } from '@opentelemetry/semantic-conventions/incubating';

const { diag, DiagConsoleLogger, DiagLogLevel } = otelApi;
const { CompositePropagator, W3CTraceContextPropagator, W3CBaggagePropagator } = otelCore;
const { OTLPTraceExporter: OTLPTraceExporterGrpc } = otelExporterGrpc;
const { OTLPTraceExporter: OTLPTraceExporterProto } = otelExporterProto;
const { ExpressInstrumentation } = otelExpress;
const { HttpInstrumentation } = otelHttp;
const { UndiciInstrumentation } = otelUndici;
const { B3Propagator, B3InjectEncoding } = otelB3;
const { JaegerPropagator } = otelJaeger;
const { resourceFromAttributes } = otelResources;
const { NodeSDK } = otelSdk;
const { AlwaysOnSampler, AlwaysOffSampler, TraceIdRatioBasedSampler, ParentBasedSampler } = otelTraceBase;
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = otelSemconv;

const otlpEndpoint = process.env['OTEL_EXPORTER_OTLP_ENDPOINT'];

if (!otlpEndpoint) {
  console.log('[otel] OTEL_EXPORTER_OTLP_ENDPOINT not set, tracing disabled');
} else {
  const logLevel = (process.env['OTEL_LOG_LEVEL'] || 'info').toLowerCase();
  const diagLevelMap = {
    none: DiagLogLevel.NONE,
    error: DiagLogLevel.ERROR,
    warn: DiagLogLevel.WARN,
    info: DiagLogLevel.INFO,
    debug: DiagLogLevel.DEBUG,
    verbose: DiagLogLevel.VERBOSE,
    all: DiagLogLevel.ALL,
  };
  if (diagLevelMap[logLevel] !== undefined) {
    diag.setLogger(new DiagConsoleLogger(), diagLevelMap[logLevel]);
  } else {
    console.warn(`[otel] Unknown OTEL_LOG_LEVEL: ${logLevel}, defaulting to info`);
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
  }

  const serviceName = process.env['OTEL_SERVICE_NAME'] || 'lfx-v2-ui';
  const serviceVersion = process.env['APP_VERSION'] || 'development';

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env['NODE_ENV'] || 'development',
  });

  // Exporter protocol: grpc or http/protobuf (default)
  const protocol = process.env['OTEL_EXPORTER_OTLP_PROTOCOL'] || 'http/protobuf';
  let traceExporter;
  if (protocol === 'grpc') {
    traceExporter = new OTLPTraceExporterGrpc({ url: otlpEndpoint });
  } else {
    traceExporter = new OTLPTraceExporterProto({ url: `${otlpEndpoint}/v1/traces` });
  }

  // Trace sampling ratio (0.0 to 1.0, default 1.0 = sample everything)
  const rawRatio = parseFloat(process.env['OTEL_TRACES_SAMPLER_ARG'] || '1.0');
  const traceRatio = Number.isFinite(rawRatio) ? Math.min(1.0, Math.max(0.0, rawRatio)) : 1.0;

  // OTEL_TRACES_SAMPLER selects the sampler strategy (default: parentbased_always_on)
  const samplerName = (process.env['OTEL_TRACES_SAMPLER'] || 'parentbased_always_on').toLowerCase();
  const knownSamplers = ['always_on', 'always_off', 'traceidratio', 'parentbased_always_on', 'parentbased_always_off', 'parentbased_traceidratio'];
  if (!knownSamplers.includes(samplerName)) {
    console.warn(`[otel] Unknown sampler: ${samplerName}, falling back to parentbased_always_on`);
  }
  let sampler;
  switch (samplerName) {
    case 'always_on':
      sampler = new AlwaysOnSampler();
      break;
    case 'always_off':
      sampler = new AlwaysOffSampler();
      break;
    case 'traceidratio':
      sampler = new TraceIdRatioBasedSampler(traceRatio);
      break;
    case 'parentbased_always_on':
      sampler = new ParentBasedSampler({ root: new AlwaysOnSampler() });
      break;
    case 'parentbased_always_off':
      sampler = new ParentBasedSampler({ root: new AlwaysOffSampler() });
      break;
    case 'parentbased_traceidratio':
      sampler = new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(traceRatio) });
      break;
    default:
      sampler = new ParentBasedSampler({ root: new AlwaysOnSampler() });
      break;
  }

  // Propagators: comma-separated list (default: tracecontext,baggage)
  const propagatorNames = (process.env['OTEL_PROPAGATORS'] || 'tracecontext,baggage').split(',').map((p) => p.trim());
  const propagatorMap = {
    tracecontext: () => new W3CTraceContextPropagator(),
    baggage: () => new W3CBaggagePropagator(),
    b3: () => new B3Propagator(),
    b3multi: () => new B3Propagator({ injectEncoding: B3InjectEncoding.MULTI_HEADER }),
    jaeger: () => new JaegerPropagator(),
  };
  const propagators = propagatorNames
    .filter((name) => {
      if (!propagatorMap[name]) {
        console.warn(`[otel] Unknown propagator: ${name}, skipping`);
        return false;
      }
      return true;
    })
    .map((name) => propagatorMap[name]());
  const textMapPropagator = new CompositePropagator({ propagators });

  const sdk = new NodeSDK({
    resource,
    traceExporter,
    sampler,
    textMapPropagator,
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
  console.log('[otel] Tracing enabled:', JSON.stringify({
    service: serviceName,
    version: serviceVersion,
    protocol,
    sampler: samplerName,
    ratio: traceRatio,
    propagators: propagatorNames,
  }));

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
