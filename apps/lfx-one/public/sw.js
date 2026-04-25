// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/* eslint-disable */
/* global importScripts, workbox, self */

// Custom service worker for LFX One PWA.
//
// Wraps Angular's auto-generated ngsw-worker.js (which handles app-shell
// and API caching per ngsw-config.json) with Workbox's background-sync
// Queue so failed writes (RSVP, vote cast, profile patch) are queued
// offline and replayed on reconnect.
//
// Both scripts run in the same SW global scope. ngsw-worker.js installs
// its fetch listener first; Workbox's registerRoute handlers install
// after and respondWith only for matching POST/PUT/PATCH endpoints —
// paths Angular's SW does not intercept. They coexist without
// interfering.

importScripts('/ngsw-worker.js');
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

if (self.workbox) {
  workbox.setConfig({ debug: false });

  const { Queue } = workbox.backgroundSync;
  const { NetworkOnly } = workbox.strategies;
  const { registerRoute } = workbox.routing;

  const broadcast = (message) =>
    self.clients.matchAll({ includeUncontrolled: true }).then((clients) => clients.forEach((client) => client.postMessage(message)));

  const queue = new Queue('lfx-write-queue', {
    maxRetentionTime: 24 * 60, // minutes — drop entries older than 24h
    onSync: async ({ queue }) => {
      let replayed = 0;
      let failed = 0;
      let entry;
      while ((entry = await queue.shiftRequest())) {
        try {
          await fetch(entry.request.clone());
          replayed += 1;
        } catch (error) {
          failed += 1;
          await queue.unshiftRequest(entry);
          await broadcast({ type: 'lfx-sync-failure', queue: queue.name });
          throw error; // Workbox will retry later
        }
      }
      const queued = (await queue.getAll()).length;
      await broadcast({ type: 'lfx-sync-success', queue: queue.name, replayed, failed, queued });
    },
  });

  const enqueueOnFailure = {
    fetchDidFail: async ({ request }) => {
      await queue.pushRequest({ request });
      const queued = (await queue.getAll()).length;
      await broadcast({ type: 'lfx-sync-queued', queue: queue.name, queued });
    },
  };

  const queued = new NetworkOnly({ plugins: [enqueueOnFailure] });

  registerRoute(/\/api\/meetings\/[^/]+\/rsvp\b/, queued, 'POST');
  registerRoute(/\/api\/meetings\/[^/]+\/rsvp\b/, queued, 'PATCH');
  registerRoute(/\/api\/votes\/[^/]+\/cast\b/, queued, 'POST');
  registerRoute(/\/api\/profile\b/, queued, 'PATCH');

  // Clients can poll for current queue size.
  self.addEventListener('message', (event) => {
    if (event.data?.type === 'lfx-sync-status') {
      queue.getAll().then((entries) => {
        if (event.source) {
          event.source.postMessage({ type: 'lfx-sync-status', queue: queue.name, queued: entries.length });
        }
      });
    }
  });
}
