import React,{useState} from 'react';
import {Search,Star} from 'lucide-react';
import {Crest,Form,Num} from './ui.jsx';
import {normalized} from '../data.js';

const PREVIEW=10;
/** Franjas visuales de parte alta y baja. No equivalen a zonas oficiales: la fuente no las publica. */
export const bands=n=>({top:n>=10?Math.max(1,Math.round(n/5)):1,bottom:n>=10?3:n>=4?1:0});

export function Standings({rows,leagueId,national=false,favorites,onFavorite,onDetail,query,onQuery,savedOnly,onClearSaved,highlight=[]}){
  const [all,setAll]=useState(false);
  const filtered=rows.filter(t=>normalized(t.name).includes(normalized(query))&&(!savedOnly||favorites.includes(t.name)));
  const expanded=all||query||savedOnly||highlight.some(h=>filtered.findIndex(t=>t.name===h)>=PREVIEW);
  const shown=expanded?filtered:filtered.slice(0,PREVIEW);
  const {top,bottom}=bands(rows.length),n=rows.length;
  const stripe=r=>r<=top?'before:bg-[#10B981]':bottom&&r>n-bottom?'before:bg-[#EF4444]':'before:bg-transparent';
  return <div className="@container">
    <div className="mb-3 flex flex-wrap items-center gap-3">
      <label className="flex h-11 flex-1 items-center gap-2 rounded-lg border border-white/[.08] bg-[#0B111E] px-3 text-slate-400 focus-within:border-[#10B981] sm:max-w-xs">
        <Search size={15} aria-hidden="true"/><span className="sr-only">{national?'Filtrar selección':'Filtrar club'}</span>
        <input value={query} onChange={e=>onQuery(e.target.value)} placeholder={national?'Filtrar selección...':'Filtrar club...'} className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-slate-500"/>
      </label>
      {savedOnly&&<button onClick={onClearSaved} className="rounded-lg bg-[#1E293B] px-3 py-2 text-xs text-slate-200">Solo tus favoritos. Mostrar todos</button>}
    </div>
    {!rows.length?<p className="rounded-xl border border-dashed border-white/[.08] p-8 text-center text-sm text-slate-400">No hay tabla publicada para esta competición todavía.</p>
    :!filtered.length?<p className="rounded-xl border border-dashed border-white/[.08] p-8 text-center text-sm text-slate-400">{national?'Ninguna selección coincide con el filtro.':'Ningún club coincide con el filtro.'}</p>
    :<div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-y-1 text-sm tabular-nums" id="league-standings">
        <caption className="sr-only">Tabla de posiciones</caption>
        <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
          <th scope="col" className="w-8 py-2 pl-2.5 font-medium sm:w-10 sm:pl-3">Pos</th><th scope="col" className="py-2 font-medium">{national?'Selección':'Club'}</th>
          <th scope="col" className="px-1.5 py-2 text-center font-medium">PJ</th>
          {['G','E','P'].map(h=><th key={h} scope="col" className="hidden px-1.5 py-2 text-center font-medium @md:table-cell">{h}</th>)}
          <th scope="col" className="hidden px-1.5 py-2 text-center font-medium @sm:table-cell">DG</th>
          <th scope="col" className="px-2 py-2 text-center font-semibold text-slate-300">Pts</th>
          <th scope="col" className="hidden px-2 py-2 text-center font-medium @xl:table-cell">Racha</th><th scope="col" className="w-9 sm:w-11"><span className="sr-only">Favorito</span></th>
        </tr></thead>
        <tbody>
          {shown.map(t=>{const fav=favorites.includes(t.name),hl=highlight.includes(t.name),lead=t.rank===1;return <tr key={t.name} onClick={()=>onDetail(t)}
            className={`group cursor-pointer transition-colors [&>td]:border-y [&>td]:border-transparent [&>td:first-child]:rounded-l-lg [&>td:last-child]:rounded-r-lg ${hl?'[&>td]:border-[#10B981]/40 [&>td]:bg-[#10B981]/[.10]':lead?'[&>td]:bg-[#10B981]/[.07]':'[&>td]:bg-white/[.015]'} hover:[&>td]:bg-white/[.05]`}>
            <td className={`relative py-2.5 pl-2.5 sm:pl-3 before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full ${stripe(t.rank)}`}><Num className={lead?'font-bold text-[#10B981]':'text-slate-400'}>{t.rank}</Num></td>
            <td className="py-2.5"><button onClick={e=>{e.stopPropagation();onDetail(t);}} className="flex min-w-0 items-center gap-2 text-left text-white sm:gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[.04]"><Crest name={t.name} leagueId={leagueId} logo={t.logo} size={24}/></span>
              <span className="max-w-[74px] truncate text-[14px] font-semibold min-[400px]:max-w-[140px] @md:max-w-none">{t.name}</span>{hl&&<span className="rounded bg-[#10B981]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#6EE7B7]">Próximo</span>}</button></td>
            <td className="px-1.5 text-center text-slate-300"><Num>{t.pj}</Num></td>
            {['g','e','p'].map(k=><td key={k} className="hidden px-1.5 text-center text-slate-300 @md:table-cell"><Num>{t[k]}</Num></td>)}
            <td className="hidden px-1.5 text-center @sm:table-cell"><Num className={t.dg>0?'text-[#10B981]':t.dg<0?'text-[#EF4444]':'text-slate-400'}>{t.dg>0?`+${t.dg}`:t.dg}</Num></td>
            <td className="px-2 text-center"><Num className="text-base font-extrabold text-white">{t.pts}</Num></td>
            <td className="hidden px-2 text-center @xl:table-cell"><Form values={t.form} small/></td>
            <td className="pr-0.5 text-right"><button aria-label={fav?`Quitar a ${t.name} de favoritos`:`Agregar a ${t.name} a favoritos`} aria-pressed={fav} onClick={e=>{e.stopPropagation();onFavorite(t.name);}} className="grid h-11 w-9 place-items-center text-slate-500 hover:text-[#10B981] sm:w-11"><Star size={15} className={fav?'fill-[#10B981] text-[#10B981]':''}/></button></td>
          </tr>;})}
        </tbody>
      </table>
    </div>}
    {n>0&&<p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500"><span className="flex items-center gap-1.5"><i className="h-3 w-[3px] rounded-full bg-[#10B981]"/>Parte alta</span>{bottom>0&&<span className="flex items-center gap-1.5"><i className="h-3 w-[3px] rounded-full bg-[#EF4444]"/>Parte baja</span>}<span>Referencia visual; la fuente no publica zonas de clasificación ni de descenso.</span></p>}
    {!query&&!savedOnly&&filtered.length>PREVIEW&&!highlight.length&&<div className="mt-3 text-center"><button onClick={()=>setAll(v=>!v)} aria-expanded={all} className="rounded-lg bg-[#1E293B] px-4 py-2 text-xs text-slate-300 transition hover:text-white">{all?'Mostrar menos':`Ver todas las posiciones (${filtered.length})`}</button></div>}
  </div>;
}
