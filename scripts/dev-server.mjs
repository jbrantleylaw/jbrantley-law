/**
 * Runs the whole portal locally — static files plus the real submit function —
 * without needing the Netlify CLI.
 *
 *   npm run dev:local        then open http://localhost:8888
 *
 * With no email transport configured the submission still succeeds and the PDF
 * still downloads; the response just reports emailed:false. To exercise real
 * delivery, put RESEND_API_KEY (or the SMTP_* variables) in a .env file, which
 * this script loads automatically.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

// Minimal .env loader — no dependency, no surprises.
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

// Every function in netlify/functions is served at its own endpoint, exactly
// as Netlify does, so a new function needs no change here.
const FUNCTIONS = Object.fromEntries(await Promise.all(
  ['submit-intake', 'request-payment-plan'].map(async (name) => [
    name, (await import(`../netlify/functions/${name}.mjs`)).default,
  ]),
));

const PORT = Number(process.env.PORT || 8888);
const ROOT = new URL('../public/', import.meta.url).pathname;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  const fnMatch = url.pathname.match(/^\/\.netlify\/functions\/([\w-]+)$/);
  if (fnMatch) {
    const handler = FUNCTIONS[fnMatch[1]];
    if (!handler) { res.writeHead(404); res.end('No such function'); return; }
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const request = new Request(`http://localhost:${PORT}${req.url}`, {
      method: req.method,
      headers: req.headers,
      body: chunks.length ? Buffer.concat(chunks) : undefined,
    });
    const response = await handler(request, { ip: '127.0.0.1' });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
    return;
  }

  // Mirrors the netlify.toml redirect for /intake/:area
  let path = url.pathname;
  const pretty = path.match(/^\/intake\/[\w-]+\/?$/);
  if (pretty) path = '/intake.html';
  if (path === '/' || path.endsWith('/')) path += 'index.html';

  const file = join(ROOT, normalize(path).replace(/^(\.\.[/\\])+/, ''));
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}).listen(PORT, () => {
  console.log(`\n  Portal running at http://localhost:${PORT}\n`);
});
