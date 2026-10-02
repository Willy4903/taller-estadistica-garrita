/* Tu ruta recomendada: seis pasos con nivel, tiempo, recursos y estado calculados con tu progreso local. */
(function () {
  "use strict";
  const root = document.getElementById("ruta-root");
  if (!root) return;
  const I = window.IAR, { esc, ico, store, journey } = I;

  const STEPS = [
    { n: 1, t: "Entender la IA", nivel: "Básico", href: "#aprende", levels: [1], extras: [], gets: "Los conceptos clave: modelo, token, contexto y alucinación.", after: "Leer noticias de IA y entender qué significan." },
    { n: 2, t: "Aprender a conversar", nivel: "Básico", href: "#promptlab", levels: [2, 3], extras: [["Prompt Lab: constructor y biblioteca por objetivo", 12]], gets: "Escribir instrucciones con objetivo, contexto, reglas y entregable.", after: "Pedir a una IA resultados claros y verificables." },
    { n: 3, t: "Usar modelos", nivel: "Intermedio", href: "#modelos", levels: [], extras: [["Selector por problema", 4], ["Comparador de modelos", 5], ["Seis medidas de uso", 5]], gets: "Elegir un modelo según tarea, precio y contexto.", after: "Justificar tu elección con datos y no con intuición." },
    { n: 4, t: "Diseñar agentes", nivel: "Intermedio", href: "#agentes", levels: [4], extras: [["Del prompt al contexto y ciclo del agente", 8]], gets: "Construir contexto de trabajo y distinguir chatbot, flujo y agente.", after: "Diseñar un asistente con reglas, archivos y herramientas." },
    { n: 5, t: "Automatizar procesos", nivel: "Avanzado", href: "#casos", levels: [5], extras: [["Casos de uso y recetas de automatización", 8]], gets: "Convertir una tarea repetitiva en un proceso con revisión humana.", after: "Diseñar una automatización sencilla y auditable." },
    { n: 6, t: "Aplicar IA responsablemente", nivel: "Todos los niveles", href: "#responsable", levels: [], extras: [["Principios, semáforo y lista de verificación", 6], ["Casos reales y normativa", 10]], gets: "Decidir qué usar, qué proteger y qué verificar.", after: "Usar IA con criterio y explicar por qué es seguro hacerlo." },
  ];
  const ST = { done: ["Completado", "ok"], prog: ["En progreso", "acc"], todo: ["Pendiente", ""] };

  function compute(A) {
    const done = new Set(store.get("iar_lessons", [])), j = journey.get();
    const les = (lv) => A.levels.filter((l) => lv.includes(l.n)).flatMap((l) => l.lessons);
    const frac = (lv) => { const L = les(lv); return { n: L.filter((x) => done.has(x.id)).length, t: L.length, min: L.reduce((s, x) => s + x.min, 0) }; };
    const st = (c, p) => (c ? "done" : p ? "prog" : "todo");
    const f1 = frac([1]), f23 = frac([2, 3]), f4 = frac([4]), f5 = frac([5]);
    const state = [
      st(f1.n === f1.t, f1.n > 0 || j.leyo_aprende),
      st(f23.n === f23.t && j.prompt_construido, f23.n > 0 || j.promptlab || j.prompt_construido),
      st(j.selector && j.comparo, j.selector || j.comparo || j.leyo_modelos || j.uso),
      st(f4.n === f4.t && j.contexto, f4.n > 0 || j.contexto || j.leyo_agentes),
      st(f5.n === f5.t, f5.n > 0 || j.casos),
      st(j.semaforo && j.checklist, j.semaforo || j.checklist || j.regulacion || j.leyo_responsable),
    ];
    return STEPS.map((s, i) => {
      const L = les(s.levels), min = L.reduce((a, x) => a + x.min, 0) + s.extras.reduce((a, x) => a + x[1], 0);
      return { ...s, state: state[i], min, res: L.length + s.extras.length, lessons: L.length, done: L.filter((x) => done.has(x.id)).length };
    });
  }
  function widget(rows) {
    const w = document.getElementById("sb-route"); if (!w) return;
    const n = rows.filter((r) => r.state === "done").length;
    w.hidden = false;
    w.innerHTML = `<p class="sb-rt">Tu ruta · ${n} de ${rows.length}</p><div class="bar"><i style="width:${(n / rows.length) * 100}%"></i></div>
      <ol>${rows.map((r) => `<li class="${r.state}"><a href="${r.href}"><i></i>${esc(r.t)}</a></li>`).join("")}</ol>`;
  }
  function paint(A) {
    const rows = compute(A), n = rows.filter((r) => r.state === "done").length;
    root.querySelector(".rt-grid").innerHTML = rows.map((r) => `<article class="rt-card ${r.state}"><div class="rt-top"><span class="rt-n">0${r.n}</span><span class="tag ${ST[r.state][1]}">${ST[r.state][0]}</span></div>
      <h3>${esc(r.t)}</h3>
      <ul class="rt-meta"><li>${ico("target")} Nivel: ${esc(r.nivel)}</li><li>${ico("clock")} Unos ${r.min} min</li><li>${ico("layers")} ${r.res} recurso${r.res === 1 ? "" : "s"}${r.lessons ? ` (${r.done} de ${r.lessons} microlecciones)` : ""}</li></ul>
      <p><b>Obtienes:</b> ${esc(r.gets)}</p><p><b>Después podrás:</b> ${esc(r.after)}</p>
      <a class="btn sm ghost" href="${r.href}" data-track="clic_ruta_paso_${r.n}">${r.state === "done" ? "Repasar" : r.state === "prog" ? "Continuar" : "Empezar"} ${ico("arrow-right")}</a></article>`).join("");
    root.querySelector(".rt-bar").innerHTML = `<div class="bar"><i style="width:${(n / rows.length) * 100}%"></i></div><span>${n} de ${rows.length} pasos completados · el progreso se guarda solo en tu navegador</span>`;
    widget(rows);
  }
  document.addEventListener("iar:data", () => {
    const A = I.D.academy;
    if (!A) { root.innerHTML = ""; return; }
    root.innerHTML = `
      <div class="sec-head"><p class="kicker"><b>00</b> Por dónde empezar</p><h2 id="t-ruta">Tu ruta recomendada</h2>
        <p class="lead">Empieza entendiendo la IA, aprende a conversar con ella, dirige sus respuestas, intégrala en tus procesos y úsala con responsabilidad. Cada paso indica su nivel, cuánto toma y qué obtendrás.</p></div>
      <div class="ap-prog rt-bar"></div><div class="rt-grid"></div>
      <p class="muted rt-note">${ico("info")} Los tiempos son estimados de lectura y práctica. El estado de cada paso se calcula con lo que haces en la página (microlecciones completadas, herramientas usadas) y no sale de tu navegador.</p>`;
    paint(A);
    document.addEventListener("iar:journey", () => paint(A));
    document.addEventListener("click", (e) => { if (e.target.closest(".mk")) setTimeout(() => paint(A), 50); });
  }, { once: true });
})();
