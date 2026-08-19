#!/usr/bin/env bun
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

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
import { generateCodeFix } from './fixer/code-fixer.ts';
import { validateCodeFix } from './fixer/validator.ts';
import { MCP_PROMPTS } from './prompts/index.ts';
import type { AuditIssue, PageData, ProjectDiscoveryResult } from './types/index.ts';

const server = new Server(
  {
    name: 'mcp-seo',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {},
      prompts: {}
    }
  }
);

// 1. List Prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: Object.values(MCP_PROMPTS)
  };
});

// 2. Get Prompt
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const promptName = request.params.name;
  if (promptName === 'seo_full_audit') {
    const target = request.params.arguments?.target || '.';
    return {
      description: 'Perform a comprehensive 12-step audit across all growth dimensions.',
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

  if (promptName === 'seo_code_fix_workflow') {
    const filePath = request.params.arguments?.filePath || '';
    const issueType = request.params.arguments?.issueType || '';
    return {
      description: 'Apply surgical, safe code fixes.',
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

  throw new Error(`Prompt not found: ${promptName}`);
});

// 3. List Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'seo_discover_project',
        description:
          'Discovers website framework (Laravel, Next.js App/Pages, Nuxt, Astro, Raw PHP, HTML), routes, sitemaps, robots.txt, llms.txt, and page inventory.',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Absolute or relative path to project root directory.'
            }
          },
          required: ['projectPath']
        }
      },
      {
        name: 'seo_crawl_and_extract',
        description:
          'Crawls a live URL or reads a local template/HTML file to extract Title, Meta, Headings (H1-H6), Canonical, Schema (JSON-LD), OpenGraph, Links, and Images.',
        inputSchema: {
          type: 'object',
          properties: {
            target: {
              type: 'string',
              description: 'Target live URL (https://...) or local file path.'
            },
            pageType: {
              type: 'string',
              description: 'Optional override for page type (homepage, service, product, blog, location, etc.).'
            }
          },
          required: ['target']
        }
      },
      {
        name: 'seo_audit_technical',
        description:
          'Performs Technical SEO audit: Canonical consistency, robots.txt, meta robots noindex/nofollow, sitemaps, trailing slash consistency, mixed content.',
        inputSchema: {
          type: 'object',
          properties: {
            target: { type: 'string', description: 'Target file path or live URL.' },
            projectPath: { type: 'string', description: 'Optional project root path for sitemap/robots discovery.' }
          },
          required: ['target']
        }
      },
      {
        name: 'seo_audit_onpage',
        description:
          'Performs On-Page SEO audit: Title tag length/CTR/keywords, Meta Description, H1-H6 hierarchy, OpenGraph and Twitter cards.',
        inputSchema: {
          type: 'object',
          properties: {
            target: { type: 'string', description: 'Target file path or live URL.' }
          },
          required: ['target']
        }
      },
      {
        name: 'seo_audit_aeo',
        description:
          'Performs Answer Engine Optimization audit: Direct answer blocks, question headings (What/How/Why), FAQ schema alignment, concise definition snippets.',
        inputSchema: {
          type: 'object',
          properties: {
            target: { type: 'string', description: 'Target file path or live URL.' }
          },
          required: ['target']
        }
      },
      {
        name: 'seo_audit_geo',
        description:
          'Performs Generative Engine Optimization audit: Brand/Organization entities, sameAs knowledge graph reconciliation, Author E-E-A-T credentials, service relationships.',
        inputSchema: {
          type: 'object',
          properties: {
            target: { type: 'string', description: 'Target file path or live URL.' }
          },
          required: ['target']
        }
      },
      {
        name: 'seo_audit_local',
        description:
          'Performs Local & Area SEO audit: LocalBusiness schema completeness, visible NAP consistency, click-to-call phone, address validation, location page duplication.',
        inputSchema: {
          type: 'object',
          properties: {
            target: { type: 'string', description: 'Target file path or live URL.' }
          },
          required: ['target']
        }
      },
      {
        name: 'seo_audit_content',
        description:
          'Audits content quality, search intent classification (Informational, Commercial, Transactional, Navigational), thin content risks, readability, and E-E-A-T signals.',
        inputSchema: {
          type: 'object',
          properties: {
            target: { type: 'string', description: 'Target file path or live URL.' }
          },
          required: ['target']
        }
      },
      {
        name: 'seo_audit_conversion',
        description:
          'Audits Conversion Rate Optimization (CRO) & digital marketing: Primary/secondary CTAs, contact channels (forms, phone, WhatsApp), social proof, risk reversal.',
        inputSchema: {
          type: 'object',
          properties: {
            target: { type: 'string', description: 'Target file path or live URL.' }
          },
          required: ['target']
        }
      },
      {
        name: 'seo_audit_performance',
        description:
          'Identifies code-level Core Web Vitals risks: CLS risks (images without width/height), LCP risks (legacy image formats), and render-blocking scripts.',
        inputSchema: {
          type: 'object',
          properties: {
            target: { type: 'string', description: 'Target file path or live URL.' }
          },
          required: ['target']
        }
      },
      {
        name: 'seo_audit_schema',
        description:
          'Extracts and validates Schema.org structured data (Organization, LocalBusiness, FAQPage, Service, Product, BreadcrumbList, Article) for JSON syntax and completeness.',
        inputSchema: {
          type: 'object',
          properties: {
            target: { type: 'string', description: 'Target file path or live URL.' }
          },
          required: ['target']
        }
      },
      {
        name: 'seo_audit_internal_links',
        description:
          'Audits internal link architecture, generic anchor text, orphan pages, and generates high-value contextual linking recommendations.',
        inputSchema: {
          type: 'object',
          properties: {
            target: { type: 'string', description: 'Target file path or live URL.' }
          },
          required: ['target']
        }
      },
      {
        name: 'seo_generate_full_audit',
        description:
          'Runs the complete 8-dimension audit suite, computes 0-100 scores and letter grades, builds the P0-P3 prioritized action matrix, and outputs formatted Markdown report.',
        inputSchema: {
          type: 'object',
          properties: {
            target: { type: 'string', description: 'Target file path or live URL.' },
            projectPath: { type: 'string', description: 'Optional project root directory.' }
          },
          required: ['target']
        }
      },
      {
        name: 'seo_generate_code_fix',
        description:
          'Generates surgical, framework-aware code fixes (Laravel Blade, Next.js App/Pages, HTML, PHP) with unified diff preview. Set applyDirectly to true to write changes.',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: { type: 'string', description: 'Path to the source file to modify.' },
            title: { type: 'string', description: 'New or updated title tag.' },
            metaDescription: { type: 'string', description: 'New or updated meta description.' },
            canonicalUrl: { type: 'string', description: 'Canonical URL.' },
            jsonLdSchema: { type: 'object', description: 'Schema.org JSON-LD object to inject.' },
            applyDirectly: {
              type: 'boolean',
              description: 'Whether to write changes directly to disk (default: false).'
            }
          },
          required: ['filePath']
        }
      },
      {
        name: 'seo_validate_code_fix',
        description:
          'Validates modified code files for duplicate meta tags, JSON-LD syntax errors, and calculates Before vs After score improvements.',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: { type: 'string', description: 'Path to modified source file.' },
            beforeScores: {
              type: 'object',
              description: 'Optional previous dimension scores to compute score diff.'
            }
          },
          required: ['filePath']
        }
      }
    ]
  };
});

// 4. Call Tool Handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'seo_discover_project') {
      const projectPath = (args as any).projectPath || '.';
      const result = await discoverProject(projectPath);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }

    if (name === 'seo_crawl_and_extract') {
      const { target, pageType } = args as any;
      const pageData = await crawlUrlOrFile(target, { pageType });
      return {
        content: [{ type: 'text', text: JSON.stringify(pageData, null, 2) }]
      };
    }

    if (name === 'seo_audit_technical') {
      const { target, projectPath } = args as any;
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

    if (name === 'seo_audit_onpage') {
      const { target } = args as any;
      const pageData = await crawlUrlOrFile(target);
      const issues = auditOnPageSeo(pageData);
      return {
        content: [{ type: 'text', text: JSON.stringify({ issuesCount: issues.length, issues }, null, 2) }]
      };
    }

    if (name === 'seo_audit_aeo') {
      const { target } = args as any;
      const pageData = await crawlUrlOrFile(target);
      const issues = auditAeo(pageData);
      return {
        content: [{ type: 'text', text: JSON.stringify({ issuesCount: issues.length, issues }, null, 2) }]
      };
    }

    if (name === 'seo_audit_geo') {
      const { target } = args as any;
      const pageData = await crawlUrlOrFile(target);
      const issues = auditGeo(pageData);
      return {
        content: [{ type: 'text', text: JSON.stringify({ issuesCount: issues.length, issues }, null, 2) }]
      };
    }

    if (name === 'seo_audit_local') {
      const { target } = args as any;
      const pageData = await crawlUrlOrFile(target);
      const issues = auditLocalSeo(pageData);
      return {
        content: [{ type: 'text', text: JSON.stringify({ issuesCount: issues.length, issues }, null, 2) }]
      };
    }

    if (name === 'seo_audit_content') {
      const { target } = args as any;
      const pageData = await crawlUrlOrFile(target);
      const evalResult = evaluateContentQuality(pageData);
      return {
        content: [{ type: 'text', text: JSON.stringify(evalResult, null, 2) }]
      };
    }

    if (name === 'seo_audit_conversion') {
      const { target } = args as any;
      const pageData = await crawlUrlOrFile(target);
      const issues = auditConversion(pageData);
      return {
        content: [{ type: 'text', text: JSON.stringify({ issuesCount: issues.length, issues }, null, 2) }]
      };
    }

    if (name === 'seo_audit_performance') {
      const { target } = args as any;
      const pageData = await crawlUrlOrFile(target);
      const issues = auditPerformanceRisks(pageData);
      return {
        content: [{ type: 'text', text: JSON.stringify({ issuesCount: issues.length, issues }, null, 2) }]
      };
    }

    if (name === 'seo_audit_schema') {
      const { target } = args as any;
      const pageData = await crawlUrlOrFile(target);
      const issues = auditSchema(pageData);
      return {
        content: [{ type: 'text', text: JSON.stringify({ schemas: pageData.schemas, issues }, null, 2) }]
      };
    }

    if (name === 'seo_audit_internal_links') {
      const { target } = args as any;
      const pageData = await crawlUrlOrFile(target);
      const linkResult = auditInternalLinks(pageData);
      return {
        content: [{ type: 'text', text: JSON.stringify(linkResult, null, 2) }]
      };
    }

    if (name === 'seo_generate_full_audit') {
      const { target, projectPath } = args as any;
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

    if (name === 'seo_generate_code_fix') {
      const plan = generateCodeFix(args as any);
      return {
        content: [{ type: 'text', text: JSON.stringify(plan, null, 2) }]
      };
    }

    if (name === 'seo_validate_code_fix') {
      const { filePath, beforeScores } = args as any;
      const validation = await validateCodeFix(filePath, beforeScores);
      return {
        content: [{ type: 'text', text: JSON.stringify(validation, null, 2) }]
      };
    }

    throw new Error(`Unknown tool name: ${name}`);
  } catch (err: any) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Error executing ${name}: ${err.message}` }]
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP SEO Server running on stdio');
}

main().catch((err) => {
  console.error('Fatal server error:', err);
  process.exit(1);
});
