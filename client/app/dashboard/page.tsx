'use client';
import { useState, useEffect, useMemo } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import Papa from 'papaparse';
import { supabase } from '@/services/supabase';
import FieldMismatchChart from '@/components/dashboard/FieldMismatchChart';
import SweepSummaryChart from '@/components/dashboard/SweepSummaryChart';
import DashboardControls from '@/components/dashboard/DashboardControls';
import GroupedTable from '@/components/dashboard/GroupedTable';
import AdvancedTable from '@/components/dashboard/AdvancedTable';
import RowColorLegend from '@/components/dashboard/RowColorLegend';
import EditReviewModal from '@/components/dashboard/EditReviewModal';
import EditResultModal from '@/components/dashboard/EditResultModal';
import YouTubeProcessor from '@/components/dashboard/YouTubeProcessor';
import {
  Result,
  GroupedResult,
  BatchResultRow,
  SweepSummaryRow,
} from '@/components/dashboard/utils';

export default function Dashboard() {
  const [results, setResults] = useState<Result[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [sweepSummary, setSweepSummary] = useState<SweepSummaryRow[]>([]);
  const [showMismatches, setShowMismatches] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unreviewed' | 'overridden'>('all');
  const [csvFile, setCsvFile] = useState('llm_review_batch_results.csv');
  const [groupedView, setGroupedView] = useState(true);

  // Edit modal state
  const [editReviewModal, setEditReviewModal] = useState<{
    isOpen: boolean;
    reviewId: string;
    fields: Record<string, string>;
    index: number;
  }>({
    isOpen: false,
    reviewId: '',
    fields: {},
    index: -1,
  });

  const [editResultModal, setEditResultModal] = useState<{
    isOpen: boolean;
    result: Result;
    index: number;
  }>({
    isOpen: false,
    result: {} as Result,
    index: -1,
  });

  const csvOptions = [
    {
      label: 'LLM Review Batch Results',
      value: 'llm_review_batch_results.csv',
    },
    { label: 'Bias Mismatches', value: 'bias_mismatches.csv' },
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(`/${csvFile}`);
        if (!response.ok) {
          console.warn(`Could not fetch ${csvFile}: ${response.status}`);
          setResults([]);
          setOverrides([]);
          setSweepSummary([]);
          return;
        }
        const csvText = await response.text();

        let parsed;
        try {
          parsed = Papa.parse<BatchResultRow>(csvText, {
            header: true,
            skipEmptyLines: true,
            transform: (value) => {
              // Clean up malformed values
              if (typeof value === 'string') {
                return value.trim();
              }
              return value;
            },
          });
        } catch (parseError) {
          console.error('CSV parsing error:', parseError);
          setResults([]);
          return;
        }

        let transformedResults: Result[] = parsed.data
          .filter((row) => {
            // More robust filtering for malformed data
            if (!row.reviewId) return false;
            if (csvFile === 'bias_mismatches.csv') {
              // For bias mismatches, we just need reviewId
              return true;
            }
            // For regular CSV, we need field
            return !!row.field;
          })
          .map((row) => ({
            reviewId: row.reviewId,
            field: row.field || 'biasIndicators', // Default to biasIndicators for bias mismatches CSV
            seed: row.seed || '',
            llm: row.llm || '',
            similarity: row.similarity || '0',
          }))
          .filter((result) => {
            // Filter out any results that still have invalid data
            return result.reviewId && result.field;
          });

        // Load overrides from Supabase and merge with CSV data
        const { data: overrides, error: overridesError } = await supabase
          .from('llm_review_overrides')
          .select('*');

        if (overridesError) {
          console.error('Error loading overrides:', overridesError);
        } else {
          // Store overrides for filtering
          setOverrides(overrides || []);

          // Apply overrides to the results
          if (overrides && overrides.length > 0) {
            transformedResults = transformedResults.map((result) => {
              const override = overrides.find(
                (o) => o.review_id === result.reviewId && o.field === result.field,
              );

              if (override) {
                return {
                  ...result,
                  llm: override.llm,
                  similarity: override.similarity || result.similarity,
                };
              }

              return result;
            });
          }
        }

        setResults(transformedResults);

        // Load sweep summary if available
        try {
          const sweepResponse = await fetch('/llm_review_sweep_summary.csv');
          if (sweepResponse.ok) {
            const sweepCsvText = await sweepResponse.text();
            const sweepParsed = Papa.parse<SweepSummaryRow>(sweepCsvText, {
              header: true,
            });
            setSweepSummary(sweepParsed.data.filter((row) => row.model && row.field));
          } else {
            // File doesn't exist, clear sweep summary
            setSweepSummary([]);
          }
        } catch (error) {
          // File doesn't exist or other error, clear sweep summary
          setSweepSummary([]);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [csvFile]);

  const filteredResults = useMemo(() => {
    const filtered = results.filter((result) => {
      const similarity = parseFloat(result.similarity);
      const isMismatch = similarity < 0.8;

      if (showMismatches && !isMismatch) return false;

      // Apply filter for unreviewed/overridden
      if (filter === 'unreviewed') {
        // Show mismatches that haven't been overridden
        const hasOverride = overrides.some(
          (o) => o.review_id === result.reviewId && o.field === result.field,
        );
        if (!isMismatch || hasOverride) return false;
      } else if (filter === 'overridden') {
        // Show only items that have been manually edited
        const hasOverride = overrides.some(
          (o) => o.review_id === result.reviewId && o.field === result.field,
        );
        if (!hasOverride) return false;
      }

      if (search) {
        const searchLower = search.toLowerCase();
        if (
          !result.reviewId.toLowerCase().includes(searchLower) &&
          !result.field.toLowerCase().includes(searchLower) &&
          !result.seed.toLowerCase().includes(searchLower) &&
          !result.llm.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      return true;
    });

    // Debug logging
    if (filter === 'overridden') {
      console.log('Debug - Overrides:', overrides);
      console.log('Debug - Filtered results for overridden:', filtered);
      console.log('Debug - Looking for reviewId:', '0ae8ebb8-6eda-406e-869b-f4af03eeb38e');
    }

    return filtered;
  }, [results, showMismatches, search, filter, overrides]);

  const groupedResults = useMemo(() => {
    const grouped: Record<string, GroupedResult> = {};

    results.forEach((result, index) => {
      if (!grouped[result.reviewId]) {
        grouped[result.reviewId] = {
          reviewId: result.reviewId,
          seed: result.seed,
          fields: {},
          idxs: {},
        };
      }
      grouped[result.reviewId].fields[result.field] = result.llm;
      grouped[result.reviewId].idxs[result.field] = index;
    });

    return Object.values(grouped);
  }, [results]);

  const filteredGroupedResults = useMemo(() => {
    return groupedResults
      .map((group) => {
        const hasMismatch = Object.keys(group.fields).some((field) => {
          const result = results[group.idxs[field]];
          return result && parseFloat(result.similarity) < 0.8;
        });
        return { ...group, hasMismatch };
      })
      .filter((group) => {
        if (showMismatches && !group.hasMismatch) return false;

        // Apply filter for unreviewed/overridden
        if (filter === 'unreviewed') {
          // Show groups with mismatches that haven't been overridden
          const hasAnyOverride = Object.keys(group.fields).some((field) =>
            overrides.some((o) => o.review_id === group.reviewId && o.field === field),
          );
          if (!group.hasMismatch || hasAnyOverride) return false;
        } else if (filter === 'overridden') {
          // Show only groups that have at least one override
          const hasAnyOverride = Object.keys(group.fields).some((field) =>
            overrides.some((o) => o.review_id === group.reviewId && o.field === field),
          );
          if (!hasAnyOverride) return false;
        }

        if (search) {
          const searchLower = search.toLowerCase();
          const matchesReviewId = group.reviewId.toLowerCase().includes(searchLower);
          const matchesFields = Object.entries(group.fields).some(
            ([field, value]) =>
              field.toLowerCase().includes(searchLower) ||
              String(value).toLowerCase().includes(searchLower),
          );
          if (!matchesReviewId && !matchesFields) return false;
        }

        return true;
      });
  }, [groupedResults, results, showMismatches, search, overrides, filter]);

  const fieldCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    results.forEach((result) => {
      const similarity = parseFloat(result.similarity);
      if (similarity < 0.8) {
        counts[result.field] = (counts[result.field] || 0) + 1;
      }
    });
    return counts;
  }, [results]);

  const reviewFields = useMemo(() => {
    const fields = new Set<string>();
    results.forEach((result) => fields.add(result.field));
    return Array.from(fields).sort();
  }, [results]);

  const downloadCSV = () => {
    const csv = groupedView ? Papa.unparse(filteredGroupedResults) : Papa.unparse(filteredResults);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `filtered_${csvFile}`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const editReview = (index: number) => {
    const row = filteredGroupedResults[index];
    setEditReviewModal({
      isOpen: true,
      reviewId: row.reviewId,
      fields: row.fields,
      index,
    });
  };

  const editResult = (index: number) => {
    const result = filteredResults[index];
    setEditResultModal({
      isOpen: true,
      result,
      index,
    });
  };

  const handleSaveReview = async (updatedFields: Record<string, string>) => {
    try {
      const reviewId = editReviewModal.reviewId;

      // Save each field to llm_review_overrides table
      const promises = Object.entries(updatedFields).map(([field, llm]) => {
        const payload = {
          review_id: reviewId,
          field,
          llm,
          similarity: null, // We don't have similarity for grouped edits
        };
        return supabase.from('llm_review_overrides').upsert(payload, {
          onConflict: 'review_id,field',
        });
      });

      const results = await Promise.all(promises);

      // Check for errors
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        console.error('Supabase errors:', errors);
        throw new Error(`Failed to save: ${errors.map((e) => e.error?.message).join(', ')}`);
      }

      // Update local state
      setResults((prevResults) =>
        prevResults.map((result) => {
          if (result.reviewId === reviewId && updatedFields[result.field] !== undefined) {
            return {
              ...result,
              llm: updatedFields[result.field],
            };
          }
          return result;
        }),
      );
    } catch (error) {
      console.error('Error saving review:', error);
      throw error; // Re-throw so modal can show error
    }
  };

  const handleSaveResult = async (updatedResult: Partial<Result>) => {
    try {
      const { reviewId, field } = editResultModal.result;

      const payload = {
        review_id: reviewId,
        field,
        llm: updatedResult.llm || '',
        similarity: updatedResult.similarity || null,
      };

      // Save to llm_review_overrides table
      const result = await supabase.from('llm_review_overrides').upsert(payload, {
        onConflict: 'review_id,field',
      });

      if (result.error) {
        console.error('Supabase error:', result.error);
        throw new Error(`Failed to save: ${result.error.message}`);
      }

      // Update local state
      const resultIndex = results.findIndex(
        (r) =>
          r.reviewId === editResultModal.result.reviewId &&
          r.field === editResultModal.result.field,
      );

      if (resultIndex !== -1) {
        setResults((prevResults) =>
          prevResults.map((result, index) =>
            index === resultIndex ? { ...result, ...updatedResult } : result,
          ),
        );
      }
    } catch (error) {
      console.error('Error saving result:', error);
      throw error; // Re-throw so modal can show error
    }
  };

  return (
    <div
      className="min-h-screen bg-neutral-50 flex justify-center"
      style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e0b6f9 100%)' }}
    >
      <main className="w-full">
        <div className="max-w-[1300px] w-full mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <span className="font-bold text-lg">⚠️ YouTube Processor Notice:</span>
              <span className="text-base">
                The YouTube Processor currently <b>only works on localhost</b> due to YouTube API
                rate limiting (429 errors).
                <br />
                Please run this locally and see the{' '}
                <a
                  href="https://github.com/dgorgan/scorelytic#installation"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-blue-700"
                >
                  README
                </a>{' '}
                for setup instructions.
                <br />
                <a
                  href="/game-demos"
                  className="inline-block mt-2 px-4 py-1 bg-violet-700 text-white rounded-full font-bold hover:bg-fuchsia-600 transition"
                >
                  View Working Game Demos
                </a>
              </span>
            </div>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.95)',
              borderRadius: '24px',
              boxShadow: '0 8px 32px 0 rgba(160,138,255,0.10)',
              padding: '32px 24px',
              width: '100%',
              marginTop: '32px',
              marginBottom: '32px',
            }}
          >
            <Tooltip.Provider>
              <h1 className="text-3xl font-bold text-gray-900 mb-6">
                LLM Review Analysis Dashboard
              </h1>

              {/* YouTube Video Processor */}
              <div className="mb-8">
                <YouTubeProcessor />
              </div>

              <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
                <h2 className="text-lg font-bold text-blue-900 mb-2">How to use this dashboard</h2>
                <ul className="list-disc pl-6 text-blue-900 text-sm space-y-1">
                  <li>
                    <b>Bar graph</b>: Shows mismatches between AI analysis and available ground
                    truth data. <b>High bars for sentimentScore/verdict are EXPECTED</b> - these are
                    AI-only fields with no baseline data to compare against.
                  </li>
                  <li>
                    <b>Real Issues to Focus On</b>: Look for mismatches in{' '}
                    <b>pros, cons, reviewSummary, alsoRecommends</b> - these fields sometimes have
                    explicit mentions in transcripts that we can verify against.
                  </li>
                  <li>
                    <b>Grouped View</b>: Each row is a reviewId, with all fields shown as columns.
                    Cell colors: Red = mismatch detected, alternating white/yellow = normal.
                  </li>
                  <li>
                    <b>Advanced QA</b>: Each row is a single field comparison. Use this for detailed
                    analysis of specific mismatches.
                  </li>
                  <li>
                    <b>This is an internal QA tool</b> to help us fine-tune our AI analysis before
                    building user-facing features.
                  </li>
                </ul>
              </div>

              {sweepSummary.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Sweep Summary</h2>
                  <SweepSummaryChart sweepSummary={sweepSummary} />
                </div>
              )}

              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Field Mismatches Overview</h2>
                <FieldMismatchChart fieldCounts={fieldCounts} />
              </div>

              <DashboardControls
                showMismatches={showMismatches}
                setShowMismatches={setShowMismatches}
                search={search}
                setSearch={setSearch}
                filter={filter}
                setFilter={setFilter}
                csvFile={csvFile}
                setCsvFile={setCsvFile}
                csvOptions={csvOptions}
                groupedView={groupedView}
                setGroupedView={setGroupedView}
                onDownloadCSV={downloadCSV}
              />

              <RowColorLegend />

              {groupedView ? (
                <GroupedTable
                  filteredGroupedResults={filteredGroupedResults}
                  reviewFields={reviewFields}
                  results={results}
                  onEditReview={editReview}
                />
              ) : (
                <AdvancedTable filteredResults={filteredResults} onEditResult={editResult} />
              )}

              <div className="mt-8 text-sm text-gray-600">
                <p>
                  Showing {groupedView ? filteredGroupedResults.length : filteredResults.length} of{' '}
                  {groupedView ? groupedResults.length : results.length} total{' '}
                  {groupedView ? 'reviews' : 'comparisons'}
                </p>
              </div>

              {/* Edit Modals */}
              <EditReviewModal
                isOpen={editReviewModal.isOpen}
                onClose={() => setEditReviewModal((prev) => ({ ...prev, isOpen: false }))}
                fields={editReviewModal.fields}
                reviewFields={reviewFields}
                onSave={handleSaveReview}
              />

              <EditResultModal
                isOpen={editResultModal.isOpen}
                onClose={() => setEditResultModal((prev) => ({ ...prev, isOpen: false }))}
                result={editResultModal.result}
                onSave={handleSaveResult}
              />
            </Tooltip.Provider>
          </div>
        </div>
      </main>
    </div>
  );
}
