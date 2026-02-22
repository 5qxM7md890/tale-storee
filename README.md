# Tale Store Dashboard

هذا مشروع **Dashboard/Store مستقل** (مو داخل SileStudioBot) يطبق فكرة متجر اشتراكات للبوتات:

- صفحة **Pricing** للخطط (Bots/Plans)
- **Cart Drawer** (مدة 1/3/6/12 شهر + كمية)
- تسجيل دخول **Discord OAuth**
- صفحة **Dashboard** فيها: Servers / Subscriptions (Slots) / Invoices
- الدفع عبر **Stripe Checkout** + Webhook ينشئ **Slots** في MongoDB
- Endpoint جاهز للبوت عشان يتحقق: هل السيرفر Premium ولا لا

> ملاحظة: هذا قالب جاهز (Template). عدّل النصوص/الأسعار/السياسات والروابط قبل الإطلاق.

---

## المتطلبات

- Node.js 18+ (أفضل 20+)
- MongoDB (محلي أو Atlas)
- Discord Developer Application
- Stripe (Test/Live)

---

## التشغيل محليًا

1) ثبّت الحزم:

```bash
npm install
```

2) انسخ ملف الإعدادات:

```bash
cp .env.example .env
```

3) عبّي المتغيرات داخل `.env`:

- `MONGO_URI` و `MONGO_DB`
- `SESSION_SECRET`
- `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI` (لازم يطابق Redirect في Discord)
- (اختياري) `BOT_API_KEY`

4) شغّل:

```bash
npm run dev
```

الروابط:
- Home: `http://localhost:5177/`
- Pricing: `http://localhost:5177/pricing`
- Commands: `http://localhost:5177/commands`
- Dashboard: `http://localhost:5177/account`

---

## إعداد Discord OAuth

في Discord Developer Portal:

- OAuth2 → Redirects
  - أضف: `http://localhost:5177/auth/discord/callback`
- Scopes المستخدمة: `identify email guilds`

---

## إعداد Stripe (Test)

1) حط مفاتيح Stripe في `.env`:
- `STRIPE_SECRET_KEY`
- `STRIPE_CURRENCY` (مثلاً `usd`)

2) Webhook:
- الـ endpoint داخل المشروع: 
  - `POST /api/stripe/webhook`

إذا تستخدم Stripe CLI (محلي):

```bash
stripe listen --forward-to localhost:5177/api/stripe/webhook
```

بعدها Stripe CLI يعطيك `whsec_...` حطه في:
- `STRIPE_WEBHOOK_SECRET`

> بعد الدفع: Webhook يغيّر الطلب إلى `paid` وينشئ Slots.

---

## كيف “التسليم” يصير؟ (Slots)

- العميل يشتري خطة → يصير عنده **Slots**
- يروح Dashboard → Subscriptions
- يختار Slot ويضغط Activate على سيرفر عنده Admin/Manage Server
- يتم ربط الـ Slot بـ `guildId`

---

## ربط البوت (Premium Check)

Endpoint جاهز للبوت:

- `GET /api/premium/:guildId?productId=system_bot`

Headers:
- `x-api-key: <BOT_API_KEY>`

الرد:
```json
{ "ok": true, "active": true/false }
```

داخل البوت:
- إذا `active=true` فعّل المزايا المدفوعة.

---

## تعديل المنتجات والأوامر

- المنتجات: `data/products.json`
- الأوامر: `data/commands.json`

(تقدر لاحقًا تسوي Script يستورد الأوامر من مشروع البوت ويحدث ملف JSON.)

---

## نشر على الاستضافة (Production Notes)

- فعل HTTPS
- خلي:
  - `COOKIE_SECURE=true`
  - `BASE_URL=https://your-domain.com`
  - `DISCORD_REDIRECT_URI=https://your-domain.com/auth/discord/callback`

---

## ملفات مهمة

- `src/server.js` تشغيل السيرفر + static pages
- `src/routes/auth.js` Discord OAuth
- `src/routes/stripe.js` Checkout + Webhook
- `src/routes/api.js` Products/Commands/Account APIs + Premium check
- `public/` صفحات الواجهة

