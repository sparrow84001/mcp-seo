import { describe, expect, it } from 'bun:test';
import { discoverProject } from '../src/analyzer/discovery.ts';
import { crawlUrlOrFile, extractPageDataFromHtml } from '../src/analyzer/crawler.ts';
import { auditTechnicalSeo } from '../src/analyzer/technical.ts';
import { auditOnPageSeo } from '../src/analyzer/onpage.ts';
import { auditAeo } from '../src/analyzer/aeo.ts';
import { auditGeo } from '../src/analyzer/geo.ts';
import { auditLocalSeo } from '../src/analyzer/local.ts';
import { evaluateContentQuality } from '../src/analyzer/content.ts';
import { auditConversion } from '../src/analyzer/conversion.ts';
import { auditPerformanceRisks } from '../src/analyzer/performance.ts';
import { auditSchema } from '../src/analyzer/schema.ts';
import { auditInternalLinks } from '../src/analyzer/internal-links.ts';
import { generateAuditReport } from '../src/analyzer/report.ts';
import { generateMarketingStrategy } from '../src/analyzer/strategy.ts';
import { generateCodeFix } from '../src/fixer/code-fixer.ts';
import { validateCodeFix } from '../src/fixer/validator.ts';
import { suggestRelatedEcosystem } from '../src/analyzer/ecosystem.ts';
import { testWebMcpSupport } from '../src/analyzer/web-mcp-detector.ts';
import {
  auditSitemapMultipage,
  fetchAndParseRobotsTxt,
  fetchAndParseSitemap,
  auditSecurityHeaders,
  generateSitemapXml,
  generateRobotsTxt
} from '../src/analyzer/sitemap-crawler.ts';
import type { PageData } from '../src/types/index.ts';

const sampleHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Enterprise Cloud Infrastructure & Migration | ExampleCorp</title>
  <meta name="description" content="Accelerate your enterprise cloud transformation with high-availability infrastructure and migration consulting." />
  <link rel="canonical" href="https://example.com/services/cloud" />
  <meta property="og:title" content="Enterprise Cloud Infrastructure | ExampleCorp" />
  <meta property="og:description" content="Accelerate your enterprise cloud transformation." />
  <meta name="twitter:card" content="summary_large_image" />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Cloud Migration",
    "provider": {
      "@type": "Organization",
      "name": "ExampleCorp",
      "url": "https://example.com"
    }
  }
  </script>
</head>
<body>
  <h1>Enterprise Cloud Infrastructure & Migration</h1>
  <h2>What is Enterprise Cloud Migration?</h2>
  <p>Enterprise cloud migration is the strategic process of transitioning digital assets, databases, and workloads into scalable cloud environments.</p>
  <h2>How We Execute Cloud Migrations</h2>
  <p>We provide end-to-end architecture reviews, automated migration pipelines, and 24/7 reliability engineering.</p>
  <a href="tel:+18005550199">Call Us: (800) 555-0199</a>
  <a href="/contact">Book a Free Architecture Assessment</a>
  <a href="/blog/case-studies">Read our Case Studies</a>
  <img src="/assets/hero.webp" alt="Cloud infrastructure architecture diagram" width="800" height="400" />
</body>
</html>`;

const samplePageData: PageData = extractPageDataFromHtml(sampleHtml, {
  url: 'https://example.com/services/cloud',
  pageType: 'service',
  baseUrl: 'https://example.com'
});

describe('Comprehensive Tool Coverage Suite (100% MCP Tools Reference)', () => {
  it('tests tool: seo_discover_project', async () => {
    const discovery = await discoverProject('tests');
    expect(discovery).toBeDefined();
    expect(discovery.projectPath).toBeDefined();
  });

  it('tests tool: seo_crawl_and_extract', async () => {
    const page = extractPageDataFromHtml(sampleHtml, { url: 'https://example.com', pageType: 'service', baseUrl: 'https://example.com' });
    expect(page).toBeDefined();
    expect(page.title).toBeDefined();
  });

  it('tests tool: seo_audit_technical', () => {
    const issues = auditTechnicalSeo(samplePageData);
    expect(Array.isArray(issues)).toBeTrue();
  });

  it('tests tool: seo_audit_onpage', () => {
    const issues = auditOnPageSeo(samplePageData);
    expect(Array.isArray(issues)).toBeTrue();
  });

  it('tests tool: seo_audit_aeo', () => {
    const issues = auditAeo(samplePageData);
    expect(Array.isArray(issues)).toBeTrue();
  });

  it('tests tool: seo_audit_geo', () => {
    const issues = auditGeo(samplePageData);
    expect(Array.isArray(issues)).toBeTrue();
  });

  it('tests tool: seo_audit_local', () => {
    const issues = auditLocalSeo(samplePageData);
    expect(Array.isArray(issues)).toBeTrue();
  });

  it('tests tool: seo_audit_content', () => {
    const content = evaluateContentQuality(samplePageData);
    expect(content.issues).toBeDefined();
    expect(Array.isArray(content.issues)).toBeTrue();
  });

  it('tests tool: seo_audit_conversion', () => {
    const issues = auditConversion(samplePageData);
    expect(Array.isArray(issues)).toBeTrue();
  });

  it('tests tool: seo_audit_performance', () => {
    const issues = auditPerformanceRisks(samplePageData);
    expect(Array.isArray(issues)).toBeTrue();
  });

  it('tests tool: seo_audit_schema', () => {
    const issues = auditSchema(samplePageData);
    expect(Array.isArray(issues)).toBeTrue();
  });

  it('tests tool: seo_audit_internal_links', () => {
    const result = auditInternalLinks(samplePageData);
    expect(result.issues).toBeDefined();
  });

  it('tests tool: seo_generate_full_audit', () => {
    const target = samplePageData.url || 'https://example.com';
    const report = generateAuditReport(target, samplePageData, []);
    expect(report.scores).toBeDefined();
    expect(report.scores.technical).toBeDefined();
  });

  it('tests tool: seo_generate_marketing_strategy', () => {
    const target = samplePageData.url || 'https://example.com';
    const strategy = generateMarketingStrategy(target, samplePageData, []);
    expect(strategy.marketingReadinessGrade).toBeDefined();
    expect(strategy.executionRoadmap).toBeDefined();
  });

  it('tests tool: seo_generate_code_fix', () => {
    const plan = generateCodeFix({
      filePath: 'package.json',
      title: 'Updated Title',
      metaDescription: 'Updated Meta Description',
      applyDirectly: false
    });
    expect(plan.status).toBeDefined();
  });

  it('tests tool: seo_validate_code_fix', async () => {
    const validation = await validateCodeFix('package.json');
    expect(validation.valid).toBeDefined();
  });

  it('tests tool: seo_suggest_related_ecosystem', () => {
    const target = samplePageData.url || 'https://example.com';
    const ecosystem = suggestRelatedEcosystem(target, samplePageData);
    expect(ecosystem.nicheProfile.vertical).toBeDefined();
    expect(ecosystem.competitorArchetypes.length).toBeGreaterThan(0);
  });

  it('tests tool: seo_test_web_mcp', async () => {
    const target = samplePageData.url || 'https://example.com';
    const result = await testWebMcpSupport(target, samplePageData);
    expect(result.targetUrl).toBe(target);
    expect(result.diagnostics).toBeDefined();
  });

  it('tests tool: seo_audit_sitemap_multipage', async () => {
    const result = await auditSitemapMultipage('https://example.com', {
      maxPages: 2
    });
    expect(result.target).toBeDefined();
  });

  it('tests tool: seo_audit_robots_and_sitemap', async () => {
    const robots = await fetchAndParseRobotsTxt('https://example.com');
    const sitemap = await fetchAndParseSitemap('https://example.com', robots);
    const security = await auditSecurityHeaders('https://example.com');
    expect(robots).toBeDefined();
    expect(sitemap).toBeDefined();
    expect(security).toBeDefined();
  });

  it('tests tool: seo_generate_sitemap_and_robots', () => {
    const sitemap = generateSitemapXml(['https://example.com/'], 'https://example.com');
    const robots = generateRobotsTxt({ sitemapUrl: 'https://example.com/sitemap.xml' });
    expect(sitemap).toContain('urlset');
    expect(robots).toContain('Sitemap:');
  });
});
