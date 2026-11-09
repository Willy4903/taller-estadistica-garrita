import React,{useRef} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {Photo,LeagueMark} from './ui.jsx';
import {ASSETS} from '../lib.js';

export function Carousel({competitions,leagueId,continent,onContinent,onSelect}){
  const scroller=useRef(null);
  const move=dir=>scroller.current?.scrollBy({left:dir*480,behavior:'smooth'});
  const list=competitions.filter(c=>continent==='Todas'||c.continent===continent);
  return <section id="explorar" className="mx-auto max-w-[1440px] px-5 md:px-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-heading text-2xl font-bold text-white">¿Dónde analizamos hoy?</h2>
      <div role="group" aria-label="Filtrar por continente" className="flex rounded-lg border border-[#1E2630] bg-[#12171D] p-1">
        {['Todas','América','Europa'].map(v=><button key={v} aria-pressed={continent===v} onClick={()=>onContinent(v)} className={`rounded-md px-4 py-1.5 text-sm transition ${continent===v?'bg-[#22C55E] font-semibold text-[#04210F]':'text-gray-300 hover:text-white'}`}>{v}</button>)}
      </div>
    </div>
    <div className="relative">
    <button aria-label="Competiciones anteriores" onClick={()=>move(-1)} className="absolute left-0 top-1/2 z-10 hidden h-8 w-8 -translate-x-full -translate-y-1/2 place-items-center rounded-full text-gray-400 hover:text-white lg:grid"><ChevronLeft size={18}/></button>
    <button aria-label="Competiciones siguientes" onClick={()=>move(1)} className="absolute right-0 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 translate-x-full place-items-center rounded-full text-gray-400 hover:text-white lg:grid"><ChevronRight size={18}/></button>
    <div ref={scroller} className="-mx-5 mt-4 overflow-x-auto px-5 pb-2 md:-mx-8 md:px-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" tabIndex={0} aria-label={`${list.length} competiciones`}>
      <ul className="flex snap-x gap-3">
        {list.map((c,i)=>{const active=c.id===leagueId;return <li key={c.id} className="snap-start">
          <button onClick={()=>onSelect(c.id)} aria-pressed={active} className={`relative flex h-28 w-[150px] flex-col justify-between overflow-hidden rounded-xl p-3 text-left transition ${active?'border-2 border-[#22C55E] bg-gradient-to-b from-[#10B981]/20 to-[#12171D]':'border border-[#1E2630] bg-[#12171D] hover:border-[#3a4757]'}`}>
            <Photo src={ASSETS.hero} alt="" className="absolute inset-0 h-full w-full opacity-15 mix-blend-luminosity grayscale" />
            <span className="relative"><LeagueMark league={c} size={28}/></span>
            <span className="relative"><span className="block text-sm font-bold leading-tight text-white">{c.name}</span><span className="mt-0.5 block text-xs text-gray-400">{c.country}</span></span>
          </button></li>;})}
      </ul>
    </div>
    </div>
  </section>;
}
