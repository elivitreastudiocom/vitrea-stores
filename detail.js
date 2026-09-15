// Store details use existing records; unverified design attributes stay explicit.
const detailDialog = document.querySelector('#store-detail');
const knownProperties = {
  'www.lyleandscott.com': { industry: 'Fashion', style: 'Animation · Background video · Cards', typography: 'Sans serif', platform: 'Shopify', product: 'Physical product', source: 'https://land-book.com/websites/98079-lyle-and-scottTM-official-site-premium-british-menswear' }
};
let detailStore;
let detailMode = 'desktop';
let detailPage = 'home';
function selectedPageUrl() { return validWebsite(storePageUrl(detailStore,detailPage)); }
let detailOpener;
let previousOverflow;
function validWebsite(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}
function openStoreDetail(store, opener, initialPage='home', initialMode='desktop') {
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
    ['Category', filterCategory(store)],
    ['Industry', details.industry], ['Style', details.style],
    ['Typography', details.typography], ['Platform', details.platform],
    ['Product', details.product], ['Collection', isReview ? 'Websites' : 'Templates']
  ];
  detailDialog.querySelector('#detail-properties').innerHTML = rows.filter(([,value])=>value).map(([label, value]) => `<div><dt>${label}</dt><dd class="${value ? '' : 'undocumented'}">${escapeHtml(value || 'Not documented')}</dd></div>`).join('');
  const description = detailDialog.querySelector('#detail-description');
  description.textContent = store.description || '';
  description.hidden = !store.description;
  const source = detailDialog.querySelector('#detail-source');
  source.hidden = !details.source;
  source.href = details.source || '#';
  detailDialog.querySelector('#detail-review-status').textContent = '';
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  detailDialog.showModal();
  updateDetailReviewStatus();
  detailDialog.scrollTop = 0;
  detailPage = initialPage;
  detailDialog.querySelector('#detail-page').innerHTML=pageTypes.filter(([type])=>!metadata(store).template||storePageUrl(store,type)).map(([type,label])=>`<option value="${type}">${label}</option>`).join('');
  detailDialog.querySelector('#detail-page').value = initialPage;
  const journal=detailDialog.querySelector('#detail-blog');journal.hidden=!metadata(store).pages?.blog;journal.href=metadata(store).pages?.blog||'#';
  showDetailMode(initialMode);
}
function showDetailMode(mode) {
  detailMode = mode;
  const pageUrl = selectedPageUrl();
  detailDialog.querySelector('#page-link-form').hidden = detailPage === 'home';
  detailDialog.querySelector('#page-link').value = pageUrl || '';
  detailDialog.querySelector('#detail-visit').href = pageUrl || validWebsite(detailStore.url);
  const preview = detailDialog.querySelector('#detail-preview');
  const note = detailDialog.querySelector('#detail-note');
  detailDialog.querySelectorAll('[data-detail-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.detailMode === mode)));
  preview.replaceChildren();
  preview.className = `detail-preview ${mode}`;
  if (!pageUrl) { note.textContent = 'Add this page’s URL to view its desktop or mobile preview.'; return; }
  note.textContent = '';
  const src=screenshotUrl(pageUrl,mode);
  if(!src){note.textContent='Preview unavailable. Visit the website with ↗.';return;}
  const img=document.createElement('img');
  img.alt=`${detailStore.name} · ${pageLabel(detailPage)} · ${mode==='mobile'?'Mobile':'Desktop'}`;
  img.src=src;
  img.onerror=()=>{img.remove();note.textContent='Preview unavailable. Visit the website with ↗.';};
  preview.append(img);
}
for (const container of [grid]) {
  container.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (link.hasAttribute('data-direct-visit')) return;
    // Keep the directory's explicit external arrow as a direct visit.
    if (link.closest('.card-info') && link.getAttribute('aria-hidden') === 'true') return;
    const store = [...stores, ...reviewStores].find(item => validWebsite(item.url) === validWebsite(link.dataset.storeUrl || link.href));
    if (!store) return;
    event.preventDefault();
    openStoreDetail(store, link, link.dataset.page || 'home', container===grid?directoryMode:galleryMode);
  });
}
detailDialog.querySelector('#detail-close').addEventListener('click', () => detailDialog.close());
detailDialog.querySelectorAll('[data-detail-mode]').forEach(button => button.addEventListener('click', () => showDetailMode(button.dataset.detailMode)));
detailDialog.addEventListener('close', () => {
  detailDialog.querySelector('#detail-preview').replaceChildren();
  document.body.style.overflow = previousOverflow || '';
  if (detailOpener?.isConnected) detailOpener.focus({preventScroll:true});
});

detailDialog.querySelector('#detail-page').addEventListener('change', event => { detailPage = event.target.value; showDetailMode(detailMode); });
detailDialog.querySelector('#page-link-form').addEventListener('submit', async event => {
  event.preventDefault();
  const input = detailDialog.querySelector('#page-link');
  const url = validWebsite(input.value);
  if (!url) { input.setCustomValidity('Enter a valid HTTP or HTTPS URL.'); input.reportValidity(); return; }
  input.setCustomValidity('');
  const button = event.currentTarget.querySelector('button'); button.disabled = true;
  const storeUrl = detailStore.url; const type = detailPage;
  try {
    const saved = await sharedState.savePage(storeUrl, type, url);
    if (saved && detailDialog.open && detailStore.url === storeUrl && detailPage === type) showDetailMode(detailMode);
    if (!saved) input.setCustomValidity('Not saved. Check your connection and try again.');
    input.reportValidity();
  } finally { button.disabled = false; }
});
function updateDetailReviewStatus() {detailDialog.querySelector('#detail-review-status').textContent='';}

detailDialog.querySelector('#page-link').addEventListener('input', event => event.target.setCustomValidity(''));
