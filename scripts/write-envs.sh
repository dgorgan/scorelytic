#!/usr/bin/env bash

# Expects JSON stdin from GitHub Actions: echo '${{ toJson(env) }}' | bash ./scripts/write-envs.sh

set -e

mkdir -p client server

# Write client env
echo "$1" | jq -r '
  to_entries |
  map(select(.key | startswith("NEXT_PUBLIC_"))) |
  map("\(.key)=\(.value)") |
  .[]' > client/.env

cp client/.env client/.env.local

# Write server env
echo "$1" | jq -r '
  to_entries |
  map(select(.key | startswith("SUPABASE_") or
             startswith("SENTRY_") or
             startswith("LOGTAIL_") or
             .key=="OPENAI_API_KEY" or
             .key=="DISABLE_OPENAI" or
             .key=="LLM_PROMPT_STYLE" or
             .key=="PORT" or
             .key=="YOUTUBE_API_KEY")) |
  map("\(.key)=\(.value)") |
  .[]' > server/.env
