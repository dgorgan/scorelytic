import { createClient } from '@supabase/supabase-js';
import { DemoReview } from '@scorelytic/shared';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const fetchDemoReviews = async (): Promise<DemoReview[]> => {
  const { data, error } = await supabase
    .from('demo_reviews')
    .select('id, video_url, data, metadata, slug')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const fetchDemoReviewSlugs = async (): Promise<string[]> => {
  const { data, error } = await supabase.from('demo_reviews').select('slug');
  if (error) throw error;
  return (data || []).map((r: any) => r.slug);
};

export const fetchDemoReviewBySlug = async (slug: string): Promise<DemoReview | null> => {
  const { data, error } = await supabase
    .from('demo_reviews')
    .select('id, video_url, data, metadata, slug')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data || null;
};

// Generic fetcher for SWR or server usage
export const fetcher = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (err: any) {
    // Optionally log or handle error globally
    throw err;
  }
};
