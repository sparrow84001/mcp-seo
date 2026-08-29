#!/usr/bin/env bun
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

import { discoverProject } from './analyzer/discovery.ts';
import { crawlUrlOrFile } from './analyzer/crawler.ts';
import { auditTechnicalSeo } from './analyzer/technical.ts';
import { auditOnPageSeo } from './analyzer/onpage.ts';
import { auditAeo } from './analyzer/aeo.ts';
import { auditGeo } from './analyzer/geo.ts';
import { auditLocalSeo } from './analyzer/local.ts';
import { evaluateContentQuality } from './analyzer/content.ts';
import { auditConversion } from './analyzer/conversion.ts';
import { auditPerformanceRisks } from './analyzer/performance.ts';
import { auditSchema } from './analyzer/schema.ts';
import { auditInternalLinks } from './analyzer/internal-links.ts';
import { generateAuditReport, formatReportToMarkdown } from './analyzer/report.ts';
import { generateMarketingStrategy, formatMarketingStrategyToMarkdown } from './analyzer/strategy.ts';
import { suggestRelatedEcosystem, formatEcosystemToMarkdown } from './analyzer/ecosystem.ts';
import { testWebMcpSupport, formatWebMcpTestToMarkdown } from './analyzer/web-mcp-detector.ts';
import {
  auditSitemapMultipage,
  fetchAndParseRobotsTxt,
  fetchAndParseSitemap,
  auditSecurityHeaders,
  generateSitemapXml,
  generateRobotsTxt,
  formatMultipageReportToMarkdown
} from './analyzer/sitemap-crawler.ts';
import { generateCodeFix } from './fixer/code-fixer.ts';
import { validateCodeFix } from './fixer/validator.ts';
import type { AuditIssue, ProjectDiscoveryResult } from './types/index.ts';


// Initialize McpServer
const server = new McpServer({
  name: 'mcp-seo',
  version: '1.0.4'
});

// ==========================================
// 1. REGISTER PROMPTS (registerPrompt)
// ==========================================

server.registerPrompt(
  'seo_full_audit',
  {
    description: 'Execute a full 12-step SEO, AEO, GEO, Local, Content, Technical & Conversion audit on a codebase or URL.',
    argsSchema: {
      target: z.string().describe('Directory path to the website codebase or a live URL (https://...) to audit.')
    }
  },
  ({ target }) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please run a full SEO, AEO, GEO, Local SEO, Content, Technical, Conversion & Performance audit for target: "${target}".
Follow the strict workflow:
1. Discover project architecture and frameworks.
2. Crawl and extract page structure and metadata.
3. Audit all 8 dimensions with confirmed/inferred evidence.
4. Calculate 0-100 scores and P0-P3 prioritized action items.
5. Provide actionable code recommendations before applying any fixes.`
          }
        }
      ]
    };
  }
);

server.registerPrompt(
  'seo_code_fix_workflow',
  {
    description: 'Guide through safe, surgical code fixes with diff previews and validation.',
    argsSchema: {
      filePath: z.string().describe('Path to the source code file to fix.'),
      issueType: z.string().describe('Type of issue to fix (e.g., missing_title, missing_canonical, add_faq_schema, local_business_schema).')
    }
  },
  ({ filePath, issueType }) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please generate a safe code fix for "${filePath}" addressing "${issueType}".
Show the unified diff preview first, explain risks, and validate with seo_validate_code_fix once applied.`
          }
        }
      ]
    };
  }
);

server.registerPrompt(
  'aeo_geo_optimization',
  {
    description: 'Audit and optimize content for AI Answer Engines (Perplexity, ChatGPT, AI Overviews) and LLM discovery (llms.txt).',
    argsSchema: {
      target: z.string().describe('Path or URL of the target page.')
    }
  },
  ({ target }) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Perform an in-depth Answer Engine Optimization (AEO) and Generative Engine Optimization (GEO) audit on "${target}". Evaluate direct answers, FAQ schema, knowledge graphs, and llms.txt.`
          }
        }
      ]
    };
  }
);

server.registerPrompt(
  'local_seo_boost',
  {
    description: 'Audit and optimize local landing pages, NAP consistency, and LocalBusiness schema for map pack rankings.',
    argsSchema: {
      target: z.string().describe('Target location page or project root.')
    }
  },
  ({ target }) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Run a dedicated Local & Area SEO audit for "${target}". Analyze LocalBusiness JSON-LD, NAP consistency, phone click-to-call, and duplicate city pages.`
          }
        }
      ]
    };
  }
);

server.registerPrompt(
  'digital_marketing_growth_strategy',
  {
    description: 'Synthesizes audit findings into a high-impact digital marketing growth blueprint with CRO levers, AI answer engine tactics, audience mapping, and a 30-60-90 day execution roadmap.',
    argsSchema: {
      target: z.string().describe('Directory path to the website codebase or a live URL (https://...) to formulate strategy for.')
    }
  },
  ({ target }) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please formulate a comprehensive Digital Marketing Strategy & Growth Blueprint for "${target}".
Focus on:
1. Search intent and funnel stage classification (ToFu, MoFu, BoFu).
2. Conversion Rate Optimization (CRO) with CTA clarity, friction reduction, and social proof.
3. Answer Engine Optimization (AEO) and AI Overview capture blueprint.
4. Prioritized 30-60-90 day execution roadmap with projected KPI growth.`
          }
        }
      ]
    };
  }
);

server.registerPrompt(
  'related_ecosystem_and_competitor_analysis',
  {
    description: 'Analyze industry vertical, infer competitor archetypes, identify high-authority backlink/directory targets, and build keyword topic clusters for a project.',
    argsSchema: {
      target: z.string().describe('Directory path to the website codebase or a live URL (https://...) to analyze.')
    }
  },
  ({ target }) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please analyze the target project "${target}" to discover its related web ecosystem:
1. Infer its exact industry vertical, niche, and target audience model.
2. Provide competitor benchmarks and differentiation strategies.
3. Recommend top directory submission platforms and citation targets.
4. Generate high-converting keyword topic clusters and content angles.
5. Advise on Schema.org Knowledge Graph entity connections for AI search discovery.`
          }
        }
      ]
    };
  }
);

server.registerPrompt(
  'webmcp_implementation_and_fix',
  {
    description: 'Diagnose WebMCP support, inspect protocol compliance (Streamable HTTP, SSE, CORS, DNS rebinding security), and generate production-ready code fixes for any programming language or framework.',
    argsSchema: {
      target: z.string().describe('Website URL or local codebase root.'),
      language: z.enum([
        'typescript-node',
        'nextjs-app',
        'nextjs-pages',
        'python-fastapi',
        'php-laravel',
        'go',
        'rust',
        'csharp-dotnet',
        'java-spring',
        'ruby-rails',
        'static-browser-dom',
        'all'
      ]).optional().describe('Target programming language or framework.')
    }
  },
  ({ target, language }) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please diagnose WebMCP support for target "${target}"${language ? ` focusing on ${language}` : ''}.
1. Check for Streamable HTTP (/mcp), Legacy SSE (/sse), and discovery manifests (/.well-known/mcp/server-card.json, llms.txt, <link rel="mcp-server">).
2. Audit CORS headers (Access-Control-Allow-Origin, mcp-session-id exposure) and origin validation security.
3. Provide exact production code snippets and step-by-step fix guides to achieve full WebMCP compliance.`
          }
        }
      ]
    };
  }
);

server.registerPrompt(
  'multipage_sitemap_and_security_audit',
  {
    description: 'Run a comprehensive site-wide multi-page crawl using sitemap.xml, check robots.txt allow/disallow permissions for Googlebot and AI search crawlers, audit HTTP security headers (HSTS, CSP), and generate site-wide remediation plans.',
    argsSchema: {
      target: z.string().describe('Target website URL (https://...) or local project codebase folder path.')
    }
  },
  ({ target }) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please run a comprehensive multi-page sitemap crawl and security audit for target: "${target}".
1. Inspect robots.txt allow and disallow rules for Googlebot and AI crawlers (GPTBot, ClaudeBot, PerplexityBot).
2. Parse sitemap.xml and all sub-sitemaps to extract all registered URLs.
3. Check HTTP security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options).
4. Batch audit registered pages for SEO, AEO, GEO, CRO, and WebMCP.
5. Aggregate site-wide deficits and generate fix files if sitemap.xml or robots.txt is missing.`
          }
        }
      ]
    };
  }
);



// ==========================================
// 2. REGISTER TOOLS (registerTool)
// ==========================================

server.registerTool(
  'seo_discover_project',
  {
    description: 'Discovers website framework (Laravel, Next.js App/Pages, Nuxt, Astro, Raw PHP, HTML), routes, sitemaps, robots.txt, llms.txt, and page inventory.',
    inputSchema: {
      projectPath: z.string().describe('Absolute or relative path to project root directory.')
    }
  },
  async ({ projectPath }) => {
    const result = await discoverProject(projectPath || '.');
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }
);

server.registerTool(
  'seo_crawl_and_extract',
  {
    description: 'Crawls a live URL or reads a local template/HTML file to extract Title, Meta, Headings (H1-H6), Canonical, Schema (JSON-LD), OpenGraph, Links, and Images.',
    inputSchema: {
      target: z.string().describe('Target live URL (https://...) or local file path.'),
      pageType: z.string().optional().describe('Optional override for page type (homepage, service, product, blog, location, etc.).')
    }
  },
  async ({ target, pageType }) => {
    const pageData = await crawlUrlOrFile(target, { pageType: pageType as any });
    return {
      content: [{ type: 'text', text: JSON.stringify(pageData, null, 2) }]
    };
  }
);

server.registerTool(
  'seo_audit_technical',
  {
    description: 'Performs Technical SEO audit: Canonical consistency, robots.txt, meta robots noindex/nofollow, sitemaps, trailing slash consistency, mixed content.',
    inputSchema: {
      target: z.string().describe('Target file path or live URL.'),
      projectPath: z.string().optional().describe('Optional project root path for sitemap/robots discovery.')
    }
  },
  async ({ target, projectPath }) => {
    const pageData = await crawlUrlOrFile(target);
    let discovery: ProjectDiscoveryResult | undefined;
    if (projectPath) {
      discovery = await discoverProject(projectPath);
    }
    const issues = auditTechnicalSeo(pageData, discovery);
    return {
      content: [{ type: 'text', text: JSON.stringify({ issuesCount: issues.length, issues }, null, 2) }]
    };
  }
);

server.registerTool(
  'seo_audit_onpage',
  {
    description: 'Performs On-Page SEO audit: Title tag length/CTR/keywords, Meta Description, H1-H6 hierarchy, OpenGraph and Twitter cards.',
    inputSchema: {
      target: z.string().describe('Target file path or live URL.')
    }
  },
  async ({ target }) => {
    const pageData = await crawlUrlOrFile(target);
    const issues = auditOnPageSeo(pageData);
    return {
      content: [{ type: 'text', text: JSON.stringify({ issuesCount: issues.length, issues }, null, 2) }]
    };
  }
);

server.registerTool(
  'seo_audit_aeo',
  {
    description: 'Performs Answer Engine Optimization audit: Direct answer blocks, question headings (What/How/Why), FAQ schema alignment, concise definition snippets.',
    inputSchema: {
      target: z.string().describe('Target file path or live URL.')
    }
  },
  async ({ target }) => {
    const pageData = await crawlUrlOrFile(target);
    const issues = auditAeo(pageData);
    return {
      content: [{ type: 'text', text: JSON.stringify({ issuesCount: issues.length, issues }, null, 2) }]
    };
  }
);

server.registerTool(
  'seo_audit_geo',
  {
    description: 'Performs Generative Engine Optimization audit: Brand/Organization entities, sameAs knowledge graph reconciliation, Author E-E-A-T credentials, service relationships.',
    inputSchema: {
      target: z.string().describe('Target file path or live URL.')
    }
  },
  async ({ target }) => {
    const pageData = await crawlUrlOrFile(target);
    const issues = auditGeo(pageData);
    return {
      content: [{ type: 'text', text: JSON.stringify({ issuesCount: issues.length, issues }, null, 2) }]
    };
  }
);

server.registerTool(
  'seo_audit_local',
  {
    description: 'Performs Local & Area SEO audit: LocalBusiness schema completeness, visible NAP consistency, click-to-call phone, address validation, location page duplication.',
    inputSchema: {
      target: z.string().describe('Target file path or live URL.')
    }
  },
  async ({ target }) => {
    const pageData = await crawlUrlOrFile(target);
    const issues = auditLocalSeo(pageData);
    return {
      content: [{ type: 'text', text: JSON.stringify({ issuesCount: issues.length, issues }, null, 2) }]
    };
  }
);

server.registerTool(
  'seo_audit_content',
  {
    description: 'Audits content quality, search intent classification (Informational, Commercial, Transactional, Navigational), thin content risks, readability, and E-E-A-T signals.',
    inputSchema: {
      target: z.string().describe('Target file path or live URL.')
    }
  },
  async ({ target }) => {
    const pageData = await crawlUrlOrFile(target);
    const evalResult = evaluateContentQuality(pageData);
    return {
      content: [{ type: 'text', text: JSON.stringify(evalResult, null, 2) }]
    };
  }
);

server.registerTool(
  'seo_audit_conversion',
  {
    description: 'Audits Conversion Rate Optimization (CRO) & digital marketing: Primary/secondary CTAs, contact channels (forms, phone, WhatsApp), social proof, risk reversal.',
    inputSchema: {
      target: z.string().describe('Target file path or live URL.')
    }
  },
  async ({ target }) => {
    const pageData = await crawlUrlOrFile(target);
    const issues = auditConversion(pageData);
    return {
      content: [{ type: 'text', text: JSON.stringify({ issuesCount: issues.length, issues }, null, 2) }]
    };
  }
);

server.registerTool(
  'seo_audit_performance',
  {
    description: 'Identifies code-level Core Web Vitals risks: CLS risks (images without width/height), LCP risks (legacy image formats), and render-blocking scripts.',
    inputSchema: {
      target: z.string().describe('Target file path or live URL.')
    }
  },
  async ({ target }) => {
    const pageData = await crawlUrlOrFile(target);
    const issues = auditPerformanceRisks(pageData);
    return {
      content: [{ type: 'text', text: JSON.stringify({ issuesCount: issues.length, issues }, null, 2) }]
    };
  }
);

server.registerTool(
  'seo_audit_schema',
  {
    description: 'Extracts and validates Schema.org structured data (Organization, LocalBusiness, FAQPage, Service, Product, BreadcrumbList, Article) for JSON syntax and completeness.',
    inputSchema: {
      target: z.string().describe('Target file path or live URL.')
    }
  },
  async ({ target }) => {
    const pageData = await crawlUrlOrFile(target);
    const issues = auditSchema(pageData);
    return {
      content: [{ type: 'text', text: JSON.stringify({ schemas: pageData.schemas, issues }, null, 2) }]
    };
  }
);

server.registerTool(
  'seo_audit_internal_links',
  {
    description: 'Audits internal link architecture, generic anchor text, orphan pages, and generates high-value contextual linking recommendations.',
    inputSchema: {
      target: z.string().describe('Target file path or live URL.')
    }
  },
  async ({ target }) => {
    const pageData = await crawlUrlOrFile(target);
    const linkResult = auditInternalLinks(pageData);
    return {
      content: [{ type: 'text', text: JSON.stringify(linkResult, null, 2) }]
    };
  }
);

server.registerTool(
  'seo_generate_full_audit',
  {
    description: 'Runs the complete 8-dimension audit suite, computes 0-100 scores and letter grades, builds the P0-P3 prioritized action matrix, and outputs formatted Markdown report.',
    inputSchema: {
      target: z.string().describe('Target file path or live URL.'),
      projectPath: z.string().optional().describe('Optional project root directory.')
    }
  },
  async ({ target, projectPath }) => {
    const pageData = await crawlUrlOrFile(target);
    let discovery: ProjectDiscoveryResult | undefined;
    if (projectPath) {
      discovery = await discoverProject(projectPath);
    }

    const allIssues: AuditIssue[] = [
      ...auditTechnicalSeo(pageData, discovery),
      ...auditOnPageSeo(pageData),
      ...auditAeo(pageData),
      ...auditGeo(pageData),
      ...auditLocalSeo(pageData),
      ...evaluateContentQuality(pageData).issues,
      ...auditConversion(pageData),
      ...auditPerformanceRisks(pageData),
      ...auditSchema(pageData),
      ...auditInternalLinks(pageData).issues
    ];

    const report = generateAuditReport(target, pageData, allIssues, discovery, discovery?.framework);
    const markdown = formatReportToMarkdown(report);

    return {
      content: [
        { type: 'text', text: markdown },
        { type: 'text', text: `\n\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\`` }
      ]
    };
  }
);

server.registerTool(
  'seo_generate_marketing_strategy',
  {
    description: 'Generates a comprehensive digital marketing strategy blueprint, buyer intent & funnel mapping, CRO recommendations, AEO AI overview tactics, and a 30-60-90 day growth roadmap.',
    inputSchema: {
      target: z.string().describe('Target file path or live URL.'),
      projectPath: z.string().optional().describe('Optional project root directory.')
    }
  },
  async ({ target, projectPath }) => {
    const pageData = await crawlUrlOrFile(target);
    let discovery: ProjectDiscoveryResult | undefined;
    if (projectPath) {
      discovery = await discoverProject(projectPath);
    }

    const allIssues: AuditIssue[] = [
      ...auditTechnicalSeo(pageData, discovery),
      ...auditOnPageSeo(pageData),
      ...auditAeo(pageData),
      ...auditGeo(pageData),
      ...auditLocalSeo(pageData),
      ...evaluateContentQuality(pageData).issues,
      ...auditConversion(pageData),
      ...auditPerformanceRisks(pageData),
      ...auditSchema(pageData),
      ...auditInternalLinks(pageData).issues
    ];

    const strategy = generateMarketingStrategy(target, pageData, allIssues, discovery);
    const markdown = formatMarketingStrategyToMarkdown(strategy);

    return {
      content: [
        { type: 'text', text: markdown },
        { type: 'text', text: `\n\n\`\`\`json\n${JSON.stringify(strategy, null, 2)}\n\`\`\`` }
      ]
    };
  }
);

server.registerTool(
  'seo_generate_code_fix',
  {
    description: 'Generates surgical, framework-aware code fixes (Laravel Blade, Next.js App/Pages, HTML, PHP, Astro, Svelte) including WebMCP discovery link injection with unified diff preview. Set applyDirectly to true to write changes.',
    inputSchema: {
      filePath: z.string().describe('Path to the source file to modify.'),
      title: z.string().optional().describe('New or updated title tag.'),
      metaDescription: z.string().optional().describe('New or updated meta description.'),
      canonicalUrl: z.string().optional().describe('Canonical URL.'),
      jsonLdSchema: z.record(z.string(), z.any()).optional().describe('Schema.org JSON-LD object to inject.'),
      webMcpEndpoint: z.string().optional().describe('WebMCP endpoint URL to inject into HTML <head> via <link rel="mcp-server" /> (e.g. /mcp or /api/mcp).'),
      addWebMcpDiscovery: z.boolean().optional().describe('Whether to inject standard <link rel="mcp-server" href="/mcp" /> tag.'),
      applyDirectly: z.boolean().optional().describe('Whether to write changes directly to disk (default: false).')
    }
  },
  async (args) => {
    const plan = generateCodeFix(args as any);
    return {
      content: [{ type: 'text', text: JSON.stringify(plan, null, 2) }]
    };
  }
);

server.registerTool(
  'seo_validate_code_fix',
  {
    description: 'Validates modified code files for duplicate meta tags, JSON-LD syntax errors, and calculates Before vs After score improvements.',
    inputSchema: {
      filePath: z.string().describe('Path to modified source file.'),
      beforeScores: z.record(z.string(), z.number()).optional().describe('Optional previous dimension scores to compute score diff.')
    }
  },
  async ({ filePath, beforeScores }) => {
    const validation = await validateCodeFix(filePath, beforeScores as any);
    return {
      content: [{ type: 'text', text: JSON.stringify(validation, null, 2) }]
    };
  }
);

server.registerTool(
  'seo_suggest_related_ecosystem',
  {
    description: 'Discovers related website ecosystems, infers market vertical & competitor archetypes, suggests high-authority directory/backlink targets, and generates keyword topic clusters.',
    inputSchema: {
      target: z.string().describe('Directory path to the website codebase or a live URL (https://...) to analyze.')
    }
  },
  async ({ target }) => {
    const isUrl = /^https?:\/\//i.test(target);
    let discovery: ProjectDiscoveryResult | undefined;
    if (!isUrl) {
      discovery = await discoverProject(target);
    }
    const pageData = await crawlUrlOrFile(target, discovery);
    const ecosystem = suggestRelatedEcosystem(target, pageData, discovery);
    const markdown = formatEcosystemToMarkdown(ecosystem);

    return {
      content: [
        { type: 'text', text: markdown },
        { type: 'text', text: `\n\n\`\`\`json\n${JSON.stringify(ecosystem, null, 2)}\n\`\`\`` }
      ]
    };
  }
);

server.registerTool(
  'seo_test_web_mcp',
  {
    description: 'Tests a live website or local codebase to check if Web MCP (Streamable HTTP/SSE endpoint, manifest, or DOM tools) is enabled, runs protocol compliance diagnostics, and provides language-specific implementation code fixes.',
    inputSchema: {
      url: z.string().describe('Live website URL to test for Web MCP enablement (e.g. https://example.com).'),
      targetLanguage: z.enum([
        'typescript-node',
        'nextjs-app',
        'nextjs-pages',
        'python-fastapi',
        'php-laravel',
        'go',
        'rust',
        'csharp-dotnet',
        'java-spring',
        'ruby-rails',
        'static-browser-dom',
        'all'
      ]).optional().describe('Optional target programming language or framework to generate customized code fixes for.')
    }
  },
  async ({ url, targetLanguage }) => {
    let pageData;
    try {
      pageData = await crawlUrlOrFile(url);
    } catch {
      // Crawling optional if site blocks
    }
    const result = await testWebMcpSupport(url, pageData, undefined, targetLanguage as any);
    const markdown = formatWebMcpTestToMarkdown(result, targetLanguage as any);

    return {
      content: [
        { type: 'text', text: markdown },
        { type: 'text', text: `\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`` }
      ]
    };
  }
);

server.registerTool(
  'seo_audit_sitemap_multipage',

  {
    description: 'Crawls and audits every page registered in a website sitemap.xml (or local routes), cross-checks robots.txt allow/disallow rules, inspects HTTP security headers (HSTS, CSP), and generates a site-wide SEO/AEO/GEO/CRO health score, inventory table, and remediation roadmap.',
    inputSchema: {
      target: z.string().describe('Website URL (https://...) or local codebase folder path.'),
      maxPages: z.number().optional().describe('Maximum number of sitemap URLs to crawl and audit (default: 25).'),
      userAgent: z.string().optional().describe('Target crawler user-agent to test robots.txt permissions against (default: Googlebot).')
    }
  },
  async ({ target, maxPages, userAgent }) => {
    const isUrl = /^https?:\/\//i.test(target);
    let discovery: ProjectDiscoveryResult | undefined;
    if (!isUrl) {
      discovery = await discoverProject(target);
    }
    const result = await auditSitemapMultipage(target, { maxPages, userAgent, discovery });
    const markdown = formatMultipageReportToMarkdown(result);

    return {
      content: [
        { type: 'text', text: markdown },
        { type: 'text', text: `\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`` }
      ]
    };
  }
);

server.registerTool(
  'seo_audit_robots_and_sitemap',
  {
    description: 'Deeply inspects robots.txt rules (allow/disallow per user-agent), sitemap.xml validity, disallowed pages mistakenly in sitemap, and HTTP security headers (HSTS, CSP, X-Frame-Options).',
    inputSchema: {
      target: z.string().describe('Website URL (https://...) or local codebase folder path.')
    }
  },
  async ({ target }) => {
    const robots = await fetchAndParseRobotsTxt(target);
    const sitemap = await fetchAndParseSitemap(target, robots);
    const security = await auditSecurityHeaders(target);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              target,
              robotsTxt: robots,
              sitemapXml: sitemap,
              securityHeaders: security
            },
            null,
            2
          )
        }
      ]
    };
  }
);

server.registerTool(
  'seo_generate_sitemap_and_robots',
  {
    description: 'Generates standard-compliant, production-ready sitemap.xml and robots.txt configuration files for any website or codebase.',
    inputSchema: {
      targetUrl: z.string().describe('Base website URL (e.g., https://example.com).'),
      urls: z.array(z.string()).optional().describe('Array of relative or absolute URLs to register in sitemap.xml.'),
      disallowedPaths: z.array(z.string()).optional().describe('Paths to disallow in robots.txt (e.g. ["/admin/", "/api/private/"]).')
    }
  },
  async ({ targetUrl, urls, disallowedPaths }) => {
    const sitemap = generateSitemapXml(urls || [targetUrl], targetUrl);
    const robots = generateRobotsTxt({
      sitemapUrl: `${targetUrl.replace(/\/$/, '')}/sitemap.xml`,
      disallowedPaths
    });

    return {
      content: [
        {
          type: 'text',
          text: `# 🗺️ Generated Sitemap.xml & Robots.txt Configuration Files

### 1. \`public/sitemap.xml\`
\`\`\`xml
${sitemap}
\`\`\`

### 2. \`public/robots.txt\`
\`\`\`text
${robots}
\`\`\`
`
        }
      ]
    };
  }
);



// ==========================================
// 3. SERVER TRANSPORT INITIALIZATION (STDIO + STREAMABLE HTTP)
// ==========================================

function getLandingPageHtml(port: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP-SEO Web Server</title>
  <style>
    :root { --bg: #0d1117; --card: #161b22; --border: #30363d; --text: #c9d1d9; --accent: #58a6ff; --green: #3fb950; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); padding: 2rem; max-width: 900px; margin: 0 auto; line-height: 1.6; }
    h1 { color: #fff; display: flex; align-items: center; gap: 0.5rem; }
    .badge { background: var(--green); color: #000; font-size: 0.75rem; padding: 0.2rem 0.6rem; border-radius: 999px; font-weight: bold; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; margin: 1.5rem 0; }
    code { background: #21262d; color: var(--accent); padding: 0.2rem 0.4rem; border-radius: 4px; font-family: ui-monospace, monospace; }
    pre { background: #21262d; padding: 1rem; border-radius: 6px; overflow-x: auto; border: 1px solid var(--border); }
    ul { padding-left: 1.2rem; }
    li { margin-bottom: 0.5rem; }
  </style>
</head>
<body>
  <h1>🌐 MCP-SEO Server <span class="badge">LIVE (Streamable HTTP / SSE)</span></h1>
  <p>SEO, AEO, GEO, Local SEO & Digital Marketing Growth Auditor + Safe Code Fixer MCP Server.</p>
  
  <div class="card">
    <h3>🔗 Connection Endpoints</h3>
    <ul>
      <li><strong>Streamable MCP Endpoint:</strong> <code>GET /mcp</code> or <code>POST /mcp</code></li>
      <li><strong>SSE Stream (Legacy Alias):</strong> <code>GET /sse</code></li>
      <li><strong>Message Endpoint (Legacy Alias):</strong> <code>POST /message</code></li>
      <li><strong>Health Check:</strong> <code>GET /health</code></li>
      <li><strong>Info / Meta:</strong> <code>GET /info</code></li>
    </ul>
  </div>

  <div class="card">
    <h3>🤖 Client Configuration Example (Claude Desktop / Cursor / Remote AI)</h3>
    <pre><code>{
  "mcpServers": {
    "seo-growth-auditor": {
      "url": "http://localhost:${port}/mcp"
    }
  }
}</code></pre>
  </div>
</body>
</html>`;
}

function startHttpServer(port: number = 3000, host: string = '0.0.0.0') {
  const streamableTransport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID()
  });

  server.connect(streamableTransport);

  const httpServer = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-session-id, mcp-session-id');
    res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id, x-session-id');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const hostHeader = req.headers.host || `localhost:${port}`;
    const url = new URL(req.url || '/', `http://${hostHeader}`);

    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), version: '1.0.5' }));
      return;
    }


    if (url.pathname === '/info') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          name: 'io.github.sparrow84001/mcp-seo',
          version: '1.0.5',
          author: 'Sayanta Neogi',
          description: 'SEO, AEO, GEO, Local SEO & CRO Growth Auditor + Safe Code Fixer',
          transport: 'streamable-http',
          endpoints: { mcp: '/mcp', sse: '/sse', message: '/message', health: '/health' },
          toolsCount: 19
        })
      );
      return;
    }

    if (url.pathname === '/.well-known/mcp/server-card.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        serverInfo: {
          name: 'mcp-seo',
          version: '1.0.5',
          description: 'SEO, AEO, GEO, Local SEO & CRO Growth Auditor + Safe Code Fixer'
        },
        authentication: { required: false },
        tools: [
          { name: 'seo_discover_project', description: 'Discovers website framework, routes, sitemaps, robots, llms.txt and page inventory.', inputSchema: { type: 'object', properties: { projectPath: { type: 'string' } }, required: ['projectPath'] } },
          { name: 'seo_crawl_and_extract', description: 'Crawls a live URL or reads a local file to extract SEO signals and page metadata.', inputSchema: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] } },
          { name: 'seo_audit_technical', description: 'Audits technical SEO foundations: canonicals, robots, sitemaps, indexing directives.', inputSchema: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] } },
          { name: 'seo_audit_onpage', description: 'Audits on-page SEO: title, meta description, heading hierarchy, content length.', inputSchema: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] } },
          { name: 'seo_audit_aeo', description: 'Audits Answer Engine Optimization for Google AI Overviews and Perplexity citations.', inputSchema: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] } },
          { name: 'seo_audit_geo', description: 'Audits Generative Engine Optimization: brand clarity, entity schema, topical authority.', inputSchema: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] } },
          { name: 'seo_audit_local', description: 'Audits Local SEO signals: NAP, local business schema, geographic landing pages.', inputSchema: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] } },
          { name: 'seo_audit_content', description: 'Evaluates content quality, informational depth, and search intent alignment.', inputSchema: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] } },
          { name: 'seo_audit_conversion', description: 'Audits conversion optimization (CRO): call-to-action visibility, form usability, trust signals.', inputSchema: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] } },
          { name: 'seo_audit_performance', description: 'Audits Core Web Vitals risk factors: unoptimized images, heavy scripts, render-blocking resources.', inputSchema: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] } },
          { name: 'seo_audit_schema', description: 'Validates Schema.org structured data JSON-LD coverage and correctness.', inputSchema: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] } },
          { name: 'seo_audit_internal_links', description: 'Audits internal linking structure, anchor text, and navigation links.', inputSchema: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] } },
          { name: 'seo_generate_full_audit', description: 'Runs a comprehensive 8-dimension SEO, AEO, GEO, Local, Content, and Performance audit report.', inputSchema: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] } },
          { name: 'seo_generate_marketing_strategy', description: 'Generates a strategic digital marketing plan, CRO levers, and prioritized 30-60-90 day growth roadmap.', inputSchema: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] } },
          { name: 'seo_suggest_related_ecosystem', description: 'Discovers related website ecosystems, infers market vertical & competitor archetypes, suggests high-authority directories, and generates keyword clusters.', inputSchema: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] } },
          { name: 'seo_test_web_mcp', description: 'Tests a live website to check if Web MCP is enabled, extracts active exposed tools, and provides enablement recommendations.', inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } },
          { name: 'seo_audit_sitemap_multipage', description: 'Crawls all sitemap registered URLs, checks robots allow/disallow permissions, audits security headers (HSTS), and aggregates site-wide health scorecard.', inputSchema: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] } },
          { name: 'seo_audit_robots_and_sitemap', description: 'Inspects robots.txt rules, sitemap index validity, and HTTP security headers (HSTS, CSP).', inputSchema: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] } },
          { name: 'seo_generate_sitemap_and_robots', description: 'Generates production-ready sitemap.xml and robots.txt files.', inputSchema: { type: 'object', properties: { targetUrl: { type: 'string' } }, required: ['targetUrl'] } }
        ],
        resources: [],
        prompts: []
      }));
      return;
    }


    if (
      url.pathname === '/mcp' ||
      url.pathname === '/sse' ||
      url.pathname === '/message' ||
      url.pathname.startsWith('/mcp/')
    ) {
      if (!req.headers.accept || req.headers.accept === '*/*' || !req.headers.accept.includes('text/event-stream')) {
        req.headers.accept = 'application/json, text/event-stream';
      }
      await streamableTransport.handleRequest(req, res);
      return;
    }

    if (url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(getLandingPageHtml(port));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  httpServer.listen(port, host, () => {
    console.error(`🚀 MCP-SEO Web Server running on http://${host}:${port}`);
    console.error(`   - Streamable HTTP/SSE: http://${host}:${port}/mcp (or /sse)`);
    console.error(`   - Health Check:        http://${host}:${port}/health`);
    console.error(`   - Info / Metadata:     http://${host}:${port}/info`);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const isHttp = args.includes('--http') || args.includes('-h') || process.env.MCP_TRANSPORT === 'http' || Boolean(process.env.PORT);

  if (isHttp) {
    const portArgIndex = args.indexOf('--port');
    const portArg = portArgIndex !== -1 ? args[portArgIndex + 1] : undefined;
    const customPort = portArg ? parseInt(portArg, 10) : undefined;
    const port = customPort || (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

    const hostArgIndex = args.indexOf('--host');
    const hostArg = hostArgIndex !== -1 ? args[hostArgIndex + 1] : undefined;
    const customHost = hostArg || undefined;
    const host = customHost || process.env.HOST || '0.0.0.0';

    startHttpServer(port, host);
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('MCP SEO Server running on stdio');
  }
}

main().catch((err) => {
  console.error('Fatal server error:', err);
  process.exit(1);
});

