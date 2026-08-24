import { describe, it, expect } from 'bun:test';
import http from 'node:http';

describe('Smithery-compatible HTTP metadata', () => {
  it('serves a server card at /.well-known/mcp/server-card.json', async () => {
    const testServer = http.createServer((req, res) => {
      if (req.url === '/.well-known/mcp/server-card.json') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            serverInfo: {
              name: 'mcp-seo',
              version: '1.0.3',
              description: 'SEO, AEO, GEO, Local SEO & CRO Growth Auditor + Safe Code Fixer'
            },
            authentication: { required: false },
            tools: [
              { name: 'seo_discover_project', description: 'Discovers website framework' },
              { name: 'seo_crawl_and_extract', description: 'Crawls a live URL' }
            ]
          })
        );
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => testServer.listen(0, '127.0.0.1', () => resolve()));
    const addr = testServer.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/.well-known/mcp/server-card.json`);
      expect(response.status).toBe(200);

      const body = (await response.json()) as any;
      expect(body.serverInfo.name).toBe('mcp-seo');
      expect(body.serverInfo.version).toBe('1.0.3');
      expect(body.tools.length).toBeGreaterThanOrEqual(2);
    } finally {
      await new Promise<void>((resolve) => testServer.close(() => resolve()));
    }
  });
});

