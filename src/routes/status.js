const { Router } = require('express');
const userStore = require('../services/userStore');

const router = Router();

router.get('/', (req, res) => {
  res.json({ ok: true, setup: userStore.count() > 0 });
});

module.exports = router;
