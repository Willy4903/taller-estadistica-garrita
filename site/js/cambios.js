/* 02 Qué cambió: línea ANTES -> AHORA con modelos, capacidades, contexto, precios, benchmarks y anuncios. Todo con fuente. */
(function () {
  "use strict";
  const root = document.getElementById("cambios-root");
  if (!root) return;
  const I = window.IAR, { esc, ico, fmtDate, fmtCtx, fmtPrice, nf, provTag, versionPairs, isMajor, signed } = I;
  const ANN = {
    APIs: /\bapi\b|\bsdk\b|developer/i, Planes: /\bplan\b|plans|pricing|subscription|suscrip|\btier\b|free tier/i, Agentes: /\bagent|agente|computer use|autonom/i,
    Integraciones: /integrat|connector|plugin|\bmcp\b|partnership|alianza/i, Productos: /\bapp\b|feature|launch|rolls? out|introduc|available|lanz|nueva funci/i,
  };
  const st = { tab: "modelos" };
  const nm = (m) => m.name.replace(/^[^:]+: /, "");

  function pairCard({ cur, prev, dIn, dOut }) {
    const rows = [];
    const mark = (cls, sign, txt) => rows.push(`<li class="${cls}"><span class="sg">${sign}</span>${txt}</li>`);
    if (cur.context !== prev.context && cur.context && prev.context) mark(cur.context > prev.context ? "pos" : "neg", cur.context > prev.context ? "+" : "−", `Contexto: ${fmtCtx(prev.context)} → <b>${fmtCtx(cur.context)}</b>`);
    if (cur.reasoning !== prev.reasoning) mark(cur.reasoning ? "pos" : "neg", cur.reasoning ? "+" : "−", cur.reasoning ? "Razonamiento" : "Sin razonamiento");
    if (cur.multimodal !== prev.multimodal) mark(cur.multimodal ? "pos" : "neg", cur.multimodal ? "+" : "−", cur.multimodal ? "Multimodal (acepta imágenes u otros formatos)" : "Ya no es multimodal");
    if (dIn != null && dIn !== 0) mark(dIn < 0 ? "pos" : "neg", dIn < 0 ? "−" : "+", `Precio de entrada: ${fmtPrice(prev.price_in)} → <b>${fmtPrice(cur.price_in)}</b> (${signed(dIn)})`);
    if (dOut != null && dOut !== 0) mark(dOut < 0 ? "pos" : "neg", dOut < 0 ? "−" : "+", `Precio de salida: ${fmtPrice(prev.price_out)} → <b>${fmtPrice(cur.price_out)}</b> (${signed(dOut)})`);
    return `<article class="chg-card"><div class="chg-head">${provTag(cur.provider)}<time class="muted mono">${esc(fmtDate(cur.created))}</time></div>
      <h3><span class="was">${esc(nm(prev))}</span> <span class="arr">→</span> ${esc(nm(cur))}</h3>
      <ul class="chg-list">${rows.join("") || '<li class="mut">Sin cambios en precio, contexto ni capacidades.</li>'}</ul>
      <p class="chg-src">Fuente: <a href="https://openrouter.ai/${encodeURI(cur.id)}" target="_blank" rel="noopener">catálogo de OpenRouter</a></p></article>`;
  }

  function view(D) {
    const t = st.tab, body = document.getElementById("chg-body");
    if (t === "modelos" || t === "capacidades" || t === "contexto" || t === "precios") {
      let pairs = versionPairs(D.base.filter(isMajor));
      const f = { modelos: () => true, capacidades: (p) => p.cur.reasoning !== p.prev.reasoning || p.cur.multimodal !== p.prev.multimodal, contexto: (p) => p.cur.context !== p.prev.context, precios: (p) => (p.dIn || 0) !== 0 || (p.dOut || 0) !== 0 }[t];
      pairs = pairs.filter(f).slice(0, 9);
      body.innerHTML = pairs.length ? `<div class="grid g3">${pairs.map(pairCard).join("")}</div>` : `<div class="callout">${ico("info")}<p>No hay versiones nuevas con una anterior comparable en este criterio durante los últimos 90 días.</p></div>`;
    } else if (t === "benchmarks") {
      const R = (D.frontier && D.frontier.rankings) || [];
      body.innerHTML = `<div class="grid g2">${R.map((r) => `<div class="card"><h3>${esc(r.title)}</h3><p class="muted">Instantánea del ${esc(fmtDate(r.date))}</p>
        <ol class="mini-rank">${r.items.map((i) => `<li>${provTag(i.prov)}<b>${esc(i.name)}</b><em>${i.v}</em></li>`).join("")}</ol>
        <p class="chg-src">Fuente: <a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title.split(":")[0])}</a></p></div>`).join("")}</div>
        <div class="callout">${ico("info")}<p>${esc((D.frontier && D.frontier.rank_note) || "")} Los benchmarks no se mezclan entre sí.</p></div>`;
    } else {
      const items = (D.news.items || []).filter((n) => I.daysAgo(n.published.slice(0, 10)) <= 30 && n.kind === "lab");
      const tagged = items.map((n) => ({ n, c: Object.keys(ANN).filter((k) => ANN[k].test(n.title + " " + (n.summary || ""))) })).filter((x) => x.c.length).slice(0, 12);
      body.innerHTML = tagged.length ? `<ul class="ann">${tagged.map(({ n, c }) => `<li><div class="chips">${c.map((x) => `<span class="tag acc">${esc(x)}</span>`).join("")}<span class="tag">${esc(n.source)}</span><time class="muted mono">${esc(fmtDate(n.published.slice(0, 10)))}</time></div>
        <a href="${esc(n.link)}" target="_blank" rel="noopener">${esc(n.title_es || n.title)}</a></li>`).join("")}</ul><p class="muted">Anuncios de blogs oficiales de laboratorios de los últimos 30 días, clasificados por palabras clave.</p>`
        : `<div class="callout">${ico("info")}<p>No se detectaron anuncios de laboratorios con estas categorías en los últimos 30 días.</p></div>`;
    }
  }

  document.addEventListener("iar:data", () => {
    const D = I.D;
    if (!D.base) { root.innerHTML = '<div class="callout warn">' + ico("triangle-alert") + "<p>No se pudo cargar el catálogo de modelos.</p></div>"; return; }
    const ch = (D.changes && D.changes.items) || [];
    const w = ch.filter((c) => I.daysAgo(c.date) <= 30);
    const n = (k) => w.filter((c) => c.kind === k).length;
    const down = w.filter((c) => c.kind.startsWith("precio") && c.after < c.before).length, up = w.filter((c) => c.kind.startsWith("precio") && c.after > c.before).length;
    const tabs = [["modelos", "Modelos"], ["capacidades", "Capacidades"], ["contexto", "Contexto"], ["precios", "Precios"], ["benchmarks", "Benchmarks"], ["anuncios", "APIs, planes, agentes y productos"]];
    root.innerHTML = `
      <div class="sec-head"><p class="kicker"><b>02</b> Qué cambió</p><h2 id="t-cambios">Antes → ahora</h2>
        <p class="lead">Cada cambio frente a la versión anterior, con la fuente al lado. Si no hay fuente verificable, no aparece.</p></div>
      <div class="stats">
        <div><b>${n("nuevo")}</b><span>modelos nuevos detectados (30 días)</span></div>
        <div><b>${down} ↓ ${up} ↑</b><span>cambios de precio detectados (30 días)</span></div>
        <div><b>${n("contexto")}</b><span>cambios de contexto detectados (30 días)</span></div>
      </div>
      <div class="seg tabs" role="tablist" aria-label="Tipo de cambio">${tabs.map(([k, l]) => `<button type="button" role="tab" data-t="${k}" aria-pressed="${k === st.tab}">${esc(l)}</button>`).join("")}</div>
      <div id="chg-body" aria-live="polite"></div>
      <p class="muted chg-note">${ico("info")} Las comparaciones por familia usan el catálogo público de OpenRouter (fecha de lanzamiento, contexto, precio por millón de tokens) y se limitan a laboratorios principales. El conteo diario se acumula desde que el sistema empezó a guardar el histórico.</p>`;
    root.querySelector(".tabs").addEventListener("click", (e) => {
      const b = e.target.closest("[data-t]"); if (!b) return;
      st.tab = b.dataset.t; root.querySelectorAll("[data-t]").forEach((x) => x.setAttribute("aria-pressed", x.dataset.t === st.tab));
      I.track("cambios_" + st.tab); view(D);
    });
    view(D);
  }, { once: true });
})();
