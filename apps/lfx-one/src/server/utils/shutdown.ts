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

export function markShuttingDown(): void {
  shuttingDown = true;
}

// Runs all registered hooks concurrently. Call markShuttingDown() first so
// /readyz flips synchronously before hook execution begins.
export async function runShutdownHooks(): Promise<void> {
  await Promise.allSettled(hooks.map((hook) => hook()));
}
