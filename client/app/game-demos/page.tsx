import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import Image from 'next/image';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function getDemoReviews() {
  const { data, error } = await supabase
    .from('demo_reviews')
    .select('id, video_url, data')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export default async function GameDemosPage() {
  const reviews = await getDemoReviews();
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
        {reviews.map((r: any) => {
          const meta = r.data?.metadata || r.data?.data?.metadata || {};
          const thumb =
            meta.thumbnails?.maxres?.url ||
            meta.thumbnails?.high?.url ||
            meta.thumbnails?.default?.url ||
            '/game-case-placeholder.png';
          const slug =
            meta.slug ||
            (meta.title
              ? meta.title
                  .toLowerCase()
                  .replace(/[^a-z0-9\s-]/g, '')
                  .replace(/\s+/g, '-')
                  .replace(/-+/g, '-')
                  .replace(/^-+|-+$/g, '')
                  .trim()
              : r.id);
          return (
            <Link
              key={r.id}
              href={`/game-demos/${slug}`}
              className="group relative block max-w-sm w-full mx-auto rounded-xl sm:rounded-2xl overflow-hidden shadow-lg sm:shadow-2xl border-4 border-violet-700 bg-violet-900 hover:scale-105 transition-transform"
              style={{ minHeight: 420 }}
            >
              <div className="relative aspect-[1] w-full h-86 overflow-hidden flex items-end justify-center">
                <Image
                  src={thumb}
                  alt={meta.title || 'Game cover'}
                  fill
                  className="object-cover object-center group-hover:brightness-110 group-hover:scale-105 transition-all duration-300"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  priority
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 flex flex-col px-4 pt-2 pb-0 bg-violet-800/90 text-white font-semibold rounded-b-2xl">
                <div className="text-lg font-extrabold text-white truncate drop-shadow mb-0.5">
                  {meta.title || 'Untitled Game'}
                </div>
                <div className="text-xs text-violet-200 font-semibold truncate mb-1">
                  {meta.channelTitle || 'Unknown Channel'}
                </div>
                <hr className="my-1 border-violet-400/30" />
                <div className="flex flex-col w-full py-2 rounded-b-2xl">
                  <div className="flex items-center justify-between w-full mb-0.5">
                    <span className="uppercase tracking-wider text-[11px] text-violet-200 font-bold">
                      Release Year
                    </span>
                    <span className="uppercase tracking-wider text-[11px] text-violet-200 font-bold ml-auto">
                      Score
                    </span>
                  </div>
                  <div className="flex items-center justify-between w-full">
                    <span className="text-base font-bold">
                      {meta.publishedAt ? new Date(meta.publishedAt).getFullYear() : ''}
                    </span>
                    {r.data?.sentiment?.score !== undefined && (
                      <span className="bg-violet-600 px-4 py-1 rounded-full text-lg font-extrabold shadow ml-auto">
                        {r.data.sentiment.score}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="absolute top-2 right-2 bg-violet-700/80 text-white text-xs px-2 py-1 rounded shadow">
                Demo
              </div>
            </Link>
          );
        })}
      </div>
      {reviews.length === 0 && (
        <div className="text-center text-lg text-gray-300 mt-20">No demo reviews found.</div>
      )}
    </main>
  );
}
