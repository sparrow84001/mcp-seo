import { describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  isPathAllowed,
  fetchAndParseRobotsTxt,
  fetchAndParseSitemap,
  auditSecurityHeaders,
  generateSitemapXml,
  generateRobotsTxt,
  auditSitemapMultipage,
  formatMultipageReportToMarkdown
} from '../src/analyzer/sitemap-crawler.ts';
import type { RobotsRule } from '../src/types/index.ts';

describe('Sitemap & Robots.txt Deep Crawler & Security Suite', () => {
  it('correctly evaluates robots.txt allow and disallow rule patterns and agent precedence', () => {
    const rules: RobotsRule[] = [
      {
        userAgent: '*',
        allow: ['/public/', '/products/featured'],
        disallow: ['/admin/', '/private/', '/tmp/*', '/*.pdf$']
      },
      {
        userAgent: 'Googlebot',
        allow: ['/'],
        disallow: ['/admin/secret']
      }
    ];

    // Testing Googlebot (specific precedence)
    expect(isPathAllowed('https://example.com/about', 'Googlebot', rules)).toBeTrue();
    expect(isPathAllowed('https://example.com/admin/secret', 'Googlebot', rules)).toBeFalse();

    // Testing other bot (fallback to wildcard *)
    expect(isPathAllowed('https://example.com/admin/dashboard', 'Bingbot', rules)).toBeFalse();
    expect(isPathAllowed('https://example.com/private/data', 'Bingbot', rules)).toBeFalse();
    expect(isPathAllowed('https://example.com/public/landing', 'Bingbot', rules)).toBeTrue();
    expect(isPathAllowed('https://example.com/document.pdf', 'Bingbot', rules)).toBeFalse();
    expect(isPathAllowed('https://example.com/document.pdf.html', 'Bingbot', rules)).toBeTrue();
  });

  it('parses robots.txt content, extracts directives, and flags blocked CSS/JS and missing sitemaps', async () => {
    const tempRobots = path.resolve('tests/temp_robots.txt');
    fs.writeFileSync(
      tempRobots,
      `User-agent: *
Disallow: /admin/
Disallow: /assets/*.css
Disallow: /static/*.js

User-agent: GPTBot
Disallow: /

Sitemap: https://example.com/sitemap.xml
Sitemap: https://example.com/sitemap-blogs.xml
`,
      'utf8'
    );

    const result = await fetchAndParseRobotsTxt(tempRobots);
    expect(result.exists).toBeTrue();
    expect(result.sitemapUrls.length).toBe(2);
    expect(result.sitemapUrls[0]).toBe('https://example.com/sitemap.xml');
    expect(result.disallowedPathsForAiBots).toContain('gptbot');

    const assetIssue = result.issues.find((i) => i.id === 'ROBOTS_BLOCKING_ASSETS');
    expect(assetIssue).toBeDefined();

    if (fs.existsSync(tempRobots)) {
      fs.unlinkSync(tempRobots);
    }
  });

  it('parses XML sitemaps, extracts URLs and flags contradictions with robots.txt', async () => {
    const tempSitemap = path.resolve('tests/temp_sitemap.xml');
    fs.writeFileSync(
      tempSitemap,
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-08-29</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/services</loc>
    <lastmod>2026-08-28</lastmod>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://example.com/admin/hidden</loc>
    <lastmod>2026-08-27</lastmod>
    <priority>0.5</priority>
  </url>
</urlset>`,
      'utf8'
    );

    const mockRobots = {
      exists: true,
      rules: [
        {
          userAgent: '*',
          allow: ['/'],
          disallow: ['/admin/']
        }
      ],
      sitemapUrls: ['https://example.com/sitemap.xml'],
      disallowedPathsForGooglebot: ['/admin/'],
      disallowedPathsForAiBots: [],
      issues: []
    };

    const sitemapRes = await fetchAndParseSitemap(tempSitemap, mockRobots);
    expect(sitemapRes.exists).toBeTrue();
    expect(sitemapRes.totalUrls).toBe(3);
    expect(sitemapRes.entries[0]?.isAllowedByRobots).toBeTrue();
    expect(sitemapRes.entries[2]?.isAllowedByRobots).toBeFalse();

    const contradictionIssue = sitemapRes.issues.find((i) => i.id === 'SITEMAP_CONTAINS_DISALLOWED_URLS');
    expect(contradictionIssue).toBeDefined();

    if (fs.existsSync(tempSitemap)) {
      fs.unlinkSync(tempSitemap);
    }
  });

  it('accurately audits HTTP security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)', async () => {
    const headers = {
      'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
      'content-security-policy': "default-src 'self'",
      'x-frame-options': 'SAMEORIGIN',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin'
    };

    const analysis = await auditSecurityHeaders('https://example.com', headers);
    expect(analysis.isHttps).toBeTrue();
    expect(analysis.hsts.isValid).toBeTrue();
    expect(analysis.xFrameOptions.isValid).toBeTrue();
    expect(analysis.xContentTypeOptions.isValid).toBeTrue();
    expect(analysis.score).toBe(100);
    expect(analysis.grade).toBe('A+');
    expect(analysis.issues.length).toBe(0);

    // Weak / Missing headers test
    const weakHeaders = {
      'strict-transport-security': 'max-age=300'
    };
    const weakAnalysis = await auditSecurityHeaders('http://insecure-example.com', weakHeaders);
    expect(weakAnalysis.isHttps).toBeFalse();
    expect(weakAnalysis.hsts.isValid).toBeFalse();
    expect(weakAnalysis.score).toBeLessThan(50);
    expect(weakAnalysis.issues.some((i) => i.id === 'SEC_MISSING_CSP')).toBeTrue();
  });

  it('generates standard-compliant sitemap.xml and robots.txt files', () => {
    const sitemap = generateSitemapXml(['https://mysite.com', '/pricing', '/about'], 'https://mysite.com');
    expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(sitemap).toContain('<loc>https://mysite.com/pricing</loc>');
    expect(sitemap).toContain('<loc>https://mysite.com/about</loc>');

    const robots = generateRobotsTxt({
      sitemapUrl: 'https://mysite.com/sitemap.xml',
      disallowedPaths: ['/admin/', '/private/']
    });
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Disallow: /admin/');
    expect(robots).toContain('Sitemap: https://mysite.com/sitemap.xml');
    expect(robots).toContain('User-agent: GPTBot');
    expect(robots).toContain('User-agent: ClaudeBot');
  });

  it('executes batch multi-page audit and compiles site-wide scorecard report', async () => {
    const tempHtmlFile = path.resolve('tests/temp_page1.html');
    fs.writeFileSync(
      tempHtmlFile,
      `<!DOCTYPE html>
<html>
<head>
  <title>Landing Page Service</title>
  <meta name="description" content="Quality digital marketing and SEO growth services." />
  <link rel="canonical" href="https://example.com/page1" />
  <link rel="mcp-server" href="/mcp" />
</head>
<body>
  <h1>Digital Growth Platform</h1>
</body>
</html>`,
      'utf8'
    );

    const result = await auditSitemapMultipage(tempHtmlFile, { maxPages: 5 });
    expect(result.totalAuditedPages).toBeGreaterThanOrEqual(1);
    expect(result.pageAudits[0]?.hasH1).toBeTrue();
    expect(result.pageAudits[0]?.hasCanonical).toBeTrue();
    expect(result.pageAudits[0]?.hasWebMcp).toBeTrue();

    const markdown = formatMultipageReportToMarkdown(result);
    expect(markdown).toContain('Multi-Page Site-Wide Sitemap, Robots & Security Audit');
    expect(markdown).toContain('HTTP Security & Trust Headers Scorecard');
    expect(markdown).toContain('Audited Pages Breakdown Table');

    if (fs.existsSync(tempHtmlFile)) {
      fs.unlinkSync(tempHtmlFile);
    }
  });
});