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

  const rawScore = sentiment.sentimentScore ?? sentiment.score ?? 0;
  const biasesDetected = sentiment.biasDetection?.biasesDetected || [];
  // Subtract adjustedInfluence for each bias (removes inflation, restores deflation)
  const totalScoreAdjustment = biasesDetected.reduce(
    (sum: number, b: any) =>
      sum - (typeof b.adjustedInfluence === 'number' ? b.adjustedInfluence : 0),
    0,
  );
  const originalScore = sentiment.biasDetection?.originalScore ?? rawScore;
  // const biasAdjusted =
  //   typeof sentiment.biasAdjustment?.biasAdjustedScore === 'number'
  //     ? sentiment.biasAdjustment.biasAdjustedScore
  //     : +(originalScore + totalScoreAdjustment);
  // TODO: temporary fix till we update the server to return the biasAdjustedScore
  const biasAdjusted = +(originalScore + totalScoreAdjustment);
  const adjustment = biasAdjusted - rawScore;

  const verdict = sentiment.verdict || sentiment.sentimentSnapshot?.verdict || '';
  let verdictColor = 'text-green-300 bg-gradient-to-br from-green-900/40 to-green-700/30';
  let verdictLabel = 'Positive';
  let verdictBg = 'bg-gradient-to-br from-green-900/40 to-green-700/30';
  let verdictText = 'text-green-300';
  if (verdict.toLowerCase().includes('neg')) {
    verdictColor = 'text-red-300 bg-gradient-to-br from-red-900/40 to-red-700/30';
    verdictLabel = 'Negative';
    verdictBg = 'bg-gradient-to-br from-red-900/40 to-red-700/30';
    verdictText = 'text-red-300';
  } else if (verdict.toLowerCase().includes('mix')) {
    verdictColor = 'text-yellow-300 bg-gradient-to-br from-yellow-900/40 to-yellow-700/30';
    verdictLabel = 'Mixed';
    verdictBg = 'bg-gradient-to-br from-yellow-900/40 to-yellow-700/30';
    verdictText = 'text-yellow-300';
  } else if (verdict.toLowerCase().includes('neut')) {
    verdictColor = 'text-blue-300 bg-gradient-to-br from-blue-900/40 to-blue-700/30';
    verdictLabel = 'Neutral';
    verdictBg = 'bg-gradient-to-br from-blue-900/40 to-blue-700/30';
    verdictText = 'text-blue-300';
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 justify-center mb-6 w-full">
        <div
          className={`flex flex-col items-center justify-center rounded-xl px-4 py-5 shadow w-full min-h-[120px] font-orbitron ${verdictBg}`}
        >
          <span
            className={`flex items-center gap-2 ${verdictText} text-xl sm:text-2xl font-extrabold font-orbitron uppercase tracking-widest mb-2`}
          >
            VERDICT
          </span>
          <span
            className={`text-2xl sm:text-3xl font-extrabold font-orbitron normal-case tracking-wide drop-shadow mt-1 ${verdictText}`}
          >
            {verdictLabel}
          </span>
        </div>
        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-blue-900/40 to-blue-700/30 rounded-xl px-4 py-5 shadow w-full min-h-[120px]">
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
        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-violet-900/40 to-violet-700/30 rounded-xl px-4 py-5 shadow w-full min-h-[120px]">
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
          : adjustment < 0
            ? `Score reduced by ${Math.abs(adjustment).toFixed(2)} after removing bias.`
            : `Score increased by ${Math.abs(adjustment).toFixed(2)} after removing bias.`}
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
                {totalScoreAdjustment < 0
                  ? `score reduced by ${Math.abs(totalScoreAdjustment).toFixed(2)}`
                  : `score increased by ${Math.abs(totalScoreAdjustment).toFixed(2)}`}{' '}
                due to bias
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
          {/* Bias cards grid */}
          {sentiment.biasDetection.biasesDetected.length > 0 && (
            <div className="w-full ">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                {sentiment.biasDetection.biasesDetected.map((b: any, i: number) => {
                  // Gamer-flavored dynamic clue string
                  let clueString = '';
                  const evidenceIsNone =
                    b.evidence?.length === 1 && b.evidence[0] === '(no explicit evidence found)';
                  if (evidenceIsNone && (!b.detectedIn || b.detectedIn.length === 0)) {
                    clueString =
                      'No obvious phrases or clues, but our AI still picked up on this bias from the overall vibe.';
                  } else if (
                    (b.evidence?.length && !evidenceIsNone) ||
                    (b.detectedIn?.length && b.detectedIn[0])
                  ) {
                    if (b.evidence?.length && !evidenceIsNone && b.detectedIn?.length) {
                      clueString = `Phrases like "${b.evidence.join(', ')}" and the review's ${b.detectedIn.join(', ')} tipped off our AI to possible ${b.name.toLowerCase()}.`;
                    } else if (b.evidence?.length && !evidenceIsNone) {
                      clueString = `Phrases like "${b.evidence.join(', ')}" tipped off our AI to possible ${b.name.toLowerCase()}.`;
                    } else if (b.detectedIn?.length) {
                      clueString = `The review's ${b.detectedIn.join(', ')} tipped off our AI to possible ${b.name.toLowerCase()}.`;
                    }
                  } else {
                    clueString =
                      'No obvious phrases or clues, but our AI still picked up on this bias from the overall vibe.';
                  }
                  // Only show summary if it's not redundant with why it matters
                  const showSummary = b.explanation && b.explanation !== b.impactOnExperience;
                  return (
                    <li
                      key={`${b.name || 'bias'}-${b.severity || 'unknown'}-${b.scoreInfluence ?? '0'}-${i}`}
                      className="relative border border-yellow-200 bg-yellow-50 p-5 sm:p-8 shadow-lg flex flex-col gap-4 w-full flex-1 mb-4 rounded-2xl min-w-[280px] max-w-[480px] mx-auto"
                      style={{ boxShadow: '0 4px 24px 0 rgba(0,0,0,0.08)' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-orbitron text-lg sm:text-xl font-extrabold uppercase tracking-widest text-yellow-900 mb-1">
                            {b.name}
                          </div>
                        </div>
                        {/* Bias effect, bold number, right-aligned in a box */}
                        {typeof b.adjustedInfluence === 'number' && (
                          <div
                            className="px-3 py-1 rounded-lg bg-gray-100 border border-gray-200 flex flex-col items-center shadow-sm ml-4"
                            style={{ minWidth: 80 }}
                          >
                            <span className="text-[11px] text-gray-500 font-semibold tracking-wide uppercase">
                              Bias Effect
                            </span>
                            <span
                              className={`text-xl font-mono font-extrabold ${b.adjustedInfluence > 0 ? 'text-green-700' : b.adjustedInfluence < 0 ? 'text-red-700' : 'text-gray-700'}`}
                            >
                              {b.adjustedInfluence > 0 ? '+' : ''}
                              {b.adjustedInfluence?.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Status bar: severity + confidence */}
                      <div className="flex items-center gap-4 mb-3">
                        <span className="uppercase font-bold text-xs px-3 py-1 rounded-full bg-violet-200 text-violet-800 tracking-wider shadow-sm">
                          {b.severity}
                        </span>
                        <span className="uppercase font-bold text-xs text-violet-800 tracking-wider">
                          Confidence:
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-3 bg-violet-100 rounded-full overflow-hidden">
                            <div
                              className="h-3 rounded-full bg-gradient-to-r from-violet-400 to-blue-400 transition-all duration-700"
                              style={{ width: `${Math.round((b.confidenceScore || 0) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-violet-900 ml-1">
                            {Math.round((b.confidenceScore || 0) * 100)}%
                          </span>
                        </div>
                      </div>
                      {/* Why this matters - highlight box, blue/violet gradient border for contrast */}
                      <div className="mb-2 p-3 rounded-xl border-2 border-violet-300 bg-violet-50/80 flex flex-col">
                        <span className="font-bold text-violet-700 text-base mb-1 uppercase tracking-wide">
                          Why it matters for gamers
                        </span>
                        <span className="text-violet-900 text-lg font-bold leading-snug">
                          {b.impactOnExperience ||
                            b.explanation ||
                            'This bias may affect how the review is scored.'}
                        </span>
                      </div>
                      {/* What we noticed - gamer flavor */}
                      <div className="italic text-sm text-blue-900 mb-2">
                        <span className="font-bold">What tipped off the AI:</span> {clueString}
                      </div>
                      {/* Summary at the bottom, only if not redundant */}
                      {showSummary && (
                        <div className="text-base text-yellow-900 italic">{b.explanation}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </>
  );
}
