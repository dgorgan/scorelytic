const nextJest = require('next/jest');
const path = require('path');

const createJestConfig = nextJest({ dir: path.resolve(__dirname) });

const customConfig = {
  displayName: 'client',
  rootDir: './',
  testMatch: ['<rootDir>/**/*.test.{ts,tsx,js,jsx}'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/services/(.*)$': '<rootDir>/services/$1',
    '^@/(.*)$': '<rootDir>/$1',
    '^shared/(.*)$': '<rootDir>/../shared/$1',
  },
  coverageDirectory: '<rootDir>/../coverage',
  collectCoverageFrom: ['<rootDir>/**/*.{ts,tsx,js,jsx}'],
};

module.exports = createJestConfig(customConfig);
