-- Create demo_reviews table for demo pipeline output
create table if not exists demo_reviews (
  id uuid primary key default gen_random_uuid(),
  video_url text unique not null,
  data jsonb not null, -- full pipeline output (matches your JSON example)
  created_at timestamptz not null default now()
); 