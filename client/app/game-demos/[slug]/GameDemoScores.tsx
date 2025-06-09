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
            CREATOR SCORE
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
              <b>Raw Score:</b> The AI's best estimate of the reviewer's score, based only on the
              review transcript.
            </div>
            <div className="mb-2">
              <b>True Score:</b> We adjusted this score to remove emotional influences like
              nostalgia, hype, or nitpicking. It's our best estimate of what the review would look
              like with a more balanced perspective.
            </div>
            <div>
              If the True Score is lower, the reviewer was likely too generous (e.g. nostalgia). If
              it's higher, they were likely too harsh (e.g. nitpicking). If it's the same, no strong
              biases were detected.
            </div>
          </div>
        </div>
      )}
      {/* Detected Biases Section */}
      {sentiment.biasDetection && (
        <div>
          <div className="flex items-center gap-2">
            <div className="text-base sm:text-lg font-bold text-yellow-400 mb-2 font-orbitron uppercase tracking-wide">
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
            <ul className="flex flex-wrap gap-3 flex-start">
              {sentiment.biasDetection.biasesDetected.map((b: any, i: number) => {
                const influence = Number(b.scoreInfluence);
                const direction = influence > 0 ? '⬆️' : influence < 0 ? '⬇️' : '';
                const color =
                  influence > 0
                    ? 'text-green-400'
                    : influence < 0
                      ? 'text-red-400'
                      : 'text-yellow-400';
                return (
                  <li
                    key={b.name + i}
                    className={`inline-flex flex-col items-start max-w-md border border-yellow-300 bg-yellow-50 px-4 py-3 rounded-lg shadow-sm mb-8`}
                  >
                    <div
                      className={`font-bold text-base mb-1 flex items-center gap-2 ${influence > 0 ? 'text-green-600' : influence < 0 ? 'text-red-600' : 'text-yellow-700'}`}
                    >
                      {influence > 0 ? (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path
                            d="M10 15V5M10 5l-5 5M10 5l5 5"
                            stroke="#22c55e"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : influence < 0 ? (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path
                            d="M10 5v10M10 15l-5-5M10 15l5-5"
                            stroke="#ef4444"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
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
                      )}
                      <span
                        className={
                          influence > 0
                            ? 'text-green-600 font-bold'
                            : influence < 0
                              ? 'text-red-600 font-bold'
                              : 'text-yellow-700 font-bold'
                        }
                      >
                        {b.name} ({influence > 0 ? '+' : ''}
                        {influence})
                      </span>
                    </div>
                    <div className="text-base text-yellow-800 mb-1">
                      Severity: <span className="font-bold">{b.severity}</span>
                    </div>
                    <div className="text-base text-yellow-800 mb-1">
                      Impact: {b.impactOnExperience}
                    </div>
                    <div className="text-base text-yellow-800 mb-1">
                      Score Influence: {b.scoreInfluence > 0 ? '+' : ''}
                      {b.scoreInfluence}
                      {b.scoreInfluence > 0
                        ? ' (score adjusted up to remove positive bias)'
                        : b.scoreInfluence < 0
                          ? ' (score adjusted down to remove negative bias)'
                          : ''}
                    </div>
                    <div className="text-sm text-yellow-900 italic">{b.explanation}</div>
                  </li>
                );
              })}
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
