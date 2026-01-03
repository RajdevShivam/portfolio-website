const { Client } = require("@notionhq/client");
const notion = new Client({ auth: "test" });
console.log("Databases keys:", Object.keys(notion.databases));
console.log("Query is function:", typeof notion.databases.query === 'function');
