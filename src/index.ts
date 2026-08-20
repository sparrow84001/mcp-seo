#!/usr/bin/env bun
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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
import { generateCodeFix } from './fixer/code-fixer.ts';
import { validateCodeFix } from './fixer/validator.ts';
import type { AuditIssue, ProjectDiscoveryResult } from './types/index.ts';

// Initialize McpServer
const server = new McpServer({
  name: 'mcp-seo',
  version: '1.0.0'
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
    description: 'Generates surgical, framework-aware code fixes (Laravel Blade, Next.js App/Pages, HTML, PHP) with unified diff preview. Set applyDirectly to true to write changes.',
    inputSchema: {
      filePath: z.string().describe('Path to the source file to modify.'),
      title: z.string().optional().describe('New or updated title tag.'),
      metaDescription: z.string().optional().describe('New or updated meta description.'),
      canonicalUrl: z.string().optional().describe('Canonical URL.'),
      jsonLdSchema: z.record(z.string(), z.any()).optional().describe('Schema.org JSON-LD object to inject.'),
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

// ==========================================
// 3. START SERVER VIA STDIO
// ==========================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP SEO Server running on stdio');
}

main().catch((err) => {
  console.error('Fatal server error:', err);
  process.exit(1);
});
