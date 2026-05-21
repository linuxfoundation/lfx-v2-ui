// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

declare module 'jose' {
  export interface JoseKey {
    readonly [key: string]: unknown;
  }

  export const errors: {
    JWTExpired: new (message?: string) => Error;
  };

  export const JWK: {
    asKey: (key: Buffer) => JoseKey;
  };

  export const JWT: {
    verify: <TPayload extends Record<string, unknown> = Record<string, unknown>>(
      token: string,
      key: JoseKey,
      options?: { algorithms?: string[] }
    ) => TPayload;
  };
}
