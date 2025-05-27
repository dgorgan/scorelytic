-- Create base tables for Scorelytic

CREATE TABLE IF NOT EXISTS games (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text not null,
  cover_art_url text not null,
  release_date date not null,
  meta_critic_score int,
  content_critic_score float
);

CREATE TABLE IF NOT EXISTS creators (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  avatar_url text not null,
  bio text,
  channel_url text not null
);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id) on delete cascade,
  creator_id uuid references creators(id) on delete cascade,
  video_url text not null,
  score float not null,
  pros text[],
  cons text[],
  sentiment_summary text,
  bias_indicators text[],
  also_recommends text[],
  created_at timestamptz not null default now()
); 