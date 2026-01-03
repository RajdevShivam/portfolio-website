import pkg from "@notionhq/client";
const { Client } = pkg;
import { NotionToMarkdown } from "notion-to-md";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const notion = new Client({
    auth: process.env.NOTION_API_KEY,
});

const n2m = new NotionToMarkdown({ notionClient: notion });

const BLOG_DIR = path.join(process.cwd(), "src/data/blog");

async function fetchNotionPosts() {
    const databaseId = process.env.NOTION_DATABASE_ID;
    if (!databaseId) {
        console.error("NOTION_DATABASE_ID is not defined");
        process.exit(1);
    }

    console.log("Fetching posts from Notion...");

    try {
        const response = await notion.databases.query({
            database_id: databaseId,
        });

        console.log(`Found ${response.results.length} posts in Notion.`);

        if (!fs.existsSync(BLOG_DIR)) {
            fs.mkdirSync(BLOG_DIR, { recursive: true });
        }

        for (const page of response.results) {
            await processPage(page as any);
        }

        console.log("Done!");
    } catch (error) {
        console.error("Error fetching from Notion:", error);
    }
}

async function processPage(page: any) {
    const { id, properties } = page;

    try {
        const title = properties.title?.title[0]?.plain_text || "Untitled";
        const description = properties.description?.rich_text?.[0]?.plain_text || "";
        const pubDatetime = properties.pubDatetime?.date?.start || page.created_time;
        const modDatetime = properties.modDatetime?.date?.start || null;
        const author = properties.author?.rich_text?.[0]?.plain_text || "Shivam Rajdev";
        const featured = properties.featured?.checkbox || false;
        const draft = properties.draft?.checkbox || false;
        const tags = properties.tags?.multi_select?.map((tag: any) => tag.name) || [];
        const slug = properties.slug?.rich_text?.[0]?.plain_text || id;

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
tags:
${tags.map((tag: string) => `  - ${tag}`).join("\n")}
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
