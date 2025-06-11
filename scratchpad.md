# Demo Pipeline Refactor & Optimization Scratchpad

## 1. Transcript Caching (Top-Level Field)

### Goal

- Move transcript storage out of the `data` JSONB column in `demo_reviews` and into a dedicated top-level `transcript` field.
- This makes transcript access, deduplication, and caching much easier and keeps the JSONB smaller and more focused on LLM/analysis output.

### Migration Plan

- **Add a new `transcript` column** (type `text`) to the `demo_reviews` table.
- **Extract existing transcripts** from the `data` JSONB for all current rows and populate the new column.
- **Remove transcript from the `data` JSONB** for all rows (optional, but recommended for clarity and to reduce bloat).
- **Update pipeline:**
  - On transcript fetch, upsert transcript to the top-level field.
  - LLM and downstream steps should read transcript from the top-level field, not from `data`.
  - Do not store transcript in the `data` column going forward.

### Why?

- Querying and caching transcripts is much easier and more efficient.
- Reduces size and complexity of the `data` JSONB.
- Makes it easier to deduplicate, update, or re-analyze transcripts without touching LLM results.

### Next Steps

- [ ] Write migration to add `transcript` column and backfill from `data`.
- [ ] Update pipeline to use top-level `transcript`.
- [ ] Remove transcript from `data` in all code paths.

---

## 2. Remove Defensive Wrappers

- Remove all uses of `normalizeSentiment` and `flattenSentiment` from demo pipeline and batch scripts.
- Only keep for main reviews table if needed for analytics/legacy.

---

## 3. Parallelize Whisper Chunking

- Refactor audio chunking logic to transcribe in parallel (limit concurrency).
- Clean up temp files after all chunks.

---

## 4. Multi-Language Caption Fallback

- **Goal:** Always try to extract captions in any available language before falling back to audio transcription.
- **Plan:**
  - Try English captions first (`fetchYoutubeCaptions(videoId, 'en')`).
  - If not found, fetch the list of available caption languages for the video.
  - Try to fetch captions in each available language (prefer human-uploaded, then auto-generated).
  - If found, pass them to the LLM (let the LLM translate/analyze directly; o3-pro can handle this).
  - Only fall back to Whisper audio transcription if no captions in any language are available.
- **Implementation:**
  - Update `fetchYoutubeCaptions` to support multi-language fallback.
  - Update `getHybridTranscript` to log which language was used and handle the new logic.
- **Why:**
  - Captions (even in another language) are faster, cheaper, and often more accurate than Whisper.
  - LLMs can translate/analyze non-English text, so this saves cost and time.

---

## 5. Retry/Backoff for Network/LLM Failures

- Add retry logic for yt-dlp, Whisper, and LLM calls.

---

## 6. Modularize Pipeline

- Refactor pipeline into composable steps: metadata, transcript, LLM, upsert.

---

## 7. Test Suite Robustness

- Audit and fix tests, especially for `/stream` and batch.
- Add tests for transcript caching, parallel chunking, retry, and LLM output shape.

---

## 8. Documentation

- Update this scratchpad and main docs as changes are made.

---

## 9. Future-Proofing

- Plan for main reviews upsert: decide on rich JSONB vs. flat analytics shape.

---

## 10. yt-dlp Cookie Usage

- Remove use of cookies with yt-dlp for YouTube downloads, or make it optional/configurable.
- Document when/why cookies are needed (e.g. age-restricted/private videos).

---

## 11. LLM Fallback Prompt Investigation

### Problems

- Fallback prompt triggers too often (primary prompt fails or missing summary)
- Weak/low-confidence biases leak into output (confidenceScore < 0.4, no evidence)
- JSON parsing errors are not clearly logged
- Transcript can be re-analyzed multiple times (no deduplication)
- Score fields (original, adjusted, inferred) are inconsistent
- Whisper/ASR fallback not clearly logged

### Fixes (Actionable)

- **Bias Filtering:**
  - Only include biases with confidenceScore ≥ 0.4 and evidence.length > 0
  - If no valid biases, return: "No clear biases detected in this segment."
- **Prompt Consistency:**
  - Fallback prompt must enforce same strict rules as primary (confidence, evidence, min effect)
  - Add explicit instruction: "Do not return any bias unless it meets the criteria below."
- **Pre-Parse Validation:**
  - Abort parse if required fields (e.g. summary, sentimentScore) are missing
- **Deduplication:**
  - Hash transcript and skip if already processed
- **Score Logic:**
  - Decide trust order: biasAdjustedScore > inferredScore > originalScore
  - Normalize or explain differences in logs
- **Logging:**
  - Log when Whisper/ASR fallback is used ("No captions found. Falling back to Whisper transcription.")

---

## 12. Diagnosis Summary

Area
Problem
Evidence
Consequence
LLM Fallback Prompt
Ignores strict bias detection rules
WARN: Primary prompt failed - retrying with alternative prompt + weak JSON
Low-confidence, unevidenced biases leak into output
JSON Parsing
parseStructuredResponse fails silently
Logs fallback w/o showing original parse error
Triggers more permissive secondary prompt
Transcript Duplication
Same transcript gets analyzed more than once
No hash/caching guard
Double-processing + inflated metrics
Post-Processing Logic
Includes biases with
confidencescore < 0.4 or no evidence
Logs show 10% confidence, (no explicit evidence found)
Invalid bias signals returned in final
JSON
Score Conflicts
originalScore, biasAdjustedScore, inferredScore all differ inconsistently
Seen in logs (e.g. 7 → 6.2, but inferred: 6.5)
Undermines trust in scoring output
Caption Ingestion
Fallback to Whisper/ASR not clearly logged
Seen only when captions unavailable
Incomplete audit trail for input sources

Fixes (High-Confidence, Actionable)

1. Enforce Bias Filter in Post-Processing
   Filter out any bias where:
   ts
   D Copy
   "o Edit
   confidenceScore < 0.4
   lI Math.abs(adjustedInfluence)
   < 0.1
   Il evidence. length ==
   → If no valid biases remain, return:
   json
   D Copy
   o Edit
   "No clear biases detected in this segment."
2. Mirror Primary Prompt Rules in Fallback Prompt
   Ensure fallback includes same strict logic:
   • Confidence ≥ 40%
   • Effect ≥ $0.1
   • Must quote evidence
   • Never infer based on "vibe"
   Add this anchor at top:
   "This tool is used to influence automated feedback scoring. Do not return any bias unless it meets the criteria below."

3. Validate Response Before JSON.parse
   Before parsing LLM output:
   tS
   ® Copy
   if (!raw. includes ('"summary"') |1
   traw. includes(""sentimentScore"')) {
   throw new Error("Missing required fields - aborting parseStructuredResponse");
   }
   → Prevents fallback being triggered on malformed-but-parseable output.
4. Deduplicate Transcript Processing
   Before analyzing a transcript:
   ts
   if (hash(transcript) already seen) return cached result;
   → Prevents repeated runs on same content.
   • 5. Align Score Logic
   Decide your score trust hierarchy:
   • Trust biasAdjustedScore → if based on rules
   • Use inferredScore → if LLM-derived
   Normalize or explain differences in summary logs.
   • 6. Add Clear Whisper/ASR Fallback Logging
   When no captions:
   ts
   ® Copy
   logger.info("No captions found. Falling back to Whisper transcription.")
   → Keeps ingestion trail clean for debugging.

### Problem Overview

- Multiple logs show `WARN: [LLM] Primary prompt failed or missing summary — retrying with alternative prompt.`
- Final results contain low-confidence bias detections (`confidenceScore: 0.1`) with no quoted evidence and incorrect scoring deltas.
- Conflicting `originalScore`, `inferredScore`, and `biasAdjustedScore` values reported.
- Biases are often shown with `"(no explicit evidence found)"` even though rules forbid such output.

### Root Cause Analysis

- The fallback prompt may be too loose and not carrying forward the same strict rules as the primary prompt.
- Biases are not properly filtered based on confidence and evidence in post-processing.
- Fallback is incorrectly treated as a success even when outputs are structurally invalid (e.g., missing required top-level keys).
- Parsing assumes success too early — structured field validation is missing.
- Fallback prompts must mirror strict bias rules (conf ≥ 0.4, evidence required, $0.1 min)
- Add pre-parse validation to abort weak JSON early
- Deduplicate transcript runs via content hashing
- Reject all biases with no evidence or <40% confidence
- Clarify score normalization logic (inferred vs. adjusted)
- Log ASR fallback when captions

---

## 13. Centralize Constants (API, Models, etc.)

- Audit the codebase for hardcoded model names (e.g., 'o3-pro', 'gpt-4o'), API endpoints, and other magic strings.
- Move all such values to `shared/src/constants` (e.g., `api.ts`, `models.ts`).
- Refactor all usages to import from these consts, so future changes (like model swaps) are one-line and robust.
- Improves maintainability, reduces bugs, and makes global config/feature switches trivial.
