import express from 'express';
import { requireAuth, requireBotKey } from '../middleware/requireAuth.js';
import { listProducts, priceForMonths } from '../services/products.js';
import { listCommands } from '../services/commands.js';
import { User } from '../models/User.js';
import { Order } from '../models/Order.js';
import { Slot } from '../models/Slot.js';
import { canManageGuild, fetchDiscordGuilds } from '../services/discord.js';

export function apiRoutes(cfg) {
  const router = express.Router();

  router.get('/products', async (req, res) => {
    const products = await listProducts();
    res.json({ ok: true, products });
  });

  router.get('/commands', async (req, res) => {
    const commands = await listCommands();
    res.json({ ok: true, commands });
  });

  router.get('/me', async (req, res) => {
    if (!req.session?.userId) return res.json({ ok: true, user: null });
    const user = await User.findById(req.session.userId).lean();
    if (!user) return res.json({ ok: true, user: null });
    res.json({
      ok: true,
      user: {
        id: user.discordId,
        username: user.username,
        globalName: user.globalName,
        avatar: user.avatar
      }
    });
  });

  router.get('/guilds', requireAuth, async (req, res) => {
    const user = await User.findById(req.session.userId).lean();
    if (!user?.accessToken) return res.status(401).json({ ok: false, error: 'NO_TOKEN' });
    const guilds = await fetchDiscordGuilds(user.accessToken);
    const manageable = guilds.filter(canManageGuild).map(g => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      permissions: g.permissions,
      owner: g.owner
    }));
    res.json({ ok: true, guilds: manageable });
  });

  router.get('/slots', requireAuth, async (req, res) => {
    const slots = await Slot.find({ userId: req.session.userId }).sort({ createdAt: -1 }).lean();
    res.json({ ok: true, slots });
  });

  router.post('/slots/:slotId/activate', requireAuth, express.json(), async (req, res) => {
    const { slotId } = req.params;
    const { guildId } = req.body || {};
    if (!guildId) return res.status(400).json({ ok: false, error: 'MISSING_GUILD_ID' });

    // verify guild is manageable by user
    const user = await User.findById(req.session.userId).lean();
    const guilds = await fetchDiscordGuilds(user.accessToken);
    const okGuild = guilds.some(g => g.id === guildId && canManageGuild(g));
    if (!okGuild) return res.status(403).json({ ok: false, error: 'NO_GUILD_PERMISSION' });

    const slot = await Slot.findOne({ _id: slotId, userId: req.session.userId });
    if (!slot) return res.status(404).json({ ok: false, error: 'SLOT_NOT_FOUND' });
    if (slot.status !== 'active') return res.status(400).json({ ok: false, error: 'SLOT_NOT_ACTIVE' });
    if (slot.expiresAt && slot.expiresAt.getTime() < Date.now()) {
      slot.status = 'expired';
      await slot.save();
      return res.status(400).json({ ok: false, error: 'SLOT_EXPIRED' });
    }

    slot.guildId = guildId;
    await slot.save();
    res.json({ ok: true, slot });
  });

  router.get('/orders', requireAuth, async (req, res) => {
    const orders = await Order.find({ userId: req.session.userId }).sort({ createdAt: -1 }).lean();
    res.json({ ok: true, orders });
  });

  // Quote endpoint: server-side price calc for a cart
  router.post('/quote', express.json(), async (req, res) => {
    try {
      const { items } = req.body || {};
      const products = await listProducts();
      const byId = new Map(products.map(p => [p.id, p]));
      let total = 0;
      const lines = [];
      for (const it of (items || [])) {
        const p = byId.get(it.productId);
        if (!p) continue;
        const months = Number(it.months || 1);
        const qty = Math.max(1, Number(it.quantity || 1));
        const unit = priceForMonths(p.monthlyPriceCents, months);
        const line = unit * qty;
        total += line;
        lines.push({ productId: p.id, name: p.name, months, quantity: qty, unitAmountCents: unit, lineAmountCents: line });
      }
      res.json({ ok: true, totalCents: total, lines, currency: cfg.stripe.currency });
    } catch (e) {
      console.error(e);
      res.status(500).json({ ok: false, error: 'QUOTE_FAILED' });
    }
  });

  // Bot-side check: is guild premium for product?
  router.get('/premium/:guildId', requireBotKey(() => cfg.botApiKey), async (req, res) => {
    const { guildId } = req.params;
    const productId = req.query.productId;
    if (!productId) return res.status(400).json({ ok: false, error: 'MISSING_productId' });

    const now = new Date();
    const slot = await Slot.findOne({
      guildId,
      productId,
      status: 'active',
      expiresAt: { $gt: now }
    }).lean();

    res.json({ ok: true, active: Boolean(slot), slot });
  });

  return router;
}
