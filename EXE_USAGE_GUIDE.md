# 📦 Standalone Executable (`mcp-seo.exe`) Usage Guide

This guide explains how to compile, configure, and use the **standalone binary (`mcp-seo.exe`)** for the **SEO, AEO, GEO & Digital Marketing Auditor MCP Server**.

---

## ⚡ Why Use the Standalone `.exe`?

* **Zero Dependencies Required:** Runs without requiring Node.js, Bun, or `node_modules` on the host machine.
* **Instant Startup:** Pre-compiled and minified machine code with near-zero startup latency (<10ms).
* **Portability:** You can copy `mcp-seo.exe` to any Windows machine or place it in your `PATH` (e.g. `C:\tools\mcp-seo.exe`).

---

## 🛠️ 1. How to Compile the `.exe`

To build or recompile the standalone binary using **Bun 1.4**:

```bash
# Navigate to the project root
cd d:/SNtemp/mcp/mcp-seo

# Compile the standalone executable
bun run compile
```

This executes:
```bash
bun build --compile --minify ./src/index.ts --outfile ./bin/mcp-seo.exe
```

The output binary will be generated at:
```
d:\SNtemp\mcp\mcp-seo\bin\mcp-seo.exe
```

---

## 🔌 2. Client Configurations with `.exe`

When using the standalone `.exe`, the `command` points directly to the executable path and `args` is an empty array `[]`.

### A. Antigravity 2.0 (`agy`)

#### Global Configuration:
Edit `%USERPROFILE%\.gemini\antigravity\mcp_config.json` (or `~/.gemini/antigravity/mcp_config.json`):

```json
{
  "mcpServers": {
    "seo-growth-auditor": {
      "command": "d:/SNtemp/mcp/mcp-seo/bin/mcp-seo.exe",
      "args": []
    }
  }
}
```

#### Workspace-Level Configuration:
Create `.agy/mcp.json` in your workspace root:

```json
{
  "mcpServers": {
    "seo-growth-auditor": {
      "command": "d:/SNtemp/mcp/mcp-seo/bin/mcp-seo.exe",
      "args": []
    }
  }
}
```

---

### B. GitHub Copilot (VS Code)

In `.vscode/settings.json` (or user settings):

```json
{
  "github.copilot.chat.mcpServers": {
    "seo-growth-auditor": {
      "command": "d:/SNtemp/mcp/mcp-seo/bin/mcp-seo.exe",
      "args": []
    }
  }
}
```

---

### C. Claude Desktop

In `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "seo-growth-auditor": {
      "command": "d:/SNtemp/mcp/mcp-seo/bin/mcp-seo.exe",
      "args": []
    }
  }
}
```

*(Restart Claude Desktop after saving the config file).*

---

### D. Cursor IDE

In `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "seo-growth-auditor": {
      "command": "d:/SNtemp/mcp/mcp-seo/bin/mcp-seo.exe",
      "args": []
    }
  }
}
```

---

### E. Windsurf IDE / Codeium

In `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "seo-growth-auditor": {
      "command": "d:/SNtemp/mcp/mcp-seo/bin/mcp-seo.exe",
      "args": []
    }
  }
}
```

---

### F. Cline / Roo Code

In `mcp_settings.json`:

```json
{
  "mcpServers": {
    "seo-growth-auditor": {
      "command": "d:/SNtemp/mcp/mcp-seo/bin/mcp-seo.exe",
      "args": [],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

---

## 💻 3. Manual Execution & Verification

You can test the executable directly from PowerShell or Command Prompt:

```powershell
# Run the binary
.\bin\mcp-seo.exe
```

When started, it will output:
```
MCP SEO Server running on stdio
```
It is now waiting for JSON-RPC MCP messages via standard input/output (`stdio`). Press `Ctrl + C` to exit.

---

## 🚀 4. Moving `mcp-seo.exe` to a Global PATH (Optional)

If you want to use `mcp-seo.exe` from anywhere without typing the full path:

1. Create a tools folder, e.g., `C:\tools\bin`.
2. Copy `mcp-seo.exe` to `C:\tools\bin\mcp-seo.exe`.
3. Add `C:\tools\bin` to your Windows System `PATH`.
4. Now in any MCP client config you can simply write:
   ```json
   {
     "mcpServers": {
       "seo-growth-auditor": {
         "command": "mcp-seo.exe",
         "args": []
       }
     }
   }
   ```

---

## 🔍 5. Troubleshooting & Tips

* **Windows Backslashes:** In JSON configuration files, use forward slashes (`/`) or double backslashes (`\\`) for file paths (e.g. `"d:/SNtemp/mcp/mcp-seo/bin/mcp-seo.exe"` or `"d:\\SNtemp\\mcp\\mcp-seo\\bin\\mcp-seo.exe"`).
* **Binary Updates:** Whenever you update TypeScript code in `src/`, make sure to re-run `bun run compile` so that `bin/mcp-seo.exe` incorporates the latest changes.
* **Firewall / Antivirus:** Because Bun produces standalone native executables, some antivirus software may scan the binary on the very first execution. This is standard behavior.
