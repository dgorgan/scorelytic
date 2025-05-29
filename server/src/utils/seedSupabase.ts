import { supabase } from '../config/database';
import { Game } from '../models/Game';
import { Creator } from '../models/Creator';
import { Review } from '../models/Review';
import { toCamel, toSnake } from './caseMapping';
import { harmonizeBias } from '@/shared/utils/bias-harmonizer';

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
  const { error: gamesError } = await supabase
    .from('games')
    .upsert(toSnake(games), { onConflict: 'slug' });
  if (gamesError) {
    console.error('Games insert error:', gamesError);
  }
  console.log('Finished upserting games');

  // Fetch game IDs by slug
  const gameSlugs = games.map((g) => g.slug);
  const { data: rawGamesFetched, error: fetchGamesError } = await supabase
    .from('games')
    .select('id,slug')
    .in('slug', gameSlugs);
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
  const { error: creatorsError } = await supabase
    .from('creators')
    .upsert(toSnake(creators), { onConflict: 'slug' });
  if (creatorsError) {
    console.error('Creators insert error:', creatorsError);
  }
  console.log('Finished upserting creators');

  // Fetch creator IDs by slug
  const creatorSlugs = creators.map((c) => c.slug);
  const { data: rawCreatorsFetched, error: fetchCreatorsError } = await supabase
    .from('creators')
    .select('id,slug')
    .in('slug', creatorSlugs);
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
      cons: ['Difficulty', 'Sparse story moments'],
      sentimentSummary: 'Overwhelmingly positive',
      biasIndicators: ['Fan of FromSoftware games'],
      alsoRecommends: ['The Witcher 3', 'Dark Souls 3'],
      createdAt: '2022-03-01T12:00:00Z',
      transcript: `Elden Ring is a masterpiece of open world design. The combat is challenging but rewarding, and the world is full of secrets. I spent over 100 hours exploring and still found new things. The difficulty may turn off some players, and the story can be sparse at times, but the sense of discovery is unmatched. As a long-time fan of FromSoftware, this is their best work yet. If you loved Dark Souls 3 or The Witcher 3, you'll love this.`,
      reviewSummary:
        'Elden Ring offers a vast, challenging world with rewarding exploration and combat. Best for fans of FromSoftware, but the difficulty and sparse story may not appeal to everyone.',
    },
    {
      gameId: gameIdMap['the-witcher-3'],
      creatorId: creatorIdMap['angryjoe'],
      videoUrl: 'https://youtube.com/witcher3review',
      score: 9.2,
      pros: ['Story', 'World', 'Quests'],
      cons: ['Bugs', 'Clunky combat'],
      sentimentSummary: 'Very positive',
      biasIndicators: ['Prefers story-driven games'],
      alsoRecommends: ['Elden Ring', 'Red Dead Redemption 2'],
      createdAt: '2015-06-01T12:00:00Z',
      transcript: `The Witcher 3 sets a new standard for RPGs. The story and world are incredible, and the quests are some of the best I've played. However, there are still bugs even after patches, and the combat can feel clunky. If you value story and world-building, this is a must-play. I recommend it to fans of Elden Ring and Red Dead Redemption 2. I do tend to prefer story-driven games, so keep that in mind.`,
      reviewSummary:
        'The Witcher 3 is a must-play for story lovers, with an incredible world and quests, but bugs and clunky combat hold it back. Recommended for those who value narrative over gameplay polish.',
    },
    {
      gameId: gameIdMap['elden-ring'],
      creatorId: creatorIdMap['angryjoe'],
      videoUrl: 'https://youtube.com/eldenringnegativereview',
      score: 5.5,
      pros: ['Visuals'],
      cons: ['Unfair difficulty', 'Lack of direction', 'Repetitive bosses'],
      sentimentSummary: 'Mixed to negative',
      biasIndicators: ['Prefers accessible games', 'Not a fan of Soulslikes'],
      alsoRecommends: ['The Legend of Zelda: Breath of the Wild'],
      createdAt: '2022-04-01T12:00:00Z',
      transcript: `I know a lot of people love Elden Ring, but I just couldn't get into it. The visuals are great, but the difficulty feels unfair and the game gives you almost no direction. I found myself fighting the same types of bosses over and over. Maybe it's just not for me—I'm not a big fan of Soulslike games and prefer more accessible experiences. If you want a challenging game, go for it, but I recommend Breath of the Wild for a more welcoming adventure.`,
      reviewSummary:
        'Elden Ring is visually stunning but can be frustratingly difficult and repetitive. Not recommended for those who dislike Soulslike games or want a more guided experience.',
    },
    {
      gameId: gameIdMap['the-witcher-3'],
      creatorId: creatorIdMap['skill-up'],
      videoUrl: 'https://youtube.com/witcher3mixedreview',
      score: 7.0,
      pros: ['Story', 'Side quests'],
      cons: ['Combat', 'UI', 'Performance issues'],
      sentimentSummary: 'Mixed',
      biasIndicators: ['Critical of technical issues'],
      alsoRecommends: ['Cyberpunk 2077'],
      createdAt: '2016-01-01T12:00:00Z',
      transcript: `The Witcher 3 is a great game, but it's not perfect. The story and side quests are top-notch, but the combat system is mediocre and the UI is clunky. I also ran into performance issues on my PC. I know some people overlook these flaws because of the narrative, but I think they matter. If you can get past the technical problems, you'll have a good time. If you want a more polished experience, try Cyberpunk 2077.`,
      reviewSummary:
        'The Witcher 3 shines in story and side quests, but technical flaws and mediocre combat may frustrate some players. Worth playing if you can overlook the issues.',
    },
    {
      gameId: gameIdMap['elden-ring'],
      creatorId: creatorIdMap['skill-up'],
      videoUrl: 'https://youtube.com/eldenring-psfan',
      score: 8.0,
      pros: ['Visuals', 'Combat'],
      cons: ['Performance on PS5'],
      sentimentSummary: 'Positive with platform bias',
      biasIndicators: ['PlayStation fan', 'Platform loyalty'],
      alsoRecommends: ['Bloodborne'],
      createdAt: '2022-05-01T12:00:00Z',
      transcript: `As a long-time PlayStation fan, I was excited to play Elden Ring on PS5. The visuals and combat are fantastic, but I did notice some performance issues compared to my friends on PC. I might be a bit biased, since I loved Bloodborne and FromSoftware's PlayStation exclusives. Still, it's a great game.`,
      reviewSummary:
        'Great game, but PlayStation performance issues hold it back a bit for platform loyalists.',
    },
    {
      gameId: gameIdMap['the-witcher-3'],
      creatorId: creatorIdMap['angryjoe'],
      videoUrl: 'https://youtube.com/witcher3-nostalgia',
      score: 9.8,
      pros: ['Nostalgic story', 'Music'],
      cons: ['Dated graphics'],
      sentimentSummary: 'Overwhelmingly positive (nostalgia)',
      biasIndicators: ['Nostalgia', 'Played original as a kid'],
      alsoRecommends: ['The Witcher 2'],
      createdAt: '2015-07-01T12:00:00Z',
      transcript: `Having played the original Witcher as a kid, this game hit all the right notes for me. The story and music brought back so many memories. The graphics are a bit dated now, but my nostalgia probably bumps up my score. If you loved the earlier games, you'll love this.`,
      reviewSummary:
        'A must-play for fans of the original, with nostalgia amplifying the experience.',
    },
    {
      gameId: gameIdMap['elden-ring'],
      creatorId: creatorIdMap['angryjoe'],
      videoUrl: 'https://youtube.com/eldenring-sponsored',
      score: 9.0,
      pros: ['Expansive world', 'Replay value'],
      cons: ['Steep learning curve'],
      sentimentSummary: 'Positive (sponsored)',
      biasIndicators: ['Sponsored review', 'Potential promotional bias'],
      alsoRecommends: ['Sekiro'],
      createdAt: '2022-06-01T12:00:00Z',
      transcript: `Full disclosure: this review was sponsored by Bandai Namco. Elden Ring offers an expansive world and tons of replay value. The learning curve is steep, but I had a blast. Keep in mind, this is a sponsored review, but I genuinely enjoyed my time.`,
      reviewSummary: 'Expansive and replayable, but note the sponsored context.',
    },
    {
      gameId: gameIdMap['the-witcher-3'],
      creatorId: creatorIdMap['skill-up'],
      videoUrl: 'https://youtube.com/witcher3-genre-aversion',
      score: 6.5,
      pros: ['Story'],
      cons: ['Turn-based combat', 'Slow pacing'],
      sentimentSummary: 'Mixed (genre aversion)',
      biasIndicators: ['Not a fan of turn-based games', 'Genre aversion'],
      alsoRecommends: ['Mass Effect'],
      createdAt: '2016-02-01T12:00:00Z',
      transcript: `I usually hate turn-based games, and while The Witcher 3's story is great, the combat and pacing just aren't for me. Fans of the genre will probably love it, but I struggled to stay engaged.`,
      reviewSummary: 'Great story, but genre fans will enjoy it more than I did.',
    },
    {
      gameId: gameIdMap['elden-ring'],
      creatorId: creatorIdMap['skill-up'],
      videoUrl: 'https://youtube.com/eldenring-fatigue',
      score: 7.0,
      pros: ['Content', 'Boss variety'],
      cons: ['Repetitive', 'Burnout'],
      sentimentSummary: 'Mixed (reviewer fatigue)',
      biasIndicators: ['Reviewer fatigue', 'Burned out after 100 hours'],
      alsoRecommends: ['Dark Souls'],
      createdAt: '2022-07-01T12:00:00Z',
      transcript: `After 100 hours in Elden Ring, I'm just burned out. There's a ton of content and boss variety, but it started to feel repetitive. Maybe I just played too much, but I can't help but feel a bit fatigued.`,
      reviewSummary: 'Huge game, but can lead to burnout for completionists.',
    },
    {
      gameId: gameIdMap['the-witcher-3'],
      creatorId: creatorIdMap['angryjoe'],
      videoUrl: 'https://youtube.com/witcher3-contrarian',
      score: 5.0,
      pros: ['Side quests'],
      cons: ['Overhyped', 'Not for everyone'],
      sentimentSummary: 'Contrarian',
      biasIndicators: ['Contrarian take', 'Skeptical of hype'],
      alsoRecommends: ['Dragon Age'],
      createdAt: '2016-03-01T12:00:00Z',
      transcript: `Everyone seems to love The Witcher 3, but I just don't get it. The side quests are good, but I think the game is overhyped. Maybe it's just not for me, but I can't help but be skeptical of all the praise.`,
      reviewSummary: "Not for everyone—don't believe the hype if you're not already a fan.",
    },
    {
      gameId: gameIdMap['elden-ring'],
      creatorId: creatorIdMap['angryjoe'],
      videoUrl: 'https://youtube.com/eldenring-influencer',
      score: 8.5,
      pros: ['Community', 'Replay value'],
      cons: ['Pressure to like it'],
      sentimentSummary: 'Positive (influencer bias)',
      biasIndicators: ['Influencer bias', 'Audience expectation'],
      alsoRecommends: ['Bloodborne'],
      createdAt: '2022-08-01T12:00:00Z',
      transcript: `My audience loves this series, so I felt a bit of pressure to like Elden Ring more than I might have otherwise. The community is great and there's a lot of replay value, but I wonder if I'd rate it as highly without the influencer effect.`,
      reviewSummary: 'Great for the community, but influencer bias may affect the score.',
    },
  ].map((r) => ({
    ...r,
    pros: Array.isArray(r.pros) ? r.pros : [],
    cons: Array.isArray(r.cons) ? r.cons : [],
    alsoRecommends: Array.isArray(r.alsoRecommends) ? r.alsoRecommends : [],
    biasIndicators: harmonizeBias(r.biasIndicators || []),
    sentimentSummary: (r.sentimentSummary || '')
      .toLowerCase()
      .replace(/\s*\(.*\)/, '')
      .trim(),
    transcript: r.transcript || 'No transcript provided.',
    reviewSummary: r.reviewSummary || 'No summary provided.',
  }));
  console.log('Starting to upsert reviews');
  const { data: rawReviews, error: reviewsError } = await supabase
    .from('reviews')
    .upsert(toSnake(reviews), { onConflict: 'video_url' })
    .select();
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
