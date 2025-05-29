import { execSync } from 'child_process';
import fs from 'fs';

const models = ['gpt-3.5-turbo', 'gpt-4'];
const prompts = [
  undefined,
  'Analyze the review and be as literal as possible. Use the exact words from the transcript for all fields.',
];
const embedding = true;

const sweepResults: any[] = [];

for (const model of models) {
  for (const prompt of prompts) {
    const promptArg = prompt ? `--prompt "${prompt.replace(/"/g, '\"')}"` : '';
    const cmd = `npx dotenv -e server/.env -- ts-node scripts/batch-llm-review-test.ts --model ${model} ${promptArg} --embedding`;
    console.log(`\n=== Running: ${cmd}`);
    execSync(cmd, { stdio: 'inherit' });
    const csv = fs.readFileSync('llm_review_batch_results.csv', 'utf8');
    const lines = csv.trim().split('\n').slice(1);
    const fieldCounts: Record<string, number> = {};
    let total = 0;
    let totalMismatch = 0;
    for (const line of lines) {
      const [, field, , , similarity] = line.split(',');
      fieldCounts[field] = (fieldCounts[field] || 0) + 1;
      if (parseFloat(similarity) < 0.8) totalMismatch++;
      total++;
    }
    sweepResults.push({
      model,
      prompt: prompt || 'default',
      total,
      totalMismatch,
      fieldCounts,
    });
  }
}

// Output summary CSV
const outRows = ['model,prompt,field,total_mismatches,total_comparisons'];
for (const result of sweepResults) {
  for (const field of Object.keys(result.fieldCounts)) {
    outRows.push(
      `${result.model},${JSON.stringify(result.prompt)},${field},${result.fieldCounts[field]},${result.total}`,
    );
  }
}
fs.writeFileSync('llm_review_sweep_summary.csv', outRows.join('\n'));

// Print best config per field
const fieldBest: Record<string, { model: string; prompt: string; mismatches: number }> = {};
for (const result of sweepResults) {
  for (const field of Object.keys(result.fieldCounts)) {
    const mismatches = result.fieldCounts[field];
    if (!fieldBest[field] || mismatches < fieldBest[field].mismatches) {
      fieldBest[field] = {
        model: result.model,
        prompt: result.prompt,
        mismatches,
      };
    }
  }
}
console.log('\nBest config per field:');
for (const field of Object.keys(fieldBest)) {
  const { model, prompt, mismatches } = fieldBest[field];
  console.log(`  ${field}: ${model} | ${prompt} | mismatches: ${mismatches}`);
}

// Print best overall
let best = sweepResults[0];
for (const result of sweepResults) {
  if (result.totalMismatch < best.totalMismatch) best = result;
}
console.log(
  `\nBest overall: ${best.model} | ${best.prompt} | total mismatches: ${best.totalMismatch}`,
);
