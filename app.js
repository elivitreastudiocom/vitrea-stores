const supabaseClient = window.supabase?.createClient(
  'https://vgykdlkiymsxlcxutalq.supabase.co',
  'sb_publishable_SIBEtvHlapd7OmM1YgKM2g_syRWTteh'
);
let stores = [
 {name:'Taya',url:'https://tayanecklace.com/',category:'E-commerce',industry:'Joyería'},
 {name:'Tadaima',url:'https://tadaimacph.com/',category:'E-commerce',industry:'Diseño y hogar'},
 {name:'Nossara',url:'https://nossara.com/',category:'E-commerce',industry:'Textil y hogar'}
];
let directoryMode = 'desktop';
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
 const selected = (reviewDecisions[store.url] || {})[person] || 'pending';
 const connected = typeof sharedState !== 'undefined' && sharedState.ready;
 const editable = connected && !sharedState.busy.has(store.url + '|' + person);
 const name = person === 'eli' ? 'Eli' : 'Diego';
 return `<div class="review-choice"><span>${name}</span><div class="status-options" role="group" aria-label="${name}: ${escapeHtml(store.name)}">${[['pending','Por revisar'],['discard','No incluida'],['include','Incluida']].map(([value,label]) => `<button type="button" ${editable ? '' : 'disabled'} aria-pressed="${selected === value}" data-reviewer="${person}" data-review-status="${value}" data-review-url="${escapeHtml(store.url)}">${label}</button>`).join('')}</div></div>`;
}
let reviewDecisions = {};

function categories() { return ['Todas', 'E-commerce', 'Agency', 'Portfolio', 'Sports', 'Exploration']; }
function escapeHtml(value = '') { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }
const previewSizer = new ResizeObserver(entries => entries.forEach(({target}) => { const frame=target.querySelector('iframe'); if(!frame)return; const width=directoryMode==='mobile'?390:1440; const scale=target.clientWidth/width; frame.style.width=width+'px';frame.style.height=(target.clientHeight/scale)+'px';frame.style.transform=`scale(${scale})`; }));
function render() {
  previewSizer.disconnect();
  document.querySelector('#directory-mobile-note').hidden=directoryMode!=='mobile';
  const term = search.value.trim().toLowerCase();
  const visible = stores.filter(store => (selectedCategory === 'Todas' || store.category === selectedCategory) && `${store.name} ${store.country} ${store.category} ${store.description}`.toLowerCase().includes(term));
  count.textContent = `${visible.length} webs`;
  filters.innerHTML = categories().map(category => `<button class="filter ${category === selectedCategory ? 'active' : ''}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join('');
  grid.classList.toggle('directory-mobile', directoryMode === 'mobile');
  grid.innerHTML = visible.length ? visible.map(store => `<article class="store-card"><a href="${escapeHtml(store.url)}" aria-label="Ver ${escapeHtml(store.name)}"><div class="shot">${directoryMode === 'mobile' ? `<iframe src="${escapeHtml(store.url)}" title="Vista móvil de ${escapeHtml(store.name)}" loading="eager" sandbox="allow-scripts allow-same-origin" tabindex="-1"></iframe>` : `<img src="https://image.thum.io/get/width/600/crop/900/noanimate/${escapeHtml(store.url)}" alt="${escapeHtml(store.name)}" loading="lazy" />`}</div></a><div class="card-info"><div><h3>${escapeHtml(store.name)}</h3><p>${escapeHtml(store.category)}</p></div><a href="${escapeHtml(store.url)}" target="_blank" rel="noopener" aria-hidden="true">↗</a></div></article>`).join('') : '<p class="empty">No hay webs con este filtro.</p>';
  grid.querySelectorAll('.shot').forEach(shot=>previewSizer.observe(shot));
}
function loadStores() { render(); }

function reviewLabel(status) {
  return { include: 'Incluida', discard: 'No incluida' }[status] || 'Por revisar';
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
    return (reviewCategory === 'Todas' || broadCategory(store) === reviewCategory) && (reviewFilter === 'Todas' || status === ({'Incluidas':'include','No incluidas':'discard','Por revisar':'pending'}[reviewFilter])) && `${store.name} ${store.url}`.toLowerCase().includes(term);
  });
  const pending = reviewStores.filter(store => combinedStatus(store.url) === 'pending').length;
  reviewCount.textContent = `${pending} por revisar · ${reviewStores.length} referencias`;
  reviewFilters.innerHTML = ['Todas', 'Por revisar', 'No incluidas', 'Incluidas'].map(filter => `<button class="filter ${filter === reviewFilter ? 'active' : ''}" data-review-filter="${filter}">${filter}</button>`).join('');
  document.querySelector('#review-categories').innerHTML = generalCategories.map(category => `<button type="button" class="filter ${category === reviewCategory ? 'active' : ''}" data-general-category="${category}">${category}</button>`).join('');
  reviewList.classList.toggle('mobile-gallery', galleryMode === 'mobile');
  reviewList.innerHTML = visible.length ? visible.map((store, index) => {
    const decisions = reviewDecisions[store.url] || {};
    const status = combinedStatus(store.url);
    const preview = `https://image.thum.io/get/width/600/crop/900/noanimate/${store.url}`;
    return `<article class="review-card ${status}"><a class="review-preview" href="${escapeHtml(store.url)}" target="_blank" rel="noopener" aria-label="Abrir ${escapeHtml(store.name)}"><img src="${escapeHtml(preview)}" alt="Vista previa de ${escapeHtml(store.name)}" loading="lazy" /><span>Ver ficha ↗</span></a><div class="review-card-info"><div><a href="${escapeHtml(store.url)}" target="_blank" rel="noopener">${escapeHtml(store.name)}</a><p class="review-url">${escapeHtml(store.url.replace(/^https?:\/\//, ''))}</p></div><div class="inclusion-controls">${inclusionSwitch(store, 'eli')}${inclusionSwitch(store, 'diego')}</div></div></article>`;
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
  sharedState.toggle(url, reviewer, button.dataset.reviewStatus);
});
filters.addEventListener('click', event => { const button = event.target.closest('[data-category]'); if (!button) return; selectedCategory = button.dataset.category; render(); });
search.addEventListener('input', render);
document.querySelector('#year').textContent = new Date().getFullYear();
loadStores();
renderReview();

document.querySelector('#review-categories').addEventListener('click', event => { const button = event.target.closest('[data-general-category]'); if (!button) return; reviewCategory = button.dataset.generalCategory; renderReview(); });
document.querySelectorAll('[data-gallery-mode]').forEach(button => button.addEventListener('click', () => { galleryMode = button.dataset.galleryMode; document.querySelectorAll('[data-gallery-mode]').forEach(item => item.setAttribute('aria-pressed', String(item === button))); document.querySelector('#gallery-note').hidden = galleryMode !== 'mobile'; renderReview(); }));

document.querySelectorAll('[data-directory-mode]').forEach(button => button.addEventListener('click', () => {directoryMode=button.dataset.directoryMode;document.querySelectorAll('[data-directory-mode]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));render();}));
