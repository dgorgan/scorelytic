"use client";
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false }) as any;

type Result = {
  reviewId: string;
  field: string;
  seed: string;
  llm: string;
  similarity: string;
};

export default function Dashboard() {
  const [results, setResults] = useState<Result[]>([]);
  const [showMismatches, setShowMismatches] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/llm_review_batch_results.csv')
      .then(res => res.text())
      .then(text => {
        const lines = text.trim().split('\n').slice(1);
        setResults(lines.map(line => {
          const [reviewId, field, seed, llm, similarity] = line.split(',');
          return { reviewId, field, seed, llm, similarity };
        }));
      });
  }, []);

  if (!results.length) return <div>Loading...</div>;

  // Mismatches per field
  const fieldCounts: Record<string, number> = {};
  results.forEach(r => {
    if (parseFloat(r.similarity) < 0.8) {
      fieldCounts[r.field] = (fieldCounts[r.field] || 0) + 1;
    }
  });

  // Filtered results
  const filtered = results.filter(r => {
    const mismatch = parseFloat(r.similarity) < 0.8;
    if (showMismatches && !mismatch) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        r.reviewId.toLowerCase().includes(s) ||
        r.field.toLowerCase().includes(s) ||
        r.seed.toLowerCase().includes(s) ||
        r.llm.toLowerCase().includes(s)
      );
    }
    return true;
  });

  // Download filtered as CSV
  const downloadCSV = () => {
    const header = 'reviewId,field,seed,llm,similarity';
    const rows = filtered.map(r => [r.reviewId, r.field, JSON.stringify(r.seed), JSON.stringify(r.llm), r.similarity].join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'llm_review_filtered.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">LLM Batch Test Results</h1>
      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showMismatches} onChange={e => setShowMismatches(e.target.checked)} />
          Show only mismatches
        </label>
        <input
          type="text"
          className="border rounded px-2 py-1"
          placeholder="Search reviewId, field, text..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button
          className="ml-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={downloadCSV}
        >
          Download CSV
        </button>
      </div>
      <Plot
        data={[{
          x: Object.keys(fieldCounts),
          y: Object.values(fieldCounts),
          type: 'bar',
          marker: { color: 'crimson' }
        }]}
        layout={{ title: 'Mismatches per Field', width: 600, height: 400 }}
      />
      <div className="overflow-x-auto mt-8">
        <table className="min-w-full border border-gray-300 rounded-lg shadow text-sm bg-white">
          <thead className="bg-gray-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-2 border-b font-bold text-gray-900">Review ID</th>
              <th className="px-4 py-2 border-b font-bold text-gray-900">Field</th>
              <th className="px-4 py-2 border-b font-bold text-gray-900">Seed</th>
              <th className="px-4 py-2 border-b font-bold text-gray-900">LLM</th>
              <th className="px-4 py-2 border-b font-bold text-gray-900">Similarity</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const mismatch = parseFloat(r.similarity) < 0.8;
              return (
                <tr
                  key={i}
                  className={
                    mismatch
                      ? 'bg-red-100'
                      : i % 2 === 0
                      ? 'bg-white'
                      : 'bg-yellow-50'
                  }
                >
                  <td className="px-4 py-2 border-b whitespace-nowrap text-black">{r.reviewId}</td>
                  <td className="px-4 py-2 border-b whitespace-nowrap text-black">{r.field}</td>
                  <td className="px-4 py-2 border-b max-w-xs truncate text-black" title={r.seed}>{r.seed}</td>
                  <td className="px-4 py-2 border-b max-w-xs truncate text-black" title={r.llm}>{r.llm}</td>
                  <td className="px-4 py-2 border-b whitespace-nowrap text-center text-black">{r.similarity}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
} 