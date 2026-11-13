export const ASSETS={
  hero:'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80'
};

export const formLetter=f=>f==='G'||f==='W'?'V':f==='P'||f==='L'?'D':f;

/** Filas de la tabla publicada. Sin captura devuelve [] y la interfaz no muestra cifras. */
export function getRows({league,snapshot,group}){
  const g=snapshot[league.id]?.groups?.[group??0];
  return (g?.rows||[]).map(t=>({...t,form:(t.form||[]).map(formLetter),effectiveness:t.pj>0?t.pts/(3*t.pj)*100:null}));
}

/** Partidos de las selecciones de un grupo, incluidos cruces eliminatorios.
 * Prioriza IDs del proveedor; el nombre exacto solo se usa si falta un ID.
 */
export function matchesForTeams(matches,rows){
  const ids=new Set(rows.filter(r=>r.team_id).map(r=>String(r.team_id)));
  const names=new Set(rows.map(r=>r.name));
  const withoutId=new Set(rows.filter(r=>!r.team_id).map(r=>r.name));
  const includes=(id,name)=>id!=null&&id!==''?ids.has(String(id))||withoutId.has(name):names.has(name);
  return matches.filter(m=>includes(m.home_id,m.home)||includes(m.away_id,m.away));
}

const per=(t,k)=>t.pj?t[k]/t.pj:0;
const formScore=t=>t.form?.length?t.form.reduce((s,f)=>s+(f==='V'?3:f==='E'?1:0),0)/(3*t.form.length):0;
const AXES=[
  ['Ataque',t=>per(t,'gf')],
  ['Defensa',t=>-per(t,'gc')],
  ['Efectividad',t=>t.pj?t.pts/(3*t.pj):0],
  ['Dif. de gol',t=>t.pj?(t.gf-t.gc)/t.pj:0],
  ['Forma',formScore]
];

/** Cinco ejes calculables con los datos publicados, normalizados contra el resto de la liga. */
export function radarAxes(rows,team){
  const played=rows.filter(r=>r.pj>0);
  return AXES.map(([label,fn])=>{
    const vals=played.map(fn),lo=Math.min(...vals),hi=Math.max(...vals);
    const s=v=>hi===lo?.5:(v-lo)/(hi-lo);
    return {label,team:s(fn(team)),avg:vals.length?vals.reduce((a,v)=>a+s(v),0)/vals.length:0};
  });
}

export function reading(rows){
  const played=rows.filter(r=>r.pj>0);
  if(!played.length)return null;
  const leader=played[0],second=played[1];
  const rank=(fn,desc)=>[...played].sort((a,b)=>desc?fn(b)-fn(a):fn(a)-fn(b)).findIndex(t=>t.name===leader.name)+1;
  return {leader,second,gap:second?leader.pts-second.pts:null,ppg:leader.pts/leader.pj,
    attackRank:rank(t=>per(t,'gf'),true),defenseRank:rank(t=>per(t,'gc'),false),rows:played.length};
}

export const stamp=iso=>{
  const d=new Date(iso);
  return Number.isFinite(+d)?d.toLocaleString('es-PE',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Lima'})+' (Lima)':'fecha no disponible';
};

const HOUR=3600000,DAY=24*HOUR;
const teamsOf=group=>new Set(group.flatMap(m=>[m.home,m.away]));
/**
 * Agrupa partidos en jornadas, en orden cronológico:
 * 1) corta donde hay más de 36 horas sin partidos;
 * 2) dentro de cada bloque, corta cuando un club vuelve a aparecer;
 * 3) une fragmentos sin clubes en común (partidos reprogramados) si caben en una jornada.
 */
export function matchdays(list){
  const dated=list.filter(m=>Number.isFinite(Date.parse(m.date)));
  if(!dated.length)return [];
  const time=m=>Date.parse(m.date),sorted=[...dated].sort((a,b)=>time(a)-time(b)),blocks=[];
  for(const m of sorted){
    const last=blocks[blocks.length-1];
    if(!last||time(m)-time(last[last.length-1])>36*HOUR)blocks.push([]);
    blocks[blocks.length-1].push(m);
  }
  const parts=[];
  for(const block of blocks){
    let cur=[],seen=new Set();
    for(const m of block){
      if(seen.has(m.home)||seen.has(m.away)){parts.push(cur);cur=[];seen=new Set();}
      cur.push(m);seen.add(m.home);seen.add(m.away);
    }
    parts.push(cur);
  }
  const cap=Math.max(0,...parts.map(g=>g.length)),days=[];
  for(const part of parts){
    const prev=days[days.length-1];
    if(prev&&time(part[0])-time(prev[prev.length-1])<=3*DAY&&prev.length+part.length<=cap&&![...teamsOf(part)].some(t=>teamsOf(prev).has(t)))prev.push(...part);
    else days.push(part);
  }
  return days;
}

export function matchdayLabel(day){
  const times=day.map(m=>Date.parse(m.date)).filter(Number.isFinite);
  if(!times.length)return day[0]?.round?`Fecha ${day[0].round}`:'Fecha';
  const f=t=>new Date(t).toLocaleDateString('es-PE',{weekday:'short',day:'numeric',month:'short',timeZone:'America/Lima'});
  const a=f(Math.min(...times)),b=f(Math.max(...times));
  return a===b?a:`${a} al ${b}`;
}

/** Resumen de la última fecha jugada y tendencia de goles por partido, calculados solo con resultados publicados. */
export function lastRound(results){
  const days=matchdays(results.filter(m=>m.hg!=null&&m.ag!=null));
  if(!days.length)return null;
  const day=days[days.length-1],cap=Math.max(...days.map(d=>d.length));
  const goals=day.reduce((s,m)=>s+m.hg+m.ag,0);
  const home=day.filter(m=>m.hg>m.ag).length,away=day.filter(m=>m.hg<m.ag).length;
  const biggest=[...day].sort((a,b)=>Math.abs(b.hg-b.ag)-Math.abs(a.hg-a.ag)||(b.hg+b.ag)-(a.hg+a.ag))[0];
  const trend=days.filter(d=>d.length>=cap/2).slice(-6).map(d=>({label:matchdayLabel(d),n:d.length,gpg:d.reduce((s,m)=>s+m.hg+m.ag,0)/d.length}));
  return {label:matchdayLabel(day),n:day.length,goals,gpg:goals/day.length,home,draws:day.length-home-away,away,biggest,trend,partial:day.length<cap*.6};
}

/** Partidos de la próxima fecha entre los clubes mejor ubicados de la tabla. */
export function highImpact(rows,fixtures,limit=3){
  const days=matchdays(fixtures);
  if(!days.length||!rows.length)return null;
  const byId=new Map(rows.filter(t=>t.team_id).map(t=>[t.team_id,t])),byName=new Map(rows.map(t=>[t.name,t]));
  const find=(id,name)=>byId.get(id)||byName.get(name);
  const items=days[0].map(m=>{const h=find(m.home_id,m.home),a=find(m.away_id,m.away);return h&&a?{match:m,h,a,score:h.rank+a.rank,gap:Math.abs(h.pts-a.pts)}:null;})
    .filter(Boolean).sort((x,y)=>x.score-y.score).slice(0,limit);
  return items.length?{label:matchdayLabel(days[0]),items}:null;
}

/** Rachas según los últimos cinco resultados de la tabla publicada. */
export function streaks(rows){
  const withForm=rows.filter(t=>t.form?.length>=5);
  return {
    hot:withForm.filter(t=>t.form.filter(f=>f==='V').length>=4).sort((a,b)=>a.rank-b.rank).slice(0,3),
    cold:withForm.filter(t=>!t.form.includes('V')).sort((a,b)=>b.rank-a.rank).slice(0,3)
  };
}

/** Nombre legible de un grupo publicado: «Group A2» → Liga A · Grupo 2; «Group B» → Grupo B. */
const CONFERENCES={'Eastern Conference':'Conferencia Este','Western Conference':'Conferencia Oeste'};
export function groupLabel(name='',index=0){
  const raw=String(name).trim();
  let m=raw.match(/^(?:Group|Grupo)\s+([A-Z])\s*(\d+)$/i);
  if(m){const t=m[1].toUpperCase();return {tier:`Liga ${t}`,label:`Grupo ${m[2]}`,full:`Liga ${t} · Grupo ${m[2]}`,code:`${t}${m[2]}`};}
  m=raw.match(/^(Liga\s+\S+)\s*·\s*(Grupo\s+\S+)$/i);
  if(m)return {tier:m[1],label:m[2],full:`${m[1]} · ${m[2]}`,code:`${m[1].split(/\s+/)[1]}${m[2].split(/\s+/)[1]}`.toUpperCase()};
  m=raw.match(/^(?:Group|Grupo)\s+(\S+)$/i);
  if(m)return {tier:null,label:`Grupo ${m[1]}`,full:`Grupo ${m[1]}`,code:m[1].toUpperCase()};
  const label=CONFERENCES[raw]||raw||`Tabla ${index+1}`;
  return {tier:null,label,full:label,code:String(index+1)};
}

/** Índice del grupo de cada equipo, por ID del proveedor y, si falta, por nombre exacto. */
export function teamGroups(groups=[]){
  const byId=new Map(),byName=new Map();
  groups.forEach((g,i)=>(g.rows||[]).forEach(r=>{if(r.team_id!=null&&r.team_id!=='')byId.set(String(r.team_id),i);byName.set(r.name,i);}));
  return (id,name)=>id!=null&&id!==''&&byId.has(String(id))?byId.get(String(id)):byName.get(name);
}

/** Grupo de un partido: el común a ambos equipos, «cross» si son de grupos distintos, null si no se conoce. */
export function matchGroup(m,find){
  const h=find(m.home_id,m.home),a=find(m.away_id,m.away);
  if(h==null&&a==null)return null;
  if(h!=null&&a!=null&&h!==a)return 'cross';
  return h??a;
}

const LIMA='America/Lima';
const limaDay=t=>new Date(t).toLocaleDateString('en-CA',{timeZone:LIMA});
/** «Hoy», «Mañana» o null, según el calendario de Lima. */
export function relativeDay(t,now=Date.now()){
  const d=limaDay(t);
  return d===limaDay(now)?'Hoy':d===limaDay(now+DAY)?'Mañana':d===limaDay(now-DAY)?'Ayer':null;
}

/** Estado de un partido según su horario. Sin marcador nunca se presenta como en vivo. */
export function matchState(m,now=Date.now()){
  if(m.hg!=null&&m.ag!=null)return {kind:'final'};
  const t=Date.parse(m.date);
  if(!Number.isFinite(t))return {kind:'tbd'};
  if(t>now)return t-now<=3*HOUR?{kind:'soon',minutes:Math.max(1,Math.round((t-now)/60000))}:{kind:'scheduled'};
  return now-t<2*HOUR?{kind:'started'}:{kind:'pending'};
}

/** Partidos en orden cronológico con un separador por día de Lima, para el carrusel. */
export function tickerItems(list,now=Date.now()){
  const time=m=>{const t=Date.parse(m.date);return Number.isFinite(t)?t:Infinity;};
  const sorted=[...list].sort((a,b)=>time(a)-time(b)),items=[];
  let last;
  for(const m of sorted){
    const t=time(m),key=Number.isFinite(t)?limaDay(t):'tbd';
    if(key!==last){
      items.push({type:'day',key:`day-${key}`,rel:Number.isFinite(t)?relativeDay(t,now):null,
        label:Number.isFinite(t)?new Date(t).toLocaleDateString('es-PE',{weekday:'short',day:'numeric',month:'short',timeZone:LIMA}):'Por definir'});
      last=key;
    }
    items.push({type:'match',key:`m-${m.id}`,match:m});
  }
  return items;
}

/* ---------- Analítica derivada de la captura (sin datos inventados) ---------- */
const keyOf=(id,name)=>id!=null&&id!==''?`id:${id}`:`n:${name}`;
const finished=list=>list.filter(m=>m.hg!=null&&m.ag!=null);
function finder(rows){
  const byId=new Map(rows.filter(r=>r.team_id).map(r=>[String(r.team_id),r])),byName=new Map(rows.map(r=>[r.name,r]));
  return (id,name)=>(id!=null&&id!==''&&byId.get(String(id)))||(!rows.some(r=>r.team_id&&String(r.team_id)===String(id))&&byName.get(name))||null;
}
const rankRows=list=>[...list].sort((a,b)=>b.pts-a.pts||b.dg-a.dg||b.gf-a.gf||a.name.localeCompare(b.name)).map((r,i)=>({...r,rank:i+1,effectiveness:r.pj?r.pts/(3*r.pj)*100:null}));

/** ¿Los resultados publicados cubren todos los partidos de la tabla? */
export function coverage(rows,results){
  const find=finder(rows),count=new Map();
  for(const m of finished(results))for(const [id,name] of [[m.home_id,m.home],[m.away_id,m.away]]){const r=find(id,name);if(r)count.set(r.name,(count.get(r.name)||0)+1);}
  return rows.length>0&&rows.every(r=>(count.get(r.name)||0)===r.pj);
}

/** Tablas de local y de visitante calculadas con los resultados. Solo si cubren toda la tabla. */
export function splitTables(rows,results){
  if(!coverage(rows,results))return null;
  const find=finder(rows),blank=r=>({name:r.name,team_id:r.team_id,logo:r.logo,pj:0,g:0,e:0,p:0,gf:0,gc:0,dg:0,pts:0,form:[]});
  const home=new Map(rows.map(r=>[r.name,blank(r)])),away=new Map(rows.map(r=>[r.name,blank(r)]));
  const chrono=[...finished(results)].sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
  const add=(t,gf,gc)=>{t.pj++;t.gf+=gf;t.gc+=gc;t.dg=t.gf-t.gc;const f=gf>gc?'V':gf===gc?'E':'D';t[f==='V'?'g':f==='E'?'e':'p']++;t.pts+=f==='V'?3:f==='E'?1:0;t.form.push(f);};
  for(const m of chrono){const h=find(m.home_id,m.home),a=find(m.away_id,m.away);if(h)add(home.get(h.name),m.hg,m.ag);if(a)add(away.get(a.name),m.ag,m.hg);}
  const fin=map=>rankRows([...map.values()].map(t=>({...t,form:t.form.slice(-5)})));
  return {home:fin(home),away:fin(away)};
}

/** Cambio de posición respecto a la fecha anterior: se descuenta la última fecha y se reordena por puntos, DG y GF. */
export function movement(rows,results){
  const days=matchdays(finished(results));
  if(!days.length||rows.length<2)return null;
  const find=finder(rows),prev=new Map(rows.map(r=>[r.name,{...r}]));
  for(const m of days[days.length-1]){
    for(const [id,name,gf,gc] of [[m.home_id,m.home,m.hg,m.ag],[m.away_id,m.away,m.ag,m.hg]]){
      const r=find(id,name);if(!r)continue;const t=prev.get(r.name);
      t.pj--;t.gf-=gf;t.gc-=gc;t.dg=t.gf-t.gc;t.pts-=gf>gc?3:gf===gc?1:0;
    }
  }
  const before=new Map(rankRows([...prev.values()]).map(r=>[r.name,r.rank]));
  return new Map(rows.map(r=>[r.name,before.get(r.name)-r.rank]));
}

/** Goleadores. Solo si cada partido trae detalle y sus goles cuadran con el marcador. Excluye autogoles. */
export function scorers(rows,results,limit=5){
  const done=finished(results);
  if(!done.length||!done.every(m=>Array.isArray(m.goals)&&m.goals.length===m.hg+m.ag))return null;
  const find=finder(rows),tally=new Map();
  for(const m of done)for(const g of m.goals){
    if(g.own_goal||!g.player)continue;
    const team=g.team_id===String(m.home_id)?{id:m.home_id,name:m.home}:g.team_id===String(m.away_id)?{id:m.away_id,name:m.away}:null;
    if(!team||!find(team.id,team.name))continue;
    const k=`${g.player}|${team.name}`,t=tally.get(k)||{player:g.player,team:team.name,team_id:team.id,goals:0,penalties:0};
    t.goals++;if(g.penalty)t.penalties++;tally.set(k,t);
  }
  return [...tally.values()].sort((a,b)=>b.goals-a.goals||a.penalties-b.penalties||a.player.localeCompare(b.player)).slice(0,limit);
}

/** Tarjetas de los partidos publicados. Solo si todos traen detalle. */
export function cardTotals(results){
  const done=finished(results);
  if(!done.length||!done.every(m=>Array.isArray(m.cards)))return null;
  return done.reduce((s,m)=>{for(const c of m.cards)s[c.card==='R'?'red':'yellow']++;return s;},{yellow:0,red:0,matches:done.length});
}

/** Goles por fecha, en orden cronológico. */
export function goalsByMatchday(results){
  return matchdays(finished(results)).map((d,i)=>({index:i+1,label:matchdayLabel(d),n:d.length,goals:d.reduce((s,m)=>s+m.hg+m.ag,0),gpg:d.reduce((s,m)=>s+m.hg+m.ag,0)/d.length}));
}

/** Partidos totales del torneo cuando el formato lo permite saber (todos contra todos o fase suiza). */
export function totalMatches(league,n){
  if(!n)return null;
  if(league.teamType==='national'||['league','libertadores','sudamericana'].includes(league.format))return n*(n-1);
  if(league.format==='apertura')return n*(n-1)/2;
  if(league.format==='swiss')return n*4;
  return null;
}

/** Probabilidad local/empate/visita con un modelo de Poisson sobre goles por partido de la tabla.
 *  Se suavizan las tasas con 3 partidos de la media para no sobrerreaccionar a muestras pequeñas. */
export function probabilities(home,away,rows,results=[]){
  const played=rows.filter(r=>r.pj>0);
  if(!home?.pj||!away?.pj||played.length<2)return null;
  const games=played.reduce((s,r)=>s+r.pj,0),mu=played.reduce((s,r)=>s+r.gf,0)/games;
  if(!(mu>0))return null;
  const K=3,att=t=>(t.gf+K*mu)/((t.pj+K)*mu),def=t=>(t.gc+K*mu)/((t.pj+K)*mu);
  const done=finished(results);let hfa=1;
  if(done.length>=10){const hg=done.reduce((s,m)=>s+m.hg,0),ag=done.reduce((s,m)=>s+m.ag,0);if(hg>0&&ag>0)hfa=Math.min(1.3,Math.max(.8,Math.sqrt(hg/ag)));}
  const lh=mu*att(home)*def(away)*hfa,la=mu*att(away)*def(home)/hfa;
  const pois=(l,k)=>{let p=Math.exp(-l);for(let i=1;i<=k;i++)p*=l/i;return p;};
  let H=0,D=0,A=0;
  for(let i=0;i<=10;i++)for(let j=0;j<=10;j++){const p=pois(lh,i)*pois(la,j);if(i>j)H+=p;else if(i===j)D+=p;else A+=p;}
  const t=H+D+A;return {home:H/t*100,draw:D/t*100,away:A/t*100,xh:lh,xa:la};
}

/** Tabla en CSV para exportar. */
export function tableCsv(rows,label){
  const head=['Pos','Equipo','PJ','PG','PE','PP','GF','GC','DG','Pts','Racha'];
  const esc=v=>/[",;\n]/.test(String(v))?`"${String(v).replace(/"/g,'""')}"`:String(v);
  return [`# ${label}`,head.join(','),...rows.map(r=>[r.rank,r.name,r.pj,r.g,r.e,r.p,r.gf,r.gc,r.dg,r.pts,(r.form||[]).join('')].map(esc).join(','))].join('\n');
}

/** Temporada corta: «2026-27 UEFA Nations League» → «2026-27». */
export const shortSeason=s=>String(s||'').match(/\d{4}(?:[-/]\d{2,4})?/)?.[0]||String(s||'');

/** Tarjetas por equipo. Solo si todos los partidos traen detalle de tarjetas. Orden: más rojas, luego más amarillas. */
export function cardsByTeam(rows,results){
  const done=finished(results);
  if(!done.length||!done.every(m=>Array.isArray(m.cards)))return null;
  const find=finder(rows),tally=new Map(rows.map(r=>[r.name,{name:r.name,team_id:r.team_id,logo:r.logo,yellow:0,red:0,matches:0}]));
  for(const m of done){
    const sides=[[m.home_id,m.home],[m.away_id,m.away]].map(([id,name])=>({id:String(id),row:find(id,name)}));
    for(const s of sides)if(s.row)tally.get(s.row.name).matches++;
    for(const c of m.cards){const s=sides.find(x=>x.id===String(c.team_id));if(s?.row)tally.get(s.row.name)[c.card==='R'?'red':'yellow']++;}
  }
  return [...tally.values()].filter(t=>t.matches>0).sort((a,b)=>b.red-a.red||b.yellow-a.yellow||a.name.localeCompare(b.name));
}
