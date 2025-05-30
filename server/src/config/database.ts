import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { cleanEnv, str, url } from 'envalid';

const env = cleanEnv(process.env, {
  SUPABASE_URL: url(),
  SUPABASE_SERVICE_ROLE_KEY: str(),
});

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
