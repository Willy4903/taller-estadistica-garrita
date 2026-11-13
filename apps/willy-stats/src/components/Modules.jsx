import React,{useState,useId} from 'react';
import {Trophy,Timer,Goal} from 'lucide-react';
import {Crest,Num} from './ui.jsx';
import {number} from '../data.js';
import {matchdays,matchdayLabel,probabilities} from '../lib.js';

export const card='rounded-2xl border border-white/[.08] bg-[#111827]';
const when=iso=>Number.isFinite(Date.parse(iso))?new Date(iso).toLocaleString('es-PE',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'America/Lima'}):'Por definir';
const pct=v=>`${Math.round(v)}%`;

function Kpi({label,icon,children,foot}){
  return <div className={`${card} flex min-w-0 flex-col justify-between gap-1.5 p-3.5 md:p-4`}>
    <p className="flex items-center justify-between gap-2 text-xs font-medium text-slate-400">{label}{icon}</p>
    <div className="flex min-w-0 items-end gap-2">{children}</div>
    {foot&&<div className="text-[11px] text-slate-400">{foot}</div>}
  </div>;
}

const CardIcon=({color})=><i className="inline-block h-[18px] w-[13px] rounded-[3px] shadow" style={{background:color}} aria-hidden="true"/>;

/** Cuatro indicadores del grupo o de la liga, todos con datos de la captura. */
export function Kpis({rows,leagueId,national,scope,played,total,gpg,gpgRef,refLabel,cards,homeShare}){
  const ranked=rows.filter(r=>r.pj>0);
  if(!ranked.length)return null;
  const leader=ranked[0],second=ranked[1],gap=second?leader.pts-second.pts:null;
  const diff=gpg!=null&&gpgRef?(gpg/gpgRef-1)*100:null;
  return <div className="-mx-4 grid snap-x snap-mandatory auto-cols-[72%] grid-flow-col gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:auto-cols-[42%] md:mx-0 md:px-0 lg:grid-flow-row lg:grid-cols-4 lg:overflow-visible [&::-webkit-scrollbar]:hidden [&>*]:snap-start" aria-label="Indicadores">
    <Kpi label={`Líder ${scope}`} icon={<Trophy size={15} className="text-[#F59E0B]" aria-hidden="true"/>} foot={gap==null?null:gap===0?<span>Igualado en puntos con {second.name}</span>:<span className="font-semibold text-[#10B981]">+<Num>{gap}</Num> {gap===1?'punto':'puntos'} de ventaja</span>}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[.05] ring-1 ring-[#10B981]/40"><Crest name={leader.name} leagueId={leagueId} logo={leader.logo} size={28}/></span>
      <span className="min-w-0"><span className="block truncate font-heading text-base font-extrabold leading-tight text-white">{leader.name}</span><Num className="text-xs text-slate-400">{leader.pts} pts</Num></span>
    </Kpi>
    <Kpi label="Partidos jugados" foot={total?<span className="block h-1.5 overflow-hidden rounded-full bg-white/[.06]" role="img" aria-label={`${played} de ${total} partidos jugados`}><span className="block h-full rounded-full bg-gradient-to-r from-[#0891B2] to-[#06B6D4] shadow-[0_0_10px_#06B6D4]" style={{width:`${Math.min(100,played/total*100)}%`}}/></span>:<span>según la tabla publicada</span>}>
      <Num className="text-2xl font-extrabold text-white md:text-3xl">{played}</Num>{total&&<Num className="pb-1 text-base text-slate-400">/ {total}</Num>}
    </Kpi>
    <Kpi label="Promedio de goles" foot={diff!=null?<span><span className={diff>=0?'text-[#06B6D4]':'text-[#F59E0B]'}>{diff>=0?'+':''}<Num>{number(diff,0)}%</Num></span> vs {refLabel}</span>:null}>
      <Num className="text-2xl font-extrabold text-white md:text-3xl">{gpg!=null?number(gpg,2):'—'}</Num><span className="pb-1 text-xs text-slate-400">por partido</span>
    </Kpi>
    {cards
      ?<Kpi label="Tarjetas totales" foot={<span>en <Num>{cards.matches}</Num> partidos con detalle</span>}>
        <span className="flex items-center gap-1.5"><Num className="text-2xl font-extrabold text-white md:text-3xl">{cards.yellow}</Num><CardIcon color="#F59E0B"/></span>
        <span className="ml-2 flex items-center gap-1.5"><Num className="text-2xl font-extrabold text-white md:text-3xl">{cards.red}</Num><CardIcon color="#EF4444"/></span>
      </Kpi>
      :homeShare?<Kpi label="Victorias locales" foot={<span><Num>{homeShare.home}</Num> de <Num>{homeShare.n}</Num> resultados publicados</span>}>
        <Num className="text-2xl font-extrabold text-white md:text-3xl">{number(homeShare.home/homeShare.n*100)}%</Num>
      </Kpi>:null}
  </div>;
}

/** Barra Local · Empate · Visita. */
export function ProbBar({p,compact=false}){
  if(!p)return null;
  return <div>
    <div className={`flex overflow-hidden rounded-full ${compact?'h-1.5':'h-2'}`} role="img" aria-label={`Probabilidad estimada: local ${pct(p.home)}, empate ${pct(p.draw)}, visita ${pct(p.away)}`}>
      <span className="bg-[#10B981]" style={{width:`${p.home}%`}}/><span className="bg-[#94A3B8]/60" style={{width:`${p.draw}%`}}/><span className="bg-[#06B6D4]" style={{width:`${p.away}%`}}/>
    </div>
    {!compact&&<p className="mt-1 flex justify-between text-[11px] tabular-nums"><span className="text-[#10B981]">Local {pct(p.home)}</span><span className="text-slate-400">Empate {pct(p.draw)}</span><span className="text-[#06B6D4]">Visita {pct(p.away)}</span></p>}
  </div>;
}

export function ScorersCard({list,scope,complete,leagueId,logo}){
  if(!list?.length)return null;
  const max=list[0].goals;
  return <section className={`${card} p-4`} aria-label="Goleadores">
    <div className="flex items-baseline justify-between gap-2"><h3 className="font-heading text-base font-bold text-white">Goleadores {scope}</h3><span className="text-[11px] text-slate-500">{complete?'Temporada':'Últimos 35 días'}</span></div>
    <ol className="mt-3 space-y-2">
      {list.map((s,i)=><li key={`${s.player}-${s.team}`} className="flex items-center gap-3">
        <Num className={`w-4 text-center text-xs ${i===0?'font-bold text-[#F59E0B]':'text-slate-500'}`}>{i+1}</Num>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[.05]"><Crest name={s.team} leagueId={leagueId} logo={logo(s.team_id,s.team)} size={22}/></span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white">{s.player}</span>
          <span className="mt-1 block h-1 rounded-full bg-white/[.06]"><span className="block h-full rounded-full bg-[#10B981]" style={{width:`${s.goals/max*100}%`}}/></span>
          <span className="mt-0.5 block truncate text-[11px] text-slate-500">{s.team}{s.penalties?` · ${s.penalties} de penal`:''}</span></span>
        <Num className="text-lg font-extrabold text-[#10B981]">{s.goals}</Num>
      </li>)}
    </ol>
    <p className="mt-3 text-[11px] text-slate-500">Según el detalle de cada partido publicado por el proveedor. No incluye autogoles.</p>
  </section>;
}

function Line({m,leagueId,logo,score=true}){
  const done=m.hg!=null;
  return <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[13px]">
    <span className="flex min-w-0 items-center justify-end gap-2"><span className={`truncate ${done&&m.hg<m.ag?'text-slate-400':'font-semibold text-white'}`}>{m.home}</span><Crest name={m.home} leagueId={leagueId} logo={logo(m.home_id,m.home)} size={20}/></span>
    {score&&done?<Num className="min-w-[48px] rounded-md bg-[#162032] px-2 py-0.5 text-center font-bold text-white">{m.hg} - {m.ag}</Num>:<span className="min-w-[48px] rounded-md bg-[#06B6D4]/15 px-2 py-0.5 text-center text-[11px] font-bold text-[#67E8F9]">VS</span>}
    <span className="flex min-w-0 items-center gap-2"><Crest name={m.away} leagueId={leagueId} logo={logo(m.away_id,m.away)} size={20}/><span className={`truncate ${done&&m.ag<m.hg?'text-slate-400':'font-semibold text-white'}`}>{m.away}</span></span>
  </div>;
}

export function HistoryCard({results,keyMatch,rows,leagueId,logo,onTab}){
  const recent=[...results].filter(m=>m.hg!=null).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,3);
  if(!recent.length&&!keyMatch)return null;
  const p=keyMatch?probabilities(keyMatch.h,keyMatch.a,rows,results):null;
  return <section className={`${card} p-4`} aria-label="Historial y próximos encuentros">
    <div className="flex items-center justify-between gap-2"><h3 className="font-heading text-base font-bold text-white">Historial y próximos</h3>
      <button onClick={()=>onTab('history')} className="min-h-9 rounded-md px-2 text-xs text-[#10B981] hover:bg-[#10B981]/10">Ver todo</button></div>
    {recent.length>0&&<div className="mt-2 space-y-2">{recent.map(m=><Line key={m.id} m={m} leagueId={leagueId} logo={logo}/>)}</div>}
    {keyMatch&&<div className="mt-4 rounded-xl border border-[#06B6D4]/25 bg-[#06B6D4]/[.06] p-3">
      <p className="mb-2 flex items-center justify-between gap-2 text-[11px]"><span className="font-semibold uppercase tracking-wider text-[#67E8F9]">Partido clave</span><span className="flex items-center gap-1 text-slate-400"><Timer size={12} aria-hidden="true"/><Num>{when(keyMatch.match.date)}</Num></span></p>
      <Line m={keyMatch.match} leagueId={leagueId} logo={logo} score={false}/>
      <p className="mt-1.5 flex justify-between text-[11px] text-slate-500"><span><Num>{keyMatch.h.rank}</Num>.º · <Num>{keyMatch.h.pts}</Num> pts</span><span><Num>{keyMatch.a.rank}</Num>.º · <Num>{keyMatch.a.pts}</Num> pts</span></p>
      {p&&<div className="mt-2.5"><ProbBar p={p}/><p className="mt-1.5 text-[10px] leading-snug text-slate-500">Estimación con un modelo de Poisson a partir de los goles por partido de la tabla. No es una cuota ni un pronóstico oficial.</p></div>}
    </div>}
  </section>;
}

/** Goles por fecha: barras interactivas y línea de promedio. */
export function GoalsByRoundCard({days}){
  const uid=useId(),[hover,setHover]=useState(null);
  if(days.length<2)return null;
  const W=360,H=170,L=24,R=6,T=14,B=22,iw=W-L-R,ih=H-T-B,n=days.length,slot=iw/n,bw=Math.min(28,slot*.66);
  const max=Math.max(1,...days.map(d=>d.goals)),top=Math.ceil(max/(max>12?5:2))*(max>12?5:2),step=top/(top>12?5:top/2>4?4:2);
  const y=v=>T+ih-v/top*ih,avg=days.reduce((s,d)=>s+d.goals,0)/n;
  const h=hover!=null?days[hover]:null;
  return <section className={`${card} p-4`} aria-label="Goles por jornada">
    <div className="flex items-baseline justify-between gap-2"><h3 className="font-heading text-base font-bold text-white">Goles por jornada</h3><span className="text-[11px] text-slate-500">Promedio <Num className="text-slate-300">{number(avg,1)}</Num></span></div>
    <div className="relative mt-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-labelledby={uid}>
        <title id={uid}>{`Goles por fecha: ${days.map(d=>`${d.label}, ${d.goals} goles en ${d.n} partidos`).join('; ')}.`}</title>
        <defs><linearGradient id={`${uid}-c`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#22D3EE"/><stop offset="1" stopColor="#0E7490"/></linearGradient><linearGradient id={`${uid}-e`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#34D399"/><stop offset="1" stopColor="#059669"/></linearGradient></defs>
        {Array.from({length:Math.floor(top/step)+1},(_,k)=>k*step).map(v=><g key={v}><line x1={L} x2={W-R} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,.06)"/><text x={L-5} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize="9" className="fill-slate-500 font-mono">{v}</text></g>)}
        {days.map((d,i)=>{const x=L+slot*i+slot/2,last=i===n-1,on=hover===i;return <g key={i}>
          <rect x={x-bw/2} y={y(d.goals)} width={bw} height={T+ih-y(d.goals)} rx="3" fill={`url(#${uid}-${last?'e':'c'})`} opacity={hover==null||on?1:.45}/>
          {(n<=14||i%2===n%2||last)&&<text x={x} y={H-7} textAnchor="middle" fontSize="9" className={on||last?'fill-white':'fill-slate-500'}>{d.index}</text>}
          <rect x={L+slot*i} y={T} width={slot} height={ih+B} fill="transparent" onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)} onClick={()=>setHover(i)}/>
        </g>;})}
        <line x1={L} x2={W-R} y1={y(avg)} y2={y(avg)} stroke="#F59E0B" strokeDasharray="4 3" strokeWidth="1.2"/>
      </svg>
      {h&&<div className="pointer-events-none absolute top-0 rounded-lg border border-white/10 bg-[#080D17]/95 px-2.5 py-1.5 text-[11px] shadow-xl" style={{left:`clamp(0px, calc(${((L+slot*hover+slot/2)/W*100).toFixed(1)}% - 60px), calc(100% - 130px))`}}>
        <p className="font-semibold text-white">Fecha {h.index} · {h.label}</p><p className="text-slate-300"><Num className="text-white">{h.goals}</Num> goles en <Num>{h.n}</Num> partidos · <Num>{number(h.gpg,2)}</Num> por partido</p></div>}
    </div>
    <p className="mt-1 flex items-center gap-3 text-[11px] text-slate-500"><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-[#06B6D4]"/>Goles de la fecha</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-[#10B981]"/>Última</span><span className="flex items-center gap-1"><i className="h-px w-3 bg-[#F59E0B]"/>Promedio</span></p>
  </section>;
}

/** Partidos agrupados por fecha. Próximos con probabilidad estimada; jugados con goleadores si el proveedor los publica. */
export function MatchList({list,mode,rows,results,leagueId,logo,favorites,savedOnly,find}){
  const days=matchdays(list.filter(m=>!savedOnly||favorites.includes(m.home)||favorites.includes(m.away)));
  const ordered=mode==='played'?[...days].reverse():days;
  if(!ordered.length)return <p className="rounded-xl border border-dashed border-white/[.08] p-8 text-center text-sm text-slate-400">{mode==='next'?'No hay próximos partidos en la captura publicada.':'No hay resultados en la captura publicada.'}</p>;
  const total=days.length;
  return <div className="space-y-5">
    {ordered.map((d,k)=>{const idx=mode==='played'?total-k:k+1;return <section key={idx} aria-label={`Fecha ${matchdayLabel(d)}`}>
      <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><span className="rounded-md bg-[#162032] px-2 py-0.5 text-white">{mode==='played'?`Fecha ${idx}`:k===0?'Próxima fecha':`Fecha +${k}`}</span><span className="normal-case tracking-normal text-slate-500">{matchdayLabel(d)}</span></h4>
      <ul className="space-y-1.5">{d.map(m=>{const h=find(m.home_id,m.home),a=find(m.away_id,m.away),p=mode==='next'&&h&&a?probabilities(h,a,rows,results):null;
        const goals=Array.isArray(m.goals)?m.goals:null;return <li key={m.id} className="rounded-xl border border-white/[.05] bg-white/[.02] px-3 py-2.5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
          <span className="flex min-w-0 items-center justify-end gap-2"><span className={`truncate ${m.hg!=null&&m.hg<m.ag?'text-slate-400':'font-semibold text-white'}`}>{m.home}</span><Crest name={m.home} leagueId={leagueId} logo={logo(m.home_id,m.home)} size={22}/></span>
          <span className="min-w-[84px] text-center">{m.hg==null?<Num className="text-[11px] text-slate-400">{when(m.date)}</Num>:<Num className="rounded-md bg-[#162032] px-3 py-1 font-bold text-white">{m.hg} - {m.ag}</Num>}</span>
          <span className="flex min-w-0 items-center gap-2"><Crest name={m.away} leagueId={leagueId} logo={logo(m.away_id,m.away)} size={22}/><span className={`truncate ${m.hg!=null&&m.ag<m.hg?'text-slate-400':'font-semibold text-white'}`}>{m.away}</span></span>
        </div>
        {p&&<div className="mx-auto mt-2 max-w-sm"><ProbBar p={p} compact/><p className="mt-1 flex justify-between text-[10px] tabular-nums text-slate-500"><span>{pct(p.home)}</span><span>Empate {pct(p.draw)}</span><span>{pct(p.away)}</span></p></div>}
        {goals?.length>0&&<p className="mt-1.5 flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500"><Goal size={12} className="text-slate-600" aria-hidden="true"/>{goals.map((g,i)=><span key={i}>{g.player||'Sin dato'}{g.minute?` ${g.minute}`:''}{g.penalty?' (p)':''}{g.own_goal?' (ag)':''}</span>)}</p>}
      </li>;})}</ul>
    </section>;})}
    {mode==='next'&&<p className="text-[11px] text-slate-500">Barras: probabilidad estimada (local, empate, visita) con un modelo de Poisson sobre los goles por partido de la tabla. No es una cuota ni un pronóstico oficial.</p>}
  </div>;
}
