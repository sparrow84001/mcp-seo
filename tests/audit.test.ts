import { describe, it, expect } from 'bun:test';
import { extractPageDataFromHtml } from '../src/analyzer/crawler.ts';
import { auditTechnicalSeo } from '../src/analyzer/technical.ts';
import { auditOnPageSeo } from '../src/analyzer/onpage.ts';
import { evaluateContentQuality } from '../src/analyzer/content.ts';
import { generateAuditReport } from '../src/analyzer/report.ts';

describe('Audit Analyzer Suite', () => {
  it('should detect missing canonical, missing H1, and missing meta description', () => {
    const poorHtml = `
      <html>
      <head>
        <title>Home</title>
      </head>
      <body>
        <p>Short text</p>
      </body>
      </html>
    `;

    const page = extractPageDataFromHtml(poorHtml, {
      url: 'https://example.com',
      pageType: 'homepage',
      baseUrl: 'https://example.com'
    });

    const techIssues = auditTechnicalSeo(page);
    expect(techIssues.some((i) => i.id === 'TECH_NO_CANONICAL')).toBe(true);

    const onpageIssues = auditOnPageSeo(page);
    expect(onpageIssues.some((i) => i.id === 'ONPAGE_NO_H1')).toBe(true);
    expect(onpageIssues.some((i) => i.id === 'ONPAGE_NO_DESCRIPTION')).toBe(true);
    expect(onpageIssues.some((i) => i.id === 'ONPAGE_GENERIC_TITLE')).toBe(true);

    const contentEval = evaluateContentQuality(page);
    expect(contentEval.issues.some((i) => i.id === 'CONTENT_THIN_TEXT')).toBe(true);

    const allIssues = [...techIssues, ...onpageIssues, ...contentEval.issues];
    const report = generateAuditReport('https://example.com', page, allIssues);

    expect(report.scores.seo.score).toBeLessThan(60);
    expect(report.scores.technical.weightPercent).toBe(20);
    expect(report.criticalProblems.length).toBeGreaterThan(0);
    expect(report.marketingStrategy).toBeDefined();
    expect(report.marketingStrategy?.audienceMapping.searchIntent).toBeDefined();
    expect(report.implementationPlan.phase1.length).toBeGreaterThan(0);
  });
});
