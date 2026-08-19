import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import type {
  ExtractedHeading,
  ExtractedImage,
  ExtractedLink,
  ExtractedSchema,
  FrameworkType,
  PageData,
  PageType
} from '../types/index.ts';
import { classifyPageType } from './discovery.ts';

export async function crawlUrlOrFile(
  target: string,
  options?: {
    pageType?: PageType;
    framework?: FrameworkType;
    baseUrl?: string;
  }
): Promise<PageData> {
  const isUrl = /^https?:\/\//i.test(target);
  let htmlContent = '';
  let effectiveUrl: string | undefined = isUrl ? target : undefined;
  let effectiveFilePath: string | undefined = !isUrl ? path.resolve(target) : undefined;

  if (isUrl) {
    try {
      const response = await fetch(target, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; AntigravityGrowthAuditor/1.0; +https://antigravity.google.com/bot)'
        }
      });
      htmlContent = await response.text();
    } catch (err: any) {
      throw new Error(`Failed to fetch URL ${target}: ${err.message}`);
    }
  } else {
    if (!fs.existsSync(effectiveFilePath!)) {
      throw new Error(`File not found: ${effectiveFilePath}`);
    }
    htmlContent = fs.readFileSync(effectiveFilePath!, 'utf8');
  }

  const pageType = options?.pageType || classifyPageType(target, effectiveFilePath || target);
  return extractPageDataFromHtml(htmlContent, {
    url: effectiveUrl,
    filePath: effectiveFilePath,
    pageType,
    framework: options?.framework,
    baseUrl: options?.baseUrl || (isUrl ? new URL(target).origin : 'https://example.com')
  });
}

export function extractPageDataFromHtml(
  html: string,
  context: {
    url?: string;
    filePath?: string;
    pageType: PageType;
    framework?: FrameworkType;
    baseUrl: string;
  }
): PageData {
  const $ = cheerio.load(html);

  // 1. Extract Title
  let title: string | undefined = $('title').first().text().trim();
  if (!title && context.filePath) {
    // Check for Blade @section('title', '...') or Next.js metadata
    const bladeTitleMatch = html.match(/@section\(\s*['"]title['"]\s*,\s*['"]([^'"]+)['"]\s*\)/i);
    if (bladeTitleMatch?.[1]) {
      title = bladeTitleMatch[1];
    } else {
      const nextTitleMatch = html.match(/title:\s*['"`]([^'"`]+)['"`]/i);
      if (nextTitleMatch?.[1]) title = nextTitleMatch[1];
    }
  }

  // 2. Extract Meta Description
  let metaDescription: string | undefined =
    $('meta[name="description"]').attr('content') ||
    $('meta[name="Description"]').attr('content') ||
    undefined;
  if (!metaDescription && context.filePath) {
    const nextDescMatch = html.match(/description:\s*['"`]([^'"`]+)['"`]/i);
    if (nextDescMatch?.[1]) metaDescription = nextDescMatch[1];
    const bladeDescMatch = html.match(/@section\(\s*['"]meta_description['"]\s*,\s*['"]([^'"]+)['"]\s*\)/i);
    if (bladeDescMatch?.[1]) metaDescription = bladeDescMatch[1];
  }

  // 3. Extract Canonical
  let canonical: string | undefined = $('link[rel="canonical"]').attr('href') || undefined;
  if (!canonical && context.filePath) {
    const canonicalMatch = html.match(/canonical:\s*['"`]([^'"`]+)['"`]/i);
    if (canonicalMatch?.[1]) canonical = canonicalMatch[1];
  }

  // 4. Meta Robots
  const metaRobots: string | undefined =
    $('meta[name="robots"]').attr('content') ||
    $('meta[name="Robots"]').attr('content') ||
    undefined;

  // 5. OpenGraph & Twitter Tags
  const ogTags: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const prop = $(el).attr('property');
    const val = $(el).attr('content');
    if (prop && val) ogTags[prop] = val;
  });

  const twitterTags: Record<string, string> = {};
  $('meta[name^="twitter:"]').each((_, el) => {
    const name = $(el).attr('name');
    const val = $(el).attr('content');
    if (name && val) twitterTags[name] = val;
  });

  // 6. Headings Hierarchy
  const headings: ExtractedHeading[] = [];
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const tag = el.tagName.toLowerCase();
    const level = parseInt(tag.replace('h', ''), 10);
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text) {
      headings.push({ level, text });
    }
  });

  const h1Count = headings.filter((h) => h.level === 1).length;

  // 7. Paragraphs & Text
  const paragraphs: string[] = [];
  $('p').each((_, el) => {
    const txt = $(el).text().replace(/\s+/g, ' ').trim();
    if (txt) paragraphs.push(txt);
  });

  // Clean body text
  const bodyClone = $('body').clone();
  bodyClone.find('script, style, noscript, svg, nav, footer, header').remove();
  const extractedText = bodyClone.text().replace(/\s+/g, ' ').trim();
  const words = extractedText ? extractedText.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;

  // 8. Links
  const links: ExtractedLink[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')?.trim() || '';
    const anchorText = $(el).text().replace(/\s+/g, ' ').trim();
    const rel = $(el).attr('rel');
    const target = $(el).attr('target');

    if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
      const isInternal =
        href.startsWith('/') ||
        href.startsWith('./') ||
        href.startsWith('../') ||
        (context.baseUrl && href.startsWith(context.baseUrl));

      links.push({
        href,
        anchorText: anchorText || '[Empty Anchor]',
        rel,
        target,
        isInternal
      });
    }
  });

  // 9. Images
  const images: ExtractedImage[] = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || '';
    const alt = $(el).attr('alt');
    const width = $(el).attr('width');
    const height = $(el).attr('height');
    const loading = $(el).attr('loading');
    const isWebpOrAvif = /\.(webp|avif)(\?.*)?$/i.test(src);

    if (src) {
      images.push({
        src,
        alt: alt !== undefined ? alt.trim() : undefined,
        width,
        height,
        loading,
        isWebpOrAvif
      });
    }
  });

  // 10. Schemas (JSON-LD)
  const schemas: ExtractedSchema[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html()?.trim() || '';
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const type = parsed['@type'] || (Array.isArray(parsed) ? 'Array' : 'Unknown');
        schemas.push({
          type: String(type),
          rawJson: parsed,
          isValid: true
        });
      } catch (err: any) {
        schemas.push({
          type: 'InvalidJSON',
          rawJson: raw,
          isValid: false,
          validationErrors: [err.message]
        });
      }
    }
  });

  // 11. Scripts
  const scripts: Array<{ src?: string; isAsync?: boolean; isDefer?: boolean; content?: string }> = [];
  $('script').each((_, el) => {
    const src = $(el).attr('src');
    const isAsync = $(el).attr('async') !== undefined;
    const isDefer = $(el).attr('defer') !== undefined;
    const type = $(el).attr('type');
    if (type !== 'application/ld+json') {
      scripts.push({
        src,
        isAsync,
        isDefer,
        content: !src ? $(el).html()?.substring(0, 100) : undefined
      });
    }
  });

  return {
    url: context.url,
    filePath: context.filePath,
    pageType: context.pageType,
    title,
    metaDescription,
    canonical,
    metaRobots,
    ogTags,
    twitterTags,
    headings,
    h1Count,
    wordCount,
    extractedText,
    paragraphs,
    links,
    images,
    schemas,
    scripts,
    framework: context.framework,
    rawHtml: html
  };
}
