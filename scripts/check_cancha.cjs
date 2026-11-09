/* Pruebas funcionales de Cancha. El servidor es exclusivo de esta prueba. */
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const server=spawn('python3',['-m','http.server','8777','--bind','127.0.0.1','--directory','site/futbol'],{stdio:'ignore'});
(async()=>{
 let browser;
 try{
  for(let i=0;i<50;i++){try{if((await fetch('http://127.0.0.1:8777/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8777/',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.competition').count(),13);
  const ids=await page.locator('.competition').evaluateAll(bs=>bs.map(b=>b.dataset.league));
  for(const id of ids){
   await page.locator(`[data-league="${id}"]`).click();
   assert.match(await page.locator('#data-note').innerText(),/FICTICIOS|ficticios/);
   const count=await page.locator('#standings tr').count();assert(count>=4,id+' tabla vacía');
   const rows=await page.locator('#standings tr').evaluateAll(rs=>rs.map(r=>[...r.cells].slice(2,8).map(c=>Number(c.textContent))));
   for(const [pj,g,e,p,dg,pts] of rows){assert.equal(pj,g+e+p);assert.equal(pts,3*g+e);}
  }
  await page.locator('[data-league="sud"]').click();assert.equal(await page.locator('#stage-filter option').count(),8);
  const first=await page.locator('.team-button').first().innerText();await page.locator('#stage-filter').selectOption('1');assert.notEqual(await page.locator('.team-button').first().innerText(),first);
  await page.locator('[data-league="per"]').click();
  await page.locator('.star').first().click();assert.equal(await page.locator('#saved-count').innerText(),'1');
  await page.locator('#zone-filter').selectOption('favorite');assert.equal(await page.locator('#standings tr').count(),1);
  await page.locator('.team-button').first().click();await page.locator('#team-dialog').waitFor({state:'visible'});assert.equal(await page.locator('.detail-stats div').count(),6);await page.keyboard.press('Escape');
  await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#saved-count').innerText(),'1');
  await page.locator('#team-search').fill('equipo inexistente');assert.equal(await page.locator('#standings tr').count(),0);assert(await page.locator('#table-empty').isVisible());await page.locator('#team-search').fill('');
  await page.locator('#tab-fixtures').click();assert((await page.locator('.fixture').count())>0);
  await page.locator('#tab-guide').click();assert.match(await page.locator('#guide-view').innerText(),/Perú/);
  await page.locator('#data-mode').selectOption('verified');await page.locator('#tab-table').click();assert.equal(await page.locator('#standings tr').count(),0);assert.match(await page.locator('#table-empty').innerText(),/publicadas/);
  await page.locator('#data-mode').selectOption('demo');
  await page.locator('[data-history="europa"]').click();assert.match(await page.locator('#history-content').innerText(),/Real Madrid/);
  await page.locator('[data-history="paises"]').click();assert.equal(await page.locator('.country-grid article').count(),6);
  await page.locator('#about-data').click();assert(await page.locator('#data-dialog').isVisible());await page.keyboard.press('Escape');
  for(const width of [390,768,1440]){
   await page.setViewportSize({width,height:960});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+' desborde horizontal');
  }
  await page.screenshot({path:'/tmp/cancha-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/cancha-mobile.png',fullPage:true});
  // Instantánea de prueba aislada: verifica el contrato de datos sin simular acceso real a ESPN.
  const row={name:'Club de prueba',rank:1,pj:3,g:2,e:1,p:0,gf:5,gc:2,dg:3,pts:6,form:[],zone:'none'};
  await page.route('**/data/snapshot.json',route=>route.fulfill({json:{schema_version:1,competitions:{per:{season:'Prueba aislada',updated_at:'2026-11-09T12:00:00Z',source:'https://www.espn.com/',groups:[{name:'Grupo A',rows:[row]},{name:'Grupo B',rows:[{...row,name:'Segundo grupo'}]}],fixtures:[]}}}}));
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#data-mode').selectOption('verified');
  assert.match(await page.locator('#data-note').innerText(),/Prueba aislada/);
  assert.equal(await page.locator('.points').innerText(),'6');
  await page.locator('#stage-filter').selectOption('1');
  assert.match(await page.locator('.team-button').innerText(),/Segundo grupo/);
  await page.unroute('**/data/snapshot.json');
  assert.deepEqual(errors,[]);
  console.log('OK: 13 competiciones; coherencia de tablas ficticias; grupos Sudamericana; favoritos persistentes; filtros; detalles; calendario; reglas; fuente vacía; historia; móvil/tableta/escritorio.');
 }finally{if(browser)await browser.close();server.kill('SIGTERM');}
})().catch(e=>{console.error(e);process.exitCode=1;});
