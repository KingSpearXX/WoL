const jwt = require('jsonwebtoken');
const config = require('../config');
const tokenStore = require('../services/tokenStore');
const { hashToken } = require('../utils/crypto');

function authenticate(req, res, next) {
  // 1. Check Authorization header (JWT or PAT)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    // PAT tokens start with wol_
    if (token.startsWith('wol_')) {
      const hash = hashToken(token);
      const pat = tokenStore.findByHash(hash);
      if (pat) {
        req.userId = pat.userId;
        return next();
      }
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Otherwise try JWT
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      req.userId = payload.sub;
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  // 2. Check httpOnly cookie
  const cookieToken = req.cookies && req.cookies.token;
  if (cookieToken) {
    try {
      const payload = jwt.verify(cookieToken, config.jwtSecret);
      req.userId = payload.sub;
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  return res.status(401).json({ error: 'Authentication required' });
}

module.exports = authenticate;
