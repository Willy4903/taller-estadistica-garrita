#!/usr/bin/env node
const assert=require("node:assert/strict");
const {spawn}=require("node:child_process");
const {chromium}=require("playwright");

const base="http://127.0.0.1:8768";
const server=spawn("python3",["-m","http.server","8768","--bind","127.0.0.1","--directory","site"],{stdio:"ignore"});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 let browser;
 try{
  for(let n=0;n<35;n++){try{if((await fetch(base+"/liga1/index.html")).ok)break;}catch(e){}await sleep(200);}
  browser=await chromium.launch({headless:true});
  for(const width of [390,430,768,1440]){
   const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1});
   const errors=[];page.on("pageerror",err=>errors.push(err.message));
   await page.goto(base+"/liga1/#hist",{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>document.body.dataset.view==="hist" && !!document.querySelector("#histBox .hist-reference"),null,{timeout:18000});
   const result=await page.evaluate(async()=>{
    const hero=document.querySelector("#histBox .hist-showcase");
    const img=new Image();img.src="img/historia-hero-fondo.jpg";await img.decode();
    const overview=[...document.querySelectorAll("#histBox .hist-overview .hist-overview-stat")];
    return {
     title:hero.querySelector("#hist-headline").innerText,
     bg:getComputedStyle(hero).backgroundImage,
     imageOk:img.naturalWidth>700&&img.naturalHeight>250,
     stats:overview.length,
     buttons:[...document.querySelectorAll("#histBox .hist-reference-nav button")].map(x=>x.textContent.trim()),
     genericHero:getComputedStyle(document.querySelector("body > .hero")).display,
     oldTabs:getComputedStyle(document.querySelector("body > .tabs-bar")).display,
     overflow:document.documentElement.scrollWidth>innerWidth+2,
     titles:overview[0]?.querySelector(".hist-overview-number")?.textContent?.trim(),
     expected:window.LIGA1_CONTENT?.facts?.find(x=>/estrellas nacionales/i.test(x.label))?.big
    };
   });
   assert.match(result.title,/Universitario\s+de Deportes/i);
   assert.match(result.bg,/historia-hero-fondo\.jpg/);
   assert.equal(result.imageOk,true,"No carga fotografía de la bandera");
   assert.equal(result.stats,4,"Falta banda de cuatro indicadores");
   assert.deepEqual(result.buttons,["Resumen","Línea de tiempo","Títulos","Estadísticas","Curiosidades"]);
   assert.equal(result.titles,result.expected,"El dato de títulos no coincide con la fuente");
   assert.equal(result.genericHero,"none","Aparece la portada antigua encima de Historia");
   assert.equal(result.oldTabs,"none","Aparece navegación duplicada encima de Historia");
   assert.equal(result.overflow,false,"Desbordamiento horizontal");
   await page.locator('#histBox button[data-hist-view="tit"]').first().click();
   await page.waitForFunction(()=>document.body.dataset.view==="tit");
   await page.evaluate(()=>window.__L1.show("C"));
   await page.waitForFunction(()=>document.body.dataset.view==="C");
   assert.notEqual(await page.locator("body > .hero").evaluate(el=>getComputedStyle(el).display),"none","Clausura pierde su portada");
   if(width>640)assert.notEqual(await page.locator("body > .tabs-bar").evaluate(el=>getComputedStyle(el).display),"none","Faltan pestañas de Clausura");
   else assert.equal(await page.locator("#bnav").isVisible(),true,"Falta navegación móvil de Clausura");
   assert.deepEqual(errors,[],"Errores de JavaScript");
   console.log("OK Historia y Clausura",width,JSON.stringify(result));
   await page.close();
  }
 }finally{if(browser)await browser.close();server.kill("SIGTERM")}
})().catch(e=>{console.error(e);server.kill("SIGTERM");process.exit(1);});
