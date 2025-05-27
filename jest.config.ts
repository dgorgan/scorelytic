import type { Config } from 'jest';

const config: Config = {
  testTimeout: 10000,
  projects: [
    {
      displayName: 'server',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/server/**/*.test.ts'],
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          tsconfig: {
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            moduleResolution: 'node'
          }
        }]
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/server/src/$1',
        '^shared/(.*)$': '<rootDir>/shared/$1'
      }
    },
    {
      displayName: 'client',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
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
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/client/$1',
        '^shared/(.*)$': '<rootDir>/shared/$1'
      }
    }
  ]
};

export default config;
