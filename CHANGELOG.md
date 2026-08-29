# 📜 Changelog

All notable changes to the **MCP-SEO** server (`io.github.sparrow84001/mcp-seo`) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.5] - 2026-08-29

### 🌟 What's New & Major Highlights

#### 1. 🗺️ Multi-Page Site-Wide Sitemap & Robots.txt Deep Crawler (`seo_audit_sitemap_multipage`)
* **Recursive XML Sitemap Parsing:** Recursively resolves single sitemaps, sitemap indexes (`<sitemapindex><sitemap><loc>...`), and extracts `<loc>`, `<lastmod>`, `<changefreq>`, and `<priority>`.
* **RFC 9309 Robots.txt Permission Engine:** Standard longest-match specificity rule evaluator testing `Allow` and `Disallow` rules per user-agent (`Googlebot`, `Bingbot`, `*`) and AI search engines (`GPTBot`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`, `CCBot`).
* **Contradiction & Asset Blocking Detection:** Automatically flags disallowed paths mistakenly listed in sitemaps, blocked CSS/JS rendering assets, or accidental `Disallow: /` directives.
* **Site-Wide Multi-Page Batch Auditing:** Audits every registered page for Technical, On-Page, AEO, GEO, CRO, Performance, and WebMCP, producing an aggregated inventory deficit scorecard and breakdown table.

#### 2. 🛡️ HTTP Security & Trust Headers Audit Engine (`seo_audit_robots_and_sitemap`)
* **Strict-Transport-Security (HSTS):** Validates HTTPS enforcement, `max-age` duration ($\ge 31536000$ / 1 year), `includeSubDomains`, and `preload` eligibility.
* **Modern Security Posture:** Audits `Content-Security-Policy` (CSP), `X-Frame-Options` (Clickjacking defense), `X-Content-Type-Options` (`nosniff`), and `Referrer-Policy`.
* **Security & Trust Scorecard:** Computes 0–100 security health score and letter grade (`A+` to `F`).

#### 3. 🌐 Universal Multi-Language WebMCP Protocol Suite & Diagnostic Blueprints
* **Production-Ready Blueprints for 9 Languages/Frameworks:**
  - TypeScript / Node.js (Next.js App Router, Express, Fastify, Hono)
  - Python (FastAPI, Starlette, FastMCP)
  - PHP / Laravel (Blade layouts, API controllers)
  - Go (Golang `mark3labs/mcp-go`)
  - Rust (Axum & Tokio Streamable HTTP server)
  - C# / .NET (ASP.NET Core Minimal APIs)
  - Java / Kotlin (Spring Boot 3 `@RestController`)
  - Ruby on Rails (`ActionController::Live` streaming)
  - Static HTML / In-Browser DOM WebMCP (`document.modelContext` / `window.webmcp`)
* **Protocol Diagnostics & Scoring:** Probes Streamable HTTP (`/mcp`), Legacy SSE (`/sse`), `/.well-known/mcp/server-card.json`, `llms.txt`, `<link rel="mcp-server">`, CORS headers, and Origin validation.

#### 4. ⚙️ Automated Sitemap & Robots.txt Generators (`seo_generate_sitemap_and_robots`)
* Instant generation of standard-compliant `public/sitemap.xml` and `public/robots.txt` configuration files for any website or framework.

---

## [1.0.4] - 2026-08-28
* Updated documentation, Smithery metadata endpoint synchronization, and Streamable HTTP connection examples.

---

## [1.0.1] - 2026-08-24


### 🌟 What's New & Major Highlights

#### 1. 🔍 Live Website Web MCP Tester (`seo_test_web_mcp`)
* Added automated detection for **Client-Side Browser WebMCP** implementing the W3C / Chromium `document.modelContext` / `navigator.modelContext` / `webmcp.js` standard.
* Added live endpoint probing for **Server-Side WebMCP** (`/.well-known/mcp.json`, `/sse`, `/api/mcp/sse`, `/info`).
* Automatically extracts and formats all exposed in-browser and server tools with descriptions and parameters.
* Validates `llms.txt` existence and generates framework-specific enablement code snippets for Next.js, Express, Fastify, and Laravel.

#### 2. ⚡ Dual-Transport Web MCP Architecture (HTTP/SSE + CLI Stdio)
* Added standalone **Web MCP Server mode** powered by native Node/Bun HTTP and Server-Sent Events (`SSEServerTransport`).
* Activated via CLI flags `--http`, `--port <port>`, `--host <host>`, or environment variables `PORT` / `MCP_TRANSPORT=http`.
* Features real-time SSE stream (`GET /sse`), JSON-RPC message endpoint (`POST /message`), JSON health check (`GET /health`), and info metadata (`GET /info`).
* Built-in live HTML status dashboard at `GET /` for instant browser testing and client connection guidance.
* Added new scripts: `bun run start:http` and `bun run dev:http`.

#### 3. 🏆 Related Web Ecosystem, Niche & Competitor Suggestion Engine (`seo_suggest_related_ecosystem`)
* **Industry Vertical Inference:** Automatically classifies websites across 10 verticals (B2B SaaS/DevTools, E-Commerce, Local Services, Agency, FinTech, Healthcare, EdTech, Real Estate, Media, General Business).
* **Competitor Archetypes & Benchmarks:** Highlights market leaders, direct alternatives, and niche challengers with tactical outranking recommendations.
* **High-Authority Directory & Citation Targets:** Recommends high-impact listing sources (ProductHunt, G2, Capterra, Clutch, Yelp, Better Business Bureau, GitHub Awesome lists).
* **Keyword Topic Clusters:** Generates commercial comparison clusters (`X vs Y`), problem-solving tutorials, pricing queries, and thought leadership angles.
* **Knowledge Graph & Entity Linking:** Formulates Schema.org `sameAs` targets (Wikidata, Crunchbase, LinkedIn) for Generative Engine Optimization (GEO).

#### 4. 🤖 GitHub Actions CI/CD & Automated Official Registry OIDC Publishing
* Automated multi-OS validation matrix on every Push and Pull Request across **Ubuntu (Linux)**, **Windows**, and **macOS**.
* Automated standalone binary builder for `mcp-seo-windows-x64.exe`, `mcp-seo-linux-x64`, and `mcp-seo-darwin-arm64`.
* Automated publication to the **Official Model Context Protocol Registry** using secure GitHub OIDC tokens upon new tag creation (`v*`).

#### 5. 📖 New Deployment Guides
* Added **[`WEB_MCP_GUIDE.md`](./WEB_MCP_GUIDE.md)** for local Web MCP execution and 1-click cloud deployments on Railway, Render, Fly.io, and Docker.

---

## [1.0.0] - 2026-08-20

### 🚀 Initial Official Release
* **Official Registry Publication:** Published to the Official Model Context Protocol Registry under namespace `io.github.sparrow84001/mcp-seo`.
* **8-Dimension Audit Suite:** Technical SEO, On-Page SEO, AEO (AI Overviews & Perplexity), GEO (Generative Engines), Local SEO, Content Quality, Conversion/CRO, and Core Web Vitals performance risks.
* **Digital Marketing Strategy Engine (`seo_generate_marketing_strategy`):** CRO levers, AI answer engine tactics, audience mapping, and a 30-60-90 day execution roadmap.
* **Surgical Framework-Aware Code Fixer (`seo_generate_code_fix` & `seo_validate_code_fix`):** Generates unified diffs for Laravel Blade, Next.js App/Pages Router, Astro, PHP, and HTML.
* **Standalone Native Binary Compilation:** Precompiled zero-dependency Windows executable (`mcp-seo.exe`).
* **Author & Attribution:** Developed by **Sayanta Neogi** (`sparrow8400@gmail.com`).
