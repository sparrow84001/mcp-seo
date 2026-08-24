# 🌐 Web MCP (HTTP / SSE) & Related Ecosystem Guide

Welcome to the **Web MCP Guide** for **MCP-SEO** (`io.github.sparrow84001/mcp-seo`).

This server features a **Dual-Transport Architecture**:
1. **CLI Stdio Mode (Default):** For local IDEs like Antigravity, Cursor, Claude Desktop, and VS Code.
2. **Web MCP Mode (HTTP & SSE):** For remote AI clients, cloud deployments, web dashboards, and platforms like Smithery.ai, Railway, Render, Fly.io, or Docker.

---

## 🚀 1. How to Enable Web MCP Mode Locally

### Via Bun / NPM:
```bash
# Start on default port (http://localhost:3000)
bun run start:http

# Or specify custom port and host
bun run src/index.ts --http --port 8080 --host 0.0.0.0
```

### Via Standalone Native Binary (`.exe` / binary):
```powershell
# Windows
.\bin\mcp-seo.exe --http --port 3000

# Linux / macOS
./bin/mcp-seo --http --port 3000
```

### Via Environment Variables:
```bash
PORT=3000 MCP_TRANSPORT=http bun start
```

---

## 📡 2. Web MCP Endpoints

When Web MCP mode is running, the following endpoints are active:

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `GET /` | `GET` | Interactive HTML status dashboard and client connection instructions. |
| `GET /sse` | `GET` | **Server-Sent Events (SSE)** stream endpoint for real-time MCP connections. |
| `POST /message?sessionId=<id>` | `POST` | JSON-RPC message endpoint for tool calls and prompt execution. |
| `GET /health` | `GET` | Instant JSON health check (`{"status":"ok","uptime":...}`). |
| `GET /info` | `GET` | Metadata, tools count, and transport specs. |

---

## 🤖 3. Connecting AI Clients to Web MCP (SSE)

### A. Cursor (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "seo-growth-auditor": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

### B. Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "seo-growth-auditor": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

### C. Remote AI Agents / ChatGPT Custom Actions / Web UIs
Point the client to your public HTTPS URL (e.g. `https://your-app.up.railway.app/sse`).

---

## ☁️ 4. Free 1-Click Cloud Deployment Guides

### Option A: Deploy to Railway (Recommended)
1. Go to **[railway.app](https://railway.app)** and log in with GitHub.
2. Click **"New Project"** ➔ **"Deploy from GitHub repo"** ➔ Select `sparrow84001/mcp-seo`.
3. In Project Settings, set Environment Variable:
   * `PORT`: `3000`
   * `MCP_TRANSPORT`: `http`
4. Click **"Generate Domain"** to get your public HTTPS URL (e.g. `https://mcp-seo-production.up.railway.app`).
5. Your SSE URL is: `https://mcp-seo-production.up.railway.app/sse`.

### Option B: Deploy with Docker
```bash
# Build container image
docker build -t mcp-seo .

# Run Web MCP container
docker run -p 3000:3000 -e PORT=3000 -e MCP_TRANSPORT=http mcp-seo
```

---

## 🌐 5. Related Website & Competitor Suggestion Engine

MCP-SEO includes a dedicated tool to discover related web ecosystems, competitors, and niche opportunities:

### Tool: `seo_suggest_related_ecosystem`
Analyze any website URL or local codebase:
```json
{
  "target": "https://example.com"
}
```

### What It Delivers:
1. **Industry & Niche Classification:** Automatically identifies market vertical (e.g., *B2B SaaS / DevTools, E-Commerce, Local Services, Healthcare, FinTech, EdTech*).
2. **Competitor Archetypes & Benchmarks:** Highlights market leaders, direct competitors, and niche challengers with actionable differentiation tactics.
3. **High-Authority Directory & Citation Prospects:** Suggests platforms like ProductHunt, G2, Capterra, Clutch, Yelp, BBB, and curated GitHub Awesome lists.
4. **Thematic Keyword Topic Clusters:** Generates commercial comparison clusters (`X vs Y`), problem-solving tutorials, pricing queries, and thought leadership angles.
5. **Knowledge Graph & Wikidata Entity Recommendations:** Formulates `sameAs` targets for Generative Engine Optimization (GEO) and AI search citations.

### Prompt: `related_ecosystem_and_competitor_analysis`
Run in chat:
> *"Analyze the related web ecosystem and competitor benchmark for my website using `seo_suggest_related_ecosystem`."*
