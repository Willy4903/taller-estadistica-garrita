/* Integración de Willy Stats en su ruta publicada /futbol/. */
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const server=spawn('python3',['-m','http.server','8780','--bind','127.0.0.1','--directory','site'],{stdio:'ignore'});
(async()=>{let browser;try{
 for(let i=0;i<40;i++){try{if((await fetch('http://127.0.0.1:8780/futbol/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch();const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],bad=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.url().includes('127.0.0.1')&&r.status()>=400)bad.push(r.url());});
 await p.goto('http://127.0.0.1:8780/futbol/',{waitUntil:'networkidle'});
 await p.getByRole('heading',{name:'¿Dónde analizamos hoy?'}).waitFor();
 assert.equal(await p.locator('.competition').count(),14);
 const {competitions}=await import('../apps/willy-stats/src/data.js');const manifest=await (await fetch('http://127.0.0.1:8780/futbol/crests/manifest.json')).json();for(const c of competitions){for(const name of c.teams.split('|'))assert(manifest.clubs[c.id+':'+name],`Escudo faltante: ${c.id}:${name}`);}

 await p.waitForFunction(()=>document.querySelector('.club-crest')?.complete&&document.querySelector('.club-crest')?.naturalWidth>0);
 for(const [id,trophy] of [['lib','libertadores'],['sud','sudamericana'],['ucl','champions'],['uel','europa']]){const image=p.locator(`[data-league="${id}"] .trophy-insignia`);assert((await image.getAttribute('src')).includes(trophy));assert(await image.evaluate(i=>i.complete&&i.naturalWidth>0));}

 const peru=await p.locator('tbody tr').first().innerText();assert.match(peru,/Universitario/);assert.match(peru,/80.6%/);assert.match(peru,/\+17/);
 assert.match(await p.locator('.analysis-body').innerText(),/3 puntos de ventaja/);assert.match(await p.locator('.analysis-body').innerText(),/0.58/);
 assert.equal(await p.locator('.projection-grid strong').first().innerText(),'68.4%');
 for(const id of ['eng','esp','per']){await p.locator(`[data-league="${id}"]`).click();const title=await p.locator('.league-identity h3').innerText();assert(title.length>0);const leader=await p.locator('.club-name>span:last-child').first().innerText();assert((await p.locator('.analysis-card h3').innerText()).includes(leader.trim()));}
 const general=await p.locator('tbody tr').first().innerText();await p.getByLabel('Vista de la tabla').selectOption('home');assert.notEqual(await p.locator('tbody tr').first().innerText(),general);await p.getByLabel('Vista de la tabla').selectOption('all');
 await p.locator('.club-search input').fill('Universitario');assert.equal(await p.locator('tbody tr').count(),1);
 await p.locator('.save-team').first().click();assert.match(await p.locator('.favorite-pill').innerText(),/1/);await p.locator('.club-name').first().click();assert(await p.locator('.team-dialog').isVisible());await p.keyboard.press('Escape');await p.locator('.club-search input').fill('');
 await p.getByRole('tab',{name:'Rendimiento Avanzado'}).click();assert(await p.locator('.advanced-panel svg[role="img"]').isVisible());
 await p.getByRole('tab',{name:'Calendario y Resultados'}).click();assert((await p.locator('.fixture').count())>0);await p.locator('.fixture-panel').getByRole('button',{name:'Resultados',exact:true}).click();assert.match(await p.locator('.fixture-time').first().innerText(),/FINAL/);
 await p.getByRole('tab',{name:'Formato',exact:true}).click();assert.match(await p.locator('.format-panel').innerText(),/Apertura/);
 await p.getByRole('button',{name:'Europa',exact:true}).click();assert.equal(await p.locator('.competition').count(),7);assert.equal(await p.locator('.competition [alt="Bandera de Perú"]').count(),0);
 await p.getByRole('button',{name:'América',exact:true}).click();assert.equal(await p.locator('.competition').count(),7);await p.getByRole('button',{name:'Todas',exact:true}).click();
 await p.getByLabel('Competición a comparar 1').selectOption('eng');assert.match(await p.locator('.compare-card').first().innerText(),/Inglaterra/);
 await p.locator('.history-section').getByRole('button',{name:'Champions',exact:true}).click();assert.match(await p.locator('.history-grid').innerText(),/Real Madrid/);
 await p.getByLabel('Temporada y fuente').selectOption('published');await p.getByRole('tab',{name:'Tabla de posiciones'}).click();assert.equal(await p.locator('tbody tr').count(),0);assert.match(await p.locator('.empty-state').innerText(),/publicada/);await p.getByLabel('Temporada y fuente').selectOption('demo');
 await p.reload({waitUntil:'networkidle'});assert.match(await p.locator('.favorite-pill').innerText(),/1/);
 for(const width of [390,768,1440]){await p.setViewportSize({width,height:1000});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Desborde ${width}`);}
 await p.locator('[data-league="per"]').click();await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:'/tmp/willy-stats-desktop.png',fullPage:true});
 await p.setViewportSize({width:390,height:844});await p.screenshot({path:'/tmp/willy-stats-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 console.log('OK: React en /futbol/, ligas dinámicas, métricas, General/Local/Visitante, búsqueda, favoritos persistentes, detalle, gráfico, calendario/resultados, formatos, continentes, comparador, historia, fuente vacía, responsive y recursos sin errores.');
}finally{if(browser)await browser.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
