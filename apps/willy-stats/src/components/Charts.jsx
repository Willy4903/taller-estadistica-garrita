import React,{useId} from 'react';
import {Num} from './ui.jsx';

/** Radar de 5 ejes. Los valores vienen normalizados (0-1) contra la liga seleccionada. */
export function Radar({axes,teamName}){
  const cx=150,cy=140,R=92,n=axes.length;
  const pt=(i,v)=>{const a=-Math.PI/2+i*2*Math.PI/n;return [cx+Math.cos(a)*R*v,cy+Math.sin(a)*R*v];};
  const poly=key=>axes.map((a,i)=>pt(i,Math.max(.04,a[key])).join(',')).join(' ');
  return <svg viewBox="0 0 300 280" className="mx-auto w-full max-w-[320px]" role="img" aria-label={`Radar de ${teamName}: ${axes.map(a=>`${a.label} ${Math.round(a.team*100)} de 100`).join(', ')}. Línea gris: promedio.`}>
    {[.25,.5,.75,1].map(r=><polygon key={r} points={axes.map((_,i)=>pt(i,r).join(',')).join(' ')} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="1"/>)}
    {axes.map((_,i)=>{const [x,y]=pt(i,1);return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,.1)"/>;})}
    <polygon points={poly('avg')} fill="#94A3B8" fillOpacity=".06" stroke="#94A3B8" strokeWidth="1.8" strokeDasharray="4 3"/>
    <polygon points={poly('team')} fill="#10B981" fillOpacity=".28" stroke="#10B981" strokeWidth="2.2"/>
    {axes.map((a,i)=>{const [x,y]=pt(i,1.2);return <text key={a.label} x={x} y={y} textAnchor={x<cx-5?'end':x>cx+5?'start':'middle'} dominantBaseline="middle" className="fill-slate-300" fontSize="11">{a.label}</text>;})}
  </svg>;
}

/** Goles por partido en las últimas jornadas completas. Cifras reales de los resultados publicados. */
export function GoalsTrend({trend}){
  const max=Math.max(1,...trend.map(t=>t.gpg));
  return <div>
    <ul className="flex h-24 items-end gap-2" aria-label="Goles por partido en las últimas fechas">
      {trend.map((t,i)=><li key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${t.label}: ${t.gpg.toFixed(2)} goles por partido en ${t.n} partidos`}>
        <Num className="text-[10px] text-slate-300">{t.gpg.toFixed(1)}</Num>
        <div className={`w-full rounded-t ${i===trend.length-1?'bg-[#10B981]':'bg-[#10B981]/40'}`} style={{height:`${Math.max(6,t.gpg/max*64)}px`}}/>
      </li>)}
    </ul>
    <p className="mt-1 flex justify-between text-[10px] text-slate-500"><span>Más antigua</span><span>Última fecha</span></p>
  </div>;
}

const SCALE=1;
/** Barra = diferencia típica de nivel (pts/partido); la línea fina es el margen de error. Más corta = más pareja. */
export function ParityBars({items,activeId}){
  const pct=v=>`${Math.min(100,v/SCALE*100)}%`;
  return <ul className="space-y-3">
    {items.map(({id,name,continent,p})=><li key={id} className={id===activeId?'rounded-lg bg-[#162032] p-2 -mx-2':''}>
      <div className="mb-1 flex justify-between text-xs"><span className={id===activeId?'font-semibold text-white':'text-slate-300'}>{name}</span>
        <Num className="text-slate-300">{p.level.toFixed(2)} <span className="text-slate-500">({p.low.toFixed(2)} a {p.high.toFixed(2)})</span></Num></div>
      <div className="relative h-2 rounded-full bg-[#162032]" role="img" aria-label={`${name}: diferencia de nivel ${p.level.toFixed(2)} puntos por partido, rango ${p.low.toFixed(2)} a ${p.high.toFixed(2)}`}>
        <div className={`h-full rounded-full ${continent==='América'?'bg-[#10B981]':'bg-[#F97316]'}`} style={{width:pct(p.level)}}/>
        <div className="absolute top-1/2 h-px -translate-y-1/2 bg-white/70" style={{left:pct(p.low),width:`calc(${pct(p.high)} - ${pct(p.low)})`}}/>
        <div className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-white/70" style={{left:pct(p.low)}}/><div className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-white/70" style={{left:pct(p.high)}}/>
      </div>
    </li>)}
    <li className="flex gap-4 pt-1 text-xs text-slate-400"><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#10B981]"/>América</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#F97316]"/>Europa</span></li>
  </ul>;
}

/** Abreviatura para el eje: iniciales si el nombre tiene varias palabras, tres letras si es una. */
export const abbr=name=>{const w=String(name).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9 ]/g,' ').split(/\s+/).filter(x=>x&&!/^(de|of|the|fc|cf|ca|cd|sc|ac)$/i.test(x));
  return (w.length>1?w.slice(0,3).map(x=>x[0]).join(''):(w[0]||'?').slice(0,3)).toUpperCase();};

/** Mini línea de tendencia. */
export function Sparkline({values,className='h-8 w-24'}){
  if(values.length<2)return null;
  const lo=Math.min(...values),hi=Math.max(...values),W=96,H=32;
  const pts=values.map((v,i)=>[i/(values.length-1)*W,H-3-(hi===lo?.5:(v-lo)/(hi-lo))*(H-6)]);
  const d=pts.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const last=pts[pts.length-1];
  return <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden="true" preserveAspectRatio="none">
    <path d={`${d} L${W} ${H} L0 ${H} Z`} fill="#10B981" fillOpacity=".12"/>
    <path d={d} fill="none" stroke="#10B981" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
    <circle cx={last[0]} cy={last[1]} r="2.6" fill="#10B981"/>
  </svg>;
}

/** Indicador circular de progreso (0-100). */
export function Ring({value,size=64,label}){
  const r=(size-8)/2,c=2*Math.PI*r,v=Math.max(0,Math.min(100,value||0));
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className="shrink-0 -rotate-90">
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="7"/>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#10B981" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${c*v/100} ${c}`} style={{transition:'stroke-dasharray .6s ease'}}/>
  </svg>;
}

/** Barras de goles a favor y línea de goles en contra por equipo, en el orden de la tabla. */
export function GoalsChart({rows,onPick,focus}){
  const uid=useId(),[hover,setHover]=React.useState(null);
  const list=rows.filter(r=>r.pj>0);
  if(!list.length)return <p className="py-10 text-center text-sm text-slate-400">Sin partidos jugados.</p>;
  const W=440,H=230,L=28,R=8,T=12,B=30,iw=W-L-R,ih=H-T-B,n=list.length,slot=iw/n,bw=Math.min(34,slot*.62);
  const max=Math.max(1,...list.flatMap(r=>[r.gf,r.gc])),step=max<=6?1:max<=12?2:max<=30?5:10,top=Math.ceil(max/step)*step;
  const y=v=>T+ih-v/top*ih,x=i=>L+slot*i+slot/2;
  const line=list.map((r,i)=>`${i?'L':'M'}${x(i).toFixed(1)} ${y(r.gc).toFixed(1)}`).join(' ');
  const h=hover!=null?list[hover]:null;
  return <div className="relative">
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-labelledby={uid}>
      <title id={uid}>{`Goles a favor (barras) y en contra (línea) por equipo: ${list.map(r=>`${r.name} ${r.gf} a favor, ${r.gc} en contra`).join('; ')}.`}</title>
      <defs><linearGradient id={`${uid}-g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#34D399"/><stop offset="1" stopColor="#059669"/></linearGradient></defs>
      {Array.from({length:top/step+1},(_,k)=>k*step).map(v=><g key={v}><line x1={L} x2={W-R} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,.06)"/><text x={L-6} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize="10" className="fill-slate-500 font-mono">{v}</text></g>)}
      {list.map((r,i)=>{const active=hover===i||focus===r.name;return <g key={r.name}>
        <rect x={x(i)-bw/2} y={y(r.gf)} width={bw} height={Math.max(0,T+ih-y(r.gf))} rx="3" fill={`url(#${uid}-g)`} opacity={hover==null&&!focus||active?1:.45}/>
        <text x={x(i)} y={H-12} textAnchor="middle" fontSize={n>14?8.5:10} className={active?'fill-white font-semibold':'fill-slate-400'}>{abbr(r.name)}</text>
      </g>;})}
      <path d={line} fill="none" stroke="#EF4444" strokeWidth="2" strokeLinejoin="round"/>
      {list.map((r,i)=><circle key={r.name} cx={x(i)} cy={y(r.gc)} r={hover===i?4.5:3} fill="#080D17" stroke="#EF4444" strokeWidth="2"/>)}
      {list.map((r,i)=><rect key={r.name} x={L+slot*i} y={T} width={slot} height={ih+B} fill="transparent" className="cursor-pointer"
        onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)} onClick={()=>onPick?.(r)}/>)}
    </svg>
    {h&&<div className="pointer-events-none absolute top-1 rounded-lg border border-white/[.08] bg-[#080D17]/95 px-3 py-2 text-xs shadow-xl" style={{left:`clamp(0px, calc(${(x(hover)/W*100).toFixed(1)}% - 70px), calc(100% - 150px))`}}>
      <p className="font-semibold text-white">{h.rank}. {h.name}</p>
      <p className="mt-0.5 text-slate-300"><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#10B981]"/>A favor <Num className="text-white">{h.gf}</Num> <i className="ml-2 mr-1 inline-block h-2 w-2 rounded-full bg-[#EF4444]"/>En contra <Num className="text-white">{h.gc}</Num></p>
    </div>}
  </div>;
}

/** Barras horizontales 0-100 normalizadas contra la tabla, con el valor real al lado. */
export function MetricBars({items}){
  return <ul className="space-y-3">
    {items.map(m=><li key={m.label}>
      <p className="mb-1 flex items-baseline justify-between gap-2 text-xs"><span className="text-slate-300">{m.label}</span><Num className="font-semibold text-white">{m.value}</Num></p>
      <div className="relative h-2 rounded-full bg-white/[.06]" role="img" aria-label={`${m.label}: ${m.value}, ${Math.round(m.score*100)} de 100 frente al resto`}>
        <div className="h-full rounded-full bg-gradient-to-r from-[#059669] to-[#34D399]" style={{width:`${Math.max(3,m.score*100)}%`,transition:'width .5s ease'}}/>
        {m.avg!=null&&<i className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded bg-[#94A3B8]" style={{left:`${m.avg*100}%`}} title="Promedio"/>}
      </div>
    </li>)}
  </ul>;
}
