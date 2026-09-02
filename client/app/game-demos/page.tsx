import { fetchDemoReviews } from '@/services/supabase';
import GameDemosList from './GameDemosList';

export const revalidate = 60;

export default async function GameDemosPage() {
  const reviews = await fetchDemoReviews();
  return <GameDemosList initialReviews={reviews} />;
}
