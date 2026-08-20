const { session, kvEnv } = require('./_lib');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const s = await session(req);
  res.json({
    user: s ? { id: s.id, name: s.name, avatar: s.avatar } : null,
    configured: { oauth: true, storage: !!kvEnv() },
  });
};
