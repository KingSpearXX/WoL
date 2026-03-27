const crypto = require('crypto');

function generateToken() {
  return 'wol_' + crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateId() {
  return crypto.randomUUID();
}

module.exports = { generateToken, hashToken, generateId };
