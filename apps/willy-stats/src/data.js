import {catalog} from './catalog.js';
export const competitions=catalog.competitions;

/** Índice de competitividad: 10 × (1 − 0.4 × σ/μ) sobre puntos por partido, limitado a [0,10]. Mide paridad, no calidad. */
export function metrics(rows){
 const played=rows.reduce((s,t)=>s+t.pj,0)/2,goals=rows.reduce((s,t)=>s+t.gf,0),values=rows.map(t=>t.pj?t.pts/t.pj:0),mean=values.reduce((a,b)=>a+b,0)/values.length;
 const deviation=Math.sqrt(values.reduce((s,x)=>s+(x-mean)**2,0)/values.length);
 return {gpg:played?goals/played:null,cv:mean>0?deviation/mean:null,icl:mean>0?Math.max(0,Math.min(10,10*(1-0.4*deviation/mean))):null};
}
export const number=(n,d=1)=>new Intl.NumberFormat('es-PE',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n);
export const normalized=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
