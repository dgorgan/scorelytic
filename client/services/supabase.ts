import { createClient } from '@supabase/supabase-js';
import { cleanEnv, str, url } from 'envalid';

const env = cleanEnv(process.env, {
  NEXT_PUBLIC_SUPABASE_URL: url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: str(),
});

export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
