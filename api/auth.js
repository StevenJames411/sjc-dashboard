// POST /api/auth — validate password, set httpOnly session cookie

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const { password } = body || {};
  if (!password || password !== process.env.DASHBOARD_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  // Set httpOnly cookie — password never exposed in URL
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  res.setHeader('Set-Cookie', [
    `sjc_session=${password}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Strict`
  ]);
  res.status(200).json({ ok: true });
};
