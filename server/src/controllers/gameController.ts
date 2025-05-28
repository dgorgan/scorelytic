import { Request, Response } from 'express';
import { supabase } from '../config/database';

const getGames = (req: Request, res: Response) => {
  res.status(200).json([{ id: 1, title: 'Game 1' }, { id: 2, title: 'Game 2' }]);
};

const getGameById = async (req: Request, res: Response) => {
  const { id } = req.params;
  // Fetch game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .single();
  if (gameError || !game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  // Fetch reviews for the game, most recent first
  const { data: reviews, error: reviewsError } = await supabase
    .from('reviews')
    .select('*')
    .eq('gameId', id)
    .order('createdAt', { ascending: false });
  if (reviewsError) {
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
  // Fetch creators for these reviews
  const creatorIds = [...new Set(reviews.map((r: any) => r.creatorId))];
  let creators: any[] = [];
  if (creatorIds.length > 0) {
    const { data: creatorsData, error: creatorsError } = await supabase
      .from('creators')
      .select('*')
      .in('id', creatorIds);
    if (creatorsError) {
      return res.status(500).json({ error: 'Failed to fetch creators' });
    }
    creators = creatorsData;
  }
  // Attach creator info to each review
  const creatorMap = Object.fromEntries(creators.map((c: any) => [c.id, c]));
  const reviewsWithCreators = reviews.map((r: any) => ({
    ...r,
    creator: creatorMap[r.creatorId] || null
  }));
  // Sentiment summary
  const avgScore = reviews.length
    ? reviews.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / reviews.length
    : null;
  const sentimentSummaries = Array.from(new Set(reviews.map((r: any) => r.sentimentSummary)));
  res.status(200).json({
    game,
    reviews: reviewsWithCreators,
    averageSentimentScore: avgScore,
    sentimentSummaries
  });
};

export const gameController = {
  getGames,
  getGameById
};
