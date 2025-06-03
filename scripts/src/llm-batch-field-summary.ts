import fs from 'fs';

const csv = fs.readFileSync('llm_review_batch_results.csv', 'utf8');
const lines = csv.trim().split('\n').slice(1);
const fieldStats: Record<
  string,
  {
    total: number;
    exact: number;
    high: number;
    mismatches: { seed: string; llm: string; sim: string }[];
  }
> = {};

for (const line of lines) {
  const [, field, seed, llm, similarity] = line.split(',');
  const sim = parseFloat(similarity);
  if (!fieldStats[field]) fieldStats[field] = { total: 0, exact: 0, high: 0, mismatches: [] };
  fieldStats[field].total++;
  if (sim === 1) fieldStats[field].exact++;
  if (sim >= 0.8) fieldStats[field].high++;
  if (sim < 0.8 && fieldStats[field].mismatches.length < 3) {
    fieldStats[field].mismatches.push({ seed, llm, sim: similarity });
  }
}

const argv = process.argv.slice(2);
const strict = argv.includes('--strict');
const arrayThresh = strict ? 0.7 : 0.6;
const stringThresh = strict ? 0.8 : 0.7;

console.log(
  `Field Reliability Summary (arrayThresh=${arrayThresh}, stringThresh=${stringThresh}):`,
);
console.log('Field           | Total | Exact | HighSim | Example Mismatches');
console.log('----------------|-------|-------|---------|-------------------');
const allFields = [
  'sentimentScore',
  'sentimentSummary',
  'verdict',
  'biasIndicators',
  'reviewSummary',
  'alsoRecommends',
  'pros',
  'cons',
];
for (const field of allFields) {
  const s = fieldStats[field] || {
    total: 0,
    exact: 0,
    high: 0,
    mismatches: [],
  };
  let mismatchStr = '';
  if (s.mismatches.length === 0) {
    mismatchStr = '(no mismatches)';
  } else {
    mismatchStr = s.mismatches
      .slice(0, 5)
      .map((m) => {
        let note = '';
        if (m.seed === '[]' && m.llm === '[]' && m.sim === '1.00')
          note = ' (both empty arrays, perfect match)';
        return `seed: ${m.seed}\nllm:  ${m.llm}\nsim:  ${m.sim}${note}`;
      })
      .join('\n---\n');
  }
  console.log(
    `${field.padEnd(15)} | ${s.total.toString().padEnd(5)} | ${s.exact.toString().padEnd(5)} | ${s.high.toString().padEnd(7)} | ${mismatchStr}`,
  );
}
