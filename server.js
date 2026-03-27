require('dotenv').config();

const createApp = require('./src/app');
const config = require('./src/config');
const fs = require('fs');

// Ensure data directory exists
if (!fs.existsSync(config.dataDir)) {
  fs.mkdirSync(config.dataDir, { recursive: true });
}

const app = createApp();

app.listen(config.port, () => {
  console.log(`WoL server listening on port ${config.port}`);
});
