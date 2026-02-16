
You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.
- Do not write arrow functions in templates (they are not supported).

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

---

# RankPilot — AI SEO Auditor + Content Optimizer

## Project Overview

SaaS product that crawls websites, scores SEO per-page (0-100), generates AI-written fixes via Claude API, and produces PDF reports. Built as Angular Elements on WordPress + Express backend.

## Workspace Structure

```
RankPilot-Workspace/
  projects/
    rankpilot-library/        # Angular library — components, services, models
      src/
        public-api.ts         # Library entry point
        lib/
          models/             # TypeScript interfaces
          services/           # API service
          components/         # UI components
    rankpilot-elements/       # Angular Elements app — registers custom elements
      src/main.ts             # Registers <rankpilot-dashboard>, <rankpilot-page-detail>
    rankpilot-backend/        # Express + TypeScript backend
      prisma/schema.prisma    # Database schema
      src/
        server.ts             # Express entry point (port 3100)
        config/               # Environment, logger, database
        crawler/              # Playwright crawler engine
        analysis/             # SEO scorer + AI fix generator
        reports/              # PDF report generator
        routes/               # API route handlers
        middleware/            # Error handler
        utils/                # Error helpers, response helpers
```

## Component Inventory

| Custom Element Tag | Component | Directory |
|---|---|---|
| `<rankpilot-dashboard>` | `SiteDashboardComponent` | `rankpilot-library/src/lib/components/site-dashboard/` |
| `<rankpilot-page-detail>` | `PageDetailComponent` | `rankpilot-library/src/lib/components/page-detail/` |
| (internal) | `ScoreGaugeComponent` | `rankpilot-library/src/lib/components/score-gauge/` |
| (internal) | `PageListComponent` | `rankpilot-library/src/lib/components/page-list/` |
| (internal) | `CrawlProgressComponent` | `rankpilot-library/src/lib/components/crawl-progress/` |
| (internal) | `FixQueueComponent` | `rankpilot-library/src/lib/components/fix-queue/` |

## Service Inventory

| Service | Location | Purpose |
|---|---|---|
| `RankPilotApiService` | `rankpilot-library/src/lib/services/` | HTTP client for all backend endpoints |
| `CrawlerService` | `rankpilot-backend/src/crawler/` | Playwright headless browser crawler |
| `ScoringService` | `rankpilot-backend/src/analysis/` | Per-page SEO scoring (0-100) |
| `FixGeneratorService` | `rankpilot-backend/src/analysis/` | AI fix generation via Claude API |
| `CrawlOrchestrator` | `rankpilot-backend/src/crawler/` | Coordinates crawl → score → fix pipeline |
| `ReportService` | `rankpilot-backend/src/reports/` | PDF generation via Puppeteer |

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/sites` | Register a new site |
| `GET` | `/api/sites` | List all sites |
| `GET` | `/api/sites/:id` | Get site details with recent crawls |
| `POST` | `/api/sites/:id/crawl` | Trigger a new crawl (async) |
| `GET` | `/api/crawls/:id` | Get crawl status and results |
| `GET` | `/api/crawls/:id/pages` | Get paginated page results |
| `GET` | `/api/crawls/:id/pages/:pageId` | Get single page detail with fixes |
| `GET` | `/api/crawls/:id/report` | Download PDF report |

## Build Commands

```bash
# Library
ng build rankpilot-library

# Elements app (produces main.js + styles.css)
ng build rankpilot-elements

# Backend
cd projects/rankpilot-backend
npm run dev          # Development with hot reload
npm run build        # TypeScript compilation
npm run lint         # ESLint check
npx prisma generate  # Regenerate Prisma client
npx prisma migrate dev  # Run migrations
```

## Environment Variables (Backend)

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 3100) |
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `DIRECT_URL` | Direct connection (bypasses pooler) |
| `ANTHROPIC_API_KEY` | Claude API key for AI scoring/fixes |
| `CORS_ORIGIN` | Allowed origin (default: geekatyourspot.com) |
| `CRAWL_DEPTH_DEFAULT` | Default max pages per crawl (default: 50) |
| `CRAWL_CONCURRENCY` | Concurrent page crawls (default: 3) |

## Database Models (Prisma)

- **Site** — Registered websites to audit
- **Crawl** — Audit runs with status tracking (PENDING → RUNNING → COMPLETE/FAILED)
- **CrawlPage** — Per-page results with SEO score, issues, and AI fixes
- **Alert** — Score drops, page errors, SSL warnings
- **Report** — Generated PDF report records

## Session Notes

**February 16, 2026 (Session 1):**
- Phase 1 MVP implementation complete
- Created: Backend scaffold (Express + TypeScript + Prisma + ESLint)
- Created: Prisma schema with 5 models (Site, Crawl, CrawlPage, Alert, Report)
- Created: Crawler engine (Playwright headless, page extraction, technical checks)
- Created: AI Scoring Service (per-page 0-100 score across 8 categories)
- Created: Fix Generator Service (Claude API for AI-written SEO fixes)
- Created: API routes (sites, crawls, pages, reports)
- Created: PDF Report Service (Puppeteer-based)
- Created: Angular library with 6 components + API service
- Created: Angular Elements app registering `<rankpilot-dashboard>` and `<rankpilot-page-detail>`
- Fixed: tsconfig paths pointing to library source (not dist)
- Fixed: outputHashing set to "none" for predictable filenames
- Both library and elements app build successfully
- Backend compiles with zero TypeScript errors
- Next: Set up Supabase database, run Prisma migrations, create .env, test end-to-end crawl
