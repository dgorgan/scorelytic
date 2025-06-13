'use client';
import useSWR from 'swr';
import { DemoReview } from '@scorelytic/shared/types';
import { fetchDemoReviews } from '@/services/supabase';
import Loader from '@/components/Loader';
import GameCard from '@/components/GameCard';
import { fetcher } from '@/services/supabase';
import { slugify } from '@/lib/slugify';
import SkeletonCard from '@/components/SkeletonCard';

interface GameDemosListProps {
  initialReviews: DemoReview[];
}

export default function GameDemosList({ initialReviews }: GameDemosListProps) {
  const {
    data: reviews = [],
    error,
    isLoading,
  } = useSWR('demo_reviews', () => fetchDemoReviews(), {
    fallbackData: initialReviews,
    revalidateOnFocus: false,
    fetcher,
  });
  if (isLoading)
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-9">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </main>
    );
  if (error)
    return <div className="text-center text-red-500 mt-20">Failed to load demo reviews.</div>;
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-center mb-14 flex flex-col xs:flex-row items-center justify-center gap-2 xs:gap-4 font-orbitron uppercase tracking-wide">
        <span className="text-4xl sm:text-5xl drop-shadow-lg">🎮</span>
        <span className="text-4xl sm:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-violet-300 via-fuchsia-400 to-violet-600 drop-shadow-lg tracking-tight relative font-orbitron uppercase">
          Game Review{' '}
          <span className="relative text-white font-black px-2 font-orbitron uppercase">
            Demos
            <span className="absolute left-0 right-0 -bottom-1 h-1 bg-gradient-to-r from-fuchsia-400 to-violet-500 rounded-full blur-sm opacity-70 animate-pulse" />
          </span>
        </span>
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-9">
        {reviews.map((review) => {
          const meta = review.metadata || {};
          const thumb =
            meta.thumbnails?.maxres?.url ||
            meta.thumbnails?.high?.url ||
            meta.thumbnails?.default?.url ||
            '/game-case-placeholder.png';
          const slug = review.slug || (meta.title ? slugify(meta.title) : review.id);
          return (
            <GameCard
              key={review.id}
              id={review.id}
              slug={slug}
              thumb={thumb}
              title={meta.title || 'Untitled Game'}
              channelTitle={meta.channelTitle || 'Unknown Channel'}
              releaseYear={meta.publishedAt ? new Date(meta.publishedAt).getFullYear() : ''}
              score={review.data?.sentiment?.sentimentSnapshot?.inferredScore}
            />
          );
        })}
      </div>
      {reviews.length === 0 && (
        <div className="text-center text-lg text-gray-300 mt-20">No demo reviews found.</div>
      )}
    </main>
  );
}
