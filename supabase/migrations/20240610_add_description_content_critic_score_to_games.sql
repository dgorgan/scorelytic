-- Add description and contentCriticScore columns to games table
alter table games
  add column description text not null default '',
  add column contentCriticScore float; 