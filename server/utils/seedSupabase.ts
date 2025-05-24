import { supabase } from '../config/database';
import { Game } from '../models/Game';
import { Creator } from '../models/Creator';
import { Review } from '../models/Review';

export async function seedSupabase() {
  // Seed games
  const games: Game[] = [
    {
      id: 'game-1',
      title: 'Elden Ring',
      slug: 'elden-ring',
      coverArtUrl: 'https://example.com/eldenring.jpg',
      releaseDate: '2022-02-25',
      metaCriticScore: 95,
    },
    {
      id: 'game-2',
      title: 'The Witcher 3',
      slug: 'the-witcher-3',
      coverArtUrl: 'https://example.com/witcher3.jpg',
      releaseDate: '2015-05-19',
      metaCriticScore: 92,
    },
  ];
  await supabase.from('games').upsert(games);

  // Seed creators
  const creators: Creator[] = [
    {
      id: 'creator-1',
      name: 'Skill Up',
      slug: 'skill-up',
      avatarUrl: 'https://example.com/skillup.jpg',
      bio: 'Game reviewer and YouTuber.',
      channelUrl: 'https://youtube.com/skillup',
    },
    {
      id: 'creator-2',
      name: 'AngryJoeShow',
      slug: 'angryjoe',
      avatarUrl: 'https://example.com/angryjoe.jpg',
      bio: 'Game reviews with attitude.',
      channelUrl: 'https://youtube.com/angryjoe',
    },
  ];
  await supabase.from('creators').upsert(creators);

  // Seed reviews
  const reviews: Review[] = [
    {
      id: 'review-1',
      gameId: 'game-1',
      creatorId: 'creator-1',
      videoUrl: 'https://youtube.com/eldenringreview',
      score: 9.5,
      pros: ['Open world', 'Combat', 'Atmosphere'],
      cons: ['Difficulty'],
      sentimentSummary: 'Overwhelmingly positive',
      biasIndicators: [],
      alsoRecommends: ['The Witcher 3'],
      createdAt: '2022-03-01T12:00:00Z',
    },
    {
      id: 'review-2',
      gameId: 'game-2',
      creatorId: 'creator-2',
      videoUrl: 'https://youtube.com/witcher3review',
      score: 9.2,
      pros: ['Story', 'World', 'Quests'],
      cons: ['Bugs'],
      sentimentSummary: 'Very positive',
      biasIndicators: [],
      alsoRecommends: ['Elden Ring'],
      createdAt: '2015-06-01T12:00:00Z',
    },
  ];
  await supabase.from('reviews').upsert(reviews);
} 