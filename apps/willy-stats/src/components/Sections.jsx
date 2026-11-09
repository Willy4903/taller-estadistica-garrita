import React from 'react';
import {Num,LeagueMark} from './ui.jsx';
import {metrics,number} from '../data.js';
import {getRows} from '../lib.js';

export function Comparator({competitions,compare,onCompare,source,snapshot}){
  const cols=compare.map(id=>{
    const league=competitions.find(c=>c.id===id),rows=getRows({league,source,snapshot,group:0}),played=rows.filter(r=>r.pj>0);
    const m=played.length?metrics(league,rows):null;
    return {league,m,clubs:rows.length,leader:played[0]};
  });
  return <section id="comparador" className="mx-auto max-w-[1440px] px-5 py-14 md:px-8">
    <p className="font-mono text-xs uppercase tracking-widest text-[#22C55E]">Distintos ritmos. Un mismo lenguaje.</p>
    <h2 className="mt-1 font-heading text-3xl font-extrabold text-white">Comparador de ligas</h2>
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {cols.map((c,i)=><article key={i} className="rounded-2xl border border-[#1E2630] bg-[#12171D] p-5">
        <label className="block text-xs text-gray-400">Liga {i+1}
          <select value={compare[i]} onChange={e=>onCompare(compare.map((x,j)=>j===i?e.target.value:x))} className="mt-1 w-full rounded-lg border border-[#26303D] bg-[#0B0E11] px-3 py-2 text-base text-white sm:text-sm">
            {competitions.map(l=><option key={l.id} value={l.id}>{l.name} ({l.country})</option>)}
          </select></label>
        <div className="mt-4 flex items-center gap-3"><LeagueMark league={c.league} size={32}/><h3 className="font-heading text-xl font-extrabold text-white">{c.league.name}</h3></div>
        <dl className="mt-4 space-y-3 text-sm">
          {[['Goles por partido',c.m?.gpg!=null?number(c.m.gpg,2):'—'],['Índice de competitividad',c.m?.icl!=null?`${number(c.m.icl)} / 10`:'—'],['Clubes en la tabla',c.clubs||'—'],['Líder',c.leader?`${c.leader.name} (${c.leader.pts} PTS)`:'—']].map(([l,v])=>
            <div key={l} className="flex items-baseline justify-between gap-3 border-b border-[#1E2630] pb-2"><dt className="text-gray-400">{l}</dt><dd><Num className="text-right font-semibold text-white">{v}</Num></dd></div>)}
        </dl>
      </article>)}
    </div>
    <p className="mt-4 text-xs text-gray-500">Se calcula sobre la tabla seleccionada en cada liga (primer grupo publicado) y la fuente elegida arriba.</p>
  </section>;
}

export function Models(){
  const items=[['Qué es xG','Los goles esperados estiman la probabilidad de gol de cada tiro según su contexto. Requiere datos de eventos de cada disparo.'],
    ['Por qué no se publica','La fuente actual entrega tablas y marcadores, no tiros. Calcular xG a partir de goles observados sería inventar el dato.'],
    ['Qué se calcula hoy','Puntos por partido, efectividad, goles a favor y en contra por partido, diferencia de gol y el índice de competitividad de la liga.']];
  return <section id="modelos" className="border-y border-[#1E2630] bg-[#0f1318]">
    <div className="mx-auto max-w-[1440px] px-5 py-14 md:px-8">
      <p className="font-mono text-xs uppercase tracking-widest text-[#22C55E]">Modelos xG</p>
      <h2 className="mt-1 font-heading text-3xl font-extrabold text-white">Sin tiros, no hay xG.</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">{items.map(([t,d])=><article key={t} className="rounded-2xl border border-[#1E2630] bg-[#12171D] p-5"><h3 className="font-heading text-lg font-bold text-white">{t}</h3><p className="mt-2 text-sm leading-relaxed text-gray-400">{d}</p></article>)}</div>
    </div>
  </section>;
}

export function Methodology(){
  const rows=[['PJ','G + E + P'],['PTS','3 × G + E'],['DG','GF − GC'],['% Efectividad','PTS ÷ (3 × PJ)'],['Índice de competitividad','10 × (1 − 0.4 × σ/μ), limitado entre 0 y 10, sobre puntos por partido']];
  return <section id="metodologia" className="mx-auto grid max-w-[1440px] gap-10 px-5 py-14 md:px-8 lg:grid-cols-2">
    <div><p className="font-mono text-xs uppercase tracking-widest text-[#22C55E]">Transparencia por diseño</p>
      <h2 className="mt-1 font-heading text-3xl font-extrabold text-white">La fórmula importa. Sus límites, también.</h2>
      <ul className="mt-5 space-y-3 text-sm leading-relaxed text-gray-400">
        <li>Las tablas publicadas indican temporada, proveedor y fecha de captura. Si la captura es de un año anterior se muestra como archivo.</li>
        <li>Si una consulta falla se conserva la última captura válida con su fecha original. No se rellenan datos faltantes.</li>
        <li>La demostración es ficticia, se genera con una semilla fija y se rotula como tal.</li>
        <li>Las ilustraciones de telemetría (ondas de dominio y cronología xG) son sintéticas y se marcan como ilustrativas.</li>
        <li>No es un marcador en vivo: las capturas se actualizan cada tres horas como máximo.</li>
      </ul></div>
    <dl className="self-start rounded-2xl border border-[#1E2630] bg-[#12171D] p-5 text-sm">
      {rows.map(([k,v])=><div key={k} className="flex flex-col gap-1 border-b border-[#1E2630] py-3 last:border-0 sm:flex-row sm:justify-between sm:gap-6"><dt className="text-gray-400">{k}</dt><dd><Num className="text-white sm:text-right">{v}</Num></dd></div>)}
    </dl>
  </section>;
}
