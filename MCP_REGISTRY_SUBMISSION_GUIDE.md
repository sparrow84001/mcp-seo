# 🌐 How to Register This Server on MCP Registry & Community Hubs

This guide walks you through registering and publishing **MCP-SEO** to the **Official Model Context Protocol (MCP) Registry** and popular MCP directories (**Smithery.ai**, **Glama.ai**, **Awesome MCP Servers**).

---

## 📋 Pre-Submission Checklist

Before submitting, ensure:
- [x] All automated tests pass (`bun test`).
- [x] TypeScript type checking passes (`bun run typecheck`).
- [x] Standalone binary builds (`bun run compile`).
- [x] `server.json` is configured in the repository root.
- [ ] Your code is pushed to a **public GitHub repository** (e.g. `https://github.com/<your-username>/mcp-seo`).

---

## 🚀 1. Official MCP Registry (`github.com/modelcontextprotocol/registry`)

The official registry is managed by the Model Context Protocol team at [modelcontextprotocol/registry](https://github.com/modelcontextprotocol/registry).

### Step 1: Install `mcp-publisher` CLI

* **Windows (via Go or Prebuilt Binary):**
  Download the latest release from [github.com/modelcontextprotocol/registry/releases](https://github.com/modelcontextprotocol/registry/releases) and extract `mcp-publisher.exe` to your `PATH`.
* **macOS / Linux / WSL (via Homebrew):**
  ```bash
  brew install modelcontextprotocol/tap/mcp-publisher
  ```

### Step 2: Authenticate with GitHub

Run:
```bash
mcp-publisher login
```
Follow the browser prompt to authorize with your GitHub account.

### Step 3: Validate & Publish

In your project root (where `server.json` is located):

```bash
# Validate your server configuration
mcp-publisher validate

# Publish to the official registry
mcp-publisher publish
```

### Step 4: Verify on the Registry API
```bash
curl "https://registry.modelcontextprotocol.io/v0/servers?search=mcp-seo"
```

---

## 📦 2. Publishing to npm (Optional but Recommended)

Publishing to npm allows users worldwide to run your MCP server instantly with `bunx mcp-seo` or `npx mcp-seo`:

```bash
# 1. Login to npm
npm login

# 2. Build production bundle
bun run build

# 3. Publish to npm
npm publish --access public
```

Once published, users can configure your MCP server with a single line:
```json
{
  "mcpServers": {
    "seo-growth-auditor": {
      "command": "bunx",
      "args": ["-y", "mcp-seo"]
    }
  }
}
```

---

## 🌟 3. Submit to Smithery.ai

[Smithery.ai](https://smithery.ai) is one of the largest MCP discovery engines and 1-click installer platforms:

1. Visit [https://smithery.ai](https://smithery.ai).
2. Sign in with your GitHub account.
3. Click **"Submit Server"** (or connect your GitHub repository).
4. Select your `mcp-seo` repository.
5. Smithery will automatically index your tools and create a 1-click install page for Claude Desktop, Cursor, and Windsurf!

---

## 🔍 4. Submit to Glama.ai

[Glama.ai](https://glama.ai/mcp/servers) indexes open-source MCP servers:

1. Visit [https://glama.ai/mcp/servers](https://glama.ai/mcp/servers).
2. Click **"Submit MCP Server"**.
3. Paste your public GitHub repository URL (`https://github.com/<your-username>/mcp-seo`).
4. Submit for instant automated verification.

---

## 📚 5. Submit to Awesome MCP Servers

Submit a Pull Request to the leading community-curated lists:

1. **Punkpeye's Awesome MCP Servers:** [github.com/punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)
   * Fork the repo.
   * Add your server under the **"SEO / Marketing / Developer Tools"** category:
     ```markdown
     * [mcp-seo](https://github.com/<your-username>/mcp-seo) - Comprehensive SEO, AEO (AI Overviews, Perplexity), GEO, Local SEO, and CRO Growth Auditor with surgical code fixes.
     ```
   * Open a PR!
