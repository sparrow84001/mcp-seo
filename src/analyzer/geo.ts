import type { AuditIssue, PageData } from '../types/index.ts';

export function auditGeo(page: PageData): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // 1. Organization / Brand Entity Definition Check
  const hasOrgSchema = page.schemas.some(
    (s) =>
      s.type === 'Organization' ||
      s.type === 'LocalBusiness' ||
      s.rawJson?.['@type'] === 'Organization' ||
      s.rawJson?.['@type'] === 'LocalBusiness'
  );

  if (!hasOrgSchema && (page.pageType === 'homepage' || page.pageType === 'about' || page.pageType === 'contact')) {
    issues.push({
      id: 'GEO_MISSING_ORG_SCHEMA',
      dimension: 'geo',
      title: 'Missing Organization / Brand Entity Structured Data',
      severity: 'high',
      priority: 'P1',
      priorityScore: 8.5,
      evidence: `No Organization or LocalBusiness JSON-LD schema found on ${page.pageType} page.`,
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters:
        'Generative AI models and knowledge graphs rely on structured Organization schemas to map brand identity, official website URL, logo, and social identities unambiguously.',
      recommendedSolution:
        'Implement Organization or LocalBusiness JSON-LD schema with name, url, logo, description, and sameAs profiles.',
      implementationApproach:
        'Add JSON-LD schema script containing @context: https://schema.org, @type: Organization, name, url, logo, sameAs: [...].',
      expectedImpact:
        'This provides clearer entity signals and may improve machine understanding in AI knowledge graphs.',
      effort: 'low'
    });
  }

  // 2. Entity Disambiguation (`sameAs` Social/Knowledge Graph reconciliation)
  if (hasOrgSchema) {
    const orgSchema = page.schemas.find(
      (s) =>
        s.type === 'Organization' ||
        s.type === 'LocalBusiness' ||
        s.rawJson?.['@type'] === 'Organization' ||
        s.rawJson?.['@type'] === 'LocalBusiness'
    );
    const sameAs = orgSchema?.rawJson?.sameAs;
    if (!sameAs || (Array.isArray(sameAs) && sameAs.length === 0)) {
      issues.push({
        id: 'GEO_MISSING_SAMEAS_ENTITIES',
        dimension: 'geo',
        title: 'Missing `sameAs` Disambiguation Links in Entity Schema',
        severity: 'medium',
        priority: 'P2',
        priorityScore: 6.5,
        evidence: 'Organization schema exists but lacks sameAs array linking to Wikidata, LinkedIn, Crunchbase, or verified social profiles.',
        evidenceType: 'confirmed',
        filePath: page.filePath,
        whyItMatters:
          'The sameAs property explicitly links your website entity to external authoritative knowledge repositories, establishing high-confidence entity identity across AI crawlers.',
        recommendedSolution:
          'Add sameAs URLs pointing to official LinkedIn, X/Twitter, Crunchbase, Wikipedia, or Google Business profile.',
        implementationApproach: 'Update Organization JSON-LD with "sameAs": ["https://linkedin.com/company/...", ...].',
        expectedImpact: 'Strengthens entity disambiguation and cross-platform authority signals.',
        effort: 'low'
      });
    }
  }

  // 3. Author / Person E-E-A-T Entity Signals (For Blogs and Articles)
  if (page.pageType === 'blog' || page.pageType === 'article') {
    const hasAuthorSchema = page.schemas.some(
      (s) =>
        s.type === 'Article' ||
        s.type === 'BlogPosting' ||
        s.rawJson?.['@type'] === 'Article' ||
        s.rawJson?.['@type'] === 'BlogPosting'
    );

    const hasAuthorMention = /written by|author|by\s+[A-Z][a-z]+/i.test(page.extractedText);

    if (!hasAuthorSchema && !hasAuthorMention) {
      issues.push({
        id: 'GEO_MISSING_AUTHOR_ENTITY',
        dimension: 'geo',
        title: 'Missing Explicit Author Entity and E-E-A-T Credentials',
        severity: 'medium',
        priority: 'P2',
        priorityScore: 7.0,
        evidence: 'No visible author byline or Article/Person structured data detected on article/blog page.',
        evidenceType: 'confirmed',
        filePath: page.filePath,
        whyItMatters:
          'Generative AI models and Google quality algorithms evaluate Experience, Expertise, Authoritativeness, and Trustworthiness (E-E-A-T) by tracking verifiable author entities and topical credentials.',
      recommendedSolution:
        'Include a visible author byline with bio/credentials and attach Article schema with author Person object.',
      implementationApproach:
        'Add author bio component and include author: { "@type": "Person", "name": "...", "url": "..." } in JSON-LD.',
      expectedImpact:
        'This can increase the likelihood of content being cited as a trusted primary source in AI summaries.',
      effort: 'low'
    });
    }
  }

  // 4. Business -> Service -> Location Relationship Chain Check
  if (page.pageType === 'service' || page.pageType === 'location') {
    const hasServiceSchema = page.schemas.some((s) => s.type === 'Service' || s.rawJson?.['@type'] === 'Service');
    if (!hasServiceSchema) {
      issues.push({
        id: 'GEO_MISSING_SERVICE_ENTITY',
        dimension: 'geo',
        title: 'Missing Service Entity Relationship in Schema',
        severity: 'medium',
        priority: 'P2',
        priorityScore: 6.5,
        evidence: `Page type "${page.pageType}" does not contain a Schema.org Service entity linking provider and areaServed.`,
        evidenceType: 'confirmed',
        filePath: page.filePath,
        whyItMatters:
          'Explicit Service schemas (with provider, serviceType, areaServed, and description) clarify the semantic relationship between what the business offers, who provides it, and where it is available.',
        recommendedSolution: 'Implement Service JSON-LD schema with provider and areaServed properties.',
        implementationApproach:
          'Add Service schema linking provider (Organization) and areaServed (AdministrativeArea / Place).',
        expectedImpact: 'Clarifies topical hierarchy and business offering to automated parsers.',
        effort: 'low'
      });
    }
  }

  return issues;
}
