import { describe, it, expect } from 'bun:test';
import { extractPageDataFromHtml } from '../src/analyzer/crawler.ts';

describe('Crawler & Extractor', () => {
  it('should accurately extract all SEO metadata, headings, schemas, and links from HTML', () => {
    const sampleHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>Professional Web Design Services | BrandName</title>
        <meta name="description" content="Custom web design and development services for high-growth companies. Get a free consultation today." />
        <link rel="canonical" href="https://example.com/services/web-design" />
        <meta property="og:title" content="Web Design Services" />
        <meta property="og:description" content="High performance web design" />
        <meta property="og:image" content="https://example.com/og.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Service",
          "name": "Web Design",
          "provider": {
            "@type": "Organization",
            "name": "BrandName"
          }
        }
        </script>
      </head>
      <body>
        <header>
          <a href="/">Home</a>
          <a href="/contact">Contact Us</a>
        </header>
        <main>
          <h1>Enterprise Web Design Solutions</h1>
          <p>We deliver custom modern web applications that rank high on search engines.</p>
          <h2>Why Choose Our Web Design Services?</h2>
          <p>Our team provides full-cycle engineering with verified results.</p>
          <img src="/hero.webp" alt="Web Design Showcase" width="800" height="600" />
        </main>
      </body>
      </html>
    `;

    const data = extractPageDataFromHtml(sampleHtml, {
      url: 'https://example.com/services/web-design',
      pageType: 'service',
      baseUrl: 'https://example.com'
    });

    expect(data.title).toBe('Professional Web Design Services | BrandName');
    expect(data.metaDescription).toContain('Custom web design');
    expect(data.canonical).toBe('https://example.com/services/web-design');
    expect(data.h1Count).toBe(1);
    expect(data.headings.length).toBe(2);
    expect(data.headings[0]?.text).toBe('Enterprise Web Design Solutions');
    expect(data.ogTags['og:title']).toBe('Web Design Services');
    expect(data.twitterTags['twitter:card']).toBe('summary_large_image');
    expect(data.schemas.length).toBe(1);
    expect(data.schemas[0]?.type).toBe('Service');
    expect(data.images.length).toBe(1);
    expect(data.images[0]?.alt).toBe('Web Design Showcase');
    expect(data.links.length).toBe(2);
    expect(data.links[0]?.isInternal).toBe(true);
  });
});
