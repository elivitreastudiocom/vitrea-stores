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
 if(/\.(css|js|png|jpg|jpeg|webp|svg|ico)$/.test(file)||['index.html','version.json'].includes(file)) await fs.copyFile(file,path.join(output,file));
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
async function capture({url,mode}){
 const digest=crypto.createHash('sha256').update(`${url}:${mode}:v1`).digest('hex').slice(0,20);
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
 const browser=await playwright.launch({args:chromium.args.filter(arg=>!['--single-process','--disable-web-security','--disable-site-isolation-trials','--allow-running-insecure-content'].includes(arg)),executablePath:await chromium.executablePath(),headless:true});
 const mobile=mode==='mobile';
 const width=mobile?390:1440;
 const context=await browser.newContext({viewport:{width,height:mobile?844:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1,locale:'en-GB',colorScheme:'light',serviceWorkers:'block'});
 try{
  const page=await context.newPage();
  await page.route('**/*',route=>['media'].includes(route.request().resourceType())?route.abort():route.continue());
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});
  if(response&&response.status()>=400)throw new Error(`HTTP ${response.status()}`);
  await page.waitForLoadState('networkidle',{timeout:5000}).catch(()=>{});
  const title=await page.title();
  if(/access denied|just a moment|checking your browser|robot check|attention required|page not found/i.test(title))throw new Error('Capture blocked');
  await page.locator('body').waitFor({state:'visible',timeout:5000});
  await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,2000))]));
  const height=await page.evaluate(()=>Math.max(document.body.scrollHeight,document.documentElement.scrollHeight));
  const bytes=await page.screenshot({fullPage:true,clip:{x:0,y:0,width,height:Math.min(height,Math.round(width*1.5))},type:'jpeg',quality:85,timeout:15000});
  await sharp(bytes).resize({width:mobile?390:600,withoutEnlargement:true}).jpeg({quality:82}).toFile(`${output}/${imagePath}`);
  (manifest[url]||={})[mode]=imagePath;
  console.log(`Captured ${mode} ${url}`);
 }catch(error){console.warn(`Unavailable ${mode} ${url}: ${error.message}`);}
 finally{await browser.close().catch(()=>{});}
}
const pending=[...jobs];
await Promise.all(Array.from({length:3},async()=>{while(pending.length)await capture(pending.shift());}));
await fs.writeFile(`${output}/captures.js`,`window.galleryCaptures = ${JSON.stringify(manifest)};\n`);
const successful=Object.values(manifest).reduce((n,modes)=>n+Object.keys(modes).length,0);
console.log(`Gallery built: ${successful}/${jobs.length} captures. Unavailable previews have an explicit fallback.`);
if(!Object.values(manifest).some(record=>record.mobile))throw new Error('No mobile captures were generated; retaining previous deployment.');
