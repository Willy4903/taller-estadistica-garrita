/* 10 ¿En qué nivel estás usando IA? Diagnóstico de 60 segundos con ruta sugerida. */
(function () {
  "use strict";
  const root = document.getElementById("nivel-root");
  if (!root) return;
  const I = window.IAR, { esc, ico, store, track, journey } = I;

  function recommend(level, tool, Z) {
    const r = Z.routes, out = [];
    if (level === "explorador") out.push("r1");
    else if (level === "usuario") { out.push("r1"); if (tool === "ChatGPT") out.push("r2"); if (tool === "Claude") out.push("r3"); }
    else { if (tool === "ChatGPT" || tool === "Ambas" || tool === "Otras o ninguna") out.push("r2"); if (tool === "Claude" || tool === "Ambas") out.push("r3"); if (!out.length) out.push("r2"); }
    return out.map((k) => ({ k, ...r[k] }));
  }
  document.addEventListener("iar:data", () => {
    const Z = I.D.diag;
    if (!Z) { root.innerHTML = ""; return; }
    const ans = {};
    root.innerHTML = `
      <div class="sec-head"><p class="kicker"><b>10</b> Tu punto de partida</p><h2 id="t-nivel">¿En qué nivel estás usando IA?</h2>
        <p class="lead">Un diagnóstico de 60 segundos. Sin registro ni datos personales: el resultado se queda en tu navegador.</p></div>
      <div class="card" id="dg"><form id="dg-form">${Z.questions.map((q) => `<fieldset class="dq"><legend><span class="dq-n">${q.id + 1}</span>${esc(q.q)}</legend><div class="dq-o">${q.options.map((o, k) => `<label><input type="radio" name="q${q.id}" value="${k}"><span>${esc(o)}</span></label>`).join("")}</div></fieldset>`).join("")}
        <fieldset class="dq"><legend><span class="dq-n">+</span>¿Qué herramienta usas más?</legend><div class="dq-o">${Z.tools.map((t) => `<label><input type="radio" name="tool" value="${esc(t)}"><span>${esc(t)}</span></label>`).join("")}</div></fieldset>
        <div class="row"><button type="submit" class="btn">Ver mi nivel</button><span class="muted" id="dg-prog"></span></div></form><div id="dg-res" aria-live="polite"></div></div>`;
    const form = document.getElementById("dg-form");
    const count = () => { const n = Z.questions.filter((q) => form.querySelector(`input[name="q${q.id}"]:checked`)).length; document.getElementById("dg-prog").textContent = `${n} de ${Z.questions.length} respondidas`; return n; };
    form.addEventListener("change", () => { count(); if (!form.dataset.s) { form.dataset.s = 1; track("diagnostico_inicio"); } });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (count() < Z.questions.length) { document.getElementById("dg-prog").textContent = "Responde las 10 preguntas para ver tu nivel."; return; }
      const score = Z.questions.reduce((s, q) => s + (+form.querySelector(`input[name="q${q.id}"]:checked`).value), 0);
      const tool = (form.querySelector('input[name="tool"]:checked') || {}).value || "Ambas";
      const lvl = Z.levels.find((l) => score <= l.max);
      const areas = Z.questions.map((q) => ({ a: q.area, v: +form.querySelector(`input[name="q${q.id}"]:checked`).value })).sort((a, b) => a.v - b.v);
      const recs = recommend(lvl.id, tool, Z);
      store.set("iar_diag", { level: lvl.id, name: lvl.name, score, tool, routes: recs.map((r) => r.k) });
      track("diagnostico_completado", { nivel: lvl.id }); journey.mark("diagnostico");
      document.getElementById("dg-res").innerHTML = `<div class="dg-out"><p class="kicker">Tu resultado</p><h3>${esc(lvl.name)} <span class="muted">· ${score} de ${Z.questions.length * 3}</span></h3><p class="lead">${esc(lvl.text)}</p>
        <div class="bar big"><i style="width:${(score / (Z.questions.length * 3)) * 100}%"></i></div>
        <p><b>Dónde está tu mayor oportunidad:</b> ${areas.slice(0, 3).map((a) => esc(a.a.toLowerCase())).join(", ")}.</p>
        <h4>Ruta educativa sugerida</h4><div class="grid g2">${recs.map((r) => `<article class="card"><span class="tag acc">${esc(r.n)}</span><h4>${esc(r.t)}</h4><a class="btn sm" href="${esc(I.CONFIG.wgia)}" target="_blank" rel="noopener" data-track="clic_ruta_${r.k}">${esc(r.cta)} ${ico("arrow-up-right")}</a></article>`).join("")}</div></div>`;
      document.getElementById("dg-res").scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    count();
  }, { once: true });
})();
