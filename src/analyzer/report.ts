import type {
  AuditDimension,
  AuditIssue,
  AuditReport,
  AuditScores,
  DimensionScore,
  FrameworkType,
  PageData,
  ProjectDiscoveryResult
} from '../types/index.ts';
import { generateMarketingStrategy } from './strategy.ts';

export function generateAuditReport(
  target: string,
  pageData: PageData,
  allIssues: AuditIssue[],
  discovery?: ProjectDiscoveryResult,
  framework?: FrameworkType
): AuditReport {
  // 1. Group Issues by Dimension
  const issuesByDimension: Record<AuditDimension, AuditIssue[]> = {
    seo: [],
    aeo: [],
    geo: [],
    local: [],
    content: [],
    technical: [],
    conversion: [],
    performance: []
  };

  for (const issue of allIssues) {
    if (issuesByDimension[issue.dimension]) {
      issuesByDimension[issue.dimension].push(issue);
    } else {
      issuesByDimension.seo.push(issue);
    }
  }

  // 2. Compute Weighted Scores for each Dimension
  const dimensionWeights: Record<AuditDimension, number> = {
    technical: 20,
    seo: 15,
    aeo: 15,
    geo: 10,
    local: 10,
    content: 10,
    conversion: 10,
    performance: 10
  };

  const dimensions: AuditDimension[] = [
    'technical',
    'seo',
    'aeo',
    'geo',
    'local',
    'content',
    'conversion',
    'performance'
  ];

  const scoresRecord: Partial<Record<AuditDimension, DimensionScore>> = {};
  let weightedScoreSum = 0;

  for (const dim of dimensions) {
    const list = issuesByDimension[dim];
    const weight = dimensionWeights[dim] || 10;
    const counts = {
      critical: list.filter((i) => i.severity === 'critical').length,
      high: list.filter((i) => i.severity === 'high').length,
      medium: list.filter((i) => i.severity === 'medium').length,
      low: list.filter((i) => i.severity === 'low').length
    };

    let deductions = counts.critical * 30 + counts.high * 15 + counts.medium * 7 + counts.low * 3;
    let score = Math.max(0, 100 - deductions);
    weightedScoreSum += (score * weight) / 100;

    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'A+';
    if (score >= 95) grade = 'A+';
    else if (score >= 85) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 55) grade = 'C';
    else if (score >= 40) grade = 'D';
    else grade = 'F';

    scoresRecord[dim] = {
      score,
      grade,
      weightPercent: weight,
      summary: `${counts.critical} Critical, ${counts.high} High, ${counts.medium} Med, ${counts.low} Low issue(s)`,
      issuesCount: counts
    };
  }

  const overall = Math.round(weightedScoreSum);

  const scores: AuditScores = {
    seo: scoresRecord.seo!,
    aeo: scoresRecord.aeo!,
    geo: scoresRecord.geo!,
    local: scoresRecord.local!,
    content: scoresRecord.content!,
    technical: scoresRecord.technical!,
    conversion: scoresRecord.conversion!,
    performance: scoresRecord.performance!,
    overall
  };

  // 3. Extract Critical Problems (P0 & Critical Severity)
  const criticalProblems = allIssues
    .filter((i) => i.priority === 'P0' || i.severity === 'critical')
    .sort((a, b) => b.priorityScore - a.priorityScore);

  // 4. Extract Quick Wins (High Impact + Low Effort)
  const quickWins = allIssues
    .filter((i) => (i.priority === 'P1' || i.severity === 'high' || i.priority === 'P2') && i.effort === 'low')
    .sort((a, b) => b.priorityScore - a.priorityScore);

  // 5. Code Problems Grouped by File
  const fileMap = new Map<string, string[]>();
  for (const issue of allIssues) {
    const f = issue.filePath || target;
    if (!fileMap.has(f)) fileMap.set(f, []);
    fileMap.get(f)!.push(`[${issue.severity.toUpperCase()}] ${issue.title}`);
  }

  const codeProblems = Array.from(fileMap.entries()).map(([file, issues]) => ({
    file,
    issues
  }));

  // 6. Recommended Fixes
  const recommendedFixes = allIssues.slice(0, 10).map((issue) => ({
    id: issue.id,
    title: issue.title,
    targetFile: issue.filePath || target,
    solution: issue.recommendedSolution,
    diffPreview: issue.implementationApproach
  }));

  // 7. Generate Integrated Digital Marketing Strategy
  const marketingStrategy = generateMarketingStrategy(target, pageData, allIssues, discovery);

  // 8. 5-Phase Implementation Plan
  const phase1: string[] = [];
  const phase2: string[] = [];
  const phase3: string[] = [];
  const phase4: string[] = [];
  const phase5: string[] = [
    'Deploy IndexNow instant indexing key and ping on URL updates',
    'Set up automated schema validation testing in CI/CD pipeline',
    'Monitor Core Web Vitals (LCP, CLS, INP) and search console impression velocity'
  ];

  for (const issue of allIssues) {
    const text = `${issue.title}: ${issue.recommendedSolution}`;
    if (issue.dimension === 'technical' || issue.priority === 'P0') {
      phase1.push(text);
    } else if (issue.dimension === 'seo' || issue.dimension === 'content') {
      phase2.push(text);
    } else if (issue.dimension === 'aeo' || issue.dimension === 'geo' || issue.dimension === 'local') {
      phase3.push(text);
    } else if (issue.dimension === 'conversion' || issue.dimension === 'performance') {
      phase4.push(text);
    }
  }

  // 9. Executive Summary
  const executiveSummary = `Comprehensive audit completed for ${target}. Overall Health Score: ${overall}/100 across 8 weighted growth dimensions. Identified ${allIssues.length} actionable items (${criticalProblems.length} critical, ${quickWins.length} high-impact quick wins). Marketing readiness grade: ${marketingStrategy.marketingReadinessGrade}. Detected framework: ${framework || discovery?.framework || 'Standard HTML/Web'}.`;

  return {
    timestamp: new Date().toISOString(),
    projectOrUrl: target,
    framework: framework || discovery?.framework,
    scores,
    executiveSummary,
    criticalProblems,
    quickWins,
    issuesByDimension,
    codeProblems,
    recommendedFixes,
    marketingStrategy,
    implementationPlan: {
      phase1: phase1.slice(0, 5),
      phase2: phase2.slice(0, 5),
      phase3: phase3.slice(0, 5),
      phase4: phase4.slice(0, 5),
      phase5
    }
  };
}

export function formatReportToMarkdown(report: AuditReport): string {
  const mkt = report.marketingStrategy;
  return `# SEO, AEO, GEO & Digital Marketing Audit Report

**Target:** \`${report.projectOrUrl}\`  
**Generated At:** ${report.timestamp}  
**Detected Framework:** ${report.framework || 'Web / Standard'}

---

## Executive Summary
${report.executiveSummary}

---

## 8-Dimension Growth Scorecard (Weighted)

| Dimension | Weight | Score | Grade | Status |
| :--- | :---: | :---: | :---: | :--- |
| **Overall Health** | **100%** | **${report.scores.overall}/100** | - | ${report.scores.overall >= 80 ? '🟢 Strong' : report.scores.overall >= 60 ? '🟡 Moderate' : '🔴 Needs Urgent Attention'} |
| **Technical SEO** | 20% | ${report.scores.technical.score}/100 | \`${report.scores.technical.grade}\` | ${report.scores.technical.summary} |
| **On-Page SEO** | 15% | ${report.scores.seo.score}/100 | \`${report.scores.seo.grade}\` | ${report.scores.seo.summary} |
| **AEO (Answer Engine Optimization)** | 15% | ${report.scores.aeo.score}/100 | \`${report.scores.aeo.grade}\` | ${report.scores.aeo.summary} |
| **GEO (Generative Engine Optimization)** | 10% | ${report.scores.geo.score}/100 | \`${report.scores.geo.grade}\` | ${report.scores.geo.summary} |
| **Local / Area SEO** | 10% | ${report.scores.local.score}/100 | \`${report.scores.local.grade}\` | ${report.scores.local.summary} |
| **Content Quality & Intent** | 10% | ${report.scores.content.score}/100 | \`${report.scores.content.grade}\` | ${report.scores.content.summary} |
| **Conversion & Marketing (CRO)** | 10% | ${report.scores.conversion.score}/100 | \`${report.scores.conversion.grade}\` | ${report.scores.conversion.summary} |
| **Code Performance / CWV Risks** | 10% | ${report.scores.performance.score}/100 | \`${report.scores.performance.grade}\` | ${report.scores.performance.summary} |

${
  mkt
    ? `---

## Digital Marketing & Search Strategy Blueprint

* **Funnel Stage:** **${mkt.audienceMapping.funnelStage}** (Search Intent: \`${mkt.audienceMapping.searchIntent.toUpperCase()}\`)
* **Primary Conversion CTA:** \`${mkt.croOptimizationPlan.primaryCtaRecommendation}\`
* **Risk-Reversal Offer:** *${mkt.croOptimizationPlan.riskReversalOffer}*
* **Target Questions for AI Overviews:**
${mkt.aeoAiSearchPlaybook.targetQuestions.map((q) => `  - ❓ "${q}"`).join('\n')}
`
    : ''
}

---

## Critical Problems (P0 / Immediate Action Required)

${
  report.criticalProblems.length === 0
    ? '✅ No critical P0 blockers detected.'
    : report.criticalProblems
        .map(
          (p) => `### 🔴 [${p.priority}] ${p.title}
* **Dimension:** \`${p.dimension.toUpperCase()}\` | **Priority Score:** ${p.priorityScore.toFixed(1)}/10
* **Evidence (${p.evidenceType}):** ${p.evidence}
* **Why It Matters:** ${p.whyItMatters}
* **Recommended Solution:** ${p.recommendedSolution}
* **Implementation Approach:** \`${p.implementationApproach}\`
`
        )
        .join('\n')
}

---

## Quick Wins (High Impact, Low Effort)

${
  report.quickWins.length === 0
    ? 'None identified.'
    : report.quickWins
        .map(
          (q) => `* **[${q.severity.toUpperCase()}] ${q.title}**: ${q.recommendedSolution}  
  *(Impact: ${q.expectedImpact})*`
        )
        .join('\n')
}

---

## Detailed Findings by Dimension

### 1. Technical SEO
${formatIssuesList(report.issuesByDimension.technical)}

### 2. On-Page SEO
${formatIssuesList(report.issuesByDimension.seo)}

### 3. AEO (Answer Engine Optimization)
${formatIssuesList(report.issuesByDimension.aeo)}

### 4. GEO (Generative Engine Optimization)
${formatIssuesList(report.issuesByDimension.geo)}

### 5. Local / Area SEO
${formatIssuesList(report.issuesByDimension.local)}

### 6. Content Quality & Intent
${formatIssuesList(report.issuesByDimension.content)}

### 7. Conversion Rate & Digital Marketing
${formatIssuesList(report.issuesByDimension.conversion)}

### 8. Code Performance & CWV Risks
${formatIssuesList(report.issuesByDimension.performance)}

---

## Affected Code Files & Issues
${
  report.codeProblems.length === 0
    ? 'No direct file issues noted.'
    : report.codeProblems
        .map(
          (cp) => `* **\`${cp.file}\`**:
${cp.issues.map((i) => `  - ${i}`).join('\n')}`
        )
        .join('\n')
}

---

## 5-Phase Implementation Plan

### Phase 1: Critical Technical Fixes
${report.implementationPlan.phase1.map((p, i) => `${i + 1}. ${p}`).join('\n') || 'None required.'}

### Phase 2: On-Page & Content Fixes
${report.implementationPlan.phase2.map((p, i) => `${i + 1}. ${p}`).join('\n') || 'None required.'}

### Phase 3: AEO, GEO & Local Improvements
${report.implementationPlan.phase3.map((p, i) => `${i + 1}. ${p}`).join('\n') || 'None required.'}

### Phase 4: Digital Marketing & Conversion
${report.implementationPlan.phase4.map((p, i) => `${i + 1}. ${p}`).join('\n') || 'None required.'}

### Phase 5: Monitoring & Continuous Growth
${report.implementationPlan.phase5.map((p, i) => `${i + 1}. ${p}`).join('\n')}

---

## 🛠️ Multi-Language Framework Fix Matrix & Automation

Apply surgical, language-specific fixes for the identified issues:

### 1. Auto-Apply Safe Code Fixes via MCP
Run in chat or call tool \`seo_generate_code_fix\`:
\`\`\`json
{
  "tool": "seo_generate_code_fix",
  "arguments": {
    "filePath": "${report.codeProblems[0]?.file || 'resources/views/layouts/app.blade.php'}",
    "title": "Optimized Page Title | Brand",
    "metaDescription": "Concise 155-character description matching search intent.",
    "canonicalUrl": "https://example.com/page",
    "addWebMcpDiscovery": true,
    "applyDirectly": false
  }
}
\`\`\`

### 2. Framework-Specific Implementation Guides

#### 📦 Next.js (App Router)
* **File:** \`app/layout.tsx\` or \`app/page.tsx\`
\`\`\`typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Optimized Title',
  description: 'Search intent aligned description.',
  alternates: { canonical: 'https://example.com' },
  other: { 'mcp-server': '/api/mcp' }
};
\`\`\`

#### 🐘 Laravel (Blade)
* **File:** \`resources/views/layouts/app.blade.php\`
\`\`\`html
<head>
    <title>@yield('title', 'Default Title')</title>
    <meta name="description" content="@yield('meta_description', 'Default description')">
    <link rel="canonical" href="{{ url()->current() }}" />
    <link rel="mcp-server" href="/api/mcp" />
    @stack('scripts')
</head>
\`\`\`

#### 🐍 Python (FastAPI / Django)
* **File:** \`templates/base.html\` / \`app/mcp_server.py\`
\`\`\`html
<link rel="canonical" href="{{ request.url }}" />
<link rel="mcp-server" href="/mcp" />
\`\`\`

#### 🚀 Static HTML / Astro / SvelteKit
* **File:** \`public/llms.txt\` & \`public/.well-known/mcp/server-card.json\`
\`\`\`html
<link rel="canonical" href="https://example.com" />
<link rel="mcp-server" href="/mcp" />
<script src="/webmcp.js"></script>
\`\`\`
`;
}

function formatIssuesList(issues: AuditIssue[]): string {
  if (!issues || issues.length === 0) return '✅ No issues detected in this dimension.\n';
  return issues
    .map(
      (i) => `* **[${i.severity.toUpperCase()}] ${i.title}**
  - **Evidence:** ${i.evidence}
  - **Why It Matters:** ${i.whyItMatters}
  - **Solution:** ${i.recommendedSolution}
  - **Implementation:** \`${i.implementationApproach}\``
    )
    .join('\n\n');
}

