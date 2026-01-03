# Deployment Guide

## Prerequisites

1. GitHub account
2. Cloudflare account (free tier)
3. Notion account with API integration set up

## Step 1: Set Up Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Click "+ New integration"
3. Name it "Personal Blog" (or any name you prefer)
4. Select your workspace
5. Copy the "Internal Integration Token" (starts with `secret_`)
6. Open your Notion database: "Blog Posts - Portfolio Website"
7. Click the "..." menu → "Connections" → Add your integration

## Step 2: Configure Environment Variables Locally

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Notion API key:
   ```
   NOTION_API_KEY=secret_your_actual_key_here
   NOTION_DATABASE_ID=YOUR_NOTION_DATABASE_ID
   ```

## Step 3: Push to GitHub

1. Create a new repository on GitHub (can be private or public)
2. Add the remote and push:
   ```bash
   git remote set-url origin https://github.com/yourusername/your-repo-name.git
   git push -u origin main
   ```

## Step 4: Deploy to Cloudflare Pages

### Option A: Via Cloudflare Dashboard (Recommended)

1. Log in to Cloudflare Dashboard
2. Go to "Workers & Pages" → "Pages"
3. Click "Create a project" → "Connect to Git"
4. Select your GitHub repository
5. Configure build settings:
   - **Framework preset**: Astro
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
6. Add environment variables:
   - `NOTION_API_KEY`: (paste your Notion API key)
   - `NOTION_DATABASE_ID`: `YOUR_NOTION_DATABASE_ID`
7. Click "Save and Deploy"

### Option B: Via Wrangler CLI

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Deploy
npm run build
wrangler pages deploy dist
```

## Step 5: Configure Custom Domain (Optional)

1. In Cloudflare Pages project → Custom domains
2. Click "Set up a custom domain"
3. Enter your domain name
4. Update DNS records as instructed
5. Wait for SSL certificate (automatic)

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `NOTION_API_KEY` | Your Notion integration token | Yes |
| `NOTION_DATABASE_ID` | The ID of your blog posts database | Yes |

## Troubleshooting

### Build fails with "NOTION_API_KEY not found"
- Make sure you've added the environment variable in Cloudflare Pages settings
- Variable names are case-sensitive

### Posts not showing up
- Check that posts in Notion have Status = "Published"
- Verify the database ID is correct
- Check that the Notion integration is connected to your database

### 404 on custom domain
- DNS changes can take 24-48 hours to propagate
- Verify CNAME record points to `yourproject.pages.dev`

## Updating Content

Once deployed, the site will automatically rebuild when you:
1. Push new code to GitHub
2. Update configuration

To update blog posts:
- Just edit your Notion database
- Trigger a manual redeploy in Cloudflare Pages, or
- Push an empty commit to trigger rebuild: `git commit --allow-empty -m "Trigger rebuild" && git push`
