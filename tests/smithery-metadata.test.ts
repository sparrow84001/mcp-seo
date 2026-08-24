import { describe, it, expect } from 'bun:test';
import { setTimeout as delay } from 'node:timers/promises';

describe('Smithery-compatible HTTP metadata', () => {
  it('serves a server card at /.well-known/mcp/server-card.json', async () => {
    const proc = Bun.spawn(['bun', 'run', 'src/index.ts', '--http', '--port', '3458'], {
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe'
    });

    try {
      await delay(1200);
      const response = await fetch('http://127.0.0.1:3458/.well-known/mcp/server-card.json');
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.serverInfo.name).toBe('mcp-seo');
      expect(body.serverInfo.version).toBe('1.0.3');
    } finally {
      proc.kill();
      await proc.exited;
    }
  });
});
