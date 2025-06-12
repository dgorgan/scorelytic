import React, { useState } from 'react';
import { API_CONFIG } from '@scorelytic/shared';

const BATCH_API = `${API_CONFIG.BASE_URL}/api/youtube/batch-process`;
const UPSERT_API = `${API_CONFIG.BASE_URL}/api/youtube/upsert-llm`;

const defaultVideoIds = '';

const YouTubeBatchProcessor: React.FC = () => {
  const [videoIds, setVideoIds] = useState<string>(defaultVideoIds);
  const [mode, setMode] = useState<'full' | 'llm-only' | 'llm-test'>('full');
  const [llmModel, setLlmModel] = useState<string>('o3-pro');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upserting, setUpserting] = useState<string | null>(null);

  const handleRunBatch = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    const ids = videoIds
      .split(/[\s,]+/)
      .map((id) => id.trim())
      .filter(Boolean);
    try {
      const resp = await fetch(BATCH_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIds: ids, mode, llmModel }),
      });
      const data = await resp.json();
      if (data.error) setError(data.error);
      setResults(data.results || []);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleUpsert = async (videoId: string, sentiment: any, idx: number) => {
    setUpserting(videoId);
    try {
      const resp = await fetch(UPSERT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, sentiment }),
      });
      const data = await resp.json();
      if (data.success) {
        setResults((prev) =>
          prev.map((r, i) => (i === idx ? { ...r, data: { ...r.data, upserted: true } } : r)),
        );
      } else {
        alert(data.error || 'Upsert failed');
      }
    } catch (err: any) {
      alert(err.message || 'Upsert failed');
    } finally {
      setUpserting(null);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mt-8">
      <h3 className="text-lg font-bold text-gray-900 mb-4">YouTube Batch Processor</h3>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          YouTube Video IDs (comma, space, or newline separated) or URLs
        </label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-600"
          rows={3}
          value={videoIds}
          onChange={(e) => setVideoIds(e.target.value)}
          placeholder="dQw4w9WgXcQ, S8mbe6mF0js, https://www.youtube.com/watch?v=dQw4w9WgXcQ, https://www.youtube.com/watch?v=S8mbe6mF0js, ..."
          disabled={loading}
        />
      </div>
      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm font-medium text-gray-700">Mode:</label>
        <select
          className="border border-gray-300 rounded px-2 py-1 text-gray-700"
          value={mode}
          onChange={(e) => setMode(e.target.value as any)}
          disabled={loading}
        >
          <option value="full">Full Pipeline</option>
          <option value="llm-only">LLM-Only (demo_reviews, upsert)</option>
          <option value="llm-test">LLM-Only (test, no upsert)</option>
        </select>
        <label className="text-sm font-medium text-gray-700 ml-4">LLM Model:</label>
        <input
          className="border border-gray-300 rounded px-2 py-1 w-32 text-gray-700"
          value={llmModel}
          onChange={(e) => setLlmModel(e.target.value)}
          disabled={loading}
        />
      </div>
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleRunBatch}
        disabled={loading || !videoIds.trim()}
      >
        {loading ? 'Processing...' : 'Run Batch'}
      </button>
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}
      {results.length > 0 && (
        <div className="mt-6">
          <table className="min-w-full text-sm border">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1 border text-gray-900">Video ID</th>
                <th className="px-2 py-1 border text-gray-900">Status</th>
                <th className="px-2 py-1 border text-gray-900">Result/Error</th>
                <th className="px-2 py-1 border text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r.videoId || i} className={r.status === 'error' ? 'bg-red-50' : ''}>
                  <td className="px-2 py-1 border font-mono text-gray-700">{r.videoId}</td>
                  <td className="px-2 py-1 border text-gray-700">{r.status}</td>
                  <td className="px-2 py-1 border text-gray-700 break-all">
                    {r.status === 'success' ? (
                      <pre className="whitespace-pre-wrap text-xs text-gray-700">
                        {JSON.stringify(r.data, null, 2)}
                      </pre>
                    ) : (
                      <span className="text-red-700">{r.error}</span>
                    )}
                  </td>
                  <td className="px-2 py-1 border">
                    {mode === 'llm-test' && r.status === 'success' && !r.data.upserted && (
                      <button
                        className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        onClick={() => handleUpsert(r.videoId, r.data.sentiment, i)}
                        disabled={upserting === r.videoId}
                      >
                        {upserting === r.videoId ? 'Upserting...' : 'Upsert'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default YouTubeBatchProcessor;
