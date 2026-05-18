import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    rootDir: '.',
    testMatch: ['**/tests/**/*.test.ts'],
    // Run each test file in its own worker so DB singletons don't bleed across suites
    maxWorkers: 1,
    clearMocks: true,
    coverageDirectory: 'coverage',
    collectCoverageFrom: ['src/**/*.ts', '!src/server.ts', '!src/db/seed.ts'],
};

export default config;
