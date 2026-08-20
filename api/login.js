const crypto = require('crypto');
const { host } = require('./_lib');
module.exports = (req, res) => {
  const id = process.env.DISCORD_CLIENT_ID;
  if (!id) { res.status(503).send('Discord OAuth is not configured yet. Set DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET in Vercel project settings.'); return; }
  const st = crypto.randomBytes(16).toString('hex');
  const redirect = `https://${host(req)}/api/callback`;
  res.setHeader('Set-Cookie', `hdp_oauth_state=${st}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  const u = new URL('https://discord.com/oauth2/authorize');
  u.searchParams.set('client_id', id);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', 'identify');
  u.searchParams.set('redirect_uri', redirect);
  u.searchParams.set('state', st);
  res.redirect(302, u.toString());
};
