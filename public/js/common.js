export async function fetchJSON(url, opts = {}) {
  const r = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts
  });
  const ct = r.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await r.json() : await r.text();
  if (!r.ok) {
    const msg = (data && data.error) ? data.error : `HTTP_${r.status}`;
    const err = new Error(msg);
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function money(cents, currency = 'USD') {
  const n = (Number(cents) || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

const LANG_KEY = 'tale_lang';

export function getLang() {
  const v = (localStorage.getItem(LANG_KEY) || 'EN').toUpperCase();
  return v === 'AR' ? 'AR' : 'EN';
}

export function setLang(lang) {
  localStorage.setItem(LANG_KEY, lang);
}

function applyLang(lang) {
  const isAr = lang === 'AR';
  document.documentElement.lang = isAr ? 'ar' : 'en';
  document.body.classList.toggle('rtl', isAr);
}

export async function renderNav(active) {
  const nav = document.querySelector('#nav');
  if (!nav) return;

  const lang = getLang();
  applyLang(lang);

  const me = await fetchJSON('/api/me').catch(() => ({ ok: true, user: null }));
  const user = me.user;

  const t = strings(lang);

  nav.innerHTML = `
    <div class="nav">
      <div class="container nav-inner">
        <div class="nav-left">
          <a class="brand" href="/">
            <div class="logo" aria-hidden="true"></div>
            <div>${t.brand}</div>
          </a>
        </div>

        <div class="nav-mid">
          <a class="${active==='home' ? 'active' : ''}" href="/">${t.home}</a>
          <a class="${active==='commands' ? 'active' : ''}" href="/commands">${t.commands}</a>
          <a class="${active==='pricing' ? 'active' : ''}" href="/pricing">${t.pricing}</a>
          <a class="${active==='hosting' ? 'active' : ''}" href="/hosting">${t.hosting}</a>
          <a class="${active==='support' ? 'active' : ''}" href="/support">${t.support}</a>
        </div>

        <div class="nav-right" style="position:relative">
          ${langChip(lang)}
          ${user ? userBlock(user, t) : `<a class="btn primary" href="/auth/discord">${t.login}</a>`}
        </div>
      </div>
    </div>
  `;

  const langBtn = nav.querySelector('#langBtn');
  langBtn?.addEventListener('click', () => {
    const next = getLang() === 'EN' ? 'AR' : 'EN';
    setLang(next);
    location.reload();
  });

  if (user) {
    const userBtn = nav.querySelector('#userBtn');
    const menu = nav.querySelector('#userMenu');
    userBtn?.addEventListener('click', () => menu.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && !userBtn.contains(e.target)) menu.classList.remove('open');
    });

    const logout = nav.querySelector('#logout');
    logout?.addEventListener('click', async () => {
      await fetchJSON('/auth/logout', { method: 'POST' });
      location.href = '/';
    });
  }
}

function langChip(lang) {
  const flag = lang === 'AR' ? '🇸🇦' : '🇺🇸';
  return `
    <button class="lang" id="langBtn" title="Language">
      <span class="flag">${flag}</span>
      <span>${lang}</span>
    </button>
  `;
}

function userBlock(user, t) {
  const avatar = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64` : '';
  const name = user.globalName || user.username;

  return `
    <div class="user" id="userBtn">
      ${avatar ? `<img src="${avatar}" alt="">` : `<div class="logo" aria-hidden="true"></div>`}
      <div style="max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:850;">${escapeHtml(name)}</div>
      <div class="muted">▾</div>
    </div>
    <div class="menu" id="userMenu">
      <a href="/account">${t.myAccount}</a>
      <a href="/account#servers">${t.servers}</a>
      <a href="/account#subscriptions">${t.subscriptions}</a>
      <a href="/account#invoices">${t.invoices}</a>
      <div class="sep"></div>
      <button id="logout" class="danger">${t.logout}</button>
    </div>
  `;
}

function strings(lang) {
  if (lang === 'AR') {
    return {
      brand: 'Tale Store',
      home: 'الرئيسية',
      commands: 'الأوامر',
      pricing: 'الأسعار',
      hosting: 'الاستضافة',
      support: 'الدعم',
      login: 'تسجيل الدخول',
      myAccount: 'حسابي',
      servers: 'السيرفرات',
      subscriptions: 'الاشتراكات',
      invoices: 'الفواتير',
      logout: 'تسجيل الخروج'
    };
  }
  return {
    brand: 'Tale Store',
    home: 'Home',
    commands: 'Commands',
    pricing: 'Pricing',
    hosting: 'Hosting',
    support: 'Support',
    login: 'Login',
    myAccount: 'My Account',
    servers: 'Servers',
    subscriptions: 'Subscriptions',
    invoices: 'Invoices',
    logout: 'Logout'
  };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]|'/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
