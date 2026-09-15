const supabaseClient = window.supabase?.createClient(
  'https://vgykdlkiymsxlcxutalq.supabase.co',
  'sb_publishable_SIBEtvHlapd7OmM1YgKM2g_syRWTteh'
);
let stores = [
 {name:'Taya',url:'https://tayanecklace.com/',category:'E-commerce',industry:'Jewelry'},
 {name:'Tadaima',url:'https://tadaimacph.com/',category:'E-commerce',industry:'Home & design'}
];

let directoryMode='desktop', galleryMode='desktop';
let pageLinks={}, reviewDecisions={};
const grid=document.querySelector('#store-grid'), reviewList=document.querySelector('#review-list');
const reviewStores=window.goodstores||[];
const pageTypes=[['home','Home'],['about','About'],['catalog','Catalog'],['product','Product']];
const pageFilterTypes=[['all','All'],...pageTypes];
const directoryState={category:null,page:'home',mode:'desktop',term:''};
const websitesState={category:null,page:'home',mode:'desktop',term:''};
function escapeHtml(value=''){const div=document.createElement('div');div.textContent=value;return div.innerHTML.replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function pageLabel(type){return pageTypes.find(item=>item[0]===type)?.[1]||type;}
function metadata(store){return window.catalogData?.[store.url]||{};}
function categories(collection){return ['Ecommerce','Portfolio','Blog','Others'].filter(tag=>collection.some(store=>storeTags(store).includes(tag)));}
function storeTags(store){return metadata(store).tags||['Others'];}
function filterCategory(store){return storeTags(store).join(' · ');}
function storePageUrl(store,type){const value=type==='home'?store.url:pageLinks[store.url]?.[type]||metadata(store).pages?.[type];try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)?url.href:null;}catch{return null;}}
const captureIndex=Object.fromEntries(Object.entries(window.galleryCaptures||{}).map(([url,record])=>[new URL(url).href,record]));
function screenshotUrl(url,mode){const key=new URL(url).href;return captureIndex[key]?.[mode]||(key==='https://tadaimacph.com/'&&mode==='desktop'?'tadaima-desktop.jpg':null);}
function approvedWebsites(){return reviewStores.filter(store=>reviewDecisions[store.url]?.diego==='include');}
function galleryEntries(collection,state){return collection.flatMap(store=>{
 if((state.category&&!storeTags(store).includes(state.category))||!`${store.name} ${store.category||''} ${store.description||''} ${store.url}`.toLowerCase().includes(state.term))return [];
 const types=state.page==='all'?pageTypes.map(([type])=>type):[state.page];
 return types.flatMap(type=>{const url=storePageUrl(store,type);return url?[{store,url,type}]:[];});
});}
function cardMarkup({store,url,type},mode,direct=false){
 const capture=screenshotUrl(url,mode);
 const src=capture;
 const preview=src?`<img src="${escapeHtml(src)}" alt="${escapeHtml(store.name)} · ${pageLabel(type)} · ${mode==='mobile'?'Mobile':'Desktop'}" loading="lazy" />`:'<span class="capture-unavailable">Preview unavailable</span>';
 if(direct) return `<article class="store-card"><a class="website-link" href="${escapeHtml(url)}" target="_blank" rel="noopener" data-direct-visit aria-label="Visit ${escapeHtml(store.name)} · ${pageLabel(type)}"><div class="shot ${src?'':'no-capture'}">${preview}</div><div class="card-info"><div><h3>${escapeHtml(store.name)}</h3><p>${filterCategory(store)} · ${pageLabel(type)}</p></div><span class="external-arrow" aria-hidden="true">↗</span></div></a></article>`;
 return `<article class="store-card"><a href="${escapeHtml(url)}" data-store-url="${escapeHtml(store.url)}" data-page="${type}" aria-label="View ${escapeHtml(store.name)} · ${pageLabel(type)}"><div class="shot ${src?'':'no-capture'}">${preview}</div></a><div class="card-info"><div><h3>${escapeHtml(store.name)}</h3><p>${filterCategory(store)} · ${pageLabel(type)}</p></div><a class="card-visit" title="Visit website" href="${escapeHtml(url)}" target="_blank" rel="noopener" data-direct-visit aria-label="Visit ${escapeHtml(store.name)} · ${pageLabel(type)}">↗</a></div></article>`;
}
function renderGallery(collection,state,target,categoryId,pageId,countId){
 document.getElementById(categoryId).innerHTML=['All',...categories(collection)].map(category=>`<button class="filter ${(category==='All'?state.category===null:category===state.category)?'active':''}" aria-pressed="${(category==='All'?state.category===null:category===state.category)}" data-category="${category}">${category}</button>`).join('');
 document.getElementById(pageId).innerHTML=pageFilterTypes.map(([type,label])=>`<button type="button" data-page-type="${type}" aria-pressed="${type===state.page}">${label}</button>`).join('');
 const entries=galleryEntries(collection,state);
 const count=new Set(entries.map(entry=>entry.store.url)).size;
 document.getElementById(countId).textContent=`${count} ${state===directoryState?(count===1?'template':'templates'):(count===1?'website':'websites')}`;
 target.innerHTML=entries.length?entries.map(entry=>cardMarkup(entry,state.mode,state===websitesState)).join(''):'<p class="empty">No matching pages.</p>';
 target.classList.toggle('directory-mobile',state.mode==='mobile');
 target.querySelectorAll('.shot img').forEach(img=>img.addEventListener('error',()=>{const shot=img.parentElement;shot.classList.add('no-capture');shot.innerHTML='<span class="capture-unavailable">Preview unavailable</span>';},{once:true}));
}
function render(){renderGallery(stores,directoryState,grid,'filters','page-filters','store-count');document.querySelector('#directory-mobile-note').hidden=true;}
function renderReview(){
 renderGallery(approvedWebsites(),websitesState,reviewList,'websites-filters','websites-page-filters','review-count');
 if(typeof sharedState==='undefined'||!sharedState.ready){reviewList.innerHTML='<p class="empty">Loading websites…</p>';document.querySelector('#review-count').textContent='';}
 document.querySelector('#websites-mobile-note').hidden=true;
}
function wireGallery(state,categoryId,pageId,searchId,modeAttr,redraw){
 document.getElementById(categoryId).addEventListener('click',event=>{const button=event.target.closest('[data-category]');if(!button)return;state.category=button.dataset.category==='All'?null:button.dataset.category;redraw();});
 document.getElementById(pageId).addEventListener('click',event=>{const button=event.target.closest('[data-page-type]');if(!button)return;state.page=button.dataset.pageType;redraw();document.getElementById(pageId).querySelector(`[data-page-type="${state.page}"]`).focus({preventScroll:true});});
 document.getElementById(searchId).addEventListener('input',event=>{state.term=event.target.value.trim().toLowerCase();redraw();});
 document.querySelectorAll(`[${modeAttr}]`).forEach(button=>button.addEventListener('click',()=>{state.mode=button.getAttribute(modeAttr);if(state===directoryState)directoryMode=state.mode;else galleryMode=state.mode;document.querySelectorAll(`[${modeAttr}]`).forEach(item=>item.setAttribute('aria-pressed',String(item===button)));redraw();}));
}
wireGallery(directoryState,'filters','page-filters','search','data-directory-mode',render);
wireGallery(websitesState,'websites-filters','websites-page-filters','review-search','data-gallery-mode',renderReview);
document.querySelector('#year').textContent=new Date().getFullYear();render();renderReview();
