import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { cleanEnv, str, url } from 'envalid';

console.log('[DEBUG] process.env.SUPABASE_URL:', process.env.SUPABASE_URL);
console.log(
  '[DEBUG] process.env.SUPABASE_SERVICE_ROLE_KEY:',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const env = cleanEnv(process.env, {
  SUPABASE_URL: url(),
  SUPABASE_SERVICE_ROLE_KEY: str(),
});
console.log('[DEBUG] envalid result:', env);

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
