import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env.local if present (useful in monorepos/dev setup)
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

// Load backend .env if present (fallback/override)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  livekitUrl: process.env.LIVEKIT_URL,
  livekitApiKey: process.env.LIVEKIT_API_KEY,
  livekitApiSecret: process.env.LIVEKIT_API_SECRET,
  livekitWebhookSecret: process.env.LIVEKIT_WEBHOOK_SECRET || process.env.LIVEKIT_API_SECRET,
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/conferrence',
};

// Simple configuration validation helper
export const validateConfig = () => {
  const missing = [];

  if (!config.livekitUrl) missing.push('LIVEKIT_URL');
  if (!config.livekitApiKey) missing.push('LIVEKIT_API_KEY');
  if (!config.livekitApiSecret) missing.push('LIVEKIT_API_SECRET');

  if (missing.length > 0) {
    console.warn(`[Config Warning]: The following environment variables are missing: ${missing.join(', ')}`);
  }
};

export default config;
