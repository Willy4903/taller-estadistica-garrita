import React,{useMemo,useRef,useEffect} from 'react';
import {groupLabel} from '../lib.js';

/** Franja compacta de grupos (A1 A2 … D2). Separa cada liga con una línea fina y desplaza al grupo activo. */
export function GroupChips({groups,group,onGroup}){
  const meta=useMemo(()=>groups.map((g,i)=>({...groupLabel(g.name,i),i})),[groups]);
  const tiered=meta.length>1&&meta.every(m=>m.tier);
  const strip=useRef(null);
  useEffect(()=>{const el=strip.current?.querySelector('[aria-pressed="true"]');el?.scrollIntoView({block:'nearest',inline:'nearest'});},[group]);
  if(groups.length<2)return null;
  return <div ref={strip} role="group" aria-label={tiered?'Liga y grupo':'Grupo'} className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {meta.map((m,k)=>{const active=m.i===group,newTier=tiered&&k>0&&meta[k-1].tier!==m.tier;return <React.Fragment key={m.i}>
      {newTier&&<i className="mx-1 w-px shrink-0 self-stretch bg-white/[.08]" aria-hidden="true"/>}
      <button aria-pressed={active} aria-label={m.full} title={m.full} onClick={()=>onGroup(m.i)}
        className={`min-h-11 shrink-0 whitespace-nowrap rounded-lg border px-3 text-sm font-semibold tabular-nums transition ${active?'border-[#10B981] bg-[#10B981] text-[#04210F]':'border-white/[.08] bg-white/[.02] text-slate-300 hover:border-white/20 hover:text-white'}`}>{tiered?m.code:m.label}</button>
    </React.Fragment>;})}
  </div>;
}
