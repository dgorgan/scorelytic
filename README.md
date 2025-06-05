# Scorelytic

Scorelytic is a transparent, bias-aware video game review analysis platform. It ingests YouTube and critic reviews, extracts sentiment and bias, and provides both raw and bias-adjusted scores—empowering users to see how different perspectives shape review outcomes.

<details>
  <summary>Scorelytic Monorepo Boilerplate</summary>

This monorepo architecture reflects months of careful design to support Scorelytic's unique blend of AI-driven sentiment analysis, bias adjustment, and transparent review aggregation.

- **Modular**: Clear separation between frontend, backend, and shared logic.
- **Type-safe**: Fully TypeScript powered for reliability and developer productivity.
- **Scalable**: Designed to support future AI features, user profiles, and external integrations.
- **Developer Friendly**: Uses pnpm workspaces and turbo repo-style workflows for blazing-fast installs and builds.

The architecture balances ease of development with performance and maintainability, letting us move fast without sacrificing code quality.

For the full architecture details, see the [Scorelytic Monorepo Boilerplate](README-boilerplate.md).

</details>

## Key Features

- **Hybrid transcript extraction** (captions + audio fallback)
- **LLM-powered sentiment analysis**
- **Bias detection and adjustment**
- **Pure TypeScript bias adjustment engine** (`evaluateBiasImpact`)
- **Public-facing toggle:** [Raw Sentiment Score] | [Bias-Adjusted Score]
- **Full rationale and audience fit for every adjustment**
- **Platform-owned synthetic score** (not the critic's)

## How It Works

1. **Transcript → Sentiment**: The LLM analyzes review text and outputs a synthetic `sentimentScore` (0-10) and detected `biasIndicators`.
2. **Bias Adjustment**: `evaluateBiasImpact(sentimentScore, biasIndicators)` applies heuristics to adjust the score, providing a breakdown and rationale.
3. **Transparency**: Both scores are shown, with a toggle and clear explanation—no moralizing, just context.

## Example Usage

```ts
import { analyzeText } from 'server/src/services/sentimentService';
import { evaluateBiasImpact } from 'shared/utils/biasAdjustment';

const sentiment = await analyzeText(transcript);
const biasAdjustment = evaluateBiasImpact(sentiment.sentimentScore, sentiment.biasIndicators);

console.log({
  sentimentScore: sentiment.sentimentScore,
  biasAdjustedScore: biasAdjustment.biasAdjustedScore,
  biasImpact: biasAdjustment.biasImpact,
  adjustmentRationale: biasAdjustment.adjustmentRationale,
});
```

## UX Philosophy

- **Bias ≠ bad**: Biases shape perception. We analyze them so users can decide if a review matches their taste.
- **Platform as arbiter**: Scorelytic owns the synthetic score, not the critic. All reviews are treated equally.
- **User choice**: Users can toggle between raw and adjusted scores, with full transparency on every adjustment.

## Milestones

See [PROJECT_MILESTONES.MD](PROJECT_MILESTONES.MD).

## Overview

Scorelytic is designed to bridge the gap between gamers and media reviewers by offering a **transparent**, **data-driven** approach to reviews. The platform uses **artificial intelligence** to analyze review scores and sentiments, enabling users to make **informed decisions** based on both **critic** and **creator** reviews. Our goal is to provide the truth behind the numbers—showing users the real picture by breaking down review biases and comparing different sources.

## Tech Stack

- **Frontend**:

  - **Next.js** (React framework)
  - **Tailwind CSS** (Utility-first CSS framework for styling)
  - **TypeScript** (for type safety and better developer experience)

- **Backend**:

  - **Express.js** (Minimal web framework for Node.js)
  - **Supabase** (PostgreSQL database, auth, and storage)
  - **TypeScript** (Ensures strong typing and better scalability)

- **Development Tools**:
  - **nodemon** (for automatic server restart during development)
  - **concurrently** (to run multiple npm scripts in parallel)
  - **ts-node** (TypeScript runtime for running TypeScript code directly)

## AI/Analytics

- **Sentiment Analysis**: Live, using OpenAI to analyze review texts, identify sentiment trends, and bias indicators.
- **Dashboard QA**: Internal dashboard for human-in-the-loop review, override, and validation of LLM results.
- **Creator Score**: Based on sentiment analysis, a **curated (or weighted)** creator score will be calculated, factoring in the tone and sentiment of their reviews. This score will allow users to compare creator sentiment with traditional **critic scores** (e.g., MetaCritic, OpenCritic). The goal is to provide a more balanced view of a creator's opinion in relation to a critic's analysis.
- **Machine Learning**: For understanding review patterns and predicting potential biases based on historical data.
- **Bias Detection**: Scoring algorithms will calculate the degree of bias in each review, helping users to identify whether a review is skewed by personal preferences or external factors.

## MVP Goals (2 - 4 weeks)

The MVP now includes:

- LLM sentiment analysis pipeline (YouTube → transcript → LLM → sentiment in DB)
- Internal dashboard for QA and override

The initial MVP focuses on building the essential features of the platform, allowing for rapid iteration and user feedback. The MVP will include:

1. **Frontend** (User Interface):

   - Build a Next.js app with a simple and responsive UI.
   - Display **critic** and **creator** reviews, along with scores.
   - Implement **basic sentiment analysis** to categorize reviews as positive, neutral, or negative.
   - A functional homepage that introduces Scorelytic and its purpose, trending games, etc.

2. **Backend** (API):

   - Create an Express.js API to serve user data and review information.
   - Implement routes for posting and retrieving reviews.
   - Set up Supabase (PostgreSQL) to store reviews and user data.

3. **AI-Driven Insights**:

   - **Sentiment analysis**: Provide a breakdown of whether reviews are generally positive, neutral, or negative.
   - Display aggregated review data and show potential biases across critics and creators.
   - **Data visualization**: Display review score distributions and highlight patterns between critics' and creators' reviews.

4. **Authentication** (Basic login flow):
   - Users can create accounts and log in.
   - Link reviews to user profiles (though not fully fleshed out at this stage).

## Future Goals

Once the MVP is built and tested, we aim to enhance the platform with additional features:

1. **Advanced AI Features**:

   - Enhance sentiment analysis with more sophisticated NLP models to detect nuanced emotions in reviews.
   - Implement **bias prediction algorithms** that show users how likely a reviewer's opinion is to be swayed by factors like personal preferences or affiliations.

2. **Bias Analytics**:

   - Use machine learning to analyze trends in reviewer behavior and highlight potential biases across different platforms, such as gaming publications vs. YouTube creators.
   - **Algorithmic Review Score**: Develop a scoring system that combines **critic reviews** and **creator reviews** into a single unbiased score, factoring in reviewer bias, score distribution, and sentiment.

3. **User Profiles & Personalization**:

   - Allow users to create profiles, follow critics or creators, and track their own personal review feeds.
   - Enable users to see how their preferences align with reviewers, and get personalized recommendations based on historical review data.

4. **External API Integrations**:

   - Integrate with platforms like **Twitch** and **YouTube** to fetch creator reviews directly, and provide an expanded, real-time view of what creators are saying about games.
   - Partner with gaming platforms (e.g., **Steam** or **Epic Games**) for up-to-date game data and official reviews.

5. **Monetization**:
   - **Premium Features**: Explore monetization options by offering **premium analytics** for users wanting more in-depth data and insights.
   - **Ad-Free Experience**: Provide an option to remove ads for a subscription fee.
   - **Creator Partnerships**: Partner with creators for **affiliate marketing** and **sponsorships** on reviews.

## Installation

### Prerequisites

- Node.js (v18+ recommended)
- pnpm (monorepo uses pnpm workspaces)
- Supabase project (for backend database, auth, and storage)

### Setup

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd scorelytic
   ```

2. **Install dependencies (all packages):**

   ```bash
   pnpm install
   ```

3. **Environment configuration:**

   Create a `.env` file in the root and in each package as needed (see .env.example for required vars).

4. **Run development servers:**

   ```bash
   pnpm dev
   # or for a specific package:
   pnpm --filter client dev
   pnpm --filter server dev
   ```

5. **Build all packages:**

   ```bash
   pnpm build
   ```

6. **Run all tests (with coverage):**

   ```bash
   pnpm test
   # or for fast, incremental tests:
   pnpm turbo run test --filter=...<changed package>
   ```

## Monorepo Structure

- `client/` – Next.js frontend
- `server/` – Express backend
- `shared/` – Shared types, utils, and logic (import via `@scorelytic/shared` only)
- `scripts/` – Batch and utility scripts

## Project Structure

```bash
scorelytic
├── client/                # Frontend application (Next.js)
│   ├── src/               # Client source code
│   ├── public/            # Public assets
│   ├── package.json       # Client dependencies
├── server/                # Backend application (Express.js + Supabase)
│   ├── src/               # Server source code
│   ├── package.json       # Server dependencies
├── shared/                # Shared code (types, constants, etc.)
├── package.json           # Root package.json for shared scripts
├── README.md              # Project documentation
```

## Scripts

### Root

- `npm run dev`: Run both client and server concurrently.

### Client

- `npm run dev`: Start the Next.js development server.

### Server

- `npm run dev`: Start the Express.js server using `nodemon` for live reload.
- `npx dotenv -e .env -- npm run migrate -- reviews transcript`: Seed the Supabase database with test data.

## Database Migrations

To run a migration for a specific table and column (checks if the column exists before running migrations):

```
npm run migrate -- <table> <column>
```

Example:

```
npm run migrate -- reviews transcript
```

This uses the dynamic script in scripts/check-and-migrate.js.

## Contributing

This repository is private during development. Contributions will be welcome once the platform reaches its beta release. Please feel free to open issues or suggest improvements as we progress towards the MVP.

### How to Contribute

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/your-feature`).
3. Commit your changes (`git commit -am 'Add new feature'`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a pull request.

## License

TBD (To Be Determined)

# YouTube Caption Ingestion Pipeline

## Usage

### Single Video Ingest

```sh
npx ts-node scripts/youtube-caption-ingest.ts --ids QkkoHAzjnUs --gameSlug elden-ring --creatorSlug skill-up --gameTitle "Elden Ring" --creatorName "Skill Up" --channelUrl "https://youtube.com/skillup"
```

### Batch Ingest from File

- Plain text file (one video ID per line):

```sh
npx ts-node scripts/youtube-caption-ingest.ts --file video_ids.txt --gameSlug elden-ring --creatorSlug skill-up
```

- JSON file (array of objects with videoId, gameSlug, etc.):

```json
[
  {
    "videoId": "QkkoHAzjnUs",
    "gameSlug": "elden-ring",
    "creatorSlug": "skill-up",
    "gameTitle": "Elden Ring",
    "creatorName": "Skill Up",
    "channelUrl": "https://youtube.com/skillup"
  },
  {
    "videoId": "abc123",
    "gameSlug": "witcher-3",
    "creatorSlug": "angryjoe",
    "gameTitle": "The Witcher 3",
    "creatorName": "AngryJoeShow",
    "channelUrl": "https://youtube.com/angryjoe"
  }
]
```

```sh
npx ts-node scripts/youtube-caption-ingest.ts --file batch.json
```

## YouTube Data v3 API Integration

### New Features

- **Automatic metadata extraction** from YouTube videos
- **Smart game title detection** using regex patterns
- **Enhanced video processing** with thumbnails, descriptions, and tags
- **RESTful API endpoints** for video processing and metadata retrieval

### API Endpoints

#### Process YouTube Video

```http
POST /api/youtube/process
Content-Type: application/json

{
  "videoId": "QkkoHAzjnUs"
}
```

Processes a complete YouTube video:

1. Fetches metadata from YouTube Data v3 API
2. Extracts captions using existing pipeline
3. Analyzes sentiment with LLM
4. Auto-detects game title and creator
5. Saves enriched review to database

#### Get Video Metadata Only

```http
GET /api/youtube/metadata/QkkoHAzjnUs
```

Returns YouTube metadata without processing:

- Video title, description, thumbnails
- Channel information
- Extracted game title suggestions
- Suggested database slugs

#### Check Existing Review

```http
GET /api/youtube/video/QkkoHAzjnUs
```

Checks if a video has already been processed and returns existing review data.

### Environment Setup

Add to your `.env` file:

```env
YOUTUBE_API_KEY=your_youtube_data_v3_api_key
```

Get your API key from [Google Cloud Console](https://console.cloud.google.com/apis/credentials).

### Game Title Detection

The system automatically extracts game titles from video metadata using patterns like:

- "Elden Ring Review - Amazing Game!" → "Elden Ring"
- "Cyberpunk 2077 Gameplay Walkthrough" → "Cyberpunk 2077"
- "Game Title - Channel Name" → "Game Title"

Falls back to video tags if title patterns don't match.

## Features

- Dynamically looks up or auto-creates games and creators by slug/channel/title
- Deduplicates reviews by video URL
- Logs errors to `errors.log`
- Prints a summary at the end
- **NEW**: Rich metadata integration with thumbnails, descriptions, and auto-detection

## Troubleshooting

- **Permission denied for schema public**: Run the GRANTs from the Supabase docs to ensure API roles have access
- **Foreign key constraint errors**: Make sure referenced games/creators exist or let the script auto-create them
- **Duplicate key errors**: The script skips reviews that already exist for a video
- **No captions found**: The video may not have English captions or may be private
- **YouTube API quota exceeded**: Check your Google Cloud Console quota limits
- **Invalid API key**: Verify your `YOUTUBE_API_KEY` environment variable

## Example Output

```
[YT] Fetching captions for videoId: QkkoHAzjnUs
[API] Processing YouTube video: QkkoHAzjnUs
[SUCCESS] Ingested review for videoId: QkkoHAzjnUs
Ingestion summary: [ { videoId: 'QkkoHAzjnUs', status: 'success' } ]
```

## Internal Dashboard (LLM QA & Review)

This is an internal tool for reviewing, validating, and overriding LLM sentiment analysis results. Not part of the public-facing site.

- Features:
  - Grouped and advanced QA views
  - Human-in-the-loop overrides (saved to Supabase)
  - Color-coded legend for mismatches/overrides
  - CSV download, search, and filters for unreviewed/overridden
- Fully covered by Jest + React Testing Library tests
- To run dashboard tests:
  ```bash
  cd client
  npm test
  ```

## How to Run Tests

- **Client (dashboard):**
  ```bash
  cd client
  npm test
  ```
- **Server:**
  ```bash
  cd server
  npm test
  ```

## YouTube Transcript Analysis Pipeline

- Captions are fetched from YouTube videos and stored as `review.transcript`.
- Each transcript is analyzed by the LLM (OpenAI), producing:
  - `summary`, `sentimentScore`, `verdict`, `sentimentSummary`, `biasIndicators`, etc.
- Results are stored in the DB and surfaced in the internal dashboard for QA and override.
- The same data powers the public-facing game/creator pages and analytics.

## Multi-Layered Bias Report Output

- See `shared/types/biasReport.ts` for all output types
- API: `POST /api/review/bias-report` (input: sentimentScore, biasIndicators)
- React: `BiasReportViewer` (collapsible UI for all output layers)

### Output Layers

- **Summary:** User-facing, quick verdict and score, with confidence and bias summary
- **Bias Details:** List of all detected biases, their severity, score impact, and qualitative effect
- **Cultural Context:** Explains how cultural/ideological context may affect perception and score
- **Full Report:** Internal, diagnostic output for transparency and audit

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

## Logging & Error Tracking

- **Sentry** is used for error and performance monitoring in both backend (Express) and frontend (Next.js).
- **Logtail** is used for structured backend logging (JSON in prod, pretty in dev), powered by **Pino**.
- All backend logs are structured (JSON), enabling log search, filtering, and analytics in Logtail.
- Errors and exceptions are sent to Sentry with full context.
- Example backend log (JSON):
  ```json
  {
    "level": "info",
    "service": "backend-api",
    "msg": "Request completed",
    "method": "POST",
    "url": "/api/youtube/process",
    "status": 200,
    "durationMs": 12.49
  }
  ```
- See `.cursorrules` for logging and error tracking policies.

## Commit Message & Code Quality Enforcement

- **Commit messages** are enforced via [commitlint](https://commitlint.js.org/) and [Husky](https://typicode.github.io/husky/):
  - Conventional commit style (e.g. `feat:`, `fix:`, `chore:`)
  - Max 100 characters
  - No empty type or subject
  - Enforced locally on every commit (see `.husky/commit-msg`)
- **Code style** is enforced by ESLint (see `.eslintrc.json`), including alias import rules and no unused vars.
- **Test coverage** is enforced (see `.cursorrules` for thresholds and policy).
- **Tests** are colocated in `__tests__` folders and run via root `npm test` (monorepo Jest config).
- See `.cursorrules` for all code quality and enforcement policies.

## RESTful API Conventions

- All backend routes follow RESTful naming (e.g. `/api/games`, `/api/reviews`).
- See `DOCUMENTATION.MD` for full API spec.

## Local CI Parity: Pre-Push Hook

- Every push runs a Husky `pre-push` hook that executes your full CI suite locally (`npm run check:all`).
- This gives fast feedback, blocks pushes that would fail CI, and is easy to maintain.
- Example `.husky/pre-push`:
  ```sh
  #!/usr/bin/env sh
  npm run check:all
  ```
- For even closer CI parity, use [act](https://github.com/nektos/act) to run GitHub Actions locally.
- With this setup, you'll almost never be surprised by a CI failure after opening a PR.

## Environment Variables & CI

- All required environment variables are listed in `.env.example` (copy and fill for local dev).
- Never commit real secrets! Use dummy/test values for PRs and CI.
- CI workflows inject all required env vars for both client and server before build/test.
- The app fails fast if a required env var is missing.
- For production, use CI secrets or your deployment platform's env management.
- See `.env.example` for the canonical list.

## Environment Variable Validation

- All required env vars are validated at startup using [envalid](https://github.com/af/envalid) (both client and server).
- If any required variable is missing or invalid, the app fails fast with a clear error.
- See `.env.example` for the canonical list of required variables.
