const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const userStore = require('../services/userStore');
const webauthn = require('../services/webauthn');
const authenticate = require('../middleware/authenticate');
const { authLimiter } = require('../middleware/rateLimit');
const { generateId } = require('../utils/crypto');

const router = Router();

function issueToken(res, user) {
  const token = jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: '7d' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: config.rpOrigin.startsWith('https'),
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return token;
}

// Setup first admin
router.post('/setup', authLimiter, async (req, res) => {
  if (userStore.count() > 0) {
    return res.status(400).json({ error: 'Setup already completed' });
  }

  const { username, password } = req.body;
  if (!username || !password || password.length < 8) {
    return res.status(400).json({ error: 'Username and password (min 8 chars) required' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = userStore.create({
    id: generateId(),
    usernameHash: userStore.hashUsername(username),
    passwordHash,
    credentials: [],
    createdAt: new Date().toISOString(),
  });

  issueToken(res, user);
  res.json({ ok: true });
});

// Login with password
router.post('/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;
  const user = userStore.findByUsername(username);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  issueToken(res, user);
  res.json({ ok: true });
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

// WebAuthn Registration
router.post('/webauthn/register/options', authenticate, async (req, res) => {
  try {
    const user = userStore.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const options = await webauthn.genRegOptions(user);
    res.json(options);
  } catch (err) {
    console.error('WebAuthn reg options error:', err);
    res.status(500).json({ error: 'Failed to generate options' });
  }
});

router.post('/webauthn/register/verify', authenticate, async (req, res) => {
  try {
    const user = userStore.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const credential = await webauthn.verifyReg(user, req.body);
    const credentials = [...(user.credentials || []), credential];
    userStore.update(user.id, { credentials });
    res.json({ ok: true });
  } catch (err) {
    console.error('WebAuthn reg verify error:', err);
    res.status(400).json({ error: err.message });
  }
});

// WebAuthn Authentication
router.post('/webauthn/login/options', authLimiter, async (req, res) => {
  try {
    const { username } = req.body;
    const user = userStore.findByUsername(username);
    if (!user || !user.credentials || user.credentials.length === 0) {
      return res.status(400).json({ error: 'No biometric credentials found' });
    }
    const options = await webauthn.genAuthOptions(user);
    // Store username for verification step
    res.json({ ...options, _userId: user.id });
  } catch (err) {
    console.error('WebAuthn auth options error:', err);
    res.status(500).json({ error: 'Failed to generate options' });
  }
});

router.post('/webauthn/login/verify', authLimiter, async (req, res) => {
  try {
    const { userId, response } = req.body;
    const user = userStore.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { newCounter } = await webauthn.verifyAuth(user, response);

    // Update credential counter
    const credentials = user.credentials.map((c) =>
      c.credentialID === response.id ? { ...c, counter: newCounter } : c
    );
    userStore.update(user.id, { credentials });

    issueToken(res, user);
    res.json({ ok: true });
  } catch (err) {
    console.error('WebAuthn auth verify error:', err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
