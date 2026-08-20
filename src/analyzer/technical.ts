import type { AuditIssue, PageData, ProjectDiscoveryResult } from '../types/index.ts';

export function auditTechnicalSeo(
  page: PageData,
  discovery?: ProjectDiscoveryResult
): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // 1. Canonical Tag Check
  if (!page.canonical) {
    issues.push({
      id: 'TECH_NO_CANONICAL',
      dimension: 'technical',
      title: 'Missing Canonical Tag',
      severity: 'high',
      priority: 'P1',
      priorityScore: 8.5,
      evidence: page.filePath
        ? `No <link rel="canonical"> found in ${page.filePath}`
        : `No <link rel="canonical"> found on ${page.url || 'page'}`,
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters:
        'Without a self-referencing canonical URL, search engines may index multiple URL variations (HTTP/HTTPS, trailing slashes, tracking parameters), causing keyword cannibalization and dilution of page rank.',
      recommendedSolution: 'Add a self-referencing <link rel="canonical" href="..."> tag to the page head.',
      implementationApproach:
        page.framework === 'laravel'
          ? 'Add <link rel="canonical" href="{{ url()->current() }}" /> in the master Blade layout head or SEO component.'
          : page.framework === 'nextjs-app'
          ? 'Add alternates: { canonical: "./" } or full URL in export const metadata.'
          : 'Add <link rel="canonical" href="https://example.com/page" /> inside <head>.',
      expectedImpact: 'Prevents duplicate content issues and consolidates search ranking signals to the primary URL.',
      effort: 'low'
    });
  } else if (page.url && page.canonical !== page.url) {
    // Cross-URL canonical or mismatched protocol/trailing slash
    const normUrl = page.url.replace(/\/$/, '');
    const normCan = page.canonical.replace(/\/$/, '');
    if (normUrl !== normCan) {
      issues.push({
        id: 'TECH_CANONICAL_MISMATCH',
        dimension: 'technical',
        title: 'Canonical URL Does Not Match Current URL',
        severity: 'medium',
        priority: 'P2',
        priorityScore: 6.5,
        evidence: `Current URL: ${page.url}, Canonical Target: ${page.canonical}`,
        evidenceType: 'confirmed',
        filePath: page.filePath,
        whyItMatters:
          'Pointing the canonical to a different URL instructs search engines NOT to index this page and instead pass signals to the target.',
        recommendedSolution: 'Ensure the canonical URL points to the intended authoritative URL or self-references.',
        implementationApproach: 'Verify canonical URL logic in routing/metadata template.',
        expectedImpact: 'Ensures correct page indexation and prevents accidental de-indexing.',
        effort: 'low'
      });
    } else if (page.url !== page.canonical) {
      // Trailing slash discrepancy
      issues.push({
        id: 'TECH_CANONICAL_TRAILING_SLASH',
        dimension: 'technical',
        title: 'Trailing Slash Discrepancy Between Canonical and URL',
        severity: 'low',
        priority: 'P3',
        priorityScore: 4.5,
        evidence: `URL has ${page.url.endsWith('/') ? 'trailing slash' : 'no trailing slash'} while canonical is ${page.canonical}`,
        evidenceType: 'confirmed',
        filePath: page.filePath,
        whyItMatters: 'Inconsistent trailing slashes cause unnecessary redirect hops or duplicate URL indexing.',
        recommendedSolution: 'Standardize trailing slash policy across site routing and canonical links.',
        implementationApproach: 'Standardize URL generation helper in routing config.',
        expectedImpact: 'Consolidates indexing signals and eliminates redirect hops.',
        effort: 'low'
      });
    }
  }

  // 2. Meta Robots & Noindex Check
  if (page.metaRobots) {
    const lower = page.metaRobots.toLowerCase();
    if (lower.includes('noindex')) {
      issues.push({
        id: 'TECH_NOINDEX_ACTIVE',
        dimension: 'technical',
        title: 'Page Marked as NOINDEX',
        severity: page.pageType === 'homepage' || page.pageType === 'service' ? 'critical' : 'medium',
        priority: page.pageType === 'homepage' || page.pageType === 'service' ? 'P0' : 'P2',
        priorityScore: page.pageType === 'homepage' ? 9.8 : 6.0,
        evidence: `meta[name="robots"] content="${page.metaRobots}" found.`,
        evidenceType: 'confirmed',
        filePath: page.filePath,
        whyItMatters:
          'A noindex directive instructs search engine crawlers (Google, Bing) to completely remove this page from search results.',
        recommendedSolution:
          page.pageType === 'homepage' || page.pageType === 'service'
            ? 'Remove the noindex directive immediately unless this is an internal staging environment.'
            : 'Verify if this page was intentionally excluded from indexation.',
        implementationApproach: 'Update meta robots tag to index, follow in template.',
        expectedImpact: 'Restores search engine crawlability and indexation.',
        effort: 'low'
      });
    }
    if (lower.includes('nofollow')) {
      issues.push({
        id: 'TECH_NOFOLLOW_ACTIVE',
        dimension: 'technical',
        title: 'Page Marked as NOFOLLOW',
        severity: 'medium',
        priority: 'P2',
        priorityScore: 5.5,
        evidence: `meta[name="robots"] content="${page.metaRobots}" found.`,
        evidenceType: 'confirmed',
        filePath: page.filePath,
        whyItMatters: 'Nofollow tells crawlers not to follow internal or outgoing links on this page.',
        recommendedSolution: 'Change to follow unless specifically required for privacy/security reasons.',
        implementationApproach: 'Change robots meta to index, follow.',
        expectedImpact: 'Allows search engine crawlers to discover linked internal pages.',
        effort: 'low'
      });
    }
  }

  // 3. Robots.txt, Sitemap and LLMs.txt Discovery Checks
  if (discovery) {
    if (discovery.robotsTxtFiles.length === 0) {
      issues.push({
        id: 'TECH_NO_ROBOTS_TXT',
        dimension: 'technical',
        title: 'Missing robots.txt File',
        severity: 'medium',
        priority: 'P2',
        priorityScore: 6.0,
        evidence: 'No robots.txt found in public or root directory.',
        evidenceType: 'confirmed',
        whyItMatters:
          'Robots.txt tells web crawlers which URLs they can or cannot request, protects server resources, and advertises the XML sitemap.',
        recommendedSolution: 'Create a robots.txt file in the public root directory with sitemap reference.',
        implementationApproach: 'Add public/robots.txt with User-agent: * Allow: / and Sitemap: ...',
        expectedImpact: 'Provides clear crawling rules to Googlebot, Bingbot, and AI crawlers.',
        effort: 'low'
      });
    }

    if (discovery.sitemapFiles.length === 0) {
      issues.push({
        id: 'TECH_NO_SITEMAP',
        dimension: 'technical',
        title: 'Missing XML Sitemap',
        severity: 'high',
        priority: 'P1',
        priorityScore: 8.0,
        evidence: 'No sitemap.xml or dynamic sitemap generation detected in the project.',
        evidenceType: 'confirmed',
        whyItMatters:
          'XML sitemaps provide search engines with an authoritative roadmap of all indexable pages, their last modified dates, and priority.',
        recommendedSolution: 'Generate an XML sitemap (static sitemap.xml or framework dynamic route).',
        implementationApproach:
          discovery.framework === 'nextjs-app'
            ? 'Create app/sitemap.ts exporting default async function sitemap(): Promise<MetadataRoute.Sitemap>.'
            : discovery.framework === 'laravel'
            ? 'Use spatie/laravel-sitemap or create a dedicated sitemap route generating valid XML.'
            : 'Generate sitemap.xml in the public web root.',
        expectedImpact: 'Accelerates discovery and indexing of all new and updated pages.',
        effort: 'medium'
      });
    }

    if (discovery.llmsTxtFiles.length === 0) {
      issues.push({
        id: 'TECH_NO_LLMS_TXT',
        dimension: 'aeo',
        title: 'Missing llms.txt AI Discovery File',
        severity: 'low',
        priority: 'P3',
        priorityScore: 4.0,
        evidence: 'No llms.txt found in the project root or public folder.',
        evidenceType: 'recommended',
        whyItMatters:
          '/llms.txt is the 2025/2026 standard for LLM crawlers (Claude, Perplexity, OpenAI, Cursor) to ingest structured Markdown documentation of your site efficiently.',
        recommendedSolution: 'Create a public/llms.txt file summarizing the organization, key pages, and APIs.',
        implementationApproach: 'Generate public/llms.txt in Markdown format.',
        expectedImpact: 'Improves AI search engines and agentic coding tools understanding of the site.',
        effort: 'low'
      });
    }
  }

  // 4. Mixed Content Check (HTTP links on HTTPS)
  const insecureLinks = page.links.filter((l) => l.href.startsWith('http://'));
  const insecureImages = page.images.filter((img) => img.src.startsWith('http://'));
  if (insecureLinks.length > 0 || insecureImages.length > 0) {
    issues.push({
      id: 'TECH_MIXED_CONTENT',
      dimension: 'technical',
      title: 'Insecure HTTP Links/Assets on Page',
      severity: 'medium',
      priority: 'P2',
      priorityScore: 6.0,
      evidence: `Found ${insecureImages.length} HTTP image(s) and ${insecureLinks.length} HTTP link(s).`,
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters:
        'Loading insecure HTTP assets on HTTPS pages creates mixed-content warnings and harms user trust and browser security.',
      recommendedSolution: 'Upgrade all asset and link protocols to HTTPS or protocol-relative/relative paths.',
      implementationApproach: 'Replace http:// with https:// or relative paths in templates.',
      expectedImpact: 'Eliminates mixed content warnings and improves SSL security ranking signals.',
      effort: 'low'
    });
  }

  // 5. Mobile Viewport Meta Tag Check
  const rawHtml = page.rawHtml || '';
  const hasViewport = Boolean(page.viewport) || /name=["']viewport["']/i.test(rawHtml);
  if (!hasViewport && (page.filePath?.endsWith('.html') || page.filePath?.includes('layout') || page.url)) {
    issues.push({
      id: 'TECH_NO_VIEWPORT',
      dimension: 'technical',
      title: 'Missing Mobile Viewport Meta Tag',
      severity: 'high',
      priority: 'P1',
      priorityScore: 8.0,
      evidence: 'No <meta name="viewport" content="..."> tag detected in head.',
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters:
        'Without a mobile viewport tag, mobile devices render pages at desktop width, causing severe mobile usability failures in Google Mobile-First indexing.',
      recommendedSolution: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> inside <head>.',
      implementationApproach: 'Insert standard viewport meta tag in master HTML/layout head.',
      expectedImpact: 'Ensures mobile-first indexing compliance and responsive rendering.',
      effort: 'low'
    });
  }

  // 6. Charset Declaration Check
  const hasCharset = Boolean(page.charset) || /charset=["']?utf-8["']?/i.test(rawHtml);
  if (!hasCharset && (page.filePath?.endsWith('.html') || page.filePath?.includes('layout') || page.url)) {
    issues.push({
      id: 'TECH_NO_CHARSET',
      dimension: 'technical',
      title: 'Missing UTF-8 Character Encoding Meta Tag',
      severity: 'low',
      priority: 'P3',
      priorityScore: 4.0,
      evidence: 'No <meta charset="utf-8"> tag found at top of <head>.',
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters:
        'Early character encoding declaration prevents XSS vulnerabilities and ensures text/emojis render accurately across all browsers.',
      recommendedSolution: 'Add <meta charset="utf-8"> as the very first element inside <head>.',
      implementationApproach: 'Insert <meta charset="utf-8"> right after <head>.',
      expectedImpact: 'Guarantees reliable character rendering and HTML5 compliance.',
      effort: 'low'
    });
  }

  return issues;
}
