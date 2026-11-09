import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import {readFile} from 'node:fs/promises';
// Los datos publicados se mantienen fuera de la compilación: rebuild no los borra.
const assets=new URL('../../site/futbol/',import.meta.url);
export default defineConfig({base:'./',plugins:[tailwindcss(),{
 name:'local-published-assets',configureServer(server){server.middlewares.use(async(req,res,next)=>{
  const file=req.url?.split('?')[0].slice(1);
  if(!/^(crests\/(?:[a-f0-9]+\.(?:png|svg)|manifest\.json)|trophies\/[a-z]+\.svg|flags\/[a-z]+\.svg|icon\.svg|data\/snapshot\.json)$/.test(file||''))return next();
  try{const data=await readFile(new URL(file,assets));res.setHeader('Content-Type',file.endsWith('.svg')?'image/svg+xml':file.endsWith('.png')?'image/png':'application/json');res.end(data);}catch{next();}
 });}
}],publicDir:false,build:{outDir:'../../site/futbol',emptyOutDir:false}});
