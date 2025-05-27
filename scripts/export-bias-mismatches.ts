import fs from 'fs';

const csv = fs.readFileSync('llm_review_batch_results.csv', 'utf8');
const lines = csv.trim().split('\n').slice(1);
const outRows = [
  'reviewId,seed,llm,similarity'
];
const htmlRows = [
  '<table border="1" cellpadding="4" style="border-collapse:collapse;font-family:monospace">',
  '<tr><th>Review ID</th><th>Seed</th><th>LLM</th><th>Similarity</th></tr>'
];
for (const line of lines) {
  const [reviewId, field, seed, llm, similarity] = line.split(',');
  if (field !== 'biasIndicators') continue;
  outRows.push(`${reviewId},${seed},${llm},${similarity}`);
  htmlRows.push(`<tr><td>${reviewId}</td><td>${seed}</td><td>${llm}</td><td>${similarity}</td></tr>`);
}
htmlRows.push('</table>');
fs.writeFileSync('bias_mismatches.csv', outRows.join('\n'));
fs.writeFileSync('bias_mismatches.html', `<html><body><h2>BiasIndicators Mismatches</h2>${htmlRows.join('')}</body></html>`);
console.log('Exported bias mismatches to bias_mismatches.csv and bias_mismatches.html'); 