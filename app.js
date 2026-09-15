const supabaseClient = window.supabase?.createClient(
  'https://vgykdlkiymsxlcxutalq.supabase.co',
  'sb_publishable_SIBEtvHlapd7OmM1YgKM2g_syRWTteh'
);
let stores = [
 {name:'Taya',url:'https://tayanecklace.com/',category:'E-commerce',industry:'Joyería'},
 {name:'Tadaima',url:'https://tadaimacph.com/',category:'E-commerce',industry:'Diseño y hogar'}
];

let directoryMode='desktop', galleryMode='desktop';
let pageLinks={}, reviewDecisions={};
const grid=document.querySelector('#store-grid'), reviewList=document.querySelector('#review-list');
const reviewStores=window.goodstores||[];
const pageTypes=[['home','Home'],['about','About'],['catalog','Catalog'],['product','Product']];
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
function screenshotUrl(url,mode){return captureIndex[new URL(url).href]?.[mode]||null;}
function approvedWebsites(){return reviewStores.filter(store=>reviewDecisions[store.url]?.diego==='include');}
function galleryEntries(collection,state){return collection.flatMap(store=>{
 const url=storePageUrl(store,state.page);
 return url&&(!state.category||storeTags(store).includes(state.category))&&`${store.name} ${store.category||''} ${store.description||''} ${store.url}`.toLowerCase().includes(state.term)?[{store,url,type:state.page}]:[];
});}
function cardMarkup({store,url,type},mode){
 const capture=screenshotUrl(url,mode);
 const src=capture||(mode==='desktop'?((type==='home'&&store.image)||'https://image.thum.io/get/width/600/crop/900/noanimate/'+url):null);
 const preview=src?`<img src="${escapeHtml(src)}" alt="${escapeHtml(store.name)} · ${pageLabel(type)} · ${mode==='mobile'?'Mobile':'Desktop'}" loading="lazy" />`:'<span class="capture-unavailable">Vista móvil no disponible</span>';
 return `<article class="store-card"><a href="${escapeHtml(url)}" data-store-url="${escapeHtml(store.url)}" data-page="${type}" aria-label="Ver ${escapeHtml(store.name)} · ${pageLabel(type)}"><div class="shot ${src?'':'no-capture'}">${preview}</div></a><div class="card-info"><div><h3>${escapeHtml(store.name)}</h3><p>${filterCategory(store)} · ${pageLabel(type)}</p></div><a class="card-visit" title="Visitar web" href="${escapeHtml(url)}" target="_blank" rel="noopener" data-direct-visit aria-label="Visitar ${escapeHtml(store.name)} · ${pageLabel(type)}">↗</a></div></article>`;
}
function renderGallery(collection,state,target,categoryId,pageId,countId){
 document.getElementById(categoryId).innerHTML=categories(collection).map(category=>`<button class="filter ${category===state.category?'active':''}" aria-pressed="${category===state.category}" data-category="${category}">${category}</button>`).join('');
 document.getElementById(pageId).innerHTML=pageTypes.map(([type,label])=>`<button type="button" data-page-type="${type}" aria-pressed="${type===state.page}">${label}</button>`).join('');
 const entries=galleryEntries(collection,state);
 document.getElementById(countId).textContent=`${entries.length} ${state.page==='home'?(state===directoryState?(entries.length===1?'plantilla':'plantillas'):(entries.length===1?'web':'webs')):(entries.length===1?'página':'páginas')}`;
 target.innerHTML=entries.length?entries.map(entry=>cardMarkup(entry,state.mode)).join(''):`<p class="empty">${state.page==='home'?'No hay webs con estos filtros.':'No hay páginas '+pageLabel(state.page)+' guardadas con estos filtros.'}</p>`;
 target.classList.toggle('directory-mobile',state.mode==='mobile');
 target.querySelectorAll('.shot img').forEach(img=>img.addEventListener('error',()=>{const shot=img.parentElement;shot.classList.add('no-capture');shot.innerHTML='<span class="capture-unavailable">Captura no disponible</span>';},{once:true}));
}
function render(){renderGallery(stores,directoryState,grid,'filters','page-filters','store-count');document.querySelector('#directory-mobile-note').hidden=true;}
function renderReview(){
 renderGallery(approvedWebsites(),websitesState,reviewList,'websites-filters','websites-page-filters','review-count');
 if(typeof sharedState==='undefined'||!sharedState.ready){reviewList.innerHTML='<p class="empty">Cargando webs…</p>';document.querySelector('#review-count').textContent='';}
 document.querySelector('#websites-mobile-note').hidden=true;
}
function wireGallery(state,categoryId,pageId,searchId,modeAttr,redraw){
 document.getElementById(categoryId).addEventListener('click',event=>{const button=event.target.closest('[data-category]');if(!button)return;state.category=state.category===button.dataset.category?null:button.dataset.category;redraw();});
 document.getElementById(pageId).addEventListener('click',event=>{const button=event.target.closest('[data-page-type]');if(!button)return;state.page=button.dataset.pageType;redraw();document.getElementById(pageId).querySelector(`[data-page-type="${state.page}"]`).focus({preventScroll:true});});
 document.getElementById(searchId).addEventListener('input',event=>{state.term=event.target.value.trim().toLowerCase();redraw();});
 document.querySelectorAll(`[${modeAttr}]`).forEach(button=>button.addEventListener('click',()=>{state.mode=button.getAttribute(modeAttr);if(state===directoryState)directoryMode=state.mode;else galleryMode=state.mode;document.querySelectorAll(`[${modeAttr}]`).forEach(item=>item.setAttribute('aria-pressed',String(item===button)));redraw();}));
}
wireGallery(directoryState,'filters','page-filters','search','data-directory-mode',render);
wireGallery(websitesState,'websites-filters','websites-page-filters','review-search','data-gallery-mode',renderReview);
document.querySelector('#year').textContent=new Date().getFullYear();render();renderReview();
