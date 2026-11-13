import React,{useState,useMemo,useEffect} from 'react';
import {ArrowUp,ArrowDown,Lock} from 'lucide-react';
import {Crest,Form,Num} from './ui.jsx';
import {Radar,GoalsChart,MetricBars} from './Charts.jsx';
import {Standings} from './Standings.jsx';
import {ContextBar} from './ContextBar.jsx';
import {Kpis,ScorersCard,HistoryCard,GoalsByRoundCard,MatchList,NextRoundCard,DisciplineCard,card} from './Modules.jsx';
import {radarAxes,groupLabel,splitTables,movement,scorers,cardTotals,cardsByTeam,goalsByMatchday,totalMatches,coverage,highImpact} from '../lib.js';
import {number,goalsPerMatch} from '../data.js';

const signed=(v,d=0)=>v>0?`+${number(v,d)}`:number(v,d);

function Teams({rows,leagueId,favorites,onDetail,onFocus}){
  if(!rows.length)return <p className="rounded-xl border border-dashed border-white/[.08] p-8 text-center text-sm text-slate-400">No hay equipos publicados para esta competición.</p>;
  return <ul className="@container grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
    {rows.map(t=><li key={t.name} className="min-w-0"><button onClick={()=>{onFocus(t.name);onDetail(t);}} className="flex h-full w-full flex-col gap-3 rounded-xl border border-white/[.06] bg-white/[.02] p-3.5 text-left transition hover:-translate-y-0.5 hover:border-white/20">
      <span className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/[.05]"><Crest name={t.name} leagueId={leagueId} logo={t.logo} size={30}/></span>
        <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-white">{t.name}{favorites.includes(t.name)&&<span className="ml-1 text-[#10B981]">★</span>}</span><span className="text-xs text-slate-400"><Num>{t.rank}</Num>.º · <Num>{t.pj}</Num> PJ</span></span>
        <span className="text-right"><Num className="block text-2xl font-extrabold leading-none text-white">{t.pts}</Num><span className="text-[10px] uppercase text-slate-500">pts</span></span>
      </span>
      <span className="block"><span className="mb-1 flex justify-between text-[11px] text-slate-400"><span>Efectividad</span><Num className="text-slate-200">{Number.isFinite(t.effectiveness)?`${number(t.effectiveness)}%`:'—'}</Num></span>
        <span className="block h-1.5 rounded-full bg-white/[.06]"><span className="block h-full rounded-full bg-[#10B981]" style={{width:`${t.effectiveness||0}%`}}/></span></span>
      <span className="flex items-center justify-between gap-2 text-xs text-slate-400"><span>GF <Num className="text-slate-200">{t.gf}</Num> · GC <Num className="text-slate-200">{t.gc}</Num> · DG <Num className={t.dg>0?'text-[#10B981]':t.dg<0?'text-[#EF4444]':'text-slate-200'}>{signed(t.dg)}</Num></span><Form values={t.form} small/></span>
    </button></li>)}
  </ul>;
}

const formPts=t=>t.form?.length?t.form.reduce((s,f)=>s+(f==='V'?3:f==='E'?1:0),0):null;
const COLUMNS=[
  ['ppg','Pts/PJ',t=>t.pts/t.pj,v=>number(v,2),''],
  ['gfp','GF/PJ',t=>t.gf/t.pj,v=>number(v,2),''],
  ['gcp','GC/PJ',t=>t.gc/t.pj,v=>number(v,2),'hidden @md:table-cell'],
  ['dgp','DG/PJ',t=>t.dg/t.pj,v=>signed(v,2),'hidden @md:table-cell'],
  ['eff','% Efect.',t=>t.effectiveness,null,'hidden @sm:table-cell'],
  ['form','Forma',formPts,(v,t)=>v==null?'—':`${v}/${3*t.form.length}`,'hidden @lg:table-cell']
];
function Advanced({rows,leagueId,national,onDetail}){
  const [sort,setSort]=useState(['ppg',-1]);
  const played=rows.filter(r=>r.pj>0);
  const list=useMemo(()=>{const c=COLUMNS.find(x=>x[0]===sort[0]);return [...played].sort((a,b)=>((c[2](a)??-1e9)-(c[2](b)??-1e9))*sort[1]||a.rank-b.rank);},[played,sort]);
  if(!played.length)return <p className="rounded-xl border border-dashed border-white/[.08] p-8 text-center text-sm text-slate-400">Sin partidos jugados para calcular estadísticas.</p>;
  const by=k=>setSort(s=>s[0]===k?[k,-s[1]]:[k,k==='gcp'?1:-1]);
  return <div className="@container">
    <div className="overflow-x-auto"><table className="w-full text-sm tabular-nums">
      <caption className="sr-only">Estadísticas avanzadas por {national?'selección':'club'}, ordenables</caption>
      <thead><tr className="border-b border-white/[.06] text-[11px] uppercase tracking-wider text-slate-500">
        <th scope="col" className="py-2 pl-2 text-left font-medium">{national?'Selección':'Club'}</th>
        {COLUMNS.map(([k,l,,,cls])=><th key={k} scope="col" aria-sort={sort[0]===k?(sort[1]<0?'descending':'ascending'):'none'} className={`px-1.5 py-1 text-right font-medium ${cls}`}>
          <button onClick={()=>by(k)} className={`inline-flex min-h-9 items-center gap-1 uppercase ${sort[0]===k?'text-[#10B981]':'hover:text-slate-300'}`}>{l}{sort[0]===k&&(sort[1]<0?<ArrowDown size={11}/>:<ArrowUp size={11}/>)}</button></th>)}
      </tr></thead>
      <tbody>{list.map(t=><tr key={t.name} onClick={()=>onDetail(t)} className="cursor-pointer border-b border-white/[.04] transition-colors hover:bg-white/[.04]">
        <td className="py-2.5 pl-2"><span className="flex min-w-0 items-center gap-2"><Num className="w-5 text-right text-xs text-slate-500">{t.rank}</Num><Crest name={t.name} leagueId={leagueId} logo={t.logo} size={22}/><span className="max-w-[110px] truncate font-medium text-white @md:max-w-none">{t.name}</span></span></td>
        {COLUMNS.map(([k,,fn,fmt,cls])=>{const v=fn(t);return <td key={k} className={`px-1.5 text-right ${cls}`}>{k==='eff'
          ?<span className="inline-flex items-center gap-2"><span className="hidden h-1.5 w-14 rounded-full bg-white/[.06] @lg:block"><span className="block h-full rounded-full bg-[#10B981]" style={{width:`${v||0}%`}}/></span><Num className="text-slate-200">{number(v)}%</Num></span>
          :<Num className={k==='dgp'?(v>0?'text-[#10B981]':v<0?'text-[#EF4444]':'text-slate-300'):sort[0]===k?'font-semibold text-white':'text-slate-300'}>{fmt(v,t)}</Num>}</td>;})}
      </tr>)}</tbody>
    </table></div>
    <p className="mt-3 text-[11px] leading-relaxed text-slate-500">Toca un encabezado para ordenar. Valores por partido calculados con la tabla publicada. Forma: puntos de los últimos cinco partidos. La fuente no entrega posesión, tiros ni xG.</p>
  </div>;
}

function GoalsCard({rows,focus,onFocus,national}){
  return <section className={`${card} p-4`} aria-label="Goles a favor y en contra">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><h3 className="font-heading text-base font-bold text-white">Goles a favor vs. en contra</h3><p className="text-xs text-slate-400">Por {national?'selección':'equipo'}, en el orden de la tabla</p></div>
      <p className="flex gap-3 text-[11px] text-slate-400"><span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-[#10B981]"/>A favor</span><span className="flex items-center gap-1"><i className="h-0.5 w-3 rounded bg-[#EF4444]"/>En contra</span></p>
    </div>
    <div className="mt-3"><GoalsChart rows={rows} focus={focus} onPick={t=>onFocus(t.name)}/></div>
  </section>;
}

function MetricsCard({rows,focus,onFocus,national}){
  const played=rows.filter(r=>r.pj>0);
  if(!played.length)return null;
  const team=played.find(r=>r.name===focus)||played[0],axes=radarAxes(played,team),fp=formPts(team);
  const values=[number(team.gf/team.pj,2),number(team.gc/team.pj,2),`${number(team.effectiveness)}%`,signed(team.dg/team.pj,2),fp==null?'—':`${fp}/${3*team.form.length}`];
  const labels=['Ataque · goles a favor por partido','Defensa · goles en contra por partido','Efectividad','Diferencia de gol por partido','Forma · puntos en los últimos 5'];
  return <section className={`${card} @container p-4`} aria-label="Métricas de rendimiento">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-heading text-base font-bold text-white">Métricas de rendimiento</h3>
      <label className="relative"><span className="sr-only">{national?'Selección':'Equipo'} a analizar</span>
        <select value={team.name} onChange={e=>onFocus(e.target.value)} className="min-h-11 max-w-[190px] rounded-lg border border-white/[.08] bg-[#080D17] px-2 text-base text-white sm:text-sm">{played.map(r=><option key={r.name} value={r.name}>{r.rank}. {r.name}</option>)}</select></label>
    </div>
    <div className="mt-3 grid items-center gap-4 @md:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
      <div className="mx-auto w-full max-w-[260px]"><Radar axes={axes} teamName={team.name}/></div>
      <MetricBars items={axes.map((a,i)=>({label:labels[i],value:values[i],score:a.team,avg:a.avg}))}/>
    </div>
    <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500"><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-[#10B981]"/>{team.name}</span><span className="flex items-center gap-1"><i className="h-2 w-0.5 bg-[#94A3B8]"/>Promedio {national?'del grupo':'de la liga'}</span><span>Escala 0-100 frente al resto. Sin posesión ni xG: la fuente no los entrega.</span></p>
  </section>;
}

const VIEWS=[['general','General'],['home','Local'],['away','Visitante'],['perf','Rendimiento']];

function TableCard(p){
  const {rows,results,league,national,title,analysis,moves}=p;
  const [view,setView]=useState('general');
  const splits=useMemo(()=>splitTables(rows,results),[rows,results]);
  useEffect(()=>{if(!splits&&(view==='home'||view==='away'))setView('general');},[splits,view]);
  const common={leagueId:league.id,national,favorites:p.favorites,onFavorite:p.onFavorite,onDetail:p.onDetail,query:p.query,onQuery:p.onQuery,savedOnly:p.savedOnly,onClearSaved:p.onClearSaved,analysis};
  const lockMsg='Requiere todos los resultados de la temporada; esta captura solo incluye los partidos recientes.';
  return <div>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <h3 className="font-heading text-sm font-extrabold uppercase tracking-wider text-white">{title}</h3>
      <div role="group" aria-label="Vista de la tabla" className="flex max-w-full overflow-x-auto rounded-full border border-white/[.08] bg-[#080D17] p-1 [scrollbar-width:none]">
        {VIEWS.map(([v,l])=>{const locked=(v==='home'||v==='away')&&!splits;return <button key={v} aria-pressed={view===v} disabled={locked} title={locked?lockMsg:undefined} onClick={()=>setView(v)}
          className={`flex min-h-9 shrink-0 items-center gap-1 rounded-full px-3.5 text-xs transition ${view===v?'bg-[#162032] font-semibold text-white shadow ring-1 ring-white/10':'text-slate-400 hover:text-white'} disabled:cursor-not-allowed disabled:opacity-40`}>{locked&&<Lock size={11} aria-hidden="true"/>}{l}</button>;})}
      </div>
    </div>
    {view==='general'&&<Standings rows={rows} {...common} highlight={p.highlight} moves={moves}/>}
    {view==='home'&&splits&&<Standings rows={splits.home} {...common} emptyText="Sin partidos de local."/>}
    {view==='away'&&splits&&<Standings rows={splits.away} {...common} emptyText="Sin partidos de visita."/>}
    {view==='perf'&&<Advanced rows={rows} leagueId={league.id} national={national} onDetail={p.onDetail}/>}
    {!splits&&rows.length>0&&<p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500"><Lock size={11} aria-hidden="true"/>Local y Visitante: {lockMsg.toLowerCase()}</p>}
  </div>;
}

export function Dashboard(p){
  const {league,rows,tab,publication,groups,group,onGroup,results,fixtures}=p;
  const national=league.teamType==='national',multi=groups.length>1;
  const current=multi?groupLabel(groups[group]?.name,group):null;
  const scope=multi&&(national||current?.tier||/^Grupo/.test(current?.label||''))?'del grupo':'de la liga';
  const byId=useMemo(()=>{const id=new Map(),name=new Map();rows.forEach(r=>{if(r.team_id)id.set(String(r.team_id),r);name.set(r.name,r);});return (i,n)=>(i!=null&&i!==''&&id.get(String(i)))||name.get(n)||null;},[rows]);
  const logos=useMemo(()=>{const id=new Map(),name=new Map();groups.forEach(g=>(g.rows||[]).forEach(r=>{if(r.logo){if(r.team_id)id.set(String(r.team_id),r.logo);name.set(r.name,r.logo);}}));return (i,n)=>id.get(String(i))||name.get(n);},[groups]);
  const moves=useMemo(()=>movement(rows,results),[rows,results]);
  const top=useMemo(()=>scorers(rows,results),[rows,results]);
  const complete=useMemo(()=>coverage(rows,results),[rows,results]);
  const cards=useMemo(()=>cardTotals(results),[results]);
  const rounds=useMemo(()=>goalsByMatchday(results),[results]);
  const discipline=useMemo(()=>cardsByTeam(rows,results),[rows,results]);
  // Con tablas largas, goles y disciplina pasan a la columna derecha para equilibrar alturas.
  const longTable=rows.length>8;
  const keyMatch=useMemo(()=>highImpact(rows,fixtures,1)?.items?.[0]||null,[rows,fixtures]);
  const done=results.filter(m=>m.hg!=null),homeShare=done.length?{home:done.filter(m=>m.hg>m.ag).length,n:done.length}:null;
  const gpgRef=multi?(()=>{const others=groups.filter((_,i)=>i!==group).flatMap(g=>g.rows||[]);return others.length?goalsPerMatch(others):null;})():p.refGpg;
  const tableTitle=multi&&current?`Clasificación · ${current.tier?current.code:current.label}`:'Clasificación';
  return <section id="dashboard" className="mx-auto mt-4 max-w-[1440px] space-y-4 px-4 md:px-8">
    <ContextBar competitions={p.competitions} league={league} onLeague={p.onLeague} groups={groups} group={group} onGroup={onGroup} publication={publication} loadError={p.loadError} refreshing={p.refreshing} onRefresh={p.onRefresh}/>
    <Kpis rows={rows} leagueId={league.id} national={national} scope={scope} played={Math.round(rows.reduce((s,t)=>s+t.pj,0)/2)} total={totalMatches(league,rows.length)}
      gpg={goalsPerMatch(rows)} gpgRef={gpgRef} refLabel={multi?'resto de grupos':'promedio de las otras ligas'} cards={cards} homeShare={homeShare}/>
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,65fr)_minmax(0,35fr)]">
      <div className="min-w-0 space-y-4">
      <div role="tabpanel" id="panel-main" aria-labelledby={`tab-${tab}`} className={`${card} min-w-0 p-3 md:p-5`}>
        {tab==='table'&&<TableCard key={`${league.id}:${group}`} {...p} national={national} title={tableTitle} moves={moves}/>}
        {tab==='history'&&<><h3 className="mb-4 font-heading text-sm font-extrabold uppercase tracking-wider text-white">Histórico de resultados</h3><MatchList list={results} mode="played" rows={rows} results={results} leagueId={league.id} logo={logos} favorites={p.favorites} savedOnly={p.savedOnly} find={byId}/></>}
        {tab==='teams'&&<><h3 className="mb-4 font-heading text-sm font-extrabold uppercase tracking-wider text-white">{national?'Selecciones':'Equipos'}</h3><Teams rows={rows} leagueId={league.id} favorites={p.favorites} onDetail={p.onDetail} onFocus={p.onFocus}/></>}
        {tab==='fixtures'&&<><h3 className="mb-4 font-heading text-sm font-extrabold uppercase tracking-wider text-white">Próximos partidos</h3><MatchList list={fixtures} mode="next" rows={rows} results={results} leagueId={league.id} logo={logos} favorites={p.favorites} savedOnly={p.savedOnly} find={byId}/></>}
        {tab==='advanced'&&<div className="space-y-4"><h3 className="font-heading text-sm font-extrabold uppercase tracking-wider text-white">Estadísticas avanzadas</h3>
          <div className="grid gap-4 xl:grid-cols-2"><GoalsCard rows={rows} focus={p.focus} onFocus={p.onFocus} national={national}/><MetricsCard rows={rows} focus={p.focus} onFocus={p.onFocus} national={national}/></div>
          <Advanced rows={rows} leagueId={league.id} national={national} onDetail={p.onDetail}/></div>}
      </div>
      {tab==='table'&&<>
        <NextRoundCard fixtures={fixtures} rows={rows} results={results} leagueId={league.id} logo={logos} favorites={p.favorites} find={byId} onTab={p.onTab} limit={longTable?8:5}/>
        {!longTable&&<div className={`grid gap-4 ${discipline?.length?'md:grid-cols-2':''}`}>
          <GoalsCard rows={rows} focus={p.focus} onFocus={p.onFocus} national={national}/>
          <DisciplineCard list={discipline} leagueId={league.id} complete={complete}/>
        </div>}
      </>}
      </div>
      <aside className="min-w-0 space-y-4" aria-label="Módulos de análisis">
        <ScorersCard list={top} scope={scope} complete={complete} leagueId={league.id} logo={logos}/>
        <HistoryCard results={results} keyMatch={keyMatch} rows={rows} leagueId={league.id} logo={logos} onTab={p.onTab}/>
        <GoalsByRoundCard days={rounds}/>
        {longTable&&tab!=='advanced'&&<><DisciplineCard list={discipline} leagueId={league.id} complete={complete}/><GoalsCard rows={rows} focus={p.focus} onFocus={p.onFocus} national={national}/></>}
      </aside>
    </div>
  </section>;
}
