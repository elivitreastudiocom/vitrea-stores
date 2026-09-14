const supabaseClient = window.supabase?.createClient(
  'https://vgykdlkiymsxlcxutalq.supabase.co',
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
let reviewCategory = 'Todas';
let galleryMode = 'desktop';
const generalCategories = ['Todas', 'Moda y accesorios', 'Hogar y diseño', 'Alimentación y bebidas', 'Belleza y bienestar', 'Otras / Sin clasificar'];
const categoryGroups = {
 'Moda y accesorios': ['Skall','Marfa Stance','Laformela','Rise and Fall','Wedgwood','Partimento','Wwake','KHY','Ferm Living','Leo Lin','Cecilie Bahnsen','Chantelle','Dries Van Noten','Lyle & Scott','Officine Générale','Ysé Paris','Calibre','Gas Bijoux','Arpenteur','Mackintosh','Amina Muaddi'],
 'Hogar y diseño': ['Dimwit','Cocoon','Veark','In Common With','Roll & Hill','QuadroDesign','Snelling Studio','Simon James','Ferm Living','Wedgwood'],
 'Alimentación y bebidas': ['Manta Chocolate','Algae Cooking Club','Etota','Bero','WatchHouse','Orsa','Folk Coffee Club','Pomi Drinks','Maison La Durée','The Salad Project','Esther Rum','Field Trip','Stereoscopecoffee','Cãna'],
 'Belleza y bienestar': ['Susanne Kaufmann','Good Bacteria','Adaptual Health','Abel','Lesse']
};
function broadCategory(store) { return Object.keys(categoryGroups).reverse().find(key => categoryGroups[key].includes(store.name)) || 'Otras / Sin clasificar'; }
function inclusionSwitch(store, person) {
 const included = (reviewDecisions[store.url] || {})[person] === 'include';
 const connected = typeof sharedState !== 'undefined' && sharedState.ready;
 const editable = connected && !sharedState.busy.has(store.url + '|' + person);
 return `<button type="button" class="inclusion-switch" ${editable ? '' : 'disabled'} title="${!connected ? 'Conectando con las selecciones compartidas' : !editable ? 'Guardando selección' : 'Guardar selección compartida'}" role="switch" aria-checked="${included}" aria-label="${person === 'eli' ? 'Eli' : 'Diego'}: incluir ${escapeHtml(store.name)}" data-reviewer="${person}" data-review-status="include" data-review-url="${escapeHtml(store.url)}"><span>${person === 'eli' ? 'Eli' : 'Diego'}</span><span class="switch-track" aria-hidden="true"></span><span class="switch-caption">${!connected ? 'Sin conectar' : included ? 'Incluida' : 'No incluida'}</span></button>`;
}
let reviewDecisions = {};

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
  if (!supabaseClient) { grid.innerHTML = '<p class="empty">No se han podido cargar las tiendas todavía.</p>'; return; }
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
    return (reviewCategory === 'Todas' || broadCategory(store) === reviewCategory) && (reviewFilter === 'Todas' || (reviewFilter === 'Incluidas' ? status === 'include' : status !== 'include')) && `${store.name} ${store.url}`.toLowerCase().includes(term);
  });
  const pending = reviewStores.filter(store => combinedStatus(store.url) === 'pending').length;
  reviewCount.textContent = `${pending} por revisar · ${reviewStores.length} referencias`;
  reviewFilters.innerHTML = ['Todas', 'Incluidas', 'No incluidas'].map(filter => `<button class="filter ${filter === reviewFilter ? 'active' : ''}" data-review-filter="${filter}">${filter}</button>`).join('');
  document.querySelector('#review-categories').innerHTML = generalCategories.map(category => `<button type="button" class="filter ${category === reviewCategory ? 'active' : ''}" data-general-category="${category}">${category}</button>`).join('');
  reviewList.classList.toggle('mobile-gallery', galleryMode === 'mobile');
  reviewList.innerHTML = visible.length ? visible.map((store, index) => {
    const decisions = reviewDecisions[store.url] || {};
    const status = combinedStatus(store.url);
    const preview = `https://image.thum.io/get/width/1200/crop/2800/noanimate/${store.url}`;
    return `<article class="review-card ${status}"><a class="review-preview" href="${escapeHtml(store.url)}" target="_blank" rel="noopener" aria-label="Abrir ${escapeHtml(store.name)}"><img src="${escapeHtml(preview)}" alt="Vista previa de ${escapeHtml(store.name)}" loading="lazy" /><span>Ver ficha ↗</span></a><div class="review-card-info"><div><p class="review-number">${String(index + 1).padStart(2, '0')} · GOODSTORES</p><a href="${escapeHtml(store.url)}" target="_blank" rel="noopener">${escapeHtml(store.name)}</a><p class="review-url">${escapeHtml(store.url.replace(/^https?:\/\//, ''))}</p></div><div class="inclusion-controls">${inclusionSwitch(store, 'eli')}${inclusionSwitch(store, 'diego')}</div></div></article>`;
  }).join('') : '<p class="review-empty">No hay referencias con este filtro.</p>';
  if (galleryMode === 'mobile') {
    reviewList.querySelectorAll('.review-preview').forEach(link => {
      const frame = document.createElement('iframe'); frame.src = link.href; frame.title = link.getAttribute('aria-label'); frame.loading = 'lazy'; frame.setAttribute('sandbox', 'allow-scripts allow-same-origin'); frame.tabIndex = -1; link.querySelector('img').replaceWith(frame);
    });
  }
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
  const { reviewer, reviewUrl: url } = button.dataset;
  sharedState.toggle(url, reviewer);
});
filters.addEventListener('click', event => { const button = event.target.closest('[data-category]'); if (!button) return; selectedCategory = button.dataset.category; render(); });
search.addEventListener('input', render);
document.querySelector('#year').textContent = new Date().getFullYear();
loadStores();
renderReview();

document.querySelector('#review-categories').addEventListener('click', event => { const button = event.target.closest('[data-general-category]'); if (!button) return; reviewCategory = button.dataset.generalCategory; renderReview(); });
document.querySelectorAll('[data-gallery-mode]').forEach(button => button.addEventListener('click', () => { galleryMode = button.dataset.galleryMode; document.querySelectorAll('[data-gallery-mode]').forEach(item => item.setAttribute('aria-pressed', String(item === button))); document.querySelector('#gallery-note').hidden = galleryMode !== 'mobile'; renderReview(); }));
