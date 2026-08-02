/**
 * Request plumbing shared by the portal's functions, so the size caps, the
 * rate limit, and the honeypot behave identically at every endpoint.
 */

/** Best-effort only: serverless instances are ephemeral and not shared, so this
 *  slows a burst from one source rather than enforcing a global quota. */
const hitsByIp = new Map();

export function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export function fail(status, error) {
  return json(status, { ok: false, error });
}

export function clientIp(req, context) {
  return req.headers.get('x-nf-client-connection-ip') || context?.ip || '';
}

export function rateLimited(ip, { max = 6, windowMs = 10 * 60 * 1000 } = {}) {
  if (!ip) return false;
  const now = Date.now();
  const hits = (hitsByIp.get(ip) || []).filter((t) => now - t < windowMs);
  hits.push(now);
  hitsByIp.set(ip, hits);
  if (hitsByIp.size > 500) hitsByIp.clear(); // bound memory on a warm instance
  return hits.length > max;
}

/**
 * Reads and parses a JSON body, enforcing a size cap.
 * @returns {{ payload: object } | { response: Response }}
 */
export async function readJson(req, maxBytes) {
  const declared = Number(req.headers.get('content-length') || 0);
  if (declared > maxBytes) return { response: fail(413, 'That submission is too large.') };
  try {
    const raw = await req.text();
    if (raw.length > maxBytes) return { response: fail(413, 'That submission is too large.') };
    return { payload: JSON.parse(raw) };
  } catch {
    return { response: fail(400, 'We could not read that submission.') };
  }
}

/** Strips prototype pollution vectors and non-serialisable values. */
export function plainObject(v, maxString = 20_000) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out = Object.create(null);
  for (const [k, val] of Object.entries(v)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    if (typeof val === 'string') out[k] = val.slice(0, maxString);
    else if (Array.isArray(val)) out[k] = val.filter((x) => typeof x === 'string').map((x) => x.slice(0, 2_000));
    else if (typeof val === 'boolean' || typeof val === 'number') out[k] = val;
  }
  return out;
}
