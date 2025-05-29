# Scorelytic Documentation

## Overview

Scorelytic analyzes video game reviews (YouTube, critics, creators) to extract sentiment, detect bias, and provide both raw and bias-adjusted scores. The platform is transparency-first: users see how scores are shaped, not just the final number.

## Sentiment & Bias Pipeline

- **analyzeText()**: Extracts a synthetic sentiment score (0-10) and bias indicators from review transcripts using LLMs.
- **evaluateBiasImpact()**: Pure TypeScript function that takes the sentiment score and bias indicators, applies heuristics, and returns a bias-adjusted score, breakdown, and rationale.

## API Usage

```ts
import { analyzeText } from 'server/src/services/sentimentService';
import { evaluateBiasImpact } from 'shared/utils/biasAdjustment';

const sentiment = await analyzeText(transcript);
const biasAdjustment = evaluateBiasImpact(sentiment.sentimentScore, sentiment.biasIndicators);

// Result includes:
// - sentimentScore (synthetic, platform-owned)
// - biasAdjustedScore
// - biasImpact[] (with severity, influence, explanation)
// - adjustmentRationale
// - audienceFit
```

## UX & Transparency

- **Toggle**: Users can switch between raw sentiment and bias-adjusted scores.
- **Rationale**: Every adjustment is explained neutrally—no moralizing.
- **Platform as arbiter**: Scorelytic owns the synthetic score, not the critic. All reviews are analyzed equally.

## Extending to Critics

- Critic reviews are treated as transcripts. If an explicit score is present, it can be compared to the synthetic score for extra context.

## Milestones & Roadmap

See [PROJECT_MILESTONES.MD](PROJECT_MILESTONES.MD).

## 🧩 Data Models

### Game

- `id: string`
- `title: string`
- `slug: string` // SEO-friendly URL slug (e.g. "dragon-age-veilguard")
- `description: string`
- `coverArtUrl: string`
- `releaseDate: Date`
- `metaCriticScore?: number` // Official Metacritic score
- `contentCriticScore?: number` // AI-generated aggregate score

### Creator

- `id: string`
- `name: string`
- `slug: string` // SEO-friendly URL slug (e.g. "honestgamer")
- `avatarUrl: string`
- `bio?: string`
- `channelUrl: string`

### Review

- `id: string` // Unique review ID (e.g. `${creatorId}_${gameId}`)
- `gameId: string`
- `creatorId: string`
- `score: number` // AI-generated sentiment score (1–10)
- `videoUrl: string` // Link to YouTube review
- `sentimentSummary: string`
- `pros: string[]`
- `cons: string[]`
- `biasIndicators?: string[]`
- `alsoRecommends?: string[]` // Array of related game IDs
- `createdAt: Date`

---

## 🔗 API Endpoints

### Games

- `GET /api/games`  
  Returns a list of games with basic details and scores.

- `GET /api/games/:gameId`  
  Returns detailed info for a game including:

  - Game details
  - Reviews (with creator info attached)
  - `averageSentimentScore` (number)
  - `sentimentSummaries` (array of unique sentiment strings)
  - Handles 404 if not found, 500 on DB errors

- `GET /api/games/:gameId/reviews`  
  Returns all reviews for a specific game.

### Reviews

- `GET /api/reviews/:reviewId`  
  Returns full review with sentiment, video, and metadata.

### Creators

- `GET /api/creators/:creatorId`  
  Returns creator profile and list of their reviews.

---

## 🌐 Frontend Routes (SEO-Friendly)

| Route Pattern                     | Description                             |
| --------------------------------- | --------------------------------------- |
| `/`                               | Homepage with latest games and updates  |
| `/games/:gameSlug`                | Game profile with reviews and ratings   |
| `/creators/:creatorSlug`          | Creator profile with bio and reviews    |
| `/reviews/:creatorSlug/:gameSlug` | Detailed review page for a creator/game |

---

## 🚀 SEO & UX Considerations

- **SEO-friendly slugs:** Human-readable, unique slugs for all games and creators
- **Rich metadata:** Use Open Graph, Twitter Cards, and JSON-LD
- **Performance:** Optimize images and enable code splitting
- **Canonical URLs:** Prevent duplicate content via canonical tags
- **Internal linking:** Improve engagement and crawlability
- **Shareability:** Enable sharing of reviews via social platforms
- **URL design:** Avoid query params in public routes

---

# Testing Strategy

- Use **Jest** with **ts-jest** for testing API routes and utility functions.
- Use **React Testing Library** for testing React components.
- Mock external dependencies (e.g., Supabase, OpenAI) using `jest.mock()`.
- Place tests in a `__tests__` folder colocated with the code being tested.
- Write descriptive test names covering happy paths and basic edge cases.
- Run all tests with `npm test` at the repo root (runs both server and client tests)
- All backend code is under `server/src/` for TypeScript rootDir consistency

---

## 📦 Additional Notes

- Ensure slug uniqueness in the database
- Fallback routing for incorrect/missing slugs → 404 or redirect
- Cache popular pages and aggregated scores
- Keep documentation updated with all changes to APIs or routing

---

## 🛠️ Internal Dashboard (LLM QA & Review)

- Internal-only tool for reviewing, validating, and overriding LLM sentiment analysis results.
- Features:
  - Grouped and advanced QA views
  - Human-in-the-loop overrides (saved to Supabase)
  - Color-coded legend for mismatches/overrides
  - CSV download, search, and filters for unreviewed/overridden
- Fully covered by Jest + React Testing Library tests (see README for test instructions)

## 🧠 LLM Sentiment Analysis (Backend)

- Utility: `analyzeTranscript(transcript: string, reviewId: string): Promise<{ summary, sentimentScore, verdict }>`
- Sends a transcript to an LLM (OpenAI, live), parses the response, and updates the review's sentimentSummary field in the DB.
- Sentiment result fields:
  - `summary: string` — short summary of the review sentiment
  - `sentimentScore: number` — score from 0–10
  - `verdict: string` — e.g. "positive", "negative", "mixed"
- Returns null/empty for missing fields (no hallucination)
- Fully tested with Jest and supabase mocks.

## 📺 YouTube Transcript Analysis Pipeline

- Captions are fetched from YouTube videos and stored as `review.transcript`.
- Each transcript is analyzed by the LLM (OpenAI), producing:
  - `summary`, `sentimentScore`, `verdict`, `sentimentSummary`, `biasIndicators`, etc.
- Results are stored in the DB and surfaced in the internal dashboard for QA and override.
- The same data powers the public-facing game/creator pages and analytics.

## Bias-Adjusted Review Output (Multi-Layered)

### Data Models (Types)

See `shared/types/biasReport.ts` for:

- `ReviewSummary`: User-facing, quick verdict and score, with confidence and bias summary.
- `BiasDetail`: List of all detected biases, their severity, score impact, and qualitative effect.
- `CulturalContext`: Explains how cultural/ideological context may affect perception and score.
- `FullBiasReport`: Internal, diagnostic output for transparency and audit.

### API Endpoint

`POST /api/review/bias-report`

- **Input:** `{ sentimentScore: number, biasIndicators: string[] }`
- **Output:** `{ summary, details, culturalContext, fullReport }` (see types above)

### React Component

`BiasReportViewer` (see `client/components/review/BiasReportViewer.tsx`)

- Collapsible sections for each output layer
- Tailwind CSS for styling

### Sample Output

```json
{
  "summary": {
    "adjustedScore": 7.1,
    "verdict": "generally positive",
    "confidence": "high",
    "recommendationStrength": "moderate",
    "biasSummary": "Includes moderate identity signaling, narrative framing, and nostalgia biases."
  },
  "details": [
    {
      "name": "identity signaling bias",
      "severity": "moderate",
      "scoreImpact": -0.4,
      "impactOnExperience": "Positive for players valuing identity expression; less immersive for others.",
      "description": "Identity themes are foregrounded, which may enhance or detract from immersion depending on player alignment."
    },
    {
      "name": "narrative framing bias",
      "severity": "high",
      "scoreImpact": -0.3,
      "impactOnExperience": "Story heavily tied to contemporary sociopolitical themes.",
      "description": "Narrative framing aligns with current ideological trends, which may polarize audiences."
    }
  ],
  "culturalContext": {
    "originalScore": 8.5,
    "biasAdjustedScore": 7.1,
    "justification": "Score adjusted to reflect detected ideological, narrative, or identity-related influences.",
    "audienceReaction": {
      "aligned": "positive",
      "neutral": "mixed",
      "opposed": "negative"
    },
    "biasDetails": [
      /* ... */
    ]
  },
  "fullReport": {
    "score_analysis_engine": {
      "input_review_score": 8.5,
      "ideological_biases_detected": [
        /* ... */
      ],
      "bias_adjusted_score": 7.1,
      "score_context_note": "This adjustment is a contextual calibration, not a value judgment."
    }
  }
}
```

### Output Layer Purposes

- **Summary:** For gamers/casual users—quick, trustworthy verdict.
- **Bias Details:** For users interested in why the score was adjusted.
- **Cultural Context:** For analysts/creators—deep insights into cultural framing and ideological influence.
- **Full Report:** For internal QA, model debugging, or full audit trail.
