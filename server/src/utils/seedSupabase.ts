import { supabase } from '../config/database';
import { Game } from '../models/Game';
import { Creator } from '../models/Creator';
import { Review } from '../models/Review';
import { toCamel, toSnake } from './caseMapping';

async function resetTables() {
  if (process.env.NODE_ENV === 'production') {
    console.warn('Reset skipped: running in production environment.');
    return;
  }
  console.log('Resetting tables...');
  await supabase.from('reviews').delete().neq('id', '');
  await supabase.from('creators').delete().neq('id', '');
  await supabase.from('games').delete().neq('id', '');
  console.log('Tables reset.');
}

export async function seedSupabase() {
  await resetTables();

  // Seed games
  const games: Omit<Game, 'id'>[] = [
    {
      title: 'Elden Ring',
      slug: 'elden-ring',
      description: 'A vast, open-world action RPG from FromSoftware.',
      coverArtUrl: 'https://example.com/eldenring.jpg',
      releaseDate: '2022-02-25',
      metaCriticScore: 95,
      contentCriticScore: 93,
    },
    {
      title: 'The Witcher 3',
      slug: 'the-witcher-3',
      description: 'A story-driven open world RPG set in a visually stunning fantasy universe.',
      coverArtUrl: 'https://example.com/witcher3.jpg',
      releaseDate: '2015-05-19',
      metaCriticScore: 92,
      contentCriticScore: 90,
    },
  ];
  console.log('Starting to upsert games');
  const { error: gamesError } = await supabase.from('games').upsert(toSnake(games));
  if (gamesError) {
    console.error('Games insert error:', gamesError);
  }
  console.log('Finished upserting games');

  // Fetch game IDs by slug
  const gameSlugs = games.map(g => g.slug);
  const { data: rawGamesFetched, error: fetchGamesError } = await supabase.from('games').select('id,slug').in('slug', gameSlugs);
  if (fetchGamesError) {
    console.error('Error fetching games by slug:', fetchGamesError);
    return;
  }
  const gamesFetched = rawGamesFetched ? toCamel(rawGamesFetched) : [];
  const gameIdMap = Object.fromEntries(gamesFetched.map((g: any) => [g.slug, g.id]));

  // Seed creators
  const creators: Omit<Creator, 'id'>[] = [
    {
      name: 'Skill Up',
      slug: 'skill-up',
      avatarUrl: 'https://example.com/skillup.jpg',
      bio: 'Game reviewer and YouTuber.',
      channelUrl: 'https://youtube.com/skillup',
    },
    {
      name: 'AngryJoeShow',
      slug: 'angryjoe',
      avatarUrl: 'https://example.com/angryjoe.jpg',
      bio: 'Game reviews with attitude.',
      channelUrl: 'https://youtube.com/angryjoe',
    },
  ];
  console.log('Starting to upsert creators');
  const { error: creatorsError } = await supabase.from('creators').upsert(toSnake(creators));
  if (creatorsError) {
    console.error('Creators insert error:', creatorsError);
  }
  console.log('Finished upserting creators');

  // Fetch creator IDs by slug
  const creatorSlugs = creators.map(c => c.slug);
  const { data: rawCreatorsFetched, error: fetchCreatorsError } = await supabase.from('creators').select('id,slug').in('slug', creatorSlugs);
  if (fetchCreatorsError) {
    console.error('Error fetching creators by slug:', fetchCreatorsError);
    return;
  }
  const creatorsFetched = rawCreatorsFetched ? toCamel(rawCreatorsFetched) : [];
  const creatorIdMap = Object.fromEntries(creatorsFetched.map((c: any) => [c.slug, c.id]));

  // Seed reviews
  const reviews: Omit<Review, 'id'>[] = [
    {
      gameId: gameIdMap['elden-ring'],
      creatorId: creatorIdMap['skill-up'],
      videoUrl: 'https://youtube.com/eldenringreview',
      score: 9.5,
      pros: ['Open world', 'Combat', 'Atmosphere'],
      cons: ['Difficulty'],
      sentimentSummary: 'Overwhelmingly positive',
      biasIndicators: [],
      alsoRecommends: ['The Witcher 3'],
      createdAt: '2022-03-01T12:00:00Z',
      transcript: 'Elden Ring is a masterpiece of open world design. The combat is challenging but rewarding, and the world is full of secrets. Highly recommended for fans of FromSoftware games.'
    },
    {
      gameId: gameIdMap['the-witcher-3'],
      creatorId: creatorIdMap['angryjoe'],
      videoUrl: 'https://youtube.com/witcher3review',
      score: 9.2,
      pros: ['Story', 'World', 'Quests'],
      cons: ['Bugs'],
      sentimentSummary: 'Very positive',
      biasIndicators: [],
      alsoRecommends: ['Elden Ring'],
      createdAt: '2015-06-01T12:00:00Z',
      transcript: 'The Witcher 3 sets a new standard for RPGs. The story and world are incredible, though there are some bugs. Still, it is one of the best games ever made.'
    },
  ];
  console.log('Starting to upsert reviews');
  const { data: rawReviews, error: reviewsError } = await supabase.from('reviews').upsert(toSnake(reviews)).select();
  const insertedReviews = rawReviews ? toCamel(rawReviews) : null;
  if (reviewsError) {
    console.error('Reviews insert error:', reviewsError);
  } else {
    console.log('Inserted reviews:', insertedReviews);
  }
  console.log('Finished upserting reviews');
  console.log('Seeding reviews complete.');
}

seedSupabase(); 