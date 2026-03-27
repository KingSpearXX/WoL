const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const tokenStore = require('../services/tokenStore');
const { generateToken, hashToken, generateId } = require('../utils/crypto');

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => {
  const tokens = tokenStore.listByUser(req.userId);
  res.json({ tokens });
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Token name required' });

  const plaintext = generateToken();
  const token = {
    id: generateId(),
    userId: req.userId,
    name,
    hash: hashToken(plaintext),
    createdAt: new Date().toISOString(),
  };

  tokenStore.create(token);
  res.json({ token: plaintext, id: token.id, name: token.name });
});

router.delete('/:id', (req, res) => {
  const removed = tokenStore.remove(req.params.id, req.userId);
  if (!removed) return res.status(404).json({ error: 'Token not found' });
  res.json({ ok: true });
});

module.exports = router;
