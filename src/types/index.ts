export type FrameworkType =
  | 'laravel'
  | 'nextjs-app'
  | 'nextjs-pages'
  | 'react'
  | 'vue'
  | 'nuxt'
  | 'astro'
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
