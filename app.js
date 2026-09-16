const supabaseClient = window.supabase?.createClient(
  'https://vgykdlkiymsxlcxutalq.supabase.co',
  'sb_publishable_SIBEtvHlapd7OmM1YgKM2g_syRWTteh'
);
let stores = [
 {name:'Taya',url:'https://tayanecklace.com/',category:'E-commerce',industry:'Jewelry'},
 {name:'Tadaima',url:'https://tadaimacph.com/',category:'E-commerce',industry:'Home & design'}
];

let galleryMode='desktop';
let pageLinks={}, reviewDecisions={};
const reviewList=document.querySelector('#review-list');
const reviewStores=window.goodstores||[];
const pageTypes=[['home','Home'],['about','About'],['catalog','Catalog'],['product','Product']];
const categories=['Fashion','Wellness','Interior Design','Gourmet','Jewelery','Art & Objects'];
const websitesState={category:null,page:'home',mode:'desktop',term:''};
function escapeHtml(value=''){const div=document.createElement('div');div.textContent=value;return div.innerHTML.replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function pageLabel(type){return pageTypes.find(item=>item[0]===type)?.[1]||type;}
function metadata(store){return window.catalogData?.[store.url]||{};}
function storePageUrl(store,type){const value=type==='home'?store.url:pageLinks[store.url]?.[type]||metadata(store).pages?.[type];try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)?url.href:null;}catch{return null;}}
const captureIndex=Object.fromEntries(Object.entries(window.galleryCaptures||{}).map(([url,record])=>[new URL(url).href,record]));
function screenshotUrl(url,mode){const key=new URL(url).href;return captureIndex[key]?.[mode]||(key==='https://tadaimacph.com/'&&mode==='desktop'?'tadaima-desktop.jpg':null);}
function approvedWebsites(){return [...new Map([...stores,...Object.entries(window.catalogData||{}).filter(([,record])=>record.published).map(([url,record])=>({url,name:record.name})),...reviewStores.filter(store=>reviewDecisions[store.url]?.diego==='include')].filter(store=>!metadata(store).excluded).map(store=>[new URL(store.url).href,store])).values()];}
function galleryEntries(collection,state){return collection.flatMap(store=>{
 if(state.category&&!metadata(store).categories?.includes(state.category))return [];
 if(!`${store.name} ${store.url}`.toLowerCase().includes(state.term))return [];
 const url=storePageUrl(store,state.page);return [{store,url,type:state.page}];
});}
function cardMarkup({store,url,type},mode){
 if(!url){
  return `<article class="store-card unavailable-card"><div class="shot no-page"><span class="page-unavailable">No ${pageLabel(type)} Available</span></div><div class="card-info"><div><h3>${escapeHtml(store.name)}</h3><p>${pageLabel(type)}</p></div></div></article>`;
 }
 const src=screenshotUrl(url,mode);
 const preview=src?`<img src="${escapeHtml(src)}" alt="${escapeHtml(store.name)} · ${pageLabel(type)} · ${mode==='mobile'?'Mobile':'Desktop'}" loading="lazy" decoding="async" />`:'<span class="capture-unavailable">Preview unavailable</span>';
 return `<article class="store-card"><a class="website-link" href="${escapeHtml(url)}" target="_blank" rel="noopener" data-direct-visit aria-label="Visit ${escapeHtml(store.name)} · ${pageLabel(type)}"><div class="shot ${src?'':'no-capture'}">${preview}</div><div class="card-info"><div><h3>${escapeHtml(store.name)}</h3><p>${pageLabel(type)}</p></div></div></a></article>`;
}
function renderReview(){
 document.querySelector('#mobile-filter-summary').textContent=[websitesState.category,pageLabel(websitesState.page),websitesState.mode==='mobile'?'Mobile':'Desktop'].filter(Boolean).join(' · ');
 document.querySelector('#websites-category-filters').innerHTML=categories.map(category=>`<button type="button" data-category="${escapeHtml(category)}" aria-pressed="${category===websitesState.category}">${escapeHtml(category)}</button>`).join('');
 document.querySelector('#websites-page-filters').innerHTML=pageTypes.map(([type,label])=>`<button type="button" data-page-type="${type}" aria-pressed="${type===websitesState.page}">${label}</button>`).join('');
 const entries=galleryEntries(approvedWebsites(),websitesState);
 const count=new Set(entries.map(entry=>new URL(entry.store.url).href)).size;
 document.querySelector('#review-count').textContent=`${count} ${count===1?'website':'websites'}`;
 reviewList.innerHTML=entries.length?entries.map(entry=>cardMarkup(entry,websitesState.mode)).join(''):'<p class="empty">No matching pages.</p>';
 reviewList.classList.toggle('directory-mobile',websitesState.mode==='mobile');
 reviewList.querySelectorAll('.shot img').forEach(img=>img.addEventListener('error',()=>{const shot=img.parentElement;if(shot.classList.contains('no-page')){img.remove();return;}shot.classList.add('no-capture');shot.innerHTML='<span class="capture-unavailable">Preview unavailable</span>';},{once:true}));
 if(typeof sharedState==='undefined'||!sharedState.ready){reviewList.innerHTML='<p class="empty">Loading websites…</p>';document.querySelector('#review-count').textContent='';}
}
function render(){renderReview();}
document.querySelector('#websites-category-filters').addEventListener('click',event=>{const button=event.target.closest('[data-category]');if(!button)return;const category=button.dataset.category;websitesState.category=websitesState.category===category?null:category;renderReview();[...document.querySelectorAll('[data-category]')].find(item=>item.dataset.category===category)?.focus({preventScroll:true});});
document.querySelector('#websites-page-filters').addEventListener('click',event=>{const button=event.target.closest('[data-page-type]');if(!button)return;websitesState.page=button.dataset.pageType;renderReview();document.querySelector(`[data-page-type="${websitesState.page}"]`).focus({preventScroll:true});});
document.querySelector('#review-search').addEventListener('input',event=>{websitesState.term=event.target.value.trim().toLowerCase();renderReview();});
document.querySelectorAll('[data-gallery-mode]').forEach(button=>button.addEventListener('click',()=>{galleryMode=websitesState.mode=button.dataset.galleryMode;document.querySelectorAll('[data-gallery-mode]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));renderReview();}));
document.querySelector('#year').textContent=new Date().getFullYear();renderReview();

// Keep the sticky controls below the real header height, including wrapped mobile navigation.
const galleryHeader=document.querySelector('.site-header');
const updateHeaderHeight=()=>document.documentElement.style.setProperty('--header-height',`${galleryHeader.getBoundingClientRect().height}px`);
new ResizeObserver(updateHeaderHeight).observe(galleryHeader);updateHeaderHeight();

const filterToolbar=document.querySelector('.directory-toolbar');
const filterToggle=document.querySelector('#mobile-filter-toggle');
function setFiltersOpen(open,restoreFocus=false){
 filterToolbar.classList.toggle('filters-open',open);
 filterToggle.setAttribute('aria-expanded',String(open));
 if(restoreFocus)filterToggle.focus({preventScroll:true});
}
filterToggle.addEventListener('click',()=>setFiltersOpen(filterToggle.getAttribute('aria-expanded')!=='true'));
document.querySelector('#mobile-filter-done').addEventListener('click',()=>setFiltersOpen(false,true));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&filterToolbar.classList.contains('filters-open'))setFiltersOpen(false,true);});
document.addEventListener('click',event=>{if(!event.composedPath().includes(filterToolbar))setFiltersOpen(false);});
