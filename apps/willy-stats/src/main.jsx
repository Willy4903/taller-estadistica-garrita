import React,{useState,useMemo,useEffect,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {X} from 'lucide-react';
import {competitions,number,goalsPerMatch} from './data.js';
import {getRows,matchesForTeams,radarAxes,groupLabel,teamGroups,tableCsv,shortSeason} from './lib.js';
import {Navbar} from './components/Header.jsx';
import {MatchTicker} from './components/MatchTicker.jsx';
import {Carousel} from './components/Carousel.jsx';
import {Dashboard} from './components/Dashboard.jsx';
import {Comparator,Methodology} from './components/Sections.jsx';
import {CrestContext,Crest,Form,Num,Brand} from './components/ui.jsx';
import {Radar} from './components/Charts.jsx';
import './styles.css';

const readFavorites=()=>{try{const a=JSON.parse(localStorage.getItem('willy-stats-favorites'));if(Array.isArray(a))return a;}catch{}return [];};

const readHash=()=>{const h=new URLSearchParams(location.hash.slice(1));return {liga:h.get('liga'),grupo:h.get('grupo')};};

function App(){
  const initial=readHash();
  const [leagueId,setLeagueId]=useState(competitions.some(c=>c.id===initial.liga)?initial.liga:'per');
  const [continent,setContinent]=useState('Todas'),[tab,setTab]=useState('table');
  const [query,setQuery]=useState(''),[favorites,setFavorites]=useState(readFavorites),[savedOnly,setSavedOnly]=useState(false);
  const [snapshot,setSnapshot]=useState({}),[group,setGroup]=useState(0);
  const [detail,setDetail]=useState(null),[fixtureType,setFixtureType]=useState('next'),[compare,setCompare]=useState(['per','bra','eng']);
  const [crests,setCrests]=useState({}),[refreshing,setRefreshing]=useState(false),[loadError,setLoadError]=useState(false);
  const [focus,setFocus]=useState(null),[highlight,setHighlight]=useState([]);
  const [analysis,setAnalysis]=useState(()=>{try{return localStorage.getItem('willy-stats-analysis')==='1';}catch{return false;}});
  useEffect(()=>{try{localStorage.setItem('willy-stats-analysis',analysis?'1':'0');}catch{}},[analysis]);
  const dialog=useRef(null),pendingGroup=useRef(initial.grupo);

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
  const rows=useMemo(()=>getRows({league,snapshot,group:safeGroup}),[league,snapshot,safeGroup]);
  const scoped=league.teamType==='national'&&groups.length>0;
  const results=useMemo(()=>scoped?matchesForTeams(publication?.results||[],rows):publication?.results||[],[publication,rows,scoped]);
  const fixtures=useMemo(()=>scoped?matchesForTeams(publication?.fixtures||[],rows):publication?.fixtures||[],[publication,rows,scoped]);
  // Goles por partido de referencia: promedio de las demás competiciones con tabla publicada.
  const refGpg=useMemo(()=>{const v=competitions.filter(c=>c.id!==leagueId&&snapshot[c.id]).map(c=>goalsPerMatch((snapshot[c.id].groups||[]).flatMap(g=>g.rows||[]))).filter(Number.isFinite);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;},[snapshot,leagueId]);
  function exportCsv(){
    if(!rows.length)return;
    const g=groups.length>1?groupLabel(groups[safeGroup]?.name,safeGroup):null;
    const label=`${league.name}${g?` · ${g.full}`:''} · Temporada ${shortSeason(publication?.season)} · Fuente: ${publication?.provider||'proveedor'} · Captura ${publication?.updated_at||''}`;
    const blob=new Blob(['\ufeff'+tableCsv(rows,label)],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=`willy-stats-${league.id}${g?`-${g.code.toLowerCase()}`:''}.csv`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  const writeHash=(id,g)=>{const code=g!=null&&groups.length>1&&id===leagueId?groupLabel(groups[g]?.name,g).code:null;
    window.history.replaceState(null,'',`#liga=${id}${code?`&grupo=${encodeURIComponent(code)}`:''}`);};
  // El grupo del enlace (#liga=unl&grupo=A2) se aplica cuando llega la captura.
  useEffect(()=>{
    if(!pendingGroup.current||!groups.length)return;
    const want=pendingGroup.current.toUpperCase();pendingGroup.current=null;
    const i=groups.findIndex((g,k)=>groupLabel(g.name,k).code===want);
    if(i>=0)setGroup(i);
  },[groups]);
  useEffect(()=>{const on=()=>{const h=readHash();if(competitions.some(c=>c.id===h.liga)){if(h.liga!==leagueId){setLeagueId(h.liga);setGroup(0);setQuery('');setFocus(null);setHighlight([]);}pendingGroup.current=h.grupo;if(h.grupo&&h.liga===leagueId){const i=groups.findIndex((g,k)=>groupLabel(g.name,k).code===h.grupo.toUpperCase());if(i>=0){setGroup(i);pendingGroup.current=null;}}}};
    window.addEventListener('hashchange',on);return()=>window.removeEventListener('hashchange',on);},[leagueId,groups]);

  function selectLeague(id){setLeagueId(id);setGroup(0);setQuery('');setFocus(null);setHighlight([]);window.history.replaceState(null,'',`#liga=${id}`);}
  function selectGroup(i){setGroup(i);setFocus(null);setHighlight([]);writeHash(leagueId,i);}
  function selectContinent(v){setContinent(v);if(v!=='Todas'&&league.continent!==v)selectLeague(competitions.find(c=>c.continent===v).id);}
  const toggleFavorite=name=>setFavorites(f=>f.includes(name)?f.filter(x=>x!==name):[...f,name]);
  function jump(id,selectedTab){if(selectedTab)setTab(selectedTab);if(selectedTab==='fixtures')setFixtureType('next');requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'}));}
  function changeTab(t){setTab(t);const el=document.getElementById('dashboard');if(el){const r=el.getBoundingClientRect();if(r.top>innerHeight*.6||r.bottom<120)jump('dashboard');}}
  function pickMatch(m){
    const find=teamGroups(groups),g=find(m.home_id,m.home)??find(m.away_id,m.away);
    if(groups.length>1&&g!=null&&g!==safeGroup){setGroup(g);writeHash(leagueId,g);}
    setQuery('');setSavedOnly(false);setFocus(m.home);setHighlight([m.home,m.away]);jump('dashboard','table');
  }

  return <CrestContext.Provider value={{clubs:crests,leagueId}}>
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-black">Saltar al contenido</a>
    <Navbar tab={tab} onTab={changeTab} favorites={favorites} savedOnly={savedOnly} onSaved={()=>setSavedOnly(v=>!v)} onJump={jump} analysis={analysis} onAnalysis={setAnalysis} onExport={exportCsv} canExport={rows.length>0}/>
    <main id="main">
      <MatchTicker league={league} publication={publication} groups={groups} group={safeGroup} favorites={favorites} onPick={pickMatch}/>
      <Dashboard league={league} rows={rows} tab={tab} publication={publication} groups={groups} group={safeGroup} onGroup={selectGroup}
        loadError={loadError} refreshing={refreshing} onRefresh={loadSnapshot} favorites={favorites} onFavorite={toggleFavorite} onDetail={setDetail} query={query} onQuery={setQuery} savedOnly={savedOnly} onClearSaved={()=>setSavedOnly(false)}
        fixtures={fixtures} results={results} focus={focus} onFocus={setFocus} highlight={highlight}
        competitions={competitions} onLeague={selectLeague} refGpg={refGpg} analysis={analysis} onTab={changeTab}/>
      <div className="mt-14"><Carousel competitions={competitions} leagueId={leagueId} continent={continent} onContinent={selectContinent} onSelect={id=>{selectLeague(id);jump('dashboard');}}/></div>
      <Comparator competitions={competitions} compare={compare} onCompare={setCompare} snapshot={snapshot}/>
      <Methodology/>
    </main>
    <footer className="border-t border-white/[.08]"><div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 py-8 text-xs text-slate-500 md:px-8"><span className="flex items-center gap-2"><Brand className="h-5 w-5"/>Willy Stats. Observatorio independiente.</span><span>Los escudos y marcas pertenecen a sus titulares. Las fuentes y fechas se indican en cada tabla.</span></div></footer>
    <dialog ref={dialog} onClose={()=>setDetail(null)} onClick={e=>{if(e.target===dialog.current)setDetail(null);}} aria-labelledby="detail-title" className="m-auto w-[min(520px,calc(100vw-24px))] rounded-2xl border border-white/[.08] bg-[#111827] p-0 text-slate-200 backdrop:bg-black/70 backdrop:backdrop-blur-sm">
      {detail&&<div className="p-6"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><Crest name={detail.name} leagueId={leagueId} logo={detail.logo} size={44}/><div><p className="text-xs text-slate-400">{league.name} · Posición <Num>{detail.rank}</Num></p><h3 id="detail-title" className="font-heading text-xl font-extrabold text-white">{detail.name}</h3></div></div>
        <button aria-label="Cerrar" onClick={()=>setDetail(null)} className="grid h-9 w-9 place-items-center rounded-full border border-white/[.08]"><X size={16}/></button></div>
        <dl className="mt-5 grid grid-cols-4 gap-2 text-center">{[['PJ',detail.pj],['G',detail.g],['E',detail.e],['P',detail.p],['GF',detail.gf],['GC',detail.gc],['DG',detail.dg],['PTS',detail.pts]].map(([l,v])=><div key={l} className="rounded-lg bg-[#162032] py-2"><dt className="text-[11px] text-slate-400">{l}</dt><dd><Num className="text-base font-bold text-white">{v}</Num></dd></div>)}</dl>
        <p className="mt-4 flex items-center justify-between text-sm"><span>% de efectividad <Num className="font-bold text-white">{Number.isFinite(detail.effectiveness)?`${number(detail.effectiveness)}%`:'—'}</Num></span><Form values={detail.form}/></p>
        {detail.pj>0&&<div className="mt-4"><Radar axes={radarAxes(rows.filter(r=>r.pj>0),detail)} teamName={detail.name}/></div>}</div>}
    </dialog>
  </CrestContext.Provider>;
}
createRoot(document.getElementById('root')).render(<App/>);
