const fs = require('fs');
const path = require('path');
const config = require('../config');
const { hashToken } = require('../utils/crypto');

const filePath = path.join(config.dataDir, 'users.json');

function readAll() {
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeAll(users) {
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
}

function hashUsername(username) {
  return hashToken(username.toLowerCase());
}

function findByUsername(username) {
  const hash = hashUsername(username);
  return readAll().find((u) => u.usernameHash === hash) || null;
}

function findById(id) {
  return readAll().find((u) => u.id === id) || null;
}

function create(user) {
  const users = readAll();
  users.push(user);
  writeAll(users);
  return user;
}

function update(id, data) {
  const users = readAll();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...data };
  writeAll(users);
  return users[idx];
}

function count() {
  return readAll().length;
}

module.exports = { findByUsername, findById, create, update, count, hashUsername };
