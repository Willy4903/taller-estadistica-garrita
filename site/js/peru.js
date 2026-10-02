/* 09 IA en Perú: interés relativo de búsqueda. Separa la INTENSIDAD territorial de la COMPOSICIÓN del interés. */
(function () {
  "use strict";
  const root = document.getElementById("peru-root");
  if (!root) return;
  const I = window.IAR, { esc, ico, draw, chartMeta, css, nf } = I;
  const COL = { ChatGPT: "#10a37f", Gemini: "#4285f4", Claude: "#d97757", Copilot: "#00a4ef", DeepSeek: "#4d6bfe", Grok: "#6b7280", Perplexity: "#22b8cd", "Meta AI": "#0866ff", Kimi: "#8a6cff" };
  const st = { set: "A", dept: "", term: "" };
  const pc = (v) => (v < 1 ? "menos de 1" : String(v).replace(".", ","));

  function paint(D) {
    const T = D.trends.sets[st.set] || D.trends.sets.A, names = Object.keys(T.terms);
    if (!names.includes(st.term)) st.term = names[0];
    const regs = T.peru_regions || [], pe = T.countries && T.countries.PE;
    const sel = st.dept ? regs.find((r) => r.name === st.dept) : null;
    const share = sel ? sel.share : pe ? pe.share : null, label = sel ? sel.name : "Perú (nacional)";
    const lead = share ? names.slice().sort((a, b) => share[b] - share[a]) : [];
    document.getElementById("pe-comp").innerHTML = share ? `
      <h3>Composición del interés en ${esc(label)}</h3>
      <p class="muted">Cómo se reparte el 100 % del interés de búsqueda entre estas herramientas dentro de ${esc(label)}. No dice cuánta gente busca IA ahí, solo qué se busca más.</p>
      <p class="pe-big"><b style="color:${COL[lead[0]]}">${esc(lead[0])}</b> concentra el <b>${pc(share[lead[0]])} %</b>; le siguen ${lead.slice(1, 3).map((n) => `${esc(n)} (${pc(share[n])} %)`).join(" y ")}.</p>
      <div class="chart sm"><canvas id="c-pe-comp"></canvas></div>
      ${chartMeta({ mide: "Composición: parte del interés de búsqueda de cada herramienta frente al total de las cinco, dentro del territorio elegido (suma 100 %).", nomide: "No mide cuántas personas usan IA, ni compara la intensidad entre territorios, ni hay datos de suscriptores por país o departamento.", fuente: "Google Trends", url: "https://trends.google.com/trends/", fecha: `${T.window}, actualizado ${(D.trends.updated_at || "").slice(0, 10)}` })}` : "";
    if (share) draw("c-pe-comp", { type: "bar", data: { labels: [label], datasets: names.map((n) => ({ label: n, data: [share[n]], backgroundColor: COL[n], borderWidth: 0 })) },
      options: { indexAxis: "y", plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.raw} %` } } }, scales: { x: { stacked: true, max: 100, ticks: { callback: (v) => v + " %" } }, y: { stacked: true, display: false } } } });

    const withRaw = regs.filter((r) => r.raw), top = [...withRaw].sort((a, b) => b.raw[st.term] - a.raw[st.term]).slice(0, 10);
    document.getElementById("pe-int").innerHTML = withRaw.length ? `
      <h3>Intensidad territorial de ${esc(st.term)}</h3>
      <p class="muted">Dónde se busca más "${esc(T.terms[st.term])}" respecto al total de búsquedas de cada departamento. 100 = el mayor valor de todo el conjunto.</p>
      <div class="chips" role="group" aria-label="Herramienta">${names.map((n) => `<button type="button" class="chip-btn" data-term="${esc(n)}" aria-pressed="${n === st.term}">${esc(n)}</button>`).join("")}</div>
      <div class="chart"><canvas id="c-pe-int"></canvas></div>
      ${chartMeta({ mide: "Intensidad: popularidad de la búsqueda de la herramienta elegida en cada departamento, relativa a todas sus búsquedas y a una misma escala de 0 a 100.", nomide: "No es el número de usuarios ni un ranking de población. Departamentos con poco volumen pueden mostrar variaciones grandes. Solo se muestran los 24 departamentos con datos suficientes.", fuente: "Google Trends", url: "https://trends.google.com/trends/", fecha: `${T.window}, actualizado ${(D.trends.updated_at || "").slice(0, 10)}` })}` : `<div class="callout warn">${ico("info")}<p>La intensidad territorial se mostrará en la próxima actualización de datos.</p></div>`;
    if (withRaw.length) draw("c-pe-int", { type: "bar", data: { labels: top.map((r) => r.name), datasets: [{ data: top.map((r) => r.raw[st.term]), backgroundColor: COL[st.term], borderRadius: 6 }] },
      options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, max: 100 }, y: { grid: { display: false } } } } });

    const tl = T.peru_timeline || [];
    document.getElementById("pe-time").innerHTML = tl.length ? `<h3>Evolución del interés en el Perú</h3><p class="muted">Índice diario de búsqueda a escala nacional (100 = el día de mayor interés de cualquiera de las herramientas del conjunto).</p><div class="chart"><canvas id="c-pe-time"></canvas></div>
      ${chartMeta({ mide: "Interés relativo diario de búsqueda en el Perú.", nomide: "No mide usuarios. Solo hay serie nacional: no existe evolución por departamento en esta fuente.", fuente: "Google Trends", url: "https://trends.google.com/trends/", fecha: T.window })}` : "";
    if (tl.length) draw("c-pe-time", { type: "line", data: { labels: tl.map((t) => t.date.slice(5)), datasets: names.map((n) => ({ label: n, data: tl.map((t) => t[n]), borderColor: COL[n], backgroundColor: COL[n], borderWidth: 2, tension: 0.3, pointRadius: 0 })) },
      options: { interaction: { mode: "index", intersect: false }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } }, y: { beginAtZero: true } } } });

    const cs = Object.values(T.countries).sort((a, b) => b.share[names[0]] - a.share[names[0]]);
    document.getElementById("pe-reg").innerHTML = `<h3>Perú frente a la región</h3><p class="muted">Composición del interés de búsqueda por país (cada barra suma 100 %).</p><div class="chart tall"><canvas id="c-pe-reg"></canvas></div>`;
    draw("c-pe-reg", { type: "bar", data: { labels: cs.map((r) => r.name), datasets: names.map((n) => ({ label: n, data: cs.map((r) => r.share[n]), backgroundColor: COL[n], borderWidth: 0 })) },
      options: { indexAxis: "y", plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.raw} %` } } }, scales: { x: { stacked: true, max: 100, ticks: { callback: (v) => v + " %" } }, y: { stacked: true, grid: { display: false } } } } });
  }

  document.addEventListener("iar:data", () => {
    const D = I.D, T = D.trends;
    if (!T || !T.sets) {
      root.innerHTML = `<div class="sec-head"><p class="kicker"><b>09</b> Para usuarios peruanos</p><h2 id="t-peru">IA en Perú</h2></div><div class="callout warn">${ico("info")}<p>Google Trends no respondió en las actualizaciones recientes y aún no hay datos guardados. Se mostrarán en cuanto estén disponibles; no se estiman ni se inventan.</p></div>`;
      return;
    }
    const A = T.sets.A, depts = (A.peru_regions || []).map((r) => r.name).sort((a, b) => a.localeCompare(b, "es"));
    const rp = D.users && D.users.regional_players;
    root.innerHTML = `
      <div class="sec-head"><p class="kicker"><b>09</b> Para usuarios peruanos</p><h2 id="t-peru">IA en Perú</h2>
        <p class="lead">Qué herramientas de IA se buscan en el Perú y cómo cambia entre departamentos. Son señales de búsqueda en Google, no cifras de usuarios.</p></div>
      <div class="callout">${ico("info")}<p><b>Dos lecturas distintas.</b> La composición responde "dentro de este lugar, qué herramienta se busca más". La intensidad responde "en qué lugares se busca más una herramienta". No son lo mismo y no se mezclan.</p></div>
      <div class="pe-ctl"><label class="f">Departamento<select id="pe-dept"><option value="">Perú (nacional)</option>${depts.map((d) => `<option>${esc(d)}</option>`).join("")}</select></label>
        <div><span class="f">Herramientas comparadas</span><div class="seg" role="group" aria-label="Conjunto"><button type="button" data-set="A" aria-pressed="true">ChatGPT, Gemini, Claude, Copilot, DeepSeek</button>${T.sets.B ? '<button type="button" data-set="B" aria-pressed="false">ChatGPT, Grok, Perplexity, Meta AI, Kimi</button>' : ""}</div></div></div>
      <div class="grid g2 pe-grid"><div class="card" id="pe-comp"></div><div class="card" id="pe-int"></div></div>
      <details class="more"><summary>Más gráficos: evolución en el tiempo y comparación con la región</summary><div class="grid g2 pe-grid"><div class="card" id="pe-time"></div><div class="card" id="pe-reg"></div></div></details>
      <div class="callout warn">${ico("triangle-alert")}<p><b>Lo que no se puede saber.</b> Ninguna empresa publica suscriptores o usuarios por país ni por departamento. Las búsquedas muestran presencia y preferencia, no cantidad. "ChatGPT" se usa a menudo como nombre genérico, por lo que su peso está inflado, y Copilot casi no se busca por separado. Los dos conjuntos se calculan por separado y no se suman.${rp ? ` Iniciativas regionales: ${rp.map((p) => esc(p.name) + " (" + esc(p.where) + ")").join("; ")}.` : ""}</p></div>
      <div class="card pe-cov"><h3>Qué cubre IA Radar para Perú</h3><ul class="cov">
        <li><span class="tag ok">Disponible</span> Normativa de IA y de protección de datos personales, con enlaces a fuentes oficiales.</li>
        <li><span class="tag ok">Disponible</span> Interés de búsqueda por departamento y evolución en el tiempo.</li>
        <li><span class="tag warn">En construcción</span> Noticias y políticas nacionales de IA: aún no hay una fuente automática verificada.</li>
        <li><span class="tag warn">En construcción</span> Casos de uso en entidades públicas, iniciativas de universidades y empresas peruanas, y efectos en el empleo.</li></ul>
        <p class="muted">Lo que no se puede verificar con una fuente no se publica. Las secciones en construcción se irán añadiendo cuando exista una fuente confiable.</p></div>
      <p class="muted">Marco normativo peruano: <a href="responsable.html#regulacion" data-track="clic_normativa_peru">Ley N.º 31814 y su reglamento</a>.</p>`;
    root.addEventListener("change", (e) => { if (e.target.id === "pe-dept") { st.dept = e.target.value; I.track("peru_departamento"); I.journey.mark("peru"); paint(D); } });
    root.addEventListener("click", (e) => {
      const s = e.target.closest("[data-set]"), t = e.target.closest("[data-term]");
      if (s) { st.set = s.dataset.set; st.term = ""; root.querySelectorAll("[data-set]").forEach((b) => b.setAttribute("aria-pressed", b === s)); paint(D); }
      if (t) { st.term = t.dataset.term; paint(D); }
    });
    paint(D);
  }, { once: true });
})();
