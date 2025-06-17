'use client';
import { useState, useMemo } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

// --- BiasMeter component ---
const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

const biasColors = {
  POSITIVE: 'bg-green-400',
  NEG: 'bg-red-400',
  NEUTRAL: 'bg-yellow-400',
  OTHER: 'bg-blue-400',
};

const BiasMeter = ({
  biases,
  netAdjustment,
  biasLean,
  // biasLeanColor,
  netBiasAdjustment,
}: {
  biases: any[];
  netAdjustment: number;
  biasLean?: string;
  biasLeanColor?: string;
  netBiasAdjustment?: number;
}) => {
  // Clamp net adjustment to [-2, 2] for the bar
  const clamped = clamp(netAdjustment, -2, 2);
  // Build stacked segments for each bias (color-coded)
  const segments = useMemo(() => {
    if (!biases?.length) return [];
    // Sort by influence descending for visual clarity
    return biases
      .filter(
        (b) => typeof b.adjustedInfluence === 'number' && Math.abs(b.adjustedInfluence) > 0.01,
      )
      .map((b, i) => ({
        value: b.adjustedInfluence,
        color:
          b.adjustedInfluence > 0
            ? biasColors.POSITIVE
            : b.adjustedInfluence < 0
              ? biasColors.NEG
              : biasColors.NEUTRAL,
        label: b.name,
      }));
  }, [biases]);

  // Delta summary string TODO: might implement this somewhere
  // const deltaSummary = segments.length
  //   ? segments.map((s) => `${s.value > 0 ? '+' : ''}${s.value.toFixed(2)}`).join(', ') +
  //     ` — Total Adjusted: ${netAdjustment > 0 ? '+' : ''}${netAdjustment.toFixed(2)}`
  //   : `Total Adjusted: ${netAdjustment > 0 ? '+' : ''}${netAdjustment.toFixed(2)}`;

  // Tooltip/modal state
  const [showGlossary, setShowGlossary] = useState(false);

  const minW = segments.length <= 5 ? 'min-w-6' : 'min-w-4';

  // For the trail: calculate left offset and width from center to marker
  const markerPercent = 50 + clamp(netAdjustment, -2, 2) * 25; // 0 = 50%, -2 = 0%, +2 = 100%
  const trailLeft = markerPercent < 50 ? markerPercent : 50;
  const trailWidth = Math.abs(markerPercent - 50);

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 sm:mb-6 mb-3">
      {/* Top row: Bias Lean centered above meter, What's this? right-aligned */}
      <div
        className="relative w-full max-w-2xl mx-auto sm:mb-1 mb-0"
        style={{ minHeight: '1.4rem' }}
      >
        {/* Bias Lean badge centered absolutely (desktop), stacked (mobile) */}
        {biasLean && (
          <div
            className="flex justify-center mb-1 sm:absolute sm:left-1/2 sm:top-0 sm:-translate-x-1/2 sm:z-20"
            style={{ lineHeight: 1 }}
          >
            <Tooltip.Provider>
              <Tooltip.Root delayDuration={100}>
                <Tooltip.Trigger asChild>
                  <div
                    className="flex items-center font-orbitron font-extrabold italic tracking-wide text-xs sm:text-sm px-1.5 sm:px-2 py-0.5 select-none transition-all duration-200 hover:scale-105"
                    style={{
                      fontStyle: 'italic',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      transform: 'skew(-12deg)',
                      background:
                        (netBiasAdjustment ?? 0) > 0.1
                          ? 'linear-gradient(90deg, #4ade80 0%, #22d3ee 100%)'
                          : (netBiasAdjustment ?? 0) < -0.1
                            ? 'linear-gradient(90deg, #f87171 0%, #fbbf24 100%)'
                            : 'linear-gradient(90deg, #a78bfa 0%, #818cf8 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {biasLean}
                    <span className="ml-1 transition-transform duration-200 group-hover:translate-x-1 group-hover:scale-125">
                      {(netBiasAdjustment ?? 0) > 0.1 ? (
                        <svg
                          className="inline-block w-4 h-4 text-green-400 font-bold"
                          fill="none"
                          viewBox="0 0 20 20"
                        >
                          <path
                            d="M4 10h12m0 0l-4-4m4 4l-4 4"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (netBiasAdjustment ?? 0) < -0.1 ? (
                        <svg
                          className="inline-block w-4 h-4 text-red-400 font-bold"
                          fill="none"
                          viewBox="0 0 20 20"
                        >
                          <path
                            d="M16 10H4m0 0l4-4m-4 4l4 4"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="inline-block w-4 h-4 text-violet-300 font-bold"
                          fill="none"
                          viewBox="0 0 20 20"
                        >
                          <path
                            d="M6 10h8"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                        </svg>
                      )}
                    </span>
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="z-50 px-3 py-2 rounded bg-gray-900 text-xs text-white shadow-lg whitespace-pre-line font-semibold border border-violet-500 animate-fade-in max-w-xs"
                    side="top"
                    align="center"
                  >
                    This indicates the overall bias direction affecting the review's sentiment score
                    — whether it tends to inflate (boost) or deflate (lower) the score compared to
                    an objective baseline.
                    <Tooltip.Arrow className="fill-gray-900" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          </div>
        )}
        {/* What's this? right-aligned on desktop, centered below badge on mobile */}
        <button
          className="sm:absolute sm:right-0 sm:top-0 text-violet-300 hover:text-violet-100 text-xs sm:text-sm font-bold underline px-1 sm:px-2 mt-1 sm:mt-0 block mx-auto sm:mx-0 mb-2 sm:mb-0"
          style={{ display: 'block' }}
          onClick={() => setShowGlossary(true)}
          aria-label="What is the bias meter?"
        >
          What is this?
        </button>
      </div>
      {/* Bar container */}
      <div className="relative h-5 sm:h-6 bg-violet-950/80 rounded-full border border-violet-700 flex items-center shadow-inner overflow-visible mt-0">
        {/* Visual trail from center to marker with gradient */}
        {trailWidth > 0 && (
          <div
            className="absolute z-10 h-full pointer-events-none shadow-[0_0_12px_2px_rgba(139,92,246,0.5)]"
            style={{
              top: '50%',
              transform: 'translateY(-50%)',
              left: `${trailLeft}%`,
              width: `${trailWidth}%`,
              transition: 'left 0.4s, width 0.4s',
              boxShadow: '0 0 16px 4px rgba(139,92,246,0.45)',
              background:
                (netBiasAdjustment ?? 0) > 0.1
                  ? 'linear-gradient(90deg, #4ade80 0%, #22d3ee 100%)'
                  : (netBiasAdjustment ?? 0) < -0.1
                    ? 'linear-gradient(90deg, #f87171 0%, #fbbf24 100%)'
                    : 'linear-gradient(90deg, #a78bfa 0%, #818cf8 100%)',
            }}
          />
        )}
        {/* Segments */}
        {segments.length > 0 ? (
          <div className="absolute left-0 top-0 h-full w-full flex overflow-visible">
            {segments.map((seg, i) => {
              const width = `${Math.abs(seg.value / 4) * 100}%`;
              const isFirst = i === 0;
              const isLast = i === segments.length - 1;
              return (
                <Tooltip.Root key={seg.label + i} delayDuration={100}>
                  <Tooltip.Trigger asChild>
                    <div
                      className={[
                        seg.color,
                        'h-full relative cursor-pointer transition-opacity duration-150 z-10',
                        minW,
                        isFirst ? 'rounded-l-full' : '',
                        isLast ? 'rounded-r-full' : '',
                      ].join(' ')}
                      style={{ width }}
                    />
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className="z-50 px-3 py-1 rounded bg-gray-900 text-xs text-white shadow-lg whitespace-nowrap font-bold border border-violet-500 animate-fade-in"
                      side="top"
                      align="center"
                    >
                      {seg.label}: {seg.value > 0 ? '+' : ''}
                      {seg.value.toFixed(2)}
                      <Tooltip.Arrow className="fill-gray-900" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              );
            })}
          </div>
        ) : null}
        {/* Center line (0) */}
        <div
          className="absolute left-1/2 top-0 h-full w-0.5 bg-violet-400/60 z-10"
          style={{ transform: 'translateX(-50%)' }}
        />
        {/* 0 label overlayed in the center, on top of the center bar, with pop */}
        <div
          className={
            'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs sm:text-base font-extrabold text-violet-50 font-mono drop-shadow-lg pointer-events-none select-none z-30 px-1.5 sm:px-2 py-0.5 border border-violet-400/60 shadow-md ' +
            (Math.abs(netBiasAdjustment ?? 0) < 0.01
              ? 'ring-2 ring-violet-300 ring-offset-2 z-40 bg-violet-900/90 text-white border-violet-300'
              : 'bg-black/60')
          }
          style={{ letterSpacing: '0.02em' }}
        >
          0
        </div>
        {/* Net adjustment marker + label */}
        <Tooltip.Root delayDuration={100}>
          <Tooltip.Trigger asChild>
            <div
              className="absolute top-0 h-full flex z-30 transition-all duration-500"
              style={{ left: `calc(50% + ${clamped * 25}%)` }}
            >
              <div
                className="w-2 h-full shadow-xl border-2 border-violet-500 cursor-pointer"
                style={{
                  background:
                    (netBiasAdjustment ?? 0) > 0.1
                      ? 'linear-gradient(180deg, #4ade80 0%, #22d3ee 100%)'
                      : (netBiasAdjustment ?? 0) < -0.1
                        ? 'linear-gradient(180deg, #f87171 0%, #fbbf24 100%)'
                        : 'linear-gradient(180deg, #a78bfa 0%, #818cf8 100%)',
                }}
              />
            </div>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="z-50 px-3 py-2 rounded bg-gray-900 text-xs text-white shadow-lg whitespace-pre-line font-semibold border border-violet-500 animate-fade-in max-w-xs"
              side="top"
              align="center"
            >
              {`Net Adjustment: ${(netBiasAdjustment ?? 0) > 0 ? '+' : ''}${(netBiasAdjustment ?? 0).toFixed(2)}\n`}
              {((netBiasAdjustment ?? 0) > 0.1 && 'Score Inflated') ||
                ((netBiasAdjustment ?? 0) < -0.1 && 'Score Deflated') ||
                'No significant bias'}
              <Tooltip.Arrow className="fill-gray-900" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
        {/* Range labels */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs sm:text-base font-extrabold text-violet-300 font-mono drop-shadow-sm">
          -2
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sm:text-base font-extrabold text-violet-300 font-mono drop-shadow-sm">
          +2
        </div>
      </div>
      {/* Legend below the bar */}
      <div className="flex gap-2 sm:gap-4 mt-2 sm:mt-4 mb-2 sm:mb-4 justify-center items-center text-xs font-bold text-violet-200 select-none">
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 sm:w-4 h-2.5 sm:h-3 rounded-full bg-green-400 border border-green-600" />
          Score inflated by bias
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 sm:w-4 h-2.5 sm:h-3 rounded-full bg-red-400 border border-red-600" />
          Score deflated by bias
        </div>
      </div>
      <div className="text-xs sm:text-xs text-violet-300 mb-2">
        <b>How to read this:</b> Each colored segment shows how much a specific bias inflated
        (green) or deflated (red) the score. The thick marker shows the total effect of all biases
        combined. If the marker is left of 0, the review was more negative after removing bias; if
        right, more positive.
      </div>
      {/* Glossary modal */}
      {showGlossary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-gray-900 rounded-lg p-6 max-w-[90vw] sm:max-w-md w-full text-white shadow-xl relative">
            <button
              className="absolute top-2 right-3 text-xl"
              onClick={() => setShowGlossary(false)}
            >
              &times;
            </button>
            <div className="text-lg font-bold mb-2">What is the Bias Meter?</div>
            <div className="mb-2">
              The bias meter shows how much emotional or contextual bias changed the reviewer's
              original sentiment. A value near 0 means the review was mostly objective. Large
              positive or negative values mean the review was strongly influenced by bias.
            </div>
            <div className="text-sm text-violet-200 mb-3">
              Each colored segment represents a detected bias type. Hover for details.
            </div>
            {/* Bias Impact Summary - styled and at the top */}
            <div className="mb-4">
              <div className="font-orbitron text-base sm:text-lg font-extrabold uppercase tracking-widest text-violet-200 mt-2 mb-1 drop-shadow">
                Bias Impact Summary
              </div>
              <div className="text-lg font-orbitron font-extrabold mb-2">
                Net Adjustment:{' '}
                <span
                  className={
                    (netBiasAdjustment ?? 0) > 0
                      ? 'text-green-400'
                      : (netBiasAdjustment ?? 0) < 0
                        ? 'text-red-400'
                        : 'text-violet-100'
                  }
                >
                  {(netBiasAdjustment ?? 0) > 0 ? '+' : ''}
                  {(netBiasAdjustment ?? 0).toFixed(2)}
                </span>
              </div>
              <ul className="mb-2 ml-2">
                {segments.length > 0 ? (
                  segments.map((s, i) => (
                    <li key={s.label + i} className="flex items-center gap-2 mb-1">
                      <span
                        className={[
                          s.value > 0
                            ? 'text-green-400'
                            : s.value < 0
                              ? 'text-red-400'
                              : 'text-violet-100',
                          'font-bold font-mono text-base',
                        ].join(' ')}
                      >
                        {s.value > 0 ? '+' : ''}
                        {s.value.toFixed(2)}
                      </span>
                      <span className="capitalize text-violet-100 text-sm font-semibold">
                        {s.label}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="text-violet-100">No significant biases detected.</li>
                )}
              </ul>
            </div>
            <div className="font-orbitron text-base sm:text-lg font-extrabold uppercase tracking-widest text-violet-200 mt-2 mb-2 drop-shadow">
              Reading The Bias Meter
            </div>
            <MiniBiasMeter />
            {/* Legend */}
            <div className="flex gap-4 mt-4 mb-3 justify-center items-center text-xs font-bold text-violet-200 select-none">
              <div className="flex items-center gap-1">
                <span className="inline-block w-4 h-3 rounded-full bg-green-400 border border-green-600" />
                Score inflated by bias
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-4 h-3 rounded-full bg-red-400 border border-red-600" />
                Score deflated by bias
              </div>
            </div>
            {/* How to read */}
            <div className="text-xs text-violet-300 mb-2">
              <b>How to read this:</b> In this example, the green segment shows a +0.3 bias (score
              inflated), the red segment shows a -0.1 bias (score deflated), and the thick marker
              shows the net adjustment (+0.2). The closer the marker is to 0, the more objective the
              review.
            </div>
            {/* Range explanation */}
            <div className="text-xs text-violet-300 mt-2">
              <b>Range explanation:</b> The bar ranges from –2 (strong negative bias) to +2 (strong
              positive bias). Most reviews fall between –0.5 and +0.5.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// MiniBiasMeter for modal example
const MiniBiasMeter = () => {
  const segments = [
    { value: 0.3, color: 'bg-green-400', label: 'Nostalgia' },
    { value: -0.1, color: 'bg-red-400', label: 'Cynicism' },
  ];
  const netAdjustment = 0.2;
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
  const clamped = clamp(netAdjustment, -2, 2);
  const markerPercent = 50 + clamped * 25;
  const trailLeft = markerPercent < 50 ? markerPercent : 50;
  const trailWidth = Math.abs(markerPercent - 50);
  const minW = 'min-w-4';
  return (
    <div className="w-full max-w-xs mx-auto mb-6 mt-2">
      <div className="relative h-4 bg-violet-950/80 rounded-full border border-violet-700 flex items-center shadow-inner overflow-visible">
        {/* Visual trail */}
        {trailWidth > 0 && (
          <div
            className="absolute z-10 h-full bg-violet-400/30 pointer-events-none"
            style={{
              left: `${trailLeft}%`,
              width: `${trailWidth}%`,
              transition: 'left 0.4s, width 0.4s',
            }}
          />
        )}
        {/* Segments */}
        <div className="absolute left-0 top-0 h-full w-full flex overflow-visible">
          {segments.map((seg, i) => {
            const width = `${Math.abs(seg.value / 4) * 100}%`;
            const isFirst = i === 0;
            const isLast = i === segments.length - 1;
            return (
              <div
                key={seg.label + i}
                className={[
                  seg.color,
                  'h-full relative',
                  minW,
                  isFirst ? 'rounded-l-full' : '',
                  isLast ? 'rounded-r-full' : '',
                ].join(' ')}
                style={{ width }}
              />
            );
          })}
        </div>
        {/* Center line (0) */}
        <div
          className="absolute left-1/2 top-0 h-full w-0.5 bg-violet-400/60 z-10"
          style={{ transform: 'translateX(-50%)' }}
        />
        {/* Net adjustment marker */}
        <div
          className="absolute top-0 h-full flex z-30 transition-all duration-500"
          style={{ left: `calc(50% + ${clamped * 25}%)` }}
        >
          <div className="w-2 h-full bg-violet-300 shadow-xl border-2 border-violet-500" />
        </div>
        {/* Range labels */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-violet-400 font-mono">
          -2
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-violet-400 font-mono">
          +2
        </div>
        <div className="absolute left-1/2 top-full mt-0.5 -translate-x-1/2 text-[10px] text-violet-400 font-mono">
          0
        </div>
      </div>
    </div>
  );
};
// --- End BiasMeter ---

export default function GameDemoScores({ sentiment }: { sentiment: any }) {
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [showBiasInfo, setShowBiasInfo] = useState(false);

  const sentimentSnapshot = sentiment.sentimentSnapshot || {};
  const verdict = sentimentSnapshot.verdict || '';
  let verdictLabel = 'Positive';
  let verdictBg = 'bg-gradient-to-br from-green-900/40 to-green-700/30';
  let verdictText = 'text-green-300';
  if (verdict.toLowerCase().includes('neg')) {
    verdictLabel = 'Negative';
    verdictBg = 'bg-gradient-to-br from-red-900/40 to-red-700/30';
    verdictText = 'text-red-300';
  } else if (verdict.toLowerCase().includes('mix')) {
    verdictLabel = 'Mixed';
    verdictBg = 'bg-gradient-to-br from-yellow-900/40 to-yellow-700/30';
    verdictText = 'text-yellow-300';
  } else if (verdict.toLowerCase().includes('neut')) {
    verdictLabel = 'Neutral';
    verdictBg = 'bg-gradient-to-br from-blue-900/40 to-blue-700/30';
    verdictText = 'text-blue-300';
  }

  const rawScore = sentimentSnapshot.inferredScore ?? 0;
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

  // Bias meter logic
  const netBiasAdjustment = biasAdjusted - rawScore;
  const biasSegments = Array.isArray(biasesDetected) ? biasesDetected : [];

  // Bias Lean logic
  let biasLean = null;
  let biasLeanColor = '';
  // let biasLeanIcon = null;
  if (netBiasAdjustment > 0.1) {
    biasLean = 'Bias Lean: Inflates Score';
    biasLeanColor = 'text-green-400';
    // biasLeanIcon = (
    //   <svg className="inline-block w-4 h-4 ml-1 text-green-400" fill="none" viewBox="0 0 20 20">
    //     <path
    //       d="M4 10h12m0 0l-4-4m4 4l-4 4"
    //       stroke="currentColor"
    //       strokeWidth="2"
    //       strokeLinecap="round"
    //       strokeLinejoin="round"
    //     />
    //   </svg>
    // );
  } else if (netBiasAdjustment < -0.1) {
    biasLean = 'Bias Lean: Deflates Score';
    biasLeanColor = 'text-red-400';
    // biasLeanIcon = (
    //   <svg className="inline-block w-4 h-4 ml-1 text-red-400" fill="none" viewBox="0 0 20 20">
    //     <path
    //       d="M16 10H4m0 0l4-4m-4 4l4 4"
    //       stroke="currentColor"
    //       strokeWidth="2"
    //       strokeLinecap="round"
    //       strokeLinejoin="round"
    //     />
    //   </svg>
    // );
  } else {
    biasLean = 'Bias Lean: Neutral';
    biasLeanColor = 'text-violet-300';
    // biasLeanIcon = (
    //   <svg className="inline-block w-4 h-4 ml-1 text-violet-300" fill="none" viewBox="0 0 20 20">
    //     <path d="M6 10h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    //   </svg>
    // );
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
            <svg
              width="28"
              height="28"
              fill="none"
              viewBox="0 0 24 24"
              className={`inline-block align-middle ${verdictText} text-2xl sm:text-3xl`}
              style={{ marginTop: '2px' }}
            >
              <path
                d="M5 3v18M5 3h12l-2 5 2 5H5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
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
              className="inline-block align-middle text-blue-400 text-2xl sm:text-3xl -mt-1"
              style={{ marginTop: '1px' }}
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
              className="inline-block align-middle text-violet-400 text-2xl sm:text-3xl -mt-1"
              style={{ marginTop: '1px' }}
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

      {/* --- NEW SUMMARY SECTION --- */}
      {/* Verdict Callout */}
      <div className="flex flex-col items-center my-4">
        <span className="text-xs font-orbitron uppercase tracking-widest text-violet-300 mb-1">
          Should You Play This?
        </span>
        {(sentiment.sentimentSummaryFriendlyVerdict || sentiment.sentimentSummary) && (
          <div className="text-lg sm:text-xl font-orbitron font-bold italic text-violet-100 bg-gradient-to-r from-violet-800/80 to-violet-700/80 rounded-full px-6 py-3 shadow border border-violet-600 text-center">
            {sentiment.sentimentSummaryFriendlyVerdict || sentiment.sentimentSummary}
          </div>
        )}
      </div>

      {/* Game Summary */}
      {sentiment.reviewSummary && (
        <div className="my-3 mb-6">
          <span className="block text-xs font-orbitron uppercase tracking-widest text-violet-300 mb-1">
            Game Summary
          </span>
          <div className="text-base sm:text-lg font-orbitron font-semibold text-violet-100 bg-violet-900/60 rounded-lg px-4 py-3 shadow border border-violet-700 text-center">
            {sentiment.reviewSummary}
          </div>
        </div>
      )}

      {/* Reviewer Take */}
      {sentiment.sentimentSummary && sentiment.sentimentSummary !== sentiment.reviewSummary && (
        <div className="mb-3">
          <span className="block text-xs font-orbitron uppercase tracking-widest text-violet-300 mb-1">
            Reviewer Take (AI Generated)
          </span>
          <div className="text-sm sm:text-base font-orbitron text-violet-200 bg-violet-900/40 rounded-lg px-4 py-2 shadow border border-violet-700 text-center">
            {sentiment.sentimentSummary}
          </div>
        </div>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-2 justify-center mt-2 mb-6">
        {sentiment.sentimentSnapshot?.confidenceLevel && (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-violet-700 to-violet-500 text-violet-100 text-xs font-orbitron font-bold border border-violet-400 uppercase tracking-wide shadow">
            {/* Shield icon for confidence */}
            <svg className="w-4 h-4 text-violet-200 mr-1" fill="none" viewBox="0 0 20 20">
              <path
                d="M10 2l7 3v5c0 5.25-3.5 9.25-7 10-3.5-.75-7-4.75-7-10V5l7-3z"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="currentColor"
                fillOpacity="0.2"
              />
            </svg>
            {sentiment.sentimentSnapshot.confidenceLevel} Confidence
          </span>
        )}
        {sentiment.sentimentSnapshot?.recommendationStrength && (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-green-700 to-green-500 text-green-100 text-xs font-orbitron font-bold border border-green-400 uppercase tracking-wide shadow">
            {/* Check icon for recommendation */}
            <svg className="w-4 h-4 text-green-200 mr-1" fill="none" viewBox="0 0 20 20">
              <path
                d="M5 10l4 4 6-8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {sentiment.sentimentSnapshot.recommendationStrength} Recommendation
          </span>
        )}
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

      {/* Pros / Cons Section */}
      {(sentiment.pros?.length > 0 || sentiment.cons?.length > 0) && (
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-stretch w-full mx-auto mb-6">
          {sentiment.pros?.length > 0 && (
            <div className="flex-1 bg-green-950/60 rounded-xl p-4 shadow flex flex-col h-full">
              <div className="text-green-300 font-orbitron font-bold uppercase text-s mb-2 tracking-widest flex items-center gap-1">
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 20 20">
                  <path
                    d="M5 10l4 4 6-8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
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
          {sentiment.cons?.length > 0 && (
            <div className="flex-1 bg-red-950/60 rounded-xl p-4 shadow flex flex-col h-full">
              <div className="text-red-300 font-orbitron font-bold uppercase text-s mb-2 tracking-widest flex items-center gap-1">
                <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
                  <path
                    d="M7 7l6 6m0-6l-6 6"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
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
          )}
        </div>
      )}

      {/* Detected Biases Section */}
      {Array.isArray(sentiment.biasDetection?.biasesDetected) &&
      sentiment.biasDetection.biasesDetected.length > 0 ? (
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
          <div className="text-yellow-200 mb-6">
            {sentiment.biasDetection.biasesDetected.length} bias
            {sentiment.biasDetection.biasesDetected.length > 1 ? 'es' : ''} detected, total
            adjustment:{' '}
            {totalScoreAdjustment < 0
              ? `score reduced by ${Math.abs(totalScoreAdjustment).toFixed(2)}`
              : `score increased by ${Math.abs(totalScoreAdjustment).toFixed(2)}`}{' '}
            due to bias
          </div>
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
                  as nostalgia, franchise loyalty, or contrarianism. We adjusted the score to help
                  you see how much these factors may have influenced the review.
                </div>
              </div>
            </div>
          )}
          {/* Bias cards grid */}
          <div
            className={`w-full ${
              sentiment.biasDetection.biasesDetected.length === 1 ? 'lg:flex lg:justify-center' : ''
            }`}
          >
            <ul
              className={`grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-8 ${
                sentiment.biasDetection.biasesDetected.length === 1
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-1 lg:place-items-center'
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2'
              }`}
            >
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
                    className={`relative border border-yellow-200 bg-yellow-50 p-4 md:p-6 lg:p-8 shadow-lg flex flex-col gap-4 w-full flex-1 mb-4 rounded-2xl min-w-[320px] mx-auto ${
                      sentiment.biasDetection.biasesDetected.length === 1
                        ? 'max-w-[480px] lg:max-w-[600px]'
                        : 'max-w-[480px]'
                    }`}
                    style={{ boxShadow: '0 4px 24px 0 rgba(0,0,0,0.08)' }}
                  >
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-orbitron text-lg sm:text-xl font-extrabold uppercase tracking-widest text-yellow-900 mb-1 break-words">
                          {b.name}
                        </div>
                      </div>
                      {/* Bias effect, bold number, right-aligned in a box */}
                      {typeof b.adjustedInfluence === 'number' && (
                        <div className="px-2 sm:px-3 py-1 rounded-lg bg-gray-100 border border-gray-200 flex flex-col items-center shadow-sm flex-shrink-0">
                          <span className="text-[10px] sm:text-[11px] text-gray-500 font-semibold tracking-wide uppercase whitespace-nowrap">
                            Bias Effect
                          </span>
                          <span
                            className={`text-lg sm:text-xl font-mono font-extrabold ${b.adjustedInfluence > 0 ? 'text-green-700' : b.adjustedInfluence < 0 ? 'text-red-700' : 'text-gray-700'}`}
                          >
                            {b.adjustedInfluence > 0 ? '+' : ''}
                            {b.adjustedInfluence?.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Status bar: severity + confidence */}
                    <div className="flex flex-col gap-2 mb-3">
                      <span className="uppercase font-bold text-xs px-3 py-1 rounded-full bg-violet-200 text-violet-800 tracking-wider shadow-sm w-fit">
                        {b.severity}
                      </span>
                      <div className="flex items-center gap-1 flex-1">
                        <span className="uppercase font-bold text-xs text-violet-800 tracking-wider whitespace-nowrap">
                          Confidence:
                        </span>
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <div className="flex-1 h-3 bg-violet-100 rounded-full overflow-hidden min-w-[40px]">
                            <div
                              className="h-3 rounded-full bg-gradient-to-r from-violet-400 to-blue-400 transition-all duration-700"
                              style={{ width: `${Math.round((b.confidenceScore || 0) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-violet-900 whitespace-nowrap flex-shrink-0 ml-1">
                            {Math.round((b.confidenceScore || 0) * 100)}%
                          </span>
                        </div>
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
        </div>
      ) : (
        <div className="w-full flex justify-center my-8">
          <div className="border-2 border-yellow-400 bg-yellow-50/80 rounded-2xl px-8 py-10 shadow-lg  w-full flex flex-col items-center">
            <svg className="w-12 h-12 text-yellow-400 mb-4" fill="none" viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="#FEF9C3"
              />
              <path
                d="M8 12h8M12 8v8"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            <div className="text-xl sm:text-2xl font-bold font-orbitron text-yellow-900 mb-2 text-center">
              No Noticeable Bias Detected
            </div>
            <div className="text-base sm:text-lg text-yellow-800 text-center max-w-md">
              The AI detected no noticeable bias in this review. This review appears balanced and
              objective, with no significant emotional or contextual influences affecting the score.
            </div>
          </div>
        </div>
      )}

      {/* Bias Meter summary - now below Detected Biases */}
      <div className="flex flex-col items-center relative mt-8">
        <div className="font-orbitron text-lg sm:text-2xl font-extrabold uppercase tracking-widest text-violet-300 mb-1 drop-shadow">
          BIAS METER
        </div>
        <Tooltip.Provider>
          <BiasMeter
            biases={biasSegments}
            netAdjustment={netBiasAdjustment}
            biasLean={biasLean}
            biasLeanColor={biasLeanColor}
            netBiasAdjustment={netBiasAdjustment}
          />
        </Tooltip.Provider>
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
    </>
  );
}
