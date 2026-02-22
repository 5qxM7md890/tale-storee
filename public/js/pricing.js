import { fetchJSON, money, getLang } from './common.js';
import { initCartUI, addToCart, getCart, updateBadge } from './cart.js';

initCartUI();

const grid = document.querySelector('#products');

const { products } = await fetchJSON('/api/products');

render();

function render() {
  const lang = getLang();
  const t = strings(lang);

  const cart = getCart();
  const inCart = new Set(cart.map(i => i.productId));

  grid.innerHTML = products.map(p => {
    const already = inCart.has(p.id);
    return `
      <div class="pcard">
        <div class="phead">
          <div>
            <div class="pname">${escapeHtml(p.name)}</div>
            <div class="pmeta">${escapeHtml(p.description || '')}</div>
          </div>
          <div class="cicon" title="${escapeHtml(p.name)}">${escapeHtml(p.icon || '🤖')}</div>
        </div>
        <div class="pprice">${money(p.monthlyPriceCents)} <small>${t.perMonth}</small></div>
        <div class="pbtn">
          <button class="btn ${already ? 'gray' : 'primary'}" data-add="${p.id}" ${already ? 'disabled' : ''}>
            ${already ? t.alreadyInCart : t.addToCart}
          </button>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', () => {
      addToCart(btn.dataset.add);
      updateBadge();
      render();
    });
  });
}

function strings(lang) {
  if (lang === 'AR') {
    return {
      addToCart: 'أضف إلى السلة',
      alreadyInCart: 'موجود في السلة',
      perMonth: 'شهريًا'
    };
  }
  return {
    addToCart: 'Add To Cart',
    alreadyInCart: 'Already in Cart',
    perMonth: 'per month'
  };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]|'/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
