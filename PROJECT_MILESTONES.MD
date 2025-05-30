# Project Milestones: Scorelytic

## ✅ Phase 1: MVP Web App

### 🎯 Core Features

- [ ] Basic app shell and scaffolding
- [ ] Landing page: list recently reviewed games
- [ ] Game profile: `/games/[gameSlug]`
  - [ ] Show title, art, and description
  - [ ] Aggregated creator sentiment score (1–100)
  - [ ] List of reviews (avatar, score, snippet)
- [ ] Review detail: `/reviews/[creatorSlug]/[gameSlug]`
  - [ ] Show full review + YouTube embed
  - [ ] Display sentiment summary, pros, cons, bias indicators, and "also recommends"
- [ ] Creator profile: `/creators/[creatorSlug]`
  - [ ] Show avatar, bio, list of reviewed games
  - [ ] Display review tendencies or trends

### 🔧 Tech Setup

- [x] Frontend: Next.js + Tailwind CSS
- [x] Backend: Express, Next API routes, or Supabase
- [x] Models: Prisma or SQL with slug support
- [x] Slug-based routing logic
- [x] Component structure and base layout
- [x] Robust backend test infra (Jest, supabase mocks)
- [x] Monorepo test runner (root-level npm test runs all)
- [x] Logging: Sentry + Logtail integration, unified backend logging
- [x] Commit message enforcement: commitlint + Husky v10+, conventional style, max 100 chars
- [x] Test colocation and alias import enforcement
- [x] Type-aware linting in shared
- [x] Monorepo Jest config (root npm test runs all)
- [x] All policies documented in .cursorrules and DOCUMENTATION.MD
- [x] Env var validation at startup (fail-fast, envalid in client/server)
- [x] .env.example policy and documentation

---

## 🚀 Phase 2: AI Integration & SEO

- [x] Integrate OpenAI or Claude for sentiment analysis
- [x] Internal dashboard for LLM QA and overrides (not public)
- [x] Analyze YouTube transcripts or summaries
- [ ] Output:
  - [x] Score (1–10)
  - [x] Pros / Cons
  - [x] Bias indicators
  - [x] Also Recommends (games)
- [ ] Store results and display them on UI
- [ ] Add SEO metadata:
  - [ ] Open Graph
  - [ ] Twitter Cards
  - [ ] JSON-LD schema
- [ ] Optimize performance for SEO

---

## 📊 Phase 3: Aggregation + Insights + Routing Enhancements

- [ ] Normalize and compare creator review scores
- [ ] Compute final "ContentCritic" aggregate score (0–100)
- [ ] Compare with MetaCritic where available
- [ ] Display score deltas on game page
- [ ] Canonical URLs and 404 pages
- [ ] Enhanced routing and internal linking

---

## 📌 Future Ideas

- [ ] Creator dashboard and verification
- [ ] Commenting / community system
- [ ] Advanced filtering or tags
- [ ] Game discovery by sentiment pattern
- [ ] Social sharing & embed features
- [ ] YouTube metadata enrichment (video title, channel, etc.)

## 1. Core Sentiment & Review Pipeline (Complete)

- [x] YouTube Data v3 integration
- [x] Hybrid transcript (caption/audio) service
- [x] OpenAI Whisper transcription
- [x] Sentiment analysis pipeline
- [x] Internal dashboard with edit modals
- [x] 130+ tests passing

## 2. Bias-Aware Scoring & Transparency (Current)

- [x] Implement bias detection in LLM pipeline
- [x] Add pure TypeScript bias adjustment engine (`evaluateBiasImpact`)
- [x] Show both raw sentiment and bias-adjusted scores
- [x] Provide rationale and audience fit for adjustments
- [x] Add public-facing toggle: [Raw Sentiment Score] | [Bias-Adjusted Score]
- [x] Platform now owns the synthetic score (not the critic)
- [x] Full test coverage for bias adjustment logic

## 3. Public-Facing UI & Discovery

- [ ] Build homepage with latest games and updates
- [ ] Game profile pages with aggregated sentiment
- [ ] Creator profile pages
- [ ] Review listings with avatars, scores, snippets
- [ ] YouTube video embeds, SEO-friendly slugs
- [ ] Game/review/creator search and analytics

## 4. Advanced Features & Analytics

- [ ] Batch processing UI for multiple videos
- [ ] Analytics dashboard for transcript costs
- [ ] Video performance metrics (views, engagement vs sentiment)
- [ ] Caching, webhooks, export (PDF, etc)
- [ ] Gaming-specific features (genre detection, trend analysis)

## 5. Production Readiness

- [ ] Deploy to production
- [ ] Monitoring/logging for API usage
- [ ] Secure environment variables
- [ ] Documentation and onboarding
