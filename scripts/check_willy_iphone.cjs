/* Interacciones táctiles, legibilidad y navegación en tamaños de iPhone. */
const {spawn}=require('node:child_process');
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const server=spawn('python3',['-m','http.server','8782','--bind','127.0.0.1','--directory','site'],{stdio:'ignore'});
(async()=>{let browser;try{
 for(let i=0;i<40;i++){try{if((await fetch('http://127.0.0.1:8782/futbol/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await (process.env.PW_ENGINE==='webkit'?webkit:chromium).launch();
 for(const [width,height] of [[320,568],[375,667],[390,844],[393,852],[430,932],[844,390]]){
  const ctx=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:8782/futbol/',{waitUntil:'networkidle'});
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`desborde ${width}`);
  assert((await p.locator('meta[name="viewport"]').getAttribute('content')).includes('viewport-fit=cover'));
  const dash=p.locator('#dashboard');
  await dash.locator('select').last().selectOption('demo');
  if(width<1024){await p.getByRole('button',{name:'Abrir menú',exact:true}).tap();assert(await p.getByRole('navigation',{name:'Principal móvil'}).isVisible());
   await p.getByRole('navigation',{name:'Principal móvil'}).getByRole('button',{name:'Partidos',exact:true}).tap();assert.equal(await p.locator('#menu-movil').count(),0);}
  await dash.getByRole('tab',{name:'Tabla de posiciones'}).tap();
  assert(await dash.locator('table').evaluate(e=>e.parentElement.scrollWidth<=e.parentElement.clientWidth+1),`tabla sin scroll horizontal ${width}`);
  const pts=await dash.locator('tbody tr').first().locator('td').nth(2).boundingBox();assert(pts.x>=0&&pts.x+pts.width<=width,`columnas visibles ${width}`);
  for(const [sel,name] of [['#dashboard tbody tr button[aria-pressed]','favorito'],['#dashboard label:has(input)','filtro']]){const box=await p.locator(sel).first().boundingBox();assert(box.height>=43,`altura táctil ${name} ${width}: ${box.height}`);}
  assert(await dash.locator('input').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=16),'evita zoom al enfocar en iOS');
  await dash.locator('tbody tr button[aria-pressed]').first().tap();assert.match(await p.getByRole('button',{name:/Mis equipos/}).getAttribute('aria-label'),/1/);
  await dash.locator('tbody tr td button').first().tap();await p.locator('dialog').waitFor({state:'visible'});await p.getByRole('button',{name:'Cerrar',exact:true}).tap();
  await p.locator('#explorar').getByRole('button',{name:'Europa',exact:true}).tap();await p.locator('#explorar').getByRole('button',{name:/Premier League/}).tap();assert.equal(await dash.locator('h2').innerText(),'Premier League');
  await dash.getByRole('tab',{name:'Rendimiento'}).tap();assert(await dash.locator('svg[role="img"]').first().isVisible());
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`desborde en análisis ${width}`);
  assert.deepEqual(errors,[]);
  console.log(`OK iPhone ${width}×${height}: sin desbordes, controles táctiles, menú, filtros, detalle y rendimiento.`);
  await ctx.close();
 }
}finally{if(browser)await browser.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
