/* Usuarios y presencia de las IA: cifras globales reportadas por las empresas (data/users.json)
   e interés de búsqueda por país de la región y por departamento del Perú (data/regional.json, Google Trends). */
(function () {
  "use strict";
  const root = document.getElementById("users-root");
  if (!root) return;
  if (window.IAR) start(); else document.addEventListener("iar:ready", start, { once: true });

  const COL = { ChatGPT: "#10a37f", Gemini: "#4285f4", Claude: "#d97757", Copilot: "#00a4ef", DeepSeek: "#4d6bfe" };
  const NAMES = Object.keys(COL);

  async function load(path) {
    try { const r = await fetch(path + "?v=" + Date.now()); return r.ok ? await r.json() : null; } catch (e) { return null; }
  }

  async function start() {
    const I = window.IAR, { esc, ico, nf, draw, provTag, tipAttr } = I;
    const [users, reg] = await Promise.all([load("data/users.json"), load("data/regional.json")]);
    const ok = !!(reg && reg.ok);
    const monthsAgo = (ym) => { const [y, m] = ym.split("-").map(Number), n = new Date(); return (n.getFullYear() - y) * 12 + (n.getMonth() + 1 - m); };
    const when = (ym) => { const k = monthsAgo(ym), d = new Date(ym + "-01T12:00:00").toLocaleDateString("es-PE", { month: "long", year: "numeric" }); return `${d} (hace ${k} ${k === 1 ? "mes" : "meses"})`; };
    const mil = (v) => (v >= 1000 ? (v / 1000).toLocaleString("es-PE", { maximumFractionDigits: 1 }) + " mil millones" : nf.format(v) + " millones");

    /* ---------- cifras globales ---------- */
    const items = (users && users.items) || [];
    const glob = items.length ? `
      <div class="panel fx" style="--a:#22d3ee">
        <h3>${ico("globe")} Mundo: usuarios que reportan las empresas</h3>
        <p class="sub">Cifras que cada empresa publicó en sus resultados o eventos. No son suscriptores de pago ni son comparables de forma estricta.</p>
        <div class="u-legend"><span><i style="background:#22d3ee"></i>Activos semanales</span><span><i style="background:#8b5cf6"></i>Activos mensuales</span></div>
        <div class="chart u-chart"><canvas id="c-u-global"></canvas></div>
        <ul class="u-list">${items.map((x) => `<li${tipAttr(x.name + "\n" + mil(x.value) + " " + x.what + "\nFecha de la cifra: " + when(x.asof) + "\nFuente: " + x.source)}>${x.prov ? provTag(x.prov) : esc(x.name)}<b>${esc(x.name)}</b><span>${esc(mil(x.value))} · ${esc(x.what)}</span><em class="${monthsAgo(x.asof) > 6 ? "old" : ""}">${esc(when(x.asof))}${monthsAgo(x.asof) > 6 ? " · cifra antigua, puede estar desactualizada" : ""}</em><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.source)} ${ico("external-link")}</a></li>`).join("")}</ul>
        ${(users.undisclosed || []).length ? `<h4 class="u-h4">${ico("info")} Sin cifra oficial</h4><ul class="u-undis">${users.undisclosed.map((x) => `<li>${x.prov ? provTag(x.prov) : ""}<span><b>${esc(x.name)}:</b> ${esc(x.note)}</span></li>`).join("")}</ul>` : ""}
        <p class="u-note">${ico("info")}<span>${esc(users.note || "")}</span></p>
      </div>` : "";

    /* ---------- región y Perú ---------- */
    let regional = "";
    let story = "";
    if (ok) {
      const pe = reg.countries.PE;
      const others = Object.entries(reg.countries).filter(([c]) => c !== "PE");
      const avg = (n) => (others.length ? others.reduce((s, [, v]) => s + v.share[n], 0) / others.length : 0);
      const lead = Object.entries(reg.countries).map(([c, v]) => [c, v.name, NAMES.slice().sort((a, b) => v.share[b] - v.share[a])[0]]);
      const leadCount = {}; lead.forEach((l) => { leadCount[l[2]] = (leadCount[l[2]] || 0) + 1; });
      const peOrder = pe ? NAMES.slice().sort((a, b) => pe.share[b] - pe.share[a]) : [];
      if (pe) {
        const d = (n) => Math.round((pe.share[n] - avg(n)) * 10) / 10;
        const topReg = (n) => [...reg.peru_regions].sort((a, b) => b.share[n] - a.share[n])[0];
        const gem = topReg("Gemini");
        story = `<div class="u-story fx" style="--a:#f43f9e"><p class="u-big">En el Perú, <b style="color:${COL[peOrder[0]]}">${esc(peOrder[0])}</b> concentra el <b>${pe.share[peOrder[0]]}%</b> del interés de búsqueda entre estas cinco IA.</p>
          <p>Le siguen ${peOrder.slice(1, 3).map((n) => `${esc(n)} (${pe.share[n]}%)`).join(" y ")}. Frente al promedio de los demás países de la región, ${esc(peOrder[0])} está ${Math.abs(d(peOrder[0]))} ${Math.abs(d(peOrder[0])) === 1 ? "punto" : "puntos"} ${d(peOrder[0]) >= 0 ? "por encima" : "por debajo"}${gem ? `; el departamento donde Gemini pesa más es <b>${esc(gem.name)}</b> (${gem.share.Gemini}%).` : "."}</p></div>`;
      }
      const sortedC = Object.entries(reg.countries).sort((a, b) => b[1].share.ChatGPT - a[1].share.ChatGPT);
      regional = `
        ${story}
        <div class="grid2 u-grid">
          <article class="panel fx" style="--a:#8b5cf6"><h3>${ico("flag")} Perú frente a la región</h3><p class="sub">Cuota de interés de búsqueda entre las cinco IA, por país (100 % = ChatGPT + Gemini + Claude + Copilot + DeepSeek).</p><div class="chart u-chart tall"><canvas id="c-u-region"></canvas></div></article>
          <article class="panel fx" style="--a:#fb923c"><h3>${ico("map-pin")} Departamentos del Perú</h3><p class="sub">Los ${Math.min(12, reg.peru_regions.length)} departamentos con más interés relativo y cómo se reparte entre las cinco IA.</p><div class="chart u-chart tall"><canvas id="c-u-peru"></canvas></div></article>
          <article class="panel fx wide" style="--a:#34d399"><h3>${ico("chart-line")} Evolución del interés en el Perú</h3><p class="sub">Índice diario de búsqueda (100 = el día de mayor interés de cualquiera de las cinco). ${esc(reg.window || "")}.</p><div class="chart u-chart"><canvas id="c-u-time"></canvas></div></article>
        </div>
        <h4 class="u-h4">${ico("trophy")} Quién lidera en la región</h4>
        <div class="u-comp">${NAMES.map((n) => { const rk = pe ? peOrder.indexOf(n) + 1 : null; return `<div class="u-card fx" style="--a:${COL[n]}"${tipAttr(n + "\nLidera el interés de búsqueda en " + (leadCount[n] || 0) + " de " + lead.length + " países de la región" + (pe ? "\nEn el Perú ocupa el puesto " + rk + " de 5 (" + pe.share[n] + "%)" : ""))}><b>${esc(n)}</b><span class="u-n">${leadCount[n] || 0}<small>/${lead.length}</small></span><span class="u-l">países donde lidera</span>${pe ? `<span class="u-pe">Perú: puesto ${rk} · ${pe.share[n]}%</span>` : ""}</div>`; }).join("")}</div>`;
    } else {
      regional = `<div class="panel fx u-empty" style="--a:#fbbf24"><h3>${ico("map-pin")} Región y Perú</h3>
        <p>Los datos de interés de búsqueda por país y por departamento se cargan con la actualización de datos. Aún no hay datos disponibles${reg && reg.error ? ` (Google limitó la consulta: ${esc(reg.error)})` : ""}.</p></div>`;
    }

    const limits = `<div class="u-limits fx" style="--a:#fbbf24"><h4>${ico("triangle-alert")} Qué se puede saber y qué no</h4>
      <ul><li><b>Suscriptores por país:</b> ninguna empresa de IA publica cuántos suscriptores o usuarios tiene en el Perú ni en la región. No existe una cifra oficial.</li>
      <li><b>Lo que sí se mide aquí:</b> el interés de búsqueda en Google (tendencia relativa), que indica presencia y preferencia, no cantidad de usuarios. Se comparan los términos ${ok ? Object.values(reg.terms).map(esc).join(", ") : "ChatGPT, Gemini AI, Claude AI, Microsoft Copilot y DeepSeek"}.</li>
      <li><b>Para cifras de tráfico o descargas por país:</b> consulta servicios como <a href="https://www.similarweb.com/" target="_blank" rel="noopener noreferrer">Similarweb</a> o <a href="https://sensortower.com/" target="_blank" rel="noopener noreferrer">Sensor Tower</a> (muchas funciones son de pago) y encuestas de uso de tecnología como las del <a href="https://www.inei.gob.pe/" target="_blank" rel="noopener noreferrer">INEI</a>.</li>
      ${users && users.regional_players ? `<li><b>Iniciativas regionales:</b> ${users.regional_players.map((p) => `${esc(p.name)} (${esc(p.where)})`).join("; ")}. ${esc(users.regional_players[0].note)}</li>` : ""}</ul></div>`;

    root.innerHTML = `
      <h2><span class="hi" style="--a:#f43f9e">${ico("users")}</span> Usuarios y presencia de la IA</h2>
      <p class="sub">Cuántas personas usan cada IA en el mundo según las empresas, y cómo se reparte el interés entre la región y el Perú.</p>
      ${glob}
      ${regional}
      ${limits}`;

    /* ---------- gráficas ---------- */
    if (items.length) {
      const sorted = [...items].sort((a, b) => b.value - a.value);
      draw("c-u-global", { type: "bar", data: { labels: sorted.map((x) => x.name), datasets: [{ data: sorted.map((x) => x.value), borderRadius: 10,
          backgroundColor: sorted.map((x) => (x.metric === "weekly" ? "#22d3ee" : "#8b5cf6")) }] },
        options: { indexAxis: "y", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => mil(c.raw) + " · " + sorted[c.dataIndex].what } } },
          scales: { x: { beginAtZero: true, ticks: { callback: (v) => nf.format(v) + " M" }, title: { display: true, text: "Millones de usuarios" } }, y: { grid: { display: false } } } },
        plugins: [{ id: "valores", afterDatasetsDraw(ch) { const m = ch.getDatasetMeta(0), c = ch.ctx; c.save(); c.font = '800 13px "Inter",sans-serif'; c.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--text") || "#fff"; c.textBaseline = "middle";
          m.data.forEach((b, i) => c.fillText(nf.format(sorted[i].value) + " M", b.x + 8, b.y)); c.restore(); } }] });
    }
    if (ok) {
      const stacked = (labels, rows, hl) => ({ type: "bar", data: { labels, datasets: NAMES.map((n) => ({ label: n, data: rows.map((r) => r.share[n]), backgroundColor: COL[n], borderWidth: 0 })) },
        options: { indexAxis: "y", plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.raw}%` } } },
          scales: { x: { stacked: true, max: 100, ticks: { callback: (v) => v + "%" } }, y: { stacked: true, grid: { display: false }, ticks: { autoSkip: false, font: (c) => ({ size: 12, weight: hl && labels[c.index] === hl ? "800" : "500" }), color: (c) => (hl && labels[c.index] === hl ? "#f43f9e" : getComputedStyle(document.documentElement).getPropertyValue("--muted").trim()) } } } } });
      const cs = Object.entries(reg.countries).sort((a, b) => b[1].share.ChatGPT - a[1].share.ChatGPT);
      draw("c-u-region", stacked(cs.map((x) => x[1].name), cs.map((x) => x[1]), "Perú"));
      const rg = reg.peru_regions.slice(0, 12);
      draw("c-u-peru", stacked(rg.map((r) => r.name), rg));
      draw("c-u-time", { type: "line", data: { labels: reg.peru_timeline.map((t) => new Date(t.date + "T12:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short" })),
          datasets: NAMES.map((n) => ({ label: n, data: reg.peru_timeline.map((t) => t[n]), borderColor: COL[n], backgroundColor: COL[n], borderWidth: 3, cubicInterpolationMode: "monotone", pointRadius: 0, pointHoverRadius: 6 })) },
        options: { interaction: { mode: "index", intersect: false }, plugins: { legend: { position: "bottom" } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } }, y: { beginAtZero: true } } } });
    }
  }
})();
