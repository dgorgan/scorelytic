# LLM Pipeline Optimization & Stability Plan

## 1. Pre-Parse Validation

- Before parsing LLM output, check for all required fields (not just `summary`).
- Abort and log if any required field is missing.
- Add schema validation for the expected JSON structure.

## 2. Deduplication & Idempotency

- Hash each transcript before LLM analysis.
- Store the hash in the `demo_reviews` table (add a `transcript_hash` column if needed).
- On re-run, if the hash matches, skip LLM analysis and only update the `data` field if needed.
- Optionally, cache LLM results by transcript hash for fast re-analysis.

## 3. Fallback Prompt Consistency

- Ensure fallback prompt enforces the same strict rules as the primary prompt.
- Add explicit instructions to fallback prompt (confidence ≥ 0.4, evidence required, min effect, etc).
- Log when fallback is triggered and why.

## 4. Bias Filtering & Post-Processing

- After LLM output, filter out any bias with confidence < 0.4 or missing evidence.
- If no valid biases remain, set: `"No clear biases detected in this segment."`
- Normalize or explain differences in score fields (original, inferred, adjusted).

## 5. Error Handling & Logging

- Add granular error handling for OpenAI errors (rate limit, context, etc).
- Log the full error object, including codes and messages.
- Log all LLM outputs and parse errors for debugging.
- Log when Whisper/ASR fallback is used for transcript.

## 6. Chunking Improvements

- Consider reducing chunk size or using smarter chunking to avoid context window issues.
- Log chunk boundaries and any chunk-specific errors.

## 7. Modularization & Clean Up

- Refactor pipeline steps to be more composable and testable.
- Centralize constants (model names, endpoints, etc) in `shared/src/constants`.
- Remove legacy wrappers and dead code.

## 8. Test Coverage & Robustness

- Add/expand tests for:
  - Pre-parse validation
  - Deduplication logic
  - Fallback prompt logic
  - Bias filtering
  - Error handling
  - Chunking edge cases
- Mock all external API calls in tests.

## 9. Documentation

- Update this scratchpad and main docs as changes are made.
- Document all new error cases, fallback logic, and deduplication strategy.

## 10. Batch Processor & Route Integration

- The batch processor (server/src/routes/youtubeBatch.ts) supports `full`, `llm-only`, and `llm-test` modes.
- The main pipeline logic is in `pipelineRunner.ts` and `pipelineSteps.ts`.
- The `/api/youtube/process` endpoint (server/src/routes/youtube.ts) uses the same pipeline runner for single video processing.
- The batch route currently calls the pipeline via HTTP for `full` mode, and directly for `llm-only`.
- **Deduplication and validation should be unified:**
  - Both single and batch processing should check transcript hashes and skip LLM if unchanged (once DB supports it).
  - Pre-parse validation and error handling should be consistent in both modes.
  - Upserts should always be atomic and idempotent, regardless of entry point.
- **Recommendations:**
  - Refactor batch logic to use the same deduplication and validation helpers as the main pipeline.
  - Ensure batch error reporting is granular (per-video) and logs all parse/LLM errors.
  - When upserting in batch, always update the transcript hash (when available) and metadata for consistency.
  - Document the batch API contract and expected error shapes for frontend integration.

---

**Priority Order:**

1. Pre-parse validation
2. Deduplication
3. Fallback prompt strictness
4. Bias filtering
5. Error handling/logging
6. Chunking
7. Modularization
8. Tests
9. Docs
10. Batch Processor & Route Integration

---

**Notes:**

- All changes should preserve the goal: clean upserts to `demo_reviews`, with transcript, slug, metadata, and LLM output in the right columns.
- On re-run, avoid reprocessing unless transcript changes.
- Always log enough context to debug failures and retries.
