import React,{useState,useEffect,useRef,useMemo,useCallback} from 'react';
import {Pause,Play,Star,CalendarClock} from 'lucide-react';
import {Crest,Num} from './ui.jsx';
import {tickerItems,matchState,teamGroups,matchGroup,groupLabel} from '../lib.js';

const SPEED=36; // píxeles por segundo
const time=iso=>new Date(iso).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'America/Lima'});
const reduceMotion=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;

function Status({match,now}){
  const s=matchState(match,now);
  if(s.kind==='final')return <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">Final</span>;
  if(s.kind==='tbd')return <span className="text-[10px] text-slate-400">Por definir</span>;
  if(s.kind==='soon')return <span className="flex items-center gap-1 text-[10px] font-semibold text-[#10B981]"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#10B981]" aria-hidden="true"/>{s.minutes<60?`${s.minutes} min`:`${Math.floor(s.minutes/60)} h ${String(s.minutes%60).padStart(2,'0')}`}</span>;
  if(s.kind==='started')return <span className="text-[10px] text-slate-400" title="Comenzó según el horario; sin marcador en la captura">Inició <Num>{time(match.date)}</Num></span>;
  if(s.kind==='pending')return <span className="text-[10px] leading-tight text-[#F59E0B]">Sin resultado</span>;
  return <Num className="text-[13px] font-bold text-white">{time(match.date)}</Num>;
}

function Team({name,id,logo,leagueId,score,win,fav}){
  return <span className="flex min-w-0 items-center gap-1.5">
    <Crest name={name} leagueId={leagueId} logo={logo(id,name)} size={16}/>
    <span className={`min-w-0 flex-1 truncate text-[12px] leading-tight ${win===false?'text-slate-400':'font-semibold text-white'}`}>{name}</span>
    {fav&&<Star size={10} className="shrink-0 fill-[#10B981] text-[#10B981]" aria-label="Favorito"/>}
    {score!=null&&<Num className={`text-xs font-bold ${win===false?'text-slate-400':'text-white'}`}>{score}</Num>}
  </span>;
}

function DayMark({item}){
  const today=item.rel==='Hoy';
  return <div className={`flex h-full w-[62px] flex-col items-center justify-center rounded-lg px-1 text-center ${today?'bg-[#10B981]/15 ring-1 ring-[#10B981]/40':'bg-white/[.03]'}`}>
    {item.rel&&<span className={`font-heading text-[11px] font-extrabold uppercase ${today?'text-[#10B981]':'text-white'}`}>{item.rel}</span>}
    <span className={`text-[10px] leading-tight ${item.rel?'text-slate-500':'font-semibold text-slate-300'}`}>{item.label}</span>
  </div>;
}

function MatchCard({match,now,leagueId,logo,tag,selected,favs,onPick,hidden}){
  const done=match.hg!=null&&match.ag!=null;
  const winH=done?match.hg>match.ag?true:match.hg<match.ag?false:null:null,winA=winH==null?null:!winH;
  return <button type="button" tabIndex={hidden?-1:undefined} onClick={()=>onPick(match)}
    aria-label={hidden?undefined:`${match.home} contra ${match.away}${tag?`, ${tag.label}`:''}. Ver en la tabla`}
    className={`flex h-full w-[218px] items-center gap-2.5 rounded-lg border px-2.5 text-left transition hover:border-white/25 ${selected?'border-[#10B981]/50 bg-[#10B981]/[.08]':'border-white/[.06] bg-[#111827]'}`}>
    <span className="flex w-[50px] shrink-0 flex-col items-start gap-0.5"><Status match={match} now={now}/>{tag&&<span className={`max-w-full truncate rounded px-1 text-[9px] font-semibold ${tag.cross?'bg-[#F59E0B]/15 text-[#FCD34D]':selected?'bg-[#10B981]/20 text-[#6EE7B7]':'bg-white/[.06] text-slate-400'}`} title={tag.title}>{tag.label}</span>}</span>
    <span className="flex min-w-0 flex-1 flex-col gap-1 border-l border-white/[.06] pl-2.5">
      <Team name={match.home} id={match.home_id} logo={logo} leagueId={leagueId} score={done?match.hg:null} win={winH} fav={favs.has(match.home)}/>
      <Team name={match.away} id={match.away_id} logo={logo} leagueId={leagueId} score={done?match.ag:null} win={winA} fav={favs.has(match.away)}/>
    </span>
  </button>;
}

/** Carrusel de partidos que avanza de derecha a izquierda. Se detiene al pasar el puntero, enfocar, tocar o pulsar Pausa. */
export function MatchTicker({league,publication,groups,group,favorites,onPick}){
  const national=league.teamType==='national',multi=groups.length>1;
  const [now,setNow]=useState(Date.now);
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(t);},[]);

  const find=useMemo(()=>teamGroups(groups),[groups]);
  const logos=useMemo(()=>{const byId=new Map(),byName=new Map();groups.forEach(g=>(g.rows||[]).forEach(r=>{if(r.logo){if(r.team_id)byId.set(String(r.team_id),r.logo);byName.set(r.name,r.logo);}}));
    return (id,name)=>byId.get(String(id))||byName.get(name);},[groups]);
  const upcoming=publication?.fixtures||[];
  const source=upcoming.length?upcoming:(publication?.results||[]).slice(-24);
  const mode=upcoming.length?'next':'played';
  const withGroup=useMemo(()=>source.map(m=>({m,g:multi?matchGroup(m,find):null})),[source,find,multi]);
  const list=withGroup;
  const groupOf=useMemo(()=>new Map(withGroup.map(x=>[x.m.id,x.g])),[withGroup]);
  const items=useMemo(()=>tickerItems(list.map(x=>x.m),now),[list,now]);
  const favs=useMemo(()=>new Set(favorites),[favorites]);
  const current=multi?groupLabel(groups[group]?.name,group):null;

  const tagOf=m=>{
    const g=groupOf.get(m.id);
    if(g==='cross')return {label:'Entre grupos',title:'Cruce entre selecciones de grupos distintos',cross:true};
    if(g==null||!multi)return null;
    const l=groupLabel(groups[g]?.name,g);
    return {label:l.tier?l.code:l.label,title:l.full};
  };

  // Desplazamiento automático con scroll nativo: el usuario también puede arrastrar o deslizar.
  const scroller=useRef(null),track=useRef(null);
  const [loop,setLoop]=useState(false),[manualPause,setManualPause]=useState(false);
  const pause=useRef({hover:false,focus:false,touch:false,visible:true,hidden:false});
  const touchTimer=useRef(null);
  const copyWidth=useCallback(()=>{const t=track.current;if(!t||t.children.length<2)return 0;return t.children[1].offsetLeft-t.children[0].offsetLeft;},[]);

  useEffect(()=>{
    const el=scroller.current,t=track.current;if(!el||!t)return;
    const measure=()=>{const first=t.children[0];setLoop(!reduceMotion()&&!!first&&first.offsetWidth>el.clientWidth+8);};
    measure();
    const ro=typeof ResizeObserver==='function'?new ResizeObserver(measure):null;
    ro?.observe(el);if(t.children[0])ro?.observe(t.children[0]);
    return()=>ro?.disconnect();
  },[items]);

  useEffect(()=>{
    const el=scroller.current;if(!el||!loop)return;
    const io=typeof IntersectionObserver==='function'?new IntersectionObserver(([e])=>{pause.current.visible=e.isIntersecting;}):null;io?.observe(el);
    const vis=()=>{pause.current.hidden=document.hidden;};document.addEventListener('visibilitychange',vis);
    let raf,last=performance.now(),pos=el.scrollLeft;
    const tick=t=>{
      const dt=Math.min(64,t-last);last=t;
      const p=pause.current,stopped=manualPause||p.hover||p.focus||p.touch||!p.visible||p.hidden;
      if(Math.abs(el.scrollLeft-pos)>2)pos=el.scrollLeft;
      if(!stopped){
        pos+=SPEED*dt/1000;
        const w=copyWidth();if(w&&pos>=w)pos-=w;
        el.scrollLeft=pos;
      }
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return()=>{cancelAnimationFrame(raf);io?.disconnect();document.removeEventListener('visibilitychange',vis);};
  },[loop,manualPause,copyWidth]);

  useEffect(()=>{if(scroller.current)scroller.current.scrollLeft=0;},[league.id,group]);
  useEffect(()=>()=>clearTimeout(touchTimer.current),[]);

  const onScroll=()=>{const el=scroller.current,w=copyWidth();if(loop&&el&&w&&el.scrollLeft>=w)el.scrollLeft-=w;};

  if(!publication||!source.length)return null;
  const span=items.filter(i=>i.type==='day'),total=list.length;
  const renderItems=hidden=>items.map(it=>it.type==='day'
    ?<li key={it.key} className="shrink-0" aria-hidden={hidden||undefined}><DayMark item={it}/></li>
    :<li key={it.key} className="shrink-0" aria-hidden={hidden||undefined}><MatchCard match={it.match} now={now} leagueId={league.id} logo={logos} tag={tagOf(it.match)} selected={multi&&groupOf.get(it.match.id)===group} favs={favs} onPick={onPick} hidden={hidden}/></li>);

  return <section id="agenda" aria-label={mode==='next'?'Próximos partidos':'Resultados recientes'} className="mx-auto mt-4 max-w-[1440px] px-4 md:px-8">
    <div className="flex h-[64px] items-stretch overflow-hidden rounded-2xl border border-white/[.08] bg-[#0D1422]">
      <div className="flex shrink-0 items-center gap-2 border-r border-white/[.06] bg-[#111827] pl-3 pr-2 sm:pl-4">
        <span className="hidden flex-col sm:flex"><span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#10B981]"><i className="h-1.5 w-1.5 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]" aria-hidden="true"/>{mode==='next'?'Próximos':'Recientes'}</span><span className="text-[10px] text-slate-500"><Num>{total}</Num> partidos · Lima</span></span>
        <CalendarClock size={18} className="text-[#10B981] sm:hidden" aria-hidden="true"/>
        {loop&&<button onClick={()=>setManualPause(v=>!v)} aria-pressed={manualPause} aria-label={manualPause?'Reanudar desplazamiento':'Pausar desplazamiento'} className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 hover:bg-white/[.06] hover:text-white">{manualPause?<Play size={14}/>:<Pause size={14}/>}</button>}
      </div>
      {!items.length?<p className="flex items-center px-4 text-sm text-slate-400">Sin partidos en la captura publicada.</p>
      :<div ref={scroller} onScroll={onScroll} tabIndex={0} aria-label={`Carrusel de ${total} partidos`}
        onPointerEnter={e=>{if(e.pointerType==='mouse')pause.current.hover=true;}} onPointerLeave={e=>{if(e.pointerType==='mouse')pause.current.hover=false;}}
        onTouchStart={()=>{clearTimeout(touchTimer.current);pause.current.touch=true;}} onTouchEnd={()=>{clearTimeout(touchTimer.current);touchTimer.current=setTimeout(()=>{pause.current.touch=false;},4000);}}
        onFocus={()=>{pause.current.focus=true;}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))pause.current.focus=false;}}
        className="ticker-mask min-w-0 flex-1 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div ref={track} className="flex h-full w-max pl-2">
          <ul className="flex h-full gap-2 py-1.5 pr-2" aria-label={mode==='next'?'Próximos partidos':'Resultados recientes'}>{renderItems(false)}</ul>
          {loop&&<ul className="flex h-full gap-2 py-1.5 pr-2" aria-hidden="true">{renderItems(true)}</ul>}
        </div>
      </div>}
    </div>
  </section>;
}
