import { describe, it, expect } from 'bun:test';
import { extractPageDataFromHtml } from '../src/analyzer/crawler.ts';
import { auditTechnicalSeo } from '../src/analyzer/technical.ts';
import { auditOnPageSeo } from '../src/analyzer/onpage.ts';
import { evaluateContentQuality } from '../src/analyzer/content.ts';
import { generateMarketingStrategy, formatMarketingStrategyToMarkdown } from '../src/analyzer/strategy.ts';
import { generateAuditReport } from '../src/analyzer/report.ts';

describe('Digital Marketing Strategy & Weighted Scorecard Suite', () => {
  it('should generate a comprehensive digital marketing strategy with CRO and AEO blueprints', () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Enterprise Cloud Security Platform | CyberDefense</title>
        <meta name="description" content="Protect cloud workloads and Kubernetes clusters with AI-driven threat prevention and real-time posture management." />
        <link rel="canonical" href="https://example.com/pricing" />
      </head>
      <body>
        <main>
          <h1>Enterprise Cloud Security Pricing & Plans</h1>
          <p>Deploy zero-trust network access, real-time threat scanning, and continuous compliance across multi-cloud environments.</p>
          <h2>How Much Does Cloud Security Software Cost?</h2>
          <p>Enterprise cloud security platform is an end-to-end cyber defense system that delivers automated compliance and threat hunting for modern IT teams.</p>
          <a href="/checkout" class="btn btn-primary">Start Free 14-Day Trial</a>
        </main>
      </body>
      </html>
    `;

    const pageData = extractPageDataFromHtml(html, {
      url: 'https://example.com/pricing',
      pageType: 'pricing',
      baseUrl: 'https://example.com'
    });

    const issues = [
      ...auditTechnicalSeo(pageData),
      ...auditOnPageSeo(pageData),
      ...evaluateContentQuality(pageData).issues
    ];

    const strategy = generateMarketingStrategy('https://example.com/pricing', pageData, issues);

    expect(strategy.marketingReadinessGrade).toBeDefined();
    expect(strategy.audienceMapping.funnelStage).toContain('BoFu');
    expect(strategy.croOptimizationPlan.primaryCtaRecommendation).toBeDefined();
    expect(strategy.croOptimizationPlan.riskReversalOffer).toBeDefined();
    expect(strategy.aeoAiSearchPlaybook.targetQuestions.length).toBeGreaterThan(0);
    expect(strategy.executionRoadmap.days1To30.length).toBeGreaterThan(0);
    expect(strategy.executionRoadmap.days31To60.length).toBeGreaterThan(0);
    expect(strategy.executionRoadmap.days61To90.length).toBeGreaterThan(0);

    const markdown = formatMarketingStrategyToMarkdown(strategy);
    expect(markdown).toContain('Digital Marketing Strategy & Growth Blueprint');
    expect(markdown).toContain('Audience & Search Intent Mapping');
    expect(markdown).toContain('30-60-90 Day Marketing Execution Roadmap');

    const report = generateAuditReport('https://example.com/pricing', pageData, issues);
    expect(report.scores.overall).toBeGreaterThanOrEqual(0);
    expect(report.scores.technical.weightPercent).toBe(20);
    expect(report.scores.seo.weightPercent).toBe(15);
    expect(report.marketingStrategy).toBeDefined();
  });
});
