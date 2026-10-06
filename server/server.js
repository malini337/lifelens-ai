// Entry point: loads environment variables, connects to MongoDB, then starts Express.
require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');

const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET'];

async function start() {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error(`Missing required environment variable(s): ${missing.join(', ')}`);
    console.error('Copy server/.env.example to server/.env and fill in the values.');
    process.exit(1);
  }

  if (!process.env.AI_API_KEY) {
    console.warn('AI_API_KEY is not set. Text analysis will use the labelled deterministic fallback; image analysis will be unavailable.');
  }

  await connectDB();

  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`LifeLens AI server running on port ${port}`);
  });
}

start();
