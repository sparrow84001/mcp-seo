import { describe, expect, it } from 'bun:test';
import { suggestRelatedEcosystem, formatEcosystemToMarkdown } from '../src/analyzer/ecosystem.ts';
import type { PageData, ProjectDiscoveryResult } from '../src/types/index.ts';

describe('Related Web Ecosystem & Competitor Suggestion Engine', () => {
  it('correctly infers B2B SaaS & DevTools vertical with relevant competitors & directories', () => {
    const pageData: PageData = {
      url: 'https://example-saas.com',
      rawHtml: '<html><body><h1>Next-Gen Cloud Database & CLI for AI Agents</h1></body></html>',
      title: 'DevScale - AI Powered Cloud Database & CLI Platform',
      metaDescription: 'High performance database and SDK for modern developers with automated scaling.',
      canonical: 'https://example-saas.com',
      headings: [
        { level: 1, text: 'Next-Gen Cloud Database & CLI for AI Agents' },
        { level: 2, text: 'API Features and SDK Documentation' }
      ],
      h1Count: 1,
      wordCount: 150,
      extractedText: 'Connect your AI agent with our ultra-fast TypeScript SDK and REST API.',
      paragraphs: ['Connect your AI agent with our ultra-fast TypeScript SDK and REST API.'],
      images: [],
      links: [],
      schemas: [],
      ogTags: {},
      twitterTags: {},
      scripts: [],
      pageType: 'landing',
      framework: 'nextjs-app'
    };

    const discovery: ProjectDiscoveryResult = {
      projectPath: '/test',
      framework: 'nextjs-app',
      frameworkDetails: { name: 'Next.js App Router' },
      detectedRoutes: [{ path: '/api/docs', filePath: 'app/api/docs/page.tsx', pageType: 'landing' }],
      sitemapFiles: ['public/sitemap.xml'],
      robotsTxtFiles: ['public/robots.txt'],
      llmsTxtFiles: ['public/llms.txt'],
      pageInventory: {
        homepage: 0,
        service: 0,
        product: 0,
        category: 0,
        location: 0,
        area: 0,
        city: 0,
        state: 0,
        blog: 0,
        article: 0,
        landing: 1,
        pricing: 0,
        comparison: 0,
        faq: 0,
        contact: 0,
        about: 0,
        author: 0,
        tag: 0,
        search: 0,
        pagination: 0,
        dynamic: 0,
        api: 0,
        unknown: 0
      },
      metaHelperLocations: [],
      totalScannedFiles: 5
    };

    const result = suggestRelatedEcosystem('https://example-saas.com', pageData, discovery);

    expect(result.nicheProfile.vertical).toBe('b2b-saas-devtools');
    expect(result.nicheProfile.targetAudienceType).toBe('B2B');
    expect(result.competitorArchetypes.length).toBeGreaterThanOrEqual(2);
    expect(result.authorityDirectoryProspects.some((p) => p.platformName.includes('ProductHunt'))).toBeTrue();
    expect(result.authorityDirectoryProspects.some((p) => p.platformName.includes('G2'))).toBeTrue();
    expect(result.keywordTopicClusters.length).toBe(4);

    const markdown = formatEcosystemToMarkdown(result);
    expect(markdown).toContain('B2B-SAAS-DEVTOOLS');
    expect(markdown).toContain('ProductHunt');
    expect(markdown).toContain('Competitor Archetypes & Benchmark Landscape');
  });

  it('correctly infers Local Home Services vertical with map pack benchmarks and Yelp/BBB', () => {
    const pageData: PageData = {
      url: 'https://pro-plumbing-chicago.com',
      rawHtml: '<html><body><h1>Fast Local Plumbing & Drain Cleaning in Chicago</h1></body></html>',
      title: '24/7 Emergency Plumber & HVAC Repair in Chicago, IL',
      metaDescription: 'Licensed and insured emergency plumbing and drain cleaning contractor in Chicago.',
      headings: [
        { level: 1, text: 'Fast Local Plumbing & Drain Cleaning in Chicago' },
        { level: 2, text: 'Emergency 45-Minute Response Guaranteed' }
      ],
      h1Count: 1,
      wordCount: 120,
      extractedText: 'Call our certified technicians today for transparent pricing and same-day service.',
      paragraphs: ['Call our certified technicians today for transparent pricing and same-day service.'],
      images: [],
      links: [],
      schemas: [],
      ogTags: {},
      twitterTags: {},
      scripts: [],
      pageType: 'location'
    };

    const result = suggestRelatedEcosystem('https://pro-plumbing-chicago.com', pageData);

    expect(result.nicheProfile.vertical).toBe('local-home-services');
    expect(result.nicheProfile.targetAudienceType).toBe('Local Consumers');
    expect(result.authorityDirectoryProspects.some((p) => p.platformName.includes('Yelp'))).toBeTrue();
    expect(result.authorityDirectoryProspects.some((p) => p.platformName.includes('Better Business Bureau'))).toBeTrue();
  });

  it('correctly audits Web MCP support and generates enablement snippets', async () => {
    const { testWebMcpSupport, formatWebMcpTestToMarkdown } = await import('../src/analyzer/web-mcp-detector.ts');

    const htmlWithMcp = '<html><head><link rel="mcp-server" href="/api/mcp/sse"></head><body><h1>Welcome</h1></body></html>';
    const pageData: PageData = {
      url: 'https://mysite.com',
      rawHtml: htmlWithMcp,
      title: 'My Web App',
      headings: [{ level: 1, text: 'Welcome' }],
      h1Count: 1,
      wordCount: 10,
      extractedText: 'Welcome',
      paragraphs: ['Welcome'],
      images: [],
      links: [],
      schemas: [],
      ogTags: {},
      twitterTags: {},
      scripts: [],
      pageType: 'landing'
    };

    const result = await testWebMcpSupport('https://mysite.com', pageData);
    expect(result.isWebMcpEnabled).toBeTrue();
    expect(result.detectedEndpoints.sseEndpoint).toBe('https://mysite.com/api/mcp/sse');
    expect(result.enablementGuide.stepsToEnable.length).toBeGreaterThan(2);

    const markdown = formatWebMcpTestToMarkdown(result);
    expect(markdown).toContain('WEB MCP ACTIVE & ENABLED');
    expect(markdown).toContain('https://mysite.com/api/mcp/sse');
  });
});

