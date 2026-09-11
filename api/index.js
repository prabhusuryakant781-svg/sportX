try { require('dotenv').config(); } catch (_) {
  try { require('../backend/functions/node_modules/dotenv').config(); } catch (__) {}
}
const { app } = require('../backend/functions/lib/index');

module.exports = app;
