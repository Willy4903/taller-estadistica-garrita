/* 04 Qué está usando la gente: usuarios, tráfico, búsquedas, tokens, uso de API y benchmarks. Cada medida va separada y nunca se mezclan en un mismo ranking. */
(function () {
  "use strict";
  const root = document.getElementById("uso-root");
  if (!root) return;
  const I = window.IAR, { esc, ico, nf, fmtDate, draw, chartMeta, css, provName, PROV, norm } = I;
  const st = { tab: "usuarios" };
  const TABS = [["usuarios", "Usuarios"], ["trafico", "Tráfico"], ["busquedas", "Búsquedas"], ["tokens", "Tokens"], ["api", "Uso de API"], ["bench", "Benchmarks"]];
  const color = (slug) => (PROV[norm(slug)] && PROV[norm(slug)][2]) || css("--accent");
  const SERIES = { ChatGPT: "#10a37f", Gemini: "#4285f4", Claude: "#d97757", Copilot: "#00a4ef", DeepSeek: "#4d6bfe", Grok: "#555", Perplexity: "#22b8cd", "Meta AI": "#0866ff", Kimi: "#8a6cff" };
  const ageM = (ym) => { const [y, m] = ym.split("-").map(Number), n = new Date(); return (n.getFullYear() - y) * 12 + n.getMonth() + 1 - m; };
  const mil = (v) => (v >= 1000 ? (v / 1000).toLocaleString("es-PE", { maximumFractionDigits: 1 }) + " mil millones" : nf.format(v) + " millones");
  const nodata = (txt) => `<div class="callout warn">${ico("info")}<p>${txt}</p></div>`;
  const bar = (labels, data, colors, fmt, horizontal = true) => ({ type: "bar", data: { labels, datasets: [{ data, backgroundColor: colors, borderRadius: 6 }] },
    options: { indexAxis: horizontal ? "y" : "x", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => fmt(c.raw) } } }, scales: { [horizontal ? "x" : "y"]: { beginAtZero: true, ticks: { callback: (v) => fmt(v) } }, [horizontal ? "y" : "x"]: { grid: { display: false } } } } });

  const views = {
    usuarios(D) {
      const u = D.users;
      if (!u || !u.items || !u.items.length) return { html: nodata("No hay cifras de usuarios cargadas."), meta: null };
      const s = [...u.items].sort((a, b) => b.value - a.value);
      const asof = s.map((x) => x.asof).sort();
      return { q: "¿Cuántas personas usan cada IA, según las propias empresas?", html: `<div class="chart"><canvas id="c-uso"></canvas></div>
        <ul class="u-list">${s.map((x) => `<li><b>${esc(x.name)}</b> ${mil(x.value)} <span class="tag">${x.metric === "weekly" ? "semanales" : "mensuales"}</span> <span class="muted">${esc(x.what)} · cifra de ${esc(x.asof)} · ${esc(x.source)}</span>${ageM(x.asof) > 6 ? `<span class="tag warn">hace ${ageM(x.asof)} meses</span>` : ""}</li>`).join("")}</ul>
        ${u.undisclosed && u.undisclosed.length ? `<p class="muted"><b>Sin cifra oficial publicada:</b> ${u.undisclosed.map((x) => esc(x.name)).join(", ")}.</p>` : ""}`,
        draw: () => draw("c-uso", bar(s.map((x) => x.name), s.map((x) => x.value), s.map((x) => (x.metric === "weekly" ? css("--accent") : css("--muted"))), (v) => nf.format(v) + " M")),
        meta: { mide: "Usuarios activos que cada empresa reporta en sus resultados o eventos. Azul: activos semanales; gris: activos mensuales.", nomide: "No son suscriptores de pago, no son auditados y no se pueden comparar de forma estricta porque cada empresa define 'usuario activo' a su manera. No existen cifras oficiales por país.", fuente: "Informes y presentaciones de cada empresa", url: "", fecha: `cifras de ${asof[0]} a ${asof[asof.length - 1]}` } };
    },
    trafico() {
      return { q: "¿Cuánta gente visita los sitios y apps de cada IA?", html: nodata("IA Radar no muestra un ranking de tráfico. Las estimaciones fiables (visitas web y descargas) son de servicios de pago y no se pueden reproducir con fuentes abiertas, así que se prefiere no mostrar una cifra dudosa. Consulta <a href='https://www.similarweb.com/' target='_blank' rel='noopener'>Similarweb</a> o <a href='https://sensortower.com/' target='_blank' rel='noopener'>Sensor Tower</a> y revisa su metodología."),
        meta: { mide: "Visitas a sitios web y descargas de apps (según la fuente que elijas).", nomide: "No mide cuántas personas distintas usan una IA ni cuánto la usan.", fuente: "Similarweb y Sensor Tower (de pago)", url: "https://www.similarweb.com/", fecha: "sin dato en IA Radar" } };
    },
    busquedas(D) {
      const T = D.trends && D.trends.sets && D.trends.sets.A;
      if (!T) return { q: "¿Qué IA se busca más en cada país?", html: nodata("Google Trends no respondió en la última actualización y no hay datos previos."), meta: null };
      const rows = Object.values(T.countries).sort((a, b) => b.share.ChatGPT - a.share.ChatGPT);
      const names = Object.keys(T.terms);
      return { q: "¿Cómo se reparte el interés de búsqueda entre cinco asistentes en cada país?", html: `<div class="chart tall"><canvas id="c-uso"></canvas></div>`,
        draw: () => draw("c-uso", { type: "bar", data: { labels: rows.map((r) => r.name), datasets: names.map((n) => ({ label: n, data: rows.map((r) => r.share[n]), backgroundColor: SERIES[n], borderWidth: 0 })) },
          options: { indexAxis: "y", plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.raw}%` } } }, scales: { x: { stacked: true, max: 100, ticks: { callback: (v) => v + "%" } }, y: { stacked: true, grid: { display: false } } } } }),
        meta: { mide: "Composición del interés de búsqueda en Google entre estos cinco términos dentro de cada país (suma 100 % por país).", nomide: "No mide usuarios, uso real ni suscriptores. 'ChatGPT' funciona como nombre genérico y Copilot casi no se busca por separado. No compara la intensidad total entre países.", fuente: "Google Trends", url: "https://trends.google.com/trends/", fecha: `${T.window || "últimos 3 meses"}, actualizado ${(D.trends.updated_at || "").slice(0, 10)}` } };
    },
    tokens(D) {
      const u = D.usage && D.usage.items;
      if (!u || !u.length) return { q: "¿Qué modelos procesan más tokens en OpenRouter?", html: nodata("OpenRouter no respondió con datos de actividad en las últimas actualizaciones. Cuando haya datos aparecerán aquí; mientras tanto no se muestra ninguna cifra."), meta: { mide: "Tokens procesados por modelo en la plataforma OpenRouter durante 7 días.", nomide: "No mide el uso total del mercado ni usuarios.", fuente: "OpenRouter Rankings", url: "https://openrouter.ai/rankings", fecha: "sin dato reciente" } };
      return { q: "¿Qué modelos procesan más tokens dentro de OpenRouter?", html: `<div class="chart tall"><canvas id="c-uso"></canvas></div>`,
        draw: () => draw("c-uso", bar(u.map((x) => x.model), u.map((x) => x.value), u.map((x) => color(x.provider)), (v) => nf.format(v) + " mil M")),
        meta: { mide: "Tokens (entrada y salida) procesados por cada modelo entre quienes usan OpenRouter en los últimos 7 días, en miles de millones.", nomide: "No mide el uso total del mercado, ni usuarios, ni el uso desde las apps oficiales de cada laboratorio. Los modelos baratos o gratuitos suelen verse inflados.", fuente: "OpenRouter Rankings", url: "https://openrouter.ai/rankings", fecha: u[0].published_at || (D.usage.updated_at || "").slice(0, 10) } };
    },
    api(D) {
      const u = D.usage && D.usage.items;
      if (!u || !u.length) return { q: "¿Qué proveedores concentran el uso de API en OpenRouter?", html: nodata("Sin datos de actividad de OpenRouter por ahora."), meta: null };
      const agg = {};
      u.forEach((x) => { agg[x.provider] = (agg[x.provider] || 0) + x.value; });
      const tot = Object.values(agg).reduce((a, b) => a + b, 0), rows = Object.entries(agg).sort((a, b) => b[1] - a[1]);
      return { q: "¿Qué proveedores concentran el uso de API dentro de OpenRouter?", html: `<div class="chart"><canvas id="c-uso"></canvas></div>`,
        draw: () => draw("c-uso", bar(rows.map((r) => provName(r[0])), rows.map((r) => Math.round((r[1] / tot) * 1000) / 10), rows.map((r) => color(r[0])), (v) => v + " %")),
        meta: { mide: "Parte de los tokens del top 15 de modelos que corresponde a cada proveedor, entre usuarios de API de OpenRouter.", nomide: "No mide la cuota de mercado global ni las suscripciones de ChatGPT, Claude o Gemini; solo el uso por API a través de un agregador.", fuente: "OpenRouter Rankings", url: "https://openrouter.ai/rankings", fecha: u[0].published_at || "" } };
    },
    bench(D) {
      const R = (D.frontier && D.frontier.rankings) || [], A = D.arena && D.arena.rows;
      return { q: "¿Qué modelos rinden más en pruebas independientes? Cada prueba mide algo distinto.", html: `<div class="grid g2">${R.map((r, i) => `<div><h4>${esc(r.title)}</h4><div class="chart sm"><canvas id="c-b${i}"></canvas></div></div>`).join("")}${A ? `<div><h4>LMArena: preferencia de usuarios</h4><div class="chart sm"><canvas id="c-ba"></canvas></div></div>` : ""}</div>`,
        draw: () => {
          R.forEach((r, i) => draw("c-b" + i, bar(r.items.map((x) => x.name), r.items.map((x) => x.v), r.items.map((x) => color(x.prov)), (v) => String(v))));
          if (A) draw("c-ba", bar(A.slice(0, 8).map((x) => x.name), A.slice(0, 8).map((x) => x.rating), A.slice(0, 8).map((x) => color(x.org)), (v) => String(v)));
        },
        meta: { mide: "Artificial Analysis y BenchLM: índices compuestos de capacidad. LMArena: puntaje Elo de preferencia humana en comparaciones a ciegas.", nomide: "Ninguno mide tu caso de uso. Las escalas no son comparables entre sí, por eso van en gráficos separados. Una diferencia de pocos puntos suele no ser significativa.", fuente: "Artificial Analysis, BenchLM, LMArena", url: "https://artificialanalysis.ai/", fecha: (D.frontier && D.frontier.asof) || "" } };
    },
  };

  function paint(D) {
    const v = views[st.tab](D);
    document.getElementById("uso-body").innerHTML = `<div class="card"><h3>${esc(TABS.find((t) => t[0] === st.tab)[1])}</h3>${v.q ? `<p class="muted">${esc(v.q)}</p>` : ""}${v.html}${v.meta ? chartMeta(v.meta) : ""}</div>`;
    if (v.draw) v.draw();
  }
  document.addEventListener("iar:data", () => {
    const D = I.D;
    root.innerHTML = `
      <div class="sec-head"><p class="kicker"><b>04</b> Qué está usando la gente</p><h2 id="t-uso">Seis medidas, seis preguntas distintas</h2>
        <p class="lead">Usuarios, tráfico, búsquedas, tokens, uso de API y benchmarks miden cosas diferentes. Aquí van separados a propósito: nunca se mezclan en un mismo ranking.</p></div>
      <div class="seg tabs" role="tablist" aria-label="Medida">${TABS.map(([k, l]) => `<button type="button" role="tab" data-t="${k}" aria-pressed="${k === st.tab}">${esc(l)}</button>`).join("")}</div>
      <div id="uso-body" aria-live="polite"></div>`;
    root.querySelector(".tabs").addEventListener("click", (e) => {
      const b = e.target.closest("[data-t]"); if (!b) return;
      st.tab = b.dataset.t; root.querySelectorAll("[data-t]").forEach((x) => x.setAttribute("aria-pressed", x.dataset.t === st.tab));
      I.track("uso_" + st.tab); I.journey.mark("uso"); paint(D);
    });
    paint(D);
  }, { once: true });
})();
