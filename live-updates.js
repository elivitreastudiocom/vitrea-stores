// Pick up deployed UI changes without interrupting a save or an active form.
(() => {
  if (!/^https?:$/.test(location.protocol) || !window.VITREA_BUILD) return;
  let lastActivity = Date.now();
  let newer = false;
  let checking = false;
  for (const event of ['pointerdown','keydown','input']) document.addEventListener(event, () => {lastActivity=Date.now();}, {passive:true});
  async function checkRelease() {
    if (document.hidden || checking) return;
    checking = true;
    try {
      const response = await fetch('./version.json', {cache:'no-store'});
      if (response.ok) newer = (await response.json()).version !== window.VITREA_BUILD;
      const editing = document.activeElement?.matches('input,textarea,select');
      const saving = typeof sharedState !== 'undefined' && sharedState.busy.size > 0;
      if (newer && !saving && !editing && Date.now()-lastActivity > 15000) location.reload();
    } catch { /* Retry after the network returns. */ }
    finally { checking = false; }
  }
  setInterval(checkRelease,30000);
  document.addEventListener('visibilitychange',checkRelease);
})();
