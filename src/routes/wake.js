const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const { generalLimiter } = require('../middleware/rateLimit');
const config = require('../config');
const wolService = require('../services/wol');

const router = Router();

router.get('/targets', authenticate, (req, res) => {
  const targets = config.targets.map(({ id, name }) => ({ id, name }));
  res.json({ targets });
});

router.post('/', authenticate, generalLimiter, async (req, res) => {
  try {
    const { targetId } = req.body;
    const target = config.targets.find((t) => t.id === targetId);
    if (!target) {
      return res.status(400).json({ error: 'Unknown target' });
    }

    await wolService.wake(target.mac, { address: config.broadcastAddress });
    res.json({ ok: true, target: target.name });
  } catch (err) {
    console.error('WoL error:', err);
    res.status(500).json({ error: 'Failed to send magic packet' });
  }
});

module.exports = router;
