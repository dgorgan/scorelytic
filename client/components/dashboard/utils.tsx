import React from 'react';

export type Result = {
  reviewId: string;
  field: string;
  seed: string;
  llm: string;
  similarity: string;
};

export type GroupedResult = {
  reviewId: string;
  seed: string;
  fields: Record<string, string>;
  idxs: Record<string, number>;
};

export interface BatchResultRow {
  reviewId: string;
  field: string;
  seed: string;
  llm: string;
  similarity: string;
}

export interface SweepSummaryRow {
  model: string;
  prompt: string;
  field: string;
  total_mismatches: string;
  total_comparisons: string;
}

// Helper to pretty-print for tooltip
export const prettyTooltip = (val: unknown) => {
  if (val === undefined || val === null) return '';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return '';
    try {
      const parsed = JSON.parse(trimmed);
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

export const displayCell = (val: unknown): string | React.ReactElement => {
  if (val === undefined || val === null || val === 'undefined' || val === 'null') {
    return <span className="text-gray-400 italic">N/A</span>;
  }

  // Handle bigint by converting to string
  if (typeof val === 'bigint') {
    return val.toString();
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return '';
    // Try to parse as array, even if not perfectly stringified
    if (
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}'))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.join(', ');
        }
        return JSON.stringify(parsed);
      } catch {
        return val;
      }
    }
    return val;
  }

  if (Array.isArray(val)) {
    return val.join(', ');
  }

  if (typeof val === 'object') {
    return JSON.stringify(val);
  }

  return String(val);
};
