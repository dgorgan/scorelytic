import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

function extractVideoId(url: string) {
  const match = url.match(/[?&]v=([\w-]{11})/) || url.match(/youtu\.be\/([\w-]{11})/);
  return match ? match[1] : url;
}

export default async function GameDemoDetailPage({ params }: { params: { id: string } }) {
  const { data, error } = await supabase
    .from('demo_reviews')
    .select('id, video_url, data')
    .eq('id', params.id)
    .maybeSingle();
  if (error || !data) {
    return <div className="text-center text-red-500 mt-20">Demo review not found.</div>;
  }
  const review = data.data || {};
  const meta = review.metadata || review.data?.metadata || {};
  const sentiment = review.sentiment || review.data?.sentiment || {};
  const videoId = extractVideoId(data.video_url);
  const thumb =
    meta.thumbnails?.maxres?.url ||
    meta.thumbnails?.high?.url ||
    meta.thumbnails?.default?.url ||
    '/game-case-placeholder.png';

  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      {/* Full-width video player */}
      <div className="w-full aspect-[16/8] rounded-2xl overflow-hidden shadow-2xl border-4 border-violet-700 bg-black relative">
        <div className="absolute top-4 left-4 z-10">
          <Image
            src={thumb}
            alt={meta.title || 'Game cover'}
            width={64}
            height={86}
            className="rounded-lg shadow-lg border-2 border-violet-500 bg-white"
            style={{ aspectRatio: '3/4', objectFit: 'cover' }}
          />
        </div>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title={meta.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full min-h-[240px]"
        />
      </div>
      {/* Channel credit and subscribe */}
      <div className="flex items-center justify-between mt-3 mb-6 px-4 py-2 bg-violet-900/70 rounded-lg border border-violet-700 shadow-sm">
        {/* Left: YouTube icon + channel name + subscribe */}
        <div className="flex items-center gap-3">
          <svg
            width="28"
            height="20"
            viewBox="0 0 28 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="28" height="20" rx="4" fill="#FF0000" />
            <polygon points="11,6 20,10 11,14" fill="white" />
          </svg>
          {meta.channelTitle && (
            <span className="text-lg font-bold text-violet-200">{meta.channelTitle}</span>
          )}
          {meta.channelId && (
            <a
              href={`https://www.youtube.com/channel/${meta.channelId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <button className="bg-red-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow hover:bg-red-700 transition">
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
          className="inline-block"
        >
          <button className="bg-white text-red-600 text-xs font-bold px-4 py-1 rounded-full shadow hover:bg-red-100 border border-red-200 transition">
            View on YouTube
          </button>
        </a>
      </div>
      {/* Cover art, title, published date, tags */}
      <div className="flex flex-col items-center mb-8">
        <div className="text-4xl font-extrabold text-white text-center drop-shadow mb-1">
          {meta.title || 'Untitled Game'}
        </div>
        {meta.publishedAt && (
          <div className="text-lg font-semibold text-violet-200 font-semibold text-center mb-2">
            Released:{' '}
            {new Date(meta.publishedAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        )}
        {meta.tags && meta.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 justify-center">
            {meta.tags.map((tag: string) => (
              <span
                key={tag}
                className="text-lg px-3 py-1 rounded-full font-bold text-blue-700 bg-blue-100"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
        {meta.description && (
          <div className="text-base text-gray-200 whitespace-pre-line mb-2 text-center max-w-xl">
            {meta.description}
          </div>
        )}
      </div>
      {/* Review/analysis info */}
      <div className="bg-gradient-to-br from-violet-900/80 to-gray-900/90 rounded-3xl shadow-2xl p-8 mb-8">
        <div className="text-3xl font-extrabold text-violet-200 mb-2 text-center">
          Scorelytic Assessment
        </div>
        <div className="text-lg italic text-violet-300 mb-6 text-center">
          This is an AI-generated summary and score based on the video review, not the original
          reviewer's verdict.
        </div>
        <div className="flex flex-wrap gap-12 justify-center mb-8">
          <div className="flex flex-col items-center bg-gradient-to-br from-green-500/20 to-green-900/30 rounded-2xl px-8 py-6 shadow">
            <div className="text-2xl font-bold text-green-400 mb-1 flex items-center gap-2">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M2 12l5 5L22 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Verdict
            </div>
            <div className="text-3xl font-extrabold text-green-300 capitalize">
              {sentiment.verdict}
            </div>
          </div>
          <div className="flex flex-col items-center bg-gradient-to-br from-blue-500/20 to-blue-900/30 rounded-2xl px-8 py-6 shadow">
            <div className="text-2xl font-bold text-blue-400 mb-1 flex items-center gap-2">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                <path
                  d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                  fill="currentColor"
                />
              </svg>
              Score
            </div>
            <div className="text-3xl font-extrabold text-blue-200">
              {sentiment.sentimentScore ?? sentiment.score}
            </div>
          </div>
          <div className="flex flex-col items-center bg-gradient-to-br from-violet-500/20 to-violet-900/30 rounded-2xl px-8 py-6 shadow">
            <div className="text-2xl font-bold text-violet-300 mb-1 flex items-center gap-2">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                <path
                  d="M12 2v20m10-10H2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Bias-Adjusted
            </div>
            <div className="text-3xl font-extrabold text-violet-200">
              {sentiment.biasAdjustment?.biasAdjustedScore ?? '—'}
            </div>
          </div>
        </div>
        {sentiment.summary && (
          <div className="text-xl text-white mb-4 text-center">
            <span className="font-semibold text-violet-200">Summary:</span> {sentiment.summary}
          </div>
        )}
        {sentiment.pros && sentiment.pros.length > 0 && (
          <div className="mb-4">
            <div className="text-xl font-bold text-green-400 mb-1">Pros</div>
            <ul className="list-disc list-inside text-lg text-gray-200">
              {sentiment.pros.map((pro: string) => (
                <li key={pro}>{pro}</li>
              ))}
            </ul>
          </div>
        )}
        {sentiment.cons && sentiment.cons.length > 0 && (
          <div className="mb-4">
            <div className="text-xl font-bold text-red-400 mb-1">Cons</div>
            <ul className="list-disc list-inside text-lg text-gray-200">
              {sentiment.cons.map((con: string) => (
                <li key={con}>{con}</li>
              ))}
            </ul>
          </div>
        )}
        {sentiment.biasIndicators && sentiment.biasIndicators.length > 0 && (
          <div className="mb-4">
            <div className="text-xl font-bold text-yellow-400 mb-1">Bias Indicators</div>
            <ul className="flex flex-wrap gap-3">
              {sentiment.biasIndicators.map((b: string) => (
                <li
                  key={b}
                  className="bg-gradient-to-br from-yellow-200 to-yellow-400 px-5 py-2 rounded-full text-lg text-yellow-900 font-bold shadow border border-yellow-300"
                >
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}
        {sentiment.alsoRecommends && sentiment.alsoRecommends.length > 0 && (
          <div className="mb-4">
            <div className="text-xl font-bold text-blue-400 mb-1">Also Recommends</div>
            <ul className="flex flex-wrap gap-3">
              {sentiment.alsoRecommends.map((rec: string) => (
                <li
                  key={rec}
                  className="bg-gradient-to-br from-blue-200 to-blue-400 px-5 py-2 rounded-full text-lg text-blue-900 font-bold shadow border border-blue-300"
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
          <summary className="cursor-pointer text-xl text-violet-300 font-bold mb-4 select-none">
            Advanced Analysis
          </summary>
          <div className="mt-4 space-y-6">
            {sentiment.biasDetection && sentiment.biasDetection.biasesDetected && (
              <div>
                <div className="text-lg font-bold text-yellow-400 mb-2">Detected Biases</div>
                <ul className="flex flex-wrap gap-3 flex-start">
                  {sentiment.biasDetection.biasesDetected.map((b: any, i: number) => (
                    <li
                      key={b.biasName + i}
                      className="inline-flex flex-col items-start max-w-md border border-yellow-300 bg-yellow-50 px-4 py-3 rounded-lg shadow-sm mb-2"
                    >
                      <div className="font-bold text-yellow-900 text-base mb-1 flex items-center gap-2">
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" fill="#FDE68A" />
                          <path
                            d="M12 8v4"
                            stroke="#B45309"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <circle cx="12" cy="16" r="1" fill="#B45309" />
                        </svg>
                        {b.biasName}
                      </div>
                      <div className="text-base text-yellow-800 mb-1">
                        Severity: <span className="font-bold">{b.severity}</span>
                      </div>
                      <div className="text-base text-yellow-800 mb-1">
                        Impact: {b.impactOnExperience}
                      </div>
                      <div className="text-base text-yellow-800 mb-1">
                        Score Influence: <span className="font-bold">{b.scoreInfluence}</span>
                      </div>
                      <div className="text-sm text-yellow-900 italic">{b.explanation}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {sentiment.culturalContext && (
              <div>
                <div className="text-lg font-bold text-purple-300 mb-2">Cultural Context</div>
                <div className="text-base text-purple-100 mb-1 italic">
                  {sentiment.culturalContext.justification}
                </div>
                <div className="flex flex-wrap gap-2 mb-1">
                  {sentiment.culturalContext.ideologicalThemes?.map((theme: string) => (
                    <span
                      key={theme}
                      className="bg-gradient-to-br from-purple-200 to-purple-400 px-3 py-1 rounded-full text-base text-purple-900 font-bold shadow border border-purple-300"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
                <div className="text-base text-purple-200 font-semibold mb-1">
                  Audience Reactions:
                </div>
                <ul className="ml-4 text-base text-purple-100">
                  <li>
                    <span className="font-bold">Aligned:</span>{' '}
                    {sentiment.culturalContext.audienceReactions?.aligned}
                  </li>
                  <li>
                    <span className="font-bold">Neutral:</span>{' '}
                    {sentiment.culturalContext.audienceReactions?.neutral}
                  </li>
                  <li>
                    <span className="font-bold">Opposed:</span>{' '}
                    {sentiment.culturalContext.audienceReactions?.opposed}
                  </li>
                </ul>
              </div>
            )}
            {review.debug && review.debug.length > 0 && (
              <div>
                <div className="text-lg font-bold text-gray-300 mb-2">Debug Log</div>
                <pre className="text-sm text-gray-200 bg-gray-800 rounded-lg p-3 mt-1 max-h-48 overflow-auto whitespace-pre-wrap shadow-inner">
                  {review.debug.join('\n')}
                </pre>
              </div>
            )}
          </div>
        </details>
      </div>
      <div className="mt-8 text-center">
        <Link href="/game-demos" className="text-violet-400 hover:underline font-semibold">
          ← Back to Demos
        </Link>
      </div>
    </main>
  );
}
