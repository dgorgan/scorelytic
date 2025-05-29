import { seedSupabase } from '../seedSupabase';
import { supabase } from '../../config/database';

jest.mock('../../config/database', () => {
  const chain: any = {
    upsert: jest.fn(() => ({
      error: null,
      select: jest.fn(() => ({ data: [], error: null })),
    })),
    delete: jest.fn(() => ({ neq: jest.fn(() => ({ error: null })) })),
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    in: jest.fn(() => chain),
    order: jest.fn(() => chain),
    single: jest.fn(async () => ({ data: {}, error: null })),
  };
  return {
    supabase: {
      from: jest.fn(() => chain),
    },
  };
});

describe('seedSupabase', () => {
  it('should upsert games, creators, and reviews', async () => {
    await expect(seedSupabase()).resolves.not.toThrow();
    expect(supabase.from).toHaveBeenCalledWith('games');
    expect(supabase.from).toHaveBeenCalledWith('creators');
    expect(supabase.from).toHaveBeenCalledWith('reviews');
  });
});
