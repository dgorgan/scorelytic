-- Add description and contentCriticScore columns to games table
alter table games
  add column if not exists description text not null default '',
  add column if not exists contentCriticScore float; 