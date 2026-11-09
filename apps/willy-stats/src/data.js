import {catalog} from './catalog.js';
export const competitions=catalog.competitions;

/** Goles por partido de la tabla (cada partido cuenta una vez). */
export function goalsPerMatch(rows){
 const played=rows.reduce((s,t)=>s+t.pj,0)/2;
 return played?rows.reduce((s,t)=>s+t.gf,0)/played:null;
}

/**
 * Paridad de una tabla: cuánto se diferencian los clubes en nivel real, descontando el azar.
 * La dispersión observada de los puntos por partido mezcla nivel y suerte. La suerte esperada de
 * clubes iguales depende de los partidos jugados (G) y de la tasa de empates:
 *   sdAzar = sqrt(varianza de los puntos de un partido / G)
 *   nivel  = sqrt(max(0, sdObservada² − sdAzar²))
 * El margen de error usa la desviación típica de una desviación (sd / sqrt(2(n−1))).
 * Solo se calcula para tablas comparables: al menos 10 clubes y 8 partidos por club.
 */
export const MIN_CLUBS=10,MIN_MATCHES=8;
export function parity(rows){
 const r=rows.filter(t=>t.pj>0),n=r.length;
 if(n<MIN_CLUBS)return null;
 const G=r.reduce((s,t)=>s+t.pj,0)/n;
 if(G<MIN_MATCHES)return null;
 const ppg=r.map(t=>t.pts/t.pj),mean=ppg.reduce((a,b)=>a+b,0)/n;
 const sd=Math.sqrt(ppg.reduce((s,x)=>s+(x-mean)**2,0)/(n-1));
 const draws=r.reduce((s,t)=>s+t.e,0)/r.reduce((s,t)=>s+t.pj,0);
 const mu=3*(1-draws)/2+draws,second=9*(1-draws)/2+draws,sdChance=Math.sqrt((second-mu*mu)/G);
 const level=s=>Math.sqrt(Math.max(0,s*s-sdChance*sdChance)),se=sd/Math.sqrt(2*(n-1));
 return {clubs:n,matches:G,sd,sdChance,level:level(sd),low:level(Math.max(0,sd-1.96*se)),high:level(sd+1.96*se)};
}

export const number=(n,d=1)=>new Intl.NumberFormat('es-PE',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n);
export const normalized=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
