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

  // 2. Compute Scores for each Dimension
  const dimensions: AuditDimension[] = [
    'seo',
    'aeo',
    'geo',
    'local',
    'content',
    'technical',
    'conversion',
    'performance'
  ];

  const scoresRecord: Partial<Record<AuditDimension, DimensionScore>> = {};
  let totalScoreSum = 0;

  for (const dim of dimensions) {
    const list = issuesByDimension[dim];
    const counts = {
      critical: list.filter((i) => i.severity === 'critical').length,
      high: list.filter((i) => i.severity === 'high').length,
      medium: list.filter((i) => i.severity === 'medium').length,
      low: list.filter((i) => i.severity === 'low').length
    };

    let deductions = counts.critical * 30 + counts.high * 15 + counts.medium * 7 + counts.low * 3;
    let score = Math.max(0, 100 - deductions);
    totalScoreSum += score;

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
      summary: `${counts.critical} Critical, ${counts.high} High, ${counts.medium} Med, ${counts.low} Low issue(s)`,
      issuesCount: counts
    };
  }

  const overall = Math.round(totalScoreSum / dimensions.length);

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

  // 7. 5-Phase Implementation Plan
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

  // 8. Executive Summary
  const executiveSummary = `Comprehensive audit completed for ${target}. Overall Health Score: ${overall}/100 across 8 growth dimensions. Identified ${allIssues.length} actionable items (${criticalProblems.length} critical, ${quickWins.length} high-impact quick wins). Framework: ${framework || 'Standard HTML/Web'}.`;

  return {
    timestamp: new Date().toISOString(),
    projectOrUrl: target,
    framework,
    scores,
    executiveSummary,
    criticalProblems,
    quickWins,
    issuesByDimension,
    codeProblems,
    recommendedFixes,
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
  return `# SEO, AEO, GEO & Digital Marketing Audit Report

**Target:** \`${report.projectOrUrl}\`  
**Generated At:** ${report.timestamp}  
**Detected Framework:** ${report.framework || 'Web / Standard'}

---

## Executive Summary
${report.executiveSummary}

---

## Overall Scorecard

| Dimension | Score | Grade | Status |
| :--- | :---: | :---: | :--- |
| **Overall Health** | **${report.scores.overall}/100** | - | ${report.scores.overall >= 80 ? '🟢 Strong' : report.scores.overall >= 60 ? '🟡 Moderate' : '🔴 Needs Urgent Attention'} |
| **Technical SEO** | ${report.scores.technical.score}/100 | \`${report.scores.technical.grade}\` | ${report.scores.technical.summary} |
| **On-Page SEO** | ${report.scores.seo.score}/100 | \`${report.scores.seo.grade}\` | ${report.scores.seo.summary} |
| **AEO (Answer Engine Optimization)** | ${report.scores.aeo.score}/100 | \`${report.scores.aeo.grade}\` | ${report.scores.aeo.summary} |
| **GEO (Generative Engine Optimization)** | ${report.scores.geo.score}/100 | \`${report.scores.geo.grade}\` | ${report.scores.geo.summary} |
| **Local / Area SEO** | ${report.scores.local.score}/100 | \`${report.scores.local.grade}\` | ${report.scores.local.summary} |
| **Content Quality & Intent** | ${report.scores.content.score}/100 | \`${report.scores.content.grade}\` | ${report.scores.content.summary} |
| **Conversion & Marketing** | ${report.scores.conversion.score}/100 | \`${report.scores.conversion.grade}\` | ${report.scores.conversion.summary} |
| **Code Performance / CWV Risks** | ${report.scores.performance.score}/100 | \`${report.scores.performance.grade}\` | ${report.scores.performance.summary} |

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
