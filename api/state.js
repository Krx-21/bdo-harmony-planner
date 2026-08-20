const { session, kv, kvEnv } = require('./_lib');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const s = session(req);
  if (!s) return res.status(401).json({ error: 'not_logged_in' });
  if (!kvEnv()) return res.status(501).json({ error: 'no_storage' });
  const key = `hdp:state:${s.id}`;
  try {
    if (req.method === 'GET') {
      const raw = await kv(['GET', key]);
      return res.json({ state: raw ? JSON.parse(raw) : null });
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      const body = req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ error: 'bad_body' });
      const str = JSON.stringify(body);
      if (str.length > 400000) return res.status(413).json({ error: 'too_large' });
      await kv(['SET', key, str]);
      return res.json({ ok: true });
    }
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) { return res.status(502).json({ error: String(e.message || e) }); }
};
