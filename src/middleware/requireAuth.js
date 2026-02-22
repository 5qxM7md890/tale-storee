export function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ ok: false, error: 'AUTH_REQUIRED' });
  }
  next();
}

export function requireBotKey(getKey) {
  return function (req, res, next) {
    const want = getKey();
    if (!want) return res.status(500).json({ ok: false, error: 'BOT_API_KEY_NOT_SET' });
    const got = req.header('x-api-key') || '';
    if (got !== want) return res.status(401).json({ ok: false, error: 'INVALID_API_KEY' });
    next();
  };
}
