# Future Plans — Geek At Your Spot Product Roadmap

---

## 1. RankPilot — AI SEO Auditor + Content Optimizer

### Vision

A SaaS product that gives small businesses the same SEO intelligence that agencies charge $2,000+/month for — automated site crawling, AI-powered scoring, fix-it reports, and monthly monitoring with alerts. Built on Claude API for analysis and content generation. **Dogfood product:** built for geekatyourspot.com first, then sold to clients.

### The Problem

Small businesses in Broward/Palm Beach (and everywhere) either:
- Pay $1,500–3,000/month to an SEO agency that sends confusing reports
- Use free tools (Google Search Console, PageSpeed Insights) but don't know what to do with the data
- Ignore SEO entirely and wonder why their site doesn't rank

There's no tool that **crawls their site, tells them exactly what's broken, writes the fix, and monitors it monthly** — all in plain English, at a price point small businesses can afford.

### Product Architecture

```
RankPilot SaaS
├── Crawler Engine          — Puppeteer/Playwright headless browser
├── Analysis Pipeline       — Claude API for content analysis
├── Monitoring Scheduler    — Cron-based monthly re-crawls
├── Alert System            — Email/SMS when rankings drop
├── Dashboard               — Angular Elements on WordPress (same pattern as OrderStack)
├── API Backend             — Express + Prisma + Supabase
└── Report Generator        — PDF export via Puppeteer
```

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Crawler | Playwright (headless Chromium) | Renders JS-heavy sites, extracts real DOM |
| AI Engine | Claude Sonnet 4 API | Content analysis, meta tag generation, gap detection |
| Backend | Express + TypeScript | Same stack as OrderStack — reuse patterns |
| Database | PostgreSQL via Supabase + Prisma | Same infra, proven at scale |
| Frontend | Angular Elements on WordPress | Same deployment pattern — embed in geekatyourspot.com |
| Scheduler | node-cron or Render Cron Jobs | Monthly automated crawls |
| Email | Resend or SendGrid | Alert delivery |
| PDF | Puppeteer PDF generation | Client-ready reports |
| Hosting | Render.com | Same as OrderStack backend |

### Core Features

#### Phase 1: Site Audit Engine (MVP)

**Crawler:**
- Input: website URL
- Crawl all internal pages (configurable depth limit: 50/100/500 pages)
- Extract per page: title, meta description, H1-H6 hierarchy, image alt text, internal/external links, word count, canonical URL, Open Graph tags, structured data (JSON-LD)
- Technical checks: HTTP status codes, redirect chains, robots.txt, sitemap.xml, SSL certificate, mobile viewport meta tag
- Performance: Core Web Vitals via Lighthouse API (LCP, FID, CLS)

**AI Page Scorer (Claude):**
- Per-page SEO score (0-100) based on:
  - Title tag: length (50-60 chars), keyword presence, uniqueness across site
  - Meta description: length (150-160 chars), keyword presence, call-to-action
  - H1: exists, unique, contains primary keyword
  - Content: word count (>300 minimum), keyword density (1-3%), readability grade
  - Images: alt text presence and quality, file size
  - Internal linking: orphan page detection, link depth
  - Mobile: viewport tag, tap target size, font size
- Overall site health score (aggregate of all pages)
- Priority ranking: which pages to fix first (high traffic + low score = urgent)

**Fix-It Report:**
- Per page: current state → recommended fix → AI-written replacement
- Example: "Title tag is 23 characters (too short). Current: 'Home'. Recommended: 'Geek At Your Spot — IT Consulting & Web Development in Fort Lauderdale'"
- Exportable as PDF with client branding
- One-click copy for each fix

**AI Content Generation:**
- Rewrite meta titles (optimized length + keyword + brand)
- Rewrite meta descriptions (optimized length + CTA + keyword)
- Generate missing alt text for images (describe what Claude sees if image URL is accessible)
- Suggest H1/H2 rewrites for better keyword targeting
- Identify content gaps: "Your competitors rank for X but you have no page about it"

#### Phase 2: Keyword & Competitor Intelligence

**Keyword Tracking:**
- Input: 10-50 target keywords per site
- Track Google ranking position weekly (via SerpAPI or DataForSEO)
- Historical position chart (line graph per keyword)
- Keyword clustering: group related keywords, identify cannibalization

**Competitor Analysis:**
- Input: 3-5 competitor URLs
- Side-by-side comparison: page count, avg score, content gaps
- "They rank for X, you don't" gap report
- Content suggestions: "Write a 1,500-word guide about [topic] to compete with [competitor page]"

**Content Calendar:**
- AI generates monthly blog/page suggestions based on:
  - Keyword gaps vs competitors
  - Trending topics in the business's industry
  - Seasonal patterns (e.g., "tax preparation" peaks in Q1)
- Each suggestion includes: target keyword, suggested title, outline, word count target

#### Phase 3: Monthly Monitoring + Alerts

**Automated Re-crawl:**
- Monthly full crawl (configurable: weekly for premium)
- Diff report: what changed since last crawl (new pages, removed pages, score changes)
- Score trend: improving / declining / stable per page and overall

**Alert System:**
- Email alert when: overall score drops >5 points, specific keyword drops >5 positions, page returns 404/500, SSL expires within 30 days, Core Web Vital fails threshold
- Weekly digest email: top 3 wins, top 3 issues, action items
- SMS alert option for critical issues (site down, SSL expired)

**Client Dashboard:**
- Score overview with trend arrow
- Page-by-page breakdown (sortable, filterable)
- Keyword position table with sparkline charts
- Fix queue: prioritized action items with "Mark as Done"
- Report history: all past crawl reports

#### Phase 4: White-Label & Agency Features

**White-Label:**
- Custom branding (logo, colors, domain)
- Client-facing portal with separate login
- Branded PDF reports with agency logo
- Custom email sender domain

**Agency Dashboard:**
- Multi-client management (switch between sites)
- Cross-client reporting (portfolio health score)
- Bulk actions (re-crawl all clients, export all reports)
- Team access with role-based permissions

**API Access:**
- REST API for programmatic access to all features
- Webhook notifications for score changes
- Integration with popular tools (Slack, Zapier)

### Pricing Model

| Tier | Sites | Pages/Crawl | Keywords | Re-crawl | Price |
|------|-------|-------------|----------|----------|-------|
| **Starter** | 1 | 50 | 10 | Monthly | $29/mo |
| **Professional** | 3 | 250 | 50 | Bi-weekly | $79/mo |
| **Agency** | 10 | 1,000 | 200 | Weekly | $199/mo |
| **Enterprise** | Unlimited | 5,000 | 500 | Daily | Custom |

**Cost structure per crawl:**
- Playwright hosting: ~$0.002/page
- Claude API (Sonnet): ~$0.01/page for analysis + content generation
- SerpAPI keyword tracking: ~$0.005/keyword/check
- Storage (Supabase): negligible
- **Estimated cost per Starter crawl:** $0.60 (50 pages × $0.012)
- **Gross margin at $29/mo:** ~97% (1 monthly crawl)

### Data Models (Prisma)

```
Site
  id, userId, url, name, crawlDepthLimit, status
  → crawls[], keywords[], competitors[]

Crawl
  id, siteId, status (pending/running/complete/failed), startedAt, completedAt
  pageCount, overallScore, previousScore
  → pages[]

CrawlPage
  id, crawlId, url, httpStatus, title, metaDescription
  h1, wordCount, imageCount, imagesWithoutAlt
  internalLinks, externalLinks, canonicalUrl
  seoScore, issues[] (JSON), fixes[] (JSON)
  lcpMs, fidMs, clsScore

Keyword
  id, siteId, term, currentPosition, previousPosition
  → rankings[]

KeywordRanking
  id, keywordId, position, url, checkedAt

Competitor
  id, siteId, url, name, lastCrawledAt

Alert
  id, siteId, type, severity, message, isRead, createdAt

Report
  id, crawlId, pdfUrl, generatedAt
```

### Implementation Priority

1. **Week 1-2:** Crawler engine (Playwright, page extraction, technical checks)
2. **Week 3-4:** AI scorer + fix generator (Claude API integration, scoring algorithm)
3. **Week 5-6:** Dashboard UI (Angular Elements, site overview, page list, fix queue)
4. **Week 7-8:** Report generator (PDF export, branded template)
5. **Week 9-10:** Keyword tracking (SerpAPI integration, position history)
6. **Week 11-12:** Monthly monitoring + alerts (cron scheduler, email alerts)
7. **Post-launch:** Competitor analysis, content calendar, white-label

### Competitive Landscape

| Tool | Price | What RankPilot Does Better |
|------|-------|---------------------------|
| Semrush | $130/mo | Too complex for small businesses, no AI content fixes |
| Ahrefs | $99/mo | Focused on backlinks, no fix-it reports |
| Screaming Frog | $259/yr | Technical-only, no AI, no monitoring |
| Surfer SEO | $89/mo | Content optimization only, no site audit |
| SE Ranking | $55/mo | Closest competitor — but no AI-written fixes |

**RankPilot's moat:** AI-written fixes (not just "your title is too short" but "here's the new title"), plain-English reports, $29 entry price, and built by someone who actually needs it for their own business.

### Dogfooding Plan

1. Build MVP crawler + scorer
2. Run against geekatyourspot.com
3. Fix every issue it finds on the Geek site
4. Measure ranking improvements over 60 days
5. Use before/after results as case study for sales page
6. Offer free audits to 5 existing Geek clients
7. Convert to paid subscriptions

### Revenue Projections (Conservative)

| Month | Subscribers | MRR |
|-------|------------|-----|
| Launch | 1 (self) | $0 |
| Month 3 | 10 | $290 |
| Month 6 | 30 | $1,170 |
| Month 12 | 100 | $4,900 |
| Month 18 | 250 | $14,750 |
| Month 24 | 500 | $29,500 |

At 500 subscribers (mix of Starter/Pro/Agency), MRR hits ~$30K with ~95% gross margin. The entire product runs on the same infrastructure as OrderStack.

---

*Last Updated: February 16, 2026*
