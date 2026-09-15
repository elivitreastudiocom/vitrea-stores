// Public shared workspace, as requested. A confirmed cloud write is authoritative.
const sharedState = (() => {
  const client = supabaseClient;
  const state = {ready:false,busy:new Set(),refresh:null};
  const reviewVersions = new Map();
  const pageVersions = new Map();
  const message = document.querySelector('#sync-message');
  const importButton = document.querySelector('#sync-import');
  function readLocal(key) { try {return JSON.parse(localStorage.getItem(key) || '{}');} catch {return {};} }
  const legacy = readLocal('vitrea-review-decisions');
  function status(text,error=false) {message.textContent=text;message.classList.toggle('sync-error',error);}
  function redraw() {
    const focused = document.activeElement?.dataset;
    const restore = focused?.reviewUrl ? {url:focused.reviewUrl,reviewer:focused.reviewer,selection:focused.reviewStatus} : null;
    renderReview();
    if (restore) [...reviewList.querySelectorAll('[data-review-url]')].find(el=>el.dataset.reviewUrl===restore.url && el.dataset.reviewer===restore.reviewer && el.dataset.reviewStatus===restore.selection)?.focus({preventScroll:true});
    if (typeof updateDetailReviewStatus==='function') updateDetailReviewStatus();
  }
  function applyReview(row) {
    const key=row.store_url+'|'+row.reviewer;
    if ((reviewVersions.get(key)||0)>=row.revision) return false;
    reviewVersions.set(key,row.revision);
    reviewDecisions[row.store_url]={...reviewDecisions[row.store_url],[row.reviewer]:row.included===null?'pending':row.included?'include':'discard'};
    return true;
  }
  function applyPage(row) {
    const key=row.store_url+'|'+row.page_type;
    if ((pageVersions.get(key)||0)>=row.revision) return false;
    pageVersions.set(key,row.revision);
    pageLinks[row.store_url]={...pageLinks[row.store_url],[row.page_type]:row.page_url};
    return true;
  }
  async function snapshot() {
    const results=await Promise.all([
      client.from('vitrea_reviews').select('store_url,reviewer,included,revision'),
      client.from('vitrea_page_links').select('store_url,page_type,page_url,revision')
    ]);
    if (results.some(result=>result.error)) throw new Error('read');
    let changed=!state.ready;
    results[0].data.forEach(row=>{changed=applyReview(row)||changed;});
    let pagesChanged=false;results[1].data.forEach(row=>{pagesChanged=applyPage(row)||pagesChanged;});
    if(pagesChanged)render();
    state.ready=true;
    if(changed) redraw();
  }
  async function toggle(url,reviewer,selection) {
    if(!state.ready || !['pending','discard','include'].includes(selection) || !['eli','diego'].includes(reviewer)) return;
    const key=url+'|'+reviewer;
    if(state.busy.has(key)) return;
    const included=selection==='pending'?null:selection==='include';
    state.busy.add(key);redraw();status('Guardando selección…');
    try {
      const {data,error}=await client.from('vitrea_reviews').upsert({store_url:url,reviewer,included},{onConflict:'store_url,reviewer'}).select('store_url,reviewer,included,revision').single();
      if(error) throw error;
      applyReview(data);status('Guardado');
    } catch {status('No se ha confirmado el guardado. Comprueba la conexión y vuelve a intentarlo.',true);}
    finally {state.busy.delete(key);redraw();}
  }
  async function savePage(url,type,pageUrl) {
    if(!state.ready) {status('Sin conexión: el enlace no se ha guardado.',true);return false;}
    const key='page|'+url+'|'+type;
    state.busy.add(key);
    try {
      const {data,error}=await client.from('vitrea_page_links').upsert({store_url:url,page_type:type,page_url:pageUrl},{onConflict:'store_url,page_type'}).select('store_url,page_type,page_url,revision').single();
      if(error) throw error;
      applyPage(data);render();status('Enlace guardado · visible para todos.');return true;
    } catch {status('No se ha podido guardar el enlace.',true);return false;}
    finally {state.busy.delete(key);}
  }
  importButton.hidden=!Object.values(legacy).some(choices=>choices.eli||choices.diego);
  importButton.addEventListener('click',async()=>{
    if(!state.ready) return;
    importButton.disabled=true;state.busy.add('import');
    const rows=Object.entries(legacy).flatMap(([url,choices])=>['eli','diego'].filter(reviewer=>/^https?:\/\//.test(url)&&choices[reviewer]).map(reviewer=>({store_url:url,reviewer,included:choices[reviewer]==='include'})));
    try {
      const {error}=await client.from('vitrea_reviews').upsert(rows,{onConflict:'store_url,reviewer',ignoreDuplicates:true});
      if(error) throw error;
      await snapshot();importButton.hidden=true;status('Selecciones locales incorporadas sin sustituir las ya compartidas.');
    } catch {status('No se han podido importar las selecciones. Puedes volver a intentarlo.',true);}
    finally {importButton.disabled=false;state.busy.delete('import');}
  });
  async function refresh() {
    if(document.hidden || state.refresh || !client) return;
    state.refresh=snapshot().then(()=>{if(!state.busy.size)status('Sincronizado');}).catch(()=>status('Sin conexión. Los datos visibles pueden estar desactualizados.',true)).finally(()=>{state.refresh=null;});
    await state.refresh;
  }
  async function connect() {
    if(!client){status('No se ha podido conectar. Recarga la página.',true);return;}
    try {await snapshot();status('Sincronizado');}
    catch {status('No se han podido cargar las selecciones. Reintentando…',true);}
    client.channel('vitrea-public-workspace')
      .on('postgres_changes',{event:'*',schema:'public',table:'vitrea_reviews'},payload=>{
        if(payload.new?.store_url && applyReview(payload.new))redraw();
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'vitrea_page_links'},payload=>{
        if(!payload.new?.store_url || !applyPage(payload.new))return;
        render();
        const editing=document.activeElement?.id==='page-link';
        if(!editing && detailDialog.open && detailStore?.url===payload.new.store_url && detailPage===payload.new.page_type)showDetailMode(detailMode);
      }).subscribe(async channelStatus=>{
        if(channelStatus==='SUBSCRIBED'){
          try {await snapshot();if(!state.busy.size)status('Sincronizado');}
          catch {status('No se han podido actualizar las selecciones.',true);}
        } else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(channelStatus))status('Reconectando · los cambios se comprobarán automáticamente.',true);
      });
  }
  setTimeout(connect,0);
  setInterval(refresh,10000);document.addEventListener('visibilitychange',refresh);window.addEventListener('online',refresh);
  return {get ready(){return state.ready;},busy:state.busy,toggle,savePage};
})();
