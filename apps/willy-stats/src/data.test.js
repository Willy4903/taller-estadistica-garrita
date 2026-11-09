import {test} from 'node:test';
import assert from 'node:assert/strict';
import {competitions,datasets,standings,metrics,projection} from './data.js';
test('el ejemplo solicitado se obtiene de los partidos, con un escolta a tres puntos',()=>{
 const c=competitions[0],rows=standings(c,datasets.per),u=rows[0];
 assert.deepEqual([u.name,u.rank,u.pj,u.g,u.e,u.p,u.gf,u.gc,u.dg,u.pts],['Universitario',1,12,9,2,1,24,7,17,29]);
 assert.deepEqual(u.form,['V','V','E','V','V']);assert.equal(rows[1].pts,26);assert.equal(u.effectiveness.toFixed(1),'80.6');
 assert.equal(metrics(c,rows).icl.toFixed(1),'8.4');assert.equal(projection(c,rows)[0].points,41);assert.equal(projection(c,rows)[0].prob.toFixed(1),'68.4');
});
test('16 ligas: integridad de puntos, goles, partidos y probabilidades',()=>{
 assert.equal(competitions.length,16);
 for(const c of competitions){const rows=standings(c,datasets[c.id]);for(const t of rows){assert.equal(t.pj,t.g+t.e+t.p);assert.equal(t.pts,3*t.g+t.e);assert.equal(t.dg,t.gf-t.gc);assert(t.effectiveness>=0&&t.effectiveness<=100);}
 const sum=k=>rows.reduce((s,t)=>s+t[k],0);assert.equal(sum('gf'),sum('gc'));assert.equal(sum('g'),sum('p'));assert.equal(sum('pj')%2,0);assert(Math.abs(projection(c,rows).reduce((s,t)=>s+t.prob,0)-100)<1e-9);
 }
});
test('Local + Visitante reconstruye exactamente General en cada club',()=>{
 for(const c of competitions){const general=standings(c,datasets[c.id]),home=standings(c,datasets[c.id],'home'),away=standings(c,datasets[c.id],'away');for(const t of general){const h=home.find(r=>r.name===t.name),a=away.find(r=>r.name===t.name);for(const k of ['pj','g','e','p','gf','gc','dg','pts'])assert.equal(h[k]+a[k],t[k],`${c.id} ${t.name} ${k}`);}}
});
import {matchdays} from './lib.js';
test('matchdays separa jornadas cuando un club vuelve a aparecer',()=>{
 const m=(id,home,away,date)=>({id,home,away,date});
 const days=matchdays([m(1,'A','B','2026-11-01T20:00Z'),m(2,'C','D','2026-11-02T20:00Z'),m(3,'A','C','2026-11-04T20:00Z'),m(4,'B','D','2026-11-05T20:00Z')]);
 assert.deepEqual(days.map(d=>d.map(x=>x.id)),[[1,2],[3,4]]);
});
test('matchdays no parte una fecha cuando un club jugó entre semana',()=>{
 const m=(id,home,away,date)=>({id,home,away,date});
 const days=matchdays([m(1,'A','B','2026-11-04T20:00Z'),m(2,'C','D','2026-11-04T22:00Z'),m(3,'B','E','2026-11-07T20:00Z'),m(4,'F','G','2026-11-08T20:00Z'),m(5,'H','I','2026-11-08T22:00Z')]);
 assert.deepEqual(days.map(d=>d.map(x=>x.id)),[[1,2],[3,4,5]]);
});
