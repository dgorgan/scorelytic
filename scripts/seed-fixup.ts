import fs from 'fs';
import path from 'path';
import { harmonizeBias } from '../shared/utils/bias-harmonizer';

const allowedSentimentSummaries = [
  'Overwhelmingly positive',
  'Very positive',
  'Mostly positive',
  'Mixed',
  'Neutral',
  'Negative',
  'Contrarian',
  'Positive (influencer bias)',
  'Positive (sponsored)',
  'Mixed to negative',
  'Mixed (genre aversion)',
  'Mixed (reviewer fatigue)',
  'Positive with platform bias'
];
const allowedVerdicts = ['positive', 'negative', 'mixed'];

const seedPath = path.join(__dirname, '../server/src/utils/seedSupabase.ts');
const src = fs.readFileSync(seedPath, 'utf8');
const reviewRegex = /({\s*id:.*?})/g;
const reviews = src.match(reviewRegex) || [];
let changed = false;
const report: string[] = [];
function canonicalize(val: string, allowed: string[]): string {
  if (!val) return allowed[0];
  const norm = val.trim().toLowerCase();
  for (const a of allowed) {
    if (a.toLowerCase() === norm) return a;
    if (a.toLowerCase().includes(norm) || norm.includes(a.toLowerCase())) return a;
  }
  return allowed[0];
}
function fixField(val: any, field: string) {
  // Parse arrays from string if needed
  if (['biasIndicators', 'alsoRecommends', 'pros', 'cons'].includes(field)) {
    let arr: string[] = [];
    if (typeof val === 'string') {
      arr = val.split(',').map((s: string) => s.replace(/['\[\]]/g, '').trim()).filter(Boolean);
    } else if (Array.isArray(val)) {
      arr = val;
    }
    const fixed = field === 'biasIndicators' ? harmonizeBias(arr) : arr;
    if (JSON.stringify(fixed) !== JSON.stringify(val)) {
      report.push(`${field}: ${JSON.stringify(val)} → ${JSON.stringify(fixed)}`);
      changed = true;
    }
    return fixed;
  }
  if (field === 'sentimentSummary') {
    const fixed = canonicalize(val, allowedSentimentSummaries);
    if (fixed !== val) {
      report.push(`sentimentSummary: '${val}' → '${fixed}'`);
      changed = true;
      return fixed;
    }
  }
  if (field === 'verdict') {
    const fixed = canonicalize(val, allowedVerdicts);
    if (fixed !== val) {
      report.push(`verdict: '${val}' → '${fixed}'`);
      changed = true;
      return fixed;
    }
  }
  if (typeof val === 'string') {
    const norm = val.trim();
    if (norm !== val) {
      report.push(`${field}: '${val}' → '${norm}'`);
      changed = true;
      return norm;
    }
  }
  if (val === undefined || val === null) {
    changed = true;
    report.push(`${field}: ${val} → default`);
    if (field === 'sentimentScore') return 5;
    if (field === 'sentimentSummary') return 'Mixed';
    if (field === 'verdict') return 'mixed';
    if (['biasIndicators', 'alsoRecommends', 'pros', 'cons'].includes(field)) return [];
    return '';
  }
  return val;
}
const fields = [
  'sentimentScore',
  'sentimentSummary',
  'verdict',
  'biasIndicators',
  'reviewSummary',
  'alsoRecommends',
  'pros',
  'cons',
  'summary',
  'transcript'
];
const fixedReviews = reviews.map(r => {
  let obj = r;
  for (const field of fields) {
    const regex = new RegExp(`${field}: ([^,}\n]+)`, 'i');
    const m = obj.match(regex);
    let val = m ? m[1].replace(/['\[\]]/g, '').trim() : undefined;
    const fixed = fixField(val, field);
    if (m) {
      obj = obj.replace(regex, `${field}: ${Array.isArray(fixed) ? '[' + fixed.map(s => `'${s}'`).join(', ') + ']' : `'${fixed}'`}`);
    } else if (fixed !== undefined && fixed !== null && fixed !== '') {
      // Add missing field
      obj = obj.replace(/}$/, `, ${field}: ${Array.isArray(fixed) ? '[' + fixed.map(s => `'${s}'`).join(', ') + ']' : `'${fixed}'`} }`);
    }
  }
  return obj;
});
if (process.argv.includes('--write') && changed) {
  const out = src.replace(reviewRegex, () => fixedReviews.shift()!);
  fs.writeFileSync(seedPath, out, 'utf8');
  console.log('Seed file updated.');
}
console.log('Fixup report:');
console.log(report.join('\n') || 'No changes needed.'); 