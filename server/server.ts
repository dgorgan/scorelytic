import app from './app';
import dotenv from 'dotenv';

dotenv.config();
console.log('Supabase URL:', process.env.SUPABASE_URL);
console.log('Supabase Service Role Key (partial):', process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 8));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
