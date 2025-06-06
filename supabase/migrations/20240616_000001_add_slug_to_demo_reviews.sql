-- Add slug column for pretty URLs (nullable at first)
alter table demo_reviews add column slug text;

-- Backfill slugs from game title in JSON, using double backslashes for Postgres regex
update demo_reviews
set slug = regexp_replace(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        lower(data->'metadata'->>'title'),
        '[^a-z0-9]+', ' ', 'g'
      ),
      '\\s+', '-', 'g'
    ),
    '-+', '-', 'g'
  ),
  '(^-+|-+$)', '', 'g'
)
where slug is null or slug = '';

-- Enforce NOT NULL
alter table demo_reviews alter column slug set not null;

-- Enforce uniqueness
create unique index demo_reviews_slug_key on demo_reviews(slug);