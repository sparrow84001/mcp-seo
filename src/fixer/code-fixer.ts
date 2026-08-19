import fs from 'node:fs';
import path from 'node:path';
import type { CodeFixPlan, FrameworkType } from '../types/index.ts';

export interface CodeFixOptions {
  filePath: string;
  framework?: FrameworkType;
  title?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  openGraph?: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
  };
  jsonLdSchema?: Record<string, any>;
  applyDirectly?: boolean;
}

export function generateCodeFix(options: CodeFixOptions): CodeFixPlan {
  const fullPath = path.resolve(options.filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Target file for fix does not exist: ${fullPath}`);
  }

  const originalCode = fs.readFileSync(fullPath, 'utf8');
  let updatedCode = originalCode;
  const fw = options.framework || detectFileFramework(fullPath);

  if (fw === 'laravel') {
    updatedCode = applyLaravelBladeFixes(updatedCode, options);
  } else if (fw === 'nextjs-app') {
    updatedCode = applyNextAppRouterFixes(updatedCode, options);
  } else if (fw === 'nextjs-pages') {
    updatedCode = applyNextPagesRouterFixes(updatedCode, options);
  } else {
    updatedCode = applyGenericHtmlFixes(updatedCode, options);
  }

  const unifiedDiff = createUnifiedDiff(fullPath, originalCode, updatedCode);

  if (options.applyDirectly) {
    fs.writeFileSync(fullPath, updatedCode, 'utf8');
  }

  return {
    id: `FIX_${Date.now()}`,
    file: fullPath,
    framework: fw,
    existingProblem: 'Missing or suboptimal SEO metadata and structured data in file.',
    proposedChange: updatedCode,
    unifiedDiff,
    reason: 'Surgical update of title, meta description, canonical, and Schema.org structured data.',
    risk: 'low',
    expectedResult: 'Standard-compliant SEO metadata and JSON-LD schema without breaking layout.',
    status: options.applyDirectly ? 'applied' : 'proposed'
  };
}

function detectFileFramework(filePath: string): FrameworkType {
  if (filePath.endsWith('.blade.php')) return 'laravel';
  if (filePath.includes('/app/') || filePath.includes('\\app\\')) return 'nextjs-app';
  if (filePath.includes('/pages/') || filePath.includes('\\pages\\')) return 'nextjs-pages';
  if (filePath.endsWith('.php')) return 'php-raw';
  return 'html-static';
}

function applyLaravelBladeFixes(code: string, opts: CodeFixOptions): string {
  let res = code;

  // Title fix
  if (opts.title) {
    if (/@section\(\s*['"]title['"].*?\)/i.test(res)) {
      res = res.replace(/@section\(\s*['"]title['"].*?\)/i, `@section('title', '${escapeQuotes(opts.title)}')`);
    } else {
      res = `@section('title', '${escapeQuotes(opts.title)}')\n` + res;
    }
  }

  // Meta Description fix
  if (opts.metaDescription) {
    if (/@section\(\s*['"]meta_description['"].*?\)/i.test(res)) {
      res = res.replace(
        /@section\(\s*['"]meta_description['"].*?\)/i,
        `@section('meta_description', '${escapeQuotes(opts.metaDescription)}')`
      );
    } else {
      res = `@section('meta_description', '${escapeQuotes(opts.metaDescription)}')\n` + res;
    }
  }

  // Schema fix
  if (opts.jsonLdSchema) {
    const schemaScript = `\n@push('scripts')\n<script type="application/ld+json">\n${JSON.stringify(
      opts.jsonLdSchema,
      null,
      2
    )}\n</script>\n@endpush\n`;
    if (!res.includes('application/ld+json')) {
      res = res + schemaScript;
    }
  }

  return res;
}

function applyNextAppRouterFixes(code: string, opts: CodeFixOptions): string {
  let res = code;

  // Check if export const metadata exists
  if (/export const metadata/i.test(res)) {
    if (opts.title && !res.includes('title:')) {
      res = res.replace(/export const metadata.*?\{/, `export const metadata: Metadata = {\n  title: '${escapeQuotes(opts.title)}',`);
    }
    if (opts.metaDescription && !res.includes('description:')) {
      res = res.replace(/export const metadata.*?\{/, `export const metadata: Metadata = {\n  description: '${escapeQuotes(opts.metaDescription)}',`);
    }
  } else {
    // Inject metadata block
    const metaBlock = `import type { Metadata } from 'next';\n\nexport const metadata: Metadata = {\n  title: '${escapeQuotes(
      opts.title || 'Page Title'
    )}',\n  description: '${escapeQuotes(opts.metaDescription || 'Page Description')}',\n};\n\n`;
    res = metaBlock + res;
  }

  return res;
}

function applyNextPagesRouterFixes(code: string, opts: CodeFixOptions): string {
  let res = code;
  const headBlock = `<Head>\n  <title>${escapeQuotes(opts.title || '')}</title>\n  <meta name="description" content="${escapeQuotes(
    opts.metaDescription || ''
  )}" />\n</Head>\n`;

  if (res.includes('<Head>')) {
    // Replace Head contents
    res = res.replace(/<Head>[\s\S]*?<\/Head>/i, headBlock);
  } else {
    res = `import Head from 'next/head';\n\n` + res;
  }
  return res;
}

function applyGenericHtmlFixes(code: string, opts: CodeFixOptions): string {
  let res = code;

  if (res.includes('<head>')) {
    let headAdditions = '';
    if (opts.title && !res.includes('<title>')) {
      headAdditions += `  <title>${escapeQuotes(opts.title)}</title>\n`;
    }
    if (opts.metaDescription && !res.includes('name="description"')) {
      headAdditions += `  <meta name="description" content="${escapeQuotes(opts.metaDescription)}" />\n`;
    }
    if (opts.canonicalUrl && !res.includes('rel="canonical"')) {
      headAdditions += `  <link rel="canonical" href="${opts.canonicalUrl}" />\n`;
    }
    if (opts.jsonLdSchema && !res.includes('application/ld+json')) {
      headAdditions += `  <script type="application/ld+json">\n${JSON.stringify(opts.jsonLdSchema, null, 2)}\n  </script>\n`;
    }

    res = res.replace('<head>', '<head>\n' + headAdditions);
  }

  return res;
}

function escapeQuotes(str: string): string {
  return str.replace(/'/g, "\\'");
}

function createUnifiedDiff(filePath: string, oldStr: string, newStr: string): string {
  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');
  const diffLines: string[] = [
    `--- a/${path.basename(filePath)}`,
    `+++ b/${path.basename(filePath)}`,
    `@@ -1,${oldLines.length} +1,${newLines.length} @@`
  ];

  for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
    const o = oldLines[i];
    const n = newLines[i];
    if (o === n) {
      if (o !== undefined) diffLines.push(` ${o}`);
    } else {
      if (o !== undefined) diffLines.push(`-${o}`);
      if (n !== undefined) diffLines.push(`+${n}`);
    }
  }

  return diffLines.slice(0, 50).join('\n');
}
