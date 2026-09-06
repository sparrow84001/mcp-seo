import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

async function main() {
    try {
        console.log("Connecting to https://mcp-seo-5dl7.onrender.com/mcp ...");
        const transport = new StreamableHTTPClientTransport(new URL("https://mcp-seo-5dl7.onrender.com/mcp"));
        const client = new Client({ name: "test-client", version: "1.0.0" }, { capabilities: {} });
        await client.connect(transport);
        console.log("Connected successfully to Render!");

        console.log("Calling seo_generate_full_audit for https://webmindltd.com ...");
        const res = await client.callTool({
            name: "seo_generate_full_audit",
            arguments: { target: "https://webmindltd.com" }
        });
        console.log("Render result received!");
        console.log("Content items:", (res.content as any[]).length);
        console.log("Preview text:\n", (res.content as any[])[0]?.text?.substring(0, 400));
        await client.close();
    } catch (e) {
        console.error("Render test failed:", e);
    }
}

main();
