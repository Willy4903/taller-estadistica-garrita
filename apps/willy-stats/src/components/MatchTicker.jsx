import React,{useState,useEffect,useRef,useMemo,useCallback} from 'react';
import {ChevronLeft,ChevronRight,Pause,Play,Star,CalendarClock} from 'lucide-react';
import {Crest,Num} from './ui.jsx';
import {tickerItems,matchState,teamGroups,matchGroup,groupLabel} from '../lib.js';

const SPEED=36; // píxeles por segundo
const time=iso=>new Date(iso).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'America/Lima'});
const reduceMotion=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;

function Status({match,now}){
  const s=matchState(match,now);
  if(s.kind==='final')return <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">Final</span>;
  if(s.kind==='tbd')return <span className="text-[11px] text-slate-400">Horario por definir</span>;
  if(s.kind==='soon')return <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#10B981]"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#10B981]" aria-hidden="true"/>En {s.minutes<60?`${s.minutes} min`:`${Math.floor(s.minutes/60)} h ${String(s.minutes%60).padStart(2,'0')}`}</span>;
  if(s.kind==='started')return <span className="text-[11px] text-slate-400">Comenzó <Num>{time(match.date)}</Num></span>;
  if(s.kind==='pending')return <span className="text-[11px] text-[#EAB308]">Resultado pendiente</span>;
  return <Num className="text-sm font-bold text-white">{time(match.date)}</Num>;
}

function Team({name,id,logo,leagueId,score,win,fav}){
  return <span className="flex min-w-0 items-center gap-2">
    <Crest name={name} leagueId={leagueId} logo={logo(id,name)} size={22}/>
    <span className={`min-w-0 flex-1 truncate text-[13px] ${win===false?'text-slate-400':'font-semibold text-white'}`}>{name}</span>
    {fav&&<Star size={11} className="shrink-0 fill-[#10B981] text-[#10B981]" aria-label="Favorito"/>}
    {score!=null&&<Num className={`text-sm font-bold ${win===false?'text-slate-400':'text-white'}`}>{score}</Num>}
  </span>;
}

function DayMark({item}){
  const today=item.rel==='Hoy';
  return <div className={`flex h-full w-[76px] flex-col items-center justify-center rounded-xl border px-2 text-center ${today?'border-[#10B981]/50 bg-[#10B981]/10':'border-white/[.08] bg-[#0B111E]'}`}>
    {item.rel&&<span className={`font-heading text-sm font-extrabold uppercase ${today?'text-[#10B981]':'text-white'}`}>{item.rel}</span>}
    <span className={`text-[11px] leading-tight ${item.rel?'text-slate-400':'font-semibold text-slate-200'}`}>{item.label}</span>
  </div>;
}

function MatchCard({match,now,leagueId,logo,tag,selected,favs,onPick,hidden}){
  const done=match.hg!=null&&match.ag!=null;
  const winH=done?match.hg>match.ag?true:match.hg<match.ag?false:null:null,winA=winH==null?null:!winH;
  return <button type="button" tabIndex={hidden?-1:undefined} onClick={()=>onPick(match)}
    aria-label={hidden?undefined:`${match.home} contra ${match.away}${tag?`, ${tag.label}`:''}. Ver en la tabla`}
    className={`group flex h-full w-[224px] flex-col sm:w-[244px] justify-between rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-white/20 ${selected?'border-[#10B981]/60 bg-gradient-to-b from-[#10B981]/[.10] to-[#162032]':'border-white/[.08] bg-[#162032]'}`}>
    <span className="flex items-center justify-between gap-2">
      <Status match={match} now={now}/>
      {tag&&<span className={`truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${tag.cross?'bg-[#F97316]/15 text-[#FDBA74]':selected?'bg-[#10B981]/20 text-[#6EE7B7]':'bg-white/[.06] text-slate-300'}`} title={tag.title}>{tag.label}</span>}
    </span>
    <span className="mt-2 flex flex-col gap-1.5">
      <Team name={match.home} id={match.home_id} logo={logo} leagueId={leagueId} score={done?match.hg:null} win={winH} fav={favs.has(match.home)}/>
      <Team name={match.away} id={match.away_id} logo={logo} leagueId={leagueId} score={done?match.ag:null} win={winA} fav={favs.has(match.away)}/>
    </span>
  </button>;
}

/** Carrusel de partidos que avanza de derecha a izquierda. Se detiene al pasar el puntero, enfocar, tocar o pulsar Pausa. */
export function MatchTicker({league,publication,groups,group,favorites,onPick}){
  const national=league.teamType==='national',multi=groups.length>1;
  const [scope,setScope]=useState('all');
  const [now,setNow]=useState(Date.now);
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(t);},[]);
  useEffect(()=>setScope('all'),[league.id]);

  const find=useMemo(()=>teamGroups(groups),[groups]);
  const logos=useMemo(()=>{const byId=new Map(),byName=new Map();groups.forEach(g=>(g.rows||[]).forEach(r=>{if(r.logo){if(r.team_id)byId.set(String(r.team_id),r.logo);byName.set(r.name,r.logo);}}));
    return (id,name)=>byId.get(String(id))||byName.get(name);},[groups]);
  const upcoming=publication?.fixtures||[];
  const source=upcoming.length?upcoming:(publication?.results||[]).slice(-24);
  const mode=upcoming.length?'next':'played';
  const withGroup=useMemo(()=>source.map(m=>({m,g:multi?matchGroup(m,find):null})),[source,find,multi]);
  const inGroup=useMemo(()=>withGroup.filter(x=>x.g===group||(x.g==='cross'&&[find(x.m.home_id,x.m.home),find(x.m.away_id,x.m.away)].includes(group))),[withGroup,group,find]);
  const list=scope==='group'&&multi?inGroup:withGroup;
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

  useEffect(()=>{if(scroller.current)scroller.current.scrollLeft=0;},[league.id,scope,group]);
  useEffect(()=>()=>clearTimeout(touchTimer.current),[]);

  const onScroll=()=>{const el=scroller.current,w=copyWidth();if(loop&&el&&w&&el.scrollLeft>=w)el.scrollLeft-=w;};
  const step=dir=>{
    const el=scroller.current;if(!el)return;
    const w=copyWidth(),d=Math.max(260,Math.round(el.clientWidth*.8))*dir;
    if(loop&&w){if(dir<0&&el.scrollLeft+d<0)el.scrollLeft+=w;else if(dir>0&&el.scrollLeft+d>=w)el.scrollLeft-=w;}
    el.scrollBy({left:d,behavior:reduceMotion()?'auto':'smooth'});
  };

  if(!publication||!source.length)return null;
  const span=items.filter(i=>i.type==='day'),total=list.length;
  const renderItems=hidden=>items.map(it=>it.type==='day'
    ?<li key={it.key} className="shrink-0" aria-hidden={hidden||undefined}><DayMark item={it}/></li>
    :<li key={it.key} className="shrink-0" aria-hidden={hidden||undefined}><MatchCard match={it.match} now={now} leagueId={league.id} logo={logos} tag={tagOf(it.match)} selected={multi&&groupOf.get(it.match.id)===group} favs={favs} onPick={onPick} hidden={hidden}/></li>);

  return <section id="agenda" aria-labelledby="agenda-title" className="mx-auto mt-4 max-w-[1440px] px-4 md:mt-8 md:px-8">
    <div className="rounded-2xl border border-white/[.08] bg-[#111A2B] py-3 sm:py-4">
      <div className="flex items-center justify-between gap-3 px-4 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl sm:grid bg-[#10B981]/15 text-[#10B981]"><CalendarClock size={20} aria-hidden="true"/></span>
          <div className="min-w-0">
            <h2 id="agenda-title" className="font-heading text-lg font-extrabold leading-tight text-white">{mode==='next'?'Próximos partidos':'Resultados recientes'} <span className="hidden text-slate-400 sm:inline">· {league.name}</span></h2>
            <p className="text-xs text-slate-400"><Num>{total}</Num> {total===1?'partido':'partidos'}{span.length>1&&` en ${span.length} días`} · Hora de Lima<span className="hidden sm:inline"> · Según la captura publicada, no es un marcador en vivo</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {multi&&<div role="group" aria-label="Partidos a mostrar" className="hidden min-w-0 flex-1 rounded-lg border border-white/[.08] bg-[#0B111E] p-1 text-xs sm:flex sm:flex-none">
            {[['all','Todos'],['group',current?.full]].map(([v,l])=><button key={v} aria-pressed={scope===v} onClick={()=>setScope(v)} className={`min-h-9 min-w-0 flex-1 truncate rounded-md px-2 sm:max-w-[200px] sm:flex-none sm:px-3 ${scope===v?'bg-[#10B981] font-semibold text-[#04210F]':'text-slate-300 hover:text-white'}`}>{l}<span className="ml-1 opacity-70">({v==='all'?withGroup.length:inGroup.length})</span></button>)}
          </div>}
          {loop&&<button onClick={()=>setManualPause(v=>!v)} aria-pressed={manualPause} aria-label={manualPause?'Reanudar desplazamiento':'Pausar desplazamiento'} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-white/[.08] bg-[#0B111E] text-slate-200 hover:text-white">{manualPause?<Play size={15}/>:<Pause size={15}/>}</button>}
          <button onClick={()=>step(-1)} aria-label="Partidos anteriores" className="hidden h-11 w-11 place-items-center rounded-lg border border-white/[.08] bg-[#0B111E] text-slate-200 hover:text-white sm:grid"><ChevronLeft size={16}/></button>
          <button onClick={()=>step(1)} aria-label="Partidos siguientes" className="hidden h-11 w-11 place-items-center rounded-lg border border-white/[.08] bg-[#0B111E] text-slate-200 hover:text-white sm:grid"><ChevronRight size={16}/></button>
        </div>
      </div>
      {!items.length?<p className="mx-4 mt-4 rounded-xl border border-dashed border-white/[.08] p-6 text-center text-sm text-slate-400 md:mx-5">{`No hay partidos de ${current?.full||'este grupo'} en la captura publicada.`}</p>
      :<div ref={scroller} onScroll={onScroll} tabIndex={0} aria-label={`Carrusel de ${total} partidos`}
        onPointerEnter={e=>{if(e.pointerType==='mouse')pause.current.hover=true;}} onPointerLeave={e=>{if(e.pointerType==='mouse')pause.current.hover=false;}}
        onTouchStart={()=>{clearTimeout(touchTimer.current);pause.current.touch=true;}} onTouchEnd={()=>{clearTimeout(touchTimer.current);touchTimer.current=setTimeout(()=>{pause.current.touch=false;},4000);}}
        onFocus={()=>{pause.current.focus=true;}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))pause.current.focus=false;}}
        className="ticker-mask mt-3 overflow-x-auto sm:mt-4 overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div ref={track} className="flex w-max pl-4 md:pl-5">
          <ul className="flex gap-2.5 py-1 pr-2.5" aria-label={mode==='next'?'Próximos partidos':'Resultados recientes'}>{renderItems(false)}</ul>
          {loop&&<ul className="flex gap-2.5 py-1 pr-2.5" aria-hidden="true">{renderItems(true)}</ul>}
        </div>
      </div>}
    </div>
  </section>;
}
