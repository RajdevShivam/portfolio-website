# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Order in Chaos** - Personal blog and portfolio website for Shivam Rajdev, a quantitative researcher. Built with Astro, content managed through Notion, deployed on Cloudflare Pages.

**Live at:** https://shivamrajdev.com

## Tech Stack

- **Framework:** Astro 5.16.6, TypeScript, TailwindCSS 4.x
- **Content:** Notion API (@notionhq/client) + notion-to-md for blog posts
- **Search:** Pagefind (static, client-side)
- **Images:** Satori + Sharp for dynamic OG image generation
- **Syntax:** Shiki (min-light / night-owl themes)
- **Hosting:** Cloudflare Pages (auto-deploy on push)
- **Repo:** https://github.com/RajdevShivam/portfolio-website

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
NOTION_API_KEY=...
NOTION_DATABASE_ID=...
PUBLIC_GA_ID=...              # Google Analytics (optional)
```

## File Structure

```
PersonalWebsite/
├── src/
│   ├── pages/           # Astro routes (index, about, posts, tags, search, 404)
│   ├── layouts/         # Layout.astro, PostDetails.astro, AboutLayout.astro
│   ├── components/      # Header, Footer, Card, Pagination, Tag, Socials, ShareLinks
│   ├── data/blog/       # Notion-synced markdown posts
│   ├── utils/           # OG image generation, post sorting/filtering, slugify
│   ├── config.ts        # Site configuration
│   └── constants.ts     # Social links
├── scripts/
│   └── fetch-notion.cjs # Notion sync script
├── public/              # Static assets, pagefind index
├── dist/                # Built site
├── astro.config.ts      # Astro + Shiki + TailwindCSS + Remark config
└── package.json
```

## Key Features

- Notion-driven blogging (edit in Notion, auto-sync on build)
- Dynamic OG images per post (generated at build time)
- Client-side fuzzy search (Pagefind)
- Light/dark mode toggle
- SEO: structured data (JSON-LD), sitemap, RSS, meta tags
- 100 Lighthouse score
