const supabaseClient = window.supabase.createClient(
  'https://vgykdllkiymsxlcxutalq.supabase.co',
  'sb_publishable_SIBEtvHlapd7OmM1YgKM2g_syRWTteh'
);
let stores = [];
let selectedCategory = 'Todas';

const grid = document.querySelector('#store-grid');
const filters = document.querySelector('#filters');
const search = document.querySelector('#search');
const count = document.querySelector('#store-count');
const reviewList = document.querySelector('#review-list');
const reviewFilters = document.querySelector('#review-filters');
const reviewSearch = document.querySelector('#review-search');
const reviewCount = document.querySelector('#review-count');
const reviewStores = window.goodstores || [];
let reviewFilter = 'Todas';
let reviewDecisions = JSON.parse(localStorage.getItem('vitrea-review-decisions') || '{}');

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

async function loadStores() {
  grid.innerHTML = '<p class="empty">Cargando tiendas…</p>';
  const { data, error } = await supabaseClient
    .from('stores')
    .select('name, url, category, description, image_url')
    .eq('published', true)
    .order('created_at', { ascending: false });

  if (error) {
    grid.innerHTML = '<p class="empty">No se han podido cargar las tiendas todavía.</p>';
    return;
  }

  stores = (data || []).map(store => ({ ...store, image: store.image_url }));
  render();
}

function reviewLabel(status) {
  return { include: 'Incluir', discard: 'Descartar' }[status] || 'Pendiente';
}

function combinedStatus(storeUrl) {
  const choices = Object.values(reviewDecisions[storeUrl] || {});
  if (choices.includes('include')) return 'include';
  if (choices.includes('discard')) return 'discard';
  return 'pending';
}

function renderReview() {
  const term = reviewSearch.value.trim().toLowerCase();
  const visible = reviewStores.filter(store => {
    const status = combinedStatus(store.url);
    return (reviewFilter === 'Todas' || reviewFilter === reviewLabel(status)) && `${store.name} ${store.url}`.toLowerCase().includes(term);
  });
  const pending = reviewStores.filter(store => combinedStatus(store.url) === 'pending').length;
  reviewCount.textContent = `${pending} por revisar · ${reviewStores.length} referencias`;
  reviewFilters.innerHTML = ['Todas', 'Pendiente', 'Incluir', 'Descartar'].map(filter => `<button class="filter ${filter === reviewFilter ? 'active' : ''}" data-review-filter="${filter}">${filter}</button>`).join('');
  reviewList.innerHTML = visible.length ? visible.map((store, index) => {
    const decisions = reviewDecisions[store.url] || {};
    const status = combinedStatus(store.url);
    const preview = `https://image.thum.io/get/width/1200/crop/2800/noanimate/${store.url}`;
    return `<article class="review-card ${status}"><a class="review-preview" href="${escapeHtml(store.url)}" target="_blank" rel="noopener" aria-label="Abrir ${escapeHtml(store.name)}"><img src="${escapeHtml(preview)}" alt="Vista previa de ${escapeHtml(store.name)}" loading="lazy" /><span>Ver web ↗</span></a><div class="review-card-info"><div><p class="review-number">${String(index + 1).padStart(2, '0')} · GOODSTORES</p><a href="${escapeHtml(store.url)}" target="_blank" rel="noopener">${escapeHtml(store.name)}</a><p class="review-url">${escapeHtml(store.url.replace(/^https?:\/\//, ''))}</p></div><div class="reviewer-decision"><span>Eli</span><div><button class="review-action include ${decisions.eli === 'include' ? 'active' : ''}" data-reviewer="eli" data-review-status="include" data-review-url="${escapeHtml(store.url)}">Incluir</button><button class="review-action discard ${decisions.eli === 'discard' ? 'active' : ''}" data-reviewer="eli" data-review-status="discard" data-review-url="${escapeHtml(store.url)}">Descartar</button></div></div><div class="reviewer-decision"><span>Diego</span><div><button class="review-action include ${decisions.diego === 'include' ? 'active' : ''}" data-reviewer="diego" data-review-status="include" data-review-url="${escapeHtml(store.url)}">Incluir</button><button class="review-action discard ${decisions.diego === 'discard' ? 'active' : ''}" data-reviewer="diego" data-review-status="discard" data-review-url="${escapeHtml(store.url)}">Descartar</button></div></div></div></article>`;
  }).join('') : '<p class="review-empty">No hay referencias con este filtro.</p>';
}

reviewFilters.addEventListener('click', event => {
  const button = event.target.closest('[data-review-filter]');
  if (!button) return;
  reviewFilter = button.dataset.reviewFilter;
  renderReview();
});
reviewSearch.addEventListener('input', renderReview);
reviewList.addEventListener('click', event => {
  const button = event.target.closest('[data-review-status]');
  if (!button) return;
  const { reviewer, reviewStatus: status, reviewUrl: url } = button.dataset;
  const decisions = reviewDecisions[url] || {};
  decisions[reviewer] = decisions[reviewer] === status ? undefined : status;
  if (!decisions[reviewer]) delete decisions[reviewer];
  reviewDecisions[url] = decisions;
  if (!Object.keys(decisions).length) delete reviewDecisions[url];
  localStorage.setItem('vitrea-review-decisions', JSON.stringify(reviewDecisions));
  renderReview();
});
filters.addEventListener('click', event => { const button = event.target.closest('[data-category]'); if (!button) return; selectedCategory = button.dataset.category; render(); });
search.addEventListener('input', render);
document.querySelector('#year').textContent = new Date().getFullYear();
loadStores();
renderReview();
