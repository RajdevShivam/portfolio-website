const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const notion = new Client({
    auth: process.env.NOTION_API_KEY,
});

const n2m = new NotionToMarkdown({ notionClient: notion });

const BLOG_DIR = path.join(process.cwd(), "src/data/blog");

async function fetchNotionPosts() {
    const databaseId = "YOUR_NOTION_DATABASE_ID";

    console.log("Fetching posts from Notion using search...");
    const targetId = databaseId.replace(/-/g, '').toLowerCase();

    try {
        const response = await notion.search({
            filter: { property: "object", value: "page" }
        });

        console.log(`Found ${response.results.length} total pages in Notion.`);

        if (!fs.existsSync(BLOG_DIR)) {
            fs.mkdirSync(BLOG_DIR, { recursive: true });
        }

        for (const page of response.results) {
            const pageDbId = page.parent && page.parent.database_id ? page.parent.database_id : "none";
            const normalizedPageDbId = pageDbId.replace(/-/g, '').toLowerCase();

            if (normalizedPageDbId === targetId) {
                await processPage(page);
            }
        }

        console.log("Done!");
    } catch (error) {
        console.error("Error fetching from Notion:", error);
    }
}

async function processPage(page) {
    const { id, properties, cover: notionCover } = page;

    try {
        // Helper to get property value safely (case-insensitive)
        const getProp = (name) => {
            let prop = properties[name];
            if (!prop) {
                const key = Object.keys(properties).find(k => k.toLowerCase() === name.toLowerCase());
                if (key) prop = properties[key];
            }

            if (!prop) return null;
            if (prop.type === 'title') return prop.title[0]?.plain_text;
            if (prop.type === 'rich_text') return prop.rich_text[0]?.plain_text;
            if (prop.type === 'date') return prop.date?.start;
            if (prop.type === 'checkbox') return prop.checkbox;
            if (prop.type === 'multi_select') return prop.multi_select.map(t => t.name);
            if (prop.type === 'url') return prop.url;
            if (prop.type === 'files') {
                const file = prop.files[0];
                if (!file) return null;
                return file.type === 'external' ? file.external.url : file.file.url;
            }
            return null;
        };

        const title = getProp('Title') || getProp('title') || "Untitled";
        const description = getProp('SEO Description') || getProp('Description') || getProp('description') || "";
        const pubDatetime = getProp('Publish Date') || getProp('pubDatetime') || page.created_time;
        const modDatetime = getProp('modDatetime') || null;
        const author = getProp('Author') || getProp('author') || "Shivam Rajdev";
        const featured = getProp('Featured') || getProp('featured') || false;

        // Get Status property (select type)
        const statusProp = properties['Status'] || properties['status'];
        const status = statusProp?.select?.name || 'Draft';
        const draft = status !== 'Published'; // Only publish if Status = "Published"

        const tags = getProp('Tags') || getProp('tags') || [];
        const slug = getProp('Slug') || getProp('slug') || id;
        const readingTime = getProp('Reading Time') || null;

        // Handle cover image (check "Cover Image" property first, then Notion's built-in cover)
        let ogImage = getProp('Cover Image');
        if (!ogImage && notionCover) {
            if (notionCover.type === 'external') ogImage = notionCover.external.url;
            else if (notionCover.type === 'file') ogImage = notionCover.file.url;
        }

        if (draft) {
            console.log(`Skipping ${status} post: ${title}`);
            return;
        }

        console.log(`Processing: ${title}`);

        const mdblocks = await n2m.pageToMarkdown(id);
        const mdString = n2m.toMarkdownString(mdblocks);

        const frontmatter = `---
title: "${title}"
description: "${description}"
pubDatetime: ${pubDatetime}
${modDatetime ? `modDatetime: ${modDatetime}` : ""}
author: "${author}"
featured: ${featured}
draft: ${draft}
tags: [${tags.map((tag) => `"${tag}"`).join(", ")}]
${ogImage ? `ogImage: "${ogImage}"` : ""}
---

${mdString.parent}
`;

        const fileName = `${slug}.md`;
        const filePath = path.join(BLOG_DIR, fileName);

        fs.writeFileSync(filePath, frontmatter);
    } catch (error) {
        console.error(`Error processing page ${id}:`, error);
    }
}

fetchNotionPosts().catch(console.error);
