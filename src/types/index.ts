export type FrameworkType =
  | 'laravel'
  | 'nextjs-app'
  | 'nextjs-pages'
  | 'react'
  | 'vue'
  | 'nuxt'
  | 'astro'
  | 'sveltekit'
  | 'remix'
  | 'docusaurus'
  | 'wordpress'
  | 'php-raw'
  | 'python'
  | 'go'
  | 'rust'
  | 'csharp-dotnet'
  | 'java-spring'
  | 'ruby-rails'
  | 'html-static'
  | 'unknown';


export type PageType =
  | 'homepage'
  | 'service'
  | 'product'
  | 'category'
  | 'location'
  | 'area'
  | 'city'
  | 'state'
  | 'blog'
  | 'article'
  | 'landing'
  | 'pricing'
  | 'comparison'
  | 'faq'
  | 'contact'
  | 'about'
  | 'author'
  | 'tag'
  | 'search'
  | 'pagination'
  | 'dynamic'
  | 'api'
  | 'unknown';

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type PriorityTier = 'P0' | 'P1' | 'P2' | 'P3';
export type EvidenceType = 'confirmed' | 'inferred' | 'recommended';
export type SearchIntent = 'informational' | 'commercial' | 'transactional' | 'navigational';
export type ContentGrade = 'excellent' | 'good' | 'needs_improvement' | 'poor' | 'critical';
export type FunnelStage = 'ToFu (Awareness)' | 'MoFu (Consideration)' | 'BoFu (Decision & Conversion)';

export type AuditDimension =
  | 'seo'
  | 'aeo'
  | 'geo'
  | 'local'
  | 'content'
  | 'technical'
  | 'conversion'
  | 'performance';

export interface AuditIssue {
  id: string;
  dimension: AuditDimension;
  title: string;
  severity: Severity;
  priority: PriorityTier;
  priorityScore: number; // Impact * Confidence / Effort (1-10)
  evidence: string;
  evidenceType: EvidenceType;
  filePath?: string;
  lineNumbers?: string;
  whyItMatters: string;
  recommendedSolution: string;
  implementationApproach: string;
  expectedImpact: string;
  effort: 'low' | 'medium' | 'high';
}

export interface ExtractedImage {
  src: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
  loading?: string;
  isWebpOrAvif?: boolean;
}

export interface ExtractedLink {
  href: string;
  anchorText: string;
  rel?: string;
  target?: string;
  isInternal: boolean;
}

export interface ExtractedSchema {
  type: string;
  rawJson: any;
  isValid: boolean;
  errors?: string[];
}

export interface ExtractedHeading {
  level: number;
  text: string;
}

export interface PageData {
  url?: string;
  filePath?: string;
  statusCode?: number;
  loadTimeMs?: number;
  contentType?: string;
  title?: string;
  metaDescription?: string;
  canonical?: string;
  robotsMeta?: string;
  headings: ExtractedHeading[];
  images: ExtractedImage[];
  links: ExtractedLink[];
  schemas: ExtractedSchema[];
  wordCount: number;
  paragraphs: string[];
  openGraph: Record<string, string>;
  twitterCard: Record<string, string>;
  hasViewportMeta: boolean;
  hasCharsetMeta: boolean;
  pageType: PageType;
  rawHtml?: string;
}

export interface DimensionScore {
  score: number; // 0-100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  issuesCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  passedCount: number;
  topRecommendations: string[];
}

export interface FullAuditReport {
  target: string;
  framework: FrameworkType;
  pageType: PageType;
  overallScore: number;
  overallGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  timestamp: string;
  dimensions: {
    technical: DimensionScore;
    onpage: DimensionScore;
    aeo: DimensionScore;
    geo: DimensionScore;
    local: DimensionScore;
    content: DimensionScore;
    conversion: DimensionScore;
    performance: DimensionScore;
  };
  allIssues: AuditIssue[];
  executiveSummary: string;
  prioritizedActionPlan: {
    p0: AuditIssue[];
    p1: AuditIssue[];
    p2: AuditIssue[];
    p3: AuditIssue[];
  };
}

export interface ProjectDiscoveryResult {
  rootPath: string;
  framework: FrameworkType;
  frameworkConfidence: number;
  detectedRoutes: {
    path: string;
    filePath: string;
    pageType: PageType;
  }[];
  sitemaps: string[];
  robotsTxt?: string;
  llmsTxt?: string;
  layoutFiles: string[];
  totalPagesDiscovered: number;
}

export interface CodeFixSuggestion {
  issueId: string;
  filePath: string;
  originalCodeSnippet: string;
  fixedCodeSnippet: string;
  unifiedDiff: string;
  description: string;
  safetyChecksPassed: boolean;
  riskOfBreaking: 'none' | 'low' | 'medium';
}

export interface FixValidationResult {
  isValid: boolean;
  duplicateTagsDetected: string[];
  schemaValid: boolean;
  syntaxErrors: string[];
  beforeScore: number;
  projectedAfterScore: number;
  validationSummary: string;
}

export interface ConversionAuditResult {
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  ctaCount: number;
  formCount: number;
  hasAboveTheFoldCta: boolean;
  hasStickyCta: boolean;
  hasSocialProof: boolean;
  hasTrustBadges: boolean;
  hasRiskReversal: boolean;
  issues: AuditIssue[];
}

export interface LocalSeoAuditResult {
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  hasLocalBusinessSchema: boolean;
  hasNap: boolean;
  hasClickToCall: boolean;
  isDoorwayPageSuspect: boolean;
  issues: AuditIssue[];
}

export interface MarketingFunnelStagePlan {
  stage: FunnelStage;
  targetAudience: string;
  searchIntent: SearchIntent;
  contentAngle: string;
  conversionGoal: string;
  keyAssetsToBuild: string[];
}

export interface DigitalMarketingStrategy {
  target: string;
  primaryValueProposition: string;
  targetAudiencePersonas: string[];
  funnelPlan: MarketingFunnelStagePlan[];
  croStrategicLevers: {
    frictionReduction: string[];
    socialProofEnhancements: string[];
    urgencyAndIncentives: string[];
    mobileConversionOptimization: string[];
  };
  aeoEngineCapturePlan: {
    targetQuestions: string[];
    definitionSnippets: string[];
    schemaHierarchy: string[];
  };
  quarterlyRoadmap: {
    day0to30: string[];
    day30to60: string[];
    day60to90: string[];
  };
  projectedKpiImpact: {
    metric: string;
    baselineEstimate: string;
    projectedGrowth: string;
  }[];
}

export interface CompetitorBenchmark {
  name: string;
  url?: string;
  archetype: 'market_leader' | 'direct_alternative' | 'niche_challenger';
  keyStrengths: string[];
  vulnerabilitiesToExploit: string[];
  tacticalOutrankingAction: string;
}

export interface DirectoryTarget {
  name: string;
  url: string;
  authorityType: 'b2b_software' | 'local_citations' | 'industry_specific' | 'open_source' | 'startup_launch';
  relevanceReason: string;
  submissionPriority: PriorityTier;
}

export interface KeywordCluster {
  theme: string;
  intent: SearchIntent;
  coreKeywords: string[];
  suggestedContentFormat: 'comparison_page' | 'tutorial_guide' | 'pricing_matrix' | 'service_landing' | 'faq_hub';
  aeoTargetSnippet: string;
}

export interface RelatedEcosystemResult {
  target: string;
  detectedVertical: string;
  competitors: CompetitorBenchmark[];
  directoryTargets: DirectoryTarget[];
  keywordClusters: KeywordCluster[];
  knowledgeGraphEntitySuggestions: {
    recommendedSameAsLinks: string[];
    entityType: string;
    wikidataRelevance?: string;
  };
  strategicTakeaway: string;
}

export type WebMcpLanguage =
  | 'typescript-node'
  | 'nextjs-app'
  | 'nextjs-pages'
  | 'python-fastapi'
  | 'php-laravel'
  | 'go'
  | 'rust'
  | 'csharp-dotnet'
  | 'java-spring'
  | 'ruby-rails'
  | 'static-browser-dom'
  | 'all';

export interface WebMcpToolDefinition {
  name: string;
  description: string;
  inputSchema?: any;
}

export interface WebMcpTestResult {
  url: string;
  isWebMcpEnabled: boolean;
  transportTypesFound: ('streamable-http' | 'legacy-sse' | 'browser-dom' | 'discovery-manifest')[];
  endpointsFound: {
    streamableHttpEndpoint?: string;
    sseEndpoint?: string;
    messageEndpoint?: string;
    serverCardJsonUrl?: string;
    llmsTxtUrl?: string;
  };
  exposedTools: WebMcpToolDefinition[];
  protocolCompliance: {
    streamableHttpCompliant: boolean;
    legacySseCompliant: boolean;
    corsHeadersValid: boolean;
    sessionManagementSupported: boolean;
  };
  securityAudit: {
    isOriginValidated: boolean;
    dnsRebindingProtected: boolean;
    tlsEnforced: boolean;
  };
  score: number; // 0-100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  issues: AuditIssue[];
  multiLanguageImplementationGuide?: {
    language: WebMcpLanguage;
    blueprintSnippet: string;
    fileLocation: string;
    dependencies: string;
    explanation: string;
  }[];
}

// ---------------------------------------------------------------------------
// Multi-Page Sitemap, Robots.txt & Security Headers Interfaces
// ---------------------------------------------------------------------------

export interface SecurityHeadersAnalysis {
  isHttps: boolean;
  hsts: {
    present: boolean;
    value?: string;
    maxAgeSeconds?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
    isValid: boolean;
    recommendations?: string;
  };
  contentSecurityPolicy: {
    present: boolean;
    value?: string;
    recommendations?: string;
  };
  xFrameOptions: {
    present: boolean;
    value?: string;
    isValid: boolean;
    recommendations?: string;
  };
  xContentTypeOptions: {
    present: boolean;
    value?: string;
    isValid: boolean;
    recommendations?: string;
  };
  referrerPolicy: {
    present: boolean;
    value?: string;
    isValid: boolean;
    recommendations?: string;
  };
  permissionsPolicy: {
    present: boolean;
    value?: string;
    recommendations?: string;
  };
  score: number; // 0 - 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  issues: AuditIssue[];
}

export interface RobotsRule {
  userAgent: string;
  allow: string[];
  disallow: string[];
  crawlDelay?: number;
}

export interface RobotsTxtAnalysis {
  exists: boolean;
  rawContent?: string;
  rules: RobotsRule[];
  sitemapUrls: string[];
  disallowedPathsForGooglebot: string[];
  disallowedPathsForAiBots: string[];
  issues: AuditIssue[];
}

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
  isAllowedByRobots?: boolean;
}

export interface SitemapAnalysis {
  exists: boolean;
  sitemapIndexUrls: string[];
  entries: SitemapEntry[];
  totalUrls: number;
  issues: AuditIssue[];
}

export interface MultipageAuditPageSummary {
  url: string;
  isAllowedByRobots: boolean;
  statusCode: number;
  title?: string;
  hasH1: boolean;
  hasCanonical: boolean;
  hasMetaDescription: boolean;
  schemaTypes: string[];
  hasWebMcp: boolean;
  healthScore: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  issuesCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface MultipageAuditResult {
  target: string;
  totalSitemapUrls: number;
  totalAuditedPages: number;
  siteAverageScore: number;
  siteAverageGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  robotsAnalysis: RobotsTxtAnalysis;
  sitemapAnalysis: SitemapAnalysis;
  securityHeaders: SecurityHeadersAnalysis;
  pageAudits: MultipageAuditPageSummary[];
  sitewideIssuesSummary: {
    missingTitles: string[];
    missingMetaDescriptions: string[];
    missingCanonicals: string[];
    missingH1s: string[];
    missingSchemas: string[];
    missingWebMcp: string[];
    disallowedPagesInSitemap: string[];
  };
  aggregateActionPlan: {
    p0: AuditIssue[];
    p1: AuditIssue[];
    p2: AuditIssue[];
    p3: AuditIssue[];
  };
}
