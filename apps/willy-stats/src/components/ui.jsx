import React,{useState,useEffect,createContext,useContext} from 'react';
import {ShieldCheck,Trophy} from 'lucide-react';

export const CrestContext=createContext({clubs:{},leagueId:'per'});

export function Brand({className='h-8 w-8'}){
  return <svg className={className} viewBox="0 0 32 32" fill="none" stroke="#10B981" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M16 2v28M2 16h28M6.1 6.1l19.8 19.8M25.9 6.1 6.1 25.9"/></svg>;
}

export function LeagueMark({league,size=28}){
  if(league.trophyAsset)return <img src={league.trophyAsset} alt="" width={size} height={size} className="object-contain" style={{height:size,width:size}}/>;
  if(league.flagAsset)return <img src={league.flagAsset} alt="" width={size} height={size} className="rounded-full object-cover ring-1 ring-white/10" style={{height:size,width:size}}/>;
  return <span className="grid place-items-center rounded-full bg-white/10 text-slate-300" style={{height:size,width:size}}><Trophy size={size*.55}/></span>;
}

function safeLogo(value){
  try{const u=new URL(value);return u.protocol==='https:'&&/^(a\d?\.espncdn\.com|media\.api-sports\.io)$/.test(u.hostname)?u.href:null;}catch{return null;}
}

export function Crest({name,leagueId,logo,size=28}){
  const ctx=useContext(CrestContext),[failed,setFailed]=useState(false);
  const file=ctx.clubs[`${leagueId||ctx.leagueId}:${name}`]?.file||safeLogo(logo);
  useEffect(()=>setFailed(false),[file]);
  return file&&!failed
    ?<img src={file} alt={`Escudo de ${name}`} width={size} height={size} loading="lazy" onError={()=>setFailed(true)} className="object-contain" style={{height:size,width:size}}/>
    :<span role="img" aria-label={`Escudo de ${name} pendiente de verificar`} title="Escudo pendiente de verificar" className="grid place-items-center text-slate-600" style={{height:size,width:size}}><ShieldCheck size={size*.7}/></span>;
}

const FORM={V:['bg-[#10B981] text-[#04210F]','Victoria'],E:['bg-[#94A3B8] text-[#0B111E]','Empate'],D:['bg-[#EF4444] text-white','Derrota']};
export function Form({values=[],small=false}){
  if(!values.length)return <span className="text-slate-600">—</span>;
  return <span className="inline-flex gap-1" role="img" aria-label={`Últimos resultados: ${values.join(', ')}`}>
    {values.map((v,i)=>{const [cls,title]=FORM[v]||FORM.E;return <span key={i} title={title} className={`grid place-items-center rounded-full font-mono font-bold ${small?'h-5 w-5 text-[10px]':'h-7 w-7 text-xs'} ${cls}`}>{v}</span>;})}
  </span>;
}

export function Num({children,className=''}){return <span className={`font-mono tabular-nums ${className}`}>{children}</span>;}

export function Photo({src,alt,className=''}){
  const [failed,setFailed]=useState(false);
  return failed
    ?<div role="img" aria-label={alt} className={`bg-gradient-to-br from-[#10301f] via-[#0f1a16] to-[#0B111E] ${className}`}/>
    :<img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)} className={`object-cover ${className}`}/>;
}
