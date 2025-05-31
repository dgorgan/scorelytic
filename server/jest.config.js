/** @type {import('jest').Config} */
module.exports = {
  displayName: 'server',
  rootDir: '.',
  preset: 'ts-jest',
  testMatch: ['<rootDir>/**/*.test.ts'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/../jest.setup.server.js'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleNameMapper: {
    '^@scorelytic/shared(.*)$': '<rootDir>/../shared/src$1',
    '^@/shared/(.*)$': '<rootDir>/../shared/$1',
    '^shared/(.*)$': '<rootDir>/../shared/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  coverageDirectory: '<rootDir>/../coverage',
  collectCoverageFrom: ['<rootDir>/**/*.ts', '!<rootDir>/**/*.d.ts'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.server.js'],
  snapshotSerializers: ['@emotion/jest/serializer'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleDirectories: ['node_modules', 'src'],
};
