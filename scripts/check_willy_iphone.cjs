/* Interacciones táctiles, legibilidad y navegación en tamaños de iPhone. */
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const server=spawn('python3',['-m','http.server','8782','--bind','127.0.0.1','--directory','site'],{stdio:'ignore'});
let testContext='Preparar servidor y navegador';
(async()=>{let browser;try{
 for(let i=0;i<40;i++){try{if((await fetch('http://127.0.0.1:8782/futbol/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await (process.env.PW_ENGINE==='webkit'?webkit:chromium).launch();
 for(const [width,height] of [[320,568],[375,667],[390,844],[393,852],[430,932],[844,390]]){
  const stage=name=>{testContext=`${process.env.PW_ENGINE||'chromium'} ${width}×${height}: ${name}`;};
  stage('Cargar página');
  const ctx=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:8782/futbol/',{waitUntil:'networkidle'});
  stage('Viewport y desbordamiento inicial');
  const viewport=await p.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth}));
  if(viewport.scrollWidth>viewport.innerWidth+1){
   const overflow=await p.evaluate(()=>[...document.querySelectorAll('header,main,footer,section,nav,main>section>div,header>div,header a,header button')].map(e=>({tag:e.tagName,classes:e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right})).filter(e=>e.left<0||e.right>innerWidth+1).slice(0,12));
   assert.fail(`desborde ${width}: ${JSON.stringify(viewport)}; elementos: ${JSON.stringify(overflow)}`);
  }
  assert((await p.locator('meta[name="viewport"]').getAttribute('content')).includes('viewport-fit=cover'),`viewport-fit=cover ausente en ${width}×${height}`);
  const dash=p.locator('#dashboard');
  stage('Menú táctil');
  if(width<1024){await p.getByRole('button',{name:'Abrir menú',exact:true}).tap();assert(await p.getByRole('navigation',{name:'Principal móvil'}).isVisible(),`menú móvil no visible en ${width}×${height}`);
   await p.getByRole('navigation',{name:'Principal móvil'}).getByRole('button',{name:'Partidos',exact:true}).tap();assert.equal(await p.locator('#menu-movil').count(),0,`menú móvil no se cerró en ${width}×${height}`);}
  stage('Tabla y columnas visibles');
  await p.getByRole('tab',{name:'Clasificación',exact:true}).tap();
  const table=await dash.locator('table').evaluate(e=>({scrollWidth:e.parentElement.scrollWidth,clientWidth:e.parentElement.clientWidth}));
  assert(table.scrollWidth<=table.clientWidth+1,`tabla sin scroll horizontal ${width}: ${JSON.stringify(table)}`);
  const pts=await dash.locator('tbody tr').first().locator('td').nth(2).boundingBox();assert(pts&&pts.x>=0&&pts.x+pts.width<=width,`columnas visibles ${width}: ${JSON.stringify(pts)}`);
  stage('Tamaño de controles táctiles y fuente');
  for(const [sel,name] of [['#dashboard tbody tr button[aria-pressed]','favorito'],['#dashboard label:has(input)','filtro']]){const box=await p.locator(sel).first().boundingBox();assert(box&&box.height>=43,`altura táctil ${name} ${width}: ${JSON.stringify(box)}`);}
  const fontSize=await dash.locator('input').evaluate(e=>parseFloat(getComputedStyle(e).fontSize));
  assert(fontSize>=16,`evita zoom al enfocar en iOS ${width}: font-size=${fontSize}px`);
  stage('Favoritos');
  await dash.locator('tbody tr button[aria-pressed]').first().tap();assert.match(await p.getByRole('button',{name:/Mis equipos/}).getAttribute('aria-label'),/1/,`contador de favoritos en ${width}×${height}`);
  stage('Detalle del equipo');
  await dash.locator('tbody tr td button').first().tap();await p.locator('dialog').waitFor({state:'visible'});await p.getByRole('button',{name:'Cerrar',exact:true}).tap();
  stage('Cambiar a Premier League');
  await p.locator('#explorar').getByRole('button',{name:'Europa',exact:true}).tap();await p.locator('#explorar').getByRole('button',{name:/Premier League/}).tap();assert.equal(await dash.locator('h2').innerText(),'Premier League',`competición activa en ${width}×${height}`);
  stage('Estadísticas avanzadas');
  await p.getByRole('tab',{name:'Estadísticas avanzadas',exact:true}).tap();assert(await dash.locator('svg[role="img"]').first().isVisible(),`gráfico de rendimiento ausente en ${width}×${height}`);
  const analysis=await p.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth}));
  assert(analysis.scrollWidth<=analysis.innerWidth+1,`desborde en análisis ${width}: ${JSON.stringify(analysis)}`);
  assert.deepEqual(errors,[],`errores de página en ${width}×${height}`);
  console.log(`OK iPhone ${width}×${height}: sin desbordes, controles táctiles, menú, filtros, detalle y rendimiento.`);
  await ctx.close();
 }
}finally{if(browser)await browser.close();server.kill();}})().catch(e=>{
 console.error(e);
 const message=`${testContext}: ${e?.message||String(e)}`;
 const escaped=message.replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A');
 console.error(`::error title=Prueba iPhone::${escaped}`);
 if(process.env.GITHUB_STEP_SUMMARY){
  const stack=String(e?.stack||e).split(/\r?\n/).map(line=>'    '+line).join('\n');
  try{fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,`\n## Prueba iPhone: error\n\nContexto: ${testContext}\n\n${stack}\n`);}
  catch(summaryError){console.error('No se pudo escribir GITHUB_STEP_SUMMARY:',summaryError.message);}
 }
 process.exitCode=1;
});
