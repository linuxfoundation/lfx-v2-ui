// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

declare module 'jose' {
  export const errors: {
    JWTExpired: new (...args: unknown[]) => Error;
  };

  export const JWK: {
    asKey: (key: Buffer) => unknown;
  };

  export const JWT: {
    verify: (
      token: string,
      key: unknown,
      options?: { algorithms?: string[] }
    ) => Record<string, unknown>;
  };
}
