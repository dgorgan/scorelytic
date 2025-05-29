/** @type {import('jest').Config} */
module.exports = {
  displayName: 'server',
  rootDir: './',
  preset: 'ts-jest',
  testMatch: ['<rootDir>/**/*.test.ts'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/../jest.setup.server.js'],
  moduleNameMapper: {
    '^@/shared/(.*)$': '<rootDir>/../shared/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^shared/(.*)$': '<rootDir>/../shared/$1',
  },
  coverageDirectory: '<rootDir>/../coverage',
  collectCoverageFrom: ['<rootDir>/**/*.ts'],
};
