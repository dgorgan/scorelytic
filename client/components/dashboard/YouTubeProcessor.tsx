import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  buildYouTubeMetadataUrl,
  buildYouTubeProcessUrl,
  buildYouTubeProcessStreamUrl,
  ERROR_MESSAGES,
  extractVideoId,
} from '@scorelytic/shared';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import styles from './YouTubeProcessor.module.css';

interface YouTubeProcessorProps {
  onProcessComplete?: (result: any) => void;
}

export default function YouTubeProcessor({ onProcessComplete }: YouTubeProcessorProps) {
  const [videoId, setVideoId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [useStreaming, setUseStreaming] = useState(true);
  const [progressLogs, setProgressLogs] = useState<string[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [generalAnalysis, setGeneralAnalysis] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const stepsSet = useRef<Set<string>>(new Set());
  const resultRef = useRef<HTMLDivElement>(null);

  const fullResult = { ...result, ...(result?.data || {}) };
  const isGeneralAnalysis = !!fullResult.summary && Array.isArray(fullResult.keyNotes);
  const transcript = fullResult.transcript;
  const transcriptError =
    typeof fullResult.transcriptError === 'string' ? fullResult.transcriptError.trim() : '';
  const isTranscriptOk = typeof transcript === 'string' && transcript.trim().length > 0;
  const hasTranscriptError = !!transcriptError && !isTranscriptOk;
  const sentiment = fullResult.sentiment;
  const isTrulySuccess = isGeneralAnalysis
    ? isTranscriptOk && !transcriptError
    : !!sentiment && isTranscriptOk && !error;

  useEffect(() => {
    if (progressLogs.length > 0) {
      const last = progressLogs[progressLogs.length - 1];
      setSteps((prev) => (prev.includes(last) ? prev : [...prev, last]));
      setCurrentStep(steps.length > 0 ? steps.length - 1 : 0);
    }
  }, [progressLogs, steps.length]);

  useEffect(() => {
    const target = steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0;
    if (isTrulySuccess && progress < 100) {
      setProgress(100);
      return;
    }
    if (progress < target) {
      const interval = setInterval(() => {
        setProgress((p) => Math.min(target, p + 1));
      }, 10);
      return () => clearInterval(interval);
    }
  }, [currentStep, progress, steps.length, isTrulySuccess]);

  useEffect(() => {
    if (result) setIsSuccess(true);
    if (error) setIsSuccess(false);
  }, [result, error]);

  useEffect(() => {
    setProgressLogs([]);
    setCurrentStep(0);
    setProgress(0);
    setIsSuccess(false);
    setResult(null);
    setError(null);
  }, [videoId]);

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [result]);

  useEffect(() => {
    if (isTrulySuccess && steps.length > 0 && steps[steps.length - 1] !== 'Success!') {
      setSteps((prev) => [...prev, 'Success!']);
    }
  }, [isTrulySuccess, steps]);

  const resetProgress = () => {
    setProgressLogs([]);
    setSteps([]);
    stepsSet.current = new Set();
    setCurrentStep(0);
    setProgress(0);
    setIsSuccess(false);
    setResult(null);
    setError(null);
  };

  const handleProcess = async () => {
    const extractedId = extractVideoId(videoId.trim());
    if (!extractedId) {
      setError(ERROR_MESSAGES.YOUTUBE.INVALID_ID);
      return;
    }
    setProcessing(true);
    resetProgress();
    if (useStreaming) {
      // Always fetch metadata in parallel
      const metaPromise = fetch(buildYouTubeMetadataUrl(extractedId))
        .then((r) => r.json())
        .catch(() => null);
      // SSE mode
      const url = buildYouTubeProcessStreamUrl(extractedId, generalAnalysis);
      const es = new window.EventSource(url);
      eventSourceRef.current = es;
      es.onmessage = async (event) => {
        // Default event
        const msg = event.data;
        setProgressLogs((logs) => [...logs, msg]);
        if (!stepsSet.current.has(msg)) {
          stepsSet.current.add(msg);
          setSteps((prev) => [...prev, msg]);
        }
        setCurrentStep(Array.from(stepsSet.current).indexOf(msg));
      };
      es.addEventListener('progress', (event) => {
        const { message } = JSON.parse(event.data);
        setProgressLogs((logs) => [...logs, message]);
        if (!stepsSet.current.has(message)) {
          stepsSet.current.add(message);
          setSteps((prev) => [...prev, message]);
        }
        setCurrentStep(Array.from(stepsSet.current).indexOf(message));
      });
      es.addEventListener('result', async (event) => {
        const resultData = JSON.parse(event.data);
        const metaData = await metaPromise;
        const merged = { ...resultData, metadata: metaData };
        setResult(merged);
        onProcessComplete?.(merged);
        es.close();
        setProcessing(false);
        setIsSuccess(true);
        setProgress(100);
      });
      es.addEventListener('error', (event) => {
        setError('Streaming error');
        es.close();
        setProcessing(false);
        setIsSuccess(false);
      });
    } else {
      // Regular POST mode with parallel metadata fetch
      try {
        const metaPromise = fetch(buildYouTubeMetadataUrl(extractedId))
          .then((r) => r.json())
          .catch(() => null);
        const [processRes, metaData] = await Promise.all([
          fetch(buildYouTubeProcessUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId: extractedId, generalAnalysis }),
          }).then((r) => r.json()),
          metaPromise,
        ]);
        // Always flatten: if processRes.data exists, use it, else use processRes
        const merged = { ...(processRes.data || processRes), metadata: metaData };
        setResult(merged);
        onProcessComplete?.(merged);
        setIsSuccess(true);
      } catch (err: any) {
        setError(err.message || ERROR_MESSAGES.YOUTUBE.PROCESS_FAILED);
        setIsSuccess(false);
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleGetMetadata = async () => {
    const extractedId = extractVideoId(videoId.trim());
    if (!extractedId) {
      setError(ERROR_MESSAGES.YOUTUBE.INVALID_ID);
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(buildYouTubeMetadataUrl(extractedId));
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || ERROR_MESSAGES.YOUTUBE.FETCH_FAILED);
      }

      setResult({ metadata: data });
    } catch (err: any) {
      setError(err.message || ERROR_MESSAGES.YOUTUBE.FETCH_FAILED);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4">YouTube Video Processor</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            YouTube Video ID or URL
          </label>
          <input
            type="text"
            value={videoId}
            onChange={(e) => setVideoId(e.target.value)}
            placeholder="dQw4w9WgXcQ or https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-600"
            disabled={processing}
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Stream progress</label>
          <input
            type="checkbox"
            checked={useStreaming}
            onChange={(e) => setUseStreaming(e.target.checked)}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={generalAnalysis}
            onChange={(e) => setGeneralAnalysis(e.target.checked)}
            id="general-analysis-checkbox"
            disabled={processing}
          />
          <label htmlFor="general-analysis-checkbox" className="text-sm text-gray-700 select-none">
            General analysis (&quot;What is this video about?&quot;)
          </label>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleGetMetadata}
            disabled={processing || !videoId.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Loading...' : 'Get Metadata'}
          </button>

          <button
            onClick={handleProcess}
            disabled={processing || !videoId.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : 'Full Process'}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
            <h4 className="font-medium text-gray-900 mb-2">Result:</h4>
            <pre className="text-xs text-gray-700 overflow-auto max-h-96">
              {JSON.stringify(fullResult, null, 2)}
            </pre>
          </div>
        )}

        {progressLogs.length > 0 && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div
                className={
                  !isSuccess
                    ? `h-3 rounded-full ${styles.shimmer}`
                    : 'bg-blue-600 h-3 rounded-full transition-all duration-300'
                }
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <ul className="text-xs mb-2">
              {steps.map((step, i) => (
                <li
                  key={step}
                  className={
                    isSuccess
                      ? 'text-gray-500 line-through'
                      : i === currentStep
                        ? 'text-blue-800 font-semibold'
                        : i < currentStep
                          ? 'text-gray-500 line-through'
                          : 'text-gray-400'
                  }
                >
                  {step}
                </li>
              ))}
            </ul>
            {isTrulySuccess && !error && (
              <div className="flex items-center text-green-600 mt-2">
                <CheckCircleIcon className="w-5 h-5 mr-2" />
                <span className="font-semibold">Success!</span>
              </div>
            )}
            {(error || hasTranscriptError) && (
              <div className="flex items-center text-red-600 mt-2">
                <XCircleIcon className="w-5 h-5 mr-2" />
                <span className="font-semibold">Failed!</span>
              </div>
            )}
          </div>
        )}

        {(() => {
          const meta = fullResult.metadata || fullResult.data?.metadata;
          const isGeneralAnalysis = !!fullResult.summary && Array.isArray(fullResult.keyNotes);
          const sentiment = fullResult.sentiment;
          const biasAdjustment = fullResult.biasAdjustment || fullResult.sentiment?.biasAdjustment;
          const biasDetection = fullResult.biasDetection || fullResult.sentiment?.biasDetection;
          const context = fullResult.culturalContext || fullResult.sentiment?.culturalContext;
          const alsoRecommends = sentiment?.alsoRecommends || [];
          const biasIndicators = sentiment?.biasIndicators || [];
          const detectedBiases = biasDetection?.biasesDetected || [];
          const rationale = biasAdjustment?.rationale || biasAdjustment?.adjustmentRationale;
          const biasAdjustedScore = biasAdjustment?.biasAdjustedScore;
          const originalScore = biasDetection?.originalScore ?? sentiment?.score;
          const [showDetails, setShowDetails] = useState(false);
          // If general analysis is checked and data is present, show ONLY the general analysis block
          if (generalAnalysis && isGeneralAnalysis) {
            return (
              <div className="mt-8">
                {/* Metadata card (always show) */}
                {meta && (
                  <div
                    ref={resultRef}
                    className="bg-white rounded-lg shadow border border-gray-200 mb-6"
                  >
                    {meta.channelId ? (
                      <a
                        href={`https://www.youtube.com/watch?v=${extractVideoId(videoId.trim())}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Image
                          src={
                            meta.thumbnails?.maxres?.url ||
                            meta.thumbnails?.high?.url ||
                            meta.thumbnails?.default?.url
                          }
                          alt={meta.title}
                          width={1920} // example width for 16:9 aspect ratio
                          height={1080} // example height for 16:9 aspect ratio (h-96 ~ 384px, but use aspect ratio here)
                          className="rounded-t-lg border-b hover:opacity-90 transition"
                          style={{ objectFit: 'cover', width: '100%', height: '384px' }} // h-96 ≈ 384px
                        />
                      </a>
                    ) : (
                      <Image
                        src={
                          meta.thumbnails?.maxres?.url ||
                          meta.thumbnails?.high?.url ||
                          meta.thumbnails?.default?.url
                        }
                        alt={meta.title}
                        width={1920}
                        height={1080} // h-64 ≈ 256px, but keep aspect ratio consistent, adjust style below
                        className="rounded-t-lg border-b"
                        style={{ objectFit: 'cover', width: '100%', height: '256px' }} // h-64 ≈ 256px
                      />
                    )}
                    <div className="p-6">
                      <div className="text-2xl font-bold text-gray-900 mb-2">{meta.title}</div>
                      <div className="flex items-center gap-3 mb-2">
                        {meta.channelId ? (
                          <a
                            href={`https://www.youtube.com/watch?v=${extractVideoId(videoId.trim())}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-base text-gray-700 font-semibold hover:underline"
                          >
                            {meta.channelTitle}
                          </a>
                        ) : (
                          <a
                            href={`https://www.youtube.com/watch?v=${extractVideoId(videoId.trim())}`}
                            className="text-base text-gray-700 font-semibold"
                          >
                            {meta.channelTitle}
                          </a>
                        )}
                        {meta.channelId && (
                          <a
                            href={`https://www.youtube.com/channel/${meta.channelId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <button className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow hover:bg-red-700 transition">
                              Subscribe
                            </button>
                          </a>
                        )}
                      </div>
                      {meta.publishedAt && (
                        <div className="text-xs text-gray-500 mb-4">
                          {new Date(meta.publishedAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      )}
                      {meta.description && (
                        <div
                          className="text-sm text-gray-800 whitespace-pre-line mb-4"
                          style={{ lineHeight: '1.6' }}
                        >
                          {meta.description}
                        </div>
                      )}
                      {meta.tags && meta.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {meta.tags.map((tag: string) => (
                            <span
                              key={tag}
                              className="text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full text-xs font-medium"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* General analysis summary card */}
                <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
                  <div className="text-xl font-bold text-gray-900 mb-2">Video Summary</div>
                  <div className="text-base text-gray-800 mb-4">{fullResult.summary}</div>
                  <div className="text-lg font-semibold text-blue-700 mb-2">Key Notes</div>
                  <ul className="list-disc list-inside text-sm text-gray-800 mb-4">
                    {fullResult.keyNotes.map((note: string, i: number) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-gray-500 hover:underline">
                      Show full transcript
                    </summary>
                    <pre className="text-xs text-gray-700 bg-gray-50 rounded p-2 mt-2 max-h-96 overflow-auto whitespace-pre-wrap">
                      {fullResult.transcript}
                    </pre>
                  </details>
                </div>
              </div>
            );
          }
          // Otherwise, show the original review/bias block (full process details)
          if (meta && sentiment) {
            return (
              <div
                ref={resultRef}
                className="mt-8 bg-white rounded-lg shadow border border-gray-200"
              >
                {/* Metadata card (same as general analysis) */}
                <div className="bg-white rounded-t-lg border-b">
                  {meta.channelId ? (
                    <a
                      href={`https://www.youtube.com/watch?v=${extractVideoId(videoId.trim())}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Image
                        src={
                          meta.thumbnails?.maxres?.url ||
                          meta.thumbnails?.high?.url ||
                          meta.thumbnails?.default?.url
                        }
                        alt={meta.title}
                        width={1920} // 16:9 aspect ratio width
                        height={1080} // 16:9 aspect ratio height
                        className="rounded-t-lg border-b hover:opacity-90 transition"
                        style={{ objectFit: 'cover', width: '100%', height: '384px' }} // h-96 ~ 384px
                      />
                    </a>
                  ) : (
                    <Image
                      src={
                        meta.thumbnails?.maxres?.url ||
                        meta.thumbnails?.high?.url ||
                        meta.thumbnails?.default?.url
                      }
                      alt={meta.title}
                      width={1920}
                      height={1080}
                      className="rounded-t-lg border-b"
                      style={{ objectFit: 'cover', width: '100%', height: '256px' }} // h-64 ~ 256px
                    />
                  )}
                  <div className="p-6">
                    <div className="text-2xl font-bold text-gray-900 mb-2">{meta.title}</div>
                    <div className="flex items-center gap-3 mb-2">
                      {meta.channelId ? (
                        <a
                          href={`https://www.youtube.com/watch?v=${extractVideoId(videoId.trim())}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base text-gray-700 font-semibold hover:underline"
                        >
                          {meta.channelTitle}
                        </a>
                      ) : (
                        <a
                          href={`https://www.youtube.com/watch?v=${extractVideoId(videoId.trim())}`}
                          className="text-base text-gray-700 font-semibold"
                        >
                          {meta.channelTitle}
                        </a>
                      )}
                      {meta.channelId && (
                        <a
                          href={`https://www.youtube.com/channel/${meta.channelId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <button className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow hover:bg-red-700 transition">
                            Subscribe
                          </button>
                        </a>
                      )}
                    </div>
                    {meta.publishedAt && (
                      <div className="text-xs text-gray-500 mb-4">
                        {new Date(meta.publishedAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    )}
                    {meta.description && (
                      <div
                        className="text-sm text-gray-800 whitespace-pre-line mb-4"
                        style={{ lineHeight: '1.6' }}
                      >
                        {meta.description}
                      </div>
                    )}
                    {meta.tags && meta.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {meta.tags.map((tag: string) => (
                          <span
                            key={tag}
                            className="text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full text-xs font-medium"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* Review summary, verdict, score, pros, cons */}
                <div className="px-6 pb-6 mt-2">
                  <div className="text-lg font-semibold text-green-700 mb-2">Review Summary</div>
                  <div className="text-base text-gray-900 mb-2">
                    {sentiment.reviewSummary || sentiment.summary}
                  </div>
                  <div className="flex flex-wrap gap-4 mb-2">
                    <div>
                      <div className="text-xs text-gray-500">Verdict</div>
                      <div className="text-sm font-bold text-gray-800">{sentiment.verdict}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Score</div>
                      <div className="text-sm font-bold text-gray-800">
                        {sentiment.sentimentScore ?? sentiment.score}
                      </div>
                    </div>
                  </div>
                  {sentiment.pros && sentiment.pros.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs text-green-700 font-semibold mb-1">Pros</div>
                      <ul className="list-disc list-inside text-sm text-gray-800">
                        {sentiment.pros.map((pro: string) => (
                          <li key={pro}>{pro}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {sentiment.cons && sentiment.cons.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs text-red-700 font-semibold mb-1">Cons</div>
                      <ul className="list-disc list-inside text-sm text-gray-800">
                        {sentiment.cons.map((con: string) => (
                          <li key={con}>{con}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {/* --- Bias-Adjusted Score Card --- */}
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 px-6 pt-4 pb-2 border-b">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Original Score</span>
                    <span className="text-lg font-bold text-gray-800">{originalScore ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Bias-Adjusted</span>
                    <span
                      className={`text-lg font-bold ${biasAdjustedScore !== originalScore ? 'text-blue-700' : 'text-gray-800'}`}
                    >
                      {biasAdjustedScore ?? '—'}
                    </span>
                    {biasAdjustedScore !== originalScore && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
                        Adjusted
                      </span>
                    )}
                  </div>
                </div>
                {rationale && (
                  <div className="px-6 pb-2 pt-2 text-sm text-gray-700 italic border-b">
                    {rationale}
                  </div>
                )}
                {/* --- Expandable Advanced Details --- */}
                <div className="px-6 py-4">
                  <button
                    className="text-xs text-blue-700 font-semibold underline mb-2 focus:outline-none"
                    onClick={() => setShowDetails((v) => !v)}
                  >
                    {showDetails ? 'Hide advanced details' : 'Show advanced details'}
                  </button>
                  {showDetails && (
                    <div className="space-y-4 mt-2">
                      {alsoRecommends.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 font-semibold mb-1">
                            Also Recommends
                          </div>
                          <ul className="flex flex-wrap gap-2">
                            {alsoRecommends.map((rec: string) => (
                              <li
                                key={rec}
                                className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-800"
                              >
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {biasIndicators.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 font-semibold mb-1">
                            Bias Indicators
                          </div>
                          <ul className="flex flex-wrap gap-2">
                            {biasIndicators.map((b: string) => (
                              <li
                                key={b}
                                className="bg-yellow-100 px-2 py-0.5 rounded text-xs text-yellow-800"
                              >
                                {b}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {detectedBiases.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 font-semibold mb-1">
                            Detected Biases
                          </div>
                          <ul className="space-y-1">
                            {detectedBiases.map((b: any, i: number) => (
                              <li key={b.biasName + i} className="border rounded p-2 bg-yellow-50">
                                <div className="font-semibold text-yellow-900 text-sm">
                                  {b.biasName}
                                </div>
                                <div className="text-xs text-gray-700">
                                  Severity: <span className="font-semibold">{b.severity}</span>
                                </div>
                                <div className="text-xs text-gray-700">
                                  Impact: {b.impactOnExperience}
                                </div>
                                <div className="text-xs text-gray-700">
                                  Score Influence:{' '}
                                  <span className="font-semibold">{b.scoreInfluence}</span>
                                </div>
                                <div className="text-xs text-gray-700">{b.explanation}</div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {context && (
                        <div>
                          <div className="text-xs text-gray-500 font-semibold mb-1">
                            Cultural Context
                          </div>
                          <div className="text-xs text-gray-700 mb-1">{context.justification}</div>
                          <div className="flex flex-wrap gap-2 mb-1">
                            {context.ideologicalThemes?.map((theme: string) => (
                              <span
                                key={theme}
                                className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs"
                              >
                                {theme}
                              </span>
                            ))}
                          </div>
                          <div className="text-xs text-gray-700">Audience Reactions:</div>
                          <ul className="ml-4 text-xs text-gray-700">
                            <li>
                              <span className="font-semibold">Aligned:</span>{' '}
                              {context.audienceReactions?.aligned}
                            </li>
                            <li>
                              <span className="font-semibold">Neutral:</span>{' '}
                              {context.audienceReactions?.neutral}
                            </li>
                            <li>
                              <span className="font-semibold">Opposed:</span>{' '}
                              {context.audienceReactions?.opposed}
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          }
          return null;
        })()}
      </div>
    </div>
  );
}
