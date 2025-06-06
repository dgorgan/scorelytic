const nextJest = require('next/jest');
const path = require('path');

const createJestConfig = nextJest({ dir: path.resolve(__dirname) });

const customConfig = {
  displayName: 'client',
  rootDir: '.',
  testMatch: ['<rootDir>/**/*.test.{ts,tsx,js,jsx}'],
  setupFiles: ['<rootDir>/../jest.setup-envs.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.client.ts'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/services/(.*)$': '<rootDir>/services/$1',
    '^@/(.*)$': '<rootDir>/$1',
    '^@scorelytic/shared/(.*)$': '<rootDir>/../shared/src/$1',
    '^@scorelytic/shared$': '<rootDir>/../shared/src/index.ts',
  },
  coverageDirectory: '<rootDir>/../coverage',
  collectCoverageFrom: ['<rootDir>/**/*.{ts,tsx,js,jsx}'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  snapshotSerializers: ['@emotion/jest/serializer'],
};

module.exports = createJestConfig(customConfig);
