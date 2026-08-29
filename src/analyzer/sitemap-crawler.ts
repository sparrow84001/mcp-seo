import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import type {
  AuditIssue,
  MultipageAuditPageSummary,
  MultipageAuditResult,
  PageData,
  PageType,
  ProjectDiscoveryResult,
  RobotsRule,
  RobotsTxtAnalysis,
  SecurityHeadersAnalysis,
  SitemapAnalysis,
  SitemapEntry
} from '../types/index.ts';
import { crawlUrlOrFile } from './crawler.ts';
import { auditOnPageSeo } from './onpage.ts';
import { auditTechnicalSeo } from './technical.ts';
import { auditAeo } from './aeo.ts';
import { auditGeo } from './geo.ts';
import { auditConversion } from './conversion.ts';
import { auditPerformanceRisks } from './performance.ts';
import { auditLocalSeo } from './local.ts';
import { evaluateContentQuality } from './content.ts';
import { testWebMcpSupport } from './web-mcp-detector.ts';


// ---------------------------------------------------------------------------
// 1. Robots.txt Parser & Rule Evaluator
// ---------------------------------------------------------------------------

export function isPathAllowed(
  testPath: string,
  userAgent: string = 'Googlebot',
  rules: RobotsRule[] = []
): boolean {
  if (!rules || rules.length === 0) return true;

  // Clean path (strip domain if full URL passed)
  let cleanPath = testPath;
  try {
    if (testPath.startsWith('http://') || testPath.startsWith('https://')) {
      const parsed = new URL(testPath);
      cleanPath = parsed.pathname + parsed.search;
    }
  } catch {
    cleanPath = testPath;
  }
  if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;

  // Match specific userAgent rule first, then fallback to wildcard '*'
  const normalizedAgent = userAgent.toLowerCase();
  const specificRule = rules.find((r) => r.userAgent.toLowerCase() === normalizedAgent);
  const wildcardRule = rules.find((r) => r.userAgent === '*');

  const activeRule = specificRule || wildcardRule;
  if (!activeRule) return true;

  // RFC 9309: Standard longest-match specificity rule
  let longestMatchLength = -1;
  let allowed = true;

  for (const allowPattern of activeRule.allow) {
    if (matchesRobotsPattern(cleanPath, allowPattern)) {
      if (allowPattern.length > longestMatchLength) {
        longestMatchLength = allowPattern.length;
        allowed = true;
      }
    }
  }

  for (const disallowPattern of activeRule.disallow) {
    if (disallowPattern === '') {
      if (0 >= longestMatchLength) {
        longestMatchLength = 0;
        allowed = true;
      }
      continue;
    }
    if (matchesRobotsPattern(cleanPath, disallowPattern)) {
      if (disallowPattern.length > longestMatchLength) {
        longestMatchLength = disallowPattern.length;
        allowed = false;
      }
    }
  }

  return allowed;
}


function matchesRobotsPattern(targetPath: string, pattern: string): boolean {
  if (!pattern) return false;
  if (pattern === '/') return true;

  const hasEndAnchor = pattern.endsWith('$');
  const cleanPattern = hasEndAnchor ? pattern.slice(0, -1) : pattern;

  let regexStr = cleanPattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');

  regexStr = '^' + regexStr + (hasEndAnchor ? '$' : '');

  try {
    const regex = new RegExp(regexStr);
    return regex.test(targetPath);
  } catch {
    return targetPath.startsWith(cleanPattern);
  }
}


export async function fetchAndParseRobotsTxt(
  targetUrlOrPath: string
): Promise<RobotsTxtAnalysis> {
  const isUrl = /^https?:\/\//i.test(targetUrlOrPath);
  let rawContent: string | undefined;
  let effectiveUrl: string | undefined;
  let effectiveFilePath: string | undefined;

  if (isUrl) {
    try {
      const baseOrigin = new URL(targetUrlOrPath).origin;
      effectiveUrl = `${baseOrigin}/robots.txt`;
      const res = await fetch(effectiveUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AntigravityAuditor/1.0)' },
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        rawContent = await res.text();
      }
    } catch {
      // Offline / unreachable
    }
  } else {
    const possiblePaths = [
      path.join(targetUrlOrPath, 'public/robots.txt'),
      path.join(targetUrlOrPath, 'static/robots.txt'),
      path.join(targetUrlOrPath, 'robots.txt'),
      targetUrlOrPath
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        effectiveFilePath = p;
        rawContent = fs.readFileSync(p, 'utf8');
        break;
      }
    }
  }

  const issues: AuditIssue[] = [];
  const rules: RobotsRule[] = [];
  const sitemapUrls: string[] = [];

  if (!rawContent) {
    issues.push({
      id: 'ROBOTS_TXT_MISSING',
      dimension: 'technical',
      title: 'Missing robots.txt File',
      severity: 'high',
      priority: 'P1',
      priorityScore: 8.0,
      evidence: effectiveUrl ? `404 Not Found at ${effectiveUrl}` : 'No robots.txt found in project directory.',
      evidenceType: 'confirmed',
      whyItMatters:
        'A robots.txt file guides search engine crawlers and AI bots, specifies crawl delay, and points to the XML sitemap.',
      recommendedSolution: 'Create a standard robots.txt file at the root of your domain with sitemap declaration.',
      implementationApproach: 'Use `generateRobotsTxt()` to create a compliant robots.txt.',
      expectedImpact: 'Improves crawl efficiency and prevents unauthorized scraping of private routes.',
      effort: 'low'
    });

    return {
      url: effectiveUrl,
      filePath: effectiveFilePath,
      exists: false,
      rules: [],
      sitemapUrls: [],
      disallowedPathsForGooglebot: [],
      disallowedPathsForAiBots: [],
      issues
    };
  }

  // Parse lines
  const lines = rawContent.split(/\r?\n/);
  let currentAgents: string[] = [];
  let currentAllow: string[] = [];
  let currentDisallow: string[] = [];
  let currentCrawlDelay: number | undefined;

  const flushRule = () => {
    if (currentAgents.length > 0) {
      for (const agent of currentAgents) {
        rules.push({
          userAgent: agent,
          allow: [...currentAllow],
          disallow: [...currentDisallow],
          crawlDelay: currentCrawlDelay
        });
      }
      currentAgents = [];
      currentAllow = [];
      currentDisallow = [];
      currentCrawlDelay = undefined;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const directive = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();

    if (directive === 'user-agent') {
      if (currentAllow.length > 0 || currentDisallow.length > 0 || currentCrawlDelay !== undefined) {
        flushRule();
      }
      currentAgents.push(value);
    } else if (directive === 'allow') {
      currentAllow.push(value);
    } else if (directive === 'disallow') {
      currentDisallow.push(value);
    } else if (directive === 'crawl-delay') {
      currentCrawlDelay = parseFloat(value) || undefined;
    } else if (directive === 'sitemap') {
      if (value && !sitemapUrls.includes(value)) {
        sitemapUrls.push(value);
      }
    }
  }
  flushRule();

  // Audit checks
  const wildcardRule = rules.find((r) => r.userAgent === '*');
  const googlebotRule = rules.find((r) => r.userAgent.toLowerCase() === 'googlebot') || wildcardRule;

  const disallowedPathsForGooglebot = googlebotRule?.disallow || [];

  // Check if site is completely blocked
  if (wildcardRule?.disallow.includes('/') && !wildcardRule.allow.includes('/')) {
    issues.push({
      id: 'ROBOTS_BLOCKING_ENTIRE_SITE',
      dimension: 'technical',
      title: 'CRITICAL: robots.txt is Blocking All Crawlers (Disallow: /)',
      severity: 'critical',
      priority: 'P0',
      priorityScore: 10.0,
      evidence: 'User-agent: * contains Disallow: / without an overriding Allow rule.',
      evidenceType: 'confirmed',
      whyItMatters: 'Search engines are completely blocked from indexing any page on your website.',
      recommendedSolution: 'Remove `Disallow: /` or replace with `Allow: /` for production environments.',
      implementationApproach: 'Update robots.txt immediately.',
      expectedImpact: 'Restores complete search indexation.',
      effort: 'low'
    });
  }

  // Check for CSS / JS asset blocking
  const blocksAssets = rules.some((r) =>
    r.disallow.some((p) => p.includes('.css') || p.includes('.js') || p.includes('/assets/') || p.includes('/static/'))
  );
  if (blocksAssets) {
    issues.push({
      id: 'ROBOTS_BLOCKING_ASSETS',
      dimension: 'technical',
      title: 'robots.txt Blocks CSS/JS Assets Needed for Page Rendering',
      severity: 'high',
      priority: 'P1',
      priorityScore: 8.5,
      evidence: 'Disallow rules found that restrict access to CSS or JS asset directories.',
      evidenceType: 'confirmed',
      whyItMatters:
        'Googlebot renders pages using a full Chromium engine. Blocking CSS/JS leads to incorrect rendering and mobile responsiveness penalties.',
      recommendedSolution: 'Allow Googlebot access to all CSS, JavaScript, and font assets.',
      implementationApproach: 'Add `Allow: /*.css$` and `Allow: /*.js$` in robots.txt.',
      expectedImpact: 'Ensures accurate rendering and mobile usability scoring in search algorithms.',
      effort: 'low'
    });
  }

  // Check AI bots (GPTBot, PerplexityBot, ClaudeBot, Google-Extended)
  const aiBotNames = ['gptbot', 'perplexitybot', 'claudebot', 'google-extended', 'ccbot'];
  const disallowedPathsForAiBots: string[] = [];

  for (const bot of aiBotNames) {
    const r = rules.find((rule) => rule.userAgent.toLowerCase() === bot);
    if (r && r.disallow.includes('/')) {
      disallowedPathsForAiBots.push(bot);
    }
  }

  if (sitemapUrls.length === 0) {
    issues.push({
      id: 'ROBOTS_MISSING_SITEMAP_DIRECTIVE',
      dimension: 'technical',
      title: 'robots.txt Does Not Declare Sitemap URL',
      severity: 'medium',
      priority: 'P2',
      priorityScore: 6.5,
      evidence: 'No `Sitemap: https://...` line found in robots.txt.',
      evidenceType: 'confirmed',
      whyItMatters: 'Declaring the XML sitemap in robots.txt speeds up discovery of new and updated pages.',
      recommendedSolution: 'Append `Sitemap: https://yourdomain.com/sitemap.xml` to robots.txt.',
      implementationApproach: 'Add `Sitemap: <canonical_url>/sitemap.xml` at the bottom of robots.txt.',
      expectedImpact: 'Speeds up discovery and indexation of new URLs.',
      effort: 'low'
    });
  }

  return {
    url: effectiveUrl,
    filePath: effectiveFilePath,
    exists: true,
    rawContent,
    rules,
    sitemapUrls,
    disallowedPathsForGooglebot,
    disallowedPathsForAiBots,
    issues
  };
}

// ---------------------------------------------------------------------------
// 2. Sitemap.xml & Sitemap Index Parser
// ---------------------------------------------------------------------------

export async function fetchAndParseSitemap(
  targetUrlOrPath: string,
  robotsAnalysis?: RobotsTxtAnalysis
): Promise<SitemapAnalysis> {
  const isUrl = /^https?:\/\//i.test(targetUrlOrPath);
  const issues: AuditIssue[] = [];
  const entries: SitemapEntry[] = [];
  const subSitemaps: string[] = [];
  let rawXml: string | undefined;
  let effectiveUrl: string | undefined;
  let effectiveFilePath: string | undefined;

  // Determine potential sitemap URLs or paths
  const sitemapCandidates: string[] = [];
  if (robotsAnalysis?.sitemapUrls && robotsAnalysis.sitemapUrls.length > 0) {
    sitemapCandidates.push(...robotsAnalysis.sitemapUrls);
  }

  if (isUrl) {
    const baseOrigin = new URL(targetUrlOrPath).origin;
    sitemapCandidates.push(
      `${baseOrigin}/sitemap.xml`,
      `${baseOrigin}/sitemap_index.xml`,
      `${baseOrigin}/sitemap/sitemap.xml`
    );

    for (const cand of sitemapCandidates) {
      try {
        const res = await fetch(cand, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AntigravityAuditor/1.0)' },
          signal: AbortSignal.timeout(4000)
        });
        if (res.ok) {
          rawXml = await res.text();
          effectiveUrl = cand;
          break;
        }
      } catch {
        // Continue
      }
    }
  } else {
    const possiblePaths = [
      path.join(targetUrlOrPath, 'public/sitemap.xml'),
      path.join(targetUrlOrPath, 'static/sitemap.xml'),
      path.join(targetUrlOrPath, 'sitemap.xml'),
      targetUrlOrPath
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        effectiveFilePath = p;
        rawXml = fs.readFileSync(p, 'utf8');
        break;
      }
    }
  }

  if (!rawXml) {
    issues.push({
      id: 'SITEMAP_XML_MISSING',
      dimension: 'technical',
      title: 'Missing XML Sitemap (sitemap.xml)',
      severity: 'high',
      priority: 'P1',
      priorityScore: 8.5,
      evidence: effectiveUrl ? `404 Not Found at ${effectiveUrl}` : 'No sitemap.xml detected in project directory.',
      evidenceType: 'confirmed',
      whyItMatters:
        'XML Sitemaps inform search engines about all canonical URLs on your site, their last modified date, and priority hierarchy.',
      recommendedSolution: 'Generate and host a standard `sitemap.xml` file at your domain root.',
      implementationApproach: 'Use `generateSitemapXml()` or automated build-time sitemap generator.',
      expectedImpact: 'Significantly improves crawl efficiency, coverage, and discovery speed.',
      effort: 'low'
    });

    return {
      url: effectiveUrl,
      filePath: effectiveFilePath,
      exists: false,
      isIndex: false,
      totalUrls: 0,
      entries: [],
      subSitemaps: [],
      issues
    };
  }

  const $ = cheerio.load(rawXml, { xmlMode: true });
  const isIndex = $('sitemapindex').length > 0;

  if (isIndex) {
    $('sitemap').each((_, el) => {
      const loc = $(el).find('loc').text().trim();
      if (loc) subSitemaps.push(loc);
    });

    // Recursively parse first few sub-sitemaps (up to 3 to prevent infinite loops)
    for (const subUrl of subSitemaps.slice(0, 3)) {
      try {
        const subRes = await fetch(subUrl, { signal: AbortSignal.timeout(3000) });
        if (subRes.ok) {
          const subXml = await subRes.text();
          const sub$ = cheerio.load(subXml, { xmlMode: true });
          sub$('url').each((_, urlEl) => {
            const loc = sub$(urlEl).find('loc').text().trim();
            const lastmod = sub$(urlEl).find('lastmod').text().trim() || undefined;
            const changefreq = sub$(urlEl).find('changefreq').text().trim() || undefined;
            const priority = sub$(urlEl).find('priority').text().trim() || undefined;

            if (loc) {
              const allowed = robotsAnalysis ? isPathAllowed(loc, 'Googlebot', robotsAnalysis.rules) : true;
              entries.push({ loc, lastmod, changefreq, priority, isAllowedByRobots: allowed });
            }
          });
        }
      } catch {
        // Continue
      }
    }
  } else {
    $('url').each((_, el) => {
      const loc = $(el).find('loc').text().trim();
      const lastmod = $(el).find('lastmod').text().trim() || undefined;
      const changefreq = $(el).find('changefreq').text().trim() || undefined;
      const priority = $(el).find('priority').text().trim() || undefined;

      if (loc) {
        const allowed = robotsAnalysis ? isPathAllowed(loc, 'Googlebot', robotsAnalysis.rules) : true;
        entries.push({ loc, lastmod, changefreq, priority, isAllowedByRobots: allowed });
      }
    });
  }

  // Audit checks
  if (entries.length === 0 && subSitemaps.length === 0) {
    issues.push({
      id: 'SITEMAP_EMPTY',
      dimension: 'technical',
      title: 'XML Sitemap is Empty (0 URLs Found)',
      severity: 'high',
      priority: 'P1',
      priorityScore: 8.0,
      evidence: 'sitemap.xml was discovered but contains zero <url> or <sitemap> entries.',
      evidenceType: 'confirmed',
      whyItMatters: 'An empty sitemap provides no indexation value to search engine bots.',
      recommendedSolution: 'Populate sitemap.xml with all canonical public URLs of your website.',
      implementationApproach: 'Re-generate sitemap.xml from site routes.',
      expectedImpact: 'Restores automatic search indexation discovery.',
      effort: 'low'
    });
  }

  // Check for disallowed URLs listed in sitemap
  const disallowedInSitemap = entries.filter((e) => !e.isAllowedByRobots);
  if (disallowedInSitemap.length > 0) {
    issues.push({
      id: 'SITEMAP_CONTAINS_DISALLOWED_URLS',
      dimension: 'technical',
      title: `Contradiction: ${disallowedInSitemap.length} Disallowed URL(s) Found in XML Sitemap`,
      severity: 'medium',
      priority: 'P2',
      priorityScore: 7.0,
      evidence: `Found ${disallowedInSitemap.length} URL(s) in sitemap.xml that are blocked by robots.txt (e.g. \`${disallowedInSitemap[0]?.loc}\`).`,
      evidenceType: 'confirmed',
      whyItMatters:
        'Submitting URLs in sitemap.xml asks search engines to index them, but robots.txt disallows crawling. This sends conflicting signals to search algorithms.',
      recommendedSolution: 'Remove blocked/disallowed URLs from sitemap.xml or update robots.txt to allow them.',
      implementationApproach: 'Filter out disallowed paths prior to compiling sitemap.xml.',
      expectedImpact: 'Eliminates conflicting crawl directives and conserves crawl budget.',
      effort: 'low'
    });
  }

  return {
    url: effectiveUrl,
    filePath: effectiveFilePath,
    exists: true,
    isIndex,
    totalUrls: entries.length,
    entries,
    subSitemaps,
    issues
  };
}

// ---------------------------------------------------------------------------
// 3. HTTP Security Headers Audit (HSTS, CSP, X-Frame-Options, etc.)
// ---------------------------------------------------------------------------

export async function auditSecurityHeaders(
  targetUrl: string,
  existingHeaders?: Headers | Record<string, string>
): Promise<SecurityHeadersAnalysis> {
  const issues: AuditIssue[] = [];
  const isHttps = targetUrl.startsWith('https://');
  let headersMap: Record<string, string> = {};

  if (existingHeaders) {
    if (typeof (existingHeaders as any).get === 'function') {
      const h = existingHeaders as Headers;
      h.forEach((val, key) => {
        headersMap[key.toLowerCase()] = val;
      });
    } else {
      for (const [k, v] of Object.entries(existingHeaders)) {
        headersMap[k.toLowerCase()] = String(v);
      }
    }
  } else if (/^https?:\/\//i.test(targetUrl)) {
    try {
      const res = await fetch(targetUrl, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AntigravityAuditor/1.0)' },
        signal: AbortSignal.timeout(4000)
      });
      res.headers.forEach((val, key) => {
        headersMap[key.toLowerCase()] = val;
      });
    } catch {
      // Fallback
    }
  }

  // 1. HSTS (Strict-Transport-Security)
  const hstsVal = headersMap['strict-transport-security'];
  const hstsPresent = Boolean(hstsVal);
  let hstsValid = false;
  let hstsRec = '';

  if (hstsPresent && hstsVal) {
    const maxAgeMatch = hstsVal.match(/max-age=(\d+)/i);
    const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1]!, 10) : 0;
    const hasSubDomains = /includesubdomains/i.test(hstsVal);
    const hasPreload = /preload/i.test(hstsVal);

    if (maxAge >= 31536000) {
      hstsValid = true;
      hstsRec = 'HSTS is properly configured with >= 1 year max-age.';
    } else {
      hstsRec = `Increase HSTS max-age to 31536000 (1 year). Currently ${maxAge} seconds.`;
      issues.push({
        id: 'SEC_HSTS_SHORT_MAX_AGE',
        dimension: 'technical',
        title: 'HSTS max-age Duration is Less Than 1 Year',
        severity: 'medium',
        priority: 'P2',
        priorityScore: 6.0,
        evidence: `Strict-Transport-Security: ${hstsVal}`,
        evidenceType: 'confirmed',
        whyItMatters: 'Chrome and security scanners recommend at least 31536000 seconds (1 year) for HSTS preload eligibility.',
        recommendedSolution: 'Set `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`.',
        implementationApproach: 'Update web server header configuration.',
        expectedImpact: 'Protects visitors from SSL stripping attacks and qualifies for HSTS preload list.',
        effort: 'low'
      });
    }
  } else {
    hstsRec = 'Missing Strict-Transport-Security header. Add `max-age=31536000; includeSubDomains; preload`.';
    issues.push({
      id: 'SEC_MISSING_HSTS',
      dimension: 'technical',
      title: 'Missing HTTP Strict Transport Security (HSTS) Header',
      severity: isHttps ? 'high' : 'medium',
      priority: isHttps ? 'P1' : 'P2',
      priorityScore: 7.5,
      evidence: 'No `Strict-Transport-Security` header received in HTTP response.',
      evidenceType: 'confirmed',
      whyItMatters:
        'HSTS forces browsers to communicate exclusively over encrypted HTTPS, preventing man-in-the-middle downgrade attacks and bolstering user trust.',
      recommendedSolution: 'Add `Strict-Transport-Security: max-age=31536000; includeSubDomains` header on all HTTPS responses.',
      implementationApproach: 'Configure server (Nginx/Apache/Cloudflare/Caddy) to inject HSTS header.',
      expectedImpact: 'Hardens web security and fulfills modern search engine security recommendations.',
      effort: 'low'
    });
  }

  // 2. Content-Security-Policy (CSP)
  const cspVal = headersMap['content-security-policy'];
  const cspPresent = Boolean(cspVal);
  if (!cspPresent) {
    issues.push({
      id: 'SEC_MISSING_CSP',
      dimension: 'technical',
      title: 'Missing Content-Security-Policy (CSP) Header',
      severity: 'medium',
      priority: 'P2',
      priorityScore: 6.5,
      evidence: 'No `Content-Security-Policy` header found.',
      evidenceType: 'confirmed',
      whyItMatters: 'CSP protects your website against Cross-Site Scripting (XSS) and malicious script injection.',
      recommendedSolution: 'Configure a strong CSP policy restricting valid script, style, and object sources.',
      implementationApproach: 'Add `Content-Security-Policy: default-src \'self\'; ...` header.',
      expectedImpact: 'Mitigates XSS vulnerabilities and enhances security compliance score.',
      effort: 'medium'
    });
  }

  // 3. X-Frame-Options (Clickjacking defense)
  const xfoVal = headersMap['x-frame-options'];
  const xfoPresent = Boolean(xfoVal);
  const xfoValid = xfoPresent && (/deny/i.test(xfoVal || '') || /sameorigin/i.test(xfoVal || ''));
  if (!xfoValid) {
    issues.push({
      id: 'SEC_MISSING_X_FRAME_OPTIONS',
      dimension: 'technical',
      title: 'Missing or Invalid X-Frame-Options Header',
      severity: 'medium',
      priority: 'P2',
      priorityScore: 6.0,
      evidence: xfoVal ? `Invalid value: ${xfoVal}` : 'Header missing',
      evidenceType: 'confirmed',
      whyItMatters: 'Without X-Frame-Options (DENY/SAMEORIGIN), your pages can be loaded inside malicious iframes (Clickjacking).',
      recommendedSolution: 'Set `X-Frame-Options: SAMEORIGIN` or `DENY`.',
      implementationApproach: 'Add header in server or middleware.',
      expectedImpact: 'Prevents iframe framing and UI redressing attacks.',
      effort: 'low'
    });
  }

  // 4. X-Content-Type-Options (MIME sniffing defense)
  const xctoVal = headersMap['x-content-type-options'];
  const xctoPresent = Boolean(xctoVal);
  const xctoValid = xctoPresent && /nosniff/i.test(xctoVal || '');
  if (!xctoValid) {
    issues.push({
      id: 'SEC_MISSING_X_CONTENT_TYPE_OPTIONS',
      dimension: 'technical',
      title: 'Missing X-Content-Type-Options: nosniff Header',
      severity: 'low',
      priority: 'P3',
      priorityScore: 4.5,
      evidence: 'Header missing or does not contain `nosniff`.',
      evidenceType: 'confirmed',
      whyItMatters: 'Prevents browsers from MIME-sniffing a response away from the declared content-type.',
      recommendedSolution: 'Set `X-Content-Type-Options: nosniff`.',
      implementationApproach: 'Add `X-Content-Type-Options: nosniff` header.',
      expectedImpact: 'Guards against MIME confusion attacks.',
      effort: 'low'
    });
  }

  // 5. Referrer-Policy
  const refVal = headersMap['referrer-policy'];
  const refPresent = Boolean(refVal);

  // 6. Permissions-Policy
  const permVal = headersMap['permissions-policy'];
  const permPresent = Boolean(permVal);

  // Compute Security Score
  let score = 100;
  if (!isHttps) score -= 40;
  if (!hstsPresent) score -= 25;
  else if (!hstsValid) score -= 10;
  if (!cspPresent) score -= 15;
  if (!xfoValid) score -= 10;
  if (!xctoValid) score -= 10;
  score = Math.max(0, Math.min(100, score));

  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'A+';
  if (score >= 95) grade = 'A+';
  else if (score >= 85) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 55) grade = 'C';
  else if (score >= 40) grade = 'D';
  else grade = 'F';

  return {
    isHttps,
    hsts: {
      present: hstsPresent,
      value: hstsVal,
      isValid: hstsValid,
      recommendations: hstsRec
    },
    contentSecurityPolicy: {
      present: cspPresent,
      value: cspVal,
      recommendations: cspPresent ? undefined : 'Add Content-Security-Policy header.'
    },
    xFrameOptions: {
      present: xfoPresent,
      value: xfoVal,
      isValid: xfoValid,
      recommendations: xfoValid ? undefined : 'Set X-Frame-Options: SAMEORIGIN.'
    },
    xContentTypeOptions: {
      present: xctoPresent,
      value: xctoVal,
      isValid: xctoValid,
      recommendations: xctoValid ? undefined : 'Set X-Content-Type-Options: nosniff.'
    },
    referrerPolicy: {
      present: refPresent,
      value: refVal,
      isValid: refPresent,
      recommendations: refPresent ? undefined : 'Set Referrer-Policy: strict-origin-when-cross-origin.'
    },
    permissionsPolicy: {
      present: permPresent,
      value: permVal,
      recommendations: permPresent ? undefined : 'Set Permissions-Policy: camera=(), microphone=(), geolocation=().'
    },
    score,
    grade,
    issues
  };
}

// ---------------------------------------------------------------------------
// 4. Multi-Page Site-Wide Batch Audit Engine
// ---------------------------------------------------------------------------

export async function auditSitemapMultipage(
  target: string,
  options?: {
    maxPages?: number;
    userAgent?: string;
    discovery?: ProjectDiscoveryResult;
  }
): Promise<MultipageAuditResult> {
  const maxPages = options?.maxPages || 25;
  const userAgent = options?.userAgent || 'Googlebot';

  // 1. Inspect robots.txt
  const robotsAnalysis = await fetchAndParseRobotsTxt(target);

  // 2. Inspect sitemap.xml
  const sitemapAnalysis = await fetchAndParseSitemap(target, robotsAnalysis);

  // 3. Inspect security headers on root target
  const securityHeaders = await auditSecurityHeaders(target);

  // 4. Compile list of URLs to audit
  let urlsToAudit: string[] = [];
  if (sitemapAnalysis.entries.length > 0) {
    urlsToAudit = sitemapAnalysis.entries.map((e) => e.loc);
  } else if (options?.discovery?.detectedRoutes && options.discovery.detectedRoutes.length > 0) {
    const baseOrigin = /^https?:\/\//i.test(target) ? new URL(target).origin : 'https://example.com';
    urlsToAudit = options.discovery.detectedRoutes.map((r) => `${baseOrigin}${r.path}`);
  } else {
    urlsToAudit = [target];
  }

  // Deduplicate and cap to maxPages
  urlsToAudit = Array.from(new Set(urlsToAudit)).slice(0, maxPages);


  const pageAudits: MultipageAuditPageSummary[] = [];
  const missingTitles: string[] = [];
  const missingMetaDescriptions: string[] = [];
  const missingCanonicals: string[] = [];
  const missingH1s: string[] = [];
  const missingSchemas: string[] = [];
  const missingWebMcp: string[] = [];
  const disallowedPagesInSitemap: string[] = [];

  let healthScoreSum = 0;

  for (const pageUrl of urlsToAudit) {
    try {
      const pageData: PageData = await crawlUrlOrFile(pageUrl, {
        baseUrl: /^https?:\/\//i.test(pageUrl) ? new URL(pageUrl).origin : 'https://example.com'
      });

      const onpageIssues = auditOnPageSeo(pageData);
      const techIssues = auditTechnicalSeo(pageData, options?.discovery);
      const aeoIssues = auditAeo(pageData);
      const geoIssues = auditGeo(pageData);
      const croIssues = auditConversion(pageData);
      const perfIssues = auditPerformanceRisks(pageData);
      const localIssues = auditLocalSeo(pageData);
      const contentIssues = evaluateContentQuality(pageData);


      const allPageIssues = [
        ...onpageIssues,
        ...techIssues,
        ...aeoIssues,
        ...geoIssues,
        ...croIssues,
        ...perfIssues,
        ...localIssues,
        ...(contentIssues.issues || [])
      ];


      const webMcpRes = await testWebMcpSupport(pageUrl, pageData);
      const hasWebMcp = webMcpRes.isWebMcpEnabled;

      const isAllowed = isPathAllowed(pageUrl, userAgent, robotsAnalysis.rules);
      if (!isAllowed) {
        disallowedPagesInSitemap.push(pageUrl);
      }

      if (!pageData.title) missingTitles.push(pageUrl);
      if (!pageData.metaDescription) missingMetaDescriptions.push(pageUrl);
      if (!pageData.canonical) missingCanonicals.push(pageUrl);
      if (pageData.h1Count === 0) missingH1s.push(pageUrl);
      if (!pageData.schemas || pageData.schemas.length === 0) missingSchemas.push(pageUrl);
      if (!hasWebMcp) missingWebMcp.push(pageUrl);

      const criticalCount = allPageIssues.filter((i) => i.severity === 'critical').length;
      const highCount = allPageIssues.filter((i) => i.severity === 'high').length;
      const mediumCount = allPageIssues.filter((i) => i.severity === 'medium').length;

      let pageScore = 100 - (criticalCount * 30 + highCount * 15 + mediumCount * 5);
      if (!isAllowed) pageScore = Math.max(0, pageScore - 20);
      pageScore = Math.max(10, Math.min(100, pageScore));

      healthScoreSum += pageScore;

      pageAudits.push({
        url: pageUrl,
        pageType: pageData.pageType,
        isAllowedByRobots: isAllowed,
        title: pageData.title,
        titleLength: pageData.title?.length || 0,
        hasH1: pageData.h1Count === 1,
        hasMetaDescription: Boolean(pageData.metaDescription),
        hasCanonical: Boolean(pageData.canonical),
        hasSchema: Boolean(pageData.schemas && pageData.schemas.length > 0),
        hasWebMcp,
        healthScore: pageScore,
        criticalCount,
        highCount,
        issues: allPageIssues
      });
    } catch {
      // Page crawl failure
    }
  }

  const totalAudited = pageAudits.length || 1;
  const overallSiteHealthScore = Math.round(healthScoreSum / totalAudited);

  let siteGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'A+';
  if (overallSiteHealthScore >= 95) siteGrade = 'A+';
  else if (overallSiteHealthScore >= 85) siteGrade = 'A';
  else if (overallSiteHealthScore >= 70) siteGrade = 'B';
  else if (overallSiteHealthScore >= 55) siteGrade = 'C';
  else if (overallSiteHealthScore >= 40) siteGrade = 'D';
  else siteGrade = 'F';

  const securityHeaderDeficits: string[] = [];
  if (!securityHeaders.hsts.isValid) securityHeaderDeficits.push('HSTS Missing or Duration < 1 Year');
  if (!securityHeaders.contentSecurityPolicy.present) securityHeaderDeficits.push('Content-Security-Policy Missing');
  if (!securityHeaders.xFrameOptions.isValid) securityHeaderDeficits.push('X-Frame-Options Missing (Clickjacking risk)');

  // Auto-generate sitemap.xml and robots.txt if missing
  let generatedFixFiles: { sitemapXml?: string; robotsTxt?: string } | undefined;
  if (!sitemapAnalysis.exists || !robotsAnalysis.exists) {
    const baseOrigin = /^https?:\/\//i.test(target) ? new URL(target).origin : 'https://example.com';
    const sitemapXml = generateSitemapXml(urlsToAudit.length > 0 ? urlsToAudit : [baseOrigin], baseOrigin);
    const robotsTxt = generateRobotsTxt({ sitemapUrl: `${baseOrigin}/sitemap.xml` });
    generatedFixFiles = { sitemapXml, robotsTxt };
  }

  // Remediation roadmap
  const remediationRoadmap: string[] = [
    disallowedPagesInSitemap.length > 0
      ? `1. Resolve ${disallowedPagesInSitemap.length} conflicting URL(s) that are listed in sitemap.xml but disallowed by robots.txt.`
      : '1. Maintain clean synchronization between robots.txt and sitemap.xml.',
    missingTitles.length > 0 || missingMetaDescriptions.length > 0
      ? `2. Inject missing title tags on ${missingTitles.length} page(s) and meta descriptions on ${missingMetaDescriptions.length} page(s).`
      : '2. Keep title and meta description tags optimized for search intent.',
    missingCanonicals.length > 0
      ? `3. Add self-referencing canonical URLs to ${missingCanonicals.length} page(s) to eliminate duplicate content risk.`
      : '3. Canonicals are consistent across audited inventory.',
    securityHeaderDeficits.length > 0
      ? `4. Configure HTTP security headers (${securityHeaderDeficits.join(', ')}) to achieve an A+ security grade.`
      : '4. Security headers are properly configured.',
    missingWebMcp.length > 0
      ? `5. Deploy WebMCP endpoints (<link rel="mcp-server">) across ${missingWebMcp.length} page(s) to enable autonomous AI search agent discovery.`
      : '5. WebMCP is active across website pages.'
  ];

  return {
    target,
    timestamp: new Date().toISOString(),
    sitemapAnalysis,
    robotsTxtAnalysis: robotsAnalysis,
    securityHeaders,
    totalAuditedPages: pageAudits.length,
    overallSiteHealthScore,
    siteGrade,
    pageAudits,
    sitewideIssuesSummary: {
      missingTitles,
      missingMetaDescriptions,
      missingCanonicals,
      missingH1s,
      missingSchemas,
      missingWebMcp,
      disallowedPagesInSitemap,
      securityHeaderDeficits
    },
    generatedFixFiles,
    remediationRoadmap
  };
}

// ---------------------------------------------------------------------------
// 5. Sitemap & Robots.txt Generators
// ---------------------------------------------------------------------------

export function generateSitemapXml(
  urls: string[],
  baseUrl: string = 'https://example.com'
): string {
  const cleanBase = baseUrl.replace(/\/$/, '');
  const uniqueUrls = Array.from(
    new Set(
      urls.map((u) => {
        if (u.startsWith('http://') || u.startsWith('https://')) return u;
        return `${cleanBase}${u.startsWith('/') ? '' : '/'}${u}`;
      })
    )
  );

  const today = new Date().toISOString().split('T')[0];

  const xmlItems = uniqueUrls
    .map(
      (url) => `  <url>
    <loc>${escapeXml(url)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${url === cleanBase || url === cleanBase + '/' ? 'daily' : 'weekly'}</changefreq>
    <priority>${url === cleanBase || url === cleanBase + '/' ? '1.0' : '0.8'}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlItems}
</urlset>
`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

export function generateRobotsTxt(options?: {
  sitemapUrl?: string;
  disallowedPaths?: string[];
  allowedPaths?: string[];
  allowAiBots?: boolean;
}): string {
  const disallows = options?.disallowedPaths || ['/admin/', '/api/private/', '/tmp/'];
  const allows = options?.allowedPaths || ['/'];
  const sitemap = options?.sitemapUrl || 'https://example.com/sitemap.xml';

  const disallowLines = disallows.map((d) => `Disallow: ${d}`).join('\n');
  const allowLines = allows.map((a) => `Allow: ${a}`).join('\n');

  let content = `# ==============================================================================
# robots.txt - Standard Search Engine & AI Agent Directives
# Generated by Antigravity SEO & WebMCP Engine
# ==============================================================================

User-agent: *
${allowLines}
${disallowLines}

# Search Engine Sitemap Index
Sitemap: ${sitemap}

# AI Search & Answer Engine Directives (Allow grounding & indexation)
User-agent: GPTBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Google-Extended
Allow: /
`;

  return content;
}

// ---------------------------------------------------------------------------
// 6. Markdown Report Formatter
// ---------------------------------------------------------------------------

export function formatMultipageReportToMarkdown(result: MultipageAuditResult): string {
  const gradeBadge =
    result.siteGrade === 'A+' || result.siteGrade === 'A'
      ? '🟢 EXCELLENT'
      : result.siteGrade === 'B'
      ? '🟡 GOOD'
      : '🔴 NEEDS REMEDIATION';

  const secGradeBadge =
    result.securityHeaders.grade === 'A+' || result.securityHeaders.grade === 'A'
      ? '🟢 STRONG'
      : result.securityHeaders.grade === 'B'
      ? '🟡 MODERATE'
      : '🔴 VULNERABLE';

  return `# 🗺️ Multi-Page Site-Wide Sitemap, Robots & Security Audit

**Target URL:** \`${result.target}\`  
**Audited At:** ${result.timestamp}  
**Overall Site Health Score:** **${result.overallSiteHealthScore}/100** (\`${result.siteGrade}\` - ${gradeBadge})  
**Audited Pages:** ${result.totalAuditedPages} registered page(s)  

---

## 🛡️ HTTP Security & Trust Headers Scorecard

| Security Check | Status | Value / Directive | Recommendation |
| :--- | :---: | :--- | :--- |
| **HTTPS Protocol** | ${result.securityHeaders.isHttps ? '✅ Enforced' : '🔴 Insecure (HTTP)'} | \`${result.target}\` | Must serve all traffic over TLS/HTTPS. |
| **HSTS (Strict-Transport-Security)** | ${result.securityHeaders.hsts.isValid ? '✅ Active' : '🔴 Missing / Weak'} | \`${result.securityHeaders.hsts.value || 'None'}\` | ${result.securityHeaders.hsts.recommendations || 'Active'} |
| **Content-Security-Policy (CSP)** | ${result.securityHeaders.contentSecurityPolicy.present ? '✅ Active' : '🟡 Missing'} | \`${result.securityHeaders.contentSecurityPolicy.value?.slice(0, 40) || 'None'}...\` | Prevents XSS script injection. |
| **X-Frame-Options** | ${result.securityHeaders.xFrameOptions.isValid ? '✅ Protected' : '🔴 Vulnerable'} | \`${result.securityHeaders.xFrameOptions.value || 'None'}\` | Set \`SAMEORIGIN\` to prevent clickjacking. |
| **X-Content-Type-Options** | ${result.securityHeaders.xContentTypeOptions.isValid ? '✅ nosniff' : '🟡 Missing'} | \`${result.securityHeaders.xContentTypeOptions.value || 'None'}\` | Set \`nosniff\` to block MIME confusion. |
| **Overall Security Score** | **${result.securityHeaders.score}/100** | Grade \`${result.securityHeaders.grade}\` (${secGradeBadge}) | - |

---

## 🤖 Robots.txt & Crawl Access Analysis

* **Robots.txt Status:** ${result.robotsTxtAnalysis.exists ? `✅ Found at \`${result.robotsTxtAnalysis.url || 'project'}\`` : '🔴 Missing robots.txt'}
* **Declared Sitemaps:** ${result.robotsTxtAnalysis.sitemapUrls.map((s) => `\`${s}\``).join(', ') || '⚠️ None declared'}
* **Googlebot Blocked Paths:** ${result.robotsTxtAnalysis.disallowedPathsForGooglebot.map((p) => `\`${p}\``).join(', ') || 'None (All allowed)'}
* **AI Bots Blocked (GPTBot/ClaudeBot):** ${result.robotsTxtAnalysis.disallowedPathsForAiBots.map((b) => `\`${b}\``).join(', ') || 'None (All AI bots allowed)'}

---

## 📑 XML Sitemap Discovery & Page Inventory

* **Sitemap.xml Status:** ${result.sitemapAnalysis.exists ? `✅ Found at \`${result.sitemapAnalysis.url || 'project'}\`` : '🔴 Missing sitemap.xml'}
* **Total Registered URLs:** **${result.sitemapAnalysis.totalUrls}** page(s)
* **Sub-Sitemaps Discovered:** ${result.sitemapAnalysis.subSitemaps.length > 0 ? result.sitemapAnalysis.subSitemaps.map((s) => `\`${s}\``).join(', ') : 'Single index sitemap'}

### 🚨 Site-Wide Inventory Deficits:
* **Missing Title Tags:** ${result.sitewideIssuesSummary.missingTitles.length} page(s)
* **Missing Meta Descriptions:** ${result.sitewideIssuesSummary.missingMetaDescriptions.length} page(s)
* **Missing Canonical URLs:** ${result.sitewideIssuesSummary.missingCanonicals.length} page(s)
* **Missing H1 Headings:** ${result.sitewideIssuesSummary.missingH1s.length} page(s)
* **Missing Schema.org JSON-LD:** ${result.sitewideIssuesSummary.missingSchemas.length} page(s)
* **Missing WebMCP Discovery Links:** ${result.sitewideIssuesSummary.missingWebMcp.length} page(s)
* **Disallowed URLs in Sitemap:** ${result.sitewideIssuesSummary.disallowedPagesInSitemap.length} page(s)

---

## 📊 Audited Pages Breakdown Table

| Page URL | Type | Robots | Title | H1 | Desc | Canon | Schema | WebMCP | Health |
| :--- | :--- | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
${result.pageAudits
  .map(
    (p) =>
      `| \`${p.url.replace(/^https?:\/\/[^/]+/, '') || '/'}\` | \`${p.pageType}\` | ${
        p.isAllowedByRobots ? '🟢 Allow' : '🔴 Disallow'
      } | ${p.title ? '✅' : '🔴'} | ${p.hasH1 ? '✅' : '🔴'} | ${p.hasMetaDescription ? '✅' : '🔴'} | ${
        p.hasCanonical ? '✅' : '🔴'
      } | ${p.hasSchema ? '✅' : '🔴'} | ${p.hasWebMcp ? '✅' : '🔴'} | **${p.healthScore}/100** |`
  )
  .join('\n')}

---

## 🛣️ 5-Step Site-Wide Remediation Roadmap

${result.remediationRoadmap.map((step) => `* **${step}**`).join('\n')}

${
  result.generatedFixFiles
    ? `---

## 🛠️ Auto-Generated Configuration Fix Files

### 1. \`public/sitemap.xml\`
\`\`\`xml
${result.generatedFixFiles.sitemapXml}
\`\`\`

### 2. \`public/robots.txt\`
\`\`\`text
${result.generatedFixFiles.robotsTxt}
\`\`\`
`
    : ''
}
`;
}