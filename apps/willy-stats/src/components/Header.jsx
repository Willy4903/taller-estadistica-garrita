import React,{useState,useEffect,useRef} from 'react';
import {Star,Menu,X,Download,Activity} from 'lucide-react';
import {Brand,Num} from './ui.jsx';

export const TABS=[['table','Clasificación'],['history','Histórico'],['teams','Equipos'],['fixtures','Partidos'],['advanced','Estadísticas avanzadas']];
export const NAV=[['Partidos','dashboard','fixtures'],['Explorar competiciones','explorar'],['Comparador de ligas','comparador'],['Metodología','metodologia']];

/** Interruptor accesible. */
export function Switch({checked,onChange,label,icon=true}){
  return <button role="switch" aria-checked={checked} onClick={()=>onChange(!checked)} className="flex min-h-11 items-center gap-2 rounded-full px-1 text-sm text-slate-300 hover:text-white">
    {icon&&<Activity size={15} className={checked?'text-[#06B6D4]':'text-slate-500'} aria-hidden="true"/>}
    <span className="whitespace-nowrap">{label}</span>
    <span className={`relative h-5 w-9 rounded-full transition ${checked?'bg-[#06B6D4]':'bg-white/15'}`} aria-hidden="true"><i className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked?'left-[18px]':'left-0.5'}`}/></span>
  </button>;
}

export function Navbar({tab,onTab,favorites,savedOnly,onSaved,onJump,analysis,onAnalysis,onExport,canExport}){
  const [open,setOpen]=useState(false),btn=useRef(null);
  useEffect(()=>{
    if(!open)return;
    const esc=e=>{if(e.key==='Escape'){setOpen(false);btn.current?.focus();}};
    document.addEventListener('keydown',esc);return()=>document.removeEventListener('keydown',esc);
  },[open]);
  const go=(id,t)=>{setOpen(false);onJump(id,t);};
  const keys=e=>{const ids=TABS.map(t=>t[0]),i=ids.indexOf(tab);let n=null;
    if(e.key==='ArrowRight')n=ids[(i+1)%ids.length];if(e.key==='ArrowLeft')n=ids[(i+ids.length-1)%ids.length];
    if(n){e.preventDefault();onTab(n);document.getElementById(`tab-${n}`)?.focus();}};
  const tabs=<div role="tablist" aria-label="Secciones del análisis" onKeyDown={keys} className="flex min-w-0 gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {TABS.map(([id,label])=><button key={id} role="tab" id={`tab-${id}`} aria-label={label} aria-selected={tab===id} aria-controls="panel-main" tabIndex={tab===id?0:-1} onClick={()=>onTab(id)}
      className={`relative min-h-11 shrink-0 whitespace-nowrap px-3 text-sm transition ${tab===id?'font-semibold text-white after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[#10B981] after:shadow-[0_0_12px_#10B981]':'text-slate-400 hover:text-slate-200'}`}>
      {id==='advanced'?<><span className="xl:hidden">Avanzadas</span><span className="hidden xl:inline">{label}</span></>:label}</button>)}
  </div>;
  return <header className="sticky top-0 z-50 border-b border-white/[.08] bg-[#080D17]/85 backdrop-blur-xl">
    <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 md:px-8">
      <a href="#" className="flex shrink-0 items-center gap-2.5" aria-label="Willy Stats, inicio">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#10B981]/15 ring-1 ring-[#10B981]/30"><Brand className="h-5 w-5"/></span>
        <span className="whitespace-nowrap font-heading text-xl font-extrabold tracking-tight text-white sm:text-2xl">Willy Stats<span className="text-[#10B981]">.</span></span>
        <span className="hidden whitespace-nowrap border-l border-white/10 pl-2.5 text-sm font-medium text-slate-400 sm:inline">Fútbol</span>
      </a>
      <nav className="hidden min-w-0 flex-1 justify-center lg:flex" aria-label="Principal">{tabs}</nav>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <span className="hidden md:block"><Switch checked={analysis} onChange={onAnalysis} label="Modo análisis"/></span>
        <button onClick={onExport} disabled={!canExport} className="hidden min-h-11 items-center gap-2 rounded-full border border-white/[.08] bg-[#111827] px-4 text-sm text-slate-200 transition hover:border-white/20 disabled:opacity-40 md:flex"><Download size={15} aria-hidden="true"/>Exportar</button>
        <button onClick={onSaved} aria-pressed={savedOnly} aria-label={`Mis equipos (${favorites.length})`} className={`flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border px-3 py-2 text-xs transition sm:text-sm ${savedOnly?'border-[#10B981] bg-[#10B981]/10 text-white':'border-white/[.08] bg-[#111827] text-slate-200 hover:border-white/20'}`}>
          <Star size={15} className={favorites.length?'fill-[#10B981] text-[#10B981]':''} aria-hidden="true"/><span>(<Num>{favorites.length}</Num>)</span>
        </button>
        <button ref={btn} className="grid h-11 w-11 place-items-center rounded-full border border-white/[.08] text-slate-200" aria-expanded={open} aria-controls="menu-movil" aria-label={open?'Cerrar menú':'Abrir menú'} onClick={()=>setOpen(o=>!o)}>{open?<X size={18}/>:<Menu size={18}/>}</button>
      </div>
    </div>
    <div className="border-t border-white/[.06] lg:hidden"><div className="mx-auto max-w-[1440px] px-2 md:px-6">{tabs}</div></div>
    {open&&<nav id="menu-movil" aria-label="Principal móvil" className="border-t border-white/[.08] bg-[#080D17]">
      <div className="mx-auto max-w-[1440px] px-5 py-3 md:px-8">
        {NAV.map(([label,id,t])=><button key={label} onClick={()=>go(id,t)} className="block w-full py-3 text-left text-slate-300 hover:text-white">{label}</button>)}
        <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-white/[.06] pt-3 md:hidden">
          <Switch checked={analysis} onChange={onAnalysis} label="Modo análisis"/>
          <button onClick={()=>{setOpen(false);onExport();}} disabled={!canExport} className="flex min-h-11 items-center gap-2 rounded-full border border-white/[.08] px-4 text-sm text-slate-200 disabled:opacity-40"><Download size={15} aria-hidden="true"/>Exportar tabla (CSV)</button>
        </div>
      </div>
    </nav>}
  </header>;
}
