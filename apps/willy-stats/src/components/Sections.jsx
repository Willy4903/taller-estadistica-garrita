import React from 'react';
import {Num,LeagueMark} from './ui.jsx';
import {parity,goalsPerMatch,number,MIN_CLUBS,MIN_MATCHES} from '../data.js';
import {getRows} from '../lib.js';

export function Comparator({competitions,compare,onCompare,snapshot}){
  const cols=compare.map(id=>{
    const league=competitions.find(c=>c.id===id),pub=snapshot[id],rows=getRows({league,snapshot,group:0}),played=rows.filter(r=>r.pj>0);
    const leader=played[0],second=played[1];
    return {league,groupName:pub?.groups?.[0]?.name,gpg:played.length?goalsPerMatch(rows):null,p:parity(rows),clubs:rows.length,leader,gap:leader&&second?leader.pts-second.pts:null};
  });
  return <section id="comparador" className="mx-auto max-w-[1440px] px-5 py-14 md:px-8">
    <p className="font-mono text-xs uppercase tracking-widest text-[#10B981]">Distintos ritmos. Un mismo lenguaje.</p>
    <h2 className="mt-1 font-heading text-3xl font-extrabold text-white">Comparador de ligas</h2>
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {cols.map((c,i)=><article key={i} className="rounded-2xl border border-white/[.08] bg-[#111827] p-5">
        <label className="block text-xs text-slate-400">Liga {i+1}
          <select value={compare[i]} onChange={e=>onCompare(compare.map((x,j)=>j===i?e.target.value:x))} className="mt-1 w-full rounded-lg border border-white/[.08] bg-[#080D17] px-3 py-2 text-base text-white sm:text-sm">
            {competitions.map(l=><option key={l.id} value={l.id}>{l.name} ({l.country})</option>)}
          </select></label>
        <div className="mt-4 flex items-center gap-3"><LeagueMark league={c.league} size={32}/><div><h3 className="font-heading text-xl font-extrabold leading-tight text-white">{c.league.name}</h3>{c.groupName&&<p className="text-[11px] text-slate-500">{c.groupName}</p>}</div></div>
        <dl className="mt-4 space-y-3 text-sm">
          {[['Goles por partido',c.gpg!=null?number(c.gpg,2):'—'],
            [c.league.teamType==='national'?'Partidos por selección':'Partidos por club',c.p?number(c.p.matches,0):'—'],
            ['Líder',c.leader?`${c.leader.name} (${c.leader.pts} PTS)`:'—'],
            ['Ventaja del líder',c.gap!=null?`${c.gap} ${c.gap===1?'punto':'puntos'}`:'—']].map(([l,v])=>
            <div key={l} className="flex items-baseline justify-between gap-3 border-b border-white/[.08] pb-2"><dt className="text-slate-400">{l}</dt><dd><Num className="text-right font-semibold text-white">{v}</Num></dd></div>)}
        </dl>
        <div className="mt-4 rounded-xl bg-[#162032] p-3">
          <p className="text-xs text-slate-400">Diferencia típica de nivel</p>
          {c.p?<>
            <p className="mt-1"><Num className="text-2xl font-bold text-[#10B981]">±{c.p.level.toFixed(2)}</Num> <span className="text-xs text-slate-400">pts por partido</span></p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">Equivale a unos <Num className="text-slate-200">{Math.round(c.p.level*38)}</Num> puntos en 38 partidos. Margen de error: <Num className="text-slate-200">{c.p.low.toFixed(2)} a {c.p.high.toFixed(2)}</Num>.</p>
          </>:<p className="mt-1 text-xs leading-relaxed text-slate-400">No comparable: la tabla tiene menos de {MIN_CLUBS} {c.league.teamType==='national'?'selecciones':'clubes'} o menos de {MIN_MATCHES} partidos por {c.league.teamType==='national'?'selección':'club'} (grupos pequeños o fases de copa).</p>}
        </div>
      </article>)}
    </div>
    <div className="mt-6 rounded-2xl border border-white/[.08] bg-[#111827] p-5 text-sm leading-relaxed text-slate-400">
      <h3 className="font-heading text-base font-bold text-white">Cómo se interpreta la diferencia de nivel</h3>
      <ul className="mt-2 list-disc space-y-1.5 pl-5">
        <li>Mide cuánto se separan los clubes en puntos por partido por nivel real, no por suerte. Un valor cercano a 0 indica una liga muy pareja; valores altos, una liga con clubes claramente superiores e inferiores.</li>
        <li>Se resta el azar que produciría una liga de clubes idénticos con los mismos partidos jugados y la misma tasa de empates. Por eso una tabla con pocos partidos no parece más desigual solo por tener más ruido.</li>
        <li>Con 10 a 16 partidos por club el margen de error es amplio. Si los rangos de dos ligas se solapan, no se puede afirmar cuál es más pareja.</li>
        <li>Mide paridad dentro de la liga. No dice nada sobre la calidad de una liga frente a otra.</li>
      </ul>
    </div>
  </section>;
}

export function Methodology(){
  const rows=[['PJ','G + E + P'],['PTS','3 × G + E'],['DG','GF − GC'],['% Efectividad','PTS ÷ (3 × PJ)'],['Diferencia de nivel','√(σ² observada − σ² del azar), con σ² del azar = varianza de un partido ÷ partidos por club']];
  return <section id="metodologia" className="mx-auto grid max-w-[1440px] gap-10 px-5 py-14 md:px-8 lg:grid-cols-2">
    <div><p className="font-mono text-xs uppercase tracking-widest text-[#10B981]">Transparencia por diseño</p>
      <h2 className="mt-1 font-heading text-3xl font-extrabold text-white">La fórmula importa. Sus límites, también.</h2>
      <ul className="mt-5 space-y-3 text-sm leading-relaxed text-slate-400">
        <li>Las tablas publicadas indican temporada, proveedor y fecha de captura. Si la captura es de un año anterior se muestra como archivo.</li>
        <li>Si una consulta falla se conserva la última captura válida con su fecha original. No se rellenan datos faltantes.</li>
        <li>Si una cifra no está en la fuente (xG, posesión, tiros), no se muestra ni se estima.</li>
        <li>Las fechas se agrupan con los resultados publicados: una fecha termina tras más de 36 horas sin partidos o cuando un club vuelve a jugar.</li>
        <li>No es un marcador en vivo: las capturas se actualizan cada tres horas como máximo.</li>
      </ul></div>
    <dl className="self-start rounded-2xl border border-white/[.08] bg-[#111827] p-5 text-sm">
      {rows.map(([k,v])=><div key={k} className="flex flex-col gap-1 border-b border-white/[.08] py-3 last:border-0 sm:flex-row sm:justify-between sm:gap-6"><dt className="text-slate-400">{k}</dt><dd><Num className="text-white sm:text-right">{v}</Num></dd></div>)}
    </dl>
  </section>;
}
