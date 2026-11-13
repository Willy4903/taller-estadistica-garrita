import {test} from 'node:test';
import assert from 'node:assert/strict';
import {competitions,parity,goalsPerMatch} from './data.js';
import {getRows,matchesForTeams,matchdays,lastRound,highImpact,streaks} from './lib.js';

const m=(id,home,away,date,hg=null,ag=null)=>({id,home,away,date,hg,ag,home_id:home,away_id:away});

test('17 competiciones con identificador único',()=>{
 assert.equal(competitions.length,17);
 assert.equal(new Set(competitions.map(c=>c.id)).size,17);
});
test('Nations League es una competición europea de selecciones con grupos',()=>{
 const l=competitions.find(c=>c.id==='unl');
 assert.equal(l.code,'uefa.nations');assert.equal(l.continent,'Europa');
 assert.equal(l.teamType,'national');assert.equal(l.format,'groups');
 assert.deepEqual(getRows({league:l,snapshot:{},group:0}),[]);
});
test('partidos de selecciones: filtra otros grupos y conserva cruces eliminatorios',()=>{
 const rows=[{name:'España',team_id:'esp'},{name:'Portugal',team_id:'por'}];
 const list=[m(1,'España','Portugal','2026-11-12T20:00Z'),m(2,'Inglaterra','Grecia','2026-11-12T20:00Z'),m(3,'España','Inglaterra','2027-03-25T20:00Z')];
 list[0].home_id='esp';list[0].away_id='por';list[2].home_id='esp';
 assert.deepEqual(matchesForTeams(list,rows).map(g=>g.id),[1,3]);
 assert.deepEqual(matchesForTeams(list,[]),[]);
});
test('partidos de selecciones: identidad exacta y nombre solo si falta el ID',()=>{
 const rows=[{name:'España',team_id:'esp'}];
 const list=[{id:1,home:'España',away:'Portugal'},{id:2,home:'España',home_id:'otro',away:'Portugal',away_id:'por'},
 {id:3,home:'España juvenil',away:'Portugal'}];
 assert.deepEqual(matchesForTeams(list,rows).map(g=>g.id),[1]);
 assert.deepEqual(matchesForTeams([{id:4,home:'España',home_id:5,away:'Portugal'}],[{name:'España'}]).map(g=>g.id),[4]);
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

import {groupLabel,teamGroups,matchGroup,matchState,tickerItems,relativeDay} from './lib.js';
test('nombres de grupo legibles y con liga',()=>{
 assert.deepEqual(groupLabel('Group A2'),{tier:'Liga A',label:'Grupo 2',full:'Liga A · Grupo 2',code:'A2'});
 assert.equal(groupLabel('Liga B · Grupo 1').full,'Liga B · Grupo 1');assert.equal(groupLabel('Liga B · Grupo 1').code,'B1');
 assert.deepEqual(groupLabel('Group H'),{tier:null,label:'Grupo H',full:'Grupo H',code:'H'});
 assert.equal(groupLabel('Eastern Conference').label,'Conferencia Este');
 assert.equal(groupLabel('2026 Clausura',0).code,'1');
});
test('grupo de cada partido, con cruces entre grupos',()=>{
 const find=teamGroups([{rows:[{name:'España',team_id:'1'},{name:'Portugal',team_id:'2'}]},{rows:[{name:'Grecia',team_id:'3'}]}]);
 assert.equal(matchGroup({home:'España',home_id:'1',away:'Portugal',away_id:'2'},find),0);
 assert.equal(matchGroup({home:'España',home_id:'1',away:'Grecia',away_id:'3'},find),'cross');
 assert.equal(matchGroup({home:'Italia',away:'Francia'},find),null);
});
test('estado del partido sin simular marcadores en vivo',()=>{
 const now=Date.parse('2026-11-13T18:00Z');
 assert.equal(matchState({date:'2026-11-13T19:45Z'},now).kind,'soon');
 assert.equal(matchState({date:'2026-11-14T19:45Z'},now).kind,'scheduled');
 assert.equal(matchState({date:'2026-11-13T17:00Z'},now).kind,'started');
 assert.equal(matchState({date:'2026-11-13T12:00Z'},now).kind,'pending');
 assert.equal(matchState({date:'2026-11-13T12:00Z',hg:1,ag:0},now).kind,'final');
 assert.equal(relativeDay(Date.parse('2026-11-14T19:45Z'),now),'Mañana');
});
test('carrusel: orden cronológico y un separador por día de Lima',()=>{
 const now=Date.parse('2026-11-13T18:00Z');
 const items=tickerItems([m(2,'C','D','2026-11-14T19:45Z'),m(1,'A','B','2026-11-13T19:45Z'),m(3,'E','F','2026-11-14T03:00Z')],now);
 // 03:00Z del 14 es el 13 por la noche en Lima.
 assert.deepEqual(items.map(i=>i.type==='day'?i.rel:i.match.id),['Hoy',1,3,'Mañana',2]);
});

import {splitTables,movement,scorers,cardTotals,goalsByMatchday,totalMatches,probabilities,coverage,shortSeason} from './lib.js';
const row=(name,id,pj,g,e,p,gf,gc,rank)=>({name,team_id:id,rank,pj,g,e,p,gf,gc,dg:gf-gc,pts:3*g+e,form:[]});
const res=(id,h,hid,a,aid,date,hg,ag,extra={})=>({id,home:h,home_id:hid,away:a,away_id:aid,date,hg,ag,...extra});
const grp=[row('A','1',2,2,0,0,4,1,1),row('B','2',2,1,0,1,3,2,2),row('C','3',2,0,0,2,0,4,3)];
const played=[res('m1','A','1','B','2','2026-09-05T19:00Z',2,1,{goals:[{team_id:'1',player:'Ana'},{team_id:'1',player:'Ana',penalty:true},{team_id:'2',player:'Bea'}],cards:[{card:'Y'}]}),
 res('m2','C','3','A','1','2026-10-10T19:00Z',0,2,{goals:[{team_id:'1',player:'Ana'},{team_id:'1',player:'Leo',own_goal:false}],cards:[{card:'Y'},{card:'R'}]}),
 res('m3','B','2','C','3','2026-10-03T19:00Z',2,0,{goals:[{team_id:'2',player:'Bea'},{team_id:'3',player:'Cid',own_goal:true}],cards:[]})];
test('local y visitante solo con cobertura completa',()=>{
 const s=splitTables(grp,played);
 assert.deepEqual(s.home.map(r=>[r.name,r.pts]),[['B',3],['A',3],['C',0]]);
 assert.equal(s.away.find(r=>r.name==='A').pts,3);
 assert.equal(splitTables(grp,played.slice(1)),null,'faltan partidos: no se calcula');
 assert.equal(coverage(grp,played),true);
});
test('movimiento respecto a la fecha anterior',()=>{
 const mv=movement(grp,played);
 assert.equal(mv.get('A'),1);assert.equal(mv.get('B'),-1);assert.equal(mv.get('C'),0);
});
test('goleadores exigen detalle que cuadre con el marcador y excluyen autogoles',()=>{
 const s=scorers(grp,played);
 assert.deepEqual(s.map(x=>[x.player,x.goals]),[['Ana',3],['Bea',2],['Leo',1]]);
 assert.equal(scorers(grp,[res('x','A','1','B','2','2026-09-05T19:00Z',1,0,{goals:[]})]),null);
 assert.equal(scorers(grp,[res('x','A','1','B','2','2026-09-05T19:00Z',1,0)]),null);
});
test('tarjetas solo con detalle en todos los partidos',()=>{
 assert.deepEqual(cardTotals(played),{yellow:2,red:1,matches:3});
 assert.equal(cardTotals([...played,res('y','A','1','C','3','2026-11-01T19:00Z',1,1)]),null);
});
test('goles por fecha, total de partidos y temporada corta',()=>{
 assert.deepEqual(goalsByMatchday(played).map(d=>d.goals),[3,2,2]);
 assert.equal(totalMatches({teamType:'national'},4),12);
 assert.equal(totalMatches({format:'league'},20),380);
 assert.equal(totalMatches({format:'playoffs'},20),null);
 assert.equal(shortSeason('2026-27 UEFA Nations League'),'2026-27');
});
test('probabilidades suman 100 y favorecen al mejor equipo',()=>{
 const p=probabilities(grp[0],grp[2],grp);
 assert(Math.abs(p.home+p.draw+p.away-100)<1e-9);
 assert(p.home>p.away);
 assert.equal(probabilities({pj:0},grp[1],grp),null);
});
