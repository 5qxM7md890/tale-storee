import { fetchJSON, getLang } from './common.js';

const q = document.querySelector('#q');
const catRoot = document.querySelector('#cats');
const listRoot = document.querySelector('#cmds');

const { commands } = await fetchJSON('/api/commands');

const categories = ['All', ...Array.from(new Set(commands.map(c => c.category))).sort()];
let activeCat = 'All';

renderCats();
q.addEventListener('input', render);
render();

function renderCats() {
  catRoot.innerHTML = categories.map(c => `
    <button class="catbtn ${c===activeCat?'active':''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>
  `).join('');

  catRoot.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      activeCat = b.dataset.cat;
      renderCats();
      render();
    });
  });
}

function render() {
  const lang = getLang();
  const t = strings(lang);

  const term = (q.value || '').toLowerCase().trim();
  const filtered = commands.filter(c => {
    const okCat = activeCat === 'All' || c.category === activeCat;
    const blob = `${c.name} ${c.description} ${c.usage}`.toLowerCase();
    const okTerm = !term || blob.includes(term);
    return okCat && okTerm;
  });

  listRoot.innerHTML = filtered.length ? filtered.map(c => `
    <div class="cmd">
      <div>
        <div class="name">${escapeHtml(c.name)}</div>
        <div class="desc">${escapeHtml(c.description || '')}</div>
        ${c.usage ? `<div class="usage">${escapeHtml(c.usage)}</div>` : ''}
      </div>
      <button class="copy" data-copy="${escapeHtml(c.usage || c.name)}">${t.copy}</button>
    </div>
  `).join('') : `<div class="muted">${t.none}</div>`;

  listRoot.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(btn.dataset.copy);
      const old = btn.textContent;
      btn.textContent = t.copied;
      setTimeout(() => (btn.textContent = old), 700);
    });
  });
}

function strings(lang) {
  if (lang === 'AR') {
    return { copy: 'نسخ', copied: 'تم', none: 'لا توجد أوامر.' };
  }
  return { copy: 'Copy', copied: 'Copied', none: 'No commands found.' };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]|'/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
