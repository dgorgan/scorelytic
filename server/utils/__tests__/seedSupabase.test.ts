import { seedSupabase } from '../seedSupabase';
import { supabase } from '../../config/database';

jest.mock('../../config/database', () => ({
  supabase: {
    from: jest.fn(() => ({ upsert: jest.fn() })),
  },
}));

describe('seedSupabase', () => {
  it('should upsert games, creators, and reviews', async () => {
    await expect(seedSupabase()).resolves.not.toThrow();
    expect(supabase.from).toHaveBeenCalledWith('games');
    expect(supabase.from).toHaveBeenCalledWith('creators');
    expect(supabase.from).toHaveBeenCalledWith('reviews');
  });
}); 