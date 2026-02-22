import crypto from 'crypto';
import express from 'express';
import { User } from '../models/User.js';
import { exchangeCodeForToken, fetchDiscordUser, makeAuthUrl } from '../services/discord.js';

export function authRoutes(cfg) {
  const router = express.Router();

  router.get('/discord', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.oauthState = state;
    const url = makeAuthUrl({ clientId: cfg.discord.clientId, redirectUri: cfg.discord.redirectUri, state });
    res.redirect(url);
  });

  router.get('/discord/callback', async (req, res) => {
    try {
      const { code, state } = req.query;
      if (!code) return res.status(400).send('Missing code');
      if (!state || state !== req.session.oauthState) return res.status(400).send('Bad state');

      const token = await exchangeCodeForToken({
        clientId: cfg.discord.clientId,
        clientSecret: cfg.discord.clientSecret,
        redirectUri: cfg.discord.redirectUri,
        code
      });

      const me = await fetchDiscordUser(token.access_token);

      const doc = await User.findOneAndUpdate(
        { discordId: me.id },
        {
          discordId: me.id,
          username: me.username,
          globalName: me.global_name,
          avatar: me.avatar,
          email: me.email,
          accessToken: token.access_token,
          tokenType: token.token_type,
          scope: token.scope,
          tokenCreatedAt: new Date()
        },
        { upsert: true, new: true }
      );

      req.session.userId = String(doc._id);
      req.session.discordId = doc.discordId;
      res.redirect('/account');
    } catch (e) {
      console.error(e);
      res.status(500).send('OAuth failed');
    }
  });

  router.post('/logout', (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  return router;
}
