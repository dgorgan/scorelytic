# Scorelytic Documentation

## 🧩 Data Models

### Game
- `id: string`
- `title: string`
- `slug: string`           // SEO-friendly URL slug (e.g. "dragon-age-veilguard")
- `description: string`
- `coverArtUrl: string`
- `releaseDate: Date`
- `metaCriticScore?: number`        // Official Metacritic score
- `contentCriticScore?: number`     // AI-generated aggregate score

### Creator
- `id: string`
- `name: string`
- `slug: string`           // SEO-friendly URL slug (e.g. "honestgamer")
- `avatarUrl: string`
- `bio?: string`
- `channelUrl: string`

### Review
- `id: string`              // Unique review ID (e.g. `${creatorId}_${gameId}`)
- `gameId: string`
- `creatorId: string`
- `score: number`           // AI-generated sentiment score (1–10)
- `videoUrl: string`        // Link to YouTube review
- `sentimentSummary: string`
- `pros: string[]`
- `cons: string[]`
- `biasIndicators?: string[]`
- `alsoRecommends?: string[]`   // Array of related game IDs
- `createdAt: Date`

---

## 🔗 API Endpoints

### Games
- `GET /api/games`  
  Returns a list of games with basic details and scores.

- `GET /api/games/:gameId`  
  Returns detailed info for a game including reviews.

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

| Route Pattern                      | Description                                  |
| --------------------------------- | -------------------------------------------- |
| `/`                               | Homepage with latest games and updates       |
| `/games/:gameSlug`                | Game profile with reviews and ratings        |
| `/creators/:creatorSlug`          | Creator profile with bio and reviews         |
| `/reviews/:creatorSlug/:gameSlug` | Detailed review page for a creator/game      |

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
- Run all tests with npm run test

---

## 📦 Additional Notes

- Ensure slug uniqueness in the database
- Fallback routing for incorrect/missing slugs → 404 or redirect
- Cache popular pages and aggregated scores
- Keep documentation updated with all changes to APIs or routing
