import fs from 'fs';
import path from 'path';

const csvPath = path.join(process.cwd(), 'llm_review_batch_results.csv');
const outPath = path.join(process.cwd(), 'llm_review_batch_results.html');

const csv = fs.readFileSync(csvPath, 'utf8');
const lines = csv.trim().split('\n').slice(1);
const fieldCounts: Record<string, number> = {};
const similarities: number[] = [];

for (const line of lines) {
  const [, field, , , similarity] = line.split(',');
  fieldCounts[field] = (fieldCounts[field] || 0) + 1;
  const sim = parseFloat(similarity);
  if (!isNaN(sim)) similarities.push(sim);
}

const fields = Object.keys(fieldCounts);
const counts = fields.map((f) => fieldCounts[f]);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>LLM Batch Test Results</title>
  <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
</head>
<body>
  <h1>LLM Batch Test Results</h1>
  <div id="bar" style="width:600px;height:400px;"></div>
  <div id="hist" style="width:600px;height:400px;"></div>
  <script>
    Plotly.newPlot('bar', [{
      x: ${JSON.stringify(fields)},
      y: ${JSON.stringify(counts)},
      type: 'bar',
      marker: { color: 'crimson' }
    }], { title: 'Mismatches per Field' });
    Plotly.newPlot('hist', [{
      x: ${JSON.stringify(similarities)},
      type: 'histogram',
      marker: { color: 'royalblue' }
    }], { title: 'Similarity Score Histogram', xaxis: { title: 'Similarity' } });
  </script>
</body>
</html>`;

fs.writeFileSync(outPath, html);
console.log('Visualization written to', outPath);
