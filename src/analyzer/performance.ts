import type { AuditIssue, PageData } from '../types/index.ts';

export function auditPerformanceRisks(page: PageData): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // 1. CLS Risk: Images missing explicit width and height
  const imagesWithoutDimensions = page.images.filter(
    (img) => !img.width || !img.height || img.width === '' || img.height === ''
  );

  if (imagesWithoutDimensions.length > 0) {
    issues.push({
      id: 'PERF_IMAGE_NO_DIMENSIONS',
      dimension: 'performance',
      title: `CLS Risk: ${imagesWithoutDimensions.length} Image(s) Missing Explicit Width/Height Attributes`,
      severity: 'medium',
      priority: 'P2',
      priorityScore: 7.0,
      evidence: `Images without width/height: ${imagesWithoutDimensions
        .slice(0, 3)
        .map((i) => i.src)
        .join(', ')}${imagesWithoutDimensions.length > 3 ? '...' : ''}`,
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters:
        'Observed code-level risk: Images without explicit width and height attributes cause Cumulative Layout Shift (CLS) as the browser reflows content when images finish loading.',
      recommendedSolution:
        'Specify explicit width and height attributes (or aspect-ratio in CSS) on all <img> elements.',
      implementationApproach: 'Add width="800" height="600" or use framework image components (e.g. next/image).',
      expectedImpact: 'Eliminates layout shifts and improves Core Web Vitals (CLS) score.',
      effort: 'low'
    });
  }

  // 2. Modern Image Format Check (WebP / AVIF)
  const legacyImages = page.images.filter(
    (img) => /\.(png|jpe?g|bmp)(\?.*)?$/i.test(img.src) && !img.isWebpOrAvif
  );

  if (legacyImages.length > 0) {
    issues.push({
      id: 'PERF_LEGACY_IMAGE_FORMAT',
      dimension: 'performance',
      title: `LCP Risk: ${legacyImages.length} Image(s) Using Legacy Formats (JPG/PNG instead of WebP/AVIF)`,
      severity: 'low',
      priority: 'P3',
      priorityScore: 5.0,
      evidence: `Legacy images: ${legacyImages.slice(0, 3).map((i) => i.src).join(', ')}${
        legacyImages.length > 3 ? '...' : ''
      }`,
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters:
        'Observed code-level risk: WebP and AVIF formats offer 25-50% smaller file sizes at equivalent quality compared to JPEG/PNG, speeding up Largest Contentful Paint (LCP).',
      recommendedSolution: 'Convert images to WebP/AVIF and serve via modern <picture> tags or optimized image loaders.',
      implementationApproach: 'Convert image assets to WebP or configure automatic image optimization pipeline.',
      expectedImpact: 'Reduces payload size by ~30% and improves image load times.',
      effort: 'medium'
    });
  }

  // 3. Render-blocking synchronous script check
  const renderBlockingScripts = page.scripts.filter((s) => s.src && !s.isAsync && !s.isDefer);

  if (renderBlockingScripts.length > 0) {
    issues.push({
      id: 'PERF_RENDER_BLOCKING_SCRIPTS',
      dimension: 'performance',
      title: `Render-Blocking Risk: ${renderBlockingScripts.length} Synchronous Script(s) Detected`,
      severity: 'medium',
      priority: 'P2',
      priorityScore: 6.5,
      evidence: `Synchronous scripts: ${renderBlockingScripts.map((s) => s.src).join(', ')}`,
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters:
        'Observed code-level risk: Synchronous JavaScript files in <head> block DOM parsing and HTML rendering until the scripts are completely downloaded and executed.',
      recommendedSolution: 'Add defer or async attributes to non-critical scripts, or move scripts to the bottom of <body>.',
      implementationApproach: 'Add defer attribute: <script src="..." defer></script>.',
      expectedImpact: 'Accelerates First Contentful Paint (FCP) and First Meaningful Paint.',
      effort: 'low'
    });
  }

  return issues;
}
