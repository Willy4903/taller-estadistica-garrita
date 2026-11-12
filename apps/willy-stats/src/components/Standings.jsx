import React,{useState} from 'react';
import {Search,Star} from 'lucide-react';
import {Crest,Form,Num} from './ui.jsx';
import {normalized,number} from '../data.js';

const PREVIEW=4;
export function Standings({rows,leagueId,national=false,favorites,onFavorite,onDetail,query,onQuery,savedOnly,onClearSaved}){
  const [all,setAll]=useState(false);
  const filtered=rows.filter(t=>normalized(t.name).includes(normalized(query))&&(!savedOnly||favorites.includes(t.name)));
  const shown=all||query||savedOnly?filtered:filtered.slice(0,PREVIEW);
  return <div>
    <div className="mb-3 flex flex-wrap items-center gap-3">
      <label className="flex h-11 flex-1 items-center gap-2 rounded-lg border border-[#26303D] bg-[#0B0E11] px-3 text-gray-400 focus-within:border-[#22C55E] sm:max-w-xs">
        <Search size={15} aria-hidden="true"/><span className="sr-only">{national?'Filtrar selección':'Filtrar club'}</span>
        <input value={query} onChange={e=>onQuery(e.target.value)} placeholder={national?'Filtrar selección...':'Filtrar club...'} className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-gray-500"/>
      </label>
      {savedOnly&&<button onClick={onClearSaved} className="rounded-lg bg-[#1A212B] px-3 py-2 text-xs text-gray-200">Solo tus favoritos. Mostrar todos</button>}
    </div>
    {!rows.length?<p className="rounded-xl border border-dashed border-[#26303D] p-8 text-center text-sm text-gray-400">No hay tabla publicada para esta competición todavía.</p>
    :!filtered.length?<p className="rounded-xl border border-dashed border-[#26303D] p-8 text-center text-sm text-gray-400">{national?'Ninguna selección coincide con el filtro.':'Ningún club coincide con el filtro.'}</p>
    :<div className="overflow-x-auto">
      <table className="w-full text-base" id="league-standings">
        <caption className="sr-only">Tabla de posiciones</caption>
        <thead><tr className="border-b border-[#1E2630] text-left text-sm text-gray-500">
          <th scope="col" className="w-10 py-2 pl-2 font-medium">Pos</th><th scope="col" className="py-2 font-medium">{national?'Selección':'Club'}</th>
          <th scope="col" className="px-2 py-2 text-right font-medium">PJ</th>
          {['G','E','P'].map(h=><th key={h} scope="col" className="hidden px-2 py-2 text-right font-medium md:table-cell">{h}</th>)}
          {['GF','GC','DG'].map(h=><th key={h} scope="col" className="hidden px-2 py-2 text-right font-medium xl:table-cell">{h}</th>)}
          <th scope="col" className="px-2 py-2 text-right font-medium text-gray-300">PTS</th>
          <th scope="col" className="hidden px-2 py-2 text-right font-medium sm:table-cell">% Efectividad</th>
          <th scope="col" className="hidden px-3 py-2 text-center font-medium lg:table-cell">Últimos 5</th><th scope="col" className="w-10"><span className="sr-only">Favorito</span></th>
        </tr></thead>
        <tbody>
          {shown.map(t=>{const fav=favorites.includes(t.name),top=t.rank<=PREVIEW;return <tr key={t.name} onClick={()=>onDetail(t)} className={`cursor-pointer border-b border-[#1E2630]/70 transition hover:bg-white/[.03] ${t.rank===1?'bg-[#22C55E]/[.08]':''}`}>
            <td className={`py-4 pl-2 ${top?`border-l-[3px] ${t.rank===1?'border-[#22C55E]':'border-[#22C55E]/40'}`:'border-l-[3px] border-transparent'}`}><Num className="text-gray-300">{t.rank}</Num></td>
            <td className="py-4"><button onClick={e=>{e.stopPropagation();onDetail(t);}} className="flex items-center gap-2 text-left text-white sm:gap-3"><Crest name={t.name} leagueId={leagueId} logo={t.logo} size={36}/><span className="max-w-[70px] truncate text-[15px] font-semibold sm:max-w-none">{t.name}</span></button></td>
            <td className="px-2 text-right"><Num>{t.pj}</Num></td>
            {['g','e','p'].map(k=><td key={k} className="hidden px-2 text-right md:table-cell"><Num>{t[k]}</Num></td>)}
            <td className="hidden px-2 text-right xl:table-cell"><Num>{t.gf}</Num></td><td className="hidden px-2 text-right xl:table-cell"><Num>{t.gc}</Num></td>
            <td className="hidden px-2 text-right xl:table-cell"><Num className={t.dg>0?'text-[#22C55E]':t.dg<0?'text-[#EF4444]':''}>{t.dg>0?`+${t.dg}`:t.dg}</Num></td>
            <td className="px-2 text-right"><Num className="text-lg font-extrabold text-white">{t.pts}</Num></td>
            <td className="hidden px-2 text-right sm:table-cell"><Num className="text-gray-300">{Number.isFinite(t.effectiveness)?`${number(t.effectiveness)}%`:'—'}</Num></td>
            <td className="hidden px-3 text-center lg:table-cell"><Form values={t.form}/></td>
            <td className="pr-0 text-right sm:pr-2"><button aria-label={fav?`Quitar a ${t.name} de favoritos`:`Agregar a ${t.name} a favoritos`} aria-pressed={fav} onClick={e=>{e.stopPropagation();onFavorite(t.name);}} className="grid h-11 w-11 place-items-center text-gray-500 hover:text-[#22C55E]"><Star size={16} className={fav?'fill-[#22C55E] text-[#22C55E]':''}/></button></td>
          </tr>;})}
        </tbody>
      </table>
    </div>}
    {!query&&!savedOnly&&filtered.length>PREVIEW&&<div className="mt-4 text-center"><button onClick={()=>setAll(v=>!v)} aria-expanded={all} className="rounded-lg bg-[#1A212B] px-4 py-2 text-xs text-gray-300 transition hover:text-white">{all?'Mostrar menos':`Ver todas las posiciones (${filtered.length})`}</button></div>}
  </div>;
}
