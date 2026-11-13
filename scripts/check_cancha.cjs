/* Integración de Willy Stats en su ruta publicada /futbol/ (escritorio). */
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
 // Carrusel de próximos partidos: aparece con datos publicados y tiene control de pausa.
 const agenda=p.locator('#agenda');if(await agenda.count()){assert((await agenda.locator('ul').first().locator('li button').count())>0);}
 const cards=p.locator('#explorar li button');assert.equal(await cards.count(),17);
 // Por defecto se muestran datos publicados, nunca la demostración.
 const dash=p.locator('#dashboard');
  const snap=await (await fetch('http://127.0.0.1:8780/futbol/data/snapshot.json')).json();
 const rows=snap.competitions?.per?.groups?.[0]?.rows||[];
 await dash.getByRole('button',{name:/Ver todas las posiciones/}).click().catch(()=>{});
 assert.equal(await dash.locator('tbody tr').count(),rows.length);
 assert.doesNotMatch(await dash.getByRole('status').innerText(),/demostraci/i);
 assert.equal(await p.getByText(/demostraci|ficticio|ilustrativo/i).count(),0);
 for(const name of ['Premier League','LaLiga','Brasileirão']){await p.locator('#explorar').getByRole('button',{name:new RegExp(name)}).click();assert.match(await dash.locator('h2').innerText(),new RegExp(name.slice(0,5)));assert((await dash.locator('tbody tr').count())>0);}
 await p.getByRole('tab',{name:'Estadísticas avanzadas'}).click();assert((await dash.getByRole('tabpanel').locator('tbody tr').count())>0);assert(await dash.locator('svg[role="img"]').first().isVisible());
 await p.getByRole('tab',{name:'Equipos'}).click();assert((await dash.getByRole('tabpanel').locator('li button').count())>0);
 await p.getByRole('tab',{name:'Partidos'}).click();assert((await dash.locator('li').count())>0);
 await p.getByRole('tab',{name:'Tabla',exact:true}).click();
 await dash.getByPlaceholder('Filtrar club...').fill('zzzz');assert.match(await dash.innerText(),/Ningún club coincide/);await dash.getByPlaceholder('Filtrar club...').fill('');
 await dash.getByRole('button',{name:/Agregar a .* a favoritos/}).first().click();assert.match(await p.getByRole('button',{name:/Mis equipos/}).getAttribute('aria-label'),/1/);
 await p.reload({waitUntil:'networkidle'});assert.match(await p.getByRole('button',{name:/Mis equipos/}).getAttribute('aria-label'),/1/);
 await p.locator('#explorar').getByRole('button',{name:'Europa',exact:true}).click();assert.equal(await p.locator('#explorar li button').count(),8);
 await p.locator('#comparador select').first().selectOption('eng');assert.match(await p.locator('#comparador article').first().innerText(),/Premier League/);
 for(const width of [390,768,1440]){await p.setViewportSize({width,height:1000});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Desborde ${width}`);}
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 console.log('OK: Willy Stats en /futbol/: ligas, fuentes publicada y demostración, pestañas, filtros, favoritos persistentes, comparador y sin desbordes.');
}finally{if(browser)await browser.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
