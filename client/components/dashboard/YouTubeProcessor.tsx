import { useState, useRef, useEffect } from 'react';
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

  useEffect(() => {
    if (progressLogs.length > 0) {
      const last = progressLogs[progressLogs.length - 1];
      setSteps((prev) => (prev.includes(last) ? prev : [...prev, last]));
      setCurrentStep(steps.length > 0 ? steps.length - 1 : 0);
    }
  }, [progressLogs, steps.length]);

  useEffect(() => {
    const target = steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0;
    if (progress < target) {
      const interval = setInterval(() => {
        setProgress((p) => Math.min(target, p + 1));
      }, 10);
      return () => clearInterval(interval);
    }
  }, [currentStep, progress, steps.length]);

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
      // SSE mode
      const url = buildYouTubeProcessStreamUrl(extractedId, generalAnalysis);
      const es = new window.EventSource(url);
      eventSourceRef.current = es;
      es.onmessage = (event) => {
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
      es.addEventListener('result', (event) => {
        setResult(JSON.parse(event.data));
        es.close();
        setProcessing(false);
        setIsSuccess(true);
      });
      es.addEventListener('error', (event) => {
        setError('Streaming error');
        es.close();
        setProcessing(false);
        setIsSuccess(false);
      });
    } else {
      // Regular POST mode
      try {
        const response = await fetch(buildYouTubeProcessUrl(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ videoId: extractedId, generalAnalysis }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || ERROR_MESSAGES.YOUTUBE.PROCESS_FAILED);
        }
        setResult(data);
        onProcessComplete?.(data);
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
              {JSON.stringify(result, null, 2)}
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
            {isSuccess && !error && (
              <div className="flex items-center text-green-600 mt-2">
                <CheckCircleIcon className="w-5 h-5 mr-2" />
                <span className="font-semibold">Success!</span>
              </div>
            )}
            {error && (
              <div className="flex items-center text-red-600 mt-2">
                <XCircleIcon className="w-5 h-5 mr-2" />
                <span className="font-semibold">{error}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
