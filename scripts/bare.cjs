const { Client } = require("@notionhq/client");
require("dotenv").config();

async function test() {
    console.log("Starting search for pages...");
    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    try {
        const res = await notion.search({
            filter: { property: "object", value: "page" }
        });
        console.log("Found pages:", res.results.length);
        for (const page of res.results) {
            console.log("Page ID:", page.id);
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

test();
