import type {
  PageData,
  ProjectDiscoveryResult,
  WebMcpDiagnosticIssue,
  WebMcpLanguage,
  WebMcpLanguageBlueprint
} from '../types/index.ts';

export interface WebMcpToolDefinition {
  name: string;
  description?: string;
  parameters?: Record<string, any>;
}

export interface WebMcpDetectionResult {
  targetUrl: string;
  timestamp: string;
  isWebMcpEnabled: boolean;
  discoveryMethod?:
    | 'streamable-http'
    | 'well-known-manifest'
    | 'sse-endpoint'
    | 'html-meta-tag'
    | 'api-route'
    | 'client-side-browser-mcp';
  transportType?: 'Streamable HTTP' | 'HTTP + SSE' | 'In-Browser DOM' | 'Unknown';
  detectedEndpoints: {
    streamableEndpoint?: string;
    sseEndpoint?: string;
    messageEndpoint?: string;
    manifestUrl?: string;
    infoEndpoint?: string;
    clientScriptUrl?: string;
  };
  corsHeaders?: {
    allowOrigin?: string;
    allowMethods?: string;
    allowHeaders?: string;
    exposeHeaders?: string;
  };
  serverInfo?: {
    name?: string;
    version?: string;
    description?: string;
    transport?: string;
  };
  exposedTools: WebMcpToolDefinition[];
  llmsTxtStatus: {
    exists: boolean;
    url?: string;
    summary?: string;
  };
  diagnostics: WebMcpDiagnosticIssue[];
  languageBlueprints: Record<string, WebMcpLanguageBlueprint>;
  enablementGuide: {
    recommendedSnippet: string;
    stepsToEnable: string[];
  };
  recommendations: string[];
}

export function getMultiLanguageBlueprints(): Record<string, WebMcpLanguageBlueprint> {
  return {
    'nextjs-app': {
      language: 'TypeScript / JavaScript',
      framework: 'Next.js (App Router)',
      packageName: '@modelcontextprotocol/sdk zod',
      fileLocation: 'app/api/mcp/route.ts',
      transportType: 'Streamable HTTP',
      officialSpecRef: 'https://modelcontextprotocol.io/docs/transports/streamable-http',
      setupInstructions: [
        'Install official SDK: `npm install @modelcontextprotocol/sdk zod` (or `bun add @modelcontextprotocol/sdk zod`)',
        'Create endpoint file at `app/api/mcp/route.ts`',
        'Add `<link rel="mcp-server" href="/api/mcp" />` to `app/layout.tsx` `<head>`',
        'Deploy and verify using `seo_test_web_mcp`.'
      ],
      codeSnippet: `// app/api/mcp/route.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'my-nextjs-mcp',
  version: '1.0.0'
});

// Register searchable tools for AI agents
server.registerTool(
  'search_site_content',
  {
    description: 'Search articles, documentation, products, and services on this website.',
    inputSchema: { query: z.string().describe('Search query keyword') }
  },
  async ({ query }) => {
    // Perform database/vector/CMS search
    return {
      content: [{ type: 'text', text: \`Search results for "\${query}": Live inventory and articles indexed.\` }]
    };
  }
);

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID()
  });
  await server.connect(transport);
  return transport.handleRequest(req);
}

export async function GET(req: Request) {
  const transport = new StreamableHTTPServerTransport();
  await server.connect(transport);
  return transport.handleRequest(req);
}`
    },
    'typescript-node': {
      language: 'TypeScript / Node.js',
      framework: 'Express.js / Fastify / Hono',
      packageName: '@modelcontextprotocol/sdk express cors zod',
      fileLocation: 'src/mcp-server.ts',
      transportType: 'Streamable HTTP',
      officialSpecRef: 'https://modelcontextprotocol.io/docs/transports/streamable-http',
      setupInstructions: [
        'Install packages: `npm install @modelcontextprotocol/sdk express cors zod`',
        'Mount the Streamable HTTP transport at `/mcp`',
        'Configure CORS with exposed headers `mcp-session-id`',
        'Host `/.well-known/mcp/server-card.json` for instant autodiscovery.'
      ],
      codeSnippet: `// src/mcp-server.ts
import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

const app = express();
app.use(cors({
  origin: '*',
  exposedHeaders: ['mcp-session-id', 'x-session-id']
}));

const server = new McpServer({
  name: 'node-express-web-mcp',
  version: '1.0.0'
});

server.registerTool('query_database', {
  description: 'Execute read-only query on public catalogue.',
  inputSchema: { term: z.string() }
}, async ({ term }) => ({
  content: [{ type: 'text', text: \`Returned matches for "\${term}".\` }]
}));

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => crypto.randomUUID()
});
server.connect(transport);

app.all('/mcp', async (req, res) => {
  await transport.handleRequest(req, res);
});

app.get('/.well-known/mcp/server-card.json', (req, res) => {
  res.json({
    serverInfo: { name: 'node-express-web-mcp', version: '1.0.0' },
    transport: 'streamable-http',
    endpoints: { mcp: '/mcp' }
  });
});

app.listen(3000, () => console.log('WebMCP active on http://localhost:3000/mcp'));`
    },
    'python-fastapi': {
      language: 'Python',
      framework: 'FastAPI / Starlette / FastMCP',
      packageName: 'mcp fastapi uvicorn',
      fileLocation: 'app/mcp_server.py',
      transportType: 'Streamable HTTP',
      officialSpecRef: 'https://modelcontextprotocol.io/docs/python/server',
      setupInstructions: [
        'Install official Python MCP SDK: `pip install "mcp[cli]" fastapi uvicorn`',
        'Create `app/mcp_server.py` using `FastMCP`',
        'Define decorated tools `@mcp.tool()`',
        'Run `uvicorn app.mcp_server:app --port 8000` or `mcp run app/mcp_server.py --transport streamable-http`.'
      ],
      codeSnippet: `# app/mcp_server.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("python-web-mcp")

@mcp.tool()
def search_products(query: str, category: str = "all") -> str:
    """Search ecommerce products with live pricing and stock levels."""
    return f"Search result for '{query}' in '{category}': In Stock - $29.99"

@mcp.tool()
def calculate_quote(service_type: str, units: int = 1) -> dict:
    """Calculate instant price quote for website services."""
    base_rate = 150
    return {
        "service": service_type,
        "units": units,
        "estimated_total_usd": base_rate * units,
        "turnaround_days": 2
    }

# Run with FastMCP transport:
if __name__ == "__main__":
    mcp.run(transport="streamable-http", port=8000)`
    },
    'php-laravel': {
      language: 'PHP',
      framework: 'Laravel (10 / 11 / 12)',
      packageName: 'guzzlehttp/guzzle',
      fileLocation: 'app/Http/Controllers/McpController.php',
      transportType: 'Streamable HTTP',
      officialSpecRef: 'https://modelcontextprotocol.io/docs/specification/basic/transports',
      setupInstructions: [
        'Create Controller: `php artisan make:controller McpController`',
        'Add route in `routes/api.php`: `Route::match([\'get\', \'post\', \'options\'], \'/mcp\', [McpController::class, \'handle\']);`',
        'Add `<link rel="mcp-server" href="/api/mcp" />` into `resources/views/layouts/app.blade.php`',
        'Create discovery card route at `/.well-known/mcp/server-card.json`.'
      ],
      codeSnippet: `<?php
// app/Http/Controllers/McpController.php
namespace App\Http\Controllers;

use Illuminate\Http\Request;

class McpController extends Controller
{
    public function serverCard()
    {
        return response()->json([
            'serverInfo' => ['name' => 'laravel-web-mcp', 'version' => '1.0.0'],
            'transport' => 'streamable-http',
            'endpoints' => ['mcp' => '/api/mcp']
        ])->header('Access-Control-Allow-Origin', '*');
    }

    public function handle(Request $request)
    {
        if ($request->isMethod('OPTIONS')) {
            return response('', 200)
                ->header('Access-Control-Allow-Origin', '*')
                ->header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-session-id')
                ->header('Access-Control-Expose-Headers', 'mcp-session-id');
        }

        $payload = $request->json()->all();
        $method = $payload['method'] ?? '';
        $id = $payload['id'] ?? null;

        if ($method === 'tools/list') {
            return response()->json([
                'jsonrpc' => '2.0',
                'id' => $id,
                'result' => [
                    'tools' => [
                        [
                            'name' => 'search_catalog',
                            'description' => 'Search products and articles in Laravel Eloquent models.',
                            'inputSchema' => [
                                'type' => 'object',
                                'properties' => ['keyword' => ['type' => 'string']],
                                'required' => ['keyword']
                            ]
                        ]
                    ]
                ]
            ])->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Expose-Headers', 'mcp-session-id');
        }

        if ($method === 'tools/call') {
            $toolName = $payload['params']['name'] ?? '';
            $keyword = $payload['params']['arguments']['keyword'] ?? '';
            return response()->json([
                'jsonrpc' => '2.0',
                'id' => $id,
                'result' => [
                    'content' => [
                        ['type' => 'text', 'text' => "Laravel found items matching '{$keyword}'."]
                    ]
                ]
            ])->header('Access-Control-Allow-Origin', '*');
        }

        return response()->json([
            'jsonrpc' => '2.0',
            'id' => $id,
            'error' => ['code' => -32601, 'message' => 'Method not found']
        ], 404)->header('Access-Control-Allow-Origin', '*');
    }
}`
    },
    'go': {
      language: 'Go (Golang)',
      framework: 'Standard library net/http / Gin / Fiber',
      packageName: 'github.com/mark3labs/mcp-go',
      fileLocation: 'main.go',
      transportType: 'Streamable HTTP',
      officialSpecRef: 'https://github.com/mark3labs/mcp-go',
      setupInstructions: [
        'Initialize Go module: `go get github.com/mark3labs/mcp-go`',
        'Create MCP server with tools and SSE/Streamable HTTP endpoints in `main.go`',
        'Compile and run: `go run main.go`',
        'Serve behind reverse proxy (Caddy/Nginx) with HTTPS.'
      ],
      codeSnippet: `// main.go
package main

import (
	"context"
	"fmt"
	"net/http"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

func main() {
	s := server.NewMCPServer("golang-web-mcp", "1.0.0", server.WithToolCapabilities(true))

	tool := mcp.NewTool("search_inventory",
		mcp.WithDescription("Search live inventory items."),
		mcp.WithString("keyword", mcp.Required(), mcp.Description("Search keyword")),
	)

	s.AddTool(tool, func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		keyword, _ := req.Params.Arguments["keyword"].(string)
		return mcp.NewToolResultText(fmt.Sprintf("Go server returned matches for: %s", keyword)), nil
	})

	sseServer := server.NewSSEServer(s, "http://localhost:8080")
	http.Handle("/sse", sseServer.HandleSSE())
	http.Handle("/message", sseServer.HandleMessage())

	fmt.Println("🚀 Go WebMCP running on :8080 (/sse and /message)")
	http.ListenAndServe(":8080", nil)
}`
    },
    'rust': {
      language: 'Rust',
      framework: 'Axum / Tokio / Actix-Web',
      packageName: 'axum tokio serde serde_json tower-http',
      fileLocation: 'src/main.rs',
      transportType: 'Streamable HTTP',
      officialSpecRef: 'https://modelcontextprotocol.io/docs/specification/basic/transports',
      setupInstructions: [
        'Add dependencies in `Cargo.toml`: `axum = "0.7"`, `tokio = { version = "1", features = ["full"] }`, `serde_json = "1.0"`',
        'Implement JSON-RPC 2.0 / Streamable HTTP endpoint in `src/main.rs`',
        'Run: `cargo run --release`'
      ],
      codeSnippet: `// src/main.rs
use axum::{routing::{get, post}, Json, Router};
use serde_json::{json, Value};
use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/mcp", post(handle_mcp))
        .route("/.well-known/mcp/server-card.json", get(server_card));

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    println!("🦀 Rust WebMCP Server running on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn server_card() -> Json<Value> {
    Json(json!({
        "serverInfo": { "name": "rust-web-mcp", "version": "1.0.0" },
        "transport": "streamable-http",
        "endpoints": { "mcp": "/mcp" }
    }))
}

async fn handle_mcp(Json(payload): Json<Value>) -> Json<Value> {
    let method = payload.get("method").and_then(Value::as_str).unwrap_or("");
    let id = payload.get("id").cloned().unwrap_or(Value::Null);

    if method == "tools/list" {
        return Json(json!({
            "jsonrpc": "2.0",
            "id": id,
            "result": {
                "tools": [{
                    "name": "lookup_rust_data",
                    "description": "Ultra fast Rust database lookup tool.",
                    "inputSchema": { "type": "object" }
                }]
            }
        }));
    }
    Json(json!({ "jsonrpc": "2.0", "id": id, "error": { "code": -32601, "message": "Method not found" } }))
}`
    },
    'csharp-dotnet': {
      language: 'C# / .NET',
      framework: 'ASP.NET Core Minimal APIs (.NET 8 / 9)',
      packageName: 'Microsoft.AspNetCore.OpenApi',
      fileLocation: 'Program.cs',
      transportType: 'Streamable HTTP',
      officialSpecRef: 'https://modelcontextprotocol.io/docs/specification/basic/transports',
      setupInstructions: [
        'Create ASP.NET Core project: `dotnet new web -n WebMcpServer`',
        'Add MCP endpoint handlers in `Program.cs`',
        'Enable CORS for AI agent clients with `mcp-session-id` exposure',
        'Run: `dotnet run`'
      ],
      codeSnippet: `// Program.cs
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors(options => {
    options.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod().WithExposedHeaders("mcp-session-id"));
});

var app = builder.Build();
app.UseCors();

app.MapGet("/.well-known/mcp/server-card.json", () => Results.Json(new {
    serverInfo = new { name = "dotnet-web-mcp", version = "1.0.0" },
    transport = "streamable-http",
    endpoints = new { mcp = "/mcp" }
}));

app.MapPost("/mcp", async (HttpContext context) => {
    var payload = await context.Request.ReadFromJsonAsync<System.Text.Json.Nodes.JsonObject>();
    var method = payload?["method"]?.ToString();
    var id = payload?["id"];

    if (method == "tools/list") {
        return Results.Json(new {
            jsonrpc = "2.0",
            id = id,
            result = new {
                tools = new[] {
                    new {
                        name = "search_dotnet_data",
                        description = "Query ASP.NET Core database and CRM models.",
                        inputSchema = new { type = "object" }
                    }
                }
            }
        });
    }
    return Results.Json(new { jsonrpc = "2.0", id = id, error = new { code = -32601, message = "Method not found" } });
});

app.Run("http://0.0.0.0:5000");`
    },
    'java-spring': {
      language: 'Java / Kotlin',
      framework: 'Spring Boot 3 (WebMVC / WebFlux)',
      packageName: 'spring-boot-starter-web',
      fileLocation: 'src/main/java/com/example/mcp/McpController.java',
      transportType: 'Streamable HTTP',
      officialSpecRef: 'https://modelcontextprotocol.io/docs/specification/basic/transports',
      setupInstructions: [
        'Add Spring Web starter to `pom.xml` or `build.gradle`',
        'Create `@RestController` handling `POST /mcp` and `GET /.well-known/mcp/server-card.json`',
        'Annotate with `@CrossOrigin(origins = "*", exposedHeaders = "mcp-session-id")`',
        'Run: `./mvnw spring-boot:run`'
      ],
      codeSnippet: `// src/main/java/com/example/mcp/McpController.java
package com.example.mcp;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.*;

@RestController
@CrossOrigin(origins = "*", exposedHeaders = "mcp-session-id")
public class McpController {

    @GetMapping("/.well-known/mcp/server-card.json")
    public Map<String, Object> getServerCard() {
        return Map.of(
            "serverInfo", Map.of("name", "spring-boot-web-mcp", "version", "1.0.0"),
            "transport", "streamable-http",
            "endpoints", Map.of("mcp", "/mcp")
        );
    }

    @PostMapping("/mcp")
    public ResponseEntity<Map<String, Object>> handleMcp(@RequestBody Map<String, Object> payload) {
        String method = (String) payload.getOrDefault("method", "");
        Object id = payload.get("id");

        if ("tools/list".equals(method)) {
            Map<String, Object> tool = Map.of(
                "name", "query_spring_data",
                "description", "Query Spring Boot enterprise backend entities",
                "inputSchema", Map.of("type", "object")
            );
            return ResponseEntity.ok(Map.of(
                "jsonrpc", "2.0",
                "id", id,
                "result", Map.of("tools", List.of(tool))
            ));
        }

        return ResponseEntity.status(404).body(Map.of(
            "jsonrpc", "2.0",
            "id", id,
            "error", Map.of("code", -32601, "message", "Method not found")
        ));
    }
}`
    },
    'ruby-rails': {
      language: 'Ruby',
      framework: 'Ruby on Rails 7 / 8',
      packageName: 'rails',
      fileLocation: 'app/controllers/mcp_controller.rb',
      transportType: 'Streamable HTTP',
      officialSpecRef: 'https://modelcontextprotocol.io/docs/specification/basic/transports',
      setupInstructions: [
        'Add route in `config/routes.rb`: `match "/mcp", to: "mcp#handle", via: [:get, :post, :options]`',
        'Create `app/controllers/mcp_controller.rb` with JSON-RPC handlers',
        'Add `<link rel="mcp-server" href="/mcp" />` in `app/views/layouts/application.html.erb`',
        'Start Rails server: `bin/rails server`'
      ],
      codeSnippet: `# app/controllers/mcp_controller.rb
class McpController < ApplicationController
  skip_before_action :verify_authenticity_token

  def server_card
    render json: {
      serverInfo: { name: 'rails-web-mcp', version: '1.0.0' },
      transport: 'streamable-http',
      endpoints: { mcp: '/mcp' }
    }
  end

  def handle
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Expose-Headers'] = 'mcp-session-id'

    if request.options?
      response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
      response.headers['Access-Control-Allow-Headers'] = 'Content-Type, mcp-session-id'
      head :ok and return
    end

    payload = JSON.parse(request.raw_post) rescue {}
    method = payload['method']
    id = payload['id']

    if method == 'tools/list'
      render json: {
        jsonrpc: '2.0',
        id: id,
        result: {
          tools: [
            {
              name: 'query_rails_catalog',
              description: 'Query database records via Rails ActiveRecord.',
              inputSchema: { type: 'object' }
            }
          ]
        }
      }
    else
      render json: { jsonrpc: '2.0', id: id, error: { code: -32601, message: 'Method not found' } }, status: 404
    end
  end
end`
    },
    'static-browser-dom': {
      language: 'Static HTML / JavaScript (JAMstack, Astro, Hugo, SvelteKit)',
      framework: 'W3C Agentic Web / Chromium document.modelContext',
      packageName: 'No build dependencies (Pure Native Web API)',
      fileLocation: 'public/webmcp.js',
      transportType: 'In-Browser DOM',
      officialSpecRef: 'https://modelcontextprotocol.io/docs/transports/streamable-http',
      setupInstructions: [
        'Include script tag in your HTML: `<script src="/webmcp.js"></script>`',
        'Add `<link rel="mcp-server" href="/mcp" />` and `llms.txt` in root',
        'Register browser interactive actions via `window.modelContext.registerTool({...})`',
        'AI browser extensions and devtools can invoke registered tools directly on client side.'
      ],
      codeSnippet: `<!-- In your HTML <head> or public/webmcp.js -->
<link rel="mcp-server" href="/mcp" />
<script>
(function() {
  if (typeof window === 'undefined') return;

  window.modelContext = window.modelContext || {
    tools: [],
    registerTool: function(toolDef) {
      this.tools.push(toolDef);
      console.log('[WebMCP] Registered in-browser tool:', toolDef.name);
    }
  };

  // Register client-side interactive actions for AI browsing agents
  window.modelContext.registerTool({
    name: 'filter_products_ui',
    description: 'Filter catalogue items and update DOM in real-time.',
    parameters: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: 'Keyword to search on the page' }
      },
      required: ['keyword']
    },
    execute: async function(args) {
      const searchBox = document.querySelector('input[type="search"], input[name="q"]');
      if (searchBox) {
        searchBox.value = args.keyword;
        searchBox.dispatchEvent(new Event('input', { bubbles: true }));
        return { status: 'success', message: 'Applied in-page search for ' + args.keyword };
      }
      return { status: 'error', message: 'Search box element not found' };
    }
  });
})();
</script>`
    }
  };
}

export async function testWebMcpSupport(
  targetUrl: string,
  pageData?: PageData,
  discovery?: ProjectDiscoveryResult,
  targetLanguage?: WebMcpLanguage
): Promise<WebMcpDetectionResult> {
  const normalizedUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
  const baseOrigin = new URL(normalizedUrl).origin;

  const detectedEndpoints: WebMcpDetectionResult['detectedEndpoints'] = {};
  const corsHeaders: WebMcpDetectionResult['corsHeaders'] = {};
  const diagnostics: WebMcpDiagnosticIssue[] = [];

  let isWebMcpEnabled = false;
  let discoveryMethod: WebMcpDetectionResult['discoveryMethod'] = undefined;
  let transportType: WebMcpDetectionResult['transportType'] = undefined;
  let serverInfo: WebMcpDetectionResult['serverInfo'] = undefined;
  const exposedTools: WebMcpToolDefinition[] = [];

  // 1. Check HTML for Client-Side Browser WebMCP (document.modelContext / webmcp.js)
  if (pageData?.rawHtml) {
    const scriptSrcMatches = Array.from(pageData.rawHtml.matchAll(/<script[^>]+src=["']([^"']+)["']/gi));
    const webMcpScriptSrc = scriptSrcMatches.find((m) => /webmcp|modelcontext/i.test(m[1] || ''))?.[1];

    let scriptContentToInspect = '';

    if (webMcpScriptSrc) {
      const absoluteScriptUrl = webMcpScriptSrc.startsWith('http')
        ? webMcpScriptSrc
        : `${baseOrigin}${webMcpScriptSrc.startsWith('/') ? '' : '/'}${webMcpScriptSrc}`;
      detectedEndpoints.clientScriptUrl = absoluteScriptUrl;
      try {
        const res = await fetch(absoluteScriptUrl, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          scriptContentToInspect = await res.text();
        }
      } catch {
        // Continue
      }
    }

    if (!scriptContentToInspect) {
      const inlineScripts = Array.from(pageData.rawHtml.matchAll(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi));
      const inlineMcp = inlineScripts.find((m) => /modelContext|registerTool|webmcp/i.test(m[1] || ''))?.[1];
      if (inlineMcp) {
        scriptContentToInspect = inlineMcp;
      }
    }

    if (scriptContentToInspect && /modelContext|registerTool/i.test(scriptContentToInspect)) {
      isWebMcpEnabled = true;
      discoveryMethod = 'client-side-browser-mcp';
      transportType = 'In-Browser DOM';
      serverInfo = {
        name: 'Browser WebMCP Client (W3C / Chromium document.modelContext)',
        transport: 'browser-dom (document.modelContext / window.webmcp)',
        description: 'Exposes client-side agentic browsing tools directly to AI-enabled browsers and DevTools.'
      };

      const toolMatches = Array.from(scriptContentToInspect.matchAll(/registerTool\s*\(\s*\{([\s\S]*?)\}\s*\)/gi));
      for (const tm of toolMatches) {
        const block = tm[1] || '';
        const nameMatch = block.match(/name\s*:\s*['"`]([^'"`]+)['"`]/i);
        const descMatch = block.match(/description\s*:\s*['"`]([^'"`]+)['"`]/i);
        if (nameMatch?.[1]) {
          exposedTools.push({
            name: nameMatch[1],
            description: descMatch?.[1] || 'Client-side WebMCP browser tool'
          });
        }
      }
    }

    // 1b. Check HTML for <link rel="mcp-server"> or <meta name="mcp-endpoint">
    const linkMatch = pageData.rawHtml.match(/<link[^>]+rel=["'](?:mcp-server|mcp)["'][^>]+href=["']([^"']+)["']/i);
    const metaMatch = pageData.rawHtml.match(
      /<meta[^>]+name=["'](?:mcp-endpoint|mcp-server)["'][^>]+content=["']([^"']+)["']/i
    );

    if (linkMatch?.[1] || metaMatch?.[1]) {
      const endpoint = linkMatch?.[1] || metaMatch?.[1];
      const absoluteEndpoint = endpoint?.startsWith('http')
        ? endpoint
        : `${baseOrigin}${endpoint?.startsWith('/') ? '' : '/'}${endpoint}`;
      detectedEndpoints.streamableEndpoint = absoluteEndpoint;
      isWebMcpEnabled = true;
      if (!discoveryMethod) discoveryMethod = 'html-meta-tag';
      diagnostics.push({
        checkName: 'HTML Discovery Tag',
        status: 'passed',
        title: 'HTML <link rel="mcp-server"> Discovered',
        description: `Website explicitly declares MCP endpoint \`${absoluteEndpoint}\` in <head>.`,
        fixAction: 'No action needed. Tag is properly configured.',
        officialDocReference: 'https://modelcontextprotocol.io/docs/transports/streamable-http'
      });
    } else {
      diagnostics.push({
        checkName: 'HTML Discovery Tag',
        status: 'warning',
        title: 'Missing <link rel="mcp-server"> in HTML <head>',
        description: 'AI browsers and crawlers cannot automatically discover your MCP endpoint from HTML.',
        fixAction: 'Add `<link rel="mcp-server" href="/mcp" />` inside your root layout HTML `<head>`.',
        officialDocReference: 'https://modelcontextprotocol.io/docs/transports/streamable-http'
      });
    }
  }

  // 2. Probe /.well-known/mcp/server-card.json and /.well-known/mcp.json (if not fully discovered)
  if (!isWebMcpEnabled) {
    const manifestUrlsToProbe = [
      `${baseOrigin}/.well-known/mcp/server-card.json`,
      `${baseOrigin}/.well-known/mcp.json`
    ];

    for (const mUrl of manifestUrlsToProbe) {
      if (!detectedEndpoints.manifestUrl) {
        try {
          const res = await fetch(mUrl, { method: 'GET', signal: AbortSignal.timeout(800) });
          if (res.ok) {
            const json = (await res.json()) as any;
            detectedEndpoints.manifestUrl = mUrl;
            isWebMcpEnabled = true;
            if (!discoveryMethod) discoveryMethod = 'well-known-manifest';
            serverInfo = {
              name: json.serverInfo?.name || json.name || json.server?.name,
              version: json.serverInfo?.version || json.version || json.server?.version,
              description: json.serverInfo?.description || json.description,
              transport: json.transport || 'streamable-http'
            };
            transportType = 'Streamable HTTP';
            if (json.endpoints?.mcp) {
              detectedEndpoints.streamableEndpoint = json.endpoints.mcp.startsWith('http')
                ? json.endpoints.mcp
                : `${baseOrigin}${json.endpoints.mcp}`;
            }
            if (json.endpoints?.sse) {
              detectedEndpoints.sseEndpoint = json.endpoints.sse.startsWith('http')
                ? json.endpoints.sse
                : `${baseOrigin}${json.endpoints.sse}`;
            }
            if (Array.isArray(json.tools)) {
              json.tools.forEach((t: any) => {
                exposedTools.push({
                  name: t.name,
                  description: t.description,
                  parameters: t.parameters || t.inputSchema
                });
              });
            }
            diagnostics.push({
              checkName: 'Well-Known Server Card',
              status: 'passed',
              title: `Discovered Server Card at \`${mUrl}\``,
              description: `Exposed ${exposedTools.length} tool(s) via standard discovery manifest.`,
              fixAction: 'No action needed. Manifest is active.',
              officialDocReference: 'https://modelcontextprotocol.io/docs/transports/streamable-http'
            });
            break;
          }
        } catch {
          // Continue
        }
      }
    }
  }

  if (!detectedEndpoints.manifestUrl) {
    diagnostics.push({
      checkName: 'Well-Known Server Card',
      status: 'warning',
      title: 'Missing /.well-known/mcp/server-card.json',
      description: 'Directory platforms (Smithery, MCP registries) require server-card.json for instant one-click registration.',
      fixAction: 'Create `public/.well-known/mcp/server-card.json` containing serverInfo, tools, and endpoints.',
      officialDocReference: 'https://modelcontextprotocol.io/docs/transports/streamable-http'
    });
  }

  // 3. Probe Streamable HTTP /mcp or /api/mcp endpoint (if not already found)
  if (!detectedEndpoints.streamableEndpoint) {
    const streamableEndpointsToProbe = [`${baseOrigin}/mcp`, `${baseOrigin}/api/mcp`];
    for (const ep of streamableEndpointsToProbe) {
      if (!detectedEndpoints.streamableEndpoint) {
        try {
          const res = await fetch(ep, {
            method: 'OPTIONS',
            headers: { 'Access-Control-Request-Method': 'POST' },
            signal: AbortSignal.timeout(800)
          });
          if (res.ok || res.status === 204 || res.status === 200) {
            detectedEndpoints.streamableEndpoint = ep;
            isWebMcpEnabled = true;
            transportType = 'Streamable HTTP';
            if (!discoveryMethod) discoveryMethod = 'streamable-http';
            corsHeaders.allowOrigin = res.headers.get('access-control-allow-origin') || undefined;
            corsHeaders.allowMethods = res.headers.get('access-control-allow-methods') || undefined;
            corsHeaders.allowHeaders = res.headers.get('access-control-allow-headers') || undefined;
            corsHeaders.exposeHeaders = res.headers.get('access-control-expose-headers') || undefined;
            break;
          }
        } catch {
          // Continue
        }
      }
    }
  }

  // 4. Probe Legacy SSE (/sse) (if not already found)
  if (!detectedEndpoints.sseEndpoint && !detectedEndpoints.streamableEndpoint) {
    try {
      const sseUrl = `${baseOrigin}/sse`;
      const res = await fetch(sseUrl, {
        method: 'GET',
        headers: { Accept: 'text/event-stream' },
        signal: AbortSignal.timeout(800)
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && (contentType.includes('text/event-stream') || res.status === 200)) {
        detectedEndpoints.sseEndpoint = sseUrl;
        detectedEndpoints.messageEndpoint = `${baseOrigin}/message`;
        isWebMcpEnabled = true;
        transportType = 'HTTP + SSE';
        if (!discoveryMethod) discoveryMethod = 'sse-endpoint';
        serverInfo = {
          name: `${new URL(baseOrigin).hostname}-mcp`,
          transport: 'sse'
        };
      }
    } catch {
      // Continue
    }
  }

  // 5. Probe llms.txt (quick timeout)
  let llmsTxtExists = false;
  let llmsTxtUrl: string | undefined;
  try {
    const checkUrl = `${baseOrigin}/llms.txt`;
    const res = await fetch(checkUrl, { method: 'GET', signal: AbortSignal.timeout(800) });
    if (res.ok) {
      llmsTxtExists = true;
      llmsTxtUrl = checkUrl;
      diagnostics.push({
        checkName: 'llms.txt AI Grounding',
        status: 'passed',
        title: 'llms.txt Present at Domain Root',
        description: `Found active \`${checkUrl}\` providing grounding context for LLM crawlers.`,
        fixAction: 'Ensure link to your MCP endpoint is included in llms.txt.',
        officialDocReference: 'https://llmstxt.org'
      });
    } else {
      diagnostics.push({
        checkName: 'llms.txt AI Grounding',
        status: 'warning',
        title: 'Missing llms.txt at Domain Root',
        description: 'AI search engines (Perplexity, ChatGPT Search, Gemini) rely on llms.txt to discover capabilities.',
        fixAction: 'Create `public/llms.txt` with brief markdown summary and link to your `/mcp` endpoint.',
        officialDocReference: 'https://llmstxt.org'
      });
    }
  } catch {
    // llms.txt not present
  }


  // 6. Evaluate CORS & Security Diagnostics
  if (isWebMcpEnabled) {
    if (corsHeaders.allowOrigin === '*' || corsHeaders.allowOrigin) {
      diagnostics.push({
        checkName: 'CORS Configuration',
        status: 'passed',
        title: 'CORS Headers Enabled for Web Clients',
        description: `Access-Control-Allow-Origin is set to \`${corsHeaders.allowOrigin}\`.`,
        fixAction: 'Ensure `Access-Control-Expose-Headers: mcp-session-id` is also returned.',
        officialDocReference: 'https://modelcontextprotocol.io/docs/transports/streamable-http'
      });
    } else {
      diagnostics.push({
        checkName: 'CORS Configuration',
        status: 'warning',
        title: 'CORS Headers Unverified or Restricted',
        description: 'Remote browser agents may be blocked if CORS headers do not permit external origins.',
        fixAction: 'Configure `Access-Control-Allow-Origin: *` and expose `mcp-session-id`.',
        officialDocReference: 'https://modelcontextprotocol.io/docs/transports/streamable-http'
      });
    }
  } else {
    diagnostics.push({
      checkName: 'WebMCP Protocol Support',
      status: 'failed',
      title: 'No WebMCP Transport Detected',
      description: 'Neither Streamable HTTP (/mcp), Legacy SSE (/sse), nor client-side WebMCP DOM tools were detected.',
      fixAction: 'Implement a Streamable HTTP endpoint or in-browser client script using the guides below.',
      officialDocReference: 'https://modelcontextprotocol.io/docs/transports/streamable-http'
    });
  }

  const languageBlueprints = getMultiLanguageBlueprints();
  const selectedBlueprintKey = targetLanguage && languageBlueprints[targetLanguage]
    ? targetLanguage
    : (discovery?.framework === 'laravel' ? 'php-laravel' : 'nextjs-app');

  const selectedBlueprint =
    languageBlueprints[selectedBlueprintKey] ||
    languageBlueprints['nextjs-app'] ||
    languageBlueprints['typescript-node'];

  const stepsToEnable = [
    `1. Set up the Streamable HTTP transport endpoint for ${selectedBlueprint?.framework || 'Next.js'} at \`${selectedBlueprint?.fileLocation || 'app/api/mcp/route.ts'}\`.`,
    '2. Register read-only site discovery and search tools for AI agents.',
    '3. Create `public/.well-known/mcp/server-card.json` for registry discovery.',
    '4. Add `<link rel="mcp-server" href="/mcp" />` into your root HTML `<head>`.',
    '5. Create `public/llms.txt` referencing your website capabilities and MCP endpoints.'
  ];


  const activeEndpointLabel =
    detectedEndpoints.streamableEndpoint ||
    detectedEndpoints.sseEndpoint ||
    detectedEndpoints.clientScriptUrl ||
    'Browser DOM (document.modelContext)';

  const recommendations: string[] = isWebMcpEnabled
    ? [
        `✅ Web MCP is active on \`${activeEndpointLabel}\` with ${exposedTools.length} exposed tool(s)! AI agents can interact with your website live.`,
        'Ensure CORS headers (`Access-Control-Allow-Origin: *`) and `mcp-session-id` exposure are configured on all production domains.',
        llmsTxtExists
          ? '✅ `llms.txt` is present and active for AI search engines.'
          : '⚠️ Add `/llms.txt` to help AI search engines index your tools automatically.'
      ]
    : [
        '🔴 Web MCP is not yet active on this website.',
        'Enabling Web MCP allows AI agents (ChatGPT, Claude, Cursor, Antigravity, Perplexity) to search inventory, query articles, and execute workflows directly on your website.',
        `Deploy the ${selectedBlueprint?.framework || 'Next.js'} blueprint below to achieve full WebMCP compliance in under 5 minutes.`
      ];

  return {
    targetUrl,
    timestamp: new Date().toISOString(),
    isWebMcpEnabled,
    discoveryMethod,
    transportType: transportType || (isWebMcpEnabled ? 'Streamable HTTP' : 'Unknown'),
    detectedEndpoints,
    corsHeaders: Object.keys(corsHeaders).length > 0 ? corsHeaders : undefined,
    serverInfo,
    exposedTools,
    llmsTxtStatus: {
      exists: llmsTxtExists,
      url: llmsTxtUrl
    },
    diagnostics,
    languageBlueprints,
    enablementGuide: {
      recommendedSnippet: selectedBlueprint?.codeSnippet || '',
      stepsToEnable
    },
    recommendations
  };

}

export function formatWebMcpTestToMarkdown(
  result: WebMcpDetectionResult,
  targetLanguage?: WebMcpLanguage
): string {
  const statusBadge = result.isWebMcpEnabled
    ? '🟢 **WEB MCP ACTIVE & COMPLIANT**'
    : '🔴 **WEB MCP NOT DETECTED**';

  let toolsTable = '';
  if (result.exposedTools.length > 0) {
    toolsTable = `
### 🛠️ Exposed Web MCP Tools (${result.exposedTools.length})

| Tool Name | Description | Parameters |
| :--- | :--- | :--- |
${result.exposedTools
  .map(
    (t) =>
      `| \`${t.name}\` | ${t.description || 'No description provided.'} | \`${JSON.stringify(t.parameters || {})}\` |`
  )
  .join('\n')}
`;
  } else if (result.isWebMcpEnabled) {
    toolsTable = `
### 🛠️ Exposed Web MCP Tools
*Server detected on transport \`${result.transportType}\`. Tools are negotiated dynamically during handshake.*
`;
  }

  const diagnosticsTable = `
### 🩺 Protocol Compliance & Diagnostic Scorecard

| Check Name | Status | Diagnostic Summary | Fix Action |
| :--- | :---: | :--- | :--- |
${result.diagnostics
  .map((d) => {
    const icon = d.status === 'passed' ? '🟢' : d.status === 'warning' ? '🟡' : '🔴';
    return `| **${d.checkName}** | ${icon} \`${d.status.toUpperCase()}\` | ${d.description} | ${d.fixAction} |`;
  })
  .join('\n')}
`;

  // Format language snippets
  const allBlueprints = result.languageBlueprints;
  let codeSections = '';

  if (targetLanguage && targetLanguage !== 'all' && allBlueprints[targetLanguage]) {
    const bp = allBlueprints[targetLanguage];
    codeSections = `
### 🚀 Implementation Blueprint: ${bp.framework} (${bp.language})
* **Official Spec:** [${bp.officialSpecRef}](${bp.officialSpecRef})
* **Primary Target File:** \`${bp.fileLocation}\`
* **Transport Standard:** \`${bp.transportType}\`

#### Setup Steps:
${bp.setupInstructions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

#### Production Code:
\`\`\`${bp.language.toLowerCase().includes('python') ? 'python' : bp.language.toLowerCase().includes('php') ? 'php' : bp.language.toLowerCase().includes('go') ? 'go' : bp.language.toLowerCase().includes('rust') ? 'rust' : bp.language.toLowerCase().includes('c#') ? 'csharp' : bp.language.toLowerCase().includes('java') ? 'java' : bp.language.toLowerCase().includes('ruby') ? 'ruby' : 'typescript'}
${bp.codeSnippet}
\`\`\`
`;
  } else {
    // Show top major blueprints in readable tabs/sections
    const keysToShow = ['nextjs-app', 'typescript-node', 'python-fastapi', 'php-laravel', 'go', 'rust', 'csharp-dotnet', 'static-browser-dom'];
    codeSections = `
### 🌐 Multi-Language Implementation Blueprints (Official Standards)

${keysToShow
  .map((k) => allBlueprints[k])
  .filter((bp): bp is NonNullable<typeof bp> => Boolean(bp))
  .map((bp) => {
    const lang = bp.language.toLowerCase().includes('python')
      ? 'python'
      : bp.language.toLowerCase().includes('php')
      ? 'php'
      : bp.language.toLowerCase().includes('go')
      ? 'go'
      : bp.language.toLowerCase().includes('rust')
      ? 'rust'
      : bp.language.toLowerCase().includes('c#')
      ? 'csharp'
      : bp.language.toLowerCase().includes('java')
      ? 'java'
      : bp.language.toLowerCase().includes('ruby')
      ? 'ruby'
      : bp.language.toLowerCase().includes('html')
      ? 'html'
      : 'typescript';

    return `#### 📦 ${bp.framework} (${bp.language})
* **Transport:** \`${bp.transportType}\` | **File:** \`${bp.fileLocation}\`
\`\`\`${lang}
${bp.codeSnippet}
\`\`\`
`;
  })
  .join('\n')}
`;
  }


  return `# 🌐 WebMCP Live Audit, Diagnostics & Implementation Strategy

**Target URL:** \`${result.targetUrl}\`  
**Analyzed At:** ${result.timestamp}  
**Status:** ${statusBadge}  
**Transport Standard:** \`${result.transportType || 'Not Detected'}\`  
${result.discoveryMethod ? `**Discovery Method:** \`${result.discoveryMethod}\`  ` : ''}

---

## 📡 Detected MCP Endpoints & Manifests

* **Streamable HTTP Endpoint (/mcp):** ${result.detectedEndpoints.streamableEndpoint ? `\`${result.detectedEndpoints.streamableEndpoint}\`` : '*Not detected*'}
* **Legacy SSE Endpoint (/sse):** ${result.detectedEndpoints.sseEndpoint ? `\`${result.detectedEndpoints.sseEndpoint}\`` : '*Not detected*'}
* **Discovery Manifest:** ${result.detectedEndpoints.manifestUrl ? `\`${result.detectedEndpoints.manifestUrl}\`` : '*Not detected*'}
* **llms.txt AI Grounding:** ${result.llmsTxtStatus.exists ? `🟢 Found at \`${result.llmsTxtStatus.url}\`` : '🔴 *Missing*'}
* **Client Script (Browser DOM):** ${result.detectedEndpoints.clientScriptUrl ? `\`${result.detectedEndpoints.clientScriptUrl}\`` : '*Not detected*'}

${result.serverInfo ? `
---

## ℹ️ Server Identity & Capabilities
* **Server Name:** \`${result.serverInfo.name || 'Unknown'}\`
* **Version:** \`${result.serverInfo.version || '1.0.0'}\`
* **Transport:** \`${result.serverInfo.transport || 'streamable-http'}\`
* **Description:** ${result.serverInfo.description || 'N/A'}
` : ''}
${toolsTable}
---

${diagnosticsTable}

---

## 📋 Recommendations & Strategic Impact

${result.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

---

${codeSections}

---

## 🛡️ WebMCP Production Security Checklist (Official Guidelines)

1. **Origin Header Validation:** Check \`req.headers.origin\` against permitted hostnames to prevent DNS rebinding attacks on internal/localhost servers.
2. **CORS Headers:** Always return \`Access-Control-Allow-Origin: *\` and \`Access-Control-Expose-Headers: mcp-session-id\`.
3. **Session Management:** Generate cryptographically secure UUID v4 session identifiers for multi-turn conversational tool execution.
4. **Standard Error Codes:** Strictly return JSON-RPC 2.0 error objects with standard error codes (\`-32700 Parse error\`, \`-32600 Invalid request\`, \`-32601 Method not found\`, \`-32602 Invalid params\`).
`;
}

