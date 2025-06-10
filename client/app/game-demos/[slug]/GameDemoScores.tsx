'use client';
import { useState } from 'react';

function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-block focus:outline-none"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      {children}
      {open && (
        <span className="absolute z-50 left-1/2 -translate-x-1/2 mt-2 px-3 py-1 rounded bg-gray-900 text-xs text-white shadow-lg whitespace-nowrap">
          {text}
        </span>
      )}
    </span>
  );
}

export default function GameDemoScores({ sentiment }: { sentiment: any }) {
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [showBiasInfo, setShowBiasInfo] = useState(false);

  const biasAdjusted =
    sentiment.biasAdjustment?.biasAdjustedScore ?? sentiment.sentimentScore ?? sentiment.score ?? 0;
  const rawScore = sentiment.sentimentScore ?? sentiment.score ?? 0;
  const adjustment = biasAdjusted - rawScore;
  const totalScoreAdjustment =
    sentiment.biasAdjustment &&
    typeof (sentiment.biasAdjustment as any).totalScoreAdjustment === 'number'
      ? ((sentiment.biasAdjustment as any).totalScoreAdjustment as number)
      : 0;

  const verdict = sentiment.verdict || sentiment.sentimentSnapshot?.verdict || '';
  let verdictColor = 'text-green-300 bg-gradient-to-br from-green-900/40 to-green-700/30';
  let verdictLabel = 'Positive';
  if (verdict.toLowerCase().includes('neg')) {
    verdictColor = 'text-red-300 bg-gradient-to-br from-red-900/40 to-red-700/30';
    verdictLabel = 'Negative';
  } else if (verdict.toLowerCase().includes('mix')) {
    verdictColor = 'text-yellow-300 bg-gradient-to-br from-yellow-900/40 to-yellow-700/30';
    verdictLabel = 'Mixed';
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 justify-center mb-6">
        <div
          className={`flex flex-col items-center justify-center rounded-xl px-4 py-5 shadow w-44 sm:w-56 min-h-[120px] mx-auto font-orbitron bg-gradient-to-br from-green-900/40 to-green-700/30`}
          style={{ flex: 1, minWidth: '10rem', maxWidth: '14rem' }}
        >
          <span className="flex items-center gap-2 text-green-300 text-xl sm:text-2xl font-extrabold font-orbitron uppercase tracking-widest mb-2">
            VERDICT
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold font-orbitron normal-case tracking-wide drop-shadow mt-1 text-green-200">
            {verdictLabel}
          </span>
        </div>
        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-blue-900/40 to-blue-700/30 rounded-xl px-4 py-5 shadow w-44 sm:w-56 min-h-[120px] mx-auto">
          <span className="flex items-center gap-2 text-blue-300 text-xl sm:text-2xl font-extrabold font-orbitron uppercase tracking-widest mb-2">
            <svg
              width="28"
              height="28"
              fill="none"
              viewBox="0 0 24 24"
              className="inline-block text-blue-400 text-2xl sm:text-3xl -mt-1"
            >
              <path
                d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                fill="currentColor"
              />
            </svg>
            RAW SCORE
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold font-orbitron tracking-wide drop-shadow mt-1 text-blue-100">
            {rawScore}
          </span>
        </div>
        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-violet-900/40 to-violet-700/30 rounded-xl px-4 py-5 shadow w-44 sm:w-56 min-h-[120px] mx-auto">
          <span className="flex items-center gap-2 text-violet-300 text-xl sm:text-2xl font-extrabold font-orbitron uppercase tracking-widest mb-2">
            <svg
              width="28"
              height="28"
              fill="none"
              viewBox="0 0 24 24"
              className="inline-block text-violet-400 text-2xl sm:text-3xl -mt-1"
            >
              <path
                d="M12 2v20m10-10H2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            TRUE SCORE
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold font-orbitron tracking-wide drop-shadow mt-1 text-violet-100">
            {biasAdjusted}
          </span>
        </div>
      </div>
      <div className="text-center text-sm text-violet-200 mb-6">
        {biasAdjusted === rawScore
          ? 'No significant emotional biases detected.'
          : `Adjusted by ${(adjustment > 0 ? '+' : '') + adjustment.toFixed(1)} to remove emotional or habitual bias.`}
        <span className="ml-2 cursor-pointer underline" onClick={() => setShowScoreInfo(true)}>
          What do these scores mean?
        </span>
      </div>
      {showScoreInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full text-white shadow-xl relative">
            <button
              className="absolute top-2 right-3 text-xl"
              onClick={() => setShowScoreInfo(false)}
            >
              &times;
            </button>
            <div className="text-lg font-bold mb-2">What do these scores mean?</div>
            <div className="mb-2">
              <b>Raw Score:</b> The AI&apos;s best estimate of the reviewer&apos;s score, based only
              on the review transcript.
            </div>
            <div className="mb-2">
              <b>True Score:</b> We adjusted this score to remove emotional influences like
              nostalgia, hype, or nitpicking. It&apos;s our best estimate of what the review would
              look like with a more balanced perspective.
            </div>
            <div>
              If the True Score is lower, the reviewer was likely too generous (e.g. nostalgia). If
              it&apos;s higher, they were likely too harsh (e.g. nitpicking). If it&apos;s the same,
              no strong biases were detected.
            </div>
          </div>
        </div>
      )}
      {/* Detected Biases Section */}
      {sentiment.biasDetection && (
        <div>
          <div className="flex items-center gap-2">
            <div className="text-base sm:text-lg font-bold text-yellow-400 font-orbitron uppercase tracking-wide">
              Detected Biases
            </div>
            <span
              className="cursor-pointer underline text-yellow-300"
              onClick={() => setShowBiasInfo(true)}
            >
              What is this?
            </span>
          </div>
          {Array.isArray(sentiment.biasDetection?.biasesDetected) &&
            sentiment.biasDetection.biasesDetected.length > 0 && (
              <div className="text-yellow-200 mb-6">
                {sentiment.biasDetection.biasesDetected.length} bias
                {sentiment.biasDetection.biasesDetected.length > 1 ? 'es' : ''} detected, total
                adjustment:{' '}
                {(totalScoreAdjustment > 0 ? '+' : '') + totalScoreAdjustment.toFixed(1)}
              </div>
            )}
          {showBiasInfo && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
              <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full text-white shadow-xl relative">
                <button
                  className="absolute top-2 right-3 text-xl"
                  onClick={() => setShowBiasInfo(false)}
                >
                  &times;
                </button>
                <div className="text-lg font-bold mb-2">What is a bias?</div>
                <div>
                  Scorelytic detects patterns in reviews that may inflate or deflate the score, such
                  as nostalgia, franchise loyalty, or contrarianism. We adjust the score to help you
                  see how much these factors may have influenced the review.
                </div>
              </div>
            </div>
          )}
          {Array.isArray(sentiment.biasDetection?.biasesDetected) &&
          sentiment.biasDetection.biasesDetected.length > 0 ? (
            <ul className="flex flex-wrap gap-3 flex-start mb-4">
              {sentiment.biasDetection.biasesDetected.map((b: any, i: number) => (
                <li
                  key={`${b.name || 'bias'}-${b.severity || 'unknown'}-${b.scoreInfluence ?? '0'}-${i}`}
                  className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 shadow flex flex-col gap-1 w-full flex-1 mb-4"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-yellow-900 text-base uppercase font-orbitron">
                      {b.name}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${b.severity === 'high' ? 'bg-red-200 text-red-800' : b.severity === 'moderate' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}
                    >
                      {b.severity}
                    </span>
                    {typeof b.adjustedInfluence === 'number' && (
                      <span
                        className={`ml-2 text-xs px-2 py-0.5 rounded-full font-bold ${b.adjustedInfluence > 0 ? 'bg-green-100 text-green-700' : b.adjustedInfluence < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700'}`}
                      >
                        {b.adjustedInfluence > 0 ? '+' : ''}
                        {b.adjustedInfluence?.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-700">Confidence:</span>
                    <div className="w-20 h-2 bg-gray-200 rounded">
                      <div
                        className="h-2 rounded bg-yellow-400"
                        style={{ width: `${Math.round((b.confidenceScore || 0) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-700 ml-1">
                      {Math.round((b.confidenceScore || 0) * 100)}%
                    </span>
                  </div>
                  {/* Why this matters */}
                  <div className="mt-2 mb-1">
                    <span className="block text-sm font-bold text-yellow-900">
                      Why this matters:
                    </span>
                    <span className="block text-sm text-yellow-900">
                      {b.impactOnExperience ||
                        b.explanation ||
                        'This bias may affect how the review is scored.'}
                    </span>
                  </div>
                  {/* Detected in review language */}
                  {(b.evidence && b.evidence.length > 0) ||
                  (b.detectedIn && b.detectedIn.length > 0) ? (
                    <details className="mt-1">
                      <summary className="text-xs text-yellow-800 underline cursor-pointer select-none">
                        Show details
                      </summary>
                      {b.evidence && b.evidence.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="text-xs text-gray-700 mr-1">
                            Detected in review language:
                          </span>
                          {b.evidence.map((e: string, j: number) => (
                            <span
                              key={j}
                              className="bg-yellow-200 text-yellow-900 text-xs px-2 py-0.5 rounded-full"
                            >
                              {e}
                            </span>
                          ))}
                        </div>
                      )}
                      {b.detectedIn && b.detectedIn.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="text-xs text-gray-700 mr-1">Detected in:</span>
                          {b.detectedIn.map((d: string, j: number) => (
                            <span
                              key={j}
                              className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      )}
                    </details>
                  ) : null}
                  <div className="text-xs text-gray-700 mt-1">
                    Reviewer Intent: <span className="font-semibold">{b.reviewerIntent}</span>
                  </div>
                  <div className="text-xs text-yellow-900 italic mt-1">{b.explanation}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-base text-yellow-200 italic py-2 px-3 rounded bg-yellow-900/20 border border-yellow-700 mb-6">
              No bias adjustment was made because no significant biases were detected.
            </div>
          )}
        </div>
      )}
    </>
  );
}
