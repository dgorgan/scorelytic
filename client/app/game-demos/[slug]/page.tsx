import { fetchDemoReviewBySlug, fetchDemoReviewSlugs } from '@/services/supabase';
import { DemoReview } from '@scorelytic/shared/types';
import Link from 'next/link';
import SkeletonDetail from '@/components/SkeletonDetail';
import GameDemoVideo from './GameDemoVideo';
import GameDemoScores from './GameDemoScores';

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await fetchDemoReviewSlugs();
  return slugs.map((slug) => ({ slug }));
}

function extractVideoId(url: string) {
  const match = url.match(/[?&]v=([\w-]{11})/) || url.match(/youtu\.be\/([\w-]{11})/);
  return match ? match[1] : url;
}

type Props = {
  params: { slug: string };
};

export default async function GameDemoDetailPage({ params }: Props) {
  const { slug } = params;
  const data: DemoReview | null = await fetchDemoReviewBySlug(slug);
  if (!data) {
    return <SkeletonDetail />;
  }
  const meta = data.metadata || {};
  const sentiment = data.data?.sentiment || {};
  const videoId = extractVideoId(data.video_url);
  const thumb =
    meta.thumbnails?.maxres?.url ||
    meta.thumbnails?.high?.url ||
    meta.thumbnails?.default?.url ||
    '/game-case-placeholder.png';

  return (
    <main className="max-w-5xl mx-auto px-6 sm:px-8 py-10 sm:py-14">
      {/* Top back button */}
      <div className="mb-6">
        <Link
          href="/game-demos"
          className="inline-flex items-center gap-2 font-orbitron font-bold uppercase tracking-wide text-violet-400 hover:text-fuchsia-400 transition text-lg"
        >
          <span className="text-2xl">&#8592;</span> Back to Demos
        </Link>
      </div>
      {/* Full-width video player */}
      <GameDemoVideo thumb={thumb} videoId={videoId} title={meta.title} />
      {/* Channel credit and subscribe */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3 mb-6 px-2 sm:px-4 py-2 bg-violet-900/70 rounded-lg border border-violet-700 shadow-sm">
        {/* Left: YouTube icon + channel name + subscribe (side-by-side on desktop) */}
        <div className="flex flex-col xs:flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <svg
              width="24"
              height="16"
              viewBox="0 0 28 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0"
            >
              <rect width="28" height="20" rx="4" fill="#FF0000" />
              <polygon points="11,6 20,10 11,14" fill="white" />
            </svg>
            {meta.channelTitle && (
              <span className="text-base sm:text-lg font-bold text-violet-200 truncate max-w-[120px] sm:max-w-none">
                {meta.channelTitle}
              </span>
            )}
            {/* Subscribe button next to channel name on desktop */}
            {meta.channelId && (
              <a
                href={`https://www.youtube.com/channel/${meta.channelId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-block ml-3"
              >
                <button className="bg-red-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow hover:bg-red-700 transition">
                  Subscribe
                </button>
              </a>
            )}
          </div>
          {/* Subscribe button below on mobile only */}
          {meta.channelId && (
            <a
              href={`https://www.youtube.com/channel/${meta.channelId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:hidden"
            >
              <button className="w-full bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow hover:bg-red-700 transition mt-1">
                Subscribe
              </button>
            </a>
          )}
        </div>
        {/* Right: View on YouTube */}
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto"
        >
          <button className="w-full sm:w-auto bg-white text-red-600 text-xs sm:text-xs font-bold px-3 sm:px-4 py-1 rounded-full shadow hover:bg-red-100 border border-red-200 transition mt-1 sm:mt-0">
            View on YouTube
          </button>
        </a>
      </div>
      {/* Cover art, title, published date, tags */}
      <div className="flex flex-col items-center mb-8">
        <div className="text-2xl sm:text-4xl font-extrabold text-white text-center drop-shadow mb-1 font-orbitron uppercase tracking-wide break-words">
          {meta.title || 'Untitled Game'}
        </div>
        {meta.publishedAt && (
          <div className="text-base sm:text-lg font-semibold text-violet-200 text-center mb-2">
            Released:{' '}
            {new Date(meta.publishedAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        )}
        {meta.tags && meta.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 sm:gap-2 mb-2 justify-center">
            {meta.tags.map((tag: string) => (
              <span
                key={tag}
                className="text-xs sm:text-lg px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-bold text-blue-700 bg-blue-100"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
        {meta.description && (
          <div className="text-sm sm:text-base text-gray-200 whitespace-pre-line mb-2 text-center">
            {meta.description}
          </div>
        )}
      </div>
      {/* Review/analysis info */}
      <div className="bg-gradient-to-br from-violet-900/80 to-gray-900/90 rounded-3xl shadow-2xl p-4 sm:p-8 mb-8">
        <div className="text-xl sm:text-2xl font-extrabold text-violet-200 mb-4 text-center font-orbitron uppercase tracking-wide">
          Scorelytic Assessment
        </div>
        <div className="text-sm sm:text-base italic text-violet-300 mb-6 text-center">
          This is an AI-generated summary and score based on the video review, not the original
          reviewer&apos;s verdict.
        </div>
        <GameDemoScores sentiment={sentiment} />
        {/* {sentiment.pros && sentiment.pros.length > 0 && (
          <div className="mb-5">
            <div className="text-lg sm:text-xl font-bold text-green-400 mb-1 font-orbitron uppercase tracking-wide">
              Pros
            </div>
            <ul className="space-y-2">
              {sentiment.pros.map((pro: string) => (
                <li
                  key={pro}
                  className="flex items-start gap-2 bg-green-900/10 border-l-4 border-green-400 rounded px-3 py-2 shadow-sm"
                >
                  <span className="mt-0.5 text-green-400">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                      <path
                        d="M5 13l4 4L19 7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <span className="text-green-100">{pro}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {sentiment.cons && sentiment.cons.length > 0 && (
          <div className="mb-5">
            <div className="text-lg sm:text-xl font-bold text-red-400 mb-1 font-orbitron uppercase tracking-wide">
              Cons
            </div>
            <ul className="space-y-2">
              {sentiment.cons.map((con: string) => (
                <li
                  key={con}
                  className="flex items-start gap-2 bg-red-900/10 border-l-4 border-red-400 rounded px-3 py-2 shadow-sm"
                >
                  <span className="mt-0.5 text-red-400">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                      <path
                        d="M12 8v4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <circle cx="12" cy="16" r="1" fill="currentColor" />
                    </svg>
                  </span>
                  <span className="text-red-100">{con}</span>
                </li>
              ))}
            </ul>
          </div>
        )} */}
        {sentiment.biasDetection?.biasesDetected &&
          (sentiment.biasDetection?.biasesDetected ?? []).length > 0 &&
          false && (
            <div className="mb-4">
              <div className="text-lg sm:text-xl font-bold text-yellow-400 mb-1 font-orbitron uppercase tracking-wide">
                Detected Biases
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(sentiment.biasDetection?.biasesDetected ?? []).map((b: any, i: number) => (
                  <li
                    key={b.name + i}
                    className="bg-gradient-to-br from-yellow-100 to-yellow-300 px-6 py-4 rounded-xl text-base sm:text-lg text-yellow-900 font-bold shadow border border-yellow-300 flex flex-col items-start w-full"
                  >
                    <span className="font-bold text-yellow-900 text-lg mb-1">{b.name}</span>
                    <span className="text-xs text-gray-700 mb-0.5">Severity: {b.severity}</span>
                    <span className="text-xs text-gray-700 mb-0.5">
                      Impact: {b.impactOnExperience}
                    </span>
                    <span className="text-xs text-gray-700 mb-0.5">
                      Score Influence: {b.scoreInfluence}{' '}
                      <span className="ml-2 text-blue-700">(adj: {b.adjustedInfluence})</span>
                    </span>
                    <span className="text-xs text-gray-700 mb-0.5">
                      Confidence: {Math.round((b.confidenceScore || 0) * 100)}%
                    </span>
                    {b.detectedIn && b.detectedIn.length > 0 && (
                      <span className="text-xs text-gray-500 mt-1">
                        Detected in:{' '}
                        {b.detectedIn.map((d: string) => (
                          <span
                            key={d}
                            className="inline-block bg-gray-200 rounded px-2 py-0.5 mr-1"
                          >
                            {d}
                          </span>
                        ))}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 mt-1">
                      Reviewer Intent: <span className="font-semibold">{b.reviewerIntent}</span>
                    </span>
                    {b.evidence && b.evidence.length > 0 && (
                      <span className="text-xs text-gray-500 mt-1">
                        Evidence:{' '}
                        {b.evidence.map((e: string, j: number) => (
                          <span
                            key={j}
                            className="inline-block bg-yellow-200 rounded px-2 py-0.5 mr-1"
                          >
                            {e}
                          </span>
                        ))}
                      </span>
                    )}
                    <span className="text-xs text-yellow-900 italic mt-1">{b.explanation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        {sentiment.alsoRecommends && sentiment.alsoRecommends.length > 0 && (
          <div className="mb-4">
            <div className="text-lg sm:text-xl font-bold text-blue-400 mb-4 font-orbitron uppercase tracking-wide">
              Also Recommends
            </div>
            <ul className="flex flex-wrap gap-2 sm:gap-3">
              {sentiment.alsoRecommends.map((rec: string) => (
                <li
                  key={rec}
                  className="bg-gradient-to-br from-blue-200 to-blue-400 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-base sm:text-lg text-blue-900 font-bold shadow border border-blue-300"
                >
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {/* Advanced details: bias, context, transcript, debug */}
      <div className="bg-gradient-to-br from-gray-900/80 to-violet-900/80 rounded-2xl shadow-xl p-4 mt-10">
        <details open>
          <summary className="cursor-pointer text-lg sm:text-xl text-violet-300 font-bold mb-4 select-none font-orbitron uppercase tracking-wide">
            Advanced Analysis
          </summary>
          <div className="mt-4 space-y-6">
            {sentiment.culturalContext && (
              <div>
                <div className="text-base sm:text-lg font-bold text-purple-300 mb-2 font-orbitron uppercase tracking-wide">
                  Legacy & Influence
                </div>
                <div className="text-base text-purple-100 mb-4 italic">
                  {sentiment.culturalContext.justification}
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {sentiment.culturalContext.ideologicalThemes?.map((theme: string) => (
                    <span
                      key={theme}
                      className="bg-gradient-to-br from-purple-200 to-purple-400 px-3 py-1 rounded-full text-base text-purple-900 font-bold shadow border border-purple-300"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
                <div className="text-base text-purple-200 font-semibold mb-1 mt-4 font-orbitron">
                  Player Fit:
                </div>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 bg-green-900/20 rounded px-3 py-1">
                    <span className="text-green-400 text-lg align-middle">
                      {/* Star SVG for Aligned */}
                      <svg
                        width="20"
                        height="20"
                        fill="none"
                        viewBox="0 0 24 24"
                        className="inline-block align-middle"
                        style={{ marginTop: '1px' }}
                      >
                        <path
                          d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                    <span>
                      <span className="font-bold text-green-200 font-orbitron">Aligned:</span>{' '}
                      <span className="text-green-100">
                        {sentiment.culturalContext.audienceReactions?.aligned}
                      </span>
                    </span>
                  </li>
                  <li className="flex items-center gap-2 bg-yellow-900/20 rounded px-3 py-1">
                    <span className="text-yellow-300 text-lg align-middle">
                      {/* Circle SVG for Neutral */}
                      <svg
                        width="18"
                        height="18"
                        fill="none"
                        viewBox="0 0 24 24"
                        className="inline-block align-middle"
                        style={{ marginTop: '1px' }}
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="9"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          fill="none"
                        />
                      </svg>
                    </span>
                    <span>
                      <span className="font-bold text-yellow-200 font-orbitron">Neutral:</span>{' '}
                      <span className="text-yellow-100">
                        {sentiment.culturalContext.audienceReactions?.neutral}
                      </span>
                    </span>
                  </li>
                  <li className="flex items-center gap-2 bg-red-900/20 rounded px-3 py-1">
                    <span className="text-red-400 text-lg align-middle">
                      {/* X SVG for Opposed */}
                      <svg
                        width="18"
                        height="18"
                        fill="none"
                        viewBox="0 0 24 24"
                        className="inline-block align-middle"
                        style={{ marginTop: '1px' }}
                      >
                        <path
                          d="M6 6l12 12M6 18L18 6"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    <span>
                      <span className="font-bold text-red-200 font-orbitron">Opposed:</span>{' '}
                      <span className="text-red-100">
                        {sentiment.culturalContext.audienceReactions?.opposed}
                      </span>
                    </span>
                  </li>
                </ul>
              </div>
            )}
            {/*TODO: determine if this is useful client side at all or not */}
            {/* {data.data?.debug && data.data?.debug.length > 0 && (
              <div>
                <div className="text-base sm:text-lg font-bold text-gray-300 mb-2 font-orbitron uppercase tracking-wide">
                  Debug Log
                </div>
                <pre className="text-sm text-gray-200 bg-gray-800 rounded-lg p-3 mt-1 max-h-48 overflow-auto whitespace-pre-wrap shadow-inner">
                  {data.data.debug.join('\n')}
                </pre>
              </div>
            )} */}
          </div>
        </details>
      </div>
      <div className="mt-8 text-center">
        <Link
          href="/game-demos"
          className="inline-flex items-center gap-2 font-orbitron font-bold uppercase tracking-wide text-violet-400 hover:text-fuchsia-400 transition text-lg"
        >
          ← Back to Demos
        </Link>
      </div>
    </main>
  );
}
