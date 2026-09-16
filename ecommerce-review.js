// Public editorial decisions are separate from Eli/Diego's historical selections.
(()=>{
 const client=supabaseClient,list=document.querySelector('#ecommerce-review-list'),message=document.querySelector('#ecommerce-review-message');
 const labels={pending:'Pendiente',approved:'Aprobada',rejected:'Rechazada'};
 const rows=new Map(),busy=new Set();
 let ready=false,loading=false,filter='pending';
 const normalize=value=>{const u=new URL(value);u.hash='';u.hostname=u.hostname.replace(/^www\./,'');u.pathname=u.pathname.replace(/\/+$/,'')||'/';return u.href;};
 const items=[...new Map((window.ecommerceReviewData||[]).map(item=>[normalize(item.url),item])).values()];
 function status(text,error=false){message.textContent=text;message.hidden=!text;message.classList.toggle('sync-error',error);}
 function apply(row){const old=rows.get(row.store_url);if(old&&old.revision>=row.revision)return false;rows.set(row.store_url,row);return true;}
 function render(){
  const shown=items.filter(item=>filter==='all'||(rows.get(normalize(item.url))?.status||'pending')===filter);
  document.querySelector('#ecommerce-review-count').textContent=ready?`${shown.length} de ${items.length} webs`:'';
  if(!ready){list.innerHTML='<p>Cargando decisiones compartidas…</p>';return;}
  list.innerHTML=shown.length?shown.map(item=>{
   const key=normalize(item.url),decision=rows.get(key)?.status||'pending',saving=busy.has(key),capture=window.ecommerceCaptures?.[key];
   return `<article class="ecommerce-review-card"><div class="ecommerce-long-shot" tabindex="0" aria-label="Captura de escritorio de ${escapeHtml(item.name)}; desplázate para ver la home completa">${capture?`<img src="${escapeHtml(capture)}" alt="Home completa de ${escapeHtml(item.name)} en escritorio" loading="lazy" decoding="async">`:'<span>Captura no disponible</span>'}</div><div class="ecommerce-card-meta"><h3>${escapeHtml(item.name)}</h3><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Visitar web</a></div><p class="ecommerce-tags">${[...new Set([...(item.tags||[]),...(item.categories||[])])].map(escapeHtml).join(' · ')}</p><div class="ecommerce-decision"><span>${saving?'Guardando…':labels[decision]}</span><div role="group" aria-label="Decisión sobre ${escapeHtml(item.name)}">${[['approved','Aprobar'],['rejected','Rechazar'],['pending','Pendiente']].map(([value,label])=>`<button type="button" data-ecommerce-url="${escapeHtml(key)}" data-status="${value}" aria-pressed="${decision===value}" ${saving?'disabled':''}>${label}</button>`).join('')}</div></div></article>`;
  }).join(''):'<p>No hay webs en este estado.</p>';
  list.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{img.parentElement.textContent='Captura no disponible';},{once:true}));
 }
 async function refresh(){
  if(loading||!client)return;loading=true;
  try{const {data,error}=await client.from('vitrea_ecommerce_reviews').select('store_url,status,revision');if(error)throw error;let changed=!ready;data.forEach(row=>{changed=apply(row)||changed;});ready=true;if(changed)render();}
  catch{status('No se pueden cargar las decisiones compartidas. Reintentando…',true);}
  finally{loading=false;}
 }
 document.querySelector('#ecommerce-status-filter').addEventListener('change',event=>{filter=event.target.value;render();});
 list.addEventListener('click',async event=>{
  const button=event.target.closest('[data-ecommerce-url]');if(!button||!ready)return;
  const url=button.dataset.ecommerceUrl,decision=button.dataset.status;if(busy.has(url)||!labels[decision])return;
  busy.add(url);sharedState.busy.add('ecommerce|'+url);render();status('');
  try{const {data,error}=await client.from('vitrea_ecommerce_reviews').upsert({store_url:url,status:decision},{onConflict:'store_url'}).select('store_url,status,revision').single();if(error)throw error;apply(data);status('Decisión guardada y compartida.');}
  catch{status('No se ha guardado la decisión. Vuelve a intentarlo.',true);}
  finally{busy.delete(url);sharedState.busy.delete('ecommerce|'+url);render();}
 });
 if(client){client.channel('vitrea-ecommerce-review').on('postgres_changes',{event:'*',schema:'public',table:'vitrea_ecommerce_reviews'},payload=>{if(payload.new?.store_url&&apply(payload.new))render();}).subscribe(state=>{if(state==='SUBSCRIBED')refresh();});refresh();setInterval(()=>{if(!document.hidden)refresh();},10000);window.addEventListener('online',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});}
 else status('No se ha podido conectar con las decisiones compartidas.',true);
 render();
})();
