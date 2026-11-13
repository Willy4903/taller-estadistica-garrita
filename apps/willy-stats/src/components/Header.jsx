import React,{useState,useEffect,useRef} from 'react';
import {Star,Menu,X,ChevronDown} from 'lucide-react';
import {Brand,Num,LeagueMark} from './ui.jsx';

export const TABS=[['table','Tabla'],['teams','Equipos'],['fixtures','Partidos'],['advanced','Estadísticas avanzadas']];
export const NAV=[['Próximos partidos','agenda'],['Partidos','dashboard','fixtures'],['Explorar competiciones','explorar'],['Comparador de ligas','comparador'],['Metodología','metodologia']];

/** Selector de competición tipo píldora. Nativo para que funcione bien con teclado y en el móvil. */
export function LeagueSelect({competitions,league,onSelect,className=''}){
  const byContinent=[...new Set(competitions.map(c=>c.continent))];
  return <label className={`relative flex min-h-11 min-w-0 items-center gap-2 rounded-full border border-white/[.08] bg-[#162032] pl-2 pr-9 transition focus-within:border-[#10B981] hover:border-white/20 ${className}`}>
    <LeagueMark league={league} size={26}/>
    <span className="sr-only">Competición</span>
    <select value={league.id} onChange={e=>onSelect(e.target.value)} className="min-w-0 flex-1 cursor-pointer appearance-none truncate bg-transparent py-2 text-base font-semibold text-white outline-none sm:text-sm">
      {byContinent.map(c=><optgroup key={c} label={c}>{competitions.filter(l=>l.continent===c).map(l=><option key={l.id} value={l.id} className="bg-[#162032]">{l.name}</option>)}</optgroup>)}
    </select>
    <ChevronDown size={16} className="pointer-events-none absolute right-3 text-slate-400" aria-hidden="true"/>
  </label>;
}

export function Navbar({competitions,league,onLeague,tab,onTab,favorites,savedOnly,onSaved,onJump,updated}){
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
  return <header className="sticky top-0 z-50 border-b border-white/[.08] bg-[#0B111E]/85 backdrop-blur-xl">
    <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 md:px-8">
      <a href="#" className="flex min-w-0 items-center gap-2.5" aria-label="Taller Estadística Garrita, inicio">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#10B981]/15 ring-1 ring-[#10B981]/30"><Brand className="h-5 w-5"/></span>
        <span className="font-heading text-[15px] font-extrabold leading-tight tracking-tight text-white sm:text-lg">Taller Estadística <span className="text-[#10B981]">Garrita</span></span>
      </a>
      <LeagueSelect competitions={competitions} league={league} onSelect={onLeague} className="hidden w-[260px] md:flex"/>
      <nav className="hidden items-center gap-6 xl:flex" aria-label="Principal">
        {NAV.filter(n=>!n[2]).map(([label,id])=><button key={id} onClick={()=>go(id)} className="text-sm text-slate-400 transition hover:text-white">{label}</button>)}
      </nav>
      <div className="flex shrink-0 items-center gap-2">
        <button onClick={onSaved} aria-pressed={savedOnly} aria-label={`Mis equipos (${favorites.length})`} className={`flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border px-3 py-2 text-xs transition sm:px-4 sm:text-sm ${savedOnly?'border-[#10B981] bg-[#10B981]/10 text-white':'border-white/[.08] bg-[#162032] text-slate-200 hover:border-white/20'}`}>
          <Star size={15} className={favorites.length?'fill-[#10B981] text-[#10B981]':''} aria-hidden="true"/><span><span className="hidden min-[480px]:inline">Mis equipos </span>(<Num>{favorites.length}</Num>)</span>
        </button>
        <button ref={btn} className="grid h-11 w-11 place-items-center rounded-full border border-white/[.08] text-slate-200 xl:hidden" aria-expanded={open} aria-controls="menu-movil" aria-label={open?'Cerrar menú':'Abrir menú'} onClick={()=>setOpen(o=>!o)}>{open?<X size={18}/>:<Menu size={18}/>}</button>
      </div>
    </div>
    <div className="border-t border-white/[.06]">
      <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 md:px-8">
        <div role="tablist" aria-label="Secciones del análisis" onKeyDown={keys} className="-mx-2 flex min-w-0 flex-1 gap-0.5 overflow-x-auto sm:mx-0 sm:gap-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map(([id,label])=><button key={id} role="tab" id={`tab-${id}`} aria-selected={tab===id} aria-controls="panel-main" tabIndex={tab===id?0:-1} aria-label={label} onClick={()=>onTab(id)}
            className={`relative min-h-11 shrink-0 whitespace-nowrap px-2.5 text-sm sm:px-3 transition md:px-4 ${tab===id?'font-semibold text-white after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[#10B981]':'text-slate-400 hover:text-slate-200'}`}>{id==='advanced'?<><span className="sm:hidden">Avanzadas</span><span className="hidden sm:inline">{label}</span></>:label}</button>)}
        </div>
        {updated&&<p className="hidden shrink-0 text-xs text-slate-400 lg:block">Última captura: <Num className="text-slate-200">{updated}</Num></p>}
      </div>
    </div>
    {open&&<nav id="menu-movil" aria-label="Principal móvil" className="border-t border-white/[.08] bg-[#0B111E] px-5 py-3 xl:hidden">
      {NAV.map(([label,id,t])=><button key={label} onClick={()=>go(id,t)} className="block w-full py-3 text-left text-slate-300 hover:text-white">{label}</button>)}
    </nav>}
  </header>;
}
