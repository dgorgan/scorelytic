-- Create table for human-in-the-loop LLM review overrides
create table if not exists llm_review_overrides (
  id uuid primary key default gen_random_uuid(),
  review_id text not null,
  field text not null,
  llm text not null,
  similarity text,
  updated_at timestamp with time zone default now(),
  unique (review_id, field)
);