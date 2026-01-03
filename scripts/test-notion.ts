import { Client } from "@notionhq/client";
import * as dotenv from "dotenv";

dotenv.config();

async function testNotion() {
    console.log("Starting test...");
    const databaseId = process.env.NOTION_DATABASE_ID;
    const apiKey = process.env.NOTION_API_KEY;

    if (!databaseId || !apiKey) {
        console.error("Missing env vars");
        return;
    }

    const notion = new Client({ auth: apiKey });

    try {
        console.log("Querying database...");
        const response = await notion.databases.query({
            database_id: databaseId,
        });
        console.log("Success! Found", response.results.length, "pages.");
    } catch (error) {
        console.error("Error:", error);
    }
}

testNotion();
