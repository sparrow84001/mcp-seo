import type { AuditIssue, PageData } from '../types/index.ts';

export function auditLocalSeo(page: PageData, allPages?: PageData[]): AuditIssue[] {
  const issues: AuditIssue[] = [];

  const isLocalCandidate =
    page.pageType === 'location' ||
    page.pageType === 'city' ||
    page.pageType === 'area' ||
    page.pageType === 'state' ||
    page.pageType === 'contact' ||
    page.pageType === 'homepage';

  if (!isLocalCandidate) {
    return issues;
  }

  // 1. LocalBusiness Schema Check
  const localSchema = page.schemas.find(
    (s) =>
      s.type === 'LocalBusiness' ||
      s.type.endsWith('Business') ||
      s.type === 'Restaurant' ||
      s.type === 'Store' ||
      s.type === 'ProfessionalService' ||
      s.rawJson?.['@type'] === 'LocalBusiness' ||
      s.rawJson?.['@type']?.includes('Business')
  );

  if (!localSchema) {
    issues.push({
      id: 'LOCAL_NO_SCHEMA',
      dimension: 'local',
      title: 'Missing LocalBusiness Structured Data',
      severity: page.pageType === 'location' || page.pageType === 'city' ? 'high' : 'medium',
      priority: page.pageType === 'location' ? 'P1' : 'P2',
      priorityScore: 8.0,
      evidence: `No LocalBusiness JSON-LD schema found on ${page.pageType} page.`,
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters:
        'LocalBusiness structured data allows Google Maps, Apple Maps, and local search algorithms to verify physical address, service coordinates, opening hours, and phone numbers.',
      recommendedSolution:
        'Implement Schema.org/LocalBusiness with legal name, address (PostalAddress), telephone, geo (latitude/longitude), and opening hours.',
      implementationApproach:
        'Add JSON-LD script containing complete LocalBusiness schema.',
      expectedImpact: 'Improves visibility in Google Local 3-Pack and geo-targeted search results.',
      effort: 'low'
    });
  } else {
    // Validate schema properties
    const json = localSchema.rawJson || {};
    const missingProps: string[] = [];
    if (!json.address) missingProps.push('address');
    if (!json.telephone) missingProps.push('telephone');
    if (!json.geo) missingProps.push('geo (coordinates)');
    if (!json.openingHours && !json.openingHoursSpecification) missingProps.push('openingHours');

    if (missingProps.length > 0) {
      issues.push({
        id: 'LOCAL_INCOMPLETE_SCHEMA',
        dimension: 'local',
        title: `Incomplete LocalBusiness Schema (Missing: ${missingProps.join(', ')})`,
        severity: 'medium',
        priority: 'P2',
        priorityScore: 6.5,
        evidence: `LocalBusiness schema lacks key properties: ${missingProps.join(', ')}`,
        evidenceType: 'confirmed',
        filePath: page.filePath,
        whyItMatters:
          'Incomplete local schema prevents search engines from displaying rich local cards and verifying contact authenticity.',
        recommendedSolution: `Add missing fields (${missingProps.join(', ')}) to the LocalBusiness schema.`,
        implementationApproach: 'Update LocalBusiness JSON-LD object with full NAP + Geo details.',
        expectedImpact: 'Ensures schema validation compliance and eligibility for rich local snippets.',
        effort: 'low'
      });
    }
  }

  // 2. Visible NAP (Name, Address, Phone) Verification
  const text = page.extractedText;
  const hasPhone = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+?\d{10,13}/i.test(text);
  const hasAddressKeywords = /(street|st\.|road|rd\.|avenue|ave\.|suite|floor|pincode|zip|city|state|building|drive|dr\.)/i.test(text);

  if (!hasPhone) {
    issues.push({
      id: 'LOCAL_NO_VISIBLE_PHONE',
      dimension: 'local',
      title: 'Missing Visible Click-to-Call Phone Number',
      severity: 'medium',
      priority: 'P2',
      priorityScore: 7.0,
      evidence: 'No telephone number pattern detected in visible text.',
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters:
        'Visible, clickable telephone numbers (<a href="tel:...">) are essential for mobile user conversions and local search trust validation.',
      recommendedSolution: 'Add a clickable phone link in header and footer (e.g. <a href="tel:+1234567890">).',
      implementationApproach: 'Add tel: link to navigation or contact section.',
      expectedImpact: 'Directly boosts mobile call conversions and satisfies local NAP verification.',
      effort: 'low'
    });
  }

  if (!hasAddressKeywords && (page.pageType === 'location' || page.pageType === 'contact')) {
    issues.push({
      id: 'LOCAL_NO_VISIBLE_ADDRESS',
      dimension: 'local',
      title: 'Missing Physical Address Details on Location/Contact Page',
      severity: 'high',
      priority: 'P1',
      priorityScore: 7.5,
      evidence: 'No street address keywords or location signals found in page content.',
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters:
        'Local search engines require explicit on-page physical address matching Google Business Profile to rank in local map packs.',
      recommendedSolution: 'Display full physical business address matching official Google Business Profile exactly.',
      implementationApproach: 'Add standardized postal address in page body or footer.',
      expectedImpact: 'Establishes local geographic relevance for neighborhood and city searches.',
      effort: 'low'
    });
  }

  // 3. Location Landing Page Duplication Check
  if (allPages && (page.pageType === 'city' || page.pageType === 'location')) {
    const otherLocationPages = allPages.filter(
      (p) => (p.pageType === 'city' || p.pageType === 'location') && p.filePath !== page.filePath
    );

    for (const other of otherLocationPages) {
      // Compare word count and text similarity
      if (Math.abs(page.wordCount - other.wordCount) < 30 && page.wordCount > 0) {
        issues.push({
          id: 'LOCAL_POTENTIAL_CITY_PAGE_DUPLICATION',
          dimension: 'local',
          title: `Potential Template Duplication between Location Pages`,
          severity: 'medium',
          priority: 'P2',
          priorityScore: 6.0,
          evidence: `Page has almost identical length (${page.wordCount} words) to ${other.filePath || other.url}.`,
          evidenceType: 'inferred',
          filePath: page.filePath,
          whyItMatters:
            'Creating hundreds of near-identical city pages with simple keyword swapping is considered doorway/thin content by Google and risks search penalties.',
          recommendedSolution:
            'Ensure each location/city page has genuinely unique local information (local projects, testimonials, area landmarks, dedicated staff, local case studies).',
          implementationApproach: 'Add unique local case studies, local client reviews, and area-specific service notes.',
          expectedImpact: 'Prevents doorway page penalties and builds authentic local relevance.',
          effort: 'medium'
        });
        break;
      }
    }
  }

  return issues;
}
