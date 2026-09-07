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
  version: '1.0.5'
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
    description: `Discovers website architecture, detected web frameworks (Laravel Blade, Next.js App/Pages Router, Nuxt, Astro, PHP, static HTML), routing structure, existing sitemap/robots configurations, and page inventory.

USAGE GUIDELINES:
- Use when starting an audit of a local codebase to detect framework patterns and file routes.
- Do NOT use for remote websites or live URLs; use 'seo_crawl_and_extract' or 'seo_audit_sitemap_multipage' instead.

BEHAVIORAL TRANSPARENCY:
- Safe, read-only local filesystem scan. Makes no network calls and modifies no files.`,
    inputSchema: {
      projectPath: z.string().default('.').describe('Absolute or relative directory path to the website root (e.g., "." or "/path/to/project"). Defaults to current directory.')
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
    description: `Crawls a live URL via HTTP or parses a local HTML/template file to extract raw SEO metadata: Title, Meta Description, Headings (H1-H6), Canonical URL, JSON-LD Schemas, OpenGraph/Twitter cards, links, and images.

USAGE GUIDELINES:
- Use to extract structured page metadata before running specialized audits or when analyzing a single page.
- Do NOT use for multi-page batch crawling; use 'seo_audit_sitemap_multipage' instead.
- Do NOT use to discover framework architecture; use 'seo_discover_project' instead.

BEHAVIORAL TRANSPARENCY:
- Read-only data extraction.
- Issues HTTP GET requests for live URLs. Reads local files directly without modifying them.`,
    inputSchema: {
      target: z.string().describe('Target live URL (e.g. "https://example.com") or local source/HTML file path (e.g. "./index.html").'),
      pageType: z.string().optional().describe('Optional override for page classification (e.g. "homepage", "service", "product", "blog", "location"). Inferred automatically if omitted.')
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
    description: `Performs a Technical SEO audit on a page or URL, checking canonical tag consistency, robots meta tags (noindex/nofollow), XML sitemap alignment, trailing slash consistency, HTTP mixed content, viewport, and charset declarations.

USAGE GUIDELINES:
- Use to audit indexing, crawlability, canonicalization, and technical header directives.
- Do NOT use for on-page copy, headings, or keyword targeting; use 'seo_audit_onpage' instead.
- Do NOT use for full site audits; use 'seo_audit_sitemap_multipage' or 'seo_generate_full_audit' instead.

BEHAVIORAL TRANSPARENCY:
- Safe, read-only diagnostic evaluation.
- Issues HTTP GET requests if given a URL; reads local file if given a file path. No disk modifications.`,
    inputSchema: {
      target: z.string().describe('Target live URL (e.g. "https://example.com") or local file path to audit.'),
      projectPath: z.string().optional().describe('Optional project root path used to locate and cross-reference local sitemap.xml and robots.txt files.')
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
    description: `Audits on-page SEO elements: Title tag length and keyword placement, Meta Description presence and CTR optimization, single H1 heading enforcement, H1-H6 hierarchy, OpenGraph, and Twitter card tags.

USAGE GUIDELINES:
- Use when evaluating page-level metadata, heading structures, and social sharing previews.
- Do NOT use for technical indexing directives (canonical/robots); use 'seo_audit_technical' instead.
- Do NOT use for structured data validation; use 'seo_audit_schema' instead.

BEHAVIORAL TRANSPARENCY:
- Safe, read-only diagnostic evaluation. No file modifications.`,
    inputSchema: {
      target: z.string().describe('Target live URL (e.g. "https://example.com") or local file path to audit.')
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
    description: `Audits content for Answer Engine Optimization (AEO): Evaluates concise 40-60 word direct answer definition blocks, question-based H2/H3 subheadings (What/How/Why), FAQ schema alignment, and citation readiness for Google AI Overviews and Perplexity.

USAGE GUIDELINES:
- Use when optimizing content to win conversational AI search citations, direct answers, and Perplexity summaries.
- Do NOT use for brand knowledge-graph entity reconciliation; use 'seo_audit_geo' instead.
- Do NOT use for standard on-page metadata; use 'seo_audit_onpage' instead.

BEHAVIORAL TRANSPARENCY:
- Safe, read-only diagnostic evaluation. No file modifications.`,
    inputSchema: {
      target: z.string().describe('Target live URL (e.g. "https://example.com/topic") or local file path to audit.')
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
    description: `Audits Generative Engine Optimization (GEO): Evaluates brand and organization entities, Schema.org Organization/Person definitions, sameAs knowledge graph reconciliation (Wikidata, LinkedIn, Crunchbase), and Author E-E-A-T credentials.

USAGE GUIDELINES:
- Use to evaluate how LLM-based search engines (ChatGPT Search, Claude, Gemini) comprehend brand identity and authority.
- Do NOT use for local map pack NAP consistency; use 'seo_audit_local' instead.
- Do NOT use for direct answer snippet definitions; use 'seo_audit_aeo' instead.

BEHAVIORAL TRANSPARENCY:
- Safe, read-only diagnostic evaluation. No file modifications.`,
    inputSchema: {
      target: z.string().describe('Target live URL (e.g. "https://example.com") or local file path to audit.')
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
    description: `Audits Local and Area SEO: Evaluates LocalBusiness Schema.org JSON-LD, visible Name-Address-Phone (NAP) consistency, click-to-call telephone links, Google Maps embed signals, and detects doorway city page duplication.

USAGE GUIDELINES:
- Use for local business websites, multi-location practices, and regional service providers.
- Do NOT use for pure SaaS, digital-only, or non-geographic websites; use 'seo_audit_technical' or 'seo_audit_onpage' instead.

BEHAVIORAL TRANSPARENCY:
- Safe, read-only diagnostic evaluation. No file modifications.`,
    inputSchema: {
      target: z.string().describe('Target live URL (e.g. "https://example.com/chicago") or local file path to audit.')
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
    description: `Evaluates content depth, search intent classification (Informational, Commercial, Transactional, Navigational), word count thresholds, thin content risks, reading ease, and Google E-E-A-T trust signals.

USAGE GUIDELINES:
- Use to analyze article or landing page editorial quality, substance, and intent alignment.
- Do NOT use for code-level schema validation; use 'seo_audit_schema' instead.
- Do NOT use to generate marketing campaigns; use 'seo_generate_marketing_strategy' instead.

BEHAVIORAL TRANSPARENCY:
- Safe, read-only content analysis. No file modifications.`,
    inputSchema: {
      target: z.string().describe('Target live URL (e.g. "https://example.com/blog/guide") or local file path to audit.')
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
    description: `Audits Conversion Rate Optimization (CRO) and user conversion signals: High-contrast primary/secondary CTAs, contact channel accessibility (forms, phone, WhatsApp), social proof badges, mobile floating action buttons, and risk reversal guarantees.

USAGE GUIDELINES:
- Use to evaluate landing pages, pricing pages, and checkout/contact funnels for conversion friction.
- Do NOT use for organic ranking signals (canonical, meta); use 'seo_audit_onpage' or 'seo_audit_technical' instead.

BEHAVIORAL TRANSPARENCY:
- Safe, read-only CRO analysis. No file modifications.`,
    inputSchema: {
      target: z.string().describe('Target live URL (e.g. "https://example.com/pricing") or local file path to audit.')
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
    description: `Identifies code-level Core Web Vitals risks: Cumulative Layout Shift (CLS) risks from images lacking explicit width/height attributes, Largest Contentful Paint (LCP) risks from unoptimized formats, and render-blocking scripts.

USAGE GUIDELINES:
- Use to detect static HTML and template performance defects that harm search rankings and Core Web Vitals.
- Do NOT use as a real-time synthetic browser lab benchmark (like Lighthouse); this tool performs static source code analysis.

BEHAVIORAL TRANSPARENCY:
- Safe, read-only performance diagnostic. No file modifications.`,
    inputSchema: {
      target: z.string().describe('Target live URL (e.g. "https://example.com") or local file path to audit.')
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
    description: `Extracts and validates Schema.org JSON-LD structured data (Organization, LocalBusiness, FAQPage, Service, Product, BreadcrumbList, Article) for syntax correctness, required properties, and Google rich result eligibility.

USAGE GUIDELINES:
- Use to inspect whether structured data is correctly embedded and free of JSON syntax or validation errors.
- Do NOT use to apply schema fixes to files; use 'seo_generate_code_fix' with the 'jsonLdSchema' parameter instead.

BEHAVIORAL TRANSPARENCY:
- Safe, read-only validation tool. No file modifications.`,
    inputSchema: {
      target: z.string().describe('Target live URL (e.g. "https://example.com") or local file path to inspect.')
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
    description: `Audits internal linking structure, identifies generic anchor text ('click here', 'read more'), flags orphan pages, and suggests high-value contextual links between blog articles and service pages.

USAGE GUIDELINES:
- Use to improve PageRank flow, internal topic clustering, and anchor text relevance across pages.
- Do NOT use to inspect external backlink profiles; use 'seo_suggest_related_ecosystem' for off-page targets.

BEHAVIORAL TRANSPARENCY:
- Safe, read-only link graph analysis. No file modifications.`,
    inputSchema: {
      target: z.string().describe('Target live URL (e.g. "https://example.com") or local file path to audit.')
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
    description: `Executes the comprehensive 8-dimension audit suite across Technical, On-Page, AEO, GEO, Local, Content, CRO, and Performance. Calculates 0-100 scores, letter grades (A+ to F), P0-P3 prioritized action matrix, and formatted Markdown report.

USAGE GUIDELINES:
- Use as the primary single-page audit tool when a complete health check and executive scorecard is needed.
- Do NOT use for entire multi-page domain crawls; use 'seo_audit_sitemap_multipage' instead.
- Do NOT use if you only need a single specific dimension; use the dedicated 'seo_audit_*' tools instead for faster response.

BEHAVIORAL TRANSPARENCY:
- Safe, read-only comprehensive synthesis. Generates Markdown and JSON reports without modifying files.`,
    inputSchema: {
      target: z.string().describe('Target live URL (e.g. "https://example.com") or local file path to audit.'),
      projectPath: z.string().optional().describe('Optional project root path for framework and routing context.')
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
    description: `Synthesizes audit findings into a high-impact digital marketing growth blueprint: Maps search intent across ToFu/MoFu/BoFu funnels, provides CRO conversion levers, outlines AEO answer capture tactics, and delivers a 30-60-90 day growth roadmap.

USAGE GUIDELINES:
- Use when preparing a strategic marketing plan, client proposal, or business growth recommendations based on site audit data.
- Do NOT use to apply code fixes to files; use 'seo_generate_code_fix' instead.
- Do NOT use for quick technical diagnostic checks; use 'seo_audit_technical' instead.

BEHAVIORAL TRANSPARENCY:
- Safe, read-only strategic synthesis. Produces strategic Markdown plans without modifying any files.`,
    inputSchema: {
      target: z.string().describe('Target live URL (e.g. "https://example.com") or local file path to analyze.'),
      projectPath: z.string().optional().describe('Optional project root directory path to enrich strategy with architecture context.')
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
    description: `Generates framework-aware code fixes (Laravel Blade, Next.js App/Pages Router, HTML, PHP, Astro, Svelte) for missing titles, meta descriptions, canonical URLs, JSON-LD schemas, and WebMCP discovery links with unified diff preview.

USAGE GUIDELINES:
- Use after audit tools detect specific SEO, schema, or WebMCP issues in a source file.
- Do NOT use for general code refactoring unrelated to metadata, schema, or SEO tags.
- Always run 'seo_validate_code_fix' immediately after applying changes to verify syntax and prevent duplicate tags.

BEHAVIORAL TRANSPARENCY:
- Non-destructive by default: Returns unified diff preview without modifying files.
- Modifies disk ONLY when 'applyDirectly' is explicitly set to true.`,
    inputSchema: {
      filePath: z.string().describe('Path to source code file to modify (e.g., "./pages/index.tsx" or "resources/views/welcome.blade.php").'),
      title: z.string().optional().describe('New or updated title tag text.'),
      metaDescription: z.string().optional().describe('New or updated meta description string.'),
      canonicalUrl: z.string().optional().describe('Canonical URL (e.g. "https://example.com/page").'),
      jsonLdSchema: z.record(z.string(), z.any()).optional().describe('Valid Schema.org JSON-LD object to inject into HTML head.'),
      webMcpEndpoint: z.string().optional().describe('WebMCP endpoint URL to inject into HTML head via <link rel="mcp-server" /> (e.g. "/mcp" or "/api/mcp").'),
      addWebMcpDiscovery: z.boolean().optional().describe('Whether to inject standard <link rel="mcp-server" href="/mcp" /> tag. Default: false.'),
      applyDirectly: z.boolean().optional().describe('Whether to apply changes directly to disk. Default: false (returns diff preview only for review).')
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
    description: `Validates modified source files against syntax errors, duplicate meta/title tags, broken JSON-LD syntax, and calculates Before vs After SEO score improvements.

USAGE GUIDELINES:
- Use immediately after generating or applying a code fix via 'seo_generate_code_fix' to verify correctness.
- Do NOT use as a standalone audit on unedited files; use 'seo_audit_onpage' or 'seo_generate_full_audit' instead.

BEHAVIORAL TRANSPARENCY:
- Safe, read-only file validation. Reads the modified file and performs AST/regex checks without making further modifications.`,
    inputSchema: {
      filePath: z.string().describe('Path to the modified source code file to validate.'),
      beforeScores: z.record(z.string(), z.number()).optional().describe('Optional map of previous dimension scores (0-100) to compute exact before vs after score delta.')
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
    description: `Analyzes a website to infer its market vertical, benchmark competitor archetypes, identify high-authority backlink and directory targets, and build keyword topic clusters.

USAGE GUIDELINES:
- Use to expand organic reach, plan off-page directory submissions, and identify competitor benchmarks.
- Do NOT use for on-page code repairs; use 'seo_generate_code_fix' instead.
- Do NOT use for protocol validation; use 'seo_test_web_mcp' instead.

BEHAVIORAL TRANSPARENCY:
- Safe, read-only ecosystem analysis. Makes no modifications to codebase or remote sites.`,
    inputSchema: {
      target: z.string().describe('Website codebase directory path (e.g. ".") or live URL (e.g. "https://example.com").')
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
    description: `Tests a live website or local endpoint for Web MCP enablement: Checks Streamable HTTP (/mcp), Legacy SSE (/sse), discovery manifests (/.well-known/mcp/server-card.json, llms.txt), CORS headers, and provides copy-paste implementation blueprints in 11 programming languages.

USAGE GUIDELINES:
- Use to test if a web application exposes an agent-accessible Model Context Protocol interface.
- Do NOT use for regular HTML search engine optimization; use 'seo_audit_technical' or 'seo_audit_onpage' instead.

BEHAVIORAL TRANSPARENCY:
- Safe, read-only protocol diagnostic probe. Makes HTTP GET/HEAD requests to standard discovery endpoints. Modifies no files.`,
    inputSchema: {
      url: z.string().describe('Live website URL to test for Web MCP support (e.g. "https://example.com").'),
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
      ]).optional().describe('Optional target programming language or framework to generate customized code blueprints for.')
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
    description: `Crawls and batch-audits all pages registered in a website sitemap.xml (or local discovered routes), cross-checks robots.txt allow/disallow rules, audits HTTP security headers (HSTS, CSP, X-Frame-Options), and compiles a site-wide scorecard and inventory report.

USAGE GUIDELINES:
- Use when auditing an entire website with multiple pages rather than a single URL.
- Do NOT use for single page analysis; use 'seo_generate_full_audit' instead for faster single-page feedback.
- Do NOT use to generate new sitemaps; use 'seo_generate_sitemap_and_robots' instead.

BEHAVIORAL TRANSPARENCY:
- Read-only batch crawl.
- Issues HTTP GET requests respecting robots.txt directives and maxPages limits. Makes no disk modifications.`,
    inputSchema: {
      target: z.string().describe('Website base URL (e.g. "https://example.com") or local codebase folder path.'),
      maxPages: z.number().optional().describe('Maximum number of sitemap URLs to crawl and audit (default: 25, recommended max: 50).'),
      userAgent: z.string().optional().describe('Target crawler user-agent to evaluate robots.txt permissions against (default: "Googlebot").')
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
    description: `Inspects robots.txt rules (allow/disallow per user-agent), sitemap index validity, detects contradictory directives (e.g. disallowed pages mistakenly included in sitemap.xml), and audits HTTP security headers.

USAGE GUIDELINES:
- Use to inspect crawl configuration and indexation guardrails for Googlebot, GPTBot, ClaudeBot, and PerplexityBot.
- Do NOT use for crawling page body content; use 'seo_audit_sitemap_multipage' or 'seo_crawl_and_extract' instead.

BEHAVIORAL TRANSPARENCY:
- Safe, read-only network/file inspection. Fetches robots.txt and sitemap.xml without modifying them.`,
    inputSchema: {
      target: z.string().describe('Website URL (e.g. "https://example.com") or local codebase folder path.')
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
    description: `Generates production-ready, standard-compliant sitemap.xml and robots.txt files with crawler directives for Googlebot, Bingbot, and AI search engines (GPTBot, ClaudeBot, PerplexityBot).

USAGE GUIDELINES:
- Use when a website is missing sitemap.xml or robots.txt, or needs clean, updated configuration files.
- Do NOT use to audit existing files; use 'seo_audit_robots_and_sitemap' instead.
- Do NOT use to crawl pages; use 'seo_audit_sitemap_multipage' instead.

BEHAVIORAL TRANSPARENCY:
- Pure generation tool. Returns formatted XML and robots.txt file contents as text output. Does not write to disk directly unless copied by user.`,
    inputSchema: {
      targetUrl: z.string().describe('Base website domain URL (e.g. "https://example.com").'),
      urls: z.array(z.string()).optional().describe('List of relative or absolute URLs to register in sitemap.xml (e.g. ["/", "/about", "/pricing"]).'),
      disallowedPaths: z.array(z.string()).optional().describe('URL path prefixes to disallow in robots.txt (e.g. ["/admin/", "/api/private/"]).')
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
          toolsCount: 21
        })
      );
      return;
    }

    if (url.pathname === '/.well-known/glama.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          "$schema": "https://glama.ai/mcp/schemas/connector.json",
          "claim": "glama_claim_hTd3BVD7jDjdptYc_KGhowTY4GN2C6RV"
        })
      );
      return;
    }

    if (url.pathname === '/.well-known/mcp/server-card.json' || url.pathname === '/.well-known/mcp.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          serverInfo: {
            name: 'mcp-seo',
            version: '1.0.5',
            description: 'SEO, AEO, GEO, Local SEO & CRO Growth Auditor + Safe Code Fixer'
          },
          authentication: { required: false },
          toolsCount: 21,
          transport: 'streamable-http',
          endpoints: { mcp: '/mcp', sse: '/sse', message: '/message', health: '/health' }
        })
      );
      return;
    }

    if (url.pathname === '/api/audit' || url.pathname === '/audit') {
      res.setHeader('Content-Type', 'application/json');

      const handleAudit = async (target: string) => {
        try {
          if (!target) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing target URL or path' }));
            return;
          }

          const pageData = await crawlUrlOrFile(target);
          const allIssues: AuditIssue[] = [
            ...auditTechnicalSeo(pageData),
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

          const report = generateAuditReport(target, pageData, allIssues);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, report, pageData }));
        } catch (err: any) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: err.message || 'Audit execution failed' }));
        }
      };

      if (req.method === 'GET') {
        const target = url.searchParams.get('target') || url.searchParams.get('url') || '';
        await handleAudit(target);
        return;
      }

      if (req.method === 'POST') {
        let rawBody = '';
        req.on('data', (chunk) => (rawBody += chunk));
        req.on('end', async () => {
          try {
            const body = JSON.parse(rawBody || '{}');
            const target = body.target || body.url || '';
            await handleAudit(target);
          } catch {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Invalid JSON request body' }));
          }
        });
        return;
      }
    }

    if (
      url.pathname === '/mcp' ||
      url.pathname === '/sse' ||
      url.pathname === '/message' ||
      url.pathname.startsWith('/mcp/')
    ) {
      if (req.method === 'GET' && req.headers.accept?.includes('text/html') && !req.headers.accept?.includes('text/event-stream')) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(getLandingPageHtml(port));
        return;
      }

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
