-- Add sentiment column to reviews table if it doesn't exist
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS sentiment JSONB; 