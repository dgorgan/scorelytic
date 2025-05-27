import { supabase } from '../server/src/config/database';
import { analyzeText, getEmbedding } from '../server/src/services/sentimentService';
import { toCamel } from '../server/src/utils/caseMapping';
import fs from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { harmonizeBias } from '../shared/utils/bias-harmonizer';

const argv = yargs(hideBin(process.argv))
  .option('model', { type: 'string', default: 'gpt-3.5-turbo' })
  .option('prompt', { type: 'string' })
  .option('ignore', { type: 'array', default: [] })
  .option('embedding', { type: 'boolean', default: false })
  .option('strict', { type: 'boolean', default: false })
  .option('lenient', { type: 'boolean', default: false })
  .argv;

const main = async () => {
  const argvResolved = await argv;
  const { model, prompt, ignore, embedding, strict, lenient } = argvResolved as any;
  const { data: rawReviews, error } = await supabase.from('reviews').select('*');
  if (error) {
    console.error('Error fetching reviews:', error);
    process.exit(1);
  }
  const reviews = toCamel(rawReviews || []);
  let total = 0, mismatches = 0;
  const csvRows = [
    'reviewId,field,seed,llm,similarity'
  ];
  // Thresholds
  const arrayThresh = strict ? 0.7 : 0.5;
  const stringThresh = strict ? 0.8 : 0.7;
  function jaccardSim(a: string, b: string) {
    const setA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
    const setB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size === 0 ? 1 : intersection.size / union.size;
  }
  function arraySimilarity(a: string[], b: string[]) {
    if (a.length === 0 && b.length === 0) return 1.0;
    if (a.length === 0 || b.length === 0) return 0.0;
    const simsA = a.map(itemA => Math.max(...b.map(itemB => jaccardSim(itemA, itemB))));
    const simsB = b.map(itemB => Math.max(...a.map(itemA => jaccardSim(itemA, itemB))));
    return (simsA.reduce((s, v) => s + v, 0) + simsB.reduce((s, v) => s + v, 0)) / (simsA.length + simsB.length);
  }
  function cosineSim(a: number[], b: number[]): number {
    const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
    const normB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
    return dot / (normA * normB);
  }
  for (const review of reviews) {
    total++;
    console.log(`\n---\nReview ID: ${review.id}`);
    try {
      const llm = await analyzeText(review.transcript, model, prompt);
      let hasMismatch = false;
      const fields = [
        'sentimentScore',
        'sentimentSummary',
        'verdict',
        'biasIndicators',
        'reviewSummary',
        'alsoRecommends',
        'pros',
        'cons'
      ];
      for (const field of fields) {
        if (ignore.includes(field)) continue;
        let seedVal = (review as any)[field];
        let llmVal = (llm as any)[field];
        let sim = 0;
        if (field === 'biasIndicators') {
          seedVal = harmonizeBias(seedVal || []);
          llmVal = harmonizeBias(llmVal || []);
          sim = arraySimilarity(seedVal, llmVal);
        } else if (Array.isArray(seedVal) && Array.isArray(llmVal)) {
          sim = arraySimilarity(seedVal, llmVal);
        } else if (typeof seedVal === 'string' && typeof llmVal === 'string') {
          const wordCountA = seedVal.split(/\s+/).length;
          const wordCountB = llmVal.split(/\s+/).length;
          if (wordCountA < 5 && wordCountB < 5) {
            sim = jaccardSim(seedVal, llmVal);
            if (sim >= 0.5) sim = 1; // treat as match if above 0.5
          } else if (embedding && wordCountA + wordCountB > 10) {
            const [embA, embB] = await Promise.all([
              getEmbedding(seedVal),
              getEmbedding(llmVal)
            ]);
            sim = cosineSim(embA, embB);
          } else {
            sim = jaccardSim(seedVal, llmVal);
          }
        } else if (typeof seedVal === 'number' && typeof llmVal === 'number') {
          sim = 1 - Math.abs(seedVal - llmVal) / 10;
        } else {
          sim = seedVal === llmVal ? 1 : 0;
        }
        csvRows.push(`${review.id},${field},${JSON.stringify(seedVal)},${JSON.stringify(llmVal)},${sim.toFixed(2)}`);
        if (sim < (Array.isArray(seedVal) ? arrayThresh : stringThresh)) hasMismatch = true;
      }
      if (!hasMismatch) console.log('LLM output matches original review fields.');
    } catch (err) {
      console.error('LLM error:', err);
    }
  }
  fs.writeFileSync('llm_review_batch_results.csv', csvRows.join('\n'));
  console.log(`\nBatch test complete. ${total} reviews processed. Results exported to llm_review_batch_results.csv`);
};

main(); 