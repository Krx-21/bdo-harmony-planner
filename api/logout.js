module.exports = (req, res) => {
  res.setHeader('Set-Cookie', 'hdp_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  res.redirect(302, '/');
};
