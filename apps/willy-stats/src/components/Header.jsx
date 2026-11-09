import React,{useState,useEffect,useRef} from 'react';
import {Star,Menu,X,ArrowRight} from 'lucide-react';
import {Brand,Num,Photo} from './ui.jsx';
import {ASSETS} from '../lib.js';

export const NAV=[['Explorar','explorar'],['Comparador de Ligas','comparador'],['Partidos','dashboard','fixtures'],['Metodología','metodologia']];

export function Navbar({favorites,savedOnly,onSaved,onJump}){
  const [open,setOpen]=useState(false),btn=useRef(null);
  useEffect(()=>{
    if(!open)return;
    const esc=e=>{if(e.key==='Escape'){setOpen(false);btn.current?.focus();}};
    document.addEventListener('keydown',esc);return()=>document.removeEventListener('keydown',esc);
  },[open]);
  const go=(id,tab)=>{setOpen(false);onJump(id,tab);};
  return <header className="sticky top-0 z-50 border-b border-[#1E2630] bg-[#0B0E11]/90 backdrop-blur-md">
    <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between gap-4 px-4 md:px-8">
      <a href="#" className="flex shrink-0 items-center gap-2.5" aria-label="Willy Stats, inicio">
        <Brand/><span className="whitespace-nowrap font-heading text-2xl font-extrabold tracking-tight text-white">Willy Stats<span className="text-[#22C55E]">.</span></span>
      </a>
      <nav className="hidden items-center gap-8 lg:flex" aria-label="Principal">
        {NAV.map(([label,id,tab],i)=><button key={id} onClick={()=>go(id,tab)} className={`text-sm transition hover:text-white ${i===0?'text-white':'text-gray-400'}`}>{label}</button>)}
      </nav>
      <div className="flex items-center gap-2">
        <button onClick={onSaved} aria-pressed={savedOnly} aria-label={`Mis equipos (${favorites.length})`} className={`flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border px-3 py-2 text-xs transition sm:px-4 sm:text-sm ${savedOnly?'border-[#22C55E] bg-[#22C55E]/10 text-white':'border-[#26303D] bg-[#161C24] text-gray-200 hover:border-[#3a4757]'}`}>
          <Star size={15} className={favorites.length?'fill-[#22C55E] text-[#22C55E]':''} aria-hidden="true"/><span><span className="hidden min-[420px]:inline">Mis equipos </span>(<Num>{favorites.length}</Num>)</span>
        </button>
        <button ref={btn} className="grid h-11 w-11 place-items-center rounded-full border border-[#26303D] text-gray-200 lg:hidden" aria-expanded={open} aria-controls="menu-movil" aria-label={open?'Cerrar menú':'Abrir menú'} onClick={()=>setOpen(o=>!o)}>{open?<X size={18}/>:<Menu size={18}/>}</button>
      </div>
    </div>
    {open&&<nav id="menu-movil" aria-label="Principal móvil" className="border-t border-[#1E2630] bg-[#0B0E11] px-5 py-3 lg:hidden">
      {NAV.map(([label,id,tab])=><button key={id} onClick={()=>go(id,tab)} className="block w-full py-3 text-left text-gray-300 hover:text-white">{label}</button>)}
    </nav>}
  </header>;
}

function PitchBoard(){
  const nodes=[[210,262],[95,205],[165,215],[255,215],[325,205],[130,150],[210,160],[290,150],[160,88],[260,88],[210,52]];
  const links=[[0,1],[0,2],[0,3],[1,5],[2,6],[3,7],[4,7],[5,8],[6,8],[6,9],[7,9],[8,10],[9,10],[2,5],[3,7]];
  return <svg viewBox="0 0 420 300" className="absolute inset-0 m-auto h-full w-full" style={{transform:'perspective(900px) rotateX(38deg) rotateZ(-10deg) scale(.86)'}} role="img" aria-label="Ilustración de un mapa de calor y una red de pases sobre una cancha. No representa un partido real.">
    <defs>
      <radialGradient id="h1"><stop offset="0" stopColor="#F97316" stopOpacity=".95"/><stop offset="1" stopColor="#F97316" stopOpacity="0"/></radialGradient>
      <radialGradient id="h2"><stop offset="0" stopColor="#EAB308" stopOpacity=".85"/><stop offset="1" stopColor="#EAB308" stopOpacity="0"/></radialGradient>
      <radialGradient id="h3"><stop offset="0" stopColor="#22C55E" stopOpacity=".8"/><stop offset="1" stopColor="#22C55E" stopOpacity="0"/></radialGradient>
      <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
    </defs>
    <rect x="10" y="10" width="400" height="280" rx="6" fill="#0a1a12" fillOpacity=".55" stroke="rgba(255,255,255,.7)" strokeWidth="1.6"/>
    <g fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="1.4"><path d="M10 150h400"/><circle cx="210" cy="150" r="40"/><path d="M110 10v52h200V10M110 290v-52h200v52M165 10v22h90V10M165 290v-22h90v22"/></g>
    <g filter="url(#soft)"><circle cx="230" cy="86" r="52" fill="url(#h1)"/><circle cx="170" cy="120" r="46" fill="url(#h2)"/><circle cx="290" cy="140" r="44" fill="url(#h2)"/><circle cx="140" cy="210" r="40" fill="url(#h3)"/><circle cx="270" cy="220" r="38" fill="url(#h3)"/></g>
    <g stroke="#22C55E" strokeOpacity=".8" strokeWidth="1.4">{links.map(([a,b],i)=><line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]}/>)}</g>
    {nodes.map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r="9" fill="#22C55E" opacity=".25"/><circle cx={x} cy={y} r="4.5" fill={i===10?'#F97316':'#22C55E'} stroke="#fff" strokeWidth="1.2"/></g>)}
  </svg>;
}

export function Hero({onExplore}){
  return <section className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-8 px-5 pb-10 pt-12 sm:pt-20 md:px-8 lg:grid-cols-12">
    <div className="lg:col-span-7">
      <p className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-widest text-[#22C55E]">
        <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-70"/><span className="relative inline-flex h-2 w-2 rounded-full bg-[#22C55E]"/></span>
        Análisis global. Datos con fecha y fuente.
      </p>
      <h1 className="mt-4 font-heading text-5xl font-extrabold leading-[1.05] tracking-tight text-white lg:text-6xl">El mundo gira.<br/><span className="text-[#22C55E]">Los datos definen.</span></h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-400">De Lima a Londres. Todas tus ligas, el rendimiento de los clubes y las métricas que explican quién domina el juego. Cada cifra indica su fuente y su fecha de corte.</p>
      <button onClick={onExplore} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#F97316] px-6 py-3.5 font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-[#EA580C]">Explorar competiciones <ArrowRight size={18} aria-hidden="true"/></button>
    </div>
    <div className="relative h-[300px] overflow-hidden rounded-2xl border border-[#26303D] shadow-2xl sm:h-[340px] lg:col-span-5">
      <Photo src={ASSETS.hero} alt="" className="h-full w-full opacity-55"/>
      <div className="absolute inset-0 bg-gradient-to-tr from-[#0B0E11] via-transparent to-[#0B0E11]/60"/>
      <PitchBoard/>
      <div className="absolute bottom-4 right-4 flex items-center gap-3 rounded-lg border border-[#26303D] bg-[#0B0E11]/90 px-4 py-2.5 backdrop-blur-md">
        <Num className="text-sm font-bold text-[#22C55E]">90 + 3&apos;</Num><span className="text-sm text-white">El dato nunca descansa.</span>
      </div>
    </div>
  </section>;
}
