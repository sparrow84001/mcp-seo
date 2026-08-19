import type {
  AuditIssue,
  ContentGrade,
  PageData,
  SearchIntent
} from '../types/index.ts';

export function classifySearchIntent(page: PageData): SearchIntent {
  const text = (page.title + ' ' + page.extractedText).toLowerCase();

  if (/buy|order|purchase|hire|pricing|cost|checkout|sign up|book now|quote|add to cart/i.test(text)) {
    return 'transactional';
  }
  if (/best|top|vs|versus|review|compare|comparison|alternative|features/i.test(text)) {
    return 'commercial';
  }
  if (/login|signin|about|contact|portal|dashboard/i.test(text)) {
    return 'navigational';
  }
  return 'informational';
}

export function evaluateContentQuality(page: PageData): {
  intent: SearchIntent;
  grade: ContentGrade;
  issues: AuditIssue[];
} {
  const issues: AuditIssue[] = [];
  const intent = classifySearchIntent(page);

  // 1. Content Depth & Thin Content Check
  const minWordsByPageType: Record<string, number> = {
    article: 600,
    blog: 500,
    service: 350,
    product: 200,
    landing: 300,
    location: 300,
    about: 250,
    homepage: 300,
    faq: 200
  };

  const requiredMinWords = minWordsByPageType[page.pageType] || 250;

  if (page.wordCount < requiredMinWords) {
    issues.push({
      id: 'CONTENT_THIN_TEXT',
      dimension: 'content',
      title: `Thin Content Risk (${page.wordCount} words, recommended min: ${requiredMinWords})`,
      severity: page.wordCount < 100 ? 'critical' : 'high',
      priority: page.wordCount < 100 ? 'P0' : 'P1',
      priorityScore: page.wordCount < 100 ? 9.0 : 7.8,
      evidence: `Page only contains ${page.wordCount} words of readable body text.`,
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters:
        'Thin content signals low topical depth and lack of comprehensive answer to search engines (Google Helpful Content System), causing ranking suppression or soft-404 classification.',
      recommendedSolution: `Expand content depth to at least ${requiredMinWords}+ words covering key user questions, service benefits, and process details.`,
      implementationApproach: 'Add detailed feature breakdowns, FAQs, process timelines, and case study snippets.',
      expectedImpact: 'Improves topical authority and satisfies Google Helpful Content criteria.',
      effort: 'medium'
    });
  }

  // 2. E-E-A-T Trust & Experience Signals
  const text = page.extractedText.toLowerCase();
  const hasTrustSignals =
    /certified|years of experience|case study|results|guarantee|award|client|reviews|testimonials|rating|proven/i.test(
      text
    );

  if (!hasTrustSignals && ['service', 'product', 'landing', 'pricing'].includes(page.pageType)) {
    issues.push({
      id: 'CONTENT_LOW_EEAT_SIGNALS',
      dimension: 'content',
      title: 'Missing Visible E-E-A-T Trust & Experience Signals',
      severity: 'medium',
      priority: 'P2',
      priorityScore: 7.0,
      evidence: 'No explicit mentions of experience, certifications, client results, reviews, or guarantees detected in copy.',
      evidenceType: 'inferred',
      filePath: page.filePath,
      whyItMatters:
        'Google quality guidelines heavily weigh Experience, Expertise, Authoritativeness, and Trustworthiness. Lack of verifiable trust markers dampens both search rankings and buyer confidence.',
      recommendedSolution:
        'Add social proof: client testimonials, verified review ratings, industry certifications, and quantifiable client results.',
      implementationApproach: 'Integrate a Trust Signals component with real review snippets and stat callouts.',
      expectedImpact: 'Increases conversion rate and builds strong topical credibility.',
      effort: 'low'
    });
  }

  // 3. Image Alt Text & Media Depth
  const missingAltImages = page.images.filter((img) => !img.alt || img.alt.trim() === '');
  if (missingAltImages.length > 0) {
    issues.push({
      id: 'CONTENT_IMAGE_NO_ALT',
      dimension: 'content',
      title: `Missing Alt Text on ${missingAltImages.length} Image(s)`,
      severity: 'medium',
      priority: 'P2',
      priorityScore: 6.5,
      evidence: `Images without alt text: ${missingAltImages.slice(0, 3).map((i) => i.src).join(', ')}${
        missingAltImages.length > 3 ? '...' : ''
      }`,
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters:
        'Image alt text is mandatory for accessibility (WCAG) and provides Google Image search crawlers with semantic understanding of image context.',
      recommendedSolution: 'Add descriptive, contextual alt attributes to all content images (avoid keyword stuffing).',
      implementationApproach: 'Update <img> tags with descriptive alt="Detailed context description".',
      expectedImpact: 'Improves accessibility compliance and Google Images discoverability.',
      effort: 'low'
    });
  }

  // Determine Content Grade
  let grade: ContentGrade = 'good';
  if (page.wordCount < 100 || issues.some((i) => i.severity === 'critical')) {
    grade = 'critical';
  } else if (page.wordCount < requiredMinWords || issues.some((i) => i.severity === 'high')) {
    grade = 'poor';
  } else if (issues.length > 1) {
    grade = 'needs_improvement';
  } else if (page.wordCount >= 600 && hasTrustSignals) {
    grade = 'excellent';
  }

  return { intent, grade, issues };
}
