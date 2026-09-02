-- Games table
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text not null,
  coverArtUrl text not null,
  releaseDate date not null,
  metaCriticScore int,
  contentCriticScore float
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

-- Reviews table
create table public.demo_reviews (
  id uuid not null default gen_random_uuid (),
  video_url text not null,
  data jsonb not null (this is our sentiment, biasIndicators, biasAdjustment, sentimentSnapshot, etc.),
  created_at timestamp with time zone not null default now(),
  slug text not null (from the video title, game title, game slug, etc.),
  transcript text null,
  metadata jsonb null (I added game title, game slug, etc. just in case),
  constraint demo_reviews_pkey primary key (id),
  constraint demo_reviews_video_url_key unique (video_url)
) TABLESPACE pg_default;

create unique INDEX IF not exists demo_reviews_slug_key on public.demo_reviews using btree (slug) TABLESPACE pg_default;