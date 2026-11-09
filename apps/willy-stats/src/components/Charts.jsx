import React,{useId} from 'react';
import {Num} from './ui.jsx';

/** Radar de 5 ejes. Los valores vienen normalizados (0-1) contra la liga seleccionada. */
export function Radar({axes,teamName}){
  const cx=150,cy=140,R=92,n=axes.length;
  const pt=(i,v)=>{const a=-Math.PI/2+i*2*Math.PI/n;return [cx+Math.cos(a)*R*v,cy+Math.sin(a)*R*v];};
  const poly=key=>axes.map((a,i)=>pt(i,Math.max(.04,a[key])).join(',')).join(' ');
  return <svg viewBox="0 0 300 280" className="mx-auto w-full max-w-[320px]" role="img" aria-label={`Radar de ${teamName}: ${axes.map(a=>`${a.label} ${Math.round(a.team*100)} de 100`).join(', ')}. Línea naranja: promedio de la liga.`}>
    {[.25,.5,.75,1].map(r=><polygon key={r} points={axes.map((_,i)=>pt(i,r).join(',')).join(' ')} fill="none" stroke="#26303D" strokeWidth="1"/>)}
    {axes.map((_,i)=>{const [x,y]=pt(i,1);return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#26303D"/>;})}
    <polygon points={poly('avg')} fill="#F97316" fillOpacity=".08" stroke="#F97316" strokeWidth="1.8" strokeDasharray="4 3"/>
    <polygon points={poly('team')} fill="#22C55E" fillOpacity=".28" stroke="#22C55E" strokeWidth="2.2"/>
    {axes.map((a,i)=>{const [x,y]=pt(i,1.2);return <text key={a.label} x={x} y={y} textAnchor={x<cx-5?'end':x>cx+5?'start':'middle'} dominantBaseline="middle" className="fill-gray-300" fontSize="11">{a.label}</text>;})}
  </svg>;
}

/** Goles por partido en las últimas jornadas completas. Cifras reales de los resultados publicados. */
export function GoalsTrend({trend}){
  const max=Math.max(1,...trend.map(t=>t.gpg));
  return <div>
    <ul className="flex h-24 items-end gap-2" aria-label="Goles por partido en las últimas fechas">
      {trend.map((t,i)=><li key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${t.label}: ${t.gpg.toFixed(2)} goles por partido en ${t.n} partidos`}>
        <Num className="text-[10px] text-gray-300">{t.gpg.toFixed(1)}</Num>
        <div className={`w-full rounded-t ${i===trend.length-1?'bg-[#22C55E]':'bg-[#22C55E]/40'}`} style={{height:`${Math.max(6,t.gpg/max*64)}px`}}/>
      </li>)}
    </ul>
    <p className="mt-1 flex justify-between text-[10px] text-gray-500"><span>Más antigua</span><span>Última fecha</span></p>
  </div>;
}

const SCALE=1;
/** Barra = diferencia típica de nivel (pts/partido); la línea fina es el margen de error. Más corta = más pareja. */
export function ParityBars({items,activeId}){
  const pct=v=>`${Math.min(100,v/SCALE*100)}%`;
  return <ul className="space-y-3">
    {items.map(({id,name,continent,p})=><li key={id} className={id===activeId?'rounded-lg bg-[#1A212B] p-2 -mx-2':''}>
      <div className="mb-1 flex justify-between text-xs"><span className={id===activeId?'font-semibold text-white':'text-gray-300'}>{name}</span>
        <Num className="text-gray-300">{p.level.toFixed(2)} <span className="text-gray-500">({p.low.toFixed(2)} a {p.high.toFixed(2)})</span></Num></div>
      <div className="relative h-2 rounded-full bg-[#1A212B]" role="img" aria-label={`${name}: diferencia de nivel ${p.level.toFixed(2)} puntos por partido, rango ${p.low.toFixed(2)} a ${p.high.toFixed(2)}`}>
        <div className={`h-full rounded-full ${continent==='América'?'bg-[#22C55E]':'bg-[#F97316]'}`} style={{width:pct(p.level)}}/>
        <div className="absolute top-1/2 h-px -translate-y-1/2 bg-white/70" style={{left:pct(p.low),width:`calc(${pct(p.high)} - ${pct(p.low)})`}}/>
        <div className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-white/70" style={{left:pct(p.low)}}/><div className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-white/70" style={{left:pct(p.high)}}/>
      </div>
    </li>)}
    <li className="flex gap-4 pt-1 text-xs text-gray-400"><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#22C55E]"/>América</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#F97316]"/>Europa</span></li>
  </ul>;
}
