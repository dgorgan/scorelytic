1. Fix all unit tests
2. Ensure CI still works
3. Remove redundant fields from database and code (biasDetection and biasAdjustment should only exist inside sentiment in data; clean up any top-level or legacy fields)
4. Fix any broken UX on mobile (responsive issues, layout bugs, etc)
5. Audit for:
   - Outdated type definitions (DemoReview, sentiment, etc)
   - Any remaining direct access to top-level biasDetection/biasAdjustment in backend/frontend
   - Inconsistent use of slug/metadata (should always use top-level)
   - Unused or legacy code paths (old upsert logic, fallback slugs, etc)
   - Test coverage gaps (especially for new structure)
   - Accessibility issues (color contrast, ARIA, keyboard nav)
   - Performance regressions (SWR cache, loading states)
   - Documentation updates (README, API docs, migration notes)
   - Linter/eslint/prettier config drift
   - Any new warnings/errors in browser console or server logs
   - Leverage the use of CONSTS everywhere (e.g. api.ts, client/api.tsx)

## Remove Redundant/Derivable Sentiment Fields

### Goal

- Only keep these fields in `sentiment`:
  - pros, cons
  - sentimentSummary
  - sentimentSummaryFriendlyVerdict
  - reviewSummary
  - alsoRecommends
  - biasDetection
  - biasAdjustment
  - biasIndicators
  - legacyAndInfluence
  - sentimentSnapshot
- Remove or stop using:
  - summary (use sentimentSummary instead)
  - verdict (use sentimentSnapshot.verdict instead)
  - sentimentScore (use sentimentSnapshot.inferredScore instead)

### Step-by-step Plan

1. **Scan codebase for all usage of `summary`, `verdict`, and `sentimentScore` inside `sentiment`.**
2. **Update all backend code to only write/read the canonical fields:**
   - Use `sentimentSummary` instead of `summary`.
   - Use `sentimentSnapshot.verdict` instead of `verdict`.
   - Use `sentimentSnapshot.inferredScore` instead of `sentimentScore`.
3. **Update all frontend code to only read the canonical fields.**
4. **Update all type definitions and mocks to match the new structure.**
5. **Write a migration script (SQL or Node.js) to remove redundant fields from all existing rows in the database.**
6. **Test all affected flows (backend, frontend, and tests).**
7. **Remove any legacy code or fallback logic for the old fields.**
