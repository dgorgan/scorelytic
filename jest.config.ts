import type { Config } from 'jest';

const config: Config = {
  testTimeout: 10000,
  projects: [
    {
      displayName: 'server',
      preset: 'ts-jest',
      testEnvironment: 'node',
      globals: {
        'ts-jest': {
          useESM: true
        }
      },
      testMatch: ['<rootDir>/server/**/*.test.ts', '<rootDir>/shared/**/*.test.ts'],
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          tsconfig: '<rootDir>/server/tsconfig.json',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          moduleResolution: 'node'
        }]
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.server.js'],
      moduleNameMapper: {
        '^@/shared/(.*)$': '<rootDir>/shared/$1',
        '^@/(.*)$': '<rootDir>/server/src/$1',
        '^shared/(.*)$': '<rootDir>/shared/$1',
        '^shared/types/biasReport$': '<rootDir>/shared/types/biasReport.ts',
      }
    },
    {
      displayName: 'client',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      globals: {
        'ts-jest': {
          useESM: true
        }
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: '<rootDir>/client/tsconfig.json',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          moduleResolution: 'node'
        }]
      },
      transformIgnorePatterns: [
        '/node_modules/'
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.client.js'],
      moduleNameMapper: {
        '^@/services/(.*)$': '<rootDir>/client/services/$1',
        '^@/shared/(.*)$': '<rootDir>/shared/$1',
        '^@/(.*)$': '<rootDir>/$1',
        '^@/server/(.*)$': '<rootDir>/../server/src/$1',
        '^@/client/(.*)$': '<rootDir>/$1',
        '^shared/(.*)$': '<rootDir>/shared/$1'
      },
      testMatch: ['<rootDir>/client/**/*.test.ts', '<rootDir>/client/**/*.test.tsx'],
    }
  ]
};

export default config;
