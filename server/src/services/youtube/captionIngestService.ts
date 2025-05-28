import { Review } from '../../../../shared/types/Review';
import { getSubtitles } from 'youtube-captions-scraper';
import { supabase } from '../../config/database';
import { toSnake } from '../../utils/caseMapping';

/**
 * Fetches captions for a given YouTube video ID.
 * Returns the transcript as a string.
 */
export const fetchYoutubeCaptions = async (videoId: string): Promise<string> => {
  try {
    console.debug(`[YT] Fetching captions for videoId: ${videoId}`);
    const captions = await getSubtitles({ videoID: videoId, lang: 'en' });
    console.debug(`[YT] Raw captions result:`, captions);
    
    if (!captions || captions.length === 0) {
      throw new Error('No English captions available. Video may not have captions or may be in a different language.');
    }
    
    const transcript = captions.map((c: { text: string }) => c.text).join(' ');
    
    if (transcript.trim().length === 0) {
      throw new Error('Captions found but transcript is empty.');
    }
    
    return transcript;
  } catch (err: any) {
    console.debug(`[YT] Error fetching captions:`, err);
    
    // Handle specific error cases
    if (err.message?.includes('Video unavailable')) {
      throw new Error(`Video ${videoId} is unavailable. It may be private, deleted, or region-blocked.`);
    }
    if (err.message?.includes('No captions')) {
      throw new Error(`No captions available for video ${videoId}. Video may not have subtitles enabled.`);
    }
    if (err.message?.includes('No English captions')) {
      throw err; // Re-throw our custom error
    }
    
    throw new Error(`Failed to fetch captions for ${videoId}: ${err.message}`);
  }
};

// Helper: lookup or create game by slug
const getOrCreateGame = async (slug: string, title?: string): Promise<string> => {
  const { data, error } = await supabase.from('games').select('id').eq('slug', slug).single();
  if (data?.id) return data.id;
  if (error && error.code !== 'PGRST116') throw new Error(`Game lookup failed: ${error.message}`);
  // Auto-create minimal game
  const insert = {
    slug,
    title: title || slug,
    description: 'Auto-created by ingest',
    coverArtUrl: '',
    releaseDate: '1970-01-01',
    metaCriticScore: 0,
    contentCriticScore: 0
  };
  const { data: newGame, error: insertErr } = await supabase.from('games').insert([toSnake(insert)]).select('id').single();
  if (insertErr) throw new Error(`Game auto-create failed: ${insertErr.message}`);
  return newGame.id;
};

// Helper: lookup or create creator by slug or channelUrl
const getOrCreateCreator = async (slug: string, channelUrl?: string, name?: string): Promise<string> => {
  const { data, error } = await supabase.from('creators').select('id').eq('slug', slug).single();
  if (data?.id) return data.id;
  if (error && error.code !== 'PGRST116') throw new Error(`Creator lookup failed: ${error.message}`);
  // Auto-create minimal creator
  const insert = {
    slug,
    name: name || slug,
    avatarUrl: '',
    bio: 'Auto-created by ingest',
    channelUrl: channelUrl || ''
  };
  const { data: newCreator, error: insertErr } = await supabase.from('creators').insert([toSnake(insert)]).select('id').single();
  if (insertErr) throw new Error(`Creator auto-create failed: ${insertErr.message}`);
  return newCreator.id;
};

/**
 * Normalizes YouTube data into a Review shape (production: dynamic lookup/creation)
 */
export const normalizeYoutubeToReview = async (params: {
  videoId: string;
  transcript: string;
  gameSlug: string;
  creatorSlug: string;
  channelUrl?: string;
  gameTitle?: string;
  creatorName?: string;
  publishedAt?: string;
}): Promise<Partial<Review>> => {
  // Lookup or create game/creator
  const gameId = await getOrCreateGame(params.gameSlug, params.gameTitle);
  const creatorId = await getOrCreateCreator(params.creatorSlug, params.channelUrl, params.creatorName);
  return {
    gameId,
    creatorId,
    videoUrl: `https://www.youtube.com/watch?v=${params.videoId}`,
    score: 0,
    pros: [],
    cons: [],
    sentimentSummary: '',
    biasIndicators: [],
    alsoRecommends: [],
    createdAt: new Date().toISOString(),
    transcript: params.transcript,
    reviewSummary: '',
  };
};

/**
 * Upserts a Review into Supabase (stub)
 * TODO: Implement actual Supabase insert/upsert logic
 */
export const upsertReviewToSupabase = async (review: Partial<Review>): Promise<void> => {
  const { error } = await supabase.from('reviews').upsert([toSnake(review)], { onConflict: 'video_url' });
  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
};
