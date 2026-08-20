import { describe, it, expect } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { generateCodeFix } from '../src/fixer/code-fixer.ts';
import { validateCodeFix } from '../src/fixer/validator.ts';

describe('Code Fixer & Validator', () => {
  it('should generate surgical fixes and validate without duplicate tags', async () => {
    const tempFile = path.resolve('tests/sample_view.blade.php');
    fs.writeFileSync(
      tempFile,
      `@extends('layouts.app')

@section('content')
<div class="container">
  <h1>Our Services</h1>
  <p>We provide full stack digital growth services.</p>
</div>
@endsection
`,
      'utf8'
    );

    const fixPlan = generateCodeFix({
      filePath: tempFile,
      framework: 'laravel',
      title: 'Top Digital Growth & SEO Agency | BrandName',
      metaDescription: 'Accelerate organic growth and conversion rates with our technical SEO agency.',
      jsonLdSchema: {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: 'Digital Growth'
      },
      applyDirectly: true
    });

    expect(fixPlan.status).toBe('applied');
    expect(fixPlan.proposedChange).toContain("@section('title'");
    expect(fixPlan.proposedChange).toContain("@section('meta_description'");
    expect(fixPlan.proposedChange).toContain('application/ld+json');

    const validation = await validateCodeFix(tempFile, { seo: 40, technical: 50 });
    expect(validation.valid).toBe(true);
    expect(validation.duplicateMetaTags.length).toBe(0);
    expect(validation.schemaValidationErrors.length).toBe(0);

    // Clean up temp file
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  });

  it('should generate surgical fixes for Astro components', () => {
    const tempAstro = path.resolve('tests/sample.astro');
    fs.writeFileSync(
      tempAstro,
      `---
const old = "test";
---
<html>
<head></head>
<body><h1>Astro</h1></body>
</html>
`,
      'utf8'
    );

    const fix = generateCodeFix({
      filePath: tempAstro,
      framework: 'astro',
      title: 'Astro SEO Optimized Page',
      metaDescription: 'Astro page description'
    });

    expect(fix.proposedChange).toContain('const title = "Astro SEO Optimized Page";');
    expect(fix.proposedChange).toContain('const description = "Astro page description";');

    if (fs.existsSync(tempAstro)) {
      fs.unlinkSync(tempAstro);
    }
  });
});
