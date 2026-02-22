import { fetchJSON, money } from './common.js';


const me = await fetchJSON('/api/me');
if (!me.user) location.href = '/auth/discord';

const tabs = document.querySelector('#tabs');
const view = document.querySelector('#view');

const state = {
  guilds: [],
  slots: [],
  orders: []
};

async function loadAll() {
  const [g, s, o] = await Promise.all([
    fetchJSON('/api/guilds'),
    fetchJSON('/api/slots'),
    fetchJSON('/api/orders')
  ]);
  state.guilds = g.guilds;
  state.slots = s.slots;
  state.orders = o.orders;
}

await loadAll();

const tabsList = [
  { id: 'servers', label: 'Servers' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'invoices', label: 'Invoices' }
];

function currentTab() {
  return (location.hash || '#servers').slice(1);
}

function renderTabs() {
  const active = currentTab();
  tabs.innerHTML = tabsList.map(t => `
    <button class="tab ${t.id===active?'active':''}" data-tab="${t.id}">${t.label}</button>
  `).join('');

  tabs.querySelectorAll('[data-tab]').forEach(b => {
    b.addEventListener('click', () => {
      location.hash = '#' + b.dataset.tab;
    });
  });
}

function renderView() {
  const active = currentTab();
  renderTabs();

  if (active === 'servers') {
    view.innerHTML = serversHTML();
  } else if (active === 'subscriptions') {
    view.innerHTML = subsHTML();
    wireActivate();
  } else {
    view.innerHTML = invoicesHTML();
  }
}

window.addEventListener('hashchange', renderView);
renderView();

function serversHTML() {
  const rows = state.guilds.map(g => `
    <tr>
      <td>${escapeHtml(g.name)}</td>
      <td><span class="badge ok">Manage Guild</span></td>
      <td class="muted">${escapeHtml(g.id)}</td>
    </tr>
  `).join('');

  return `
    <div class="card">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px">
        <div>
          <div style="font-weight:900; font-size:18px">Your Servers</div>
          <div class="muted" style="margin-top:4px">Only servers where you have Admin/Manage Server permissions are shown.</div>
        </div>
        <a class="btn" href="https://discord.com/developers/docs/topics/oauth2" target="_blank" rel="noreferrer">OAuth scopes</a>
      </div>
      <div style="overflow:auto; margin-top:14px">
        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Access</th>
              <th>ID</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="3" class="muted">No manageable servers found.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function subsHTML() {
  const now = Date.now();
  const rows = state.slots.map(s => {
    const exp = s.expiresAt ? new Date(s.expiresAt) : null;
    const active = s.status === 'active' && exp && exp.getTime() > now;
    return `
      <tr>
        <td>
          <div style="font-weight:900">${escapeHtml(s.productName)}</div>
          <div class="muted" style="font-size:12px">${escapeHtml(s.productId)} • ${s.months}m</div>
        </td>
        <td>${active ? `<span class="badge ok">Active</span>` : `<span class="badge">${escapeHtml(s.status)}</span>`}</td>
        <td class="muted">${exp ? exp.toLocaleDateString() : '-'}</td>
        <td>
          ${s.guildId ? `<span class="badge ok">Linked</span><div class="muted" style="font-size:12px; margin-top:4px">${escapeHtml(s.guildId)}</div>` : `
            <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap">
              <select class="select" data-guildsel="${s._id}">
                ${state.guilds.map(g => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('')}
              </select>
              <button class="btn primary" data-activate="${s._id}">Activate</button>
            </div>
          `}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="card">
      <div style="font-weight:900; font-size:18px">Subscriptions (Slots)</div>
      <div class="muted" style="margin-top:4px">After payment, you get slots. Activate a slot on a server to deliver the bot plan.</div>
      <div style="overflow:auto; margin-top:14px">
        <table class="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Status</th>
              <th>Expires</th>
              <th>Server</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="4" class="muted">No subscriptions yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function wireActivate() {
  document.querySelectorAll('[data-activate]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const slotId = btn.dataset.activate;
      const sel = document.querySelector(`[data-guildsel="${slotId}"]`);
      const guildId = sel?.value;
      if (!guildId) return alert('Pick a server');

      btn.textContent = 'Activating…';
      try {
        await fetchJSON(`/api/slots/${slotId}/activate`, {
          method: 'POST',
          body: JSON.stringify({ guildId })
        });
        await loadAll();
        renderView();
      } catch (e) {
        alert('Activation failed: ' + e.message);
      } finally {
        btn.textContent = 'Activate';
      }
    });
  });
}

function invoicesHTML() {
  const rows = state.orders.map(o => {
    const when = new Date(o.createdAt).toLocaleString();
    const total = money(o.amountTotal || 0, (o.currency || 'usd').toUpperCase());
    return `
      <tr>
        <td class="muted">${escapeHtml(o.stripeSessionId)}</td>
        <td>${escapeHtml(o.status)}</td>
        <td>${total}</td>
        <td class="muted">${when}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="card">
      <div style="font-weight:900; font-size:18px">Invoices</div>
      <div class="muted" style="margin-top:4px">Basic order history. You can expand this later to show full invoice PDFs from Stripe.</div>
      <div style="overflow:auto; margin-top:14px">
        <table class="table">
          <thead>
            <tr>
              <th>Session</th>
              <th>Status</th>
              <th>Total</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="4" class="muted">No invoices yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
