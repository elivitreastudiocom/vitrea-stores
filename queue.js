// Shared inbox. Processing into the gallery is a separate editorial action.
(() => {
  const sections = ['templates','websites','queue'];
  function showSection() {
    if(location.hash==='#stores')history.replaceState(null,'','#templates');
    if(location.hash==='#development')history.replaceState(null,'','#websites');
    const selected = sections.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'templates';
    sections.forEach(id => {document.getElementById(id).hidden = id !== selected;});
    document.querySelectorAll('.site-header nav a').forEach(link => {
      if (link.hash === '#' + selected) link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });
  }
  window.addEventListener('hashchange',showSection);showSection();
  const form=document.querySelector('#queue-form');
  const input=document.querySelector('#queue-url');
  const button=form.querySelector('button');
  const list=document.querySelector('#queue-list');
  const message=document.querySelector('#queue-message');
  let saving=false, loading=false, ready=false;
  let rows=[];
  function status(text,error=false){message.textContent=text;message.classList.toggle('sync-error',error);}
  function normalize(value) {
    const text=value.trim();
    const url=new URL(/^[a-z][a-z\d+.-]*:/i.test(text)?text:'https://'+text);
    if(!['http:','https:'].includes(url.protocol)||url.username||url.password||!url.hostname.includes('.')) throw new Error('url');
    url.hash='';
    for(const key of [...url.searchParams.keys()]) if(key.startsWith('utm_')||['srsltid','fbclid','gclid'].includes(key))url.searchParams.delete(key);
    if(url.href.length>2048)throw new Error('url');
    return url.href;
  }
  function render(){
    document.querySelector('#queue-count').textContent=ready?`${rows.length} pendientes`:'';
    list.replaceChildren();
    if(!rows.length){const empty=document.createElement('p');empty.className='queue-empty';empty.textContent=ready?'No hay webs en cola.':'';list.append(empty);return;}
    for(const row of rows){
      const item=document.createElement('article');item.className='queue-row';
      const info=document.createElement('div');const link=document.createElement('a');link.href=row.url;link.target='_blank';link.rel='noopener';link.textContent=new URL(row.url).hostname.replace(/^www\./,'')+' ↗';
      const path=document.createElement('p');path.textContent=row.url;info.append(link,path);
      const date=document.createElement('time');date.dateTime=row.created_at;date.textContent=new Date(row.created_at).toLocaleDateString('es-ES',{day:'numeric',month:'short'});item.append(info,date);list.append(item);
    }
  }
  async function refresh(){
    if(loading||!supabaseClient)return;
    loading=true;
    try{
      const {data,error}=await supabaseClient.from('vitrea_queue').select('url,created_at,status').eq('status','pending').order('created_at',{ascending:false});
      if(error)throw error;
      rows=data;ready=true;render();
      if(!saving&&!input.value.trim())status('Sincronizado');
    }catch{status('No se ha podido cargar la cola. Reintentando…',true);}
    finally{loading=false;}
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(saving)return;
    let url;
    try{url=normalize(input.value);}catch{status('Introduce un enlace web válido.',true);input.focus();return;}
    if(stores.some(store=>normalize(store.url)===url)){status('Esta web ya está en el Directorio.');return;}
    if(approvedWebsites().some(store=>normalize(store.url)===url)){status('Esta web ya está en Websites.');return;}
    saving=true;button.disabled=true;sharedState.busy.add('queue');status('Guardando…');
    try{
      const {error}=await supabaseClient.from('vitrea_queue').insert({url});
      if(error){if(error.code==='23505'){status('Esta web ya se ha añadido.');return;}throw error;}
      if(input.value.trim() && normalize(input.value)===url)input.value='';
      await refresh();status('Añadida a la cola.');
    }catch{status('No se ha guardado. Comprueba la conexión e inténtalo de nuevo.',true);}
    finally{saving=false;button.disabled=false;sharedState.busy.delete('queue');}
  });
  if(!supabaseClient){status('No se ha podido conectar.',true);return;}
  supabaseClient.channel('vitrea-queue').on('postgres_changes',{event:'*',schema:'public',table:'vitrea_queue'},refresh).subscribe(state=>{if(state==='SUBSCRIBED')refresh();});
  refresh();setInterval(()=>{if(!document.hidden)refresh();},10000);
  window.addEventListener('online',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
