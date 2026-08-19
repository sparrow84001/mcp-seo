import type { AuditIssue, PageData } from '../types/index.ts';

export interface InternalLinkGraph {
  nodes: Array<{ id: string; urlOrPath: string; pageType: string; incomingCount: number; outgoingCount: number }>;
  edges: Array<{ source: string; target: string; anchorText: string }>;
  orphanPages: string[];
  recommendations: Array<{ source: string; target: string; suggestedAnchor: string; reason: string }>;
}

export function auditInternalLinks(page: PageData, allPages?: PageData[]): {
  issues: AuditIssue[];
  graph?: InternalLinkGraph;
} {
  const issues: AuditIssue[] = [];

  const internalLinks = page.links.filter((l) => l.isInternal);

  // 1. Generic Anchor Text Audit
  const genericAnchors = ['click here', 'read more', 'learn more', 'here', 'more', 'link', 'this', 'view'];
  const poorLinks = internalLinks.filter((l) =>
    genericAnchors.includes(l.anchorText.toLowerCase().trim())
  );

  if (poorLinks.length > 0) {
    issues.push({
      id: 'LINKS_GENERIC_ANCHOR_TEXT',
      dimension: 'seo',
      title: `Generic Anchor Text on ${poorLinks.length} Internal Link(s)`,
      severity: 'medium',
      priority: 'P2',
      priorityScore: 6.5,
      evidence: `Found links with generic anchor text: ${poorLinks
        .slice(0, 3)
        .map((l) => `"${l.anchorText}" -> ${l.href}`)
        .join(', ')}`,
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters:
        'Anchor text is a direct topical signal to search engines. Generic anchor text ("click here", "read more") wastes link equity and fails to tell crawlers what the destination page is about.',
      recommendedSolution:
        'Replace generic anchor phrases with descriptive, keyword-rich target page names (e.g. replace "read more" with "explore technical SEO audit services").',
      implementationApproach: 'Update anchor text in <a> tags.',
      expectedImpact: 'Improves target page semantic relevance and internal keyword flow.',
      effort: 'low'
    });
  }

  // 2. Lack of Outgoing Internal Links (Dead End)
  if (internalLinks.length === 0 && page.pageType !== 'contact') {
    issues.push({
      id: 'LINKS_NO_OUTGOING_INTERNAL',
      dimension: 'seo',
      title: 'Page Has No Internal Outgoing Links (Dead End)',
      severity: 'medium',
      priority: 'P2',
      priorityScore: 6.0,
      evidence: 'Page has 0 internal links connecting to other sections or articles.',
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters:
        'Dead-end pages stop crawl depth and prevent users and search engine bots from discovering related content and converting.',
      recommendedSolution: 'Add 2-4 contextual links to relevant parent/child pages, related case studies, or services.',
      implementationApproach: 'Insert contextual links in body paragraphs and related content footer.',
      expectedImpact: 'Improves crawl efficiency and user journey engagement.',
      effort: 'low'
    });
  }

  // 3. Multi-page link graph analysis if allPages provided
  let graph: InternalLinkGraph | undefined;
  if (allPages && allPages.length > 1) {
    const nodeMap = new Map<string, { id: string; urlOrPath: string; pageType: string; incomingCount: number; outgoingCount: number }>();
    const edges: Array<{ source: string; target: string; anchorText: string }> = [];

    for (const p of allPages) {
      const key = p.filePath || p.url || 'unknown';
      nodeMap.set(key, {
        id: key,
        urlOrPath: p.url || p.filePath || '',
        pageType: p.pageType,
        incomingCount: 0,
        outgoingCount: p.links.filter((l) => l.isInternal).length
      });
    }

    for (const p of allPages) {
      const sourceKey = p.filePath || p.url || 'unknown';
      for (const link of p.links.filter((l) => l.isInternal)) {
        for (const [targetKey, targetNode] of nodeMap.entries()) {
          if (targetNode.urlOrPath.includes(link.href) || (link.href !== '/' && targetKey.includes(link.href))) {
            targetNode.incomingCount += 1;
            edges.push({ source: sourceKey, target: targetKey, anchorText: link.anchorText });
          }
        }
      }
    }

    const orphanPages: string[] = [];
    for (const [key, node] of nodeMap.entries()) {
      if (node.incomingCount === 0 && node.pageType !== 'homepage') {
        orphanPages.push(key);
      }
    }

    const recommendations: Array<{ source: string; target: string; suggestedAnchor: string; reason: string }> = [];
    // Generate contextual link recommendations
    const blogPages = allPages.filter((p) => p.pageType === 'blog' || p.pageType === 'article');
    const servicePages = allPages.filter((p) => p.pageType === 'service');

    for (const blog of blogPages) {
      for (const service of servicePages) {
        recommendations.push({
          source: blog.filePath || blog.url || '/blog',
          target: service.filePath || service.url || '/services',
          suggestedAnchor: service.title ? service.title.split('|')[0]!.trim() : 'our specialized service',
          reason: 'Contextual bridge from informational topic article to commercial service conversion page.'
        });
      }
    }

    graph = {
      nodes: Array.from(nodeMap.values()),
      edges,
      orphanPages,
      recommendations
    };

    if (orphanPages.includes(page.filePath || page.url || '')) {
      issues.push({
        id: 'LINKS_ORPHAN_PAGE',
        dimension: 'seo',
        title: 'Orphan Page Detected (0 Internal Inbound Links)',
        severity: 'high',
        priority: 'P1',
        priorityScore: 8.0,
        evidence: `No other indexed pages in the project link to ${page.filePath || page.url}.`,
        evidenceType: 'confirmed',
        filePath: page.filePath,
        whyItMatters:
          'Orphan pages cannot be reached through normal site navigation, making them almost impossible for search engine crawlers to discover and rank.',
        recommendedSolution: 'Link to this page from top navigation, parent category page, or relevant blog posts.',
        implementationApproach: 'Add internal navigation or contextual links pointing to this page.',
        expectedImpact: 'Enables search engine indexation and restores user access.',
        effort: 'low'
      });
    }
  }

  return { issues, graph };
}
