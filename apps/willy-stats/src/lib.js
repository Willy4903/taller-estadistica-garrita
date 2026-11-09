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
