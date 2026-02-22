import express from 'express';
import Stripe from 'stripe';
import { requireAuth } from '../middleware/requireAuth.js';
import { listProducts, priceForMonths } from '../services/products.js';
import { Order } from '../models/Order.js';
import { Slot } from '../models/Slot.js';

function addMonths(date, months) {
  const d = new Date(date);
  const targetMonth = d.getMonth() + months;
  d.setMonth(targetMonth);
  return d;
}

export function stripeRoutes(cfg) {
  const router = express.Router();

  const hasStripe = Boolean(cfg.stripe.secretKey);
  const stripe = hasStripe ? new Stripe(cfg.stripe.secretKey, { apiVersion: '2024-06-20' }) : null;

  router.post('/checkout', requireAuth, express.json(), async (req, res) => {
    try {
      if (!stripe) return res.status(500).json({ ok: false, error: 'STRIPE_NOT_CONFIGURED' });

      const { items } = req.body || {};
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ ok: false, error: 'EMPTY_CART' });
      }

      const products = await listProducts();
      const byId = new Map(products.map(p => [p.id, p]));

      const lines = [];
      let total = 0;
      for (const it of items) {
        const p = byId.get(it.productId);
        if (!p) continue;
        const months = Math.max(1, Number(it.months || 1));
        const qty = Math.max(1, Number(it.quantity || 1));
        const unit = priceForMonths(p.monthlyPriceCents, months);
        const line = unit * qty;
        total += line;
        lines.push({ productId: p.id, name: p.name, months, quantity: qty, unitAmountCents: unit, lineAmountCents: line });
      }

      if (lines.length === 0) return res.status(400).json({ ok: false, error: 'INVALID_ITEMS' });

      const order = await Order.create({
        userId: req.session.userId,
        stripeSessionId: `pending_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        amountTotal: total,
        currency: cfg.stripe.currency,
        items: lines,
        status: 'pending'
      });

      const line_items = lines.map(l => ({
        quantity: l.quantity,
        price_data: {
          currency: cfg.stripe.currency,
          unit_amount: l.unitAmountCents,
          product_data: {
            name: `${l.name} (${l.months} month${l.months > 1 ? 's' : ''})`
          }
        }
      }));

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items,
        success_url: `${cfg.baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${cfg.baseUrl}/cancel.html`,
        metadata: {
          orderId: String(order._id),
          userId: String(req.session.userId)
        }
      });

      // Update placeholder session id
      order.stripeSessionId = session.id;
      await order.save();

      res.json({ ok: true, url: session.url });
    } catch (e) {
      console.error(e);
      res.status(500).json({ ok: false, error: 'CHECKOUT_FAILED' });
    }
  });

  // Stripe webhooks must receive the RAW body.
  router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      if (!stripe) return res.status(500).send('stripe not configured');
      const sig = req.headers['stripe-signature'];
      if (!cfg.stripe.webhookSecret) return res.status(500).send('webhook secret missing');

      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, cfg.stripe.webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed.', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const orderId = session.metadata?.orderId;
        if (orderId) {
          const order = await Order.findById(orderId);
          if (order && order.status !== 'paid') {
            order.status = 'paid';
            order.amountTotal = session.amount_total ?? order.amountTotal;
            order.currency = session.currency ?? order.currency;
            await order.save();

            // Create slots: one per quantity
            const now = new Date();
            for (const item of order.items) {
              for (let i = 0; i < item.quantity; i++) {
                const expiresAt = addMonths(now, item.months);
                await Slot.create({
                  userId: order.userId,
                  orderId: order._id,
                  productId: item.productId,
                  productName: item.name,
                  months: item.months,
                  expiresAt,
                  status: 'active'
                });
              }
            }
          }
        }
      }

      res.json({ received: true });
    } catch (e) {
      console.error(e);
      res.status(500).send('Webhook handler failed');
    }
  });

  return router;
}
