# Scorelytic Monorepo Boilerplate

A modern, production-grade monorepo template for full-stack TypeScript projects. Built for speed, scalability, and developer experience.

---

## Overview

This monorepo powers Scorelytic—a bias-aware, AI-driven review analytics platform—but is designed as a robust boilerplate for any modern TypeScript project. It combines best-in-class tooling, strict code quality, and a seamless developer workflow.

---

## Architecture

- **Monorepo:** Managed with [pnpm workspaces](https://pnpm.io/workspaces) and [Turborepo](https://turbo.build/)
- **Packages:**
  - `client/` – Next.js (React, Tailwind CSS)
  - `server/` – Express.js (TypeScript, Supabase, Pino, Sentry)
  - `shared/` – Shared types, logic, and utilities
  - `scripts/` – Automation and batch scripts
- **Strict alias imports** (no relative parent imports)
- **Colocated tests** and type-safe shared code

---

## Tech Stack

- **Frontend:**
  - [Next.js](https://nextjs.org/) (React, App Router)
  - [Tailwind CSS](https://tailwindcss.com/)
  - [TypeScript](https://www.typescriptlang.org/)
- **Backend:**
  - [Express.js](https://expressjs.com/)
  - [Supabase](https://supabase.com/) (Postgres, Auth, Storage)
  - [Pino](https://getpino.io/) (structured logging)
  - [Sentry](https://sentry.io/) (error monitoring)
- **Testing:**
  - [Jest](https://jestjs.io/) (unit/integration, colocated in `__tests__`)
  - [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
  - [Playwright](https://playwright.dev/) (E2E, in `client/test/e2e/`)
  - [envalid](https://github.com/af/envalid) (env var validation)
- **DevX & Tooling:**
  - [pnpm](https://pnpm.io/) (fast, disk-efficient package manager)
  - [Turborepo](https://turbo.build/) (incremental builds, caching, task orchestration)
  - [Husky](https://typicode.github.io/husky/) (git hooks)
  - [lint-staged](https://github.com/okonet/lint-staged) (fast pre-commit linting)
  - [ESLint](https://eslint.org/) (strict code style, import rules)
  - [Prettier](https://prettier.io/) (consistent formatting)
  - [commitlint](https://commitlint.js.org/) (conventional commits)
  - [act](https://github.com/nektos/act) (run GitHub Actions locally)

---

## CI/CD & Quality

- **GitHub Actions** for CI: build, type-check, test, and coverage
- **Job-level env var injection** for reliable test/build environments
- **Turbo, Next.js, and node_modules caching** for fast CI
- **Fail-fast env validation** (envalid) in all packages
- **Pre-commit:** Fast linting only
- **Pre-push:** Full type-check, build, and test suite (local CI parity)
- **Test coverage enforced** (Jest + coverage reports)
- **Conventional commit messages** enforced by commitlint + Husky

---

## E2E Testing

- **Playwright** is set up for browser E2E tests (`client/test/e2e/`)
- **Jest** for all unit/integration tests (`*.test.ts(x)`)
- **E2E tests are disabled in CI by default** (for speed), but can be run locally with `pnpm test:e2e`
- **Easy to re-enable E2E in CI**—just uncomment the job in `.github/workflows/ci.yml`

---

## Environment Management

- **All required env vars** are listed in `.env.example`
- **envalid** ensures all required vars are present and valid at startup
- **CI injects all required env vars** for both client and server
- **Never commit real secrets**—use dummy/test values for PRs and CI

---

## Cleaning & Maintenance

- `pnpm clean` nukes all build, cache, and artifacts for a fresh start
- **Turbo remote cache** is easy to add for distributed teams (see Turbo docs)
- **Dependency update bots** (e.g., Renovate) are recommended for keeping deps fresh

---

## Why Use This Boilerplate?

- **Modern, scalable, and fast**—top-tier monorepo practices
- **Strict code quality and enforcement** out of the box
- **CI/CD and local dev parity**—what passes locally passes in CI
- **Easy to extend** for new packages, services, or features
- **Great for teams**: clear structure, fast feedback, and robust automation

---

## Getting Started

1. Clone the repo
2. Run `pnpm install`
3. Copy `.env.example` to `.env` and fill in required vars
4. Run `pnpm dev` to start both client and server
5. Run `pnpm test` for all tests, or `pnpm test:e2e` for Playwright E2E

---

## License

MIT or your choice
