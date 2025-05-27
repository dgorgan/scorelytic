"use client";
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '../../services/supabase';
import Papa, { ParseResult } from 'papaparse';
import * as Tooltip from '@radix-ui/react-tooltip';
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false }) as unknown as React.FC<Record<string, unknown>>;

type Result = {
  reviewId: string;
  field: string;
  seed: string;
  llm: string;
  similarity: string;
};

type GroupedResult = {
  reviewId: string;
  seed: string;
  fields: Record<string, string>;
  idxs: Record<string, number>;
};

// Define types for CSV rows
interface BatchResultRow {
  reviewId: string;
  field: string;
  seed: string;
  llm: string;
  similarity: string;
}
interface SweepSummaryRow {
  model: string;
  prompt: string;
  field: string;
  total_mismatches: string;
  total_comparisons: string;
}

export default function Dashboard() {
  const [results, setResults] = useState<Result[]>([]);
  const [showMismatches, setShowMismatches] = useState(false);
  const [search, setSearch] = useState('');
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editLlm, setEditLlm] = useState('');
  const [editSimilarity, setEditSimilarity] = useState('');
  const [overrides, setOverrides] = useState<Record<number, { llm: string; similarity: string }>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unreviewed' | 'overridden'>('all');
  const [csvFile, setCsvFile] = useState<string>('llm_review_batch_results.csv');
  const [sweepSummary, setSweepSummary] = useState<SweepSummaryRow[]>([]);
  const [isSweepSummary, setIsSweepSummary] = useState(false);
  const [groupedView, setGroupedView] = useState(true);
  const [editReviewIdx, setEditReviewIdx] = useState<number | null>(null);
  const [editReviewFields, setEditReviewFields] = useState<Record<string, string>>({});
  const csvOptions = [
    { label: 'Batch Results', value: 'llm_review_batch_results.csv' },
    { label: 'Sweep Summary', value: 'llm_review_sweep_summary.csv' }
  ];

  useEffect(() => {
    fetch(`/${csvFile}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch ${csvFile}: ${res.status} ${res.statusText}`);
        }
        return res.text();
      })
      .then(text => {
        const parsed: ParseResult<BatchResultRow | SweepSummaryRow> = Papa.parse(text, { header: true, skipEmptyLines: true });
        if (parsed.errors.length) {
          throw new Error('CSV parse error: ' + parsed.errors.map(e => e.message).join('; '));
        }
        const data = parsed.data as (BatchResultRow | SweepSummaryRow)[];
        if (data.length && 'total_mismatches' in data[0] && 'total_comparisons' in data[0]) {
          setIsSweepSummary(true);
          setSweepSummary(data.map(row => ({
            model: (row as SweepSummaryRow).model,
            prompt: (row as SweepSummaryRow).prompt,
            field: (row as SweepSummaryRow).field,
            total_mismatches: (row as SweepSummaryRow).total_mismatches,
            total_comparisons: (row as SweepSummaryRow).total_comparisons
          })));
          setResults([]);
        } else {
          setIsSweepSummary(false);
          setResults(
            data.map(row => ({
              reviewId: (row as BatchResultRow).reviewId,
              field: (row as BatchResultRow).field,
              seed: (row as BatchResultRow).seed,
              llm: (row as BatchResultRow).llm,
              similarity: (row as BatchResultRow).similarity
            }))
          );
        }
      })
      .catch((err: Error) => {
        setError(err.message);
        console.error('Error loading CSV:', err);
      });
  }, [csvFile]);

  if (error) return <div className="text-red-600 p-8">{error}</div>;

  if (isSweepSummary) {
    return (
      <Tooltip.Provider>
        <div className="p-8 max-w-6xl mx-auto bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">LLM Sweep Summary</h1>
          <div className="flex flex-wrap gap-4 mb-4 items-end">
            <label className="flex items-center gap-2 text-gray-900 font-medium">
              <span className="font-semibold">Sweep:</span>
              <select
                className="border border-gray-300 rounded px-2 py-1 bg-neutral-50 text-gray-900 focus:ring-2 focus:ring-blue-400"
                value={csvFile}
                onChange={e => setCsvFile(e.target.value)}
              >
                {csvOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="w-full max-w-full overflow-x-auto mb-8">
            <Plot
              data={[{
                x: sweepSummary.map(row => `${row.model} | ${row.prompt} | ${row.field}`),
                y: sweepSummary.map(row => row.total_mismatches),
                type: 'bar',
                marker: { color: 'crimson' }
              }]}
              layout={{ title: 'Mismatches per Sweep Config', autosize: true, width: undefined, height: 400, margin: { l: 40, r: 20, t: 40, b: 40 } }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          <div className="overflow-x-auto mt-8 max-w-full">
            <table className="w-full min-w-max border border-gray-300 rounded-lg shadow text-sm bg-white">
              <thead className="bg-neutral-100 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2 border-b font-bold text-gray-900 w-[120px] max-w-[300px]">Model</th>
                  <th className="px-4 py-2 border-b font-bold text-gray-900 w-[180px] max-w-[300px]">Prompt</th>
                  <th className="px-4 py-2 border-b font-bold text-gray-900 w-[120px] max-w-[300px]">Field</th>
                  <th className="px-4 py-2 border-b font-bold text-gray-900 w-[120px] max-w-[300px]">Mismatches</th>
                  <th className="px-4 py-2 border-b font-bold text-gray-900 w-[120px] max-w-[300px]">Comparisons</th>
                </tr>
              </thead>
              <tbody>
                {sweepSummary.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500 bg-neutral-50">Loading summary...</td>
                  </tr>
                ) : (
                  sweepSummary.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-yellow-50'}>
                      <td className="px-4 py-2 border-b w-[120px] max-w-[300px] text-black">{row.model}</td>
                      <td className="px-4 py-2 border-b w-[180px] max-w-[300px] text-black">{row.prompt}</td>
                      <td className="px-4 py-2 border-b w-[120px] max-w-[300px] text-black">{row.field}</td>
                      <td className="px-4 py-2 border-b w-[120px] max-w-[300px] text-center text-black">{row.total_mismatches}</td>
                      <td className="px-4 py-2 border-b w-[120px] max-w-[300px] text-center text-black">{row.total_comparisons}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Tooltip.Provider>
    );
  }

  if (!isSweepSummary && !results.length) return <div>Loading...</div>;

  // Mismatches per field, but skip fields where all seeds are empty/null/undefined
  const fieldCounts: Record<string, number> = {};
  const fieldsWithNonEmptySeed = new Set(
    results
      .filter(r => r.seed !== undefined && r.seed !== null && r.seed !== '' && r.seed !== 'null' && r.seed !== 'undefined')
      .map(r => r.field)
  );
  results.forEach(r => {
    if (!fieldsWithNonEmptySeed.has(r.field)) return; // skip LLM-only fields
    if (parseFloat(r.similarity) < 0.8) {
      fieldCounts[r.field] = (fieldCounts[r.field] || 0) + 1;
    }
  });

  // Filtered results
  const filtered = results.filter((r, i) => {
    const mismatch = parseFloat(r.similarity) < 0.8;
    const overridden = overrides[i] !== undefined;
    if (filter === 'unreviewed' && overridden) return false;
    if (filter === 'overridden' && !overridden) return false;
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

  // Group results by reviewId
  const reviewFields = Array.from(new Set(results.map(r => r.field)));
  const groupedResults: GroupedResult[] = Object.values(results.reduce((acc, r, i) => {
    if (!acc[r.reviewId]) acc[r.reviewId] = { reviewId: r.reviewId, seed: r.seed, fields: {}, idxs: {} };
    acc[r.reviewId].fields[r.field] = overrides[i]?.llm ?? r.llm;
    acc[r.reviewId].idxs[r.field] = i;
    return acc;
  }, {} as Record<string, GroupedResult>));

  // Helper: is a field a mismatch?
  const isMismatch = (sim: string) => parseFloat(sim) < 0.8;
  // For grouped view: find mismatches per review
  const groupedResultsWithMismatch = groupedResults.map(row => {
    const mismatches = reviewFields.filter(field => {
      const idx = row.idxs[field];
      const sim = idx !== undefined ? results[idx]?.similarity : undefined;
      return isMismatch(sim ?? '1');
    });
    if (mismatches.length > 0) {
      console.log('Review', row.reviewId, 'has mismatches in fields:', mismatches.map(f => ({ field: f, sim: results[row.idxs[f]]?.similarity })));
    }
    return { ...row, hasMismatch: mismatches.length > 0 };
  });
  const filteredGroupedResults = showMismatches
    ? groupedResultsWithMismatch.filter(row => row.hasMismatch)
    : groupedResultsWithMismatch;

  // Helper to pretty-print for tooltip
  const prettyTooltip = (val: unknown) => {
    if (val === undefined || val === null) return '';
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed.join(', ');
        if (typeof parsed === 'object') return JSON.stringify(parsed, null, 2);
        return parsed.toString();
      } catch {
        return val;
      }
    }
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
  };

  const displayCell = (val: unknown): React.ReactNode => {
    if (val === undefined || val === null || val === 'undefined' || val === 'null') return <span className="text-gray-400 italic">N/A</span>;
    if (typeof val === 'string') {
      // Try to parse as array, even if not perfectly stringified
      if ((val.startsWith('[') && val.endsWith(']')) || val.includes('","')) {
        try {
          const arr = JSON.parse(val);
          if (Array.isArray(arr)) return arr.length ? arr.join(', ') : <span className="text-gray-400 italic">N/A</span>;
        } catch {
          // fallback: try to split manually
          const arr = val.replace(/\[|\]|"/g, '').split(',').map(s => s.trim()).filter(Boolean);
          return arr.length ? arr.join(', ') : <span className="text-gray-400 italic">N/A</span>;
        }
      }
    }
    if (val === '') return <span className="text-gray-400 italic">N/A</span>;
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return val.toString();
    return '';
  };

  return (
    <Tooltip.Provider>
      <div className="p-8 max-w-5xl mx-auto bg-white rounded-lg shadow-md">
        <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
          <h2 className="text-lg font-bold text-blue-900 mb-2">How to use this dashboard</h2>
          <ul className="list-disc pl-6 text-blue-900 text-sm space-y-1">
            <li><b>Bar graph</b>: Each bar shows the number of <b>mismatches</b> for a field across all reviews. <b>X-axis</b> = field name. <b>Y-axis</b> = count of reviews where LLM output and seed differ significantly (similarity &lt; 0.8). Taller bars mean more disagreement between LLM and original data for that field.</li>
            <li><b>Grouped View</b>: Each row is a reviewId, with all fields shown as columns. Cells show the LLM output and the original (seed) value for each field. Red rows have at least one mismatch.</li>
            <li><b>Advanced QA</b>: Each row is a single (reviewId, field) pair. You can see and edit the LLM output and similarity for each field individually.</li>
            <li>Use the filters, search, and CSV download to explore or export results.</li>
            <li>Fields like <b>sentimentScore</b> or <b>verdict</b> have no original value (seed), so their seed cell will show <span className="text-gray-400 italic">N/A</span>.</li>
          </ul>
        </div>
        <h1 className="text-2xl font-bold mb-4 text-gray-900">LLM Batch Test Results</h1>
        <div className="flex flex-wrap gap-4 mb-4 items-end">
          <label className="flex items-center gap-2 text-gray-900 font-medium">
            <input type="checkbox" checked={showMismatches} onChange={e => setShowMismatches(e.target.checked)} />
            Show only mismatches
          </label>
          <input
            type="text"
            className="border border-gray-300 rounded px-2 py-1 bg-neutral-50 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-400"
            placeholder="Search reviewId, field, text..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button
            className="ml-2 px-3 py-1 bg-blue-700 text-white rounded hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow"
            onClick={downloadCSV}
          >
            Download CSV
          </button>
          <div className="flex gap-2">
            <button
              className={`px-3 py-1 rounded font-medium ${filter === 'all' ? 'bg-blue-700 text-white' : 'bg-neutral-200 text-gray-900'} hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400`}
              onClick={() => setFilter('all')}
            >All</button>
            <button
              className={`px-3 py-1 rounded font-medium ${filter === 'unreviewed' ? 'bg-blue-700 text-white' : 'bg-neutral-200 text-gray-900'} hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400`}
              onClick={() => setFilter('unreviewed')}
            >Unreviewed</button>
            <button
              className={`px-3 py-1 rounded font-medium ${filter === 'overridden' ? 'bg-blue-700 text-white' : 'bg-neutral-200 text-gray-900'} hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400`}
              onClick={() => setFilter('overridden')}
            >Overridden</button>
          </div>
          <label className="flex items-center gap-2 text-gray-900 font-medium">
            <span className="font-semibold">Sweep:</span>
            <select
              className="border border-gray-300 rounded px-2 py-1 bg-neutral-50 text-gray-900 focus:ring-2 focus:ring-blue-400"
              value={csvFile}
              onChange={e => setCsvFile(e.target.value)}
            >
              {csvOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <button
            className={`px-3 py-1 rounded font-medium ${groupedView ? 'bg-blue-700 text-white' : 'bg-neutral-200 text-gray-900'} hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400`}
            onClick={() => setGroupedView(true)}
          >Grouped View</button>
          <button
            className={`px-3 py-1 rounded font-medium ${!groupedView ? 'bg-blue-700 text-white' : 'bg-neutral-200 text-gray-900'} hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400`}
            onClick={() => setGroupedView(false)}
          >Advanced QA</button>
        </div>
        <div className="w-full max-w-full overflow-x-auto mb-8">
          <Plot
            data={[{
              x: Object.keys(fieldCounts),
              y: Object.values(fieldCounts),
              type: 'bar',
              marker: { color: 'crimson' }
            }]}
            layout={{ title: 'Mismatches per Field', autosize: true, width: undefined, height: 400, margin: { l: 40, r: 20, t: 40, b: 40 } }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
          />
          <div className="mt-2 text-xs text-blue-900 bg-blue-50 border-l-4 border-blue-400 rounded px-3 py-2 max-w-xl">
            <b>Note:</b> Each bar shows the number of mismatches (similarity &lt; 0.8) for that field. <b>Higher bars mean more disagreement</b> between LLM and original data (worse). Lower is better.
          </div>
        </div>
        {/* Row color legend - place above each table, improve contrast */}
        <div className="flex flex-wrap gap-4 items-center mb-4 mt-2 text-xs font-semibold bg-neutral-100 border border-neutral-300 rounded px-3 py-2 shadow-sm">
          <div className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 rounded bg-red-400 border-2 border-red-700"></span>
            <span className="text-red-800">Mismatch</span>
            <Tooltip.Root delayDuration={100}>
              <Tooltip.Trigger asChild>
                <span className="ml-1 text-gray-500 cursor-help">?</span>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="z-50 rounded bg-gray-900 text-white px-2 py-1 text-xs shadow-lg" side="top" align="center">
                  At least one field in this row has a similarity &lt; 0.8 between LLM and seed (disagreement)
                  <Tooltip.Arrow className="fill-gray-900" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 rounded bg-green-400 border-2 border-green-700"></span>
            <span className="text-green-900">Overridden</span>
            <Tooltip.Root delayDuration={100}>
              <Tooltip.Trigger asChild>
                <span className="ml-1 text-gray-500 cursor-help">?</span>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="z-50 rounded bg-gray-900 text-white px-2 py-1 text-xs shadow-lg" side="top" align="center">
                  This row has been manually edited/overridden by a reviewer
                  <Tooltip.Arrow className="fill-gray-900" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 rounded bg-yellow-300 border-2 border-yellow-700"></span>
            <span className="text-yellow-900">Alt row</span>
            <Tooltip.Root delayDuration={100}>
              <Tooltip.Trigger asChild>
                <span className="ml-1 text-gray-500 cursor-help">?</span>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="z-50 rounded bg-gray-900 text-white px-2 py-1 text-xs shadow-lg" side="top" align="center">
                  Alternating row color for readability (no special meaning)
                  <Tooltip.Arrow className="fill-gray-900" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 rounded bg-white border-2 border-gray-500"></span>
            <span className="text-gray-800">Normal</span>
            <Tooltip.Root delayDuration={100}>
              <Tooltip.Trigger asChild>
                <span className="ml-1 text-gray-500 cursor-help">?</span>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="z-50 rounded bg-gray-900 text-white px-2 py-1 text-xs shadow-lg" side="top" align="center">
                  No mismatch or override; normal data row
                  <Tooltip.Arrow className="fill-gray-900" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </div>
        </div>
        {groupedView ? (
          <div className="overflow-x-auto mt-8 max-w-full">
            <table className="w-full min-w-max border border-gray-300 rounded-lg shadow text-sm bg-white">
              <thead className="bg-neutral-100 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2 border-b font-bold text-gray-900 w-[120px] max-w-[300px]">Review ID</th>
                  {reviewFields.map(field => (
                    <th key={field} className="px-4 py-2 border-b font-bold text-gray-900 w-[180px] max-w-[300px]">{field}</th>
                  ))}
                  <th className="px-4 py-2 border-b font-bold text-gray-900 w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroupedResults.map((row: GroupedResult & { hasMismatch: boolean }, i: number) => (
                  <tr
                    key={row.reviewId}
                    className={
                      row.hasMismatch
                        ? 'bg-red-50 hover:bg-red-100 transition-colors'
                        : i % 2 === 0
                        ? 'bg-white hover:bg-neutral-100 transition-colors'
                        : 'bg-yellow-50 hover:bg-yellow-100 transition-colors'
                    }
                  >
                    <td className="px-4 py-2 border-b w-[120px] max-w-[300px] text-black">{row.reviewId}</td>
                    {reviewFields.map((field: string) => (
                      <td key={field} className="px-4 py-2 border-b w-[180px] max-w-[300px] text-black align-top">
                        <div className="bg-gray-50 rounded p-2 mb-1 border border-gray-200">
                          <span className="font-bold text-xs text-gray-600">Seed</span>
                          <Tooltip.Root delayDuration={200}>
                            <Tooltip.Trigger asChild>
                              <div className="text-sm text-gray-700 break-words line-clamp-2 cursor-help">
                                {displayCell(results[row.idxs[field]]?.seed)}
                              </div>
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                              <Tooltip.Content className="z-50 max-w-xs rounded bg-gray-900 text-white px-3 py-2 text-xs shadow-lg whitespace-pre-line" side="top" align="center">
                                {prettyTooltip(results[row.idxs[field]]?.seed)}
                                <Tooltip.Arrow className="fill-gray-900" />
                              </Tooltip.Content>
                            </Tooltip.Portal>
                          </Tooltip.Root>
                        </div>
                        <div className="border-t border-dashed border-blue-200 my-1" />
                        <div className="bg-blue-50 rounded p-2 mt-1 border border-blue-100">
                          <span className="font-bold text-xs text-blue-700">LLM</span>
                          <Tooltip.Root delayDuration={200}>
                            <Tooltip.Trigger asChild>
                              <div className="text-sm text-blue-900 break-words line-clamp-2 cursor-help">
                                {displayCell(row.fields[field])}
                              </div>
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                              <Tooltip.Content className="z-50 max-w-xs rounded bg-gray-900 text-white px-3 py-2 text-xs shadow-lg whitespace-pre-line" side="top" align="center">
                                {prettyTooltip(row.fields[field])}
                                <Tooltip.Arrow className="fill-gray-900" />
                              </Tooltip.Content>
                            </Tooltip.Portal>
                          </Tooltip.Root>
                        </div>
                      </td>
                    ))}
                    <td className="px-4 py-2 border-b w-[100px] text-center">
                      <button
                        className="px-2 py-1 bg-blue-700 text-white rounded hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
                        onClick={() => {
                          setEditReviewIdx(i);
                          setEditReviewFields({ ...row.fields });
                          setError(null);
                        }}
                      >Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Edit Review Modal */}
            {editReviewIdx !== null && (
              <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg border border-gray-300">
                  <h2 className="text-xl font-bold mb-4 text-gray-900">Edit Review Fields</h2>
                  {reviewFields.map(field => (
                    <div key={field} className="mb-4">
                      <label className="block mb-2 text-gray-900 font-semibold">{field}</label>
                      <textarea
                        className="w-full border border-gray-300 rounded p-2 text-gray-900 bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        rows={2}
                        value={editReviewFields[field] ?? ''}
                        onChange={e => setEditReviewFields(f => ({ ...f, [field]: e.target.value }))}
                      />
                    </div>
                  ))}
                  {error && <div className="text-red-600 mb-2">{error}</div>}
                  <div className="flex gap-2 justify-end mt-4">
                    <button
                      className="px-3 py-1 bg-neutral-200 text-gray-900 rounded hover:bg-neutral-300 focus:outline-none"
                      onClick={() => setEditReviewIdx(null)}
                      disabled={saving}
                    >Cancel</button>
                    <button
                      className="px-3 py-1 bg-green-700 text-white rounded hover:bg-green-800 focus:outline-none"
                      disabled={saving}
                      onClick={async () => {
                        setSaving(true);
                        setError(null);
                        const row = filteredGroupedResults[editReviewIdx];
                        const updates = reviewFields
                          .filter(field => editReviewFields[field] !== row.fields[field])
                          .map(field => ({
                            review_id: row.reviewId,
                            field,
                            llm: editReviewFields[field],
                            similarity: results[row.idxs[field]]?.similarity ?? ''
                          }));
                        if (updates.length === 0) {
                          setEditReviewIdx(null);
                          setSaving(false);
                          return;
                        }
                        const { error: upsertError } = await supabase
                          .from('llm_review_overrides')
                          .upsert(updates, { onConflict: 'review_id,field' });
                        if (upsertError) {
                          setError('Failed to save override: ' + upsertError.message);
                          setSaving(false);
                          return;
                        }
                        setOverrides(prev => {
                          const newOverrides = { ...prev };
                          reviewFields.forEach(field => {
                            if (editReviewFields[field] !== row.fields[field]) {
                              newOverrides[row.idxs[field]] = {
                                llm: editReviewFields[field],
                                similarity: results[row.idxs[field]]?.similarity ?? ''
                              };
                            }
                          });
                          return newOverrides;
                        });
                        setEditReviewIdx(null);
                        setSaving(false);
                      }}
                    >{saving ? 'Saving...' : 'Save'}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto mt-8 max-w-full">
            <table className="w-full min-w-max border border-gray-300 rounded-lg shadow text-sm bg-white">
              <thead className="bg-neutral-100 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2 border-b font-bold text-gray-900 w-[120px] max-w-[300px]">Review ID</th>
                  <th className="px-4 py-2 border-b font-bold text-gray-900 w-[100px] max-w-[300px]">Field</th>
                  <th className="px-4 py-2 border-b font-bold text-gray-900 w-[180px] max-w-[300px]">Seed</th>
                  <th className="px-4 py-2 border-b font-bold text-gray-900 w-[180px] max-w-[300px]">LLM</th>
                  <th className="px-4 py-2 border-b font-bold text-gray-900 w-[100px]">Similarity</th>
                  <th className="px-4 py-2 border-b font-bold text-gray-900 w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500 bg-neutral-50">No results found.</td>
                  </tr>
                ) : (
                  filtered.map((r, i) => {
                    const mismatch = parseFloat(r.similarity) < 0.8;
                    const overridden = overrides[i] !== undefined;
                    return (
                      <tr
                        key={i}
                        className={
                          overridden
                            ? 'bg-green-50 hover:bg-green-100 transition-colors'
                            : mismatch
                            ? 'bg-red-50 hover:bg-red-100 transition-colors'
                            : i % 2 === 0
                            ? 'bg-white hover:bg-neutral-100 transition-colors'
                            : 'bg-yellow-50 hover:bg-yellow-100 transition-colors'
                        }
                      >
                        <td
                          className="px-4 py-2 border-b w-[120px] max-w-[300px] text-black"
                          title={typeof displayCell(r.reviewId) === 'string' ? displayCell(r.reviewId) as string : ''}
                        >
                          {displayCell(r.reviewId)}
                        </td>
                        <td
                          className="px-4 py-2 border-b w-[100px] max-w-[300px] text-black"
                          title={typeof displayCell(r.field) === 'string' ? displayCell(r.field) as string : ''}
                        >
                          {displayCell(r.field)}
                        </td>
                        <td
                          className="px-4 py-2 border-b w-[180px] max-w-[300px] text-black"
                          title={typeof displayCell(r.seed) === 'string' ? displayCell(r.seed) as string : ''}
                        >
                          {displayCell(r.seed)}
                        </td>
                        <td
                          className="px-4 py-2 border-b w-[180px] max-w-[300px] text-black"
                          title={typeof displayCell(overridden ? overrides[i].llm : r.llm) === 'string' ? displayCell(overridden ? overrides[i].llm : r.llm) as string : ''}
                        >
                          {displayCell(overridden ? overrides[i].llm : r.llm)}
                        </td>
                        <td className="px-4 py-2 border-b w-[100px] text-center text-black">
                          {(() => {
                            const seedVal = r.seed;
                            const llmVal = overridden ? overrides[i].llm : r.llm;
                            if (!seedVal || seedVal === 'undefined' || seedVal === 'null' || !llmVal || llmVal === 'undefined' || llmVal === 'null') {
                              return <span className="text-gray-400 italic">N/A</span>;
                            }
                            return displayCell(overridden ? overrides[i].similarity : r.similarity);
                          })()}
                        </td>
                        <td className="px-4 py-2 border-b w-[100px] text-center">
                          <button
                            className="px-2 py-1 bg-blue-700 text-white rounded hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow"
                            onClick={() => {
                              setEditIdx(i);
                              setEditLlm(overridden ? overrides[i].llm : r.llm);
                              setEditSimilarity(overridden ? overrides[i].similarity : r.similarity);
                              setError(null);
                            }}
                          >Edit</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
        {/* Edit Modal */}
        {editIdx !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg border border-gray-300">
              <h2 className="text-xl font-bold mb-4 text-gray-900">Edit Review Fields</h2>
              <label className="block mb-2 text-gray-900 font-semibold">LLM Output</label>
              <textarea
                className="w-full border border-gray-300 rounded p-2 mb-4 text-gray-900 bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                rows={4}
                value={editLlm}
                onChange={e => setEditLlm(e.target.value)}
              />
              <label className="block mb-2 text-gray-900 font-semibold">Similarity</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded p-2 mb-4 text-gray-900 bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={editSimilarity}
                onChange={e => setEditSimilarity(e.target.value)}
              />
              {error && <div className="text-red-600 mb-2">{error}</div>}
              <div className="flex gap-2 justify-end mt-4">
                <button
                  className="px-3 py-1 bg-neutral-200 text-gray-900 rounded hover:bg-neutral-300 focus:outline-none"
                  onClick={() => setEditIdx(null)}
                  disabled={saving}
                >Cancel</button>
                <button
                  className="px-3 py-1 bg-green-700 text-white rounded hover:bg-green-800 focus:outline-none"
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    setError(null);
                    const row = filtered[editIdx!];
                    // Save to Supabase (upsert by reviewId+field)
                    const { error: upsertError } = await supabase
                      .from('llm_review_overrides')
                      .upsert([
                        {
                          review_id: row.reviewId,
                          field: row.field,
                          llm: editLlm,
                          similarity: editSimilarity
                        }
                      ], { onConflict: 'review_id,field' });
                    if (upsertError) {
                      setError('Failed to save override: ' + upsertError.message);
                      setSaving(false);
                      return;
                    }
                    setOverrides(prev => ({ ...prev, [editIdx!]: { llm: editLlm, similarity: editSimilarity } }));
                    setEditIdx(null);
                    setSaving(false);
                  }}
                >{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Tooltip.Provider>
  );
} 