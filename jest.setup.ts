import '@testing-library/jest-dom';
require('dotenv').config();
require('openai/shims/node');

// Add ResizeObserver polyfill for Recharts
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock supabase client everywhere
jest.mock('@supabase/supabase-js', () => {
  const actual = jest.requireActual('@supabase/supabase-js');
  return {
    ...actual,
    createClient: jest.fn(() => ({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        then: jest.fn(),
      })),
    })),
  };
});
