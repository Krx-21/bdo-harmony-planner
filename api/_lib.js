const crypto = require('crypto');
const SECRET = process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update('hdp-v1:' + (process.env.DISCORD_CLIENT_SECRET || '')).digest('hex');

function sign(payload) {
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(p).digest('base64url');
  return p + '.' + sig;
}
function verify(tok) {
  try {
    if (!tok) return null;
    const i = tok.lastIndexOf('.');
    if (i < 0) return null;
    const p = tok.slice(0, i), sig = tok.slice(i + 1);
    const good = crypto.createHmac('sha256', SECRET).update(p).digest('base64url');
    const a = Buffer.from(sig), b = Buffer.from(good);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const d = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    if (!d || (d.exp && d.exp < Date.now())) return null;
    return d;
  } catch (e) { return null; }
}
function cookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(/; */)) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i)] = decodeURIComponent(part.slice(i + 1));
  }
  return out;
}
function session(req) { return verify(cookies(req).hdp_session); }
function host(req) { return String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim(); }
function kvEnv() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.STORAGE_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.STORAGE_REST_TOKEN;
  return url && token ? { url, token } : null;
}
async function kv(cmd) {
  const e = kvEnv();
  if (!e) throw new Error('no_storage');
  const r = await fetch(e.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${e.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error('kv_http_' + r.status);
  const d = await r.json();
  if (d.error) throw new Error('kv:' + d.error);
  return d.result;
}
module.exports = { sign, verify, cookies, session, host, kvEnv, kv };
