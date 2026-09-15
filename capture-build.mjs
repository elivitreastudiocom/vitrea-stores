// Production image generation: isolated, anonymous browser contexts, public editorial URLs only.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import chromium from '@sparticuz/chromium';
import {chromium as playwright} from 'playwright-core';
import sharp from 'sharp';
const output='dist';
await fs.mkdir(`${output}/captures`,{recursive:true});
for(const file of await fs.readdir('.')){
 if(/\.(css|js|png|jpg|jpeg|webp|svg|ico|otf|ttf)$/.test(file)||['index.html','version.json'].includes(file)) await fs.copyFile(file,path.join(output,file));
}
const source=await fs.readFile('catalog-data.js','utf8');
const catalog=JSON.parse(source.slice(source.indexOf('=')+1).trim().replace(/;$/,''));
let old={};
try{
 const response=await fetch('https://vitrea-stores.vercel.app/captures.js',{signal:AbortSignal.timeout(10000)});
 if(response.ok){const text=await response.text();old=JSON.parse(text.slice(text.indexOf('=')+1).trim().replace(/;$/,''));}
}catch{}
const jobs=[];
// Templates first, then the curated reference library. Blog is a feature, not a page-view tab.
for(const [home,record] of Object.entries(catalog).sort((a,b)=>Number(!!b[1].template)-Number(!!a[1].template))){
 for(const url of new Set([home,...Object.entries(record.pages).filter(([type])=>type!=='blog').map(([,url])=>url)])){
  if(!/^https:\/\//.test(url))throw new Error('Only HTTPS editorial URLs may be captured');
  for(const mode of ['mobile','desktop'])jobs.push({url,mode});
 }
}
const manifest={};
const executablePath=await chromium.executablePath();
async function capture({url,mode}){
 const captureVersion=mode==='desktop'&&new URL(url).hostname==='tayanecklace.com'?'taya-reveal-v12':mode==='mobile'?'gallery-mobile2x-v12':'gallery-hq-v11';
 const digest=crypto.createHash('sha256').update(`${url}:${mode}:${captureVersion}`).digest('hex').slice(0,20);
 const imagePath=`captures/${digest}.jpg`;
 const previous=old[url]?.[mode];
 if(previous===imagePath){
  try{
   const response=await fetch(`https://vitrea-stores.vercel.app/${previous}`,{signal:AbortSignal.timeout(10000)});
   if(response.ok&&response.headers.get('content-type')?.startsWith('image/')){
    await fs.writeFile(`${output}/${imagePath}`,Buffer.from(await response.arrayBuffer()));
    (manifest[url]||={})[mode]=imagePath;return;
   }
  }catch{}
 }
 const browser=await playwright.launch({args:chromium.args.filter(arg=>!['--single-process','--disable-web-security','--disable-site-isolation-trials','--allow-running-insecure-content'].includes(arg)),executablePath,headless:true});
 const mobile=mode==='mobile';
 const width=mobile?390:1440;
 const context=await browser.newContext({viewport:{width,height:mobile?844:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1,locale:'en-GB',colorScheme:'light',serviceWorkers:'block'});
 try{
  const page=await context.newPage();
  const response=await page.goto(url,{waitUntil:'commit',timeout:45000});
  if(response&&response.status()>=400)throw new Error(`HTTP ${response.status()}`);
  await page.waitForLoadState('domcontentloaded',{timeout:15000}).catch(()=>{});
  await page.waitForLoadState('networkidle',{timeout:5000}).catch(()=>{});
  if(new URL(url).hostname==='tadaimacph.com'){
   const close=page.locator('button.klaviyo-close-form');
   await close.waitFor({state:'visible',timeout:7000}).catch(()=>{});
   if(await close.isVisible())await close.click();
  }
  await page.locator('video').evaluateAll(videos=>Promise.all(videos.filter(v=>v.getBoundingClientRect().top<innerHeight).map(v=>new Promise(resolve=>{
   if(v.readyState>=2){resolve();return;}
   v.addEventListener('loadeddata',resolve,{once:true});setTimeout(resolve,8000);
  }))));
  const title=await page.title();
  if(/access denied|just a moment|checking your browser|robot check|attention required|page not found/i.test(title))throw new Error('Capture blocked');
  await page.locator('body').waitFor({state:'visible',timeout:5000});
  await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,2000))]));
  // Dismiss only marketing/consent UI in this disposable screenshot session.
  // Keep access checks, age gates and the actual page content intact.
  await page.waitForTimeout(1200);
  // Trigger in-view reveals in the region that will be photographed, then return to the top.
  if(!mobile){
   for(const y of [750,1500]){await page.evaluate(y=>window.scrollTo(0,y),y);await page.waitForTimeout(400);}
   await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(400);
  }
  // Decode the images in the photographed area, including lazy-loaded catalog rows.
  await page.evaluate(async()=>{
   const limit=Math.round(innerWidth*1.5);
   const images=[...document.images].filter(img=>{const r=img.getBoundingClientRect();return r.top<limit&&r.bottom>0;});
   images.forEach(img=>{img.loading='eager';img.decoding='sync';});
   await Promise.race([Promise.all(images.map(img=>img.decode().catch(()=>{}))),new Promise(resolve=>setTimeout(resolve,8000))]);
  });
  // Persistent selectors also cover display:contents hosts and late popup insertion.
  await page.addStyleTag({content:` #global-popup-global-popup, .nl-popup, #onetrust-consent-sdk, #onetrust-banner-sdk, pandectes-cmp, .needsclick[role="dialog"], newsletter-popup, .shopify-section--popup, #pandectes-banner, #pandectes-container, [data-capture-overlay] {display:none!important;visibility:hidden!important} newsletter-popup::backdrop{display:none!important}`});
  await page.evaluate(()=>{
   const cleanOverlays=()=>{
   const providers=['pandectes-cmp','.needsclick[role="dialog"]','newsletter-popup','.shopify-section--popup','#pandectes-banner','#pandectes-container','.klaviyo-form-overlay','#usercentrics-root','#usercentrics-cmp-ui',
    '[data-testid="POPUP"]','#onetrust-banner-sdk','#onetrust-consent-sdk',
    '#CybotCookiebotDialog','#CybotCookiebotDialogBodyUnderlay','.cky-consent-container',
    '.cky-overlay','.shopify-pc__banner','.shopify-pc__prefs__dialog',
    '#shopify-pc__prefs__dialog','#shopify-pc__banner','#shopify-privacy-banner',
    '#CookiebotWidget','.iubenda-cs-container','#iubenda-cs-banner',
    '#didomi-host','#consent-root','.needsclick.kl-private-reset-css-Xuajs1[role="dialog"]'];
   const promotion=/cookie|consent|newsletter|subscribe|sign up|signup|first order|first purchase|discount|off your|join our|join the|exclusive offer|stay in touch|stay updated|privacy preferences|country|region|currency|language|which boutique|receive.*full.size|free gift|skin quiz|right location|shipping destination/i;
   const restricted=/verify your age|age verification|access denied|captcha|sign in to continue/i;
   const hide=el=>{if(el.style.getPropertyValue('display')==='none')return;el.setAttribute('data-capture-overlay','');el.style.setProperty('display','none','important');};
   document.querySelectorAll(providers.join(',')).forEach(hide);
   // Consent managers such as Axeptio render inside a shadow root.
   for(const host of document.querySelectorAll('body *')){
    if(host.shadowRoot&&/axeptio|cookie consent|your cookie settings/i.test(host.shadowRoot.textContent||''))hide(host);
   }
   if(location.hostname.endsWith('driesvannoten.com')){
    document.querySelectorAll('[class*="backdrop-blur"]').forEach(el=>{
     if(!(el.innerText||'').trim()&&getComputedStyle(el).position==='fixed')hide(el);
    });
   }
   // Identify large fixed overlays by their purpose, not just their position.
   for(const el of document.querySelectorAll('[role="dialog"],dialog,[aria-modal="true"],body *')){
    const rect=el.getBoundingClientRect();
    if(/^(HEADER|NAV|MAIN)$/.test(el.tagName))continue;
    const style=getComputedStyle(el);
    const modal=el.matches('[role="dialog"],dialog[open],[aria-modal="true"]');
    if(!modal&&!(style.position==='fixed'&&rect.height>100&&rect.width>200))continue;
    const text=(el.innerText||'').trim();
    if(text.length>5000||restricted.test(text))continue;
    if(promotion.test(text)){
     hide(el);
     const parent=el.parentElement;
     if(parent&&parent!==document.body){
      const ps=getComputedStyle(parent);
      if(ps.position==='fixed'&&(parent.innerText||'').trim().length<5000&&!restricted.test(parent.innerText||''))hide(parent);
     }
    }
   }
   // Remove empty backdrops associated with dismissed marketing dialogs.
   document.querySelectorAll('.modal-backdrop,.popup-overlay,.newsletter-overlay,.klaviyo-form-overlay').forEach(el=>{
    if(!(el.innerText||'').trim())hide(el);
   });
   };
   cleanOverlays();
   // No perpetual style observer: animated storefronts otherwise keep invalidating rendering.
   document.documentElement.style.setProperty('overflow','auto','important');
   document.body.style.setProperty('overflow','auto','important');
   window.scrollTo(0,0);
  });
  const height=await page.evaluate(()=>Math.max(document.body.scrollHeight,document.documentElement.scrollHeight));
  // Capture the rendered surface directly without resizing the layout viewport.
  const session=await context.newCDPSession(page);
  const shot=await Promise.race([
   session.send('Page.captureScreenshot',{format:'jpeg',quality:95,fromSurface:true,captureBeyondViewport:true,clip:{x:0,y:0,width,height:Math.min(height,Math.round(width*1.5)),scale:mobile?2:1}}),
   new Promise((_,reject)=>setTimeout(()=>reject(new Error('Screenshot timed out')),45000))
  ]).catch(async()=>({data:(await page.screenshot({type:'jpeg',quality:95,fullPage:false,animations:'disabled',timeout:15000})).toString('base64')}));
  const bytes=Buffer.from(shot.data,'base64');
  await session.detach();
  await sharp(bytes).resize({width:mobile?780:1200,withoutEnlargement:true}).jpeg({quality:92,chromaSubsampling:'4:4:4'}).toFile(`${output}/${imagePath}`);
  (manifest[url]||={})[mode]=imagePath;
  console.log(`Captured ${mode} ${url}`);
 }catch(error){console.warn(`Unavailable ${mode} ${url}: ${error.message}`);}
 finally{await browser.close().catch(()=>{});}
}
const pending=[...jobs].sort((a,b)=>Number(b.url==='https://fume-studio.com/collections/all')-Number(a.url==='https://fume-studio.com/collections/all'));
await Promise.all(Array.from({length:2},async()=>{while(pending.length)await capture(pending.shift());}));
await fs.writeFile(`${output}/captures.js`,`window.galleryCaptures = ${JSON.stringify(manifest)};\n`);
const successful=Object.values(manifest).reduce((n,modes)=>n+Object.keys(modes).length,0);
console.log(`Gallery built: ${successful}/${jobs.length} captures. Unavailable previews have an explicit fallback.`);
if(!Object.values(manifest).some(record=>record.mobile))throw new Error('No mobile captures were generated; retaining previous deployment.');
