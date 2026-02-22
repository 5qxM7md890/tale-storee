import dotenv from 'dotenv';

dotenv.config();

const required = [
  'SESSION_SECRET',
  'MONGO_URI',
  'MONGO_DB',
  'BASE_URL',
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'DISCORD_REDIRECT_URI'
];

export function config() {
  const cfg = {
    port: Number(process.env.PORT || 5177),
    baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 5177}`,
    sessionSecret: process.env.SESSION_SECRET,
    cookieSecure: String(process.env.COOKIE_SECURE || 'false').toLowerCase() === 'true',
    mongoUri: process.env.MONGO_URI,
    mongoDb: process.env.MONGO_DB,
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      redirectUri: process.env.DISCORD_REDIRECT_URI
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      currency: process.env.STRIPE_CURRENCY || 'usd'
    },
    botApiKey: process.env.BOT_API_KEY || ''
  };

  // Only hard-require Stripe keys if you actually use checkout.
  for (const k of required) {
    if (!process.env[k]) {
      console.warn(`[WARN] Missing env ${k}. Some features will not work until it is set.`);
    }
  }
  return cfg;
}
