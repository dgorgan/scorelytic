import { useState } from 'react';
import {
  buildYouTubeMetadataUrl,
  buildYouTubeProcessUrl,
  ERROR_MESSAGES,
} from '@/shared/constants/api';
import { extractVideoId } from '@/shared/utils/youtube';

interface YouTubeProcessorProps {
  onProcessComplete?: (result: any) => void;
}

export default function YouTubeProcessor({ onProcessComplete }: YouTubeProcessorProps) {
  const [videoId, setVideoId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    const extractedId = extractVideoId(videoId.trim());
    if (!extractedId) {
      setError(ERROR_MESSAGES.YOUTUBE.INVALID_ID);
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(buildYouTubeProcessUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId: extractedId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || ERROR_MESSAGES.YOUTUBE.PROCESS_FAILED);
      }

      setResult(data);
      onProcessComplete?.(data);
    } catch (err: any) {
      setError(err.message || ERROR_MESSAGES.YOUTUBE.PROCESS_FAILED);
    } finally {
      setProcessing(false);
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
      </div>
    </div>
  );
}
