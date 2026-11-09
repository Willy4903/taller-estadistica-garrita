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

/** Datos sintéticos y deterministas. Se rotulan como ilustrativos donde se usan. */
export function Momentum({home}){
  const id=useId().replace(/:/g,''),W=600,H=150,mid=H/2;
  const pts=Array.from({length:91},(_,m)=>{const v=Math.sin(m/5.5)*.55+Math.sin(m/2.1+1.3)*.28+Math.sin(m/13)*.3;return [m/90*W,mid-v*mid*.78];});
  const line=pts.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
  const area=`${line}L${W} ${mid}L0 ${mid}Z`;
  return <div>
    <svg viewBox={`0 0 ${W} ${H+22}`} className="w-full" role="img" aria-label="Ilustración de ondas de dominio entre el minuto 0 y el 90. Datos sintéticos, no corresponden a un partido real.">
      <defs><clipPath id={`${id}u`}><rect width={W} height={mid}/></clipPath><clipPath id={`${id}d`}><rect y={mid} width={W} height={mid}/></clipPath></defs>
      <path d={area} fill="#22C55E" fillOpacity=".75" clipPath={`url(#${id}u)`}/><path d={area} fill="#F97316" fillOpacity=".75" clipPath={`url(#${id}d)`}/>
      <line x1="0" x2={W} y1={mid} y2={mid} stroke="#3a4757"/>
      {[0,10,20,30,40,50,60,70,80,90].map(m=><text key={m} x={m/90*W} y={H+16} fontSize="10" textAnchor={m===0?'start':m===90?'end':'middle'} className="fill-gray-500 font-mono">{m}</text>)}
    </svg>
    <p className="mt-1 flex gap-4 text-xs text-gray-400"><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#22C55E]"/>{home}</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#F97316]"/>Rival</span></p>
  </div>;
}

export function XgTimeline({home}){
  const events=[18,32,41,63,78];
  return <div>
    <div className="relative mt-5 h-3.5 overflow-hidden rounded-full bg-[#1A212B]" role="img" aria-label="Ilustración de una cronología de xG con cinco ocasiones. Datos sintéticos.">
      <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#22C55E] to-[#15803d]" style={{width:'46%'}}/><div className="absolute inset-y-0 right-0 bg-gradient-to-r from-[#c2410c] to-[#F97316]" style={{width:'54%'}}/>
      {events.map(m=><span key={m} className="absolute top-0 h-full w-px bg-white/80" style={{left:`${m/90*100}%`}}/>)}
    </div>
    <div className="relative h-8">{events.map(m=><span key={m} className="absolute top-1 -translate-x-1/2 text-center" style={{left:`${m/90*100}%`}}><span className="mx-auto block h-3 w-3 rounded-full border border-white bg-[#0B0E11]"/><Num className="text-[10px] text-gray-400">{m}&apos;</Num></span>)}</div>
    <p className="text-xs text-gray-400">xG {home} vs rival</p>
  </div>;
}

export function IclBars({items}){
  return <ul className="space-y-2.5">
    {items.map(({id,name,icl,continent})=><li key={id} className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
      <div><div className="mb-1 flex justify-between text-xs"><span className="text-gray-300">{name}</span><Num className="text-gray-400">{icl==null?'—':icl.toFixed(1)}</Num></div>
        <div className="h-2 overflow-hidden rounded-full bg-[#1A212B]" role="img" aria-label={`${name}: ${icl==null?'sin datos':icl.toFixed(1)} sobre 10`}>{icl!=null&&<div className={`h-full rounded-full ${continent==='América'?'bg-[#22C55E]':'bg-[#F97316]'}`} style={{width:`${icl*10}%`}}/>}</div></div>
    </li>)}
    <li className="flex gap-4 pt-1 text-xs text-gray-400"><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#22C55E]"/>Sudamérica</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#F97316]"/>Europa</span></li>
  </ul>;
}
