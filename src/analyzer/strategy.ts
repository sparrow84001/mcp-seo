import type {
  AuditIssue,
  FunnelStage,
  MarketingAeoStrategy,
  MarketingAudienceMapping,
  MarketingCROPlan,
  MarketingRoadmap,
  MarketingStrategy,
  PageData,
  ProjectDiscoveryResult
} from '../types/index.ts';
import { classifySearchIntent } from './content.ts';

export function generateMarketingStrategy(
  target: string,
  pageData: PageData,
  allIssues: AuditIssue[],
  discovery?: ProjectDiscoveryResult
): MarketingStrategy {
  const intent = classifySearchIntent(pageData);

  // 1. Funnel Stage Determination
  let funnelStage: FunnelStage = 'ToFu (Awareness)';
  if (intent === 'transactional') {
    funnelStage = 'BoFu (Decision & Conversion)';
  } else if (intent === 'commercial' || pageData.pageType === 'comparison' || pageData.pageType === 'pricing') {
    funnelStage = 'MoFu (Consideration)';
  }

  // 2. Core Problem & Value Proposition Estimation
  const primaryTopic = pageData.title
    ? pageData.title.split(/[-|–:]/)[0]!.trim()
    : pageData.headings.find((h) => h.level === 1)?.text || 'Core Service / Product';

  const audienceMapping: MarketingAudienceMapping = {
    primaryAudience:
      pageData.pageType === 'service' || pageData.pageType === 'product'
        ? 'Prospective buyers and business decision-makers seeking immediate solutions'
        : 'Informed researchers, industry professionals, and organic searchers seeking authoritative guidance',
    searchIntent: intent,
    funnelStage,
    coreCustomerProblem: `Searchers seeking high-quality, trustworthy ${primaryTopic.toLowerCase()} without risk or unnecessary friction.`,
    valueProposition: `Deliver clear, differentiated value for "${primaryTopic}" with fast, trustworthy proof and frictionless conversion channels.`
  };

  // 3. CRO Optimization Plan
  const croPlan: MarketingCROPlan = {
    primaryCtaRecommendation:
      intent === 'transactional'
        ? 'Get Instant Quote / Start Free Trial (High Contrast Button Above the Fold)'
        : 'Schedule Free Consultation / Request Pricing Breakdown',
    secondaryCtaRecommendation:
      'Download Detailed Solution Guide / View Client Case Studies (Low-commitment lead magnet)',
    trustSignalsToIntegrate: [
      'Verified customer ratings & review count (e.g. "4.9/5 from 120+ reviews")',
      'Client company logos or industry accreditation badges',
      'Measurable outcome metric (e.g. "Trusted by 5,000+ businesses nationwide")'
    ],
    frictionReductionTactics: [
      'Limit contact form to 3 fields: Name, Work Email, and Core Requirement',
      'Provide 1-click WhatsApp or Click-to-Call floating action button for mobile users',
      'Display instant response time guarantee (e.g., "We respond in under 15 minutes")'
    ],
    riskReversalOffer:
      pageData.pageType === 'pricing' || pageData.pageType === 'landing'
        ? '30-Day Money-Back Guarantee / No Credit Card Required Trial'
        : 'Free initial audit / 100% Risk-Free Consultation'
  };

  // 4. AEO & AI Search Playbook
  const aeoStrategy: MarketingAeoStrategy = {
    targetQuestions: [
      `What is ${primaryTopic} and how does it work?`,
      `How much does ${primaryTopic} cost in 2026?`,
      `Why choose our ${primaryTopic} over alternatives?`,
      `What are the key benefits and ROI of ${primaryTopic}?`
    ],
    aiOverviewSnippetTemplate: `"${primaryTopic} is an end-to-end solution designed to help users achieve measurable outcomes with speed, reliability, and dedicated support." (Keep direct answer between 40-60 words immediately beneath H2/H3 question headers).`,
    faqSchemaTopics: [
      'Implementation timeline & onboarding process',
      'Pricing tiers and customization options',
      'Security, compliance, and guarantee policies'
    ],
    citationOpportunities: [
      'Publish /llms.txt with clean Markdown documentation for AI agent discovery',
      'Add sameAs links to LinkedIn, Wikidata, and Crunchbase for entity authority',
      'Include author credentials with verifiable Experience & Expertise (E-E-A-T)'
    ]
  };

  // 5. 30-60-90 Day Marketing Execution Roadmap
  const roadmap: MarketingRoadmap = {
    days1To30: [
      'Fix P0 critical technical and on-page blockers (Missing H1, Title tag, Viewport, Canonical)',
      'Add high-contrast primary CTA above the fold and sticky bottom conversion bar on mobile',
      'Inject Organization and LocalBusiness/Service JSON-LD structured data with sameAs verification'
    ],
    days31To60: [
      'Restructure subheadings into natural query questions for Google AI Overviews and Perplexity',
      'Embed 3-5 structured FAQ accordions with corresponding Schema.org/FAQPage JSON-LD',
      'Implement contextual internal linking graph between informational blogs and commercial service pages',
      'Integrate client testimonials, review trust badges, and risk-reversal guarantee copy'
    ],
    days61To90: [
      'Deploy public/llms.txt for AI search engine crawlers and agent ingestion',
      'Optimize Largest Contentful Paint (LCP) and Cumulative Layout Shift (CLS) Core Web Vitals',
      'Configure IndexNow API for instant search engine indexing on new content publication',
      'Launch A/B testing on primary CTA copy and lead capture form field reductions'
    ]
  };

  // 6. High-ROI Quick Wins
  const highRoiQuickWins = allIssues
    .filter((i) => (i.priority === 'P1' || i.severity === 'high' || i.priority === 'P2') && i.effort === 'low')
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 5);

  // 7. Health Score & Readiness Grade
  const criticalCount = allIssues.filter((i) => i.severity === 'critical').length;
  const highCount = allIssues.filter((i) => i.severity === 'high').length;
  const deductions = criticalCount * 25 + highCount * 12 + allIssues.length * 2;
  const healthScore = Math.max(20, Math.min(100, 100 - deductions));

  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'A+';
  if (healthScore >= 95) grade = 'A+';
  else if (healthScore >= 85) grade = 'A';
  else if (healthScore >= 70) grade = 'B';
  else if (healthScore >= 55) grade = 'C';
  else if (healthScore >= 40) grade = 'D';
  else grade = 'F';

  const executiveMarketingSummary = `Digital marketing strategy blueprint for ${target}. Overall Marketing Readiness: ${healthScore}/100 (Grade ${grade}). Page classified as ${funnelStage} targeting ${intent} search intent. Identified ${highRoiQuickWins.length} high-impact quick wins to accelerate organic acquisition and conversion velocity.`;

  return {
    timestamp: new Date().toISOString(),
    target,
    framework: discovery?.framework || pageData.framework,
    healthScore,
    marketingReadinessGrade: grade,
    executiveMarketingSummary,
    audienceMapping,
    croOptimizationPlan: croPlan,
    aeoAiSearchPlaybook: aeoStrategy,
    highRoiQuickWins,
    executionRoadmap: roadmap,
    projectedKpiImpact: {
      organicTrafficGrowth: '+25% to +60% over 90 days via technical hygiene and AEO question capture',
      serpClickThroughRate: '+15% to +35% improvement through optimized 55-char titles and compelling meta descriptions',
      leadConversionRate: '+20% to +50% increase from above-the-fold CTA, trust proof, and reduced form friction',
      aiOverviewCitationLikelihood: 'High (via structured FAQPage schema, direct 50-word answer blocks, and llms.txt)'
    }
  };
}

export function formatMarketingStrategyToMarkdown(strategy: MarketingStrategy): string {
  return `# 🚀 Digital Marketing Strategy & Growth Blueprint

**Target:** \`${strategy.target}\`  
**Generated At:** ${strategy.timestamp}  
**Marketing Readiness:** **${strategy.healthScore}/100** (\`${strategy.marketingReadinessGrade}\`)  
**Detected Framework:** ${strategy.framework || 'Web / Standard'}

---

## Executive Marketing Summary
${strategy.executiveMarketingSummary}

---

## 1. Audience & Search Intent Mapping

| Dimension | Details |
| :--- | :--- |
| **Search Intent** | \`${strategy.audienceMapping.searchIntent.toUpperCase()}\` |
| **Funnel Stage** | **${strategy.audienceMapping.funnelStage}** |
| **Primary Audience** | ${strategy.audienceMapping.primaryAudience} |
| **Core Customer Need** | ${strategy.audienceMapping.coreCustomerProblem} |
| **Value Proposition** | ${strategy.audienceMapping.valueProposition} |

---

## 2. Conversion Rate Optimization (CRO) Blueprint

* **Primary Call-To-Action (CTA):** \`${strategy.croOptimizationPlan.primaryCtaRecommendation}\`
* **Secondary Soft CTA:** ${strategy.croOptimizationPlan.secondaryCtaRecommendation}
* **Risk-Reversal Offer:** *${strategy.croOptimizationPlan.riskReversalOffer}*

### Trust Signals to Add Immediately
${strategy.croOptimizationPlan.trustSignalsToIntegrate.map((t) => `* ✅ ${t}`).join('\n')}

### Friction Reduction Checklist
${strategy.croOptimizationPlan.frictionReductionTactics.map((f) => `* ⚡ ${f}`).join('\n')}

---

## 3. Answer Engine (AEO) & AI Search Visibility Playbook

### High-Intent Conversational Questions to Target
${strategy.aeoAiSearchPlaybook.targetQuestions.map((q) => `* ❓ **"${q}"**`).join('\n')}

### Direct Answer Formatting Guidelines (AI Overviews & Perplexity)
> ${strategy.aeoAiSearchPlaybook.aiOverviewSnippetTemplate}

### Knowledge Graph & AI Citation Actions
${strategy.aeoAiSearchPlaybook.citationOpportunities.map((c) => `* 🔗 ${c}`).join('\n')}

---

## 4. High-ROI Quick Wins (Immediate Lift)

${
  strategy.highRoiQuickWins.length === 0
    ? 'No immediate quick wins detected.'
    : strategy.highRoiQuickWins
        .map(
          (qw, i) => `### ${i + 1}. [${qw.severity.toUpperCase()}] ${qw.title}
* **Priority Score:** ${qw.priorityScore.toFixed(1)}/10 | **Effort:** \`${qw.effort}\`
* **Why It Matters:** ${qw.whyItMatters}
* **Solution:** ${qw.recommendedSolution}
* **Expected Impact:** ${qw.expectedImpact}`
        )
        .join('\n\n')
}

---

## 5. 30-60-90 Day Marketing Execution Roadmap

### 📅 Days 1 - 30: Technical Foundation & Conversion Quick Wins
${strategy.executionRoadmap.days1To30.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}

### 📅 Days 31 - 60: Content, AEO & Local Expansion
${strategy.executionRoadmap.days31To60.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}

### 📅 Days 61 - 90: Authority Scaling, Performance & Conversion Loops
${strategy.executionRoadmap.days61To90.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}

---

## 📈 Projected Growth & KPI Impact

| Metric | Projected Impact |
| :--- | :--- |
| **Organic Traffic Velocity** | ${strategy.projectedKpiImpact.organicTrafficGrowth} |
| **SERP Click-Through Rate (CTR)** | ${strategy.projectedKpiImpact.serpClickThroughRate} |
| **Visitor-to-Lead Conversion Rate** | ${strategy.projectedKpiImpact.leadConversionRate} |
| **AI Overview / Perplexity Citation** | ${strategy.projectedKpiImpact.aiOverviewCitationLikelihood} |
`;
}
