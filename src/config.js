const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config.json');
const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const config = Object.freeze({
  port: parseInt(process.env.PORT, 10) || fileConfig.port || 3000,
  jwtSecret: process.env.JWT_SECRET || fileConfig.jwtSecret || 'change-me',
  rpName: fileConfig.rpName || 'WoL PWA',
  rpId: process.env.RP_ID || fileConfig.rpId || 'localhost',
  rpOrigin: process.env.RP_ORIGIN || fileConfig.rpOrigin || 'http://localhost:3000',
  broadcastAddress: fileConfig.broadcastAddress || '255.255.255.255',
  targets: fileConfig.targets || [],
  dataDir: path.join(__dirname, '..', 'data'),
});

module.exports = config;
