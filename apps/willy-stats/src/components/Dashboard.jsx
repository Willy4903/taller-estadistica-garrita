import React from 'react';
import {Info,AlertTriangle,RefreshCw} from 'lucide-react';
import {Crest,Form,Num,Photo,LeagueMark} from './ui.jsx';
import {Radar,Momentum,XgTimeline,IclBars} from './Charts.jsx';
import {Standings} from './Standings.jsx';
import {radarAxes,ASSETS,stamp} from '../lib.js';
import {number,metrics} from '../data.js';

const TABS=[['table','Tabla de posiciones'],['performance','Rendimiento'],['both','Vista integrada'],['fixtures','Partidos']];

function SourceNote({source,publication,groupName,loadError,refreshing,onRefresh}){
  const stale=publication&&!publication.historical&&Date.now()-Date.parse(publication.updated_at)>36*3600*1000;
  let tone='border-[#26303D] bg-[#161C24] text-gray-300',text;
  if(source==='demo'){tone='border-[#F97316]/40 bg-[#F97316]/10 text-orange-200';text='Datos de demostración. Escenario ficticio generado por el programa, no es una clasificación real.';}
  else if(!publication){tone='border-[#EAB308]/40 bg-[#EAB308]/10 text-yellow-100';text='Todavía no hay una captura publicada para esta competición.';}
  else if(publication.historical){tone='border-[#EAB308]/40 bg-[#EAB308]/10 text-yellow-100';text=`Archivo de la temporada ${publication.season}${groupName?` (${groupName})`:''}. No es la clasificación vigente. Fuente: ${publication.provider||'proveedor'}. Captura: ${stamp(publication.updated_at)}.`;}
  else if(stale){tone='border-[#EAB308]/40 bg-[#EAB308]/10 text-yellow-100';text=`La captura tiene más de 36 horas (${stamp(publication.updated_at)}). Puede estar desactualizada.`;}
  else text=`Temporada ${publication.season}${groupName?` · ${groupName}`:''}. Captura del ${stamp(publication.updated_at)}. Fuente: ${publication.provider||'proveedor'}. No es un marcador en vivo.`;
  return <div role="status" className={`mt-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs leading-relaxed ${tone}`}>
    {tone.includes('EAB308')||tone.includes('F97316')?<AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true"/>:<Info size={14} className="mt-0.5 shrink-0" aria-hidden="true"/>}
    <span className="flex-1">{text}{source==='published'&&publication?.warnings?.length?' Los partidos no estuvieron disponibles en esta captura.':''}{loadError&&' No se pudo recargar; se conserva la última captura.'}</span>
    <button onClick={onRefresh} className="flex shrink-0 items-center gap-1 text-gray-300 hover:text-white" aria-label="Recargar captura publicada"><RefreshCw size={13} className={refreshing?'animate-spin':''}/></button>
  </div>;
}

function Performance({rows,league,leader,reading}){
  if(!leader)return <p className="rounded-xl border border-dashed border-[#26303D] p-8 text-center text-sm text-gray-400">Sin datos para calcular el rendimiento.</p>;
  const axes=radarAxes(rows,leader);
  const pills=[['Partidos jugados',leader.pj],['Goles a favor',leader.gf],['Rendimiento',`${number(leader.effectiveness)}%`],['Goles por partido',number(leader.gf/leader.pj,2)]];
  return <div>
    <div className="rounded-lg bg-[#FEF3C7] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[#78350F]">Modo análisis · Métricas y rendimiento de {leader.name}, líder de la tabla.</div>
    <div className="mt-5 grid gap-6 md:grid-cols-[1fr_1.1fr] xl:grid-cols-[1fr_1.2fr_.8fr]">
      <figure className="md:col-span-2 xl:col-span-1">
        <div className="relative overflow-hidden rounded-xl border border-[#26303D]"><Photo src={ASSETS.celebration} alt="Imagen ilustrativa de celebración de un equipo de fútbol" className="h-44 w-full xl:h-56"/>
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-[#0B0E11] to-transparent p-3"><Crest name={leader.name} leagueId={league.id} logo={leader.logo} size={34}/><figcaption className="font-heading text-lg font-extrabold leading-tight text-white">{leader.name}</figcaption></div></div>
        <p className="mt-1.5 text-[11px] text-gray-500">Fotografía ilustrativa; no corresponde al club.</p>
      </figure>
      <div><Radar axes={axes} teamName={leader.name}/><p className="mt-1 text-center text-xs text-gray-400"><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#22C55E]"/>{leader.name} <i className="ml-3 mr-1 inline-block h-2 w-2 rounded-sm bg-[#F97316]"/>Promedio de la liga</p></div>
      <dl className="grid grid-cols-2 gap-2 md:col-span-2 xl:col-span-1 xl:grid-cols-1">
        {pills.map(([l,v])=><div key={l} className="flex items-center justify-between rounded-lg bg-[#1A212B] px-3 py-2.5"><dt className="text-xs text-gray-300">{l}</dt><dd><Num className="rounded bg-[#22C55E]/15 px-2 py-0.5 text-sm font-bold text-[#22C55E]">{v}</Num></dd></div>)}
        <p className="col-span-full text-[11px] leading-relaxed text-gray-500">Ejes calculados con los puntos, goles y últimos resultados de la tabla, normalizados contra el resto de la liga. No incluyen xG, posesión ni presión porque la fuente no los entrega.</p>
      </dl>
    </div>
  </div>;
}

function Fixtures({fixtures,results,favorites,savedOnly,type,onType}){
  const list=(type==='next'?fixtures:results).filter(m=>!savedOnly||favorites.includes(m.home)||favorites.includes(m.away));
  const when=iso=>new Date(iso).toLocaleString('es-PE',{weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'America/Lima'});
  return <div>
    <div role="group" aria-label="Tipo de partidos" className="mb-4 inline-flex rounded-lg border border-[#1E2630] bg-[#0B0E11] p-1">
      {[['next','Próximos'],['played','Resultados']].map(([v,l])=><button key={v} aria-pressed={type===v} onClick={()=>onType(v)} className={`rounded-md px-4 py-1.5 text-sm ${type===v?'bg-[#22C55E] font-semibold text-[#04210F]':'text-gray-300'}`}>{l}</button>)}
    </div>
    {!list.length?<p className="rounded-xl border border-dashed border-[#26303D] p-8 text-center text-sm text-gray-400">{type==='next'?'No hay próximos partidos en la captura publicada.':'No hay resultados recientes en la captura publicada.'}</p>
    :<ul className="divide-y divide-[#1E2630]">{list.slice(0,24).map(m=><li key={m.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-3 text-sm">
      <span className="text-right text-white">{m.home}</span>
      <span className="min-w-[88px] text-center">{m.hg==null?<Num className="text-xs text-gray-400">{when(m.date)}</Num>:<Num className="rounded bg-[#1A212B] px-3 py-1 font-bold text-white">{m.hg} - {m.ag}</Num>}</span>
      <span className="text-white">{m.away}</span></li>)}</ul>}
  </div>;
}

export function Dashboard(p){
  const {league,rows,tab,onTab,publication,source,groupName,groups,group,onGroup,onSource,venue,onVenue,reading}=p;
  const leader=reading?.leader;
  const showTable=tab==='table'||tab==='both',showPerf=tab==='performance'||tab==='both';
  return <section id="dashboard" className="panel rounded-2xl border border-[#1E2630] bg-[#12171D] p-4 md:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-3"><LeagueMark league={league} size={40}/><div><p className="text-xs text-gray-400">{league.country} · {league.continent}</p><h2 className="font-heading text-2xl font-extrabold text-white">{league.name}</h2></div></div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
        {source==='published'&&groups.length>1&&<label className="flex items-center gap-2">Tabla<select value={group} onChange={e=>onGroup(+e.target.value)} className="rounded-lg border border-[#26303D] bg-[#0B0E11] px-2 py-1.5 text-gray-200">{groups.map((g,i)=><option key={i} value={i}>{g.name}</option>)}</select></label>}
        {source==='demo'&&<label className="flex items-center gap-2">Sede<select value={venue} onChange={e=>onVenue(e.target.value)} className="rounded-lg border border-[#26303D] bg-[#0B0E11] px-2 py-1.5 text-gray-200"><option value="all">General</option><option value="home">Local</option><option value="away">Visitante</option></select></label>}
        <label className="flex items-center gap-2">Datos<select value={source} onChange={e=>onSource(e.target.value)} className="rounded-lg border border-[#26303D] bg-[#0B0E11] px-2 py-1.5 text-gray-200"><option value="published">Datos publicados</option><option value="demo">Demostración (ficticia)</option></select></label>
      </div>
    </div>
    <SourceNote source={source} publication={publication} groupName={groupName} loadError={p.loadError} refreshing={p.refreshing} onRefresh={p.onRefresh}/>
    <div role="tablist" aria-label="Análisis de la liga" className="mt-4 flex gap-1 overflow-x-auto border-b border-[#1E2630]" onKeyDown={e=>{const ids=TABS.map(t=>t[0]),i=ids.indexOf(tab);if(e.key==='ArrowRight')onTab(ids[(i+1)%ids.length]);if(e.key==='ArrowLeft')onTab(ids[(i+ids.length-1)%ids.length]);}}>
      {TABS.map(([id,label])=><button key={id} role="tab" id={`tab-${id}`} aria-selected={tab===id} aria-controls="panel-main" tabIndex={tab===id?0:-1} onClick={()=>onTab(id)} className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm transition ${tab===id?'border-[#22C55E] font-semibold text-white':'border-transparent text-gray-400 hover:text-gray-200'}`}>{label}</button>)}
    </div>
    <div role="tabpanel" id="panel-main" aria-labelledby={`tab-${tab}`} className="mt-5 space-y-8">
      {showTable&&<Standings rows={rows} leagueId={league.id} favorites={p.favorites} onFavorite={p.onFavorite} onDetail={p.onDetail} query={p.query} onQuery={p.onQuery} savedOnly={p.savedOnly} onClearSaved={p.onClearSaved}/>}
      {showPerf&&<Performance rows={rows} league={league} leader={leader} reading={reading}/>}
      {tab==='fixtures'&&<Fixtures fixtures={p.fixtures} results={p.results} favorites={p.favorites} savedOnly={p.savedOnly} type={p.fixtureType} onType={p.onFixtureType}/>}
    </div>
  </section>;
}

export function ReadingCard({league,reading,source,projection}){
  if(!reading)return <section className="rounded-2xl border border-[#10B981]/30 bg-gradient-to-br from-[#0F291E] via-[#11221C] to-[#0B1612] p-6">
    <p className="font-mono text-xs uppercase tracking-wider text-[#22C55E]">La lectura de Willy Stats</p><h3 className="mt-1 font-heading text-2xl font-extrabold text-white">Sin lectura disponible.</h3>
    <p className="mt-2 text-sm text-gray-300">No hay una tabla con partidos jugados para {league.name}.</p></section>;
  const {leader,second,gap,ppg,attackRank,defenseRank}=reading;
  const strengths=[attackRank===1&&'mejor ataque por partido',defenseRank===1&&'mejor defensa por partido'].filter(Boolean);
  const proj=projection?.find(t=>t.name===leader.name);
  const kpis=source==='demo'&&proj
    ?[[`${number(proj.prob)}%`,'Prob. de título (ilustrativa)'],[`${proj.points} PTS`,'Puntos proyectados'],[`${number(leader.effectiveness)}%`,'% de efectividad'],[number(ppg,2),'Puntos por partido']]
    :[[number(ppg,2),'Puntos por partido'],[`${number(leader.effectiveness)}%`,'% de efectividad'],[leader.dg>0?`+${leader.dg}`:`${leader.dg}`,'Diferencia de gol'],[gap==null?'—':`${gap} PTS`,'Ventaja sobre el 2.º']];
  return <section aria-label="La lectura de Willy Stats" className="rounded-2xl border border-[#10B981]/30 bg-gradient-to-br from-[#0F291E] via-[#11221C] to-[#0B1612] p-6">
    <p className="font-mono text-xs uppercase tracking-wider text-[#22C55E]">La lectura de Willy Stats</p>
    <h3 className="mt-1 font-heading text-2xl font-extrabold text-white">{leader.name} marca el paso.</h3>
    <p className="mt-2 text-sm leading-relaxed text-gray-300">{second?(gap===0?`Empata en puntos con ${second.name}.`:`Tiene ${gap} ${gap===1?'punto':'puntos'} de ventaja sobre ${second.name}.`):'Es el único club con partidos jugados.'}{strengths.length?` Además tiene el ${strengths.join(' y el ')} de la tabla.`:''}</p>
    <dl className="mt-6 grid grid-cols-2 gap-2 border-t border-[#10B981]/20 pt-4 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
      {kpis.map(([v,l])=><div key={l} className="rounded-lg bg-black/20 p-2.5"><dd><Num className="text-xl font-bold text-[#22C55E] 2xl:text-lg">{v}</Num></dd><dt className="mt-1 text-[11px] leading-tight text-gray-400">{l}</dt></div>)}
    </dl>
  </section>;
}

export function SideCards({leader,iclItems}){
  return <>
    <section className="rounded-2xl border border-[#1E2630] bg-[#12171D] p-6" aria-label="Telemetría ilustrativa">
      <div className="flex items-start justify-between gap-2"><h3 className="font-heading text-lg font-bold text-white">Live match momentum</h3><span className="shrink-0 rounded-full border border-[#F97316]/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-orange-300">Ilustrativo</span></div>
      <p className="mb-2 text-xs text-gray-500">Simulación de ejemplo. Los datos de partido a partido no están disponibles en la fuente.</p>
      <Momentum home={leader?.name||'Local'}/><XgTimeline home={leader?.name||'Local'}/>
    </section>
    <section className="rounded-2xl border border-[#1E2630] bg-[#12171D] p-6" aria-label="League Competitiveness Index">
      <h3 className="font-heading text-lg font-bold text-white">League Competitiveness Index</h3>
      <p className="mb-3 text-xs text-gray-500">Paridad de la tabla (0 a 10), calculada con los puntos por partido. No mide calidad entre ligas.</p>
      <IclBars items={iclItems}/>
    </section>
  </>;
}
