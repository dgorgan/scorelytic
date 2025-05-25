# Project Milestones: Scorelytic

## ✅ Phase 1: MVP Web App

### 🎯 Core Features
- [x] Basic app shell and scaffolding
- [x] Landing page: list recently reviewed games
- [x] Game profile: `/games/[gameSlug]`
  - [x] Show title, art, and description
  - [x] Aggregated creator sentiment score (1–100)
  - [x] List of reviews (avatar, score, snippet)
- [x] Review detail: `/reviews/[creatorSlug]/[gameSlug]`
  - [x] Show full review + YouTube embed
  - [x] Display sentiment summary, pros, cons, bias indicators, and "also recommends"
- [x] Creator profile: `/creators/[creatorSlug]`
  - [x] Show avatar, bio, list of reviewed games
  - [x] Display review tendencies or trends

### 🔧 Tech Setup
- [x] Frontend: Next.js + Tailwind CSS
- [x] Backend: Express, Next API routes, or Supabase
- [x] Models: Prisma or SQL with slug support
- [x] Slug-based routing logic
- [x] Component structure and base layout
- [x] Robust backend test infra (Jest, supabase mocks)
- [x] Monorepo test runner (root-level npm test runs all)

---

## 🚀 Phase 2: AI Integration & SEO

- [ ] Integrate OpenAI or Claude for sentiment analysis
- [ ] Analyze YouTube transcripts or summaries
- [ ] Output:
  - [ ] Score (1–10)
  - [ ] Pros / Cons
  - [ ] Bias indicators
  - [ ] Also Recommends (games)
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
