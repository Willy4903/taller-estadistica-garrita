import {test} from 'node:test';
import assert from 'node:assert/strict';
import {competitions,parity,goalsPerMatch} from './data.js';
import {matchdays,lastRound,highImpact,streaks} from './lib.js';

const m=(id,home,away,date,hg=null,ag=null)=>({id,home,away,date,hg,ag,home_id:home,away_id:away});

test('16 competiciones con identificador único',()=>{
 assert.equal(competitions.length,16);
 assert.equal(new Set(competitions.map(c=>c.id)).size,16);
});
const club=(i,g,e,p,gf=10,gc=10)=>({name:'C'+i,pj:g+e+p,g,e,p,pts:3*g+e,gf,gc});
const league=(n,make)=>Array.from({length:n},(_,i)=>make(i));

test('goles por partido cuenta cada partido una sola vez',()=>{
 assert.equal(goalsPerMatch([{pj:2,gf:3},{pj:2,gf:1}]),2);
});
test('paridad: clubes idénticos no tienen diferencia de nivel',()=>{
 const p=parity(league(12,i=>club(i,4,4,4)));
 assert.equal(p.level,0);assert.equal(p.low,0);
});
test('paridad: una liga con clubes muy dispares tiene diferencia de nivel alta',()=>{
 const rows=league(12,i=>i<6?club(i,10,1,1):club(i,1,1,10));
 const p=parity(rows);
 assert(p.level>0.8,`nivel ${p.level}`);assert(p.low<=p.level&&p.level<=p.high);
});
test('paridad: la misma dispersión pesa menos con pocos partidos (el azar la explica)',()=>{
 // Misma dispersión de puntos por partido, observada en 10 y en 30 partidos por club.
 const short=parity(league(12,i=>i%2?club(i,6,2,2):club(i,3,3,4)));
 const long=parity(league(12,i=>i%2?club(i,18,6,6):club(i,9,9,12)));
 assert(short.sdChance>long.sdChance);
 assert(short.level<long.level);
});
test('paridad: tablas no comparables devuelven null',()=>{
 assert.equal(parity(league(6,i=>club(i,10,5,5))),null);   // grupo de pocos clubes
 assert.equal(parity(league(36,i=>club(i,2,1,1))),null);   // fase de liga con 4 partidos
});
test('matchdays separa jornadas cuando un club vuelve a aparecer',()=>{
 const days=matchdays([m(1,'A','B','2026-11-01T20:00Z'),m(2,'C','D','2026-11-02T20:00Z'),m(3,'A','C','2026-11-04T20:00Z'),m(4,'B','D','2026-11-05T20:00Z')]);
 assert.deepEqual(days.map(d=>d.map(x=>x.id)),[[1,2],[3,4]]);
});
test('matchdays no parte una fecha cuando un club jugó entre semana',()=>{
 const days=matchdays([m(1,'A','B','2026-11-04T20:00Z'),m(2,'C','D','2026-11-04T22:00Z'),m(3,'B','E','2026-11-07T20:00Z'),m(4,'F','G','2026-11-08T20:00Z'),m(5,'H','I','2026-11-08T22:00Z')]);
 assert.deepEqual(days.map(d=>d.map(x=>x.id)),[[1,2],[3,4,5]]);
});
test('sin fechas no se inventan jornadas',()=>{ assert.deepEqual(matchdays([{id:1,home:'A',away:'B'}]),[]); });
test('lastRound resume solo la última fecha jugada',()=>{
 const s=lastRound([m(1,'A','B','2026-11-01T20:00Z',1,0),m(2,'C','D','2026-11-01T22:00Z',0,0),m(3,'A','C','2026-11-08T20:00Z',3,0),m(4,'B','D','2026-11-08T22:00Z',1,2)]);
 assert.equal(s.n,2);assert.equal(s.goals,6);assert.equal(s.home,1);assert.equal(s.away,1);assert.equal(s.biggest.id,3);
 assert.equal(lastRound([]),null);
});
test('highImpact elige los cruces entre mejor ubicados de la próxima fecha',()=>{
 const rows=[{name:'A',team_id:'A',rank:1,pts:30},{name:'B',team_id:'B',rank:2,pts:28},{name:'C',team_id:'C',rank:9,pts:10},{name:'D',team_id:'D',rank:10,pts:9}];
 const r=highImpact(rows,[m(1,'C','D','2026-11-15T20:00Z'),m(2,'A','B','2026-11-15T22:00Z')],1);
 assert.equal(r.items[0].match.id,2);assert.equal(r.items[0].gap,2);
 assert.equal(highImpact(rows,[]),null);
});
test('streaks usa solo los últimos cinco resultados publicados',()=>{
 const rows=[{name:'A',rank:1,form:['V','V','V','V','E']},{name:'B',rank:2,form:['E','D','D','E','D']},{name:'C',rank:3,form:['V','D']}];
 const s=streaks(rows);
 assert.deepEqual(s.hot.map(t=>t.name),['A']);assert.deepEqual(s.cold.map(t=>t.name),['B']);
});
