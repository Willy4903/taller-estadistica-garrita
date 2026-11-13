import React,{useState} from 'react';
import {Search,Star,ChevronUp,ChevronDown,Minus} from 'lucide-react';
import {Crest,Form,Num} from './ui.jsx';
import {normalized,number} from '../data.js';

const PREVIEW=10;
/** Franjas visuales de parte alta y baja. No equivalen a zonas oficiales: la fuente no las publica. */
export const bands=n=>({top:n>=10?Math.max(1,Math.round(n/5)):1,bottom:n>=10?3:n>=4?1:0});

function Move({delta}){
  if(delta==null)return null;
  if(delta>0)return <span className="flex items-center text-[10px] font-semibold text-[#10B981]" title={`Sube ${delta} respecto a la fecha anterior`}><ChevronUp size={13} aria-hidden="true"/><span className="sr-only">Sube {delta}</span></span>;
  if(delta<0)return <span className="flex items-center text-[10px] font-semibold text-[#EF4444]" title={`Baja ${-delta} respecto a la fecha anterior`}><ChevronDown size={13} aria-hidden="true"/><span className="sr-only">Baja {-delta}</span></span>;
  return <span className="text-slate-600" title="Misma posición que en la fecha anterior"><Minus size={11} aria-hidden="true"/><span className="sr-only">Sin cambio</span></span>;
}

export function Standings({rows,leagueId,national=false,favorites,onFavorite,onDetail,query,onQuery,savedOnly,onClearSaved,highlight=[],moves=null,analysis=false,emptyText}){
  const [all,setAll]=useState(false);
  const searchable=rows.length>8;
  const filtered=rows.filter(t=>normalized(t.name).includes(normalized(searchable?query:''))&&(!savedOnly||favorites.includes(t.name)));
  const expanded=all||(searchable&&query)||savedOnly||highlight.some(h=>filtered.findIndex(t=>t.name===h)>=PREVIEW);
  const shown=expanded?filtered:filtered.slice(0,PREVIEW);
  const {top,bottom}=bands(rows.length),n=rows.length;
  const stripe=r=>r<=top?'before:bg-[#10B981] before:shadow-[0_0_10px_#10B981]':bottom&&r>n-bottom?'before:bg-[#EF4444] before:shadow-[0_0_10px_#EF4444]':'before:bg-transparent';
  const th='px-1.5 py-2 text-center font-medium';
  return <div className="@container">
    {(searchable||savedOnly)&&<div className="mb-3 flex flex-wrap items-center gap-3">
      {searchable&&<label className="flex h-11 w-full items-center gap-2 rounded-lg border border-white/[.08] bg-[#080D17] px-3 text-slate-400 focus-within:border-[#10B981] sm:w-64">
        <Search size={15} aria-hidden="true"/><span className="sr-only">{national?'Filtrar selección':'Filtrar club'}</span>
        <input value={query} onChange={e=>onQuery(e.target.value)} placeholder={national?'Filtrar selección...':'Filtrar club...'} className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-slate-500"/>
      </label>}
      {savedOnly&&<button onClick={onClearSaved} className="min-h-11 rounded-lg bg-[#162032] px-3 text-xs text-slate-200">Solo tus favoritos. Mostrar todos</button>}
    </div>}
    {!rows.length?<p className="rounded-xl border border-dashed border-white/[.08] p-8 text-center text-sm text-slate-400">{emptyText||'No hay tabla publicada para esta competición todavía.'}</p>
    :!filtered.length?<p className="rounded-xl border border-dashed border-white/[.08] p-8 text-center text-sm text-slate-400">{national?'Ninguna selección coincide con el filtro.':'Ningún club coincide con el filtro.'}</p>
    :<div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-y-1 text-sm tabular-nums" id="league-standings">
        <caption className="sr-only">Tabla de posiciones</caption>
        <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
          <th scope="col" className="w-10 py-2 pl-2.5 font-medium sm:w-12 sm:pl-3"><span aria-hidden="true">Pos</span><span className="sr-only">Posición</span></th><th scope="col" className="py-2 font-medium">{national?'Selección':'Club'}</th>
          <th scope="col" className={th} title="Partidos jugados">PJ</th>
          {[['PG','Ganados'],['PE','Empatados'],['PP','Perdidos']].map(([h,t])=><th key={h} scope="col" title={t} className={`hidden ${th} @md:table-cell`}>{h}</th>)}
          {[['GF','Goles a favor'],['GC','Goles en contra']].map(([h,t])=><th key={h} scope="col" title={t} className={`hidden ${th} @lg:table-cell`}>{h}</th>)}
          <th scope="col" className={`hidden ${th} @sm:table-cell`} title="Diferencia de gol">DG</th>
          <th scope="col" className="px-2 py-2 text-center font-semibold text-[#10B981]">Pts</th>
          {analysis&&<><th scope="col" className={`hidden ${th} text-[#06B6D4] @2xl:table-cell`}>Pts/PJ</th><th scope="col" className={`hidden ${th} text-[#06B6D4] @2xl:table-cell`}>% Efect.</th></>}
          <th scope="col" className="hidden px-2 py-2 text-center font-medium @xl:table-cell">Racha</th><th scope="col" className="w-9 sm:w-11"><span className="sr-only">Favorito</span></th>
        </tr></thead>
        <tbody>
          {shown.map(t=>{const fav=favorites.includes(t.name),hl=highlight.includes(t.name),lead=t.rank===1;return <tr key={t.name} onClick={()=>onDetail(t)}
            className={`group cursor-pointer transition-colors [&>td]:border-y [&>td]:border-transparent [&>td:first-child]:rounded-l-lg [&>td:last-child]:rounded-r-lg ${hl?'[&>td]:border-[#10B981]/40 [&>td]:bg-[#10B981]/[.10]':lead?'[&>td]:border-[#10B981]/30 [&>td]:bg-[#10B981]/[.08] [&>td:first-child]:border-l [&>td:last-child]:border-r':'[&>td]:bg-white/[.02]'} hover:[&>td]:bg-white/[.05]`}>
            <td className={`relative py-2.5 pl-2.5 sm:pl-3 before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full ${stripe(t.rank)}`}><span className="flex items-center gap-0.5 sm:gap-1"><Num className={lead?'font-bold text-[#10B981]':'text-slate-400'}>{t.rank}</Num>{moves&&<Move delta={moves.get(t.name)}/>}</span></td>
            <td className="py-2.5"><button onClick={e=>{e.stopPropagation();onDetail(t);}} className="flex min-w-0 items-center gap-2 text-left text-white sm:gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[.04]"><Crest name={t.name} leagueId={leagueId} logo={t.logo} size={24}/></span>
              <span className="max-w-[74px] truncate text-[14px] font-semibold min-[400px]:max-w-[140px] @md:max-w-none">{t.name}</span>{hl&&<span className="rounded bg-[#10B981]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#6EE7B7]">Próximo</span>}</button></td>
            <td className="px-1.5 text-center text-slate-300"><Num>{t.pj}</Num></td>
            {['g','e','p'].map(k=><td key={k} className="hidden px-1.5 text-center text-slate-300 @md:table-cell"><Num>{t[k]}</Num></td>)}
            {['gf','gc'].map(k=><td key={k} className="hidden px-1.5 text-center text-slate-300 @lg:table-cell"><Num>{t[k]}</Num></td>)}
            <td className="hidden px-1.5 text-center @sm:table-cell"><Num className={t.dg>0?'text-[#10B981]':t.dg<0?'text-[#EF4444]':'text-slate-400'}>{t.dg>0?`+${t.dg}`:t.dg}</Num></td>
            <td className="px-2 text-center"><Num className="text-base font-extrabold text-white">{t.pts}</Num></td>
            {analysis&&<><td className="hidden px-1.5 text-center text-[#67E8F9] @2xl:table-cell"><Num>{t.pj?number(t.pts/t.pj,2):'—'}</Num></td>
              <td className="hidden px-1.5 @2xl:table-cell"><span className="flex items-center justify-center gap-1.5"><span className="h-1.5 w-10 rounded-full bg-white/[.06]"><span className="block h-full rounded-full bg-[#06B6D4]" style={{width:`${t.effectiveness||0}%`}}/></span><Num className="text-xs text-slate-300">{Number.isFinite(t.effectiveness)?`${number(t.effectiveness,0)}%`:'—'}</Num></span></td></>}
            <td className="hidden px-2 text-center @xl:table-cell"><Form values={t.form} small/></td>
            <td className="pr-0.5 text-right"><button aria-label={fav?`Quitar a ${t.name} de favoritos`:`Agregar a ${t.name} a favoritos`} aria-pressed={fav} onClick={e=>{e.stopPropagation();onFavorite(t.name);}} className="grid h-11 w-9 place-items-center text-slate-500 hover:text-[#10B981] sm:w-11"><Star size={15} className={fav?'fill-[#10B981] text-[#10B981]':''}/></button></td>
          </tr>;})}
        </tbody>
      </table>
    </div>}
    {n>0&&<p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500"><span className="flex items-center gap-1.5"><i className="h-3 w-[3px] rounded-full bg-[#10B981]"/>Parte alta</span>{bottom>0&&<span className="flex items-center gap-1.5"><i className="h-3 w-[3px] rounded-full bg-[#EF4444]"/>Parte baja</span>}{moves&&<span className="flex items-center gap-1"><ChevronUp size={12} className="text-[#10B981]"/><ChevronDown size={12} className="text-[#EF4444]"/>respecto a la fecha anterior</span>}<span>Franjas como referencia visual; la fuente no publica zonas oficiales.</span></p>}
    {!(searchable&&query)&&!savedOnly&&filtered.length>PREVIEW&&!highlight.length&&<div className="mt-3 text-center"><button onClick={()=>setAll(v=>!v)} aria-expanded={all} className="min-h-11 rounded-lg bg-[#162032] px-4 text-xs text-slate-300 transition hover:text-white">{all?'Mostrar menos':`Ver todas las posiciones (${filtered.length})`}</button></div>}
  </div>;
}
