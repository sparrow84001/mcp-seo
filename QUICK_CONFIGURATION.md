# Quick Configuration Guide: SEO, AEO, GEO & Growth Auditor MCP

This guide shows how to connect and use the **SEO, AEO, GEO & Digital Marketing Audit + Safe Fix MCP Server** with **GitHub Copilot**, **Antigravity 2.0**, **Claude Desktop**, **Cursor**, and **Cline / Roo Code**.

> [!TIP]
> **Using Standalone `.exe`?** You can replace `"command": "bun", "args": ["/path/to/mcp-seo/src/index.ts"]` with `"command": "/path/to/mcp-seo/bin/mcp-seo.exe", "args": []` in any client below. For full details, see [EXE_USAGE_GUIDE.md](./EXE_USAGE_GUIDE.md).

---

## 1. Antigravity 2.0 (`agy`)

### Option A: Global Configuration
Edit or create `~/.gemini/antigravity/mcp_config.json` (or `%USERPROFILE%\.gemini\antigravity\mcp_config.json` on Windows):

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

### Option B: Workspace-Level Configuration
Create `.agy/mcp.json` in your project root:

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

---

## 2. GitHub Copilot (VS Code)

### Step 1: Add MCP Server in `.vscode/settings.json`
In your project or user settings (`.vscode/settings.json`):

```json
{
  "github.copilot.chat.mcpServers": {
    "seo-growth-auditor": {
      "command": "bun",
      "args": ["/path/to/mcp-seo/src/index.ts"]
    }
  }
}
```

### Step 2: Add Custom Instructions in `.github/copilot-instructions.md`
Create `.github/copilot-instructions.md` in your target repository so Copilot automatically follows the 12-step audit & fix workflow:

```markdown
# SEO & Growth Engineering Instructions

When asked to audit, optimize, or fix SEO/AEO/GEO/marketing on this project:
1. Always use `seo_discover_project` to detect the framework (Laravel, Next.js, Raw PHP, HTML).
2. Run `seo_generate_full_audit` to get 0-100 scores across all 8 dimensions.
3. Prioritize fixes using P0-P3 matrix (Impact × Confidence ÷ Effort).
4. Use `seo_generate_code_fix` to preview surgical unified diffs.
5. Ask for user approval before applying changes directly.
6. Verify modified files with `seo_validate_code_fix` to confirm no duplicate meta tags or broken schemas.
```

---

## 3. Claude Desktop

### Configuration File Path:
* **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`  
  *(e.g., `C:\Users\<YourUser>\AppData\Roaming\Claude\claude_desktop_config.json`)*
* **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

### Add Server:
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

*Restart Claude Desktop after saving the config file.*

---

## 4. Cursor IDE

Create or update `.cursor/mcp.json` in your workspace:

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

*Open Cursor Settings -> Features -> MCP to verify the green status indicator.*

---

## 5. Cline / Roo Code (VS Code Extension)

Add to `mcp_settings.json`:

```json
{
  "mcpServers": {
    "seo-growth-auditor": {
      "command": "bun",
      "args": ["/path/to/mcp-seo/src/index.ts"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

---

## 6. How to Run / Test the Server Manually

```bash
# Navigate to the MCP directory
cd /path/to/mcp-seo

# Run all automated tests
bun test

# Build production bundle
bun run build

# Start server over stdio
bun start
```

---

## 7. Example Prompts to Use with Any Client

* **Full Audit:**
  > "Perform a full SEO, AEO, GEO, and Conversion audit of this project using the `seo-growth-auditor` MCP."

* **Live URL Audit:**
  > "Run `seo_generate_full_audit` on `https://example.com/services/web-design`."

* **AEO & AI Search Check:**
  > "Audit `resources/views/services.blade.php` for Google AI Overviews and Perplexity readiness with `seo_audit_aeo`."

* **Digital Marketing Strategy & Growth Blueprint:**
  > "Formulate a digital marketing and CRO growth blueprint for this site with `seo_generate_marketing_strategy`."

* **Safe Code Fix Mode:**
  > "Generate a surgical code fix for `app/about/page.tsx` adding Title, Meta Description, and Organization JSON-LD schema using `seo_generate_code_fix`."
