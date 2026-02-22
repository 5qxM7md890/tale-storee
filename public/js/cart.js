import { fetchJSON, money, getLang } from './common.js';

const KEY = 'tale_cart_v1';

export function getCart() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function setCart(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
  updateBadge();
}

export function addToCart(productId) {
  const cart = getCart();
  const found = cart.find(i => i.productId === productId);
  if (found) {
    // Fate-style: keep it in cart once, just bump quantity
    found.quantity += 1;
  } else {
    cart.push({ productId, months: 1, quantity: 1 });
  }
  setCart(cart);
  openCart();
  renderDrawer();
}

export function removeFromCart(productId) {
  const cart = getCart().filter(i => i.productId !== productId);
  setCart(cart);
  renderDrawer();
}

export function updateBadge() {
  const badge = document.querySelector('#cartBadge');
  if (!badge) return;
  const count = getCart().reduce((a, b) => a + (Number(b.quantity) || 0), 0);
  badge.textContent = String(count);
  badge.style.display = count > 0 ? 'flex' : 'none';

  const title = document.querySelector('#cartTitle');
  if (title) {
    const lang = getLang();
    title.textContent = lang === 'AR' ? `عناصر السلة (${count})` : `Cart Items (${count})`;
  }
}

export function initCartUI() {
  const fab = document.querySelector('#cartFab');
  const backdrop = document.querySelector('#drawerBackdrop');
  const drawer = document.querySelector('#drawer');
  const closeBtn = document.querySelector('#closeDrawer');
  const cont = document.querySelector('#continueShopping');

  if (!fab || !drawer || !backdrop) return;

  fab.addEventListener('click', () => {
    openCart();
    renderDrawer();
  });
  backdrop.addEventListener('click', closeCart);
  closeBtn?.addEventListener('click', closeCart);
  cont?.addEventListener('click', () => {
    closeCart();
  });

  updateBadge();
  renderDrawer();
}

export function openCart() {
  document.querySelector('#drawer')?.classList.add('open');
  document.querySelector('#drawerBackdrop')?.classList.add('open');
}

export function closeCart() {
  document.querySelector('#drawer')?.classList.remove('open');
  document.querySelector('#drawerBackdrop')?.classList.remove('open');
}

async function renderDrawer() {
  const root = document.querySelector('#cartItems');
  const totalEl = document.querySelector('#cartTotal');
  const checkoutBtn = document.querySelector('#checkout');
  if (!root || !totalEl || !checkoutBtn) return;

  const lang = getLang();
  const t = strings(lang);

  const cart = getCart();
  updateBadge();

  if (cart.length === 0) {
    root.innerHTML = `<div class="muted">${t.empty}</div>`;
    totalEl.textContent = money(0);
    checkoutBtn.disabled = true;
    return;
  }

  const { lines, totalCents, currency } = await fetchJSON('/api/quote', {
    method: 'POST',
    body: JSON.stringify({ items: cart })
  });

  root.innerHTML = lines.map(l => {
    const cartItem = cart.find(x => x.productId === l.productId);
    const months = cartItem?.months ?? l.months;
    const qty = cartItem?.quantity ?? l.quantity;

    return `
      <div class="cart-item">
        <div class="cart-row">
          <div class="cleft">
            <div class="cicon">${escapeHtml(l.icon || '🤖')}</div>
            <div style="min-width:0">
              <div class="ctitle">${escapeHtml(l.name)}</div>
              <div class="csub">${money(l.lineAmountCents, currency)}</div>
            </div>
          </div>
          <button class="remove" data-remove="${l.productId}">${t.remove}</button>
        </div>

        <div class="cart-row" style="margin-top:12px">
          <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap">
            <label class="muted" style="font-size:12px">${t.duration}</label>
            <select class="select" data-months="${l.productId}">
              ${durationOptions(months, t)}
            </select>
          </div>

          <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap">
            <label class="muted" style="font-size:12px">${t.bots}</label>
            <div class="qtywrap">
              <button class="qtybtn" data-dec="${l.productId}" aria-label="Decrease">−</button>
              <div class="qtynum" data-qtynum="${l.productId}">${qty}</div>
              <button class="qtybtn" data-inc="${l.productId}" aria-label="Increase">+</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  totalEl.textContent = money(totalCents, currency);
  checkoutBtn.disabled = false;

  root.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(btn.dataset.remove));
  });

  root.querySelectorAll('[data-months]').forEach(sel => {
    sel.addEventListener('change', () => {
      const cart = getCart();
      const it = cart.find(x => x.productId === sel.dataset.months);
      if (it) it.months = Number(sel.value);
      setCart(cart);
      renderDrawer();
    });
  });

  root.querySelectorAll('[data-inc]').forEach(btn => {
    btn.addEventListener('click', () => bump(btn.dataset.inc, +1));
  });
  root.querySelectorAll('[data-dec]').forEach(btn => {
    btn.addEventListener('click', () => bump(btn.dataset.dec, -1));
  });

  checkoutBtn.onclick = async () => {
    try {
      checkoutBtn.textContent = t.redirecting;
      const out = await fetchJSON('/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({ items: getCart() })
      });
      location.href = out.url;
    } catch (e) {
      checkoutBtn.textContent = t.checkout;
      if (e.status === 401) {
        location.href = '/auth/discord';
      } else {
        alert(t.checkoutFailed + e.message);
      }
    }
  };
}

function bump(productId, delta) {
  const cart = getCart();
  const it = cart.find(x => x.productId === productId);
  if (!it) return;
  it.quantity = Math.max(1, (Number(it.quantity) || 1) + delta);
  setCart(cart);
  renderDrawer();
}

function durationOptions(current, t) {
  const opts = [
    { m: 1, label: t.m1 },
    { m: 3, label: t.m3 },
    { m: 6, label: t.m6 },
    { m: 12, label: t.m12 }
  ];
  return opts.map(o => `<option value="${o.m}" ${o.m===current?'selected':''}>${o.label}</option>`).join('');
}

function strings(lang) {
  if (lang === 'AR') {
    return {
      empty: 'السلة فارغة.',
      remove: 'حذف',
      duration: 'المدة',
      bots: 'عدد البوتات',
      checkout: 'إتمام الدفع',
      redirecting: 'جارٍ التحويل…',
      checkoutFailed: 'فشل الدفع: ',
      m1: 'شهر واحد',
      m3: '3 أشهر',
      m6: '6 أشهر',
      m12: 'سنة واحدة'
    };
  }
  return {
    empty: 'Cart is empty.',
    remove: 'Remove',
    duration: 'Duration',
    bots: 'Number of Bots',
    checkout: 'Proceed To Checkout',
    redirecting: 'Redirecting…',
    checkoutFailed: 'Checkout failed: ',
    m1: '1 Month',
    m3: '3 Months',
    m6: '6 Months',
    m12: '1 Year'
  };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]|'/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
