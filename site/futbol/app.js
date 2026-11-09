/* Cancha: interfaz independiente, sin dependencias del sitio Liga 1. */
(() => {
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const C = window.CANCHA;
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeURL = s => {try {const u=new URL(s);return u.protocol==='https:'?esc(u.href):'#';}catch{return '#';}};
let favorites = new Set(); try {const stored=JSON.parse(localStorage.getItem('cancha-favorites')||'[]');if(Array.isArray(stored))favorites=new Set(stored.filter(x=>typeof x==='string'));} catch {}
const initial = new URLSearchParams(location.hash.slice(1)).get('liga');
let selected=C.competitions.find(c=>c.id===initial)||C.competitions[0], continent='all', mode='demo', view='table', ascending=false, onlySaved=false, snapshot={competitions:{}}, rows=[], fixtures=[], stage=0;
const key = name => name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const favorite = name => favorites.has(key(name));
const badge = name => `<span class="crest" style="--team:hsl(${[...name].reduce((a,c)=>a+c.charCodeAt(0),0)%360} 30% 35%)" aria-hidden="true">${esc(name.split(/\s+/).filter(x=>x.length>2).slice(0,2).map(x=>x[0]).join(''))}</span>`;
function zone(c,rank,n) {
 if(c.format==='swiss')return rank<=8?'qualify':rank<=24?'playoff':'none';
 // En formatos con fases, no inferimos descenso ni cupos desde una tabla parcial.
 if(['apertura','groups','playoffs','phases'].includes(c.format))return rank<= (c.format==='playoffs'?8:4)?'playoff':'none';
 if(rank>n-(c.id==='bra'?4:3))return 'danger';
 if(rank<=4+(c.id==='bra'?2:0))return 'qualify';
 if(rank<=6+(c.id==='bra'?6:0))return 'secondary';
 return 'none';
}
function zoneLabel(z,c=selected){if(c.format==='sudamericana')return ({qualify:'Primero: octavos',playoff:'Segundo: play-off',none:'Sin pase desde el grupo'})[z]||'Zona de grupo';return ({qualify:c.format==='swiss'?'Octavos de final (1–8)':'Zona internacional orientativa',secondary:c.continent==='América'?'Otra zona continental orientativa':'Otras plazas europeas orientativas',playoff:c.format==='swiss'?'Play-off (9–24)':'Zona de fase final orientativa',danger:c.format==='swiss'?'Eliminación':'Zona baja / descenso orientativo',none:c.format==='swiss'?'Fuera de la siguiente fase':'Zona media'})[z];}
function demo(c){
 if(c.format==='sudamericana'){const teams=c.teams.split('|');return {groups:Array.from({length:8},(_,i)=>{const d=demo({...c,id:c.id+i,format:'league',teams:teams.slice(i*4,i*4+4).join('|')});return {name:'Grupo '+String.fromCharCode(65+i),rows:d.rows.map((r,j)=>({...r,zone:j===0?'qualify':j===1?'playoff':'none'}))};}),fixtures:demo({...c,format:'league'}).fixtures};}

 const teams=c.teams.split('|'), n=teams.length;
 const r=teams.map(name=>({name,pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0,form:[]}));
 let seed=[...c.id].reduce((a,x)=>a+x.charCodeAt(0),0);const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 let rotation=teams.map((_,i)=>i);const rounds=c.format==='swiss'?6:Math.min(12,n-1), games=[];
 for(let round=0;round<rounds;round++){
  for(let i=0;i<n/2;i++){
   const a=rotation[i],b=rotation[n-1-i], h=round%2?a:b, v=round%2?b:a;
   const hg=Math.floor(random()*3+(n-h)/n*1.8),ag=Math.floor(random()*3+(n-v)/n);
   const H=r[h],A=r[v];H.pj++;A.pj++;H.gf+=hg;H.gc+=ag;A.gf+=ag;A.gc+=hg;
   if(hg>ag){H.g++;A.p++;H.pts+=3;}else if(hg<ag){A.g++;H.p++;A.pts+=3;}else{H.e++;A.e++;H.pts++;A.pts++;}
   H.form.push(hg>ag?'G':hg===ag?'E':'P');A.form.push(ag>hg?'G':hg===ag?'E':'P');
  }
  rotation.splice(1,0,rotation.pop());
 }
 // Fechas futuras solo para ilustrar el calendario. Se etiquetan en cada encuentro.
 const start=new Date(); start.setUTCHours(23,0,0,0);start.setUTCDate(start.getUTCDate()+1);
 for(let i=0;i<n/2;i++){const d=new Date(start);d.setUTCDate(d.getUTCDate()+Math.floor(i/3));d.setUTCHours(18+(i%3)*2);games.push({home:teams[rotation[i]],away:teams[rotation[n-1-i]],date:d.toISOString(),demo:true});}
 r.sort((a,b)=>b.pts-a.pts||(b.gf-b.gc)-(a.gf-a.gc)||b.gf-a.gf||a.name.localeCompare(b.name));
 return {rows:r.map((t,i)=>({...t,rank:i+1,dg:t.gf-t.gc,form:t.form.slice(-5),zone:zone(c,i+1,n)})),fixtures:games};
}
function stateData(){
 const data=mode==='demo'?demo(selected):snapshot.competitions[selected.id];
 const groups=data?.groups||[]; if(stage>=groups.length)stage=0; $('#stage-label').hidden=groups.length<2; $('#stage-filter').innerHTML=groups.map((g,i)=>`<option value="${i}" ${i===stage?'selected':''}>${esc(g.name)}</option>`).join(''); rows=groups.length?groups[stage].rows:(data?.rows||[]); fixtures=data?.fixtures||[];
 const note=$('#data-note');note.classList.toggle('real',mode==='verified');
 if(mode==='demo')note.textContent='MODO DEMOSTRACIÓN · Posiciones y partidos ficticios. Explora las funciones; no son datos oficiales ni de una temporada real.';
 else if(data){const date=formatDate(data.updated_at);note.innerHTML=`Instantánea de ${esc(data.season||'temporada informada por la fuente')} · Consultada ${esc(date)} · <a href="${safeURL(data.source)}" target="_blank" rel="noopener">Consultar fuente ESPN →</a>. No es un marcador en vivo.`;}
 else note.textContent='No hay una instantánea publicada para esta competición. Consulta la fuente oficial o usa Demostración para explorar la interfaz.';
}
function formatDate(d){const date=new Date(d);return Number.isNaN(date.getTime())?'Fecha por confirmar':new Intl.DateTimeFormat('es-PE',{day:'numeric',month:'short',year:'numeric',timeZone:'America/Lima'}).format(date);}
function dateParts(d){const date=new Date(d);if(Number.isNaN(date.getTime()))return ['Por confirmar','—'];return [new Intl.DateTimeFormat('es-PE',{weekday:'short',day:'numeric',month:'short',timeZone:'America/Lima'}).format(date),new Intl.DateTimeFormat('es-PE',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'America/Lima'}).format(date)];}
function competitionFlag(c){return c.flagAsset?`<img class="country-flag" src="${esc(c.flagAsset)}" alt="Bandera de ${esc(c.country)}" width="32" height="22">`:`<span class="confederation-mark" aria-label="Competición de ${esc(c.country)}">${esc(c.flag)}</span>`;}
function renderCompetitions(){
 $('#competitions').innerHTML=C.competitions.filter(c=>continent==='all'||c.continent===continent).map(c=>`<button class="competition" data-league="${c.id}" aria-pressed="${selected.id===c.id}"><span class="flag">${competitionFlag(c)}</span><span><strong>${esc(c.name)}</strong><small>${esc(c.country)}</small></span></button>`).join('');
}
function render(){
 stateData();renderCompetitions();$('#league-flag').innerHTML=competitionFlag(selected);$('#league-name').textContent=selected.name;$('#league-location').textContent=`${selected.country} · ${selected.continent}`;
 $('#data-mode').value=mode;$('#table-caption').textContent=`${selected.name}: ${mode==='demo'?'tabla ficticia de demostración':'instantánea publicada'}`;
 renderTable();renderFixtures();renderInsight();renderGuide();renderFavoriteCount();
}
function renderTable(){
 const q=key($('#team-search').value), filter=$('#zone-filter').value;
 let visible=rows.filter(t=>(!q||key(t.name).includes(q))&&(!onlySaved||favorite(t.name))&&(filter==='all'||filter==='favorite'&&favorite(t.name)||filter==='qualify'&&['qualify','secondary','playoff'].includes(t.zone)||filter==='danger'&&t.zone==='danger'));
 if(ascending)visible=[...visible].reverse();
 $('#standings').innerHTML=visible.map(t=>`<tr data-zone="${esc(t.zone||'none')}"><td>${t.rank}</td><td><button class="team-button" data-team="${esc(t.name)}">${badge(t.name)}${esc(t.name)}</button></td><td>${t.pj}</td><td>${t.g}</td><td>${t.e}</td><td>${t.p}</td><td>${t.dg>0?'+':''}${t.dg}</td><td class="points">${t.pts}</td><td><div class="form" aria-label="Últimos resultados: ${esc((t.form||[]).join(', ')||'no disponibles')}">${(t.form||[]).map(f=>`<i class="${f==='G'?'win':f==='P'?'loss':''}">${esc(f)}</i>`).join('')||'—'}</div></td><td><button class="star" data-save="${esc(t.name)}" aria-label="${favorite(t.name)?'Quitar':'Guardar'} a ${esc(t.name)} en favoritos" aria-pressed="${favorite(t.name)}">${favorite(t.name)?'★':'☆'}</button></td></tr>`).join('');
 $('#table-empty').hidden=visible.length>0;
 $('#table-empty').textContent=rows.length?'No hay equipos con estos filtros. Prueba otra búsqueda o guarda equipos con ☆.':'Aún no hay posiciones publicadas. Puedes explorar la demostración sin confundirla con una tabla real.';
 $('#result-count').textContent=`${visible.length} de ${rows.length} equipos`;
 const zones=[...new Set(rows.map(t=>t.zone).filter(z=>z&&z!=='none'))];$('#legend').innerHTML=zones.map(z=>`<span class="${esc(z)}">${esc(zoneLabel(z))}</span>`).join('');
}
function renderFixtures(){
 const filtered=fixtures.filter(f=>(!onlySaved&&$('#fixture-filter').value!=='favorite')||favorite(f.home)||favorite(f.away));
 $('#fixtures').innerHTML=filtered.length?filtered.map(f=>{const [day,time]=dateParts(f.date);return `<article class="fixture"><div>${esc(day)}<br><b>${esc(time)}</b>${f.demo?'<small>FICTICIO</small>':''}</div><strong>${esc(f.home)}</strong><span>vs</span><strong>${esc(f.away)}</strong></article>`;}).join(''):'<p class="empty">No hay próximos partidos disponibles con estos filtros.</p>';
 $('#next-matches').innerHTML=filtered.length?filtered.slice(0,3).map(f=>{const [day,time]=dateParts(f.date);return `<div class="mini-match"><small>${esc(day)} · ${esc(time)} ${f.demo?'· Ficticio':''}</small><div><b>${esc(f.home)}</b><em>vs</em><b>${esc(f.away)}</b></div></div>`;}).join(''):'<p class="muted">Sin encuentros publicados para esta selección.</p>';
}
function renderInsight(){
 const leader=rows[0];
 if(!leader){$('#insight-title').textContent='El contexto también importa.';$('#insight-copy').textContent='Cuando haya una tabla publicada, aquí encontrarás la distancia al líder y la lectura de la competición.';$('#insight-stat').textContent='—';$('#insight-note').textContent='Sin datos no hay conclusiones.';return;}
 const gap=leader.pts-(rows[1]?.pts||leader.pts);
 $('#insight-title').textContent=gap?`${leader.name} marca el paso.`:'La cima está compartida.';
 $('#insight-copy').textContent=`${gap?`Tiene ${gap} ${gap===1?'punto':'puntos'} de ventaja sobre el segundo.`:'Los dos primeros están igualados a puntos.'} ${leader.g} victorias en ${leader.pj} partidos. ${leader.pj?Math.round(leader.pts/(leader.pj*3)*100):0}% de los puntos posibles.`;
 $('#insight-stat').innerHTML=`${gap}<span>${gap===1?'punto':'puntos'} de diferencia</span>`;
 $('#insight-note').textContent=mode==='demo'?'LECTURA DE DATOS FICTICIOS · Solo demostración.':'Calculado sobre la instantánea publicada; no predice resultados.';
}
function renderGuide(){
 const texts={sudamericana:'La fase de grupos de la Sudamericana tiene ocho grupos de cuatro. El primero de cada grupo pasa a octavos; el segundo disputa un play-off ante un tercero de grupos de Libertadores. Después hay eliminatorias. La demostración muestra grupos ficticios de tres partidos por equipo, no los participantes ni el calendario oficiales.',league:'Una liga de todos contra todos premia la regularidad: ganar suma 3 puntos; empatar, 1; perder, 0. Las posiciones se ordenan según el proveedor. Los desempates oficiales pueden variar por competición.',apertura:'Perú combina Apertura, Clausura y acumulado. Ganar un torneo corto no equivale automáticamente a ganar el título nacional. Las plazas internacionales y el descenso dependen del acumulado y de las bases vigentes.',groups:'Argentina utiliza formatos por zonas y eliminatorias según la temporada. Una tabla agregada no determina por sí sola al campeón, el descenso por promedios ni las plazas continentales. Revisa el grupo y la etapa de la fuente.',playoffs:'Colombia combina una fase regular y fases finales. Los primeros ocho suelen avanzar, pero los títulos, el descenso por promedio y los cupos internacionales requieren consultar tablas y reglas adicionales.',phases:'Ecuador utiliza fases cuya estructura depende de la temporada. Una fase regular, una liguilla o una tabla acumulada no son intercambiables. El descenso y los cupos deben consultarse con las bases de LigaPro.',swiss:'En la fase liga UEFA participan 36 equipos. Los puestos 1–8 pasan a octavos; del 9 al 24 disputan un play-off; del 25 al 36 quedan eliminados. Champions juega ocho partidos por equipo; Europa League también. La demostración ilustra una fase incompleta de seis partidos.'};
 $('#guide-view').innerHTML=`<h4>Más fácil de lo que parece.</h4><p>${esc(texts[selected.format])}</p><ul><li><strong>PTS:</strong> puntos. <strong>PJ:</strong> partidos jugados. <strong>DG:</strong> goles a favor menos goles en contra.</li><li>Los colores son una ayuda visual, no una confirmación de clasificación. En formatos con fases no marcamos descenso desde una tabla parcial.</li><li>Las copas nacionales, cupos extra, sanciones y licencias pueden alterar las plazas internacionales. No se modelan en la demostración.</li><li>Los desempates de la demostración son puntos, diferencia de goles y goles a favor. La fuente publicada conserva el orden de su proveedor.</li></ul><p><a href="https://www.espn.com/soccer/standings/_/league/${encodeURIComponent(selected.code)}" target="_blank" rel="noopener">Consultar competición y etapa en ESPN →</a></p>`;
}
function setView(v,focus=false){view=v;$$('.panel-tabs button').forEach(b=>{const active=b.id===`tab-${v}`;b.setAttribute('aria-selected',active);b.tabIndex=active?0:-1;if(active&&focus)b.focus();});['table','fixtures','guide'].forEach(x=>$(`#${x}-view`).hidden=x!==v);}
function renderFavoriteCount(){$('#saved-count').textContent=favorites.size;$('#saved-toggle').setAttribute('aria-pressed',onlySaved);}
function toggleFavorite(name){const k=key(name);favorites.has(k)?favorites.delete(k):favorites.add(k);try{localStorage.setItem('cancha-favorites',JSON.stringify([...favorites]));}catch{}renderTable();renderFixtures();renderFavoriteCount();}
function detail(name){
 const t=rows.find(t=>t.name===name);if(!t)return;
 const next=fixtures.find(f=>f.home===name||f.away===name);
 $('#team-detail').innerHTML=`<p class="eyebrow">${esc(selected.name)} · ${mode==='demo'?'DEMOSTRACIÓN':'INSTANTÁNEA'}</p><h2 id="dialog-title">${esc(t.name)}</h2><p class="detail-zone">Puesto ${t.rank} · ${esc(zoneLabel(t.zone||'none'))}</p><div class="detail-stats">${[['Puntos',t.pts],['Partidos',t.pj],['Victorias',t.g],['Goles a favor',t.gf],['Goles en contra',t.gc],['Diferencia',t.dg]].map(([label,value])=>`<div><b>${value}</b><span>${label}</span></div>`).join('')}</div><p>${mode==='demo'?'Estas cifras son ficticias y solo ilustran la experiencia.':'Cifras de la instantánea; consulta la fecha de actualización en la cabecera.'}</p><p class="detail-next">${next?`Próximo encuentro ${next.demo?'ficticio':''}: <strong>${esc(next.home)} vs ${esc(next.away)}</strong><br>${esc(dateParts(next.date).join(' · '))} · Lima`:'No hay próximo partido publicado.'}</p><button class="dialog-favorite" data-save="${esc(name)}">${favorite(name)?'★ Quitar de':'☆ Guardar en'} mis equipos</button>`;
 if(!$('#team-dialog').open)$('#team-dialog').showModal();
}
function renderHistory(type='america'){
 $$('#history-filters button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.history===type));
 if(type==='paises'){
 $('#history-content').innerHTML=`<div class="history-grid country-grid">${C.history.countries.map(([flag,country,club,count,url])=>`<article class="history-card"><p class="eyebrow">${flag} ${esc(country)}</p><h3>${esc(club)}</h3><p>Campeonatos de primera división</p><div class="record">${count}<small>títulos</small></div><p>Palmarés al cierre de 2024</p><a href="${safeURL(url)}" target="_blank" rel="noopener">Archivo del club →</a></article>`).join('')}</div>`;
 $('#history-note').textContent='Corte: 31 de diciembre de 2024. Primeras divisiones nacionales; no incluye copas ni supercopas. Alemania incluye el título de 1932 previo a la Bundesliga. Son registros históricos, no recuentos actuales.';return;}
 const h=C.history[type];
 $('#history-content').innerHTML=`<div class="history-grid">${h.rows.slice(0,3).map(([club,count,country,story],i)=>`<article class="history-card"><p class="eyebrow">${i===0?'EL MÁS LAUREADO':`EN EL PODIO · ${esc(country)}`}</p><span class="trophy" aria-hidden="true">${i===0?'♜':'✦'}</span><h3>${esc(club)}</h3><p>${esc(story)}</p><div class="record">${count}<small>títulos</small></div></article>`).join('')}</div><div class="record-bars" aria-label="Palmarés histórico">${h.rows.map(([club,count])=>`<div class="record-row"><span>${esc(club)}</span><div class="record-bar"><i style="width:${count/h.rows[0][1]*100}%"></i></div><strong>${count}</strong></div>`).join('')}</div>`;
 $('#history-note').innerHTML=`${esc(h.note)} Corte: ${esc(h.cutoff)}. ${type==='europa'?'Bayern y Liverpool comparten seis títulos.':''} Selección de clubes. <a href="${safeURL(h.source)}" target="_blank" rel="noopener">Fuente: ${type==='america'?'CONMEBOL':'UEFA'} →</a>`;
}
$('#competitions').addEventListener('click',e=>{const b=e.target.closest('[data-league]');if(!b)return;selected=C.competitions.find(c=>c.id===b.dataset.league);stage=0;$('#team-search').value='';$('#zone-filter').value='all';history.replaceState(null,'',`#liga=${selected.id}`);render();});
$('#continent-filter').addEventListener('click',e=>{const b=e.target.closest('[data-continent]');if(!b)return;continent=b.dataset.continent;$$('#continent-filter button').forEach(x=>x.setAttribute('aria-pressed',x===b));if(continent!=='all'&&selected.continent!==continent)selected=C.competitions.find(c=>c.continent===continent);render();});
$('#data-mode').addEventListener('change',e=>{mode=e.target.value;render();});
$('#stage-filter').addEventListener('change',e=>{stage=Number(e.target.value);render();});
$('#team-search').addEventListener('input',renderTable);$('#zone-filter').addEventListener('change',renderTable);$('#fixture-filter').addEventListener('change',renderFixtures);
$('#sort-points').addEventListener('click',()=>{ascending=!ascending;$('#sort-points').textContent=`PTS ${ascending?'↑':'↓'}`;$('#sort-points').closest('th').setAttribute('aria-sort',ascending?'ascending':'descending');renderTable();});
$('.panel-tabs').addEventListener('click',e=>{if(e.target.matches('[role=tab]'))setView(e.target.id.replace('tab-',''));});
$('.panel-tabs').addEventListener('keydown',e=>{const tabs=['table','fixtures','guide'];if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?2:(tabs.indexOf(view)+(e.key==='ArrowRight'?1:2))%3;setView(tabs[n],true);});
document.querySelector('nav a[href="#partidos"]').addEventListener('click',e=>{e.preventDefault();setView('fixtures',true);$('.league-heading').scrollIntoView({behavior:'smooth'});});
$('#see-calendar').addEventListener('click',()=>{setView('fixtures',true);$('.league-heading').scrollIntoView({behavior:'smooth',block:'start'});});
$('#saved-toggle').addEventListener('click',()=>{onlySaved=!onlySaved;renderTable();renderFixtures();renderFavoriteCount();$('#explorar').scrollIntoView({behavior:'smooth'});});
$('body').addEventListener('click',e=>{const save=e.target.closest('[data-save]');if(save){toggleFavorite(save.dataset.save);if($('#team-dialog').open)detail(save.dataset.save);return;}const team=e.target.closest('[data-team]');if(team)detail(team.dataset.team);});
$('#history-filters').addEventListener('click',e=>{const b=e.target.closest('[data-history]');if(b)renderHistory(b.dataset.history);});
$$('dialog').forEach(d=>{d.querySelector('.dialog-close').addEventListener('click',()=>d.close());d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});});
$('#about-data').addEventListener('click',()=>$('#data-dialog').showModal());
render();renderHistory();
fetch('data/snapshot.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('No snapshot');return r.json();}).then(data=>{if(data.schema_version!==1||!data.competitions)throw Error('Invalid snapshot');snapshot=data;if(mode==='verified')render();}).catch(()=>{/* Estado vacío explícito; la demostración no se etiqueta como real. */});
})();
