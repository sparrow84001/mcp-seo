import type { AuditIssue, PageData } from '../types/index.ts';

export function auditAeo(page: PageData): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // 1. Question-Based Headings Check
  const questionHeadings = page.headings.filter((h) =>
    /^(what|how|why|when|where|who|which|can|is|are|does|do|should|cost|pricing)\b/i.test(h.text.trim()) ||
    h.text.includes('?')
  );

  if (questionHeadings.length === 0 && ['service', 'product', 'blog', 'article', 'landing', 'faq'].includes(page.pageType)) {
    issues.push({
      id: 'AEO_NO_QUESTION_HEADINGS',
      dimension: 'aeo',
      title: 'Missing Question-Based Headings for Answer Engine Optimization',
      severity: 'medium',
      priority: 'P2',
      priorityScore: 7.0,
      evidence: `Found ${page.headings.length} headings, but 0 question-formatted headings (What is..., How to..., Why...).`,
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters:
        'Answer engines (Google AI Overviews, Perplexity, ChatGPT Search) match natural language user queries directly to question-phrased headings in web content.',
      recommendedSolution:
        'Convert key subheadings into natural conversational questions (e.g., "What are the benefits of [Service]?", "How does [Product] work?").',
      implementationApproach: 'Add H2/H3 question headers followed immediately by direct 40-60 word answers.',
      expectedImpact:
        'This may increase the likelihood of the page being extracted as a cited source in AI answer engines.',
      effort: 'medium'
    });
  }

  // 2. Direct Answer Conciseness Check
  // Check if first paragraph under headings contains a concise definition
  let hasDirectAnswerBlock = false;
  for (const p of page.paragraphs) {
    const wordCount = p.split(/\s+/).length;
    // Ideal snippet definition is 35 - 75 words
    if (wordCount >= 30 && wordCount <= 80 && /^(is a|is the|refers to|means|provides|helps|allows|works by)/i.test(p)) {
      hasDirectAnswerBlock = true;
      break;
    }
  }

  if (!hasDirectAnswerBlock && ['service', 'blog', 'article', 'comparison'].includes(page.pageType)) {
    issues.push({
      id: 'AEO_NO_DIRECT_ANSWER_BLOCK',
      dimension: 'aeo',
      title: 'Missing Concise Definition / Direct Answer Block',
      severity: 'medium',
      priority: 'P2',
      priorityScore: 6.5,
      evidence: 'No paragraph between 35-80 words providing a direct definition/summary statement was detected.',
      evidenceType: 'inferred',
      filePath: page.filePath,
      whyItMatters:
        'AI Overviews and Featured Snippets prioritize self-contained, 40-60 word definitive summary sentences placed immediately under topic headings.',
      recommendedSolution:
        'Include a concise 2-3 sentence definition/summary block right after the primary topic heading before expanding into longer content.',
      implementationApproach: 'Insert a crisp, fact-rich summary paragraph answering the core query directly.',
      expectedImpact: 'Improves entity understanding and featured snippet capture rate.',
      effort: 'low'
    });
  }

  // 3. FAQ Section & FAQPage Schema Alignment
  const hasFaqHeading = page.headings.some((h) => /faq|frequently asked questions/i.test(h.text));
  const hasFaqSchema = page.schemas.some((s) => s.type === 'FAQPage' || s.rawJson?.['@type'] === 'FAQPage');

  if (hasFaqHeading && !hasFaqSchema) {
    issues.push({
      id: 'AEO_FAQ_WITHOUT_SCHEMA',
      dimension: 'aeo',
      title: 'Visible FAQ Section Missing FAQPage JSON-LD Schema',
      severity: 'medium',
      priority: 'P2',
      priorityScore: 7.5,
      evidence: 'Found FAQ heading in content, but no FAQPage structured data was found in JSON-LD.',
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters:
        'Providing FAQPage JSON-LD structured data alongside visible FAQs enables AI engines and search crawlers to parse Question-and-Answer pairs deterministically.',
      recommendedSolution: 'Add valid FAQPage JSON-LD structured data matching the visible Q&A text.',
      implementationApproach:
        'Inject <script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[...]}</script>.',
      expectedImpact: 'Provides clear machine-readable Q&A entity pairs for generative assistants and search engines.',
      effort: 'low'
    });
  } else if (!hasFaqHeading && ['service', 'product', 'landing', 'pricing'].includes(page.pageType)) {
    issues.push({
      id: 'AEO_NO_FAQ_OPPORTUNITY',
      dimension: 'aeo',
      title: 'Opportunity: Add Dedicated FAQ Section for High-Intent Page',
      severity: 'low',
      priority: 'P3',
      priorityScore: 5.0,
      evidence: `Page type "${page.pageType}" currently has no visible FAQ section.`,
      evidenceType: 'recommended',
      filePath: page.filePath,
      whyItMatters:
        'High-intent landing and service pages with 3-5 targeted FAQs address user hesitations, capture conversational long-tail queries, and improve conversion rate.',
      recommendedSolution: 'Add 3-5 real customer questions regarding pricing, process, guarantees, and timelines.',
      implementationApproach: 'Add an FAQ accordion component with corresponding FAQPage JSON-LD schema.',
      expectedImpact: 'Captures additional voice/AI search queries and reduces sales objections.',
      effort: 'medium'
    });
  }

  // 4. Structured Lists / Step-by-Step Formatting
  const html = page.rawHtml || '';
  const hasLists = /<ol|<ul/i.test(html);
  if (!hasLists && page.wordCount > 300 && ['service', 'blog', 'article'].includes(page.pageType)) {
    issues.push({
      id: 'AEO_NO_STRUCTURED_LISTS',
      dimension: 'aeo',
      title: 'Missing Structured Lists / Numbered Steps',
      severity: 'low',
      priority: 'P3',
      priorityScore: 4.5,
      evidence: `Page has ${page.wordCount} words of text but contains no bulleted (<ul>) or ordered (<ol>) lists.`,
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters:
        'AI agents and search crawlers heavily favor structured lists, tables, and step-by-step numbered instructions for procedural knowledge queries.',
      recommendedSolution: 'Organize key features, steps, or takeaways into structured <ul> or <ol> elements.',
      implementationApproach: 'Refactor dense paragraphs into bulleted lists with bold lead-in keywords.',
      expectedImpact: 'Improves reader scanning and AI extraction fidelity.',
      effort: 'low'
    });
  }

  return issues;
}
