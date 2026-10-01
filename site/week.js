/* Infografía semanal con narrativa de datos.
   Estructura: gancho -> capítulos (cada título es una conclusión) -> "¿y entonces qué?".
   Todo se calcula con los datos de los últimos 7 días (hoy y los 6 días anteriores). */
(function () {
  "use strict";
  const root = document.getElementById("week-root");
  if (!root) return;
  if (window.IAR) build(window.IAR); else document.addEventListener("iar:ready", () => build(window.IAR), { once: true });

  function build(I) {
    const { esc, ico, nf, C, draw, countUp, fmtPrice, fmtCtx, daysAgo, ageDays, signed, provName, provTag, tTitle, topicOf, TOPIC_NAMES, TOPIC_COLORS, TOPIC_ICONS, relLabel, newsIcon, tipAttr, versionPairs, isMajor, dayKey } = I;
    const models = I.models, items = (I.news && I.news.items) || [];
    const pct = (a, b) => (b ? Math.round(((a - b) / b) * 100) : null);
    const plural = (n, s, p) => nf.format(n) + " " + (n === 1 ? s : p);
    const short = (m) => m.name.replace(/^[^:]+: /, "");

    /* ---------- conjuntos de la semana ---------- */
    const wkM = models.filter((m) => daysAgo(m.created) < 7), pvM = models.filter((m) => { const d = daysAgo(m.created); return d >= 7 && d < 14; });
    const wkMaj = wkM.filter(isMajor), pvMaj = pvM.filter(isMajor);
    const wkN = items.filter((n) => ageDays(n.published) < 7);
    const start = new Date(); start.setDate(start.getDate() - 6);
    const fmtD = (d) => d.toLocaleDateString("es-PE", { day: "numeric", month: "long" });
    const range = fmtD(start) + " al " + fmtD(new Date());

    /* ---------- precios: pares nuevo vs. anterior ---------- */
    let pairs = versionPairs(models.filter(isMajor)).filter((p) => p.dIn != null && daysAgo(p.cur.created) < 14);
    let pairsWin = "las últimas 2 semanas";
    if (pairs.length < 4) { pairs = versionPairs(models.filter(isMajor)).filter((p) => p.dIn != null && daysAgo(p.cur.created) < 30); pairsWin = "el último mes"; }
    const cuts = pairs.filter((p) => p.dIn < 0), ups = pairs.filter((p) => p.dIn > 0), flat = pairs.length - cuts.length - ups.length;
    const bigCut = [...cuts].sort((a, b) => a.dIn - b.dIn)[0], bigUp = [...ups].sort((a, b) => b.dIn - a.dIn)[0];

    /* ---------- noticias: ritmo, temas, empresas ---------- */
    const keys = [], labels = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); keys.push(dayKey(d)); labels.push(d.toLocaleDateString("es-PE", { weekday: "short", day: "2-digit" })); }
    const newsDay = keys.map(() => 0), relDay = keys.map(() => 0);
    wkN.forEach((n) => { const i = keys.indexOf(dayKey(new Date(n.published))); if (i >= 0) newsDay[i]++; });
    wkM.forEach((m) => { const i = keys.indexOf(m.created); if (i >= 0) relDay[i]++; });
    const peak = newsDay.indexOf(Math.max(...newsDay));
    const peakLabel = new Date(keys[peak] + "T12:00:00").toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });

    const COMP = [["OpenAI", /openai|chatgpt|\bgpt-?\d|\bsora\b|codex/i, "#10a37f"], ["Google", /google|gemini|deepmind|gemma/i, "#4285f4"], ["Anthropic", /anthropic|claude/i, "#d97757"],
      ["Meta", /\bmeta\b|llama|zuckerberg/i, "#0866ff"], ["Microsoft", /microsoft|copilot|azure/i, "#00a4ef"], ["NVIDIA", /nvidia/i, "#76b900"], ["xAI", /\bxai\b|grok/i, "#e5e7eb"],
      ["Amazon", /amazon|\baws\b|alexa/i, "#ff9900"], ["Apple", /\bapple\b|siri|iphone/i, "#a3a3a3"], ["Mistral", /mistral/i, "#fa520f"], ["DeepSeek", /deepseek/i, "#4d6bfe"], ["Alibaba/Qwen", /alibaba|qwen/i, "#615ced"]];
    const ment = COMP.map(([n, rx, c]) => [n, wkN.filter((x) => rx.test(x.title + " " + (x.summary || ""))).length, c]).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 7);
    const totalMent = ment.reduce((s, x) => s + x[1], 0);

    const topicCount = {};
    wkN.forEach((n) => { const t = topicOf(n); topicCount[t] = (topicCount[t] || 0) + 1; });
    const topics = Object.keys(topicCount).sort((a, b) => topicCount[b] - topicCount[a]);
    const topTopic = topics[0];

    // Noticias más relevantes: laboratorios, temas de alto impacto, empresas mencionadas y recencia.
    const TW = { modelos: 3, seguridad: 3, negocios: 2, productos: 2, infra: 2, investigacion: 2, general: 1 };
    const topComp = ment.length ? COMP.find((c) => c[0] === ment[0][0]) : null;
    const score = (n) => (n.kind === "lab" ? 3 : 1) + (TW[topicOf(n)] || 1) + (topComp && topComp[1].test(n.title) ? 1 : 0) + (ageDays(n.published) < 2 ? 2 : 0) + (COMP.filter((c) => c[1].test(n.title)).length > 1 ? 1 : 0);
    const stories = [...wkN].sort((a, b) => score(b) - score(a) || b.published.localeCompare(a.published)).slice(0, 3);
    const regN = wkN.filter((n) => topicOf(n) === "seguridad").length;

    /* ---------- lanzamientos clave ---------- */
    const keyLaunch = [...wkMaj].sort((a, b) => (b.price_out || 0) - (a.price_out || 0) || b.created.localeCompare(a.created));
    const seen = new Set(), launches = [];
    keyLaunch.forEach((m) => { const p = m.provider; if (launches.length < 4 && !seen.has(p)) { seen.add(p); launches.push(m); } });

    /* ---------- gancho ---------- */
    const dRel = pct(wkMaj.length, pvMaj.length);
    let hook;
    const weekCut = [...cuts].filter((p) => daysAgo(p.cur.created) < 7).sort((a, b) => a.dIn - b.dIn)[0];  // el gancho solo usa hechos de esta semana
    if (weekCut && weekCut.dIn <= -30) hook = `${short(weekCut.cur)} bajó ${Math.abs(weekCut.dIn)}% su precio de entrada`;
    else if (dRel != null && Math.abs(dRel) >= 30) hook = dRel > 0 ? `Semana intensa: los lanzamientos de los laboratorios principales subieron ${dRel}% frente a la semana anterior` : `Semana tranquila: los lanzamientos de los laboratorios principales bajaron ${Math.abs(dRel)}% frente a la semana anterior`;
    else if (ment.length) hook = `${ment[0][0]} dominó la conversación de la semana`;
    else hook = "Una semana de movimiento en el mundo de la IA";
    const kicker = weekCut && weekCut.dIn <= -30 ? "El dato de la semana" : "La historia de la semana";

    const kpis = [
      { ic: "rocket", to: wkMaj.length, l: "lanzamientos de laboratorios principales", d: dRel, c: C.cyan, tip: "Lanzamientos de la semana\nModelos únicos de laboratorios principales con fecha de lanzamiento en los últimos 7 días, frente a los 7 días anteriores." },
      { ic: "newspaper", to: wkN.length, l: "noticias de IA publicadas", d: null, c: C.violet, tip: "Noticias de la semana\nTitulares de laboratorios y prensa en los últimos 7 días. No se compara con la semana anterior porque la prensa publica pocos titulares históricos y daría una comparación engañosa." },
      { ic: "coins", to: cuts.length, l: `versiones que bajaron de precio (de ${pairs.length})`, d: null, c: C.green, tip: `Precios\nVersiones nuevas de laboratorios principales que cuestan menos de entrada que su versión anterior, entre los lanzados en ${pairsWin}.` },
      { ic: "shield-check", to: regN, l: "noticias de seguridad y regulación", d: null, c: C.pink, tip: "Regulación y ética\nNoticias de la semana clasificadas en el tema Seguridad y regulación." },
    ];

    /* ---------- conclusiones ("¿y entonces qué?") ---------- */
    const take = [];
    if (bigCut) take.push({ ic: "coins", c: C.green, t: "Revisa tu costo de API", p: `${short(bigCut.cur)} (${provName(bigCut.cur.provider)}) cuesta ${fmtPrice(bigCut.cur.price_in)} de entrada, ${Math.abs(bigCut.dIn)}% menos que ${short(bigCut.prev)}. Si usas esa familia, compara antes de renovar.` });
    else if (bigUp) take.push({ ic: "trending-up", c: C.amber, t: "Vigila los aumentos", p: `${short(bigUp.cur)} subió ${bigUp.dIn}% frente a ${short(bigUp.prev)}. Revisa tu presupuesto si lo usas.` });
    if (dRel != null) take.push({ ic: "chart-line", c: C.cyan, t: dRel >= 0 ? "El ritmo se acelera" : "El ritmo se enfría", p: dRel >= 0 ? `Hubo ${signed(dRel)} lanzamientos que la semana anterior: conviene reevaluar cada pocas semanas si tu modelo actual sigue siendo el mejor para su precio.` : `Hubo ${Math.abs(dRel)}% menos lanzamientos que la semana anterior: es buen momento para consolidar y probar lo que ya salió.` });
    take.push({ ic: "shield-check", c: C.pink, t: regN ? "Mantente al día con la regulación" : "Sin novedades regulatorias fuertes", p: regN ? `Se publicaron ${plural(regN, "noticia", "noticias")} de seguridad y regulación. Revisa la guía de normatividad y el verificador de riesgo antes de desplegar IA en tu organización.` : "No hubo noticias de regulación destacadas, pero la guía de normatividad resume las reglas vigentes." });

    /* ---------- texto copiable ---------- */
    const summary = [`Lo más impactante de la semana (${range})`, hook + ".",
      `${plural(wkMaj.length, "lanzamiento", "lanzamientos")} de laboratorios principales${dRel != null ? " (" + signed(dRel) + " vs. semana anterior)" : ""}; ${plural(wkN.length, "noticia", "noticias")}.`,
      cuts.length ? `${cuts.length} de ${pairs.length} versiones nuevas bajaron su precio de entrada.` : "", ment.length ? `Más mencionado: ${ment[0][0]} (${ment[0][1]} titulares).` : "",
      ...stories.map((n, i) => `${i + 1}. ${tTitle(n)} (${n.source})`), "Fuente: IA Radar"].filter(Boolean).join("\n");

    /* ---------- HTML ---------- */
    const delta = (d) => (d == null ? "" : `<span class="wk-d ${d >= 0 ? "up" : "down"}">${ico(d >= 0 ? "trending-up" : "trending-down")}${signed(d)} vs. semana anterior</span>`);
    const chapter = (n, c, title, lead, inner) => `<li class="wk-ch rv" style="--a:${c}"><span class="wk-n" aria-hidden="true">${n}</span>
      <div class="wk-card fx" style="--a:${c}"><h3>${title}</h3><p class="wk-lead">${lead}</p>${inner}</div></li>`;

    const cap2Title = `El pico de la semana fue el ${peakLabel}`;
    const cap2Lead = `Ese día se publicaron <b>${plural(newsDay[peak], "noticia", "noticias")}</b>${relDay[peak] ? ` y se lanzaron ${plural(relDay[peak], "modelo", "modelos")}` : ""}. Las barras son noticias por día; la línea, modelos lanzados.`;
    const cap3Title = pairs.length ? (cuts.length >= ups.length ? `${cuts.length} de ${pairs.length} versiones nuevas son más baratas de entrada que su versión anterior` : `Los precios suben: ${ups.length} de ${pairs.length} versiones nuevas cuestan más de entrada`) : "Aún no hay versiones comparables con su versión anterior";
    const cap3Lead = pairs.length ? `${bigCut ? `El mayor recorte es de <b class="up">${bigCut.dIn}%</b> en ${esc(short(bigCut.cur))} (${esc(fmtPrice(bigCut.prev.price_in))} → ${esc(fmtPrice(bigCut.cur.price_in))} por millón de tokens).` : ""} ${bigUp ? `El mayor aumento es de <b class="down">+${bigUp.dIn}%</b> en ${esc(short(bigUp.cur))}.` : ""} Se comparan los modelos lanzados en ${pairsWin}.` : "Se necesitan al menos dos versiones de una misma familia para comparar.";
    const cap4Title = ment.length ? `${ment[0][0]} aparece en ${Math.round((ment[0][1] / Math.max(1, totalMent)) * 100)}% de las menciones de empresas` : "Sin menciones suficientes esta semana";
    const cap4Lead = ment.length ? `${ment[0][0]} fue citado en <b>${plural(ment[0][1], "titular", "titulares")}</b>${ment[1] ? `, seguido de ${ment[1][0]} (${ment[1][1]})` : ""}. Se cuentan titulares y resúmenes que nombran a la empresa o a sus productos.` : "";
    const cap5Title = topTopic ? `${TOPIC_NAMES[topTopic]} fue el tema que más se repitió (${Math.round((topicCount[topTopic] / wkN.length) * 100)}% de las noticias)` : "Sin noticias esta semana";
    const cap5Lead = "Las tres noticias con mayor relevancia según el criterio de abajo:";

    const storyCards = stories.map((n, i) => { const tp = topicOf(n); return `<a class="wk-story fx" style="--a:${TOPIC_COLORS[tp]}" href="${esc(n.link)}" target="_blank" rel="noopener noreferrer"${tipAttr("Por qué aparece aquí\n" + [n.kind === "lab" ? "Viene de un laboratorio" : "Viene de prensa especializada", "Tema: " + TOPIC_NAMES[tp], ageDays(n.published) < 2 ? "Es reciente (últimas 48 horas)" : "", "Título original: " + n.title].filter(Boolean).join("\n"))}>
      <span class="wk-rank">${i + 1}</span><span class="wk-src"><span class="provtag">${newsIcon(n)}<span>${esc(n.source)}</span></span><em>${esc(relLabel(n.published)[1])}</em></span>
      <b>${esc(tTitle(n))}</b><span class="chip tp" style="color:${TOPIC_COLORS[tp]}">${ico(TOPIC_ICONS[tp])}${esc(TOPIC_NAMES[tp])}</span></a>`; }).join("");

    const launchCards = launches.map((m) => `<div class="wk-launch"${tipAttr(m.name + "\nLanzado el " + m.created + "\nEntrada " + fmtPrice(m.price_in) + " · salida " + fmtPrice(m.price_out) + " por millón de tokens\nContexto " + fmtCtx(m.context))}>
      ${provTag(m.provider)}<b>${esc(short(m))}</b><span>${esc(fmtPrice(m.price_in))} entrada · ${esc(fmtCtx(m.context))} contexto</span></div>`).join("");

    root.innerHTML = `
      <div class="wk">
        <div class="wk-top">
          <div><p class="wk-kick">${ico("calendar-days")} Infografía semanal · ${esc(range)}</p>
            <h2 class="wk-title">Lo más <span class="neon">impactante</span> de la semana</h2></div>
          <button class="pill" id="wk-copy" type="button">${ico("copy")}<span>Copiar resumen</span></button>
        </div>
        <div class="wk-hook fx" style="--a:#8b5cf6">
          <p class="wk-k">${esc(kicker)}</p>
          <p class="wk-big">${esc(hook)}</p>
          <div class="wk-kpis">${kpis.map((k) => `<div class="wk-kpi"${tipAttr(k.tip)} style="--a:${k.c}"><span class="wk-ic">${ico(k.ic)}</span><b data-to="${k.to}">0</b><span class="wk-l">${esc(k.l)}</span>${delta(k.d)}</div>`).join("")}</div>
        </div>
        <ol class="wk-chapters">
          ${chapter("01", C.cyan, esc(cap2Title), cap2Lead, `<div class="chart wk-chart"><canvas id="c-w-days"></canvas></div>${launches.length ? `<h4 class="wk-h4">${ico("rocket")} Lanzamientos clave de la semana</h4><div class="wk-launches">${launchCards}</div>` : ""}`)}
          ${chapter("02", C.green, esc(cap3Title), cap3Lead, pairs.length ? `<div class="chart wk-chart tall"><canvas id="c-w-price"></canvas></div>${flat ? `<p class="wk-method">${ico("info")}<span>${plural(flat, "versión mantiene", "versiones mantienen")} el mismo precio de entrada y no aparece${flat === 1 ? "" : "n"} en la gráfica.</span></p>` : ""}` : "")}
          ${ment.length ? chapter("03", C.violet, esc(cap4Title), cap4Lead, `<div class="chart wk-chart"><canvas id="c-w-ment"></canvas></div>`) : ""}
          ${wkN.length ? chapter(ment.length ? "04" : "03", C.pink, esc(cap5Title), cap5Lead, `<div class="wk-split"><div class="chart wk-chart sm"><canvas id="c-w-topic"></canvas></div><div class="wk-stories">${storyCards}</div></div>
            <p class="wk-method">${ico("info")}<span>Criterio de relevancia: laboratorio frente a prensa, tema de mayor impacto (modelos, seguridad), mención de la empresa más citada y recencia.</span></p>`) : ""}
          <li class="wk-ch rv wk-end" style="--a:${C.amber}"><span class="wk-n" aria-hidden="true">${ico("lightbulb")}</span>
            <div class="wk-card fx" style="--a:${C.amber}"><h3>¿Y entonces qué?</h3><p class="wk-lead">Lo que conviene hacer con lo que pasó esta semana:</p>
              <div class="wk-take">${take.map((t) => `<div class="wk-t" style="--a:${t.c}"><span class="wk-ic">${ico(t.ic)}</span><b>${esc(t.t)}</b><p>${esc(t.p)}</p></div>`).join("")}</div>
              <a class="cta" href="#guia-norma">Ver la guía de normatividad ${ico("arrow-right")}</a></div></li>
        </ol>
        <p class="wk-foot">${ico("info")}<span>Datos: OpenRouter (modelos y precios), Hugging Face y 13 fuentes de noticias. Semana = hoy y los 6 días anteriores. Los precios son por millón de tokens. Las noticias de la semana previa no se comparan porque la prensa publica pocos titulares históricos.</span></p>
      </div>`;

    countUp();

    /* ---------- gráficas con foco en lo importante ---------- */
    const callout = (idx, text, color) => ({ id: "callout", afterDatasetsDraw(chart) {
      const meta = chart.getDatasetMeta(0), el = meta.data[idx]; if (!el) return;
      const ctx = chart.ctx; ctx.save(); ctx.font = '700 12px "Inter", sans-serif';
      const w = ctx.measureText(text).width + 18, x = Math.min(Math.max(el.x, chart.chartArea.left + w / 2), chart.chartArea.right - w / 2), y = Math.max(el.y - 30, chart.chartArea.top);
      ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 12, w, 24, 12); ctx.fill();
      ctx.fillStyle = "#06101f"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, x, y); ctx.restore();
    } });
    draw("c-w-days", { type: "bar", data: { labels, datasets: [
      { type: "bar", label: "Noticias", data: newsDay, backgroundColor: newsDay.map((_, i) => (i === peak ? C.cyan : C.cyan + "40")), borderRadius: 8, order: 2 },
      { type: "line", label: "Modelos lanzados", data: relDay, borderColor: C.amber, backgroundColor: C.amber, borderWidth: 3, cubicInterpolationMode: "monotone", pointRadius: 5, pointHoverRadius: 8, yAxisID: "y1", order: 1 }] },
      options: { interaction: { mode: "index", intersect: false }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: "Noticias" } }, y1: { position: "right", beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { precision: 0 }, title: { display: true, text: "Modelos" } } } },
      plugins: [callout(peak, "Pico: " + newsDay[peak], C.cyan)] });

    if (cuts.length + ups.length) {
      const top = pairs.filter((p) => p.dIn !== 0).sort((a, b) => Math.abs(b.dIn) - Math.abs(a.dIn)).slice(0, 9).sort((a, b) => a.dIn - b.dIn);
      const big = top.reduce((m, p, i) => (Math.abs(p.dIn) > Math.abs(top[m].dIn) ? i : m), 0);
      draw("c-w-price", { type: "bar", data: { labels: top.map((p) => short(p.cur)), datasets: [{ data: top.map((p) => p.dIn), borderRadius: 8,
        backgroundColor: top.map((p, i) => (i === big ? (p.dIn < 0 ? C.green : C.amber) : (p.dIn < 0 ? C.green + "55" : C.amber + "55"))) }] },
        options: { indexAxis: "y", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => { const p = top[c.dataIndex]; return `${fmtPrice(p.prev.price_in)} → ${fmtPrice(p.cur.price_in)} (${signed(p.dIn)})`; } } } },
          scales: { x: { title: { display: true, text: "Cambio del precio de entrada frente a la versión anterior (%)" }, ticks: { callback: (v) => v + "%" } }, y: { grid: { display: false }, ticks: { autoSkip: false } } } } });
    }
    if (ment.length) draw("c-w-ment", { type: "bar", data: { labels: ment.map((x) => x[0]), datasets: [{ data: ment.map((x) => x[1]), borderRadius: 8, backgroundColor: ment.map((x, i) => (i === 0 ? x[2] : x[2] + "55")) }] },
      options: { indexAxis: "y", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => nf.format(c.raw) + " titulares" } } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { grid: { display: false }, ticks: { autoSkip: false } } } } });
    if (wkN.length) draw("c-w-topic", { type: "doughnut", data: { labels: topics.map((t) => TOPIC_NAMES[t]), datasets: [{ data: topics.map((t) => topicCount[t]), borderWidth: 0, backgroundColor: topics.map((t, i) => (i === 0 ? TOPIC_COLORS[t] : TOPIC_COLORS[t] + "77")) }] },
      options: { cutout: "60%", plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } } } });

    document.getElementById("wk-copy").addEventListener("click", async (e) => {
      const b = e.currentTarget, lab = b.querySelector("span");
      try { await navigator.clipboard.writeText(summary); lab.textContent = "¡Copiado!"; } catch (err) { lab.textContent = "No se pudo copiar"; }
      setTimeout(() => { lab.textContent = "Copiar resumen"; }, 2200);
    });
    // los capítulos aparecen al hacer scroll (la sección ya fue renderizada tras el observador global)
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.08 });
      root.querySelectorAll(".rv").forEach((x) => io.observe(x));
    } else root.querySelectorAll(".rv").forEach((x) => x.classList.add("in"));
  }
})();
