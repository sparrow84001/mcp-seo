import { describe, it, expect } from 'bun:test';
import { classifyPageType, scanFiles } from '../src/analyzer/discovery.ts';

describe('Discovery Analyzer', () => {
  it('should correctly classify page types by URL and file path', () => {
    expect(classifyPageType('/', 'index.html')).toBe('homepage');
    expect(classifyPageType('/services/web-development', 'app/services/web-development/page.tsx')).toBe('service');
    expect(classifyPageType('/products/shoes', 'resources/views/products/show.blade.php')).toBe('product');
    expect(classifyPageType('/city/kolkata', 'pages/city/kolkata.tsx')).toBe('city');
    expect(classifyPageType('/locations/kolkata', 'pages/locations/kolkata.tsx')).toBe('location');
    expect(classifyPageType('/blog/seo-guide', 'posts/seo-guide.html')).toBe('article');
    expect(classifyPageType('/faq', 'faq.blade.php')).toBe('faq');
    expect(classifyPageType('/contact-us', 'contact.html')).toBe('contact');
    expect(classifyPageType('/pricing', 'pricing.tsx')).toBe('pricing');
  });

  it('should scan files using Bun native globbing or fallback seamlessly', () => {
    const files = scanFiles(['src/**/*.ts'], { cwd: process.cwd() });
    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.includes('index.ts') || f.includes('crawler.ts'))).toBe(true);
  });
});
