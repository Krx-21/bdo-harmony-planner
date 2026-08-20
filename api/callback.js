const { sign, cookies, host } = require('./_lib');
module.exports = async (req, res) => {
  try {
    const id = process.env.DISCORD_CLIENT_ID, secret = process.env.DISCORD_CLIENT_SECRET;
    if (!id || !secret) return res.status(503).send('OAuth not configured');
    const { code, state, error } = req.query || {};
    if (error) return res.redirect(302, '/?login=denied');
    const ck = cookies(req);
    if (!code || !state || state !== ck.hdp_oauth_state) return res.status(400).send('Bad OAuth state - go back and try logging in again.');
    const redirect = `https://${host(req)}/api/callback`;
    const tr = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: id, client_secret: secret, grant_type: 'authorization_code', code, redirect_uri: redirect }),
    });
    if (!tr.ok) return res.status(502).send('Discord token exchange failed (' + tr.status + '). Check the Redirect URI in your Discord app matches ' + redirect);
    const tok = await tr.json();
    const ur = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${tok.access_token}` } });
    if (!ur.ok) return res.status(502).send('Failed to fetch Discord profile');
    const u = await ur.json();
    const sess = sign({ id: u.id, name: u.global_name || u.username, avatar: u.avatar || null, exp: Date.now() + 30 * 864e5 });
    res.setHeader('Set-Cookie', [
      `hdp_session=${sess}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 86400}`,
      `hdp_oauth_state=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    ]);
    res.redirect(302, '/');
  } catch (e) { res.status(500).send('Login error: ' + e.message); }
};
