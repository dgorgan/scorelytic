import { supabase } from '../server/src/config/database';
import { analyzeText, getEmbedding } from '../server/src/services/sentimentService';
import { toCamel } from '../server/src/utils/caseMapping';
import fs from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

function normalize(str: string) {
  return (str || '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function arraySimilarity(a: string[], b: string[]) {
  const setA = new Set(a.map(normalize));
  const setB = new Set(b.map(normalize));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  return intersection.size / Math.max(setA.size, setB.size, 1);
}

function cosineSim(a: number[], b: number[]): number {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const normB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  return dot / (normA * normB);
}

const argv = yargs(hideBin(process.argv))
  .option('model', { type: 'string', default: 'gpt-3.5-turbo' })
  .option('prompt', { type: 'string' })
  .option('ignore', { type: 'array', default: [] })
  .option('embedding', { type: 'boolean', default: false })
  .argv;

const main = async () => {
  const argvResolved = await argv;
  const { model, prompt, ignore, embedding } = argvResolved as any;
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
        'reviewSummary'
      ].filter(f => !(ignore as string[]).includes(f));
      for (const field of fields) {
        const orig = (review as any)[field];
        const llmVal = (llm as any)[field];
        if (orig == null || orig === undefined) continue; // skip null/undefined in seed
        let mismatch = false;
        let similarity = '';
        if (Array.isArray(orig) && Array.isArray(llmVal)) {
          similarity = arraySimilarity(orig, llmVal).toFixed(2);
          mismatch = parseFloat(similarity) < 0.7;
        } else if (typeof orig === 'string' && typeof llmVal === 'string') {
          if (embedding) {
            const [embA, embB] = await Promise.all([
              getEmbedding(orig),
              getEmbedding(llmVal)
            ]);
            similarity = cosineSim(embA, embB).toFixed(2);
            mismatch = parseFloat(similarity) < 0.8;
          } else {
            similarity = normalize(orig) === normalize(llmVal) ? '1.00' : '0.00';
            mismatch = similarity === '0.00';
          }
        } else {
          mismatch = JSON.stringify(orig) !== JSON.stringify(llmVal);
        }
        if (mismatch) {
          hasMismatch = true;
          console.log(`Mismatch in ${field}:\n  Original: ${JSON.stringify(orig)}\n  LLM:      ${JSON.stringify(llmVal)}\n  Similarity: ${similarity}`);
          csvRows.push(`${review.id},${field},${JSON.stringify(orig)},${JSON.stringify(llmVal)},${similarity}`);
        }
      }
      if (!hasMismatch) {
        console.log('LLM output matches original review fields.');
      } else {
        mismatches++;
      }
    } catch (err) {
      console.error('LLM error:', err);
      mismatches++;
    }
  }
  fs.writeFileSync('llm_review_batch_results.csv', csvRows.join('\n'));
  console.log(`\nBatch test complete. ${mismatches}/${total} reviews had mismatches. Results exported to llm_review_batch_results.csv`);
};

main(); 