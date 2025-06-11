import { Review } from '@scorelytic/shared';
import { getSubtitles } from 'youtube-captions-scraper';
import { supabase } from '@/config/database';
import { toSnake } from '@/utils/caseMapping';

/**
 * Fetches captions for a given YouTube video ID.
 * Returns the transcript as a string.
 */
export const fetchYoutubeCaptions = async (
  videoId: string,
  language: string = 'en',
): Promise<string> => {
  const fallbackLangs = ['es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko'];
  try {
    console.debug(`[YT] Fetching captions for videoId: ${videoId}, lang: ${language}`);
    // Try English first
    let captions = await getSubtitles({ videoID: videoId, lang: language });
    if (captions && captions.length > 0) {
      const transcript = captions.map((c: { text: string }) => c.text).join(' ');
      if (transcript.trim().length > 0) {
        console.debug(`[YT] Captions found in ${language}`);
        return transcript;
      }
    }
    // Try first 4 fallback languages in parallel
    const parallelLangs = fallbackLangs.slice(0, 4).filter((l) => l !== language);
    const parallelPromises = parallelLangs.map((langCode) =>
      getSubtitles({ videoID: videoId, lang: langCode })
        .then((altCaptions) => {
          if (altCaptions && altCaptions.length > 0) {
            const altTranscript = altCaptions.map((c: { text: string }) => c.text).join(' ');
            if (altTranscript.trim().length > 0) {
              console.debug(`[YT] Captions found in ${langCode} (parallel batch)`);
              return { transcript: altTranscript, lang: langCode };
            }
          }
          throw new Error('No transcript');
        })
        .catch(() => null),
    );
    const parallelResults = await Promise.allSettled(parallelPromises);
    const firstSuccess = parallelResults.find(
      (r) => r.status === 'fulfilled' && r.value && r.value.transcript,
    );
    if (firstSuccess && firstSuccess.status === 'fulfilled' && firstSuccess.value) {
      return firstSuccess.value.transcript;
    }
    // Try the rest serially
    for (const langCode of fallbackLangs.slice(4)) {
      if (langCode === language) continue;
      try {
        console.debug(`[YT] Trying captions in language: ${langCode}`);
        const altCaptions = await getSubtitles({ videoID: videoId, lang: langCode });
        if (altCaptions && altCaptions.length > 0) {
          const altTranscript = altCaptions.map((c: { text: string }) => c.text).join(' ');
          if (altTranscript.trim().length > 0) {
            console.debug(`[YT] Captions found in ${langCode} (serial)`);
            return altTranscript;
          }
        }
      } catch (err) {
        console.debug(`[YT] Error fetching captions for lang ${langCode}:`, err);
      }
    }
    throw new Error('No captions available in any language.');
  } catch (err: any) {
    console.debug(`[YT] Error fetching captions:`, err);
    // Handle specific error cases
    if (err.message?.includes('Video unavailable')) {
      throw new Error(
        `Video ${videoId} is unavailable. It may be private, deleted, or region-blocked.`,
      );
    }
    if (err.message?.includes('No captions')) {
      throw new Error(
        `No captions available for video ${videoId}. Video may not have subtitles enabled.`,
      );
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
    contentCriticScore: 0,
  };
  const { data: newGame, error: insertErr } = await supabase
    .from('games')
    .insert([toSnake(insert)])
    .select('id')
    .single();
  if (insertErr) throw new Error(`Game auto-create failed: ${insertErr.message}`);
  return newGame.id;
};

// Helper: lookup or create creator by slug or channelUrl
const getOrCreateCreator = async (
  slug: string,
  channelUrl?: string,
  name?: string,
): Promise<string> => {
  const { data, error } = await supabase.from('creators').select('id').eq('slug', slug).single();
  if (data?.id) return data.id;
  if (error && error.code !== 'PGRST116')
    throw new Error(`Creator lookup failed: ${error.message}`);
  // Auto-create minimal creator
  const insert = {
    slug,
    name: name || slug,
    avatarUrl: '',
    bio: 'Auto-created by ingest',
    channelUrl: channelUrl || '',
  };
  const { data: newCreator, error: insertErr } = await supabase
    .from('creators')
    .insert([toSnake(insert)])
    .select('id')
    .single();
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
  const creatorId = await getOrCreateCreator(
    params.creatorSlug,
    params.channelUrl,
    params.creatorName,
  );
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
  // Remove any fields not in the DB schema
  const {
    _youtubeMeta, // strip this
    transcriptDebug, // strip if not in schema
    transcriptError, // strip if not in schema
    ...reviewForDb
  } = review as any;
  const { error } = await supabase
    .from('reviews')
    .upsert([toSnake(reviewForDb)], { onConflict: 'video_url' });
  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
};

/**
 * Bulletproof upsert for demo_reviews. Never throws, only logs errors.
 */
export const upsertDemoReview = async (
  videoUrl: string,
  data: any,
  slug: string,
  transcript?: string,
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('demo_reviews')
      .upsert([{ video_url: videoUrl, data, slug, transcript }], { onConflict: 'video_url' });
    if (error) {
      // Log but never throw
      // eslint-disable-next-line no-console
      console.error('Demo review upsert failed:', error.message);
    }
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('Demo review upsert crashed:', err.message);
  }
};
