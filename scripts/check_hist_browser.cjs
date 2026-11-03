#!/usr/bin/env node
/* Prueba integral de portada Historia en Chromium, iPhone y escritorio. */
const {spawn} = require("node:child_process");
const {chromium} = require("playwright");
const assert = require("node:assert/strict");

const origin = "http://127.0.0.1:8768";
const server = spawn("python3", ["-m", "http.server", "8768", "--bind", "127.0.0.1", "--directory", "site"], {stdio:"ignore"});

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function ready() {
  for (let i=0; i<25; i++) {
    try { const r=await fetch(origin + "/liga1/index.html"); if(r.ok) return; } catch {}
    await delay(200);
  }
  throw new Error("No inició el servidor de pruebas");
}
(async()=>{
  let browser;
  try {
    await ready();
    browser = await chromium.launch({headless:true});
    for (const width of [390,430,768,1440]) {
      const page = await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1});
      const errors = [];
      page.on("pageerror", e => errors.push(e.message));
      page.on("console",m=>{ if(m.type()==="error")errors.push("CONSOLE: "+m.text()); });
      const responses=[];
      page.on("response",r=>{if(r.status()>=400)responses.push(r.status()+" "+r.url());});
      await page.goto(origin + "/liga1/#hist", {waitUntil:"domcontentloaded"});
      try {
        await page.waitForFunction(() => document.body.dataset.view === "hist" &&
          !!document.querySelector("#histBox .hist-approved"), null, {timeout:15000});
      } catch(error) {
        const diagnostics=await page.evaluate(()=>({
          readyState:document.readyState,
          bodyView:document.body.dataset.view,
          hasApp:typeof window.__L1,
          hasContent:typeof window.LIGA1_CONTENT,
          hasData:typeof window.LIGA1_DATA,
          hasLive:typeof window.LIVE,
          histBox:(document.querySelector("#histBox")||{}).innerHTML?.slice(0,300),
          scriptSources:[...document.scripts].map(s=>s.src).filter(Boolean)
        }));
        console.error("DIAGNÓSTICO HISTORIA",JSON.stringify({diagnostics,errors,responses,width},null,2));
        throw error;
      }
      const state = await page.evaluate(async()=>{
        const hero=document.querySelector("#histBox .hist-showcase");
        const band=Array.from(document.querySelectorAll("#histBox .hist-feature-nav button"));
        const root=document.documentElement;
        const photo=new Image();
        photo.src="img/hist-bandera.svg";
        await photo.decode();
        const canvas=document.createElement("canvas");
        canvas.width=50; canvas.height=26;
        const ctx=canvas.getContext("2d", {willReadFrequently:true});
        let painted=false;
        try {
          ctx.drawImage(photo,0,0,50,26);
          const pixels=ctx.getImageData(0,0,50,26).data;
          painted=Array.from({length:pixels.length/4},(_,i)=>pixels[i*4+3])
            .filter(alpha=>alpha>100).length>300;
        }catch(e){ painted=false; }
        return {
          h1:hero?.querySelector("#hist-headline")?.innerText?.replace(/\s+/g," ").trim(),
          heroBg:getComputedStyle(hero).backgroundImage,
          buttons:band.map(b=>b.textContent.trim()),
          stats:document.querySelectorAll("#histBox .hist-stats-band .hist-stat").length,
          titles:document.querySelector("#histBox .hist-stat strong")?.textContent?.trim(),
          expectedTitle:window.LIGA1_CONTENT?.facts?.find(f=>/estrellas nacionales/i.test(f.label))?.big,
          globalHero:getComputedStyle(document.querySelector("body > .hero")).display,
          mainTabs:getComputedStyle(document.querySelector("body > .tabs-bar")).display,
          hasHorizontalOverflow:root.scrollWidth>innerWidth+2,
          renderedFlag:painted,flagDimensions:[photo.naturalWidth,photo.naturalHeight],
        };
      });
      assert.match(state.h1,/Universitario\s+de Deportes/i, "Título principal incorrecto");
      assert.match(state.heroBg,/hist-bandera\.svg/);
      assert.deepEqual(state.buttons,["Resumen","Línea de tiempo","Títulos","Estadísticas","Curiosidades"]);
      assert.equal(state.stats,4,"Deben mostrarse cuatro indicadores");
      assert.equal(state.titles,state.expectedTitle,"Los títulos deben reflejar la fuente histórica");
      assert.equal(state.globalHero,"none","No se debe superponer la portada genérica");
      assert.equal(state.mainTabs,"none","No se debe superponer el antiguo menú");
      assert.ok(state.renderedFlag,"La bandera SVG debe pintar sus píxeles JPEG correctamente");
      assert.equal(state.hasHorizontalOverflow,false,"La página se desborda horizontalmente");
      await page.locator('#histBox button[data-hist-view="stats"]').click();
      await page.waitForFunction(()=>document.body.dataset.view === "stats");
      await page.evaluate(()=>window.__L1.show("C"));
      await page.waitForFunction(()=>document.body.dataset.view === "C");
      assert.notEqual(await page.locator("body > .hero").evaluate(e=>getComputedStyle(e).display),"none",
        "Clausura debe conservar su portada original");
      if (width >= 641) {
        assert.notEqual(await page.locator("body > .tabs-bar").evaluate(e=>getComputedStyle(e).display),"none",
          "Clausura debe conservar sus pestañas originales en escritorio");
      } else {
        assert.equal(await page.locator("#bnav").isVisible(),true,
          "Clausura debe conservar la navegación inferior de celular");
      }
      assert.deepEqual(errors,[], "Errores Javascript del navegador");
      console.log("OK historia "+width+"px:",JSON.stringify(state));
      await page.close();
    }
  } finally {
    if(browser)await browser.close();
    server.kill("SIGTERM");
  }
})().catch(e=>{console.error(e);process.exitCode=1;server.kill("SIGTERM");});
