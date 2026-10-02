/* 08 IA responsable: principios, semáforo, lista de verificación, casos reales, ética y regulación. */
(function () {
  "use strict";
  const home = document.getElementById("responsable-root"), casesRoot = document.getElementById("cases-root"), regRoot = document.getElementById("reg-root");
  if (!home && !casesRoot && !regRoot) return;
  const I = window.IAR, { esc, ico, fmtDate, track, journey, lima } = I;

  /* ---------- semáforo ---------- */
  function traffic(E) {
    const S = E.semaforo, items = [];
    ["verde", "amarillo", "rojo"].forEach((k) => S[k].items.forEach(([t, d]) => items.push({ k, t, d })));
    return `<div class="card tl">
      <h3>¿Puedo usar IA para esto?</h3>
      <p class="muted">Elige un uso y mira el nivel de riesgo y qué precauciones tomar.</p>
      <div class="chips" role="group" aria-label="Uso">${items.map((x, i) => `<button type="button" class="chip-btn tl-${x.k}" data-i="${i}" aria-pressed="false">${esc(x.t)}</button>`).join("")}</div>
      <div id="tl-out" class="tl-out" aria-live="polite"><p class="muted">Selecciona un uso para ver la recomendación.</p></div>
      <p class="muted tl-note">${ico("info")} ${esc(S.nota)}</p></div>`;
  }
  function bindTraffic(E) {
    const S = E.semaforo, items = [];
    ["verde", "amarillo", "rojo"].forEach((k) => S[k].items.forEach(([t, d]) => items.push({ k, t, d })));
    home.querySelector(".tl").addEventListener("click", (e) => {
      const b = e.target.closest("[data-i]"); if (!b) return;
      home.querySelectorAll(".tl [data-i]").forEach((x) => x.setAttribute("aria-pressed", x === b));
      const x = items[+b.dataset.i], s = S[x.k];
      document.getElementById("tl-out").innerHTML = `<div class="tl-res ${x.k}"><span class="tl-dot"></span><div><b>${esc(s.t)}: ${esc(x.t)}</b><p>${esc(x.d)}</p><p class="muted">${esc(s.d)}</p></div></div>`;
      track("semaforo_uso", { nivel: x.k }); journey.mark("semaforo");
    });
  }

  /* ---------- lista de verificación ---------- */
  function checklist(E) {
    const grp = (title, arr, key) => `<fieldset class="ck"><legend>${esc(title)}</legend>${arr.map((q) => `<div class="ck-q"><span>${esc(q.q)}</span><div class="seg" role="group" aria-label="${esc(q.q)}"><button type="button" data-g="${key}" data-id="${q.id}" data-v="si" aria-pressed="false">Sí</button><button type="button" data-g="${key}" data-id="${q.id}" data-v="no" aria-pressed="false">No</button></div></div>`).join("")}</fieldset>`;
    return `<div class="card ckc"><h3>Antes de usar IA: una revisión de dos minutos</h3><p class="muted">Responde y obtén una valoración. Es una guía educativa, no una auditoría.</p>
      <div class="grid g2">${grp("Antes de enviar información", E.check.send, "send")}${grp("Antes de utilizar el resultado", E.check.use, "use")}</div><div id="ck-out" aria-live="polite"></div></div>`;
  }
  function bindChecklist(E) {
    const ans = {};
    const all = E.check.send.concat(E.check.use);
    home.querySelector(".ckc").addEventListener("click", (e) => {
      const b = e.target.closest("[data-id]"); if (!b) return;
      ans[b.dataset.id] = b.dataset.v;
      home.querySelectorAll(`.ckc [data-id="${b.dataset.id}"]`).forEach((x) => x.setAttribute("aria-pressed", x === b));
      if (all.some((q) => !ans[q.id])) { document.getElementById("ck-out").innerHTML = `<p class="muted">Responde todas las preguntas (${Object.keys(ans).length} de ${all.length}).</p>`; return; }
      const flags = all.filter((q) => ans[q.id] === q.risk);
      const ids = new Set(flags.map((f) => f.id));
      const sendRisk = ids.has("personales") || ids.has("confidencial"), noBasis = ids.has("autoriza") || ids.has("politica");
      const verifGap = ids.has("cifras") || ids.has("fuentes") || ids.has("citas");
      let lvl = "ok", title = "Uso de bajo riesgo", text = "No se detectan alertas. Mantén los hábitos de verificación.";
      if (flags.length) { lvl = "warn"; title = "Revisar antes de continuar"; text = "Hay puntos que conviene resolver antes de seguir:"; }
      if ((sendRisk && noBasis) || (ids.has("decision") && verifGap) || ids.has("especialista")) { lvl = "risk"; title = "Requiere control adicional"; text = "Combina factores de riesgo. No continúes hasta resolver lo siguiente:"; }
      document.getElementById("ck-out").innerHTML = `<div class="callout ${lvl}">${ico(lvl === "ok" ? "circle-check" : "triangle-alert")}<div><p><b>${title}.</b> ${esc(text)}</p>${flags.length ? `<ul>${flags.map((f) => `<li>${esc(f.q)} ${f.risk === "si" ? "(respondiste que sí)" : "(respondiste que no)"}</li>`).join("")}</ul>` : ""}</div></div>`;
      track("checklist_completo", { nivel: lvl }); journey.mark("checklist");
    });
  }

  /* ---------- casos ---------- */
  function cases(C, el) {
    el.innerHTML = `<p class="muted">${esc(C.intro)}</p><div class="cases">${C.items.map((c) => `<article class="case card"><span class="tag acc">${esc(c.cat)}</span><h3>${esc(c.title)} <span class="muted">· ${c.year}</span></h3>
      <dl><div><dt>Qué ocurrió</dt><dd>${esc(c.what)}</dd></div><div><dt>Qué falló</dt><dd>${esc(c.failed)}</dd></div><div><dt>Impacto</dt><dd>${esc(c.impact)}</dd></div><div><dt>Qué debía haberse hecho</dt><dd>${esc(c.should)}</dd></div></dl>
      <p class="case-l">${ico("lightbulb")} <b>Lección:</b> ${esc(c.lesson)}</p>
      <p class="muted case-s">Fuente${c.sources.length > 1 ? "s" : ""}: ${c.sources.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a> <span class="tag">nivel ${s.level}</span>`).join("; ")}</p></article>`).join("")}</div>`;
  }

  /* ---------- regulación ---------- */
  const TYPE = { LEY: "Ley", REGLAMENTO: "Reglamento", ESTANDAR: "Estándar", RECOMENDACION: "Recomendación", BUENA_PRACTICA: "Buena práctica" };
  const STAT = { VIGENTE: ["ok", "Vigente"], APROBADO: ["acc", "Aprobado"], PROYECTO: ["warn", "Proyecto"], CONSULTA: ["warn", "Consulta"], GUIA: ["", "Guía"] };
  function regulation(R, checks, el) {
    const st = { j: "PE", scope: "Todos" };
    el.innerHTML = `
      <div class="callout warn">${ico("triangle-alert")}<p>${esc(R.note)} Revisado por última vez el ${esc(fmtDate(R.verified_on))}. Esto explica qué marcos existen y qué implican; no es asesoría jurídica.</p></div>
      <div class="seg" role="group" aria-label="Marco normativo" id="reg-seg">${Object.entries(R.jurisdictions).map(([k, j]) => `<button type="button" data-j="${k}" aria-pressed="${k === st.j}">${esc(j.name)}</button>`).join("")}</div>
      <div id="reg-body" aria-live="polite"></div>
      <h3 class="sub-h" id="cambios-reg">Qué cambió en regulación</h3>
      <div class="chips" id="reg-scope" role="group" aria-label="Ámbito">${["Todos", "Perú", "Latinoamérica", "Estados Unidos", "Unión Europea", "Global"].map((s) => `<button type="button" class="chip-btn" data-s="${s}" aria-pressed="${s === st.scope}">${s}</button>`).join("")}</div>
      <div id="reg-chg"></div>
      <h3 class="sub-h">Tipos de documento</h3>
      <ul class="types">${Object.entries(R.types).map(([k, v]) => `<li><span class="tag">${esc(TYPE[k])}</span> ${esc(v)}</li>`).join("")}</ul>`;
    const body = () => {
      const j = R.jurisdictions[st.j];
      el.querySelector("#reg-body").innerHTML = `<p class="lead reg-i">${esc(j.intro)}</p><div class="grid g2">${j.items.map((it) => {
        const s = STAT[it.status] || ["", it.status], ck = checks[it.id];
        return `<article class="card reg"><div class="chips"><span class="tag">${esc(TYPE[it.type])}</span><span class="tag ${s[0]}">${esc(s[1])}</span><time class="muted mono">${esc(fmtDate(it.date))}</time></div>
          <h4>${esc(it.title)}</h4><p>${esc(it.regulates)}</p><p><b>A quién afecta.</b> ${esc(it.affects)}</p>${it.points && it.points.length ? `<ul>${it.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
          <p class="muted reg-s">Fuente oficial: <a href="${esc(it.source_url)}" target="_blank" rel="noopener" data-track="clic_fuente_normativa">${esc(it.source_name)}</a>${ck && ck.ok ? ` · consultada el ${esc((ck.retrieved_at || "").slice(0, 10))}` : ""}${ck && ck.changed ? ' <span class="tag warn">el contenido de la fuente cambió, revisar</span>' : ""}${it.verification && it.verification.indexOf("verificado") === 0 ? "" : ' <span class="tag">referencia, verificar</span>'}</p></article>`;
      }).join("")}</div>`;
    };
    const chg = () => {
      const rows = R.changes.filter((c) => st.scope === "Todos" || c.scope === st.scope).sort((a, b) => b.date.localeCompare(a.date));
      el.querySelector("#reg-chg").innerHTML = rows.length ? `<div class="table-wrap"><table><thead><tr><th>País</th><th>Norma</th><th>Cambio</th><th>Fecha</th><th>Estado</th><th>Fuente oficial</th></tr></thead><tbody>${rows.map((c) => { const s = STAT[c.status] || ["", c.status]; return `<tr><td>${esc(c.country)}</td><td>${esc(c.norm)}</td><td>${esc(c.change)}</td><td>${esc(fmtDate(c.date))}</td><td><span class="tag ${s[0]}">${esc(s[1])}</span></td><td><a href="${esc(c.source_url)}" target="_blank" rel="noopener">${esc(c.source_name)}</a></td></tr>`; }).join("")}</tbody></table></div>`
        : `<div class="callout">${ico("info")}<p>IA Radar aún no tiene cambios verificados para este ámbito. No se rellena con proyectos ni noticias sin confirmar.</p></div>`;
    };
    el.addEventListener("click", (e) => {
      const j = e.target.closest("[data-j]"), s = e.target.closest("[data-s]");
      if (j) { st.j = j.dataset.j; el.querySelectorAll("#reg-seg [data-j]").forEach((b) => b.setAttribute("aria-pressed", b === j)); body(); track("regulacion_marco", { j: st.j }); journey.mark("regulacion"); }
      if (s) { st.scope = s.dataset.s; el.querySelectorAll("#reg-scope [data-s]").forEach((b) => b.setAttribute("aria-pressed", b === s)); chg(); }
    });
    body(); chg();
  }

  document.addEventListener("iar:data", () => {
    const D = I.D, E = D.ethics;
    if (home && E) {
      home.innerHTML = `
        <div class="sec-head"><p class="kicker"><b>08</b> Usar con criterio</p><h2 id="t-responsable">Usa IA. Pero úsala con criterio.</h2>
          <p class="lead">No se trata de tener miedo, sino de combinar capacidad con responsabilidad. Seis principios y dos herramientas para decidir en segundos.</p></div>
        <div class="grid g3 princ">${E.principles.map((p) => `<article class="card pr"><span class="pr-n">${ico(p.icon)} ${p.n}</span><h3>${esc(p.t)}</h3><p>${esc(p.d)}</p><ul>${p.list.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><p class="muted">${esc(p.how)}</p></article>`).join("")}</div>
        <div class="grid g2 tools">${traffic(E)}${checklist(E)}</div>
        <div class="resp-links"><a class="btn ghost" href="responsable.html#casos" data-track="clic_casos">Casos reales, lecciones reales ${ico("arrow-right")}</a><a class="btn ghost" href="responsable.html#regulacion" data-track="clic_regulacion">IA, ética y regulación ${ico("arrow-right")}</a></div>`;
      bindTraffic(E); bindChecklist(E);
    }
    if (casesRoot && D.cases) cases(D.cases, casesRoot);
    if (regRoot && D.regulation) regulation(D.regulation, (D.regchecks && D.regchecks.checks) || {}, regRoot);
  }, { once: true });
})();
