const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');

const statusRoutes = require('./routes/status');
const authRoutes = require('./routes/auth');
const wakeRoutes = require('./routes/wake');
const tokenRoutes = require('./routes/tokens');

function createApp() {
  const app = express();

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  app.use(express.json());
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use('/api/status', statusRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/wake', wakeRoutes);
  app.use('/api/tokens', tokenRoutes);

  return app;
}

module.exports = createApp;
