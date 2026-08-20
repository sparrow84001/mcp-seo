# SEO, AEO, GEO & Digital Marketing Audit + Safe Fix MCP Server

[![CI & PR Validation](https://github.com/sparrow84001/mcp-seo/actions/workflows/ci.yml/badge.svg)](https://github.com/sparrow84001/mcp-seo/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/sparrow84001/mcp-seo)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0.2-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.4.0-black.svg)](https://bun.sh)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Author](https://img.shields.io/badge/Author-Sayanta_Neogi-orange.svg)](https://github.com/sparrow84001)

An advanced, AI-powered Model Context Protocol (MCP) server that acts as a comprehensive **Growth Auditor, Search & AI Engine Optimizer, and Framework-Aware Code Fixer**.

> **Developed by:** **Sayanta Neogi** ([@sparrow84001](https://github.com/sparrow84001)) • 📧 [sparrow8400@gmail.com](mailto:sparrow8400@gmail.com)  
> **Repository:** [github.com/sparrow84001/mcp-seo](https://github.com/sparrow84001/mcp-seo) • **Version:** `1.0.0`

Designed for seamless integration with **Antigravity 2.0**, **GitHub Copilot**, **Claude Desktop**, **Cursor**, and **Windsurf**. Built with **TypeScript 7** and powered by **Bun 1.4**.

---

## Key Capabilities

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                 MCP-SEO AUDIT ENGINE                    │
                  └────────────────────────────┬────────────────────────────┘
                                               │
    ┌──────────────────┬───────────────────────┼───────────────────────┬──────────────────┐
    │                  │                       │                       │                  │
    ▼                  ▼                       ▼                       ▼                  ▼
┌──────────────┐ ┌──────────────┐      ┌──────────────┐      ┌──────────────┐ ┌──────────────┐
│Technical SEO │ │ On-Page SEO  │      │  AEO / GEO   │      │  Local SEO   │ │  Conversion  │
│ Indexing     │ │  Headings    │      │ Direct Answer│      │ NAP & Maps   │ │ CTAs & Forms │
│ Canonicals   │ │  Title/Meta  │      │ Knowledge G. │      │ City Pages   │ │ Trust Signals│
│ Robots/Maps  │ │  Social Cards│      │ llms.txt     │      │ Local Schema │ │ Risk Reversal│
└──────────────┘ └──────────────┘      └──────────────┘      └──────────────┘ └──────────────┘
                                               │
                                               ▼
                  ┌─────────────────────────────────────────────────────────┐
                  │        SURGICAL CODE FIXER & VALIDATOR (DIFFS)          │
                  │ Laravel Blade • Next.js (App/Pages) • PHP • HTML • Vue  │
                  └─────────────────────────────────────────────────────────┘
```

* **Framework Discovery:** Automatic architecture detection for Laravel Blade (`@section`, `@push`, components), Next.js App Router (`Metadata` API, `sitemap.ts`), Next.js Pages Router (`next/head`), Nuxt, Astro, Raw PHP, and static HTML.
* **8-Dimension Scoring:** Calculates 0-100 scores and letter grades (`A+` to `F`) across Technical SEO, On-Page SEO, AEO, GEO, Local SEO, Content Quality, Conversion/CRO, and Core Web Vitals risks.
* **AEO & GEO Ready (2026 Search):** Optimizes for Google AI Overviews, Perplexity, ChatGPT Search, and Claude; audits `llms.txt` and validates `sameAs` entity reconciliation.
* **Local & Area SEO:** Audits `LocalBusiness` schema, NAP consistency, click-to-call phone links, and flags spammy doorway city page duplication.
* **Surgical Code Fixes & Rollback Safety:** Generates unified diffs before applying any changes to files, followed by post-fix validation to prevent duplicate tags or broken schemas.
* **Zero Hallucination Policy:** Confirmed code evidence is strictly tagged as `confirmed`, architectural patterns as `inferred`, and strategic ideas as `recommended`.

---

## Installation & Setup

### Prerequisites
* [Bun](https://bun.sh) (v1.1+) installed.

### Quick Start

```bash
# Clone and install dependencies
cd /path/to/mcp-seo
bun install

# Run test suite
bun test

# Build executable bundle
bun run build

# Compile standalone native binary (zero dependencies)
bun run compile

# Start MCP server directly
bun start
```

> [!TIP]
> **Standalone Executable Available:** You can compile a single standalone `.exe` using `bun run compile` which runs without requiring Bun or Node.js on the host machine. See [EXE_USAGE_GUIDE.md](./EXE_USAGE_GUIDE.md) for setup instructions.

---

## Client Configurations

### 1. Antigravity 2.0 (`agy`) Configuration

Add the server to your Antigravity global configuration or workspace `.agy/mcp.json`:

```json
{
  "mcpServers": {
    "seo-auditor": {
      "command": "bun",
      "args": ["/path/to/mcp-seo/src/index.ts"]
    }
  }
}
```

### 2. GitHub Copilot / VS Code MCP Configuration

In `.vscode/settings.json` (or `.codeium/mcp.json`):

```json
{
  "github.copilot.chat.mcpServers": {
    "seo-auditor": {
      "command": "bun",
      "args": ["/path/to/mcp-seo/src/index.ts"]
    }
  }
}
```

To guide Copilot directly, add this to `.github/copilot-instructions.md`:
```markdown
When performing SEO or website audits, always use the `seo-auditor` MCP tools:
1. Run `seo_discover_project` first to understand the framework.
2. Run `seo_generate_full_audit` to get 0-100 scores and P0-P3 prioritized actions.
3. Show unified diffs with `seo_generate_code_fix` and request user approval before modifying code.
4. Verify with `seo_validate_code_fix` after applying fixes.
```

### 3. Claude Desktop Configuration

Add to `%APPDATA%/Claude/claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "seo-growth-auditor": {
      "command": "bun",
      "args": ["/path/to/mcp-seo/src/index.ts"]
    }
  }
}
```

### 4. Cursor Configuration

Add to `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "seo-auditor": {
      "command": "bun",
      "args": ["/path/to/mcp-seo/src/index.ts"]
    }
  }
}
```

---

## MCP Tools Reference

| Tool Name | Purpose | Key Inputs |
| :--- | :--- | :--- |
| `seo_discover_project` | Detects framework, routing model, sitemaps, robots.txt, llms.txt, page inventory | `projectPath` |
| `seo_crawl_and_extract` | Extracts title, meta, canonical, headings, links, schemas, images from file/URL | `target`, `pageType?` |
| `seo_audit_technical` | Checks canonicals, robots.txt, meta robots noindex/nofollow, sitemaps, mixed content | `target`, `projectPath?` |
| `seo_audit_onpage` | Evaluates title length/CTR, meta description, H1-H6 hierarchy, OpenGraph/Twitter | `target` |
| `seo_audit_aeo` | Audits direct answer blocks, question headings (What/How), FAQ schema, llms.txt | `target` |
| `seo_audit_geo` | Audits Organization/Person entities, sameAs reconciliation, E-E-A-T credentials | `target` |
| `seo_audit_local` | Audits LocalBusiness schema, NAP consistency, click-to-call, city page duplication | `target` |
| `seo_audit_content` | Classifies search intent (Informational, Commercial, Transactional), thin content risk | `target` |
| `seo_audit_conversion`| Audits primary/secondary CTAs, lead capture forms, WhatsApp/Phone, social proof | `target` |
| `seo_audit_performance`| Identifies code-level CLS (missing img dimensions), LCP (legacy formats), blocking JS | `target` |
| `seo_audit_schema` | Validates Schema.org JSON-LD syntax and missing schemas by page type | `target` |
| `seo_audit_internal_links` | Builds link graph, detects orphan pages, generic anchor text, suggests contextual links | `target` |
| `seo_generate_full_audit` | Consolidates all 8 dimensions into weighted 0-100 scores, P0-P3 matrix, and Markdown report | `target`, `projectPath?` |
| `seo_generate_marketing_strategy` | Formulates high-ROI digital marketing growth blueprint, CRO plan, AEO strategy & 30-60-90 day roadmap | `target`, `projectPath?` |
| `seo_generate_code_fix` | Framework-aware code generation (Laravel Blade, Next.js, Astro, HTML) with unified diff | `filePath`, `title?`, `metaDescription?`, `canonicalUrl?`, `jsonLdSchema?`, `applyDirectly?` |
| `seo_validate_code_fix` | Post-fix validation: checks duplicate tags, JSON-LD syntax, Before/After score diff | `filePath`, `beforeScores?` |

---

## MCP Prompts Reference

1. **`seo_full_audit`**: Guides the AI through the complete 12-step audit workflow from discovery to reporting.
2. **`digital_marketing_growth_strategy`**: Synthesizes audit findings into a high-impact digital marketing growth blueprint with CRO levers, AI answer engine tactics, audience mapping, and a 30-60-90 day execution roadmap.
3. **`seo_code_fix_workflow`**: Step-by-step guidance for surgical code fixes with approval checkpoints.
4. **`aeo_geo_optimization`**: Deep optimization for Generative Engines and AI Answer Engines.
5. **`local_seo_boost`**: Dedicated optimization for local and multi-location businesses.

---

## Standard 12-Step Audit Workflow

```
1. DISCOVER  ➔  2. CRAWL  ➔  3. ANALYZE (8 Dimensions)  ➔  4. IDENTIFY PROBLEMS
       ▲                                                              │
       │                                                              ▼
12. REPORT  ▲  11. RE-AUDIT  ▲  10. APPLY FIX  ▲  9. APPROVAL  ◄  5. PRIORITIZE
```

---

## MCP Registry & Community Hubs

This server is packaged and ready for the **Official Model Context Protocol Registry** and community directories:

* **Official MCP Registry:** Follow the 4-step publishing process with `server.json` via [MCP_REGISTRY_SUBMISSION_GUIDE.md](./MCP_REGISTRY_SUBMISSION_GUIDE.md).
* **Smithery.ai & Glama.ai:** Ready for 1-click indexing.

---

## 👨‍💻 Author & Credits

* **Author / Developer:** **Sayanta Neogi**
* **GitHub Profile:** [@sparrow84001](https://github.com/sparrow84001)
* **Email:** [sparrow8400@gmail.com](mailto:sparrow8400@gmail.com)
* **Project Repository:** [https://github.com/sparrow84001/mcp-seo](https://github.com/sparrow84001/mcp-seo)
* **Current Version:** `1.0.0`

---

## License

MIT License © 2026 Sayanta Neogi. Developed for Antigravity, GitHub Copilot, and Claude AI Ecosystems.
