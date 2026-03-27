const fs = require('fs');
const path = require('path');
const config = require('../config');

const filePath = path.join(config.dataDir, 'tokens.json');

function readAll() {
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeAll(tokens) {
  fs.writeFileSync(filePath, JSON.stringify(tokens, null, 2));
}

function findByHash(hash) {
  return readAll().find((t) => t.hash === hash) || null;
}

function listByUser(userId) {
  return readAll()
    .filter((t) => t.userId === userId)
    .map(({ hash, ...rest }) => rest);
}

function create(token) {
  const tokens = readAll();
  tokens.push(token);
  writeAll(tokens);
  return token;
}

function remove(id, userId) {
  const tokens = readAll();
  const idx = tokens.findIndex((t) => t.id === id && t.userId === userId);
  if (idx === -1) return false;
  tokens.splice(idx, 1);
  writeAll(tokens);
  return true;
}

module.exports = { findByHash, listByUser, create, remove };
