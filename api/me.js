const { session, kvEnv } = require('./_lib');
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const s = session(req);
  res.json({
    user: s ? { id: s.id, name: s.name, avatar: s.avatar } : null,
    configured: { oauth: !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET), storage: !!kvEnv() },
  });
};
