const crypto = require('crypto');
const { CLIENT_ID, host } = require('./_lib');
module.exports = (req, res) => {
  const st = crypto.randomBytes(16).toString('hex');
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const redirect = `https://${host(req)}/api/callback`;
  res.setHeader('Set-Cookie', [
    `hdp_oauth_state=${st}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    `hdp_oauth_v=${verifier}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  ]);
  const u = new URL('https://discord.com/oauth2/authorize');
  u.searchParams.set('client_id', CLIENT_ID);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', 'identify');
  u.searchParams.set('redirect_uri', redirect);
  u.searchParams.set('state', st);
  u.searchParams.set('code_challenge', challenge);
  u.searchParams.set('code_challenge_method', 'S256');
  res.redirect(302, u.toString());
};
