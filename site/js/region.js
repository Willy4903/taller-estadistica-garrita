/* 09B Perú frente a la región: madurez del ecosistema de IA (ILIA), gobernanza, adopción y uso, con lecturas clave.
   Todo sale de content/region.json; cada cifra lleva fuente y fecha. Las fuentes distintas no se mezclan en un mismo puntaje. */
(function () {
  "use strict";
  const root = document.getElementById("region-root");
  if (!root) return;
  const I = window.IAR, { esc, ico, draw, chartMeta, css } = I;
  const dec = (v, d = 1) => (v == null ? "n/d" : Number(v).toFixed(d).replace(".", ","));
  const tick = (v) => String(v).replace(".", ",");
  const wrap = (t) => { const w = t.split(" "); if (w.length < 3) return w.length === 2 ? w : t; const h = Math.ceil(w.length / 2); return [w.slice(0, h).join(" "), w.slice(h).join(" ")]; };
  const CAT = { pionero: "Pionero", adoptante: "Adoptante", explorador: "Explorador" };
  const isPE = (n) => /^Per[uú]$/i.test(n);
  // Perú lleva el acento; el resto va en grises según la categoría ILIA (la identidad nunca depende solo del color: el eje nombra el país y la tabla lo repite).
  const shade = (c, pe) => (pe ? css("--accent") : c === "pionero" ? css("--ink") : c === "adoptante" ? css("--muted") : css("--line2"));
  const st = { cat: "todos", view: "chart" };

  function rankChart(R) {
    const rows = R.ilia.countries.filter((c) => st.cat === "todos" || c.cat === st.cat);
    const h = Math.max(260, rows.length * 26 + 40);
    document.getElementById("rg-rank-box").style.height = h + "px";
    draw("c-rg-rank", { type: "bar", data: { labels: rows.map((c) => c.name), datasets: [{ data: rows.map((c) => c.score), backgroundColor: rows.map((c) => shade(c.cat, isPE(c.name))), borderRadius: 4, barPercentage: 0.78 }] },
      options: { indexAxis: "y", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${dec(c.raw)} puntos · ${CAT[rows[c.dataIndex].cat]}` } } },
        scales: { x: { beginAtZero: true, max: 100, ticks: { stepSize: 20 } }, y: { grid: { display: false }, ticks: { font: (ctx) => ({ weight: isPE(rows[ctx.index] && rows[ctx.index].name) ? "700" : "400" }) } } } } });
    document.getElementById("rg-rank-table").innerHTML = `<table><thead><tr><th>#</th><th>País</th><th>Puntaje</th><th>Categoría</th></tr></thead><tbody>${R.ilia.countries.map((c, i) => `<tr${isPE(c.name) ? ' class="rg-me"' : ""}><td>${i + 1}</td><td>${esc(c.name)}</td><td>${dec(c.score)}</td><td>${CAT[c.cat]}</td></tr>`).join("")}</tbody></table>`;
  }

  function dimsChart(R) {
    const d = R.ilia.peru.dims;
    draw("c-rg-dims", { type: "bar", data: { labels: d.map((x) => wrap(x.name)), datasets: [
      { label: "Perú", data: d.map((x) => x.pe), backgroundColor: css("--accent"), borderRadius: 4 },
      { label: "Promedio regional", data: d.map((x) => x.avg), backgroundColor: css("--line2"), borderRadius: 4 } ] },
      options: { plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.raw == null ? "no publicado" : dec(c.raw) + " puntos"}` } } }, scales: { y: { beginAtZero: true, max: 100 }, x: { grid: { display: false } } } } });
  }

  function groupChart(id, block, fmt) {
    draw(id, { type: "bar", data: { labels: block.labels, datasets: block.series.map((s) => ({ label: s.name, data: s.data, backgroundColor: isPE(s.name) ? css("--accent") : css("--line2"), borderRadius: 4 })) },
      options: { plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.raw == null ? "sin dato" : fmt(c.raw)}` } } }, scales: { y: { beginAtZero: true, ticks: { callback: (v) => tick(v) + " %" } }, x: { grid: { display: false } } } } });
  }

  function hbar(id, block, fmt) {
    const rows = block.items;
    draw(id, { type: "bar", data: { labels: rows.map((r) => r.name), datasets: [{ data: rows.map((r) => r.value), backgroundColor: rows.map((r) => (isPE(r.name) || /\(Perú\)/.test(r.name) ? css("--accent") : r.ref ? css("--line2") : css("--muted"))), borderRadius: 4 }] },
      options: { indexAxis: "y", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => fmt(c.raw) + (rows[c.dataIndex].note ? " · " + rows[c.dataIndex].note : "") } } }, scales: { x: { beginAtZero: true, ticks: { callback: (v) => tick(v) + (block.unit === "%" ? " %" : "") } }, y: { grid: { display: false } } } } });
  }

  function line(id, block, fmt) {
    const pal = [css("--accent"), css("--line2"), css("--ink"), css("--muted")];
    draw(id, { type: "line", data: { labels: block.labels, datasets: block.series.map((s, i) => ({ label: s.name, data: s.data, borderColor: pal[i % pal.length], backgroundColor: pal[i % pal.length], borderWidth: isPE(s.name) ? 3 : 2, borderDash: /promedio/i.test(s.name) ? [6, 4] : [], pointRadius: 4, pointHoverRadius: 6, tension: 0.25 })) },
      options: { interaction: { mode: "index", intersect: false }, plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.raw)}` } } }, scales: { y: { beginAtZero: true, ticks: { callback: (v) => tick(v) + " %" } }, x: { grid: { display: false } } } } });
  }

  function render(R) {
    const P = R.ilia.peru, M = R.ilia.meta;
    const extra = (R.indices || []).map((b, i) => `<div class="card"><h3>${esc(b.title)}</h3><p class="muted">${esc(b.q)}</p>
        ${b.headline ? `<p class="pe-big">${b.headline}</p>` : ""}<div class="chart" style="height:${b.kind === "line" ? 280 : Math.max(240, b.items.length * 34 + 40)}px"><canvas id="c-rg-x${i}"></canvas></div>${chartMeta(b.meta)}</div>`).join("");
    root.innerHTML = `
      <div class="sec-head"><p class="kicker"><b>09B</b> Perú frente a la región</p><h2 id="t-region">¿Dónde está el Perú en la carrera de la IA en América Latina?</h2>
        <p class="lead">${esc(R.lead)}</p><p class="muted mono">Datos revisados el ${esc(R.reviewed)} · edición más reciente de cada fuente</p></div>

      <div class="rg-kpis">${R.kpis.map((k) => `<div class="rg-kpi${k.tone ? " " + k.tone : ""}"><span class="rg-k-l">${esc(k.label)}</span><b>${esc(k.value)}</b><span class="rg-k-d">${esc(k.detail)}</span></div>`).join("")}</div>

      <div class="card rg-ilia">
        <div class="rg-ilia-h"><div><p class="kicker">Índice Latinoamericano de Inteligencia Artificial · ${esc(M.edition)}</p><h3>Ranking regional de madurez en IA</h3>
          <p class="muted">${esc(M.what)}</p></div>
          <div class="rg-ctl"><div class="seg" role="group" aria-label="Filtrar por categoría">${[["todos", "Todos"], ["pionero", "Pioneros"], ["adoptante", "Adoptantes"], ["explorador", "Exploradores"]].map(([k, l]) => `<button type="button" data-cat="${k}" aria-pressed="${k === st.cat}">${l}</button>`).join("")}</div>
          <div class="seg" role="group" aria-label="Vista"><button type="button" data-view="chart" aria-pressed="true">Gráfico</button><button type="button" data-view="table" aria-pressed="false">Tabla</button></div></div></div>
        <ul class="rg-legend" aria-label="Leyenda"><li><i style="background:var(--accent)"></i>Perú</li><li><i style="background:var(--ink)"></i>Pioneros (más de 60)</li><li><i style="background:var(--muted)"></i>Adoptantes (35 a 60)</li><li><i style="background:var(--line2)"></i>Exploradores (menos de 35)</li></ul>
        <div class="chart" id="rg-rank-box"><canvas id="c-rg-rank" role="img" aria-label="Puntaje ILIA ${esc(M.edition)} por país, de 0 a 100"></canvas></div>
        <div class="table-wrap" id="rg-rank-table" hidden></div>
        ${chartMeta({ mide: M.mide, nomide: M.nomide, fuente: M.source, url: M.url, fecha: M.fecha })}
      </div>

      <h3 class="sub-h">Seis lecturas clave</h3>
      <div class="rg-ins">${R.insights.map((x, i) => `<article class="rg-in"><span class="rg-in-n">${String(i + 1).padStart(2, "0")}</span><h4>${esc(x.t)}</h4><p>${esc(x.d)}</p></article>`).join("")}</div>

      <div class="grid g2 pe-grid">
        <div class="card"><h3>Las tres dimensiones del ILIA en el Perú</h3><p class="muted">${esc(P.dims_note)}</p>
          <div class="chart sm"><canvas id="c-rg-dims" role="img" aria-label="Puntaje del Perú por dimensión frente al promedio regional"></canvas></div>
          <ul class="rg-dl">${P.dims.map((x) => `<li><b>${esc(x.name)}</b> ${dec(x.pe)} <span class="muted">${esc(x.what)}</span></li>`).join("")}</ul>
          ${chartMeta(P.dims_meta)}</div>
        <div class="card"><h3>${esc(R.firms.title)}</h3><p class="muted">${esc(R.firms.q)}</p>
          <div class="chart sm"><canvas id="c-rg-firms" role="img" aria-label="Porcentaje de empresas que usan IA por tamaño"></canvas></div>
          ${chartMeta(R.firms.meta)}</div>
      </div>

      ${extra ? `<h3 class="sub-h">Uso y preparación: otras fuentes, por separado</h3><div class="grid g2 pe-grid">${extra}</div>` : ""}

      <div class="card rg-gov"><h3>Gobernanza: cómo se ordena la IA en el Perú</h3><p class="muted">${esc(R.gov.q)}</p>
        <ol class="rg-tl">${R.gov.timeline.map((t) => `<li><span class="rg-tl-d">${esc(t.date)}</span><div><b>${t.url ? `<a href="${esc(t.url)}" target="_blank" rel="noopener">${esc(t.t)}</a>` : esc(t.t)}</b><p>${esc(t.d)}</p></div></li>`).join("")}</ol>
        ${R.gov.risk ? `<h4 class="rg-rk-t">${esc(R.gov.risk_title || "")}</h4><div class="rg-risk">${R.gov.risk.map((r) => `<div class="rg-rk ${r.tone}"><span class="tag ${r.tone}">${esc(r.level)}</span><p>${esc(r.d)}</p></div>`).join("")}</div>` : ""}
      </div>

      <div class="grid g2 pe-grid">
        <div class="card"><h3>Fortalezas</h3><ul class="rg-sw ok">${R.swot.strengths.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>
        <div class="card"><h3>Brechas por cerrar</h3><ul class="rg-sw risk">${R.swot.gaps.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>
      </div>
      <div class="callout warn">${ico("triangle-alert")}<p>${esc(R.caveat)}</p></div>
      <p class="muted rg-src">Fuentes: ${R.sources.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join(" · ")}.</p>`;

    rankChart(R); dimsChart(R);
    groupChart("c-rg-firms", R.firms, (v) => dec(v) + " %");
    (R.indices || []).forEach((b, i) => (b.kind === "line" ? line : hbar)("c-rg-x" + i, b, (v) => (b.unit === "%" ? dec(v) + " %" : dec(v))));

    root.addEventListener("click", (e) => {
      const c = e.target.closest("[data-cat]"), v = e.target.closest("[data-view]");
      if (c) { st.cat = c.dataset.cat; root.querySelectorAll("[data-cat]").forEach((b) => b.setAttribute("aria-pressed", b === c)); rankChart(R); I.track("region_filtro_" + st.cat); }
      if (v) {
        st.view = v.dataset.view; root.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-pressed", b === v));
        document.getElementById("rg-rank-box").hidden = st.view !== "chart"; document.getElementById("rg-rank-table").hidden = st.view !== "table"; I.track("region_vista_" + st.view);
      }
    });
  }

  document.addEventListener("iar:data", () => {
    const R = I.D.region;
    if (!R || !R.ilia) {
      root.innerHTML = `<div class="sec-head"><p class="kicker"><b>09B</b> Perú frente a la región</p><h2 id="t-region">Perú frente a la región</h2></div><div class="callout warn">${ico("info")}<p>No se pudieron cargar los datos regionales por ahora.</p></div>`;
      return;
    }
    render(R);
    if (I.journey && I.journey.mark) root.addEventListener("click", () => I.journey.mark("region"), { once: true });
  }, { once: true });
})();
