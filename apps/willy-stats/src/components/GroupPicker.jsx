import React,{useState,useEffect,useMemo} from 'react';
import {ChevronLeft,ChevronRight,Check} from 'lucide-react';
import {Crest,Num} from './ui.jsx';
import {groupLabel} from '../lib.js';

/** Paso rápido entre grupos: anterior, nombre completo y siguiente. */
export function GroupStepper({groups,group,onGroup}){
  if(groups.length<2)return null;
  const l=groupLabel(groups[group]?.name,group);
  const btn='grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-white/[.08] bg-[#0B111E] text-slate-200 hover:text-white disabled:opacity-30';
  return <div className="flex items-center gap-1.5" role="group" aria-label="Cambiar de grupo">
    <button className={btn} aria-label="Grupo anterior" disabled={group<=0} onClick={()=>onGroup(group-1)}><ChevronLeft size={16}/></button>
    <span className="min-w-[128px] text-center leading-tight" aria-live="polite"><span className="block text-sm font-semibold text-white">{l.full}</span><span className="text-[11px] text-slate-400"><Num>{group+1}</Num> de <Num>{groups.length}</Num></span></span>
    <button className={btn} aria-label="Grupo siguiente" disabled={group>=groups.length-1} onClick={()=>onGroup(group+1)}><ChevronRight size={16}/></button>
  </div>;
}

/** Selector visual: pestañas por liga (A, B, C…) y tarjetas de grupo con sus equipos y el líder. */
export function GroupPicker({groups,group,onGroup,leagueId,national}){
  const meta=useMemo(()=>groups.map((g,i)=>({...groupLabel(g.name,i),i,rows:g.rows||[]})),[groups]);
  const tiers=useMemo(()=>[...new Set(meta.map(m=>m.tier).filter(Boolean))],[meta]);
  const tiered=tiers.length>1&&meta.every(m=>m.tier);
  const currentTier=meta[group]?.tier;
  const [tier,setTier]=useState(currentTier);
  useEffect(()=>setTier(currentTier),[currentTier]);
  if(groups.length<2)return null;
  const shown=tiered?meta.filter(m=>m.tier===tier):meta;
  const cols=shown.length<=2?'grid-cols-2':shown.length===3?'grid-cols-2 sm:grid-cols-3':'grid-cols-2 sm:grid-cols-4';
  return <div className="mt-4 rounded-xl border border-white/[.08] bg-[#111A2B] p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{tiered?'Elige liga y grupo':national?'Elige grupo':'Elige tabla'} <span className="font-normal normal-case tracking-normal text-slate-500">· {groups.length} {tiered||national?'grupos':'tablas'}</span></p>
      {tiered&&<div role="group" aria-label="Liga" className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-[#0B111E] p-1 [scrollbar-width:none]">
        {tiers.map(t=>{const n=meta.filter(m=>m.tier===t).length,active=t===tier,has=t===currentTier;return <button key={t} aria-pressed={active} onClick={()=>setTier(t)}
          className={`relative min-h-9 whitespace-nowrap rounded-md px-3 text-sm transition ${active?'bg-[#1E293B] font-semibold text-white':'text-slate-400 hover:text-white'}`}>{t}<span className="ml-1 text-[11px] text-slate-500">{n}</span>{has&&!active&&<i className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#10B981]" aria-hidden="true"/>}</button>;})}
      </div>}
    </div>
    <ul className={`mt-3 grid gap-2 ${cols}`}>
      {shown.map(m=>{const active=m.i===group,leader=m.rows[0];return <li key={m.i} className="min-w-0">
        <button aria-pressed={active} aria-label={m.full} title={leader?`${m.full}. Líder: ${leader.name}, ${leader.pts} pts`:m.full} onClick={()=>onGroup(m.i)}
          className={`flex min-h-[84px] w-full flex-col justify-between rounded-lg border p-2.5 text-left transition ${active?'border-[#10B981] bg-[#10B981]/10':'border-white/[.08] bg-[#162032] hover:border-white/20'}`}>
          <span className="flex items-center justify-between gap-2"><span className={`font-heading text-sm font-bold ${active?'text-white':'text-slate-200'}`}>{tiered?m.label:m.full}</span>{active&&<Check size={14} className="text-[#10B981]" aria-hidden="true"/>}</span>
          <span className="mt-1.5 flex -space-x-1.5" aria-hidden="true">{m.rows.slice(0,5).map(r=><span key={r.name} className="grid h-7 w-7 place-items-center rounded-full bg-[#0B111E] ring-2 ring-[#162032]"><Crest name={r.name} leagueId={leagueId} logo={r.logo} size={18}/></span>)}</span>
          {leader&&<span className="mt-1.5 flex min-w-0 items-center gap-1 text-[11px] text-slate-400" aria-hidden="true"><span className="truncate">1.º {leader.name}</span><Num className="shrink-0 text-slate-300">· {leader.pts} pts</Num></span>}
        </button>
      </li>;})}
    </ul>
  </div>;
}
