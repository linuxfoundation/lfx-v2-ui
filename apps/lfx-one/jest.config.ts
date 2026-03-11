// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['<rootDir>/e2e/'],
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$|@angular/common/locales/.*\\.js$))'],
  transform: {
    '^.+\\.(ts|js|mjs|html|svg)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'html', 'js', 'json', 'mjs'],
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@config/(.*)$': '<rootDir>/src/app/config/$1',
    '^@shared/(.*)$': '<rootDir>/src/app/shared/$1',
    '^@components/(.*)$': '<rootDir>/src/app/shared/components/$1',
    '^@services/(.*)$': '<rootDir>/src/app/shared/services/$1',
    '^@pipes/(.*)$': '<rootDir>/src/app/shared/pipes/$1',
    '^@environments/(.*)$': '<rootDir>/src/environments/$1',
    '^@lfx-one/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
    '^@lfx-one/shared$': '<rootDir>/../../packages/shared/src',
    '^@modules/(.*)$': '<rootDir>/src/app/modules/$1',
    '^@mock-data/(.*)$': '<rootDir>/e2e/fixtures/mock-data/$1',
    '^@mock-data$': '<rootDir>/e2e/fixtures/mock-data',
  },
};

export default config;
