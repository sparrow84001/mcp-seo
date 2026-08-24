import type { PageData, ProjectDiscoveryResult } from '../types/index.ts';

export interface WebMcpToolDefinition {
  name: string;
  description?: string;
  parameters?: Record<string, any>;
}

export interface WebMcpDetectionResult {
  targetUrl: string;
  timestamp: string;
  isWebMcpEnabled: boolean;
  discoveryMethod?: 'well-known-manifest' | 'sse-endpoint' | 'html-meta-tag' | 'api-route' | 'client-side-browser-mcp';
  detectedEndpoints: {
    sseEndpoint?: string;
    messageEndpoint?: string;
    manifestUrl?: string;
    infoEndpoint?: string;
    clientScriptUrl?: string;
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
  enablementGuide: {
    recommendedSnippet: string;
    stepsToEnable: string[];
  };
  recommendations: string[];
}

export async function testWebMcpSupport(
  targetUrl: string,
  pageData?: PageData,
  discovery?: ProjectDiscoveryResult
): Promise<WebMcpDetectionResult> {
  const normalizedUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
  const baseOrigin = new URL(normalizedUrl).origin;

  const detectedEndpoints: WebMcpDetectionResult['detectedEndpoints'] = {};
  let isWebMcpEnabled = false;
  let discoveryMethod: WebMcpDetectionResult['discoveryMethod'] = undefined;
  let serverInfo: WebMcpDetectionResult['serverInfo'] = undefined;
  const exposedTools: WebMcpToolDefinition[] = [];

  // 1. Check HTML for Client-Side Browser WebMCP (W3C / Chromium document.modelContext / webmcp.js)
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

    // Also check inline scripts
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
      serverInfo = {
        name: 'Browser WebMCP Client (W3C / Chromium document.modelContext)',
        transport: 'browser-dom (document.modelContext / window.webmcp)',
        description: 'Exposes client-side agentic browsing tools directly to AI-enabled browsers and DevTools.'
      };

      // Extract tool registrations
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
    const metaMatch = pageData.rawHtml.match(/<meta[^>]+name=["'](?:mcp-endpoint|mcp-server)["'][^>]+content=["']([^"']+)["']/i);

    if (linkMatch?.[1] || metaMatch?.[1]) {
      const endpoint = linkMatch?.[1] || metaMatch?.[1];
      const absoluteEndpoint = endpoint?.startsWith('http')
        ? endpoint
        : `${baseOrigin}${endpoint?.startsWith('/') ? '' : '/'}${endpoint}`;
      detectedEndpoints.sseEndpoint = absoluteEndpoint;
      isWebMcpEnabled = true;
      if (!discoveryMethod) discoveryMethod = 'html-meta-tag';
    }
  }

  // 2. Probe /.well-known/mcp.json
  if (!isWebMcpEnabled) {
    try {
      const wellKnownUrl = `${baseOrigin}/.well-known/mcp.json`;
      const res = await fetch(wellKnownUrl, { method: 'GET', signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const json = await res.json() as any;
        detectedEndpoints.manifestUrl = wellKnownUrl;
        isWebMcpEnabled = true;
        discoveryMethod = 'well-known-manifest';
        serverInfo = {
          name: json.name || json.server?.name,
          version: json.version || json.server?.version,
          description: json.description,
          transport: json.transport || 'sse'
        };
        if (json.endpoints?.sse) {
          detectedEndpoints.sseEndpoint = json.endpoints.sse.startsWith('http') ? json.endpoints.sse : `${baseOrigin}${json.endpoints.sse}`;
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
      }
    } catch {
      // Endpoint not present
    }
  }

  // 3. Probe /info or /health
  if (!isWebMcpEnabled) {
    try {
      const infoUrl = `${baseOrigin}/info`;
      const res = await fetch(infoUrl, { method: 'GET', signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const json = await res.json() as any;
        if (json.transport === 'sse' || json.endpoints?.sse || json.name?.includes('mcp')) {
          detectedEndpoints.infoEndpoint = infoUrl;
          detectedEndpoints.sseEndpoint = json.endpoints?.sse ? (json.endpoints.sse.startsWith('http') ? json.endpoints.sse : `${baseOrigin}${json.endpoints.sse}`) : `${baseOrigin}/sse`;
          detectedEndpoints.messageEndpoint = json.endpoints?.message ? (json.endpoints.message.startsWith('http') ? json.endpoints.message : `${baseOrigin}${json.endpoints.message}`) : `${baseOrigin}/message`;
          isWebMcpEnabled = true;
          discoveryMethod = 'api-route';
          serverInfo = {
            name: json.name,
            version: json.version,
            description: json.description,
            transport: json.transport || 'sse'
          };
        }
      }
    } catch {
      // Endpoint not present
    }
  }

  // 4. Probe /sse directly
  if (!isWebMcpEnabled) {
    try {
      const sseUrl = `${baseOrigin}/sse`;
      const res = await fetch(sseUrl, { method: 'GET', headers: { Accept: 'text/event-stream' }, signal: AbortSignal.timeout(3000) });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && (contentType.includes('text/event-stream') || res.status === 200)) {
        detectedEndpoints.sseEndpoint = sseUrl;
        detectedEndpoints.messageEndpoint = `${baseOrigin}/message`;
        isWebMcpEnabled = true;
        discoveryMethod = 'sse-endpoint';
        serverInfo = {
          name: `${new URL(baseOrigin).hostname}-mcp`,
          transport: 'sse'
        };
      }
    } catch {
      // SSE not present
    }
  }

  // 5. Probe llms.txt
  let llmsTxtExists = false;
  let llmsTxtUrl: string | undefined;
  try {
    const checkUrl = `${baseOrigin}/llms.txt`;
    const res = await fetch(checkUrl, { method: 'GET', signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      llmsTxtExists = true;
      llmsTxtUrl = checkUrl;
    }
  } catch {
    // llms.txt not present
  }

  const stepsToEnable = [
    'Add an SSE endpoint (e.g. `GET /api/mcp/sse`) on your web server to stream real-time JSON-RPC events.',
    'Add a message endpoint (e.g. `POST /api/mcp/message`) to receive tool execution requests.',
    'Add a discovery manifest at `/.well-known/mcp.json` declaring your exposed tools and capabilities.',
    'Add `<link rel="mcp-server" href="/api/mcp/sse" />` to your website HTML `<head>`.',
    'Deploy and link `llms.txt` in the root of your domain for automated AI agent discovery.'
  ];

  const recommendedSnippet = `// Next.js (App Router) / Node / Express Web MCP Endpoint Snippet
// In app/api/mcp/route.ts or server.ts:

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // SSE connection endpoint for Web AI agents
  const responseStream = new TransformStream();
  // Return SSE stream response
  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    }
  });
}`;

  const activeEndpointLabel =
    detectedEndpoints.sseEndpoint ||
    detectedEndpoints.clientScriptUrl ||
    'Browser DOM (document.modelContext)';

  const recommendations: string[] = isWebMcpEnabled
    ? [
        `✅ Web MCP is active on \`${activeEndpointLabel}\` with ${exposedTools.length} exposed tool(s)! AI browsing agents can interact with your website live.`,
        'Ensure CORS headers (`Access-Control-Allow-Origin: *`) are configured for any API backends.',
        llmsTxtExists ? '✅ `llms.txt` is present and active for AI search engines.' : '⚠️ Add `/llms.txt` to help AI search engines index your tools automatically.'
      ]
    : [
        '⚠️ Web MCP is not yet detected on this website.',
        'Enabling Web MCP allows AI agents (ChatGPT, Claude, Cursor, Antigravity) to query your live website data, search products, or execute actions directly.',
        'Follow the enablement guide below to activate Web MCP on your domain in less than 5 minutes.'
      ];

  return {
    targetUrl,
    timestamp: new Date().toISOString(),
    isWebMcpEnabled,
    discoveryMethod,
    detectedEndpoints,
    serverInfo,
    exposedTools,
    llmsTxtStatus: {
      exists: llmsTxtExists,
      url: llmsTxtUrl
    },
    enablementGuide: {
      recommendedSnippet,
      stepsToEnable
    },
    recommendations
  };
}

export function formatWebMcpTestToMarkdown(result: WebMcpDetectionResult): string {
  const statusBadge = result.isWebMcpEnabled
    ? '🟢 **WEB MCP ACTIVE & ENABLED**'
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
* *Server detected over SSE stream (${result.detectedEndpoints.sseEndpoint}). Tools are negotiated during client handshake.*
`;
  }

  return `# 🌐 Live Website Web MCP Audit & Verification

**Target URL:** \`${result.targetUrl}\`  
**Analyzed At:** ${result.timestamp}  
**Status:** ${statusBadge}  
${result.discoveryMethod ? `**Discovery Method:** \`${result.discoveryMethod}\`` : ''}

---

## 📡 Detected MCP Endpoints

* **SSE Stream Endpoint:** ${result.detectedEndpoints.sseEndpoint ? `\`${result.detectedEndpoints.sseEndpoint}\`` : '*Not detected*'}
* **Message Endpoint:** ${result.detectedEndpoints.messageEndpoint ? `\`${result.detectedEndpoints.messageEndpoint}\`` : '*Not detected*'}
* **Discovery Manifest:** ${result.detectedEndpoints.manifestUrl ? `\`${result.detectedEndpoints.manifestUrl}\`` : '*Not detected*'}
* **Info Endpoint:** ${result.detectedEndpoints.infoEndpoint ? `\`${result.detectedEndpoints.infoEndpoint}\`` : '*Not detected*'}
* **LLMs.txt Discovery:** ${result.llmsTxtStatus.exists ? `🟢 Found at \`${result.llmsTxtStatus.url}\`` : '🔴 *Missing*'}

${result.serverInfo ? `
---

## ℹ️ Server Identity & Specs
* **Server Name:** \`${result.serverInfo.name || 'Unknown'}\`
* **Version:** \`${result.serverInfo.version || '1.0.0'}\`
* **Transport:** \`${result.serverInfo.transport || 'sse'}\`
* **Description:** ${result.serverInfo.description || 'N/A'}
` : ''}
${toolsTable}
---

## 📋 Recommendations & Next Steps

${result.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

---

## 🚀 How to Enable Web MCP on Your Website (If Not Enabled)

${result.enablementGuide.stepsToEnable.map((s, i) => `### Step ${i + 1}: ${s}`).join('\n\n')}

### Quick Implementation Code Snippet:
\`\`\`typescript
${result.enablementGuide.recommendedSnippet}
\`\`\`
`;
}
