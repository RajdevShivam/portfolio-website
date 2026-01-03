import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import type {
  QueryDatabaseResponse,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

const notion = new Client({
  auth: import.meta.env.NOTION_API_KEY,
});

const n2m = new NotionToMarkdown({ notionClient: notion });

export type NotionPost = {
  id: string;
  title: string;
  description: string;
  pubDatetime: Date;
  modDatetime: Date | null;
  author: string;
  featured: boolean;
  draft: boolean;
  tags: string[];
  slug: string;
  content: string;
};

export async function getNotionPosts(): Promise<NotionPost[]> {
  const databaseId = import.meta.env.NOTION_DATABASE_ID;
  if (!databaseId) {
    throw new Error("NOTION_DATABASE_ID is not defined");
  }

  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: "draft",
      checkbox: {
        equals: false,
      },
    },
    sorts: [
      {
        property: "pubDatetime",
        direction: "descending",
      },
    ],
  });

  const posts = await Promise.all(
    response.results.map(async (page) => {
      const post = await parseNotionPage(page as PageObjectResponse);
      return post;
    })
  );

  return posts;
}

async function parseNotionPage(page: PageObjectResponse): Promise<NotionPost> {
  const { id, properties } = page;

  const title = (properties.title as any).title[0]?.plain_text || "Untitled";
  const description = (properties.description as any).rich_text[0]?.plain_text || "";
  const pubDatetime = new Date((properties.pubDatetime as any).date?.start || page.created_time);
  const modDatetime = (properties.modDatetime as any).date?.start 
    ? new Date((properties.modDatetime as any).date.start) 
    : null;
  const author = (properties.author as any).rich_text[0]?.plain_text || "Shivam Rajdev";
  const featured = (properties.featured as any).checkbox || false;
  const draft = (properties.draft as any).checkbox || false;
  const tags = (properties.tags as any).multi_select.map((tag: any) => tag.name) || [];
  const slug = (properties.slug as any).rich_text[0]?.plain_text || id;

  const mdblocks = await n2m.pageToMarkdown(id);
  const mdString = n2m.toMarkdownString(mdblocks);

  return {
    id,
    title,
    description,
    pubDatetime,
    modDatetime,
    author,
    featured,
    draft,
    tags,
    slug,
    content: mdString.parent,
  };
}
