// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

type ShutdownHook = () => void | Promise<void>;

let shuttingDown = false;
const hooks: ShutdownHook[] = [];

export function isShuttingDown(): boolean {
  return shuttingDown;
}

export function addShutdownHook(hook: ShutdownHook): void {
  hooks.push(hook);
}

// Marks shutdown as in-progress and runs all registered hooks concurrently.
// Called before httpServer.close() so SSE streams can be ended first.
export async function runShutdownHooks(): Promise<void> {
  shuttingDown = true;
  await Promise.allSettled(hooks.map((hook) => hook()));
}
