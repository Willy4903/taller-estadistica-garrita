/* 01 Hoy en IA: 3 a 5 acontecimientos que importan, cada uno con qué pasó, por qué importa, a quién afecta, fuente y fecha. */
(function () {
  "use strict";
  const root = document.getElementById("hoy-root");
  if (!root) return;
  const I = window.IAR, { esc, ico, fmtDate, track, journey } = I;

  const CATS = {
    Modelos: /\bmodel(s|o|os)?\b|\bllms?\b|gpt-?\d|claude|gemini|grok|llama|qwen|deepseek|mistral|kimi/,
    Agentes: /\bagent|agente|computer use|\bmcp\b|autonom/,
    ChatGPT: /chatgpt|openai|gpt-?\d/, Claude: /claude|anthropic/, Gemini: /gemini|deepmind|google ai/, Grok: /grok|\bxai\b|x\.ai/, DeepSeek: /deepseek/,
    "Open source": /open[- ]source|open[- ]weight|hugging ?face|llama|qwen|mistral|abiert/,
    "Código": /\bcode\b|coding|codex|developer|programa|github|cursor|swe-?bench|c[oó]digo/,
    Imagen: /\bimage|imagen|diffusion|dall|midjourney|flux|nano banana/, Video: /\bvideo|sora|\bveo\b|runway|kling/, Voz: /\bvoice|\bvoz\b|speech|audio|whisper|\btts\b/,
    APIs: /\bapi\b|\bsdk\b|openrouter|developer platform/, Empresa: /enterprise|empresa|business|funding|raises|valuation|revenue|partnership|acquir|\bipo\b|negocio/,
    Precios: /pric|precio|cheaper|cost|\$\d/,
  };
  const WHY = {
    modelos: ["Un modelo nuevo o actualizado cambia lo que se puede hacer y cuánto cuesta. Conviene comparar versión, precio y contexto antes de migrar.", "Equipos que usan IA en sus productos, desarrolladores y quien elige herramienta."],
    productos: ["Las funciones nuevas llegan primero a ciertos planes o países y cambian cómo se trabaja con herramientas que ya se usan.", "Usuarios de la herramienta y equipos que la despliegan."],
    negocios: ["El dinero y las alianzas definen quién puede entrenar y ofrecer modelos a gran escala.", "Empresas proveedoras, clientes corporativos e inversionistas."],
    seguridad: ["Las reglas, los litigios y las prácticas de seguridad fijan qué se puede hacer con IA y con qué responsabilidades.", "Organizaciones que usan o ofrecen IA y las personas cuyos datos se procesan."],
    infra: ["Chips, energía y centros de datos limitan el ritmo y el costo de la IA.", "Proveedores en la nube y compradores de cómputo."],
    investigacion: ["La investigación anticipa capacidades que llegan a los productos meses después.", "Equipos técnicos, investigadores y quien planifica adopción."],
  };
  const TOPIC_NAME = { modelos: "Modelos", productos: "Productos", negocios: "Empresa", seguridad: "Seguridad y regulación", infra: "Infraestructura", investigacion: "Investigación" };
  const TW = { modelos: 3, seguridad: 2.4, negocios: 2, productos: 2, infra: 1.2, investigacion: 1.2 };
  const BOOST = /launch|release|introduc|announc|unveil|lanz|presenta|new model|gpt|claude|gemini|grok|llama|deepseek/i;
  const NEG = /customer|case study|stories|story|helps? |saves?|\d+x\b|faster with|completes/i;
  const PERIODS = { "24H": 1, "7D": 7, "30D": 30 };
  const st = { period: "7D", cat: "Todas" };

  const words = (t) => new Set(String(t).toLowerCase().replace(/[^a-z0-9.áéíóúñ ]/g, " ").split(/\s+/).filter((w) => w.length > 3 || /\d/.test(w)));
  const overlap = (a, b) => { const A = words(a), B = words(b); let n = 0; A.forEach((w) => { if (B.has(w)) n++; }); return n >= 3; };
  const text = (n) => (n.title + " " + (n.summary || "") + " " + (n.title_es || "") + " " + (n.summary_es || "")).toLowerCase();
  const catsOf = (t) => Object.keys(CATS).filter((c) => CATS[c].test(t));
  const ageDays = (iso) => (Date.now() - new Date(iso)) / 864e5;

  function pick(D) {
    const days = PERIODS[st.period];
    const okCat = (cats) => st.cat === "Todas" || cats.includes(st.cat);
    const pinned = ((D.frontier && D.frontier.hoy) || []).filter((p) => ageDays(p.date + "T12:00:00") <= days && okCat(p.cats)).map((p) => ({
      title: p.title, what: p.what, why: p.why, affects: p.affects, date: p.date, source: p.source, url: p.url, level: p.level, topic: "Modelos", editorial: true, score: 99 + new Date(p.date).getTime() / 1e13 }));
    const pool = ((D.news && D.news.items) || []).filter((n) => ageDays(n.published) <= days).map((n) => {
      const t = text(n), cats = catsOf(t);
      const topic = n.topic && WHY[n.topic] ? n.topic : "modelos";
      const score = (n.kind === "lab" ? 3 : 1.5) + (TW[n.topic] || 1) + Math.max(0, 3 - ageDays(n.published) / 10) + (BOOST.test(n.title) ? 2 : 0) + Math.min(1, (n.summary || "").length / 200);
      return { n, cats, topic, score };
    }).filter((x) => okCat(x.cats) && x.score >= 6.5 && (x.n.summary_es || x.n.summary || "").length > 60 && !NEG.test(x.n.title) && !pinned.some((p) => overlap(p.title, x.n.title))).sort((a, b) => b.score - a.score);
    const bySrc = {}, auto = [];
    for (const x of pool) {
      bySrc[x.n.source] = (bySrc[x.n.source] || 0) + 1;
      if (bySrc[x.n.source] > 2) continue;
      if (pinned.length + auto.length >= 5) break;
      const w = WHY[x.topic] || WHY.modelos;
      auto.push({ title: x.n.title_es || x.n.title, what: x.n.summary_es || x.n.summary || "", why: w[0], affects: w[1], date: x.n.published.slice(0, 10), source: x.n.source, url: x.n.link, level: x.n.kind === "lab" ? 1 : 4, topic: TOPIC_NAME[x.topic], editorial: false });
    }
    const rest = pool.map((x) => x.n).filter((n) => !auto.some((a) => a.url === n.link)).slice(0, 12);
    return { items: pinned.concat(auto).slice(0, 5), rest };
  }
  const LEVEL = { 1: "Nivel 1 · Fuente oficial", 2: "Nivel 2 · Paper", 3: "Nivel 3 · Benchmark independiente", 4: "Nivel 4 · Prensa especializada", 5: "Nivel 5 · Señal inicial" };

  function paint(D) {
    const { items, rest } = pick(D);
    document.getElementById("hoy-list").innerHTML = items.length ? items.map((x, i) => `
      <article class="hoy-card">
        <div class="hoy-n">${String(i + 1).padStart(2, "0")}</div>
        <div class="hoy-body">
          <div class="hoy-top"><span class="tag acc">${esc(x.topic)}</span><span class="tag">${esc(LEVEL[x.level] || "")}</span><time class="muted mono" datetime="${esc(x.date)}">${esc(fmtDate(x.date))}</time></div>
          <h3>${esc(x.title)}</h3>
          <dl class="hoy-q">
            <div><dt>Qué pasó</dt><dd>${esc(x.what)}</dd></div>
            <div><dt>Por qué importa</dt><dd>${esc(x.why)}${x.editorial ? "" : ' <span class="muted">(lectura por tema)</span>'}</dd></div>
            <div><dt>A quién afecta</dt><dd>${esc(x.affects)}</dd></div>
          </dl>
          <p class="hoy-src">Fuente: <a href="${esc(x.url)}" target="_blank" rel="noopener" data-track="clic_fuente_hoy">${esc(x.source)}</a></p>
        </div>
      </article>`).join("") : `<div class="callout">${ico("info")}<p>No hay acontecimientos relevantes que cumplan este filtro en el periodo elegido. Amplía el periodo a 7D o 30D, o quita la categoría.</p></div>`;
    const more = document.getElementById("hoy-more");
    more.hidden = !rest.length;
    more.querySelector("ul").innerHTML = rest.map((n) => `<li><a href="${esc(n.link)}" target="_blank" rel="noopener">${esc(n.title_es || n.title)}</a><span class="muted">${esc(n.source)} · ${esc(fmtDate(n.published.slice(0, 10)))}</span></li>`).join("");
  }

  document.addEventListener("iar:data", () => {
    const D = I.D;
    root.innerHTML = `
      <div class="sec-head"><p class="kicker"><b>01</b> Qué está pasando</p><h2 id="t-hoy">Hoy en IA</h2>
        <p class="lead">Lo que de verdad importa, sin llenar la pantalla de noticias menores. Cada punto dice qué pasó, por qué importa y a quién afecta.</p></div>
      <div class="hoy-bar">
        <div class="seg" role="group" aria-label="Periodo">${Object.keys(PERIODS).map((p) => `<button type="button" data-p="${p}" aria-pressed="${p === st.period}">${p}</button>`).join("")}</div>
        <div class="chips" role="group" aria-label="Categorías">${["Todas", ...Object.keys(CATS)].map((c) => `<button type="button" class="chip-btn" data-c="${esc(c)}" aria-pressed="${c === st.cat}">${esc(c)}</button>`).join("")}</div>
      </div>
      <div id="hoy-list" aria-live="polite"></div>
      <details id="hoy-more" class="hoy-more"><summary>Otras noticias del periodo</summary><ul></ul></details>
      <p class="muted hoy-note">${ico("info")} Los puntos con etiqueta editorial tienen lectura propia. En los demás, "por qué importa" y "a quién afecta" son una lectura general según el tema de la noticia, no un análisis específico. Las noticias se traducen automáticamente; el original está en la fuente.</p>`;
    root.addEventListener("click", (e) => {
      const p = e.target.closest("[data-p]"), c = e.target.closest("[data-c]");
      if (p) st.period = p.dataset.p;
      if (c) st.cat = c.dataset.c;
      if (!p && !c) return;
      root.querySelectorAll("[data-p]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.p === st.period));
      root.querySelectorAll("[data-c]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.c === st.cat));
      track("filtro_hoy", { periodo: st.period, categoria: st.cat });
      journey.mark("filtro_hoy");
      paint(I.D);
    });
    paint(D);
  }, { once: true });
})();
