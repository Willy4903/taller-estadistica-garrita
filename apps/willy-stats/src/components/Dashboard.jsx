import React,{useState,useMemo} from 'react';
import {Info,AlertTriangle,RefreshCw,ChevronLeft,ChevronRight,ArrowUp,ArrowDown} from 'lucide-react';
import {Crest,Form,Num,LeagueMark} from './ui.jsx';
import {Radar,GoalsChart,MetricBars} from './Charts.jsx';
import {Standings} from './Standings.jsx';
import {GroupChips} from './GroupPicker.jsx';
import {radarAxes,stamp,matchdays,matchdayLabel,groupLabel} from '../lib.js';
import {number} from '../data.js';

const card='rounded-2xl border border-white/[.08] bg-[#162032]';
const signed=(v,d=0)=>v>0?`+${number(v,d)}`:number(v,d);

function SourceNote({publication,groupName,loadError,refreshing,onRefresh}){
  const stale=publication&&!publication.historical&&Date.now()-Date.parse(publication.updated_at)>36*3600*1000;
  let warn=false,text;
  if(!publication){warn=true;text='Todavía no hay una captura publicada para esta competición. No se muestran cifras.';}
  else if(publication.historical){warn=true;text=`Archivo de la temporada ${publication.season}${groupName?` (${groupName})`:''}. No es la clasificación vigente. Fuente: ${publication.provider||'proveedor'}. Captura: ${stamp(publication.updated_at)}.`;}
  else if(stale){warn=true;text=`La captura tiene más de 36 horas (${stamp(publication.updated_at)}). Puede estar desactualizada.`;}
  else text=`Temporada ${publication.season} · Fuente: ${publication.provider||'proveedor'} · Captura: ${stamp(publication.updated_at)}. No es un marcador en vivo.`;
  return <div role="status" className={`mt-3 flex items-start gap-2 text-[11px] leading-relaxed ${warn?'rounded-xl border border-[#EAB308]/40 bg-[#EAB308]/10 px-3 py-2 text-yellow-100':'text-slate-500'}`}>
    {warn?<AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true"/>:<Info size={14} className="mt-0.5 shrink-0" aria-hidden="true"/>}
    <span className="flex-1">{text}{publication?.warnings?.length?' Los partidos no estuvieron disponibles en esta captura.':''}{loadError&&' No se pudo recargar; se conserva la última captura.'}</span>
    <button onClick={onRefresh} className="-my-1.5 grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 hover:text-white" aria-label="Recargar captura publicada"><RefreshCw size={13} className={refreshing?'animate-spin':''}/></button>
  </div>;
}

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

function Fixtures({fixtures,results,favorites,savedOnly,type,onType}){
  const days=useMemo(()=>matchdays(type==='next'?fixtures:results),[type,fixtures,results]);
  const [picked,setPicked]=useState(null);
  const idx=Math.min(picked??(type==='next'?0:days.length-1),days.length-1);
  const day=(days[idx]||[]).filter(m=>!savedOnly||favorites.includes(m.home)||favorites.includes(m.away));
  const when=iso=>Number.isFinite(Date.parse(iso))?new Date(iso).toLocaleString('es-PE',{weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'America/Lima'}):'Por definir';
  const change=t=>{setPicked(null);onType(t);};
  return <div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div role="group" aria-label="Tipo de partidos" className="inline-flex rounded-lg border border-white/[.08] bg-[#0B111E] p-1">
        {[['next','Próximos'],['played','Resultados']].map(([v,l])=><button key={v} aria-pressed={type===v} onClick={()=>change(v)} className={`rounded-md px-4 py-1.5 text-sm ${type===v?'bg-[#10B981] font-semibold text-[#04210F]':'text-slate-300'}`}>{l}</button>)}
      </div>
      {days.length>0&&<div className="flex items-center gap-2 text-sm">
        <button aria-label="Fecha anterior" disabled={idx<=0} onClick={()=>setPicked(idx-1)} className="grid h-11 w-11 place-items-center rounded-lg bg-[#1E293B] text-slate-200 disabled:opacity-30"><ChevronLeft size={16}/></button>
        <span className="min-w-[150px] text-center text-slate-200" aria-live="polite">{type==='next'?'Próxima fecha':'Última fecha'}{idx!==(type==='next'?0:days.length-1)&&` (${idx+1} de ${days.length})`}<br/><span className="text-xs text-slate-400">{matchdayLabel(days[idx])}</span></span>
        <button aria-label="Fecha siguiente" disabled={idx>=days.length-1} onClick={()=>setPicked(idx+1)} className="grid h-11 w-11 place-items-center rounded-lg bg-[#1E293B] text-slate-200 disabled:opacity-30"><ChevronRight size={16}/></button>
      </div>}
    </div>
    {!day.length?<p className="rounded-xl border border-dashed border-white/[.08] p-8 text-center text-sm text-slate-400">{type==='next'?'No hay próximos partidos en la captura publicada.':'No hay resultados recientes en la captura publicada.'}</p>
    :<ul className="space-y-1.5">{day.map(m=><li key={m.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg bg-white/[.02] px-2 py-3 text-sm">
      <span className="text-right font-medium text-white">{m.home}</span>
      <span className="min-w-[96px] text-center">{m.hg==null?<Num className="text-xs text-slate-400">{when(m.date)}</Num>:<Num className="rounded-md bg-[#1E293B] px-3 py-1 font-bold text-white">{m.hg} - {m.ag}</Num>}</span>
      <span className="font-medium text-white">{m.away}</span></li>)}</ul>}
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
        <select value={team.name} onChange={e=>onFocus(e.target.value)} className="min-h-11 max-w-[190px] rounded-lg border border-white/[.08] bg-[#0B111E] px-2 text-base text-white sm:text-sm">{played.map(r=><option key={r.name} value={r.name}>{r.rank}. {r.name}</option>)}</select></label>
    </div>
    <div className="mt-3 grid items-center gap-4 @md:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
      <div className="mx-auto w-full max-w-[260px]"><Radar axes={axes} teamName={team.name}/></div>
      <MetricBars items={axes.map((a,i)=>({label:labels[i],value:values[i],score:a.team,avg:a.avg}))}/>
    </div>
    <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500"><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-[#10B981]"/>{team.name}</span><span className="flex items-center gap-1"><i className="h-2 w-0.5 bg-[#94A3B8]"/>Promedio {national?'del grupo':'de la liga'}</span><span>Escala 0-100 frente al resto. Sin posesión ni xG: la fuente no los entrega.</span></p>
  </section>;
}

export function Dashboard(p){
  const {league,rows,tab,publication,groups,group,onGroup,results}=p;
  const national=league.teamType==='national',groupName=groups.length>1?groupLabel(groups[group]?.name,group).full:null;
  return <section id="dashboard" className="mx-auto mt-6 max-w-[1440px] px-4 md:px-8">
    <div className="flex min-w-0 items-center gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/[.08] bg-[#162032]"><LeagueMark league={league} size={32}/></span>
      <div className="min-w-0"><p className="text-xs text-slate-400">{league.country} · {league.continent}{groupName&&<> · <span className="font-semibold text-[#10B981]">{groupName}</span></>}</p><h2 className="font-heading text-2xl font-extrabold tracking-tight text-white md:text-3xl">{league.name}</h2></div></div>
    <SourceNote publication={publication} groupName={groupName} loadError={p.loadError} refreshing={p.refreshing} onRefresh={p.onRefresh}/>
    <div className="mt-4 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,65fr)_minmax(0,35fr)]">
      <div role="tabpanel" id="panel-main" aria-labelledby={`tab-${tab}`} className={`${card} min-w-0 p-3 md:p-5`}>
        <GroupChips groups={groups} group={group} onGroup={onGroup}/>
        {tab!=='table'&&<h3 className="mb-3 font-heading text-sm font-bold uppercase tracking-wider text-slate-300">{{table:national?'Tabla del grupo':'Tabla de posiciones',teams:national?'Selecciones':'Equipos',fixtures:'Partidos',advanced:'Estadísticas avanzadas'}[tab]}</h3>}
        {tab==='table'&&<Standings title={national?'Tabla del grupo':'Tabla de posiciones'} rows={rows} leagueId={league.id} national={national} favorites={p.favorites} onFavorite={p.onFavorite} onDetail={p.onDetail} query={p.query} onQuery={p.onQuery} savedOnly={p.savedOnly} onClearSaved={p.onClearSaved} highlight={p.highlight}/>}
        {tab==='teams'&&<Teams rows={rows} leagueId={league.id} favorites={p.favorites} onDetail={p.onDetail} onFocus={p.onFocus}/>}
        {tab==='fixtures'&&<Fixtures key={`${league.id}:${group}`} fixtures={p.fixtures} results={results} favorites={p.favorites} savedOnly={p.savedOnly} type={p.fixtureType} onType={p.onFixtureType}/>}
        {tab==='advanced'&&<Advanced rows={rows} leagueId={league.id} national={national} onDetail={p.onDetail}/>}
      </div>
      <aside className="min-w-0 space-y-5" aria-label="Visualizaciones">
        <GoalsCard rows={rows} focus={p.focus} onFocus={p.onFocus} national={national}/>
        <MetricsCard rows={rows} focus={p.focus} onFocus={p.onFocus} national={national}/>
      </aside>
    </div>
  </section>;
}
