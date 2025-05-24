-- Games table
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  coverArtUrl text not null,
  releaseDate date not null,
  metaCriticScore int
);

-- Creators table
create table if not exists creators (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  avatarUrl text not null,
  bio text,
  channelUrl text not null
);

-- Reviews table
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  gameId uuid references games(id) on delete cascade,
  creatorId uuid references creators(id) on delete cascade,
  videoUrl text not null,
  score float not null,
  pros text[],
  cons text[],
  sentimentSummary text,
  biasIndicators text[],
  alsoRecommends text[],
  createdAt timestamptz not null default now()
); 