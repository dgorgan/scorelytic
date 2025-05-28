import nextJest from 'next/jest.js';
import * as path from 'path';

const createJestConfig = nextJest({
  dir: path.resolve(__dirname), // Use absolute path to client/
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jsdom',
  testMatch: ['**/?(*.)+(test).[jt]s?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^shared/types/(.*)$': '<rootDir>/../shared/types/$1.ts',
    '^shared/constants/(.*)$': '<rootDir>/../shared/constants/$1.ts',
    '^shared/utils/(.*)$': '<rootDir>/../shared/utils/$1.ts',
    '^shared/(.*)$': '<rootDir>/../shared/$1',
    '^shared/types/biasReport$': '<rootDir>/../shared/types/biasReport.ts',
  },
};

export default createJestConfig(customJestConfig);
