import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import path from 'path';
import { fileURLToPath } from 'url';

import { config } from './config.js';
import { connectDb } from './db.js';
import { authRoutes } from './routes/auth.js';
import { apiRoutes } from './routes/api.js';
import { stripeRoutes } from './routes/stripe.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cfg = config();

async function main() {
  await connectDb({ mongoUri: cfg.mongoUri, mongoDb: cfg.mongoDb });

  const app = express();
  app.set('trust proxy', 1);

  app.use(session({
    name: 'sile.sid',
    secret: cfg.sessionSecret || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: cfg.cookieSecure,
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    },
    store: MongoStore.create({
      mongoUrl: cfg.mongoUri,
      dbName: cfg.mongoDb,
      collectionName: 'sessions'
    })
  }));

  // Routes
  app.use('/auth', authRoutes(cfg));
  app.use('/api', apiRoutes(cfg));
  app.use('/api/stripe', stripeRoutes(cfg));

  // Static
  app.use(express.static(path.resolve(process.cwd(), 'public')));

  app.get('/health', (req, res) => res.json({ ok: true }));

  // Simple SPA-like fallback for common pages
  app.get(['/', '/pricing', '/commands', '/account', '/hosting', '/support', '/terms', '/privacy', '/cancelations'], (req, res) => {
    const map = {
      '/': 'index.html',
      '/pricing': 'pricing.html',
      '/commands': 'commands.html',
      '/account': 'account.html',
      '/hosting': 'hosting.html',
      '/support': 'support.html',
      '/terms': 'terms.html',
      '/privacy': 'privacy.html',
      '/cancelations': 'cancelations.html'
    };
    res.sendFile(path.resolve(process.cwd(), 'public', map[req.path]));
  });

  // Optional account routes
  app.get(['/servers', '/subscriptions', '/invoices'], (req, res) => {
    const t = req.path.replace('/', '');
    res.redirect(`/account#${t}`);
  });

  app.use((req, res) => {
    res.status(404).send('Not found');
  });

  app.listen(cfg.port, () => {
    console.log(`[HTTP] ${cfg.baseUrl} (port ${cfg.port})`);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
