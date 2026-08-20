import type { AuditIssue, PageData } from '../types/index.ts';

export function auditOnPageSeo(page: PageData): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // 1. Title Tag Audit
  if (!page.title || page.title.trim() === '') {
    issues.push({
      id: 'ONPAGE_NO_TITLE',
      dimension: 'seo',
      title: 'Missing Page Title Tag',
      severity: 'critical',
      priority: 'P0',
      priorityScore: 9.5,
      evidence: page.filePath ? `No <title> tag found in ${page.filePath}` : 'Page has no title tag.',
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters:
        'The title tag is one of the strongest on-page ranking signals and directly controls the headline shown in search engine results (SERP) and AI snippets.',
      recommendedSolution: 'Add a unique, descriptive, keyword-optimized title (50-60 characters).',
      implementationApproach:
        page.framework === 'laravel'
          ? "@section('title', 'Primary Keyword - Secondary Benefit | Brand Name')"
          : page.framework === 'nextjs-app'
          ? "export const metadata: Metadata = { title: 'Primary Keyword - Secondary Benefit | Brand Name' };"
          : '<title>Primary Keyword - Secondary Benefit | Brand Name</title>',
      expectedImpact: 'Immediate improvement in keyword relevance, search impressions, and CTR.',
      effort: 'low'
    });
  } else {
    const titleLen = page.title.length;
    const genericTitles = ['home', 'homepage', 'index', 'untitled', 'document', 'page', 'welcome'];
    if (genericTitles.includes(page.title.toLowerCase().trim())) {
      issues.push({
        id: 'ONPAGE_GENERIC_TITLE',
        dimension: 'seo',
        title: `Generic Title Tag: "${page.title}"`,
        severity: 'high',
        priority: 'P1',
        priorityScore: 8.5,
        evidence: `Title tag content is "${page.title}"`,
        evidenceType: 'confirmed',
        filePath: page.filePath,
        whyItMatters:
          'Generic titles waste prime SERP real estate, fail to convey page intent, and severely hurt organic ranking capability.',
        recommendedSolution: 'Replace with a specific title targeting page intent and core service/offering.',
        implementationApproach: 'Update title tag to include primary service + target location/benefit + brand.',
        expectedImpact: 'Dramatically improves ranking relevance for target search queries.',
        effort: 'low'
      });
    } else if (titleLen < 30) {
      issues.push({
        id: 'ONPAGE_SHORT_TITLE',
        dimension: 'seo',
        title: `Title Tag Too Short (${titleLen} chars)`,
        severity: 'medium',
        priority: 'P2',
        priorityScore: 6.0,
        evidence: `Title: "${page.title}" (${titleLen} characters, recommended: 50-60)`,
        evidenceType: 'confirmed',
        filePath: page.filePath,
        whyItMatters:
          'Short titles underutilize available SERP character width and miss opportunities to target secondary search intent or location modifiers.',
        recommendedSolution: 'Expand title to 50-60 characters by adding target keyword context and brand modifier.',
        implementationApproach: 'Refine title in template or metadata export.',
        expectedImpact: 'Increases topical coverage and SERP prominence.',
        effort: 'low'
      });
    } else if (titleLen > 65) {
      issues.push({
        id: 'ONPAGE_LONG_TITLE',
        dimension: 'seo',
        title: `Title Tag Too Long (${titleLen} chars)`,
        severity: 'low',
        priority: 'P3',
        priorityScore: 4.5,
        evidence: `Title: "${page.title}" (${titleLen} characters, recommended max: 60)`,
        evidenceType: 'confirmed',
        filePath: page.filePath,
        whyItMatters:
          'Titles exceeding 60-65 characters or ~600px pixel width get truncated with an ellipsis (...) in Google search results, hurting click-through rate.',
        recommendedSolution: 'Shorten title to 50-60 characters while keeping the most critical keywords near the front.',
        implementationApproach: 'Condense title in template or metadata export.',
        expectedImpact: 'Eliminates SERP truncation and maximizes CTR.',
        effort: 'low'
      });
    }
  }

  // 2. Meta Description Audit
  if (!page.metaDescription || page.metaDescription.trim() === '') {
    issues.push({
      id: 'ONPAGE_NO_DESCRIPTION',
      dimension: 'seo',
      title: 'Missing Meta Description',
      severity: 'high',
      priority: 'P1',
      priorityScore: 8.0,
      evidence: page.filePath ? `No meta description in ${page.filePath}` : 'Page has no meta description.',
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters:
        'Without a meta description, search engines auto-generate snippets from random page text, often producing disjointed or low-converting snippets in search results.',
      recommendedSolution: 'Add an action-oriented meta description between 130-160 characters containing a compelling CTA.',
      implementationApproach:
        page.framework === 'laravel'
          ? "@section('meta_description', 'Compelling 150-char description with clear value proposition and CTA.')"
          : page.framework === 'nextjs-app'
          ? "description: 'Compelling 150-char description with clear value proposition and CTA.'"
          : '<meta name="description" content="..." />',
      expectedImpact: 'Improves organic CTR by up to 15-25% through clear SERP communication.',
      effort: 'low'
    });
  } else {
    const descLen = page.metaDescription.length;
    if (descLen < 70) {
      issues.push({
        id: 'ONPAGE_SHORT_DESCRIPTION',
        dimension: 'seo',
        title: `Meta Description Too Short (${descLen} chars)`,
        severity: 'medium',
        priority: 'P2',
        priorityScore: 5.5,
        evidence: `Description: "${page.metaDescription}" (${descLen} chars, recommended: 130-160)`,
        evidenceType: 'confirmed',
        filePath: page.filePath,
        whyItMatters:
          'Short descriptions fail to provide sufficient context to entice searchers and answer search intent.',
        recommendedSolution: 'Expand description to 130-160 characters with benefit, trust signal, and call to action.',
        implementationApproach: 'Update meta description tag in page template.',
        expectedImpact: 'Boosts snippet appeal and click-through rates.',
        effort: 'low'
      });
    } else if (descLen > 165) {
      issues.push({
        id: 'ONPAGE_LONG_DESCRIPTION',
        dimension: 'seo',
        title: `Meta Description Too Long (${descLen} chars)`,
        severity: 'low',
        priority: 'P3',
        priorityScore: 4.0,
        evidence: `Description length is ${descLen} characters (exceeds Google snippet limit ~160 chars).`,
        evidenceType: 'confirmed',
        filePath: page.filePath,
        whyItMatters: 'Descriptions over 160 characters get truncated in Google desktop and mobile SERPs.',
        recommendedSolution: 'Trim description to 130-155 characters.',
        implementationApproach: 'Shorten description in template.',
        expectedImpact: 'Clean, untruncated display in search results.',
        effort: 'low'
      });
    }
  }

  // 3. Headings Hierarchy (H1-H6)
  const emptyHeadings = page.headings.filter((h) => !h.text || h.text.trim() === '');
  if (emptyHeadings.length > 0) {
    issues.push({
      id: 'ONPAGE_EMPTY_HEADING',
      dimension: 'seo',
      title: `Found ${emptyHeadings.length} Empty Heading Tag(s)`,
      severity: 'medium',
      priority: 'P2',
      priorityScore: 6.0,
      evidence: `Page contains ${emptyHeadings.length} empty <h1-h6> tags without text content.`,
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters: 'Empty heading tags degrade accessibility and dilute content structure signals to search engines.',
      recommendedSolution: 'Remove empty heading tags or provide meaningful section titles.',
      implementationApproach: 'Delete unused empty heading tags in template.',
      expectedImpact: 'Improves accessibility and DOM cleanliness.',
      effort: 'low'
    });
  }

  if (page.h1Count === 0) {
    issues.push({
      id: 'ONPAGE_NO_H1',
      dimension: 'seo',
      title: 'Missing H1 Heading',
      severity: 'high',
      priority: 'P1',
      priorityScore: 8.5,
      evidence: `Found 0 <h1> tags on page. Total headings: ${page.headings.length}`,
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters:
        'The H1 heading is the primary structural semantic indicator of page topic for both human users, search engine algorithms, and screen readers.',
      recommendedSolution: 'Add exactly one clear, topic-focused <h1> heading containing the primary keyword.',
      implementationApproach: 'Add <h1>Target Topic / Service Title</h1> at the top of the main content area.',
      expectedImpact: 'Clarifies topical focus for search engines and improves content accessibility.',
      effort: 'low'
    });
  } else if (page.h1Count > 1) {
    issues.push({
      id: 'ONPAGE_MULTIPLE_H1',
      dimension: 'seo',
      title: `Multiple H1 Headings (${page.h1Count} found)`,
      severity: 'medium',
      priority: 'P2',
      priorityScore: 6.0,
      evidence: `Found ${page.h1Count} <h1> headings: ${page.headings
        .filter((h) => h.level === 1)
        .map((h) => `"${h.text}"`)
        .join(', ')}`,
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters:
        'Multiple H1s dilute the primary topic signal and often reflect improper semantic styling where H1 is used for visual size rather than content hierarchy.',
      recommendedSolution: 'Retain only one primary H1 and convert secondary section titles to H2 or H3.',
      implementationApproach: 'Change secondary <h1> tags to <h2> in template.',
      expectedImpact: 'Creates a clean, accessible heading hierarchy.',
      effort: 'low'
    });
  }

  // Check Heading Hierarchy Skipping (e.g. H1 -> H3 without H2)
  let prevLevel = 0;
  for (const h of page.headings) {
    if (prevLevel > 0 && h.level > prevLevel + 1) {
      issues.push({
        id: 'ONPAGE_HEADING_SKIPPED',
        dimension: 'seo',
        title: `Skipped Heading Level: H${prevLevel} directly to H${h.level}`,
        severity: 'low',
        priority: 'P3',
        priorityScore: 3.5,
        evidence: `Heading "${h.text}" is <h${h.level}> following a <h${prevLevel}> without intermediate <h${
          prevLevel + 1
        }>.`,
        evidenceType: 'confirmed',
        filePath: page.filePath,
        whyItMatters: 'Skipping heading levels breaks accessibility standards (WCAG) and confuses assistive technology.',
        recommendedSolution: `Adjust heading to <h${prevLevel + 1}> or reorganize section hierarchy.`,
        implementationApproach: 'Update HTML heading tag level.',
        expectedImpact: 'Improves semantic accessibility and content architecture.',
        effort: 'low'
      });
      break;
    }
    prevLevel = h.level;
  }

  // 4. Social Cards (OpenGraph & Twitter)
  const hasOgTitle = Boolean(page.ogTags['og:title']);
  const hasOgDesc = Boolean(page.ogTags['og:description']);
  const hasOgImage = Boolean(page.ogTags['og:image']);
  const hasTwitterCard = Boolean(page.twitterTags['twitter:card']);

  if (!hasOgTitle || !hasOgDesc || !hasOgImage) {
    issues.push({
      id: 'ONPAGE_INCOMPLETE_OG',
      dimension: 'seo',
      title: 'Incomplete Open Graph (og:*) Meta Tags',
      severity: 'medium',
      priority: 'P2',
      priorityScore: 6.5,
      evidence: `Missing: ${[!hasOgTitle && 'og:title', !hasOgDesc && 'og:description', !hasOgImage && 'og:image']
        .filter(Boolean)
        .join(', ')}`,
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters:
        'When URLs are shared on LinkedIn, Facebook, Slack, WhatsApp, or iMessage, missing OpenGraph tags result in broken link previews without images or headlines.',
      recommendedSolution: 'Add full OpenGraph tags (og:title, og:description, og:image 1200x630, og:url, og:type).',
      implementationApproach:
        page.framework === 'nextjs-app'
          ? 'Add openGraph: { title, description, images: [{ url, width: 1200, height: 630 }] } to metadata.'
          : 'Add standard <meta property="og:..." content="..." /> tags in layout head.',
      expectedImpact: 'Dramatically improves social sharing click-through and professional brand presentation.',
      effort: 'low'
    });
  }

  if (!hasTwitterCard) {
    issues.push({
      id: 'ONPAGE_NO_TWITTER_CARD',
      dimension: 'seo',
      title: 'Missing Twitter Card Meta Tags',
      severity: 'low',
      priority: 'P3',
      priorityScore: 4.0,
      evidence: 'No meta[name="twitter:card"] found.',
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters: 'Twitter/X requires twitter:card=summary_large_image to render rich cards.',
      recommendedSolution: 'Add <meta name="twitter:card" content="summary_large_image" />.',
      implementationApproach: 'Include in master layout head.',
      expectedImpact: 'Enables rich media previews on X (Twitter).',
      effort: 'low'
    });
  }

  return issues;
}
