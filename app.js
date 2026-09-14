const stores = [{
  name: 'KÖPPEN',
  url: 'https://www.koppen.co/collections/all',
  category: 'Cuidado bucal',
  country: '',
  description: 'Objetos y fórmulas para el cuidado oral.',
  image: 'https://www.koppen.co/cdn/shop/files/Support_9b1de2bc-9267-4f53-91b5-94f82bcee8fc.png?v=1772759296&width=1400'
}];
let selectedCategory = 'Todas';

const grid = document.querySelector('#store-grid');
const filters = document.querySelector('#filters');
const search = document.querySelector('#search');
const count = document.querySelector('#store-count');

function categories() { return ['Todas', ...new Set(stores.map(store => store.category).filter(Boolean))]; }
function escapeHtml(value = '') { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }
function render() {
  const term = search.value.trim().toLowerCase();
  const visible = stores.filter(store => (selectedCategory === 'Todas' || store.category === selectedCategory) && `${store.name} ${store.country} ${store.category} ${store.description}`.toLowerCase().includes(term));
  count.textContent = `${stores.length} ${stores.length === 1 ? 'tienda' : 'tiendas'}`;
  filters.innerHTML = categories().map(category => `<button class="filter ${category === selectedCategory ? 'active' : ''}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join('');
  grid.innerHTML = visible.length ? visible.map((store, index) => `
    <article class="store-card">
      <a href="${escapeHtml(store.url)}" target="_blank" rel="noopener" aria-label="Visitar ${escapeHtml(store.name)}">
        <div class="shot">${store.image ? `<img src="${store.image}" alt="Captura de ${escapeHtml(store.name)}" />` : `<div class="fallback" style="--card-a:${['#d9e9c9','#efc5b9','#c9dce1','#ded2bd'][index % 4]};--card-b:${['#a7b8a0','#dfa49e','#aabdc3','#baa47e'][index % 4]}">${escapeHtml(store.name)}</div>`}</div>
      </a>
      <div class="card-info"><div><h3>${escapeHtml(store.name)}</h3><p>${escapeHtml([store.category, store.country, store.description].filter(Boolean).join(' · '))}</p></div><a href="${escapeHtml(store.url)}" target="_blank" rel="noopener" aria-hidden="true">↗</a></div>
    </article>`).join('') : `<p class="empty">Aún no hay tiendas aquí. Añade la primera desde el botón superior.</p>`;
}
filters.addEventListener('click', event => { const button = event.target.closest('[data-category]'); if (!button) return; selectedCategory = button.dataset.category; render(); });
search.addEventListener('input', render);
document.querySelector('#year').textContent = new Date().getFullYear();
render();
