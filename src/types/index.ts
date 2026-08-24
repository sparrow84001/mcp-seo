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
  validationErrors?: string[];
}

export interface ExtractedHeading {
  level: number;
  text: string;
}

export interface PageData {
  url?: string;
  filePath?: string;
  pageType: PageType;
  title?: string;
  metaDescription?: string;
  canonical?: string;
  metaRobots?: string;
  viewport?: string;
  charset?: string;
  favicon?: string;
  ogTags: Record<string, string>;
  twitterTags: Record<string, string>;
  headings: ExtractedHeading[];
  h1Count: number;
  wordCount: number;
  extractedText: string;
  paragraphs: string[];
  links: ExtractedLink[];
  images: ExtractedImage[];
  schemas: ExtractedSchema[];
  scripts: { src?: string; isAsync?: boolean; isDefer?: boolean; content?: string }[];
  framework?: FrameworkType;
  rawHtml?: string;
}

export interface ProjectDiscoveryResult {
  projectPath: string;
  framework: FrameworkType;
  frameworkDetails: {
    name: string;
    version?: string;
    templateEngine?: string;
    routingModel?: string;
    metaHandler?: string;
  };
  detectedRoutes: Array<{ path: string; filePath: string; pageType: PageType }>;
  sitemapFiles: string[];
  robotsTxtFiles: string[];
  llmsTxtFiles: string[];
  pageInventory: Record<PageType, number>;
  metaHelperLocations: string[];
  totalScannedFiles: number;
}

export interface DimensionScore {
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  weightPercent: number;
  summary: string;
  issuesCount: { critical: number; high: number; medium: number; low: number };
}

export interface AuditScores {
  seo: DimensionScore;
  aeo: DimensionScore;
  geo: DimensionScore;
  local: DimensionScore;
  content: DimensionScore;
  technical: DimensionScore;
  conversion: DimensionScore;
  performance: DimensionScore;
  overall: number;
}

export interface MarketingAudienceMapping {
  primaryAudience: string;
  searchIntent: SearchIntent;
  funnelStage: FunnelStage;
  coreCustomerProblem: string;
  valueProposition: string;
}

export interface MarketingCROPlan {
  primaryCtaRecommendation: string;
  secondaryCtaRecommendation: string;
  trustSignalsToIntegrate: string[];
  frictionReductionTactics: string[];
  riskReversalOffer: string;
}

export interface MarketingAeoStrategy {
  targetQuestions: string[];
  aiOverviewSnippetTemplate: string;
  faqSchemaTopics: string[];
  citationOpportunities: string[];
}

export interface MarketingRoadmap {
  days1To30: string[];
  days31To60: string[];
  days61To90: string[];
}

export interface MarketingStrategy {
  timestamp: string;
  target: string;
  framework?: FrameworkType;
  healthScore: number;
  marketingReadinessGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  executiveMarketingSummary: string;
  audienceMapping: MarketingAudienceMapping;
  croOptimizationPlan: MarketingCROPlan;
  aeoAiSearchPlaybook: MarketingAeoStrategy;
  highRoiQuickWins: AuditIssue[];
  executionRoadmap: MarketingRoadmap;
  projectedKpiImpact: {
    organicTrafficGrowth: string;
    serpClickThroughRate: string;
    leadConversionRate: string;
    aiOverviewCitationLikelihood: string;
  };
}

export interface AuditReport {
  timestamp: string;
  projectOrUrl: string;
  framework?: FrameworkType;
  scores: AuditScores;
  executiveSummary: string;
  criticalProblems: AuditIssue[];
  quickWins: AuditIssue[];
  issuesByDimension: Record<AuditDimension, AuditIssue[]>;
  codeProblems: Array<{ file: string; issues: string[]; lines?: string }>;
  recommendedFixes: Array<{
    id: string;
    title: string;
    targetFile: string;
    solution: string;
    diffPreview?: string;
  }>;
  marketingStrategy?: MarketingStrategy;
  implementationPlan: {
    phase1: string[];
    phase2: string[];
    phase3: string[];
    phase4: string[];
    phase5: string[];
  };
}

export interface CodeFixPlan {
  id: string;
  file: string;
  framework: FrameworkType;
  existingProblem: string;
  proposedChange: string;
  unifiedDiff: string;
  reason: string;
  risk: 'low' | 'medium' | 'high';
  expectedResult: string;
  status: 'proposed' | 'applied' | 'rejected' | 'reverted';
}

export interface ValidationResult {
  file: string;
  valid: boolean;
  syntaxErrors: string[];
  duplicateMetaTags: string[];
  schemaValidationErrors: string[];
  beforeScores: Partial<Record<AuditDimension, number>>;
  afterScores: Partial<Record<AuditDimension, number>>;
  improvements: string[];
}

export type IndustryVertical =
  | 'b2b-saas-devtools'
  | 'ecommerce-retail'
  | 'agency-professional-services'
  | 'fintech-finance'
  | 'healthcare-wellness'
  | 'education-edtech'
  | 'media-publishing'
  | 'local-home-services'
  | 'real-estate-property'
  | 'general-business';

export interface IndustryNicheProfile {
  vertical: IndustryVertical;
  primaryNiche: string;
  targetAudienceType: 'B2B' | 'B2C' | 'B2B2C' | 'Enterprise' | 'Local Consumers';
  marketPositioningSummary: string;
  inferredValueDrivers: string[];
}

export interface CompetitorArchetype {
  category: 'Market Leader / Benchmark' | 'Direct Competitor' | 'Niche Alternative / Challenger';
  archetypeName: string;
  typicalDomainExample: string;
  whatTheyDoWell: string;
  howToOutrankOrDifferentiate: string;
}

export interface BacklinkDirectoryProspect {
  platformName: string;
  urlOrDomain: string;
  category: 'Review Platform' | 'Industry Directory' | 'High-DA Citation' | 'Community / Showcase';
  importance: 'High' | 'Medium' | 'Essential';
  recommendedListingAction: string;
}

export interface KeywordTopicCluster {
  clusterTheme: string;
  sampleSearchQueries: string[];
  contentAngle: string;
  searchIntent: SearchIntent;
  conversionPotential: 'High' | 'Medium';
}

export interface EntityKnowledgeGraphSuggestion {
  entityName: string;
  wikidataUrl?: string;
  recommendedSchemaType: string;
  sameAsCandidates: string[];
  contextReasoning: string;
}

export interface RelatedEcosystemResult {
  timestamp: string;
  target: string;
  nicheProfile: IndustryNicheProfile;
  competitorArchetypes: CompetitorArchetype[];
  authorityDirectoryProspects: BacklinkDirectoryProspect[];
  keywordTopicClusters: KeywordTopicCluster[];
  knowledgeGraphSuggestions: EntityKnowledgeGraphSuggestion[];
  strategicGrowthAdvice: string[];
}

export type ServerTransportMode = 'stdio' | 'http' | 'sse';

