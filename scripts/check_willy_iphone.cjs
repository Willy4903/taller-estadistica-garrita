/* Interacciones táctiles, legibilidad y navegación en tamaños de iPhone. */
const {spawn}=require('node:child_process');
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const server=spawn('python3',['-m','http.server','8782','--bind','127.0.0.1','--directory','site'],{stdio:'ignore'});
(async()=>{let browser;try{
 for(let i=0;i<40;i++){try{if((await fetch('http://127.0.0.1:8782/futbol/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await (process.env.PW_ENGINE==='webkit'?webkit:chromium).launch();
 for(const [width,height] of [[320,568],[375,667],[390,844],[393,852],[430,932],[844,390]]){
  const ctx=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:2,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
  const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:8782/futbol/',{waitUntil:'networkidle'});
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`desborde ${width}`);
  assert.equal(await p.getByLabel('Temporada y fuente').inputValue(),'published');await p.getByLabel('Temporada y fuente').selectOption('demo');
  const viewport=await p.locator('meta[name="viewport"]').getAttribute('content');assert(viewport.includes('viewport-fit=cover'));
  await p.getByRole('button',{name:'Abrir navegación',exact:true}).tap();assert(await p.getByRole('navigation').isVisible());
  await p.getByRole('navigation').getByRole('link',{name:'Partidos',exact:true}).tap();await p.locator('.fixture').first().waitFor();assert.equal(await p.getByRole('button',{name:'Abrir navegación',exact:true}).getAttribute('aria-expanded'),'false');
  await p.getByRole('tab',{name:'Tabla de posiciones',exact:true}).tap();
  const fits=await p.locator('.table-scroll').evaluate(e=>e.scrollWidth<=e.clientWidth+1);assert(fits,`tabla compacta ${width}`);
  const points=await p.locator('tbody tr').first().locator('.pts').boundingBox();assert(points.x>=0&&points.x+points.width<=width,`puntos visibles ${width}`);
  for(const selector of ['.menu-button','.save-team','.club-name','.club-search input','.table-control-right select']){const box=await p.locator(selector).first().boundingBox();assert(box.height>=43,`altura táctil ${selector} ${width}`);}
  const font=await p.locator('.club-search input').evaluate(e=>parseFloat(getComputedStyle(e).fontSize));assert(font>=16,'evita zoom al enfocar en iOS');
  await p.getByRole('button',{name:'Todas las estadísticas',exact:true}).tap();assert(await p.locator('.table-scroll').evaluate(e=>e.scrollWidth>e.clientWidth));
  await p.locator('.table-scroll').evaluate(e=>{e.scrollLeft=e.scrollWidth;});assert(await p.locator('.table-scroll').evaluate(e=>e.scrollLeft>0));
  await p.getByRole('button',{name:'Vista resumida',exact:true}).tap();assert(await p.locator('.table-scroll').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  await p.locator('.save-team').first().tap();assert.match(await p.locator('.favorite-pill').getAttribute('aria-label'),/1/);
  await p.locator('.club-name').first().tap();await p.locator('dialog').waitFor({state:'visible'});await p.getByRole('button',{name:'Cerrar detalle',exact:true}).tap();
  await p.getByRole('button',{name:'Europa',exact:true}).tap();await p.locator('[data-league="eng"]').tap();assert.equal(await p.locator('.league-identity h3').innerText(),'Premier League');
  await p.getByRole('tab',{name:'Rendimiento Avanzado',exact:true}).tap();assert(await p.locator('.scatter-scroll').isVisible());
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`desborde en análisis ${width}`);
  assert.deepEqual(errors,[]);
  if(width===390){await p.getByRole('button',{name:'Todas',exact:true}).tap();await p.locator('[data-league="per"]').tap();await p.getByRole('tab',{name:'Tabla de posiciones',exact:true}).tap();await p.locator('#dashboard').scrollIntoViewIfNeeded();await p.screenshot({path:'/tmp/willy-iphone-table.png'});await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:'/tmp/willy-iphone-home.png'});}
  console.log(`OK iPhone ${width}×${height}: tabla sin scroll, controles táctiles, menú, filtros, detalle, estadísticas y gráfico.`);
  await ctx.close();
 }
}finally{if(browser)await browser.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
