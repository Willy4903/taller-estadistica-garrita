import React,{useState,useEffect,useRef,useMemo} from 'react';
import {ChevronDown,ChevronRight,ChevronLeft,RefreshCw,Check,Info,AlertTriangle} from 'lucide-react';
import {LeagueMark,Num} from './ui.jsx';
import {groupLabel,shortSeason,stamp} from '../lib.js';

/** Píldora con menú desplegable. Se cierra con Escape, al elegir o al tocar fuera. */
function Pill({label,value,children,wide=false,menuLabel}){
  const [open,setOpen]=useState(false),root=useRef(null),btn=useRef(null);
  useEffect(()=>{
    if(!open)return;
    const out=e=>{if(!root.current?.contains(e.target))setOpen(false);};
    const esc=e=>{if(e.key==='Escape'){setOpen(false);btn.current?.focus();}};
    document.addEventListener('pointerdown',out);document.addEventListener('keydown',esc);
    requestAnimationFrame(()=>root.current?.querySelector('[data-menu] [aria-pressed="true"],[data-menu] button')?.focus());
    return()=>{document.removeEventListener('pointerdown',out);document.removeEventListener('keydown',esc);};
  },[open]);
  return <div ref={root} className="relative">
    <button ref={btn} aria-expanded={open} aria-haspopup="true" aria-label={`${menuLabel}: ${value}`} onClick={()=>setOpen(o=>!o)}
      className={`flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-xs transition sm:gap-2 sm:px-4 sm:text-sm ${open?'border-[#10B981] bg-[#10B981]/10':'border-[#10B981]/40 bg-[#10B981]/[.06] hover:border-[#10B981]'}`}>
      <span className="font-semibold uppercase tracking-wider text-slate-400">{label}:</span><span className="font-bold uppercase text-white tabular-nums">{value}</span>
      <ChevronDown size={15} className={`text-[#10B981] transition ${open?'rotate-180':''}`} aria-hidden="true"/>
    </button>
    {open&&<div data-menu role="group" aria-label={menuLabel} onClick={e=>{if(e.target.closest('button'))setOpen(false);}}
      className={`absolute left-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#111827] p-3 shadow-2xl shadow-black/60 ${wide?'w-[min(560px,calc(100vw-32px))]':'w-[min(340px,calc(100vw-32px))]'}`}>{children}</div>}
  </div>;
}

function LeagueMenu({competitions,league,onSelect}){
  const continents=[...new Set(competitions.map(c=>c.continent))];
  return continents.map(c=><div key={c} className="mb-2 last:mb-0">
    <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{c}</p>
    <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">{competitions.filter(l=>l.continent===c).map(l=><li key={l.id}>
      <button aria-pressed={l.id===league.id} onClick={()=>onSelect(l.id)} className={`flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 text-left text-sm transition ${l.id===league.id?'bg-[#10B981]/15 text-white':'text-slate-300 hover:bg-white/[.05] hover:text-white'}`}>
        <LeagueMark league={l} size={22}/><span className="min-w-0 flex-1 truncate">{l.name}</span><span className="text-[10px] uppercase text-slate-500">{l.id}</span></button></li>)}</ul>
  </div>);
}

function GroupMenu({meta,group,onGroup}){
  const tiers=[...new Set(meta.map(m=>m.tier))];
  const tiered=tiers.length>1&&tiers.every(Boolean);
  const Btn=({m})=><button aria-pressed={m.i===group} aria-label={m.full} onClick={()=>onGroup(m.i)}
    className={`min-h-11 rounded-lg border px-3 text-sm font-semibold tabular-nums transition ${m.i===group?'border-[#10B981] bg-[#10B981] text-[#04210F]':'border-white/[.08] text-slate-200 hover:border-white/25 hover:text-white'}`}>{tiered?m.label.replace('Grupo ',''):m.label}</button>;
  return tiered
    ?<div className="space-y-2">{tiers.map(t=><div key={t} className="flex items-center gap-2"><span className="w-14 shrink-0 text-xs font-semibold text-slate-400">{t}</span><div className="flex flex-wrap gap-1.5">{meta.filter(m=>m.tier===t).map(m=><Btn key={m.i} m={m}/>)}</div></div>)}</div>
    :<div className="flex flex-wrap gap-1.5">{meta.map(m=><Btn key={m.i} m={m}/>)}</div>;
}

export function ContextBar({competitions,league,onLeague,groups,group,onGroup,publication,loadError,refreshing,onRefresh}){
  const meta=useMemo(()=>groups.map((g,i)=>({...groupLabel(g.name,i),i})),[groups]);
  const current=meta[group],multi=groups.length>1;
  const groupValue=current?(current.tier||current.code.length<=3?current.code:current.label):'';
  const season=publication?shortSeason(publication.season):null;
  const stale=publication&&!publication.historical&&Date.now()-Date.parse(publication.updated_at)>36*3600*1000;
  const warn=!publication?'Todavía no hay una captura publicada para esta competición. No se muestran cifras.'
    :publication.historical?`Archivo de la temporada ${publication.season}. No es la clasificación vigente.`
    :stale?`La captura tiene más de 36 horas (${stamp(publication.updated_at)}). Puede estar desactualizada.`:null;
  const arrow='hidden h-11 w-9 place-items-center sm:grid rounded-full text-slate-400 hover:bg-white/[.05] hover:text-white disabled:opacity-30';
  return <div className="rounded-2xl border border-white/[.08] bg-[#111827] px-3 py-2.5 md:px-4">
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 sm:gap-x-3">
      <Pill label="Liga" value={league.id.toUpperCase()} menuLabel="Competición" wide><LeagueMenu competitions={competitions} league={league} onSelect={onLeague}/></Pill>
      {multi&&<div className="flex items-center">
        <Pill label={league.teamType==='national'||current?.tier||current?.code.length<=3?'Grupo':'Tabla'} value={groupValue} menuLabel="Liga y grupo"><GroupMenu meta={meta} group={group} onGroup={onGroup}/></Pill>
        <button className={arrow} aria-label="Grupo anterior" disabled={group<=0} onClick={()=>onGroup(group-1)}><ChevronLeft size={16}/></button>
        <button className={arrow} aria-label="Grupo siguiente" disabled={group>=groups.length-1} onClick={()=>onGroup(group+1)}><ChevronRight size={16}/></button>
      </div>}
      <nav aria-label="Ruta" className="order-last flex min-w-0 basis-full items-center gap-1.5 text-xs text-slate-500 lg:order-none lg:basis-auto">
        <span className="hidden sm:inline">Ligas</span><ChevronRight size={12} className="hidden sm:block" aria-hidden="true"/><span className="hidden sm:inline">{league.continent}</span><ChevronRight size={12} className="hidden sm:block" aria-hidden="true"/>
        <LeagueMark league={league} size={16}/><h2 className="truncate font-heading text-sm font-bold text-white">{league.name}</h2>
        {multi&&current&&<><ChevronRight size={12} aria-hidden="true"/><span className="shrink-0 font-semibold text-[#10B981]">{current.full}</span></>}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        {season&&<span className="flex min-h-9 items-center gap-2 rounded-full border border-white/[.08] bg-[#080D17] px-3 text-xs text-slate-300" title={`${publication.season} · Fuente: ${publication.provider||'proveedor'}`}>
          <i className={`h-1.5 w-1.5 rounded-full ${publication.historical?'bg-[#F59E0B]':'bg-[#10B981] shadow-[0_0_8px_#10B981]'}`} aria-hidden="true"/><span className="hidden sm:inline">Temporada</span> <Num className="font-semibold text-white">{season}</Num>{!publication.historical&&<span className="hidden text-slate-500 sm:inline">· Actual</span>}</span>}
        <button onClick={onRefresh} className="grid h-9 w-9 place-items-center rounded-full border border-white/[.08] text-[#10B981] hover:border-[#10B981]" aria-label="Recargar captura publicada"><RefreshCw size={14} className={refreshing?'animate-spin':''}/></button>
      </div>
    </div>
    <div role="status" className={`mt-2 flex items-start gap-2 border-t border-white/[.06] pt-2 text-[11px] leading-relaxed ${warn?'text-yellow-100':'text-slate-500'}`}>
      {warn?<AlertTriangle size={13} className="mt-0.5 shrink-0 text-[#F59E0B]" aria-hidden="true"/>:<Info size={13} className="mt-0.5 shrink-0" aria-hidden="true"/>}
      <span>{warn||`Fuente: ${publication.provider||'proveedor'} · Captura: ${stamp(publication.updated_at)}. No es un marcador en vivo.`}{publication?.warnings?.length?' Los partidos no estuvieron disponibles en esta captura.':''}{loadError&&' No se pudo recargar; se conserva la última captura.'}</span>
    </div>
  </div>;
}
