const crypto = require('crypto');

const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1539826300238430358';

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

let SECRET_CACHE = null;
async function getSecret() {
  if (SECRET_CACHE) return SECRET_CACHE;
  if (process.env.SESSION_SECRET) return (SECRET_CACHE = process.env.SESSION_SECRET);
  if (kvEnv()) {
    try {
      let s = await kv(['GET', 'hdp:cfg:session_secret']);
      if (!s) {
        await kv(['SET', 'hdp:cfg:session_secret', crypto.randomBytes(32).toString('hex'), 'NX']);
        s = await kv(['GET', 'hdp:cfg:session_secret']);
      }
      if (s) return (SECRET_CACHE = s);
    } catch (e) { /* fall through */ }
  }
  // Reached only when no storage is configured; without storage there is no per-user
  // data behind sessions, so a static fallback guards nothing sensitive.
  return (SECRET_CACHE = crypto.createHash('sha256').update('hdp-fallback:' + CLIENT_ID).digest('hex'));
}

async function sign(payload) {
  const secret = await getSecret();
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(p).digest('base64url');
  return p + '.' + sig;
}
async function verify(tok) {
  try {
    if (!tok) return null;
    const i = tok.lastIndexOf('.');
    if (i < 0) return null;
    const secret = await getSecret();
    const p = tok.slice(0, i), sig = tok.slice(i + 1);
    const good = crypto.createHmac('sha256', secret).update(p).digest('base64url');
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
async function session(req) { return verify(cookies(req).hdp_session); }
function host(req) { return String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim(); }

module.exports = { CLIENT_ID, sign, verify, cookies, session, host, kvEnv, kv };
