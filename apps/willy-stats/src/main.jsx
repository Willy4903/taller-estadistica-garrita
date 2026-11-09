import React,{useState,useMemo,useEffect,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {X} from 'lucide-react';
import {competitions,datasets,standings,metrics,projection} from './data.js';
import {getRows,reading as readingOf,radarAxes} from './lib.js';
import {Navbar,Hero} from './components/Header.jsx';
import {Carousel} from './components/Carousel.jsx';
import {Dashboard,ReadingCard,SideCards} from './components/Dashboard.jsx';
import {Comparator,Models,Methodology} from './components/Sections.jsx';
import {CrestContext,Crest,Form,Num,Brand} from './components/ui.jsx';
import {Radar} from './components/Charts.jsx';
import {number} from './data.js';
import './styles.css';

const readFavorites=()=>{try{const a=JSON.parse(localStorage.getItem('willy-stats-favorites'));if(Array.isArray(a))return a;}catch{}return [];};

function App(){
  const initial=new URLSearchParams(location.hash.slice(1)).get('liga');
  const [leagueId,setLeagueId]=useState(competitions.some(c=>c.id===initial)?initial:'per');
  const [continent,setContinent]=useState('Todas'),[tab,setTab]=useState('table'),[venue,setVenue]=useState('all');
  const [query,setQuery]=useState(''),[favorites,setFavorites]=useState(readFavorites),[savedOnly,setSavedOnly]=useState(false);
  const [source,setSource]=useState('published'),[snapshot,setSnapshot]=useState({}),[group,setGroup]=useState(0);
  const [detail,setDetail]=useState(null),[fixtureType,setFixtureType]=useState('next'),[compare,setCompare]=useState(['per','bra','eng']);
  const [crests,setCrests]=useState({}),[refreshing,setRefreshing]=useState(false),[loadError,setLoadError]=useState(false);
  const dialog=useRef(null);

  async function loadSnapshot(){
    setRefreshing(true);
    try{
      const r=await fetch('data/snapshot.json?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error();
      const d=await r.json();if(d.schema_version!==1||!d.competitions)throw Error();
      setSnapshot(d.competitions);setLoadError(false);
    }catch{setLoadError(true);}finally{setRefreshing(false);}
  }
  useEffect(()=>{loadSnapshot();const t=setInterval(loadSnapshot,5*60*1000);return()=>clearInterval(t);},[]);
  useEffect(()=>{fetch('crests/manifest.json').then(r=>r.ok?r.json():Promise.reject()).then(d=>{if(d.schema_version===1)setCrests(d.clubs||{});}).catch(()=>{});},[]);
  useEffect(()=>{try{localStorage.setItem('willy-stats-favorites',JSON.stringify(favorites));}catch{}},[favorites]);
  useEffect(()=>{const d=dialog.current;if(!d)return;if(detail&&!d.open)d.showModal();else if(!detail&&d.open)d.close();},[detail]);

  const league=competitions.find(c=>c.id===leagueId);
  const publication=snapshot[leagueId],groups=publication?.groups||[];
  const safeGroup=Math.min(group,Math.max(0,groups.length-1));
  const rows=useMemo(()=>getRows({league,source,snapshot,group:safeGroup,venue}),[league,source,snapshot,safeGroup,venue]);
  const reading=useMemo(()=>readingOf(rows),[rows]);
  const proj=useMemo(()=>source==='demo'?projection(league,standings(league,datasets[leagueId])):null,[source,league,leagueId]);

  const iclItems=useMemo(()=>['per','bra','esp','eng'].map(id=>{
    const l=competitions.find(c=>c.id===id),r=getRows({league:l,source,snapshot,group:0}),played=r.filter(t=>t.pj>0);
    return {id,name:l.name,continent:l.continent,icl:played.length?metrics(l,r).icl:null};
  }),[source,snapshot]);

  function selectLeague(id){setLeagueId(id);setGroup(0);setVenue('all');setQuery('');window.history.replaceState(null,'',`#liga=${id}`);}
  function selectContinent(v){setContinent(v);if(v!=='Todas'&&league.continent!==v)selectLeague(competitions.find(c=>c.continent===v).id);}
  const toggleFavorite=name=>setFavorites(f=>f.includes(name)?f.filter(x=>x!==name):[...f,name]);
  function jump(id,selectedTab){if(selectedTab)setTab(selectedTab);if(selectedTab==='fixtures')setFixtureType('next');requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'}));}

  return <CrestContext.Provider value={{clubs:crests,leagueId}}>
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-black">Saltar al contenido</a>
    <Navbar favorites={favorites} savedOnly={savedOnly} onSaved={()=>setSavedOnly(v=>!v)} onJump={jump}/>
    <main id="main">
      <Hero onExplore={()=>jump('explorar')}/>
      <Carousel competitions={competitions} leagueId={leagueId} continent={continent} onContinent={selectContinent} onSelect={selectLeague}/>
      <div className="mx-auto mt-8 grid max-w-[1440px] grid-cols-1 gap-6 px-5 md:px-8 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-9"><Dashboard league={league} rows={rows} reading={reading} tab={tab} onTab={setTab} publication={publication} source={source} groups={groups} group={safeGroup} groupName={groups[safeGroup]?.name} onGroup={setGroup} onSource={s=>{setSource(s);setGroup(0);}} venue={venue} onVenue={setVenue}
          loadError={loadError} refreshing={refreshing} onRefresh={loadSnapshot} favorites={favorites} onFavorite={toggleFavorite} onDetail={setDetail} query={query} onQuery={setQuery} savedOnly={savedOnly} onClearSaved={()=>setSavedOnly(false)}
          fixtures={source==='demo'?datasets[leagueId].filter(m=>m.hg==null):(publication?.fixtures||[])} results={source==='demo'?datasets[leagueId].filter(m=>m.hg!=null):(publication?.results||[])} fixtureType={fixtureType} onFixtureType={setFixtureType}/></div>
        <aside className="min-w-0 space-y-5 xl:col-span-3" aria-label="Análisis"><ReadingCard league={league} reading={reading} source={source} projection={proj}/><SideCards leader={reading?.leader} iclItems={iclItems}/></aside>
      </div>
      <Comparator competitions={competitions} compare={compare} onCompare={setCompare} source={source} snapshot={snapshot}/>
      <Models/><Methodology/>
    </main>
    <footer className="border-t border-[#1E2630]"><div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 py-8 text-xs text-gray-500 md:px-8"><span className="flex items-center gap-2"><Brand className="h-5 w-5"/>Willy Stats. Observatorio independiente.</span><span>Los escudos y marcas pertenecen a sus titulares. Las fuentes y fechas se indican en cada tabla.</span></div></footer>
    <dialog ref={dialog} onClose={()=>setDetail(null)} onClick={e=>{if(e.target===dialog.current)setDetail(null);}} aria-labelledby="detail-title" className="m-auto w-[min(520px,calc(100vw-24px))] rounded-2xl border border-[#26303D] bg-[#12171D] p-0 text-gray-200 backdrop:bg-black/70">
      {detail&&<div className="p-6"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><Crest name={detail.name} leagueId={leagueId} logo={detail.logo} size={44}/><div><p className="text-xs text-gray-400">{league.name} · Posición <Num>{detail.rank}</Num></p><h3 id="detail-title" className="font-heading text-xl font-extrabold text-white">{detail.name}</h3></div></div>
        <button aria-label="Cerrar" onClick={()=>setDetail(null)} className="grid h-9 w-9 place-items-center rounded-full border border-[#26303D]"><X size={16}/></button></div>
        <dl className="mt-5 grid grid-cols-4 gap-2 text-center">{[['PJ',detail.pj],['G',detail.g],['E',detail.e],['P',detail.p],['GF',detail.gf],['GC',detail.gc],['DG',detail.dg],['PTS',detail.pts]].map(([l,v])=><div key={l} className="rounded-lg bg-[#1A212B] py-2"><dt className="text-[11px] text-gray-400">{l}</dt><dd><Num className="text-base font-bold text-white">{v}</Num></dd></div>)}</dl>
        <p className="mt-4 flex items-center justify-between text-sm"><span>% de efectividad <Num className="font-bold text-white">{Number.isFinite(detail.effectiveness)?`${number(detail.effectiveness)}%`:'—'}</Num></span><Form values={detail.form}/></p>
        {detail.pj>0&&<div className="mt-4"><Radar axes={radarAxes(rows.filter(r=>r.pj>0),detail)} teamName={detail.name}/></div>}</div>}
    </dialog>
  </CrestContext.Provider>;
}
createRoot(document.getElementById('root')).render(<App/>);
