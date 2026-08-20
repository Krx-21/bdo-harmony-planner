const { CLIENT_ID, sign, cookies, host } = require('./_lib');
module.exports = async (req, res) => {
  try {
    const { code, state, error } = req.query || {};
    if (error) return res.redirect(302, '/?login=denied');
    const ck = cookies(req);
    if (!code || !state || state !== ck.hdp_oauth_state || !ck.hdp_oauth_v) {
      return res.status(400).send('Bad OAuth state - go back and try logging in again.');
    }
    const redirect = `https://${host(req)}/api/callback`;
    const params = {
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirect,
      code_verifier: ck.hdp_oauth_v,
    };
    if (process.env.DISCORD_CLIENT_SECRET) params.client_secret = process.env.DISCORD_CLIENT_SECRET;
    const tr = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
    });
    if (!tr.ok) {
      const txt = await tr.text();
      const hint = tr.status === 401
        ? ' -> In the Discord Developer Portal (OAuth2 page), either turn ON "Public Client", or set DISCORD_CLIENT_SECRET in Vercel env vars.'
        : ` -> Check that this exact Redirect URI is registered in the Discord app: ${redirect}`;
      return res.status(502).send('Discord token exchange failed (' + tr.status + '): ' + txt + hint);
    }
    const tok = await tr.json();
    const ur = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${tok.access_token}` } });
    if (!ur.ok) return res.status(502).send('Failed to fetch Discord profile');
    const u = await ur.json();
    const sess = await sign({ id: u.id, name: u.global_name || u.username, avatar: u.avatar || null, exp: Date.now() + 30 * 864e5 });
    res.setHeader('Set-Cookie', [
      `hdp_session=${sess}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 86400}`,
      `hdp_oauth_state=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      `hdp_oauth_v=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    ]);
    res.redirect(302, '/');
  } catch (e) { res.status(500).send('Login error: ' + e.message); }
};
