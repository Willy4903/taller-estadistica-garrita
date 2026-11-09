import {catalog} from './catalog.js';
export const competitions=catalog.competitions, history=catalog.history;
const outcomes=[[3,1],[3,1],[1,1],[2,0],[0,1],[2,0],[3,1],[2,0],[3,1],[1,1],[2,0],[2,0]];
export function generateMatches(c,seedOverride){
 const teams=c.teams.split('|'),n=teams.length;
 let seed=seedOverride??[...c.id].reduce((a,x)=>a+x.charCodeAt(0),0);
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const rotation=teams.map((_,i)=>i),matches=[],rounds=c.format==='swiss'?6:Math.min(12,n-1);
 for(let round=0;round<rounds;round++){
  for(let i=0;i<n/2;i++){
   const a=rotation[i],b=rotation[n-1-i],h=round%2?a:b,v=round%2?b:a;
   let hg=Math.floor(random()*3+(n-h)/n*1.8),ag=Math.floor(random()*3+(n-v)/n);
   if(c.id==='per'&&(h===0||v===0)){const [gf,gc]=outcomes[round];hg=h===0?gf:gc;ag=h===0?gc:gf;}
   matches.push({id:`${c.id}-${round}-${i}`,home:teams[h],away:teams[v],hg,ag,round:round+1});
  }rotation.splice(1,0,rotation.pop());
 }
 const future=new Date();future.setUTCHours(18,0,0,0);future.setUTCDate(future.getUTCDate()+1);
 for(let i=0;i<n/2;i++){const d=new Date(future);d.setUTCDate(d.getUTCDate()+Math.floor(i/3));d.setUTCHours(18+(i%3)*2);matches.push({id:`${c.id}-next-${i}`,home:teams[rotation[i]],away:teams[rotation[n-1-i]],hg:null,ag:null,round:rounds+1,date:d.toISOString()});}
 return matches;
}
export function standings(c,matches,venue='all'){
 const map=new Map(c.teams.split('|').map(name=>[name,{name,pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0,form:[]}]));
 for(const m of matches){if(m.hg==null)continue;
  for(const [name,gf,gc,isHome] of [[m.home,m.hg,m.ag,true],[m.away,m.ag,m.hg,false]]){
   if(venue==='home'&&!isHome||venue==='away'&&isHome)continue;
   const t=map.get(name);if(!t)continue;t.pj++;t.gf+=gf;t.gc+=gc;
   if(gf>gc){t.g++;t.pts+=3;t.form.push('V');}else if(gf===gc){t.e++;t.pts++;t.form.push('E');}else{t.p++;t.form.push('D');}
  }
 }
 return [...map.values()].sort((a,b)=>b.pts-a.pts||(b.gf-b.gc)-(a.gf-a.gc)||b.gf-a.gf||a.name.localeCompare(b.name)).map((t,i)=>({...t,rank:i+1,dg:t.gf-t.gc,effectiveness:t.pj?t.pts/(t.pj*3)*100:0,form:t.form.slice(-5)}));
}
// El ejemplo de Perú conserva también las estadísticas del rival en cada partido.
let peruSeed=1;
for(;peruSeed<10000;peruSeed++){const r=standings(competitions[0],generateMatches(competitions[0],peruSeed));if(r[0].name==='Universitario'&&r[1].pts===26)break;}
export const datasets=Object.fromEntries(competitions.map(c=>[c.id,generateMatches(c,c.id==='per'?peruSeed:undefined)]));
// Calibración editorial del ejemplo 68.4%; no es validación predictiva.
const reference=standings(competitions[0],datasets.per);
const weights=(rows,beta)=>{const top=Math.max(...rows.map(t=>t.pj?t.pts/t.pj:0));const w=rows.map(t=>Math.exp(beta*((t.pj?t.pts/t.pj:0)-top)));const sum=w.reduce((a,b)=>a+b,0);return w.map(v=>v/sum*100);};
let low=0,high=100;
for(let i=0;i<60;i++){const mid=(low+high)/2;if(weights(reference,mid)[0]<68.4)low=mid;else high=mid;}
export const MODEL_BETA=(low+high)/2;
export function metrics(c,rows){
 const played=rows.reduce((s,t)=>s+t.pj,0)/2,goals=rows.reduce((s,t)=>s+t.gf,0),values=rows.map(t=>t.pj?t.pts/t.pj:0),mean=values.reduce((a,b)=>a+b,0)/values.length;
 const deviation=Math.sqrt(values.reduce((s,x)=>s+(x-mean)**2,0)/values.length);
 return {gpg:played?goals/played:0,icl:Math.max(0,Math.min(10,10*(1-0.4*(mean?deviation/mean:0))))};
}
export function projection(c,rows){
 const total=c.format==='swiss'?8:c.teams.split('|').length-1;
 const probabilities=weights(rows,MODEL_BETA);
 return rows.map((t,i)=>({name:t.name,points:Math.round(t.pts+Math.max(0,total-t.pj)*(t.pj?t.pts/t.pj:0)),prob:probabilities[i]}));
}
export function zone(c,rank,n){if(c.format==='swiss')return rank<=8?'qualify':rank<=24?'playoff':'none';if(['apertura','groups','playoffs','phases','sudamericana','libertadores'].includes(c.format))return rank<=4?'playoff':'none';if(rank>n-(c.id==='bra'?4:3))return 'danger';if(rank<=4)return 'qualify';if(rank<=6)return 'secondary';return 'none';}
export const zoneLabels={qualify:'Zona internacional',secondary:'Otras plazas continentales',playoff:'Zona de fase final',danger:'Zona baja / descenso',none:'Zona media'};
export const formats={league:'Todos contra todos. Ganar suma 3 puntos, empatar 1 y perder 0. Copas nacionales, licencias, sanciones y cupos adicionales pueden modificar las zonas orientativas.',apertura:'Apertura, Clausura y acumulado tienen funciones diferentes. Ganar un torneo corto no implica el campeonato nacional. Los cupos internacionales y el descenso se definen según las bases vigentes.',groups:'Argentina combina zonas y eliminatorias. Esta demostración es un ejemplo agregado, no una tabla oficial de fase ni una tabla de promedios.',playoffs:'Colombia combina fase regular y fases finales. No se debe inferir el descenso por promedio ni los cupos internacionales desde una fase parcial.',phases:'Ecuador tiene fases cuyo formato depende de la temporada. Una tabla de fase regular no equivale al acumulado. Consulta las bases de LigaPro.',swiss:'En la fase liga UEFA, 1–8 pasan a octavos; 9–24 disputan un play-off; 25–36 quedan eliminados. Esta demostración representa seis de ocho jornadas.',libertadores:'La fase de grupos de Libertadores tiene ocho grupos de cuatro: los dos primeros pasan a octavos y el tercero accede al play-off de Sudamericana. Después hay eliminatorias a doble partido hasta la final única. Esta vista agregada es una demostración, no la clasificación oficial de los grupos.',sudamericana:'Ocho grupos de cuatro. El primero pasa a octavos; el segundo juega un play-off contra un tercero de Libertadores. Esta vista agregada es un ejemplo analítico: no reemplaza los grupos oficiales.'};
export const number=(n,d=1)=>new Intl.NumberFormat('es-PE',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n);
export const normalized=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
