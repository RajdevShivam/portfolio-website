# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Order in Chaos** - Personal blog and portfolio website for Shivam Rajdev, a quantitative researcher. Built with Astro, content managed through Notion, deployed on Cloudflare Pages.

**Live at:** https://shivamrajdev.com
**Repo:** https://github.com/RajdevShivam/portfolio-website

## Tech Stack

- **Framework:** Astro 5.x, TypeScript, TailwindCSS 4.x
- **Content:** Notion API (@notionhq/client) + notion-to-md for blog posts
- **Search:** Pagefind (static, client-side)
- **Images:** Satori + Sharp for dynamic OG image generation
- **Syntax:** Shiki (min-light / night-owl themes)
- **Hosting:** Cloudflare Pages (auto-deploy on push to main)

## Development Commands

```bash
npm run dev               # Local dev server (localhost:4321)
npm run build             # Full build (sync-notion → check → build → pagefind)
npm run preview           # Preview production build
npm run sync-notion       # Fetch posts from Notion
npm run format:check      # Prettier check
npm run format            # Apply Prettier
npm run lint              # ESLint
```

## Content Management

Blog posts live in a **Notion database**. The build pipeline:
1. `scripts/fetch-notion.cjs` fetches all "Published" pages
2. Converts to Markdown with frontmatter → `src/data/blog/`
3. Astro Content Collection validates schema (title, pubDatetime, tags, description required)
4. Pagefind indexes the built site for search

**Notion fields:** Title, Description, Publish Date, Status (Published/Draft), Tags, Author, Featured, Cover Image, Slug, Reading Time

## Site Configuration

**`src/config.ts`:**
- `postPerIndex: 5` (homepage), `postPerPage: 10` (listing)
- `lightAndDarkMode: true`, `dynamicOgImage: true`
- `timezone: "Asia/Kolkata"`, `showArchives: false`

**`src/constants.ts`:**
- Social: Email (hello@shivamrajdev.com), LinkedIn, GitHub
- Share: WhatsApp, Facebook, X, Telegram, Pinterest, Email

## Environment Variables

```
NOTION_API_KEY=...          # Notion integration token
NOTION_DATABASE_ID=...      # Blog posts database ID
PUBLIC_GA_ID=...            # Google Analytics (optional)
```

## File Structure

```
PersonalWebsite/
├── src/
│   ├── pages/
│   │   ├── index.astro, about.md, 404.astro
│   │   ├── posts/, tags/, search.astro
│   │   └── tools/
│   │       ├── poker.astro            # Texas Hold'em trainer page
│   │       └── blackjack-trainer.astro
│   ├── layouts/         # Layout.astro, PostDetails.astro, AboutLayout.astro
│   ├── components/      # Header, Footer, Card, Pagination, Tag, Socials, ShareLinks
│   ├── data/blog/       # Notion-synced markdown posts (gitignored)
│   ├── utils/           # OG image generation, post sorting/filtering, slugify
│   ├── config.ts        # Site configuration
│   └── constants.ts     # Social links
├── public/
│   ├── poker/           # poker.css + poker.js (Texas Hold'em game + 4 trainers)
│   ├── blackjack/       # blackjack.css + blackjack.js (3-tab blackjack trainer)
│   └── toggle-theme.js
├── scripts/
│   └── fetch-notion.cjs # Notion sync script
├── astro.config.ts      # Astro + Shiki + TailwindCSS + Remark config
└── package.json
```

## Key Features

- Notion-driven blogging (edit in Notion, auto-sync on build)
- Dynamic OG images per post (generated at build time)
- Client-side fuzzy search (Pagefind)
- Light/dark mode toggle
- SEO: structured data (JSON-LD), sitemap, RSS, meta tags
- Interactive games section (accessible from "Games" nav dropdown)

## Games / Tools

### Texas Hold'em Poker (`/tools/poker`)
- **5 tabs:** Play | Hand Rankings | Pre-flop | Pot Odds | Post-flop
- **Play tab:** Full 6-player game with adaptive AI (Beginner/TAG/GTO/Maniac/Rock profiles)
- **Hand Rankings trainer:** Identify dealt hands from 10 options
- **Pre-flop trainer:** Position-based preflop decisions using GTO ranges
- **Pot Odds trainer:** Call/fold decisions based on pot odds vs equity
- **Post-flop trainer:** 18 scenario-based post-flop decisions
- **Implementation:** `public/poker/poker.js` (IIFE modules), `public/poker/poker.css`
- **CSS vars:** `--pk-*` variables (theme-aware, mapped from `data-theme` on `<html>`)

### Blackjack Trainer (`/tools/blackjack-trainer`)
- **3 tabs:** Strategy Trainer | Card Counting | Play Game
- **Strategy Trainer:** Basic strategy drill (Hard/Soft/Pairs tables)
- **Card Counting:** Hi-Lo system drill with configurable speed and batch size
- **Play Game:** Full blackjack game with bet management and card counting display
- **Implementation:** `public/blackjack/blackjack.js` (IIFE modules), `public/blackjack/blackjack.css`
- **CSS vars:** `--bj-*` variables (theme-aware)

## Navigation

`src/components/Header.astro` has a "Games" dropdown (hover on desktop, click on mobile) containing Poker and Blackjack links. Active state applies to any `/tools/*` path.

## Code Conventions

- **Vanilla JS only** — no frameworks in public/ game files
- **IIFE module pattern** throughout poker.js and blackjack.js
- **localStorage** for stats: `pokerHoldemStats` (game), `pokerTrainerStats` (trainers), `blackjackTrainerStats`
- **is:inline scripts** in .astro pages — use `readyState` check since DOMContentLoaded may have already fired
- **Astro view transitions:** listen for `astro:page-load` to reinitialize interactive scripts
