/* Comprobación de espacios de la portada Clausura (#C) en Chromium. */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
async function main(){
  const browser=await chromium.launch({headless:true});
  const sizes=[
    {width:1280,height:800},{width:1024,height:768},{width:768,height:1024},
    {width:390,height:844},{width:375,height:812}
  ];
  try{
    for(const size of sizes){
      const ctx=await browser.newContext({
        viewport:size,isMobile:size.width<=390,hasTouch:size.width<=390,deviceScaleFactor:1
      });
      const page=await ctx.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto('http://127.0.0.1:8765/liga1/#C',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.body.dataset.view==='C',{timeout:15000});
      const layout=await page.evaluate(()=>{
        const rect=selector=>document.querySelector(selector)?.getBoundingClientRect();
        const hero=rect('body > .hero'),kpis=rect('#kpis'),nav=rect('.tabs-bar');
        const table=document.querySelector('#v-C');
        return {
          heroHeight:hero?.height||0,heroBottom:hero?.bottom||0,
          navTop:nav?.top||0,
          navVisible:getComputedStyle(document.querySelector('.tabs-bar')).display!=='none',
          kpiCount:document.querySelectorAll('#kpis .kpi').length,
          kpiHeight:kpis?.height||0,
          clausuraVisible:!table?.hidden,
          overflow:document.documentElement.scrollWidth-window.innerWidth
        };
      });
      const label=size.width+'x'+size.height;
      assert(layout.heroHeight>0,label+': portada no visible');
      assert(layout.kpiCount>=3,label+': faltan indicadores');
      assert(layout.clausuraVisible,label+': no se abrió Clausura #C');
      if(size.width>=821){
        assert(layout.heroHeight<420,label+': portada demasiado alta: '+layout.heroHeight);
        assert(layout.navVisible,label+': no aparece el menú de escritorio');
        assert(layout.navTop-layout.heroBottom<135,label+': separación excesiva antes del menú');
      }
      if(size.width<=390){
        assert(layout.heroHeight<490,label+': portada móvil demasiado alta: '+layout.heroHeight);
      }
      assert(layout.overflow<10,label+': desborde horizontal: '+layout.overflow);
      assert(errors.length===0,label+': errores JS: '+errors.join('; '));
      console.log('OK '+label+': portada='+Math.round(layout.heroHeight)+'px, KPIs='+layout.kpiCount+', desborde='+layout.overflow+'px');
      await ctx.close();
    }
  }finally{await browser.close();}
}
main().catch(err=>{console.error(err.stack||err);process.exit(1)});
