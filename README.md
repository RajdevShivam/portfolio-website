# Order in Chaos

Personal blog and portfolio for Shivam Rajdev — markets, mathematics, metaphysics.

**Live at:** https://shivamrajdev.com

## Tech Stack

- **Framework:** [Astro](https://astro.build/) 5.x with TypeScript
- **Styling:** TailwindCSS 4.x
- **Content:** Notion API → Markdown (via `notion-to-md`)
- **Search:** Pagefind (static, client-side)
- **OG Images:** Satori + Sharp (generated at build time)
- **Syntax highlighting:** Shiki (min-light / night-owl)
- **Hosting:** Cloudflare Pages (auto-deploy on push to `main`)

## Features

- Notion-driven blog — write in Notion, auto-sync on build
- Dynamic OG image generation per post
- Light/dark mode toggle
- Client-side full-text search
- SEO: sitemap, RSS, JSON-LD structured data
- Interactive games: Texas Hold'em Poker trainer + Blackjack trainer

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/RajdevShivam/portfolio-website.git
cd portfolio-website
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and add your Notion credentials:

```
NOTION_API_KEY=secret_...
NOTION_DATABASE_ID=...
PUBLIC_GA_ID=...       # optional, Google Analytics
```

### 3. Run locally

```bash
npm run dev
```

Open http://localhost:4321

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local dev server |
| `npm run build` | Sync Notion + build + index search |
| `npm run preview` | Preview production build |
| `npm run sync-notion` | Fetch posts from Notion only |
| `npm run format` | Format with Prettier |
| `npm run lint` | Lint with ESLint |

## Content Management

Blog posts live in a Notion database. The sync pipeline:

1. `scripts/fetch-notion.cjs` queries all **Published** pages
2. Converts to Markdown with frontmatter → `src/data/blog/`
3. Astro validates schema at build time (title, pubDatetime, tags, description required)
4. Pagefind indexes the built site for search

Required Notion database fields: Title, Description, Publish Date, Status, Tags, Author, Featured, Cover Image, Slug, Reading Time.

## Project Structure

```
src/
├── pages/
│   ├── index.astro          # Homepage
│   ├── about.md             # About page
│   ├── posts/               # Post listing + pagination
│   ├── tags/                # Tag pages
│   ├── search.astro         # Search page
│   └── tools/
│       ├── poker.astro      # Texas Hold'em trainer
│       └── blackjack-trainer.astro
├── components/              # Header, Footer, Card, etc.
├── layouts/                 # Layout.astro, PostDetails.astro
├── data/blog/               # Notion-synced posts (gitignored)
├── utils/                   # OG image generation, sorting, slugify
├── config.ts                # Site configuration
└── constants.ts             # Social links, share options

public/
├── poker/                   # Poker trainer (CSS + JS)
├── blackjack/               # Blackjack trainer (CSS + JS)
└── toggle-theme.js

scripts/
└── fetch-notion.cjs         # Notion sync script
```

## Deployment

The site deploys automatically to Cloudflare Pages on every push to `main`.

Build settings:
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment variables:** `NOTION_API_KEY`, `NOTION_DATABASE_ID`, `PUBLIC_GA_ID`

## Based on

[AstroPaper](https://github.com/satnaing/astro-paper) — MIT License
