import type { Config } from 'jest';

const config: Config = {
  testTimeout: 10000,
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
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
      testMatch: ['<rootDir>/server/**/*.test.ts'],
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
        '^@/(.*)$': '<rootDir>/server/src/$1',
        '^shared/(.*)$': '<rootDir>/shared/$1'
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
      testMatch: ['<rootDir>/client/**/*.test.tsx', '<rootDir>/client/**/*.test.ts'],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: {
            jsx: 'react-jsx',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            moduleResolution: 'node'
          }
        }]
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.client.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/client/$1',
        '^shared/(.*)$': '<rootDir>/shared/$1'
      }
    }
  ]
};

export default config;
