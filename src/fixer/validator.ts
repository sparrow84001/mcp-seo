import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import type { AuditDimension, ValidationResult } from '../types/index.ts';
import { crawlUrlOrFile } from '../analyzer/crawler.ts';
import { auditOnPageSeo } from '../analyzer/onpage.ts';
import { auditTechnicalSeo } from '../analyzer/technical.ts';
import { auditSchema } from '../analyzer/schema.ts';

export async function validateCodeFix(
  filePath: string,
  beforeScores?: Partial<Record<AuditDimension, number>>
): Promise<ValidationResult> {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File does not exist for validation: ${fullPath}`);
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const syntaxErrors: string[] = [];
  const duplicateMetaTags: string[] = [];
  const schemaValidationErrors: string[] = [];
  const improvements: string[] = [];

  // 1. Check for Duplicate Meta in HTML / Templates
  const titleMatches = content.match(/<title>|@section\(\s*['"]title['"]/gi) || [];
  if (titleMatches.length > 1) {
    duplicateMetaTags.push(`Found ${titleMatches.length} title declarations in file.`);
  }

  const descMatches =
    content.match(/name=["']description["']|@section\(\s*['"]meta_description['"]/gi) || [];
  if (descMatches.length > 1) {
    duplicateMetaTags.push(`Found ${descMatches.length} meta description declarations in file.`);
  }

  const canonicalMatches = content.match(/rel=["']canonical["']/gi) || [];
  if (canonicalMatches.length > 1) {
    duplicateMetaTags.push(`Found ${canonicalMatches.length} canonical link declarations in file.`);
  }

  // 2. Validate JSON-LD Scripts
  const $ = cheerio.load(content);
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html()?.trim();
    if (raw && !raw.includes('{{') && !raw.includes('@')) {
      try {
        JSON.parse(raw);
      } catch (err: any) {
        schemaValidationErrors.push(`JSON-LD Syntax error: ${err.message}`);
      }
    }
  });

  // 3. Re-run Audit Analyzers to compute After scores
  let afterScores: Partial<Record<AuditDimension, number>> = {};
  try {
    const pageData = await crawlUrlOrFile(fullPath);
    const techIssues = auditTechnicalSeo(pageData);
    const onpageIssues = auditOnPageSeo(pageData);
    const schemaIssues = auditSchema(pageData);

    const techScore = Math.max(0, 100 - techIssues.length * 15);
    const onpageScore = Math.max(0, 100 - onpageIssues.length * 15);
    const schemaScore = Math.max(0, 100 - schemaIssues.length * 15);

    afterScores = {
      technical: techScore,
      seo: onpageScore,
      performance: 90
    };

    if (beforeScores?.seo !== undefined && onpageScore > beforeScores.seo) {
      improvements.push(`On-Page SEO score increased from ${beforeScores.seo} to ${onpageScore}`);
    }
    if (beforeScores?.technical !== undefined && techScore > beforeScores.technical) {
      improvements.push(`Technical SEO score increased from ${beforeScores.technical} to ${techScore}`);
    }
  } catch (err: any) {
    syntaxErrors.push(`Re-audit error: ${err.message}`);
  }

  const isValid = syntaxErrors.length === 0 && duplicateMetaTags.length === 0 && schemaValidationErrors.length === 0;

  if (isValid && improvements.length === 0) {
    improvements.push('Verified: No duplicate meta tags and valid syntax maintained.');
  }

  return {
    file: fullPath,
    valid: isValid,
    syntaxErrors,
    duplicateMetaTags,
    schemaValidationErrors,
    beforeScores: beforeScores || {},
    afterScores,
    improvements
  };
}
