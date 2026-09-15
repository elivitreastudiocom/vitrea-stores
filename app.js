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
const websitesState={page:'home',mode:'desktop',term:''};
function escapeHtml(value=''){const div=document.createElement('div');div.textContent=value;return div.innerHTML.replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function pageLabel(type){return pageTypes.find(item=>item[0]===type)?.[1]||type;}
function metadata(store){return window.catalogData?.[store.url]||{};}
function storePageUrl(store,type){const value=type==='home'?store.url:pageLinks[store.url]?.[type]||metadata(store).pages?.[type];try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)?url.href:null;}catch{return null;}}
const captureIndex=Object.fromEntries(Object.entries(window.galleryCaptures||{}).map(([url,record])=>[new URL(url).href,record]));
function screenshotUrl(url,mode){const key=new URL(url).href;return captureIndex[key]?.[mode]||(key==='https://tadaimacph.com/'&&mode==='desktop'?'tadaima-desktop.jpg':null);}
function approvedWebsites(){return [...new Map([...stores,...reviewStores.filter(store=>reviewDecisions[store.url]?.diego==='include')].map(store=>[new URL(store.url).href,store])).values()];}
function galleryEntries(collection,state){return collection.flatMap(store=>{
 if(!`${store.name} ${store.url}`.toLowerCase().includes(state.term))return [];
 const url=storePageUrl(store,state.page);return url?[{store,url,type:state.page}]:[];
});}
function cardMarkup({store,url,type},mode){
 const src=screenshotUrl(url,mode);
 const preview=src?`<img src="${escapeHtml(src)}" alt="${escapeHtml(store.name)} · ${pageLabel(type)} · ${mode==='mobile'?'Mobile':'Desktop'}" loading="lazy" decoding="async" />`:'<span class="capture-unavailable">Preview unavailable</span>';
 return `<article class="store-card"><a class="website-link" href="${escapeHtml(url)}" target="_blank" rel="noopener" data-direct-visit aria-label="Visit ${escapeHtml(store.name)} · ${pageLabel(type)}"><div class="shot ${src?'':'no-capture'}">${preview}</div><div class="card-info"><div><h3>${escapeHtml(store.name)}</h3><p>${pageLabel(type)}</p></div><span class="external-arrow" aria-hidden="true">↗</span></div></a></article>`;
}
function renderReview(){
 document.querySelector('#websites-page-filters').innerHTML=pageTypes.map(([type,label])=>`<button type="button" data-page-type="${type}" aria-pressed="${type===websitesState.page}">${label}</button>`).join('');
 const entries=galleryEntries(approvedWebsites(),websitesState);
 const count=new Set(entries.map(entry=>new URL(entry.store.url).href)).size;
 document.querySelector('#review-count').textContent=`${count} ${count===1?'website':'websites'}`;
 reviewList.innerHTML=entries.length?entries.map(entry=>cardMarkup(entry,websitesState.mode)).join(''):'<p class="empty">No matching pages.</p>';
 reviewList.classList.toggle('directory-mobile',websitesState.mode==='mobile');
 reviewList.querySelectorAll('.shot img').forEach(img=>img.addEventListener('error',()=>{const shot=img.parentElement;shot.classList.add('no-capture');shot.innerHTML='<span class="capture-unavailable">Preview unavailable</span>';},{once:true}));
 if(typeof sharedState==='undefined'||!sharedState.ready){reviewList.innerHTML='<p class="empty">Loading websites…</p>';document.querySelector('#review-count').textContent='';}
}
function render(){renderReview();}
document.querySelector('#websites-page-filters').addEventListener('click',event=>{const button=event.target.closest('[data-page-type]');if(!button)return;websitesState.page=button.dataset.pageType;renderReview();document.querySelector(`[data-page-type="${websitesState.page}"]`).focus({preventScroll:true});});
document.querySelector('#review-search').addEventListener('input',event=>{websitesState.term=event.target.value.trim().toLowerCase();renderReview();});
document.querySelectorAll('[data-gallery-mode]').forEach(button=>button.addEventListener('click',()=>{galleryMode=websitesState.mode=button.dataset.galleryMode;document.querySelectorAll('[data-gallery-mode]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));renderReview();}));
document.querySelector('#year').textContent=new Date().getFullYear();renderReview();
