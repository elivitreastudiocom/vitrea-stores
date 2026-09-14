// Store details use existing records; unverified design attributes stay explicit.
const detailDialog = document.querySelector('#store-detail');
const knownProperties = {
  'www.lyleandscott.com': { industry: 'Moda', style: 'Animación · Vídeo de fondo · Tarjetas', typography: 'Sans serif', platform: 'Shopify', product: 'Producto físico', source: 'https://land-book.com/websites/98079-lyle-and-scottTM-official-site-premium-british-menswear' }
};
let detailStore;
let detailOpener;
let previousOverflow;
function validWebsite(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}
function openStoreDetail(store, opener) {
  const url = validWebsite(store.url);
  if (!url) return;
  detailStore = store;
  detailOpener = opener;
  const details = {...knownProperties[new URL(url).hostname], ...store};
  const isReview = reviewStores.some(item => item.url === store.url);
  detailDialog.querySelector('#detail-title').textContent = store.name;
  detailDialog.querySelector('#detail-domain').textContent = new URL(url).hostname.replace(/^www\./, '');
  detailDialog.querySelector('#detail-visit').href = url;
  const rows = [
    ['Categoría', details.category || 'E-commerce'],
    ['Sector', details.industry], ['Estilo', details.style],
    ['Tipografía', details.typography], ['Plataforma', details.platform],
    ['Producto', details.product], ['Colección', isReview ? 'Goodstores · En revisión' : 'Directorio Vitrea']
  ];
  detailDialog.querySelector('#detail-properties').innerHTML = rows.map(([label, value]) => `<div><dt>${label}</dt><dd class="${value ? '' : 'undocumented'}">${escapeHtml(value || 'Por documentar')}</dd></div>`).join('');
  const description = detailDialog.querySelector('#detail-description');
  description.textContent = store.description || '';
  description.hidden = !store.description;
  const source = detailDialog.querySelector('#detail-source');
  source.hidden = !details.source;
  source.href = details.source || '#';
  detailDialog.querySelector('#detail-review-status').textContent = isReview ? `Eli: ${reviewLabel((reviewDecisions[store.url] || {}).eli)} · Diego: ${reviewLabel((reviewDecisions[store.url] || {}).diego)}` : '';
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  detailDialog.showModal();
  detailDialog.scrollTop = 0;
  showDetailMode('desktop');
}
function showDetailMode(mode) {
  const preview = detailDialog.querySelector('#detail-preview');
  const note = detailDialog.querySelector('#detail-note');
  detailDialog.querySelectorAll('[data-detail-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.detailMode === mode)));
  preview.replaceChildren();
  preview.className = `detail-preview ${mode}`;
  if (mode === 'desktop') {
    note.textContent = 'Captura de escritorio. Desplázate para explorar la página.';
    const status = document.createElement('p');
    status.className = 'preview-status';
    status.textContent = 'Cargando captura…';
    const img = document.createElement('img');
    img.alt = `Captura de escritorio de ${detailStore.name}`;
    img.onload = () => status.remove();
    img.onerror = () => { img.remove(); status.textContent = 'No se ha podido cargar la captura. Puedes visitar la web con el enlace superior.'; };
    img.src = detailStore.image || `https://image.thum.io/get/width/1200/crop/2800/noanimate/${validWebsite(detailStore.url)}`;
    preview.append(status, img);
  } else {
    note.textContent = 'Vista web a 390 px de ancho. Algunas tiendas bloquean la vista integrada; si queda vacía, usa «Visitar web». No simula un dispositivo físico.';
    const frame = document.createElement('iframe');
    frame.title = `Vista móvil de ${detailStore.name}`;
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    frame.referrerPolicy = 'no-referrer';
    frame.src = validWebsite(detailStore.url);
    preview.append(frame);
  }
}
for (const container of [grid, reviewList]) {
  container.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    // Keep the directory's explicit external arrow as a direct visit.
    if (link.closest('.card-info') && link.getAttribute('aria-hidden') === 'true') return;
    const store = [...stores, ...reviewStores].find(item => validWebsite(item.url) === link.href);
    if (!store) return;
    event.preventDefault();
    openStoreDetail(store, link);
  });
}
detailDialog.querySelector('#detail-close').addEventListener('click', () => detailDialog.close());
detailDialog.querySelectorAll('[data-detail-mode]').forEach(button => button.addEventListener('click', () => showDetailMode(button.dataset.detailMode)));
detailDialog.addEventListener('close', () => {
  detailDialog.querySelector('#detail-preview').replaceChildren();
  document.body.style.overflow = previousOverflow || '';
  if (detailOpener?.isConnected) detailOpener.focus({preventScroll:true});
});
