import type { AuditIssue, PageData } from '../types/index.ts';

export function auditSchema(page: PageData): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // 1. Check for Syntax / Parsing Errors in JSON-LD
  for (const s of page.schemas) {
    if (!s.isValid) {
      issues.push({
        id: 'SCHEMA_INVALID_JSON',
        dimension: 'seo',
        title: 'Malformed JSON-LD Script in HTML',
        severity: 'critical',
        priority: 'P0',
        priorityScore: 9.0,
        evidence: `JSON-LD parsing error: ${s.validationErrors?.join(', ')}`,
        evidenceType: 'confirmed',
        filePath: page.filePath,
        whyItMatters:
          'Invalid JSON-LD syntax causes search engines and AI parsers to reject all structured data on the page completely.',
        recommendedSolution: 'Fix JSON syntax (ensure double quotes on keys, remove trailing commas).',
        implementationApproach: 'Validate JSON-LD with JSON.parse and format properly.',
        expectedImpact: 'Restores schema interpretation for Google Rich Results.',
        effort: 'low'
      });
    }
  }

  // 2. BreadcrumbList Schema Check
  const hasBreadcrumbSchema = page.schemas.some(
    (s) => s.type === 'BreadcrumbList' || s.rawJson?.['@type'] === 'BreadcrumbList'
  );
  if (!hasBreadcrumbSchema && page.pageType !== 'homepage') {
    issues.push({
      id: 'SCHEMA_NO_BREADCRUMBS',
      dimension: 'seo',
      title: 'Missing BreadcrumbList Structured Data',
      severity: 'low',
      priority: 'P3',
      priorityScore: 4.5,
      evidence: `No BreadcrumbList schema found on non-homepage (${page.pageType}).`,
      evidenceType: 'recommended',
      filePath: page.filePath,
      whyItMatters:
        'BreadcrumbList schema enhances SERP listings by displaying the hierarchy path (e.g. Home > Services > Web Design) instead of a raw URL slug.',
      recommendedSolution: 'Implement Schema.org/BreadcrumbList JSON-LD representing the URL structure.',
      implementationApproach: 'Add BreadcrumbList schema with itemListElement array.',
      expectedImpact: 'Improves SERP snippet display and mobile click-through rate.',
      effort: 'low'
    });
  }

  // 3. Schema Type Alignment with Page Type
  if (page.pageType === 'product') {
    const hasProductSchema = page.schemas.some(
      (s) => s.type === 'Product' || s.rawJson?.['@type'] === 'Product'
    );
    if (!hasProductSchema) {
      issues.push({
        id: 'SCHEMA_MISSING_PRODUCT',
        dimension: 'seo',
        title: 'Missing Product Schema on Product Page',
        severity: 'high',
        priority: 'P1',
        priorityScore: 8.0,
        evidence: 'Page classified as "product" has no Product structured data.',
        evidenceType: 'confirmed',
        filePath: page.filePath,
        whyItMatters:
          'Product schema enables rich product snippets in Google Shopping and search (price, in-stock badge, star ratings).',
        recommendedSolution: 'Add Product schema with name, image, description, offers (price, availability).',
        implementationApproach: 'Inject Product JSON-LD.',
        expectedImpact: 'Enables rich product snippet pricing and merchant center visibility.',
        effort: 'low'
      });
    }
  }

  return issues;
}
