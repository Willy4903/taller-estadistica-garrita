import React from 'react';
import {Num} from './ui.jsx';
import {GoalsTrend} from './Charts.jsx';
import {number} from '../data.js';

const Card=({title,subtitle,children})=><section className="min-w-0 rounded-2xl border border-white/[.08] bg-[#162032] p-4" aria-label={title}>
  <h3 className="font-heading text-base font-bold text-white">{title}</h3>
  {subtitle&&<p className="mb-3 text-xs text-slate-400">{subtitle}</p>}
  {children}
</section>;

export function LastRoundCard({summary}){
  if(!summary)return null;
  const {n,goals,gpg,home,draws,away,biggest,trend,label,partial}=summary,pct=v=>`${Math.round(v/n*100)}%`;
  return <Card title="Última fecha en números" subtitle={`${label}${partial?' · fecha incompleta en la captura':''}`}>
    <dl className="grid grid-cols-3 gap-1.5 text-center">
      {[[number(gpg,2),'goles por partido'],[goals,'goles'],[n,'partidos']].map(([v,l])=><div key={l} className="rounded-lg bg-[#1E293B] px-1 py-2"><dd><Num className="text-lg font-bold text-[#10B981]">{v}</Num></dd><dt className="text-[10px] leading-tight text-slate-400">{l}</dt></div>)}
    </dl>
    <div className="mt-3" role="img" aria-label={`Locales ${home}, empates ${draws}, visitantes ${away}`}>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-[#1E293B]">
        <div className="bg-[#10B981]" style={{width:pct(home)}}/><div className="bg-[#94A3B8]" style={{width:pct(draws)}}/><div className="bg-[#F97316]" style={{width:pct(away)}}/>
      </div>
      <p className="mt-1 flex justify-between text-[11px] text-slate-400"><span>Local <Num>{home}</Num></span><span>Empate <Num>{draws}</Num></span><span>Visita <Num>{away}</Num></span></p>
    </div>
    {biggest&&<p className="mt-3 rounded-lg bg-[#1E293B] px-3 py-2 text-xs leading-relaxed text-slate-300">Mayor diferencia: <span className="text-white">{biggest.home} <Num className="font-bold">{biggest.hg}-{biggest.ag}</Num> {biggest.away}</span></p>}
    {trend.length>1&&<div className="mt-3"><p className="mb-1 text-xs text-slate-400">Goles por partido, últimas fechas</p><GoalsTrend trend={trend}/></div>}
  </Card>;
}

export function ImpactCard({impact}){
  if(!impact)return null;
  const when=iso=>Number.isFinite(Date.parse(iso))?new Date(iso).toLocaleString('es-PE',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'America/Lima'}):'';
  return <Card title="Próxima fecha: lo que está en juego" subtitle={`${impact.label} · partidos entre los mejor ubicados`}>
    <ul className="space-y-2">
      {impact.items.map(({match,h,a,gap})=><li key={match.id} className="rounded-lg bg-[#1E293B] px-3 py-2 text-xs">
        <p className="flex items-center justify-between gap-2 text-sm text-white"><span className="truncate">{h.name}</span><span className="text-slate-500">vs</span><span className="truncate text-right">{a.name}</span></p>
        <p className="mt-1 flex justify-between text-slate-400"><span><Num>{h.rank}.º</Num> · <Num>{h.pts}</Num> pts</span><span><Num>{a.rank}.º</Num> · <Num>{a.pts}</Num> pts</span></p>
        <p className="mt-1 text-slate-500"><Num>{when(match.date)}</Num>{gap<=3?<span className="ml-2 text-[#10B981]">Diferencia de {gap} {gap===1?'punto':'puntos'}</span>:null}</p>
      </li>)}
    </ul>
  </Card>;
}

export function StreaksCard({streaks}){
  if(!streaks||(!streaks.hot.length&&!streaks.cold.length))return null;
  const List=({title,items,tone})=>items.length>0&&<div><p className={`mb-1 text-xs ${tone}`}>{title}</p><ul className="space-y-1">{items.map(t=><li key={t.name} className="flex justify-between text-sm text-slate-200"><span className="truncate">{t.name}</span><Num className="text-slate-400">{t.rank}.º</Num></li>)}</ul></div>;
  return <Card title="Rachas" subtitle="Según sus últimos cinco partidos">
    <div className="space-y-3"><List title="Al menos 4 victorias seguidas de 5" items={streaks.hot} tone="text-[#10B981]"/><List title="Sin ganar en los últimos 5" items={streaks.cold} tone="text-[#EF4444]"/></div>
  </Card>;
}
