/* Nations League: grupos, selecciones y navegación táctil.
 * La instantánea interceptada se usa únicamente en esta prueba, nunca se publica.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium,webkit}=require('playwright');

const ROOT=path.resolve(__dirname,'../site');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
const makeTeam=(name,id,rank,g,e,p,gf,gc)=>({name,team_id:id,rank,pj:g+e+p,g,e,p,gf,gc,dg:gf-gc,pts:g*3+e,form:[g?'V':e?'E':'D'],zone:'none'});
const groups=[
 {name:'Liga A · Grupo 1',rows:[makeTeam('España','ESP',1,1,0,0,1,0),makeTeam('Croacia','CRO',2,0,1,0,0,0),makeTeam('Dinamarca','DEN',3,0,1,0,0,0),makeTeam('Portugal','POR',4,0,0,1,0,1)]},
 {name:'Liga B · Grupo 1',rows:[makeTeam('Inglaterra','ENG',1,1,0,0,4,1),makeTeam('Irlanda','IRL',2,1,0,0,2,1),makeTeam('Finlandia','FIN',3,0,0,1,1,2),makeTeam('Grecia','GRE',4,0,0,1,1,4)]}
];
const match=(id,home,away,home_id,away_id,date,hg=null,ag=null)=>({id,home,away,home_id,away_id,date,hg,ag,demo:false,status:hg==null?'STATUS_SCHEDULED':'STATUS_FULL_TIME'});
const snapshot={schema_version:1,competitions:{unl:{
 provider:'Proveedor de prueba offline',season:'2026-27',season_year:2026,historical:false,updated_at:new Date().toISOString(),groups,
 results:[match('r-a1','España','Portugal','ESP','POR','2026-11-10T19:45Z',1,0),match('r-a2','Croacia','Dinamarca','CRO','DEN','2026-11-10T19:45Z',0,0),
          match('r-b1','Inglaterra','Grecia','ENG','GRE','2026-11-10T19:45Z',4,1),match('r-b2','Irlanda','Finlandia','IRL','FIN','2026-11-10T19:45Z',2,1)],
 fixtures:[match('n-a','España','Portugal','ESP','POR','2026-11-15T19:45Z'),match('n-b','Inglaterra','Grecia','ENG','GRE','2026-11-15T19:45Z'),
           match('n-cross','España','Inglaterra','ESP','ENG','2027-03-20T19:45Z')],warnings:[]
}}};

async function main(){
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  let file=path.resolve(ROOT,'.'+decodeURIComponent(pathname));
  if(file!==ROOT&&!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',MIME[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 let browser;
 try{
  const engine=process.env.PW_ENGINE==='webkit'?webkit:chromium;
  const executable=process.env.CHROMIUM_EXECUTABLE_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':null);
  const options=process.env.PW_ENGINE!=='webkit'&&executable?{executablePath:executable}:{};
  browser=await engine.launch(options);
  for(const [width,height] of [[320,568],[390,844],[430,932],[1440,1000]]){
   const ctx=await browser.newContext({viewport:{width,height},isMobile:width<600,hasTouch:width<600,reducedMotion:'reduce'});
   let published=snapshot;
   await ctx.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin!==origin)return route.abort();
    if(url.pathname==='/futbol/data/snapshot.json')return route.fulfill({contentType:'application/json',body:JSON.stringify(published)});
    return route.continue();
   });
   const p=await ctx.newPage(),errors=[],bad=[];
   p.on('pageerror',e=>errors.push(e.message));
   p.on('response',r=>{if(r.url().startsWith(origin)&&r.status()>=400)bad.push(r.url());});
   await p.goto(origin+'/futbol/#liga=unl',{waitUntil:'networkidle'});
   const dash=p.locator('#dashboard'),picker=dash.getByRole('group',{name:'Liga',exact:true});
   const groupCard=name=>dash.getByRole('button',{name,exact:true});
   await dash.getByRole('heading',{name:'UEFA Nations League',exact:true}).waitFor();
   await picker.waitFor();
   assert.equal(await p.locator('#explorar li button').count(),17);
   assert.deepEqual(await picker.getByRole('button').allTextContents(),['Liga A1','Liga B1'],'una pestaña por liga con su número de grupos');
   assert.equal(await groupCard('Liga A · Grupo 1').getAttribute('aria-pressed'),'true');
   assert.match(await dash.getByRole('group',{name:'Cambiar de grupo'}).innerText(),/Liga A · Grupo 1[\s\S]*1 de 2/);
   assert.equal(await dash.locator('tbody tr').count(),4);
   assert.equal(await dash.getByRole('columnheader',{name:'Selección',exact:true}).count(),1);
   assert.equal(await dash.getByPlaceholder('Filtrar selección...').count(),1);
   assert.match(await dash.locator('tbody').innerText(),/España/);
   assert.doesNotMatch(await dash.locator('tbody').innerText(),/Inglaterra/);
   assert.match(await p.locator('section[aria-label="Última fecha en números"]').innerText(),/España/);
   assert.doesNotMatch(await p.locator('section[aria-label="Última fecha en números"]').innerText(),/Inglaterra/);
   if(width<600){
    assert((await groupCard('Liga A · Grupo 1').boundingBox()).height>=43,'tarjeta de grupo con altura táctil de 44 px');
    assert((await picker.getByRole('button').first().boundingBox()).height>=35,'pestaña de liga táctil');
   }
   // Carrusel de próximos partidos: toda la competición y filtro por grupo.
   const agenda=p.locator('#agenda'),firstCopy=agenda.locator('ul').first();
   await agenda.waitFor();
   assert.match(await firstCopy.innerText(),/España/);assert.match(await firstCopy.innerText(),/Inglaterra/);
   await agenda.getByRole('button',{name:/^Liga A · Grupo 1/}).click();
   assert.doesNotMatch(await firstCopy.innerText(),/Grecia/,'el filtro del carrusel deja solo el grupo elegido');
   assert.match(await firstCopy.innerText(),/Inglaterra/,'el cruce eliminatorio sigue en el grupo');
   await agenda.getByRole('button',{name:/^Todos/}).click();
   // Tocar un partido de otro grupo abre ese grupo y resalta a sus selecciones.
   await firstCopy.getByRole('button',{name:/^Inglaterra contra Grecia/}).click();
   assert.equal(await groupCard('Liga B · Grupo 1').getAttribute('aria-pressed'),'true');
   assert.match(new URL(p.url()).hash,/grupo=B1/);
   assert.match(await dash.locator('tbody').innerText(),/Grecia[\s\S]*Próximo|Próximo[\s\S]*Grecia/);
   await groupCard('Liga B · Grupo 1').waitFor();
   await picker.getByRole('button',{name:/Liga A/}).click();await groupCard('Liga A · Grupo 1').click();
   assert.match(new URL(p.url()).hash,/grupo=A1/);
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`sin desborde en tabla ${width}`);

   await p.getByRole('tab',{name:'Partidos',exact:true}).click();
   const panel=dash.getByRole('tabpanel');
   assert.match(await panel.innerText(),/España/);
   assert.doesNotMatch(await panel.innerText(),/Grecia/);
   await dash.getByRole('button',{name:'Fecha siguiente',exact:true}).click();
   assert.match(await panel.innerText(),/España/);
   assert.match(await panel.innerText(),/Inglaterra/,'un cruce eliminatorio no se oculta por tener rival de otro grupo');
   await picker.getByRole('button',{name:/Liga B/}).click();await groupCard('Liga B · Grupo 1').click();
   // Al cambiar grupo se vuelve a su primera fecha, sin arrastrar la elegida antes.
   assert.match(await panel.innerText(),/Grecia/);
   assert.doesNotMatch(await panel.innerText(),/Portugal/);
   await dash.getByRole('button',{name:'Resultados',exact:true}).click();
   assert.match(await panel.innerText(),/Inglaterra/);
   assert.match(await panel.innerText(),/Irlanda/);
   assert.doesNotMatch(await panel.innerText(),/Croacia/);
   const summary=p.locator('section[aria-label="Última fecha en números"]');
   assert.match(await summary.innerText(),/Inglaterra/);
   assert.doesNotMatch(await summary.innerText(),/España/);
   assert.equal(await summary.locator('dl > div').nth(1).locator('dd').innerText(),'8');
   assert.equal(await summary.locator('dl > div').nth(2).locator('dd').innerText(),'2');
   await p.getByRole('tab',{name:'Tabla',exact:true}).click();
   assert.match(await dash.locator('tbody').innerText(),/Inglaterra/);
   assert.doesNotMatch(await dash.locator('tbody').innerText(),/España/);
   await dash.getByPlaceholder('Filtrar selección...').fill('zzzz');
   assert.equal(await dash.locator('tbody tr').count(),0);
   await dash.getByPlaceholder('Filtrar selección...').fill('');

   await p.locator('#explorar').getByRole('button',{name:'Europa',exact:true}).click();
   assert.equal(await p.locator('#explorar li button').count(),8);
   const nationsCard=p.locator('#explorar li').getByRole('button',{name:/UEFA Nations League/});
   assert.equal(await nationsCard.count(),1);
   await nationsCard.click();
   assert.equal(new URL(p.url()).hash,'#liga=unl');
   await p.locator('#comparador select').first().selectOption('unl');
   assert.match(await p.locator('#comparador article').first().innerText(),/UEFA Nations League/);
   assert.match(await p.locator('#comparador article').first().innerText(),/No comparable/,'grupos pequeños no reciben índice de paridad');
   await p.reload({waitUntil:'networkidle'});
   assert.equal(await dash.locator('h2').innerText(),'UEFA Nations League');
   // Enlace directo a un grupo.
   await p.goto(origin+'/futbol/#liga=unl&grupo=B1',{waitUntil:'networkidle'});
   await groupCard('Liga B · Grupo 1').waitFor();
   assert.equal(await groupCard('Liga B · Grupo 1').getAttribute('aria-pressed'),'true');
   assert.match(await dash.locator('tbody').innerText(),/Inglaterra/);
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`sin desborde ${width}`);

   // Sin captura no aparecen selecciones, estadísticas ni un respaldo inventado.
   published={schema_version:1,competitions:{}};
   await p.reload({waitUntil:'networkidle'});
   await dash.getByRole('status').filter({hasText:'Todavía no hay una captura publicada'}).waitFor();
   assert.equal(await dash.locator('tbody tr').count(),0);
   assert.equal(await p.locator('section[aria-label="Última fecha en números"]').count(),0);
   assert.match(await dash.innerText(),/No hay tabla publicada/);
   assert.deepEqual(errors,[]);
   assert.deepEqual(bad,[]);
   console.log(`OK Nations League ${width}×${height}: enlace, grupos, partidos, cruces, análisis, selector táctil y ausencia de datos.`);
   await ctx.close();
  }
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
