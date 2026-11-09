import {datasets,standings} from './data.js';

export const ASSETS={
  hero:'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80',
  celebration:'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=600&q=80'
};

export const formLetter=f=>f==='G'||f==='W'?'V':f==='P'||f==='L'?'D':f;

/** Filas de la tabla según la fuente elegida. Sin captura publicada devuelve []. */
export function getRows({league,source,snapshot,group,venue='all'}){
  if(source==='demo')return standings(league,datasets[league.id],venue);
  const g=snapshot[league.id]?.groups?.[group??0];
  return (g?.rows||[]).map(t=>({...t,form:(t.form||[]).map(formLetter),effectiveness:t.pj>0?t.pts/(3*t.pj)*100:null}));
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
 * Sin fechas (demostración) agrupa por ronda.
 */
export function matchdays(list){
  const dated=list.filter(m=>Number.isFinite(Date.parse(m.date)));
  if(!dated.length){
    const byRound=new Map();
    for(const m of list){const k=m.round??0;if(!byRound.has(k))byRound.set(k,[]);byRound.get(k).push(m);}
    return [...byRound.entries()].sort((a,b)=>a[0]-b[0]).map(e=>e[1]);
  }
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
