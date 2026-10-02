(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nf = new Intl.NumberFormat("es-PE");
  const isPow10 = (v) => Math.abs(Math.log10(v) - Math.round(Math.log10(v))) < 1e-9;
  const fmtAxis = (v) => (v === 0 ? "0" : fmtCtx(v));
  const fmtCtx = (n) => (!n ? "n/d" : n >= 1e6 ? (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + "M" : Math.round(n / 1e3) + "K");
  const fmtPrice = (p) => (p == null ? "n/d" : p === 0 ? "Gratis" : "$" + (p < 1 ? p.toFixed(3) : p.toFixed(2)));
  const fmtDate = (d) => new Date(d + "T12:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
  const daysAgo = (d) => Math.floor((Date.now() - new Date(d + "T12:00:00")) / 864e5);
  const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };


  // slug de OpenRouter -> [archivo de icono, nombre visible, color]
  const PROV = {
    openai: ["openai", "OpenAI", "#10a37f"], anthropic: ["anthropic", "Anthropic", "#d97757"], google: ["google", "Google", "#4285f4"],
    "meta-llama": ["meta", "Meta", "#0866ff"], mistralai: ["mistral", "Mistral AI", "#fa520f"], deepseek: ["deepseek", "DeepSeek", "#4d6bfe"],
    qwen: ["qwen", "Qwen", "#615ced"], "x-ai": ["xai", "xAI"], cohere: ["cohere", "Cohere", "#39a98c"], microsoft: ["microsoft", "Microsoft", "#00a4ef"],
    nvidia: ["nvidia", "NVIDIA", "#76b900"], amazon: ["aws", "Amazon", "#ff9900"], perplexity: ["perplexity", "Perplexity", "#22b8cd"],
    moonshotai: ["moonshot", "Moonshot AI"], "z-ai": ["zai", "Z.ai"], minimax: ["minimax", "MiniMax", "#f23f5d"], ai21: ["ai21", "AI21 Labs", "#e91e63"],
    baidu: ["baidu", "Baidu", "#2932e1"], tencent: ["tencent", "Tencent", "#0052d9"], bytedance: ["bytedance", "ByteDance", "#3c8cff"],
    "bytedance-seed": ["bytedance", "ByteDance Seed", "#3c8cff"], stepfun: ["stepfun", "StepFun", "#3b82f6"], inflection: ["inflection", "Inflection"],
    nousresearch: ["nousresearch", "Nous Research"], liquid: ["liquid", "Liquid AI"], "ibm-granite": ["ibm", "IBM", "#4589ff"], "arcee-ai": ["arcee", "Arcee AI", "#a78bfa"],
    inception: ["inception", "Inception"], openrouter: ["openrouter", "OpenRouter", "#6566f1"], huggingface: ["huggingface", "Hugging Face", "#ffd21e"],
    meta: ["meta", "Meta", "#0866ff"], xiaomi: ["xiaomimimo", "Xiaomi", "#ff6900"], "aion-labs": ["aionlabs", "Aion Labs"], inclusionai: ["antgroup", "inclusionAI", "#1677ff"],
    morph: ["morph", "Morph"], perceptron: ["perceptron", "Perceptron"], poolside: ["poolside", "Poolside"], relace: ["relace", "Relace"], sakana: ["sakana", "Sakana AI"],
    upstage: ["upstage", "Upstage", "#7c5cff"],
    alibaba: ["alibaba", "Alibaba", "#ff6a00"], thudm: ["zhipu", "Zhipu AI", "#3b82f6"], apple: ["apple", "Apple"], rekaai: ["reka", "Reka"],
  };
  const norm = (slug) => String(slug).replace(/^~/, "");
  const provName = (slug) => (PROV[norm(slug)] ? PROV[norm(slug)][1] : norm(slug));
  function provIcon(slug) {
    slug = norm(slug);
    const p = PROV[slug];
    if (p) {
      const col = p[2] ? "--c:" + p[2] + ";" : "";
      return `<span class="pi" style="${col}-webkit-mask-image:url(icons/${p[0]}.svg);mask-image:url(icons/${p[0]}.svg)" role="img" aria-label="${esc(p[1])}"></span>`;
    }
    return `<span class="pi mono" aria-hidden="true">${esc((slug[0] || "?").toUpperCase())}</span>`;
  }
  const provTag = (slug) => `<span class="provtag">${provIcon(slug)}<span>${esc(provName(slug))}</span></span>`;

  const ico = (name, cls = "") => `<i class="ui ${cls}" style="--i:url(icons/ui/${name}.svg)" aria-hidden="true"></i>`;
  const C = { cyan: "#22d3ee", violet: "#8b5cf6", pink: "#f43f9e", green: "#34d399", amber: "#fbbf24", orange: "#fb923c", blue: "#4f8cff" };
  // Relleno degradado para barras: del color pleno al transparente.
  const grad = (color, horizontal) => (ctx) => {
    const a = ctx.chart.chartArea;
    if (!a) return color;
    const g = horizontal ? ctx.chart.ctx.createLinearGradient(a.left, 0, a.right, 0) : ctx.chart.ctx.createLinearGradient(0, a.top, 0, a.bottom);
    g.addColorStop(0, horizontal ? color + "66" : color);
    g.addColorStop(1, horizontal ? color : color + "40");
    return g;
  };
  const charts = {};
  function theme() {
    const s = getComputedStyle(document.documentElement);
    Chart.defaults.color = s.getPropertyValue("--muted").trim();
    Chart.defaults.borderColor = s.getPropertyValue("--line").trim();
    Chart.defaults.font.family = '"Inter", system-ui, sans-serif';
    Chart.defaults.font.size = 13;
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.plugins.legend.labels.boxWidth = 12;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    const tt = Chart.defaults.plugins.tooltip;
    tt.backgroundColor = "rgba(8,10,26,.97)"; tt.titleColor = "#f3f5ff"; tt.bodyColor = "#c3cbea";
    tt.titleFont = { size: 14, weight: "700" }; tt.bodyFont = { size: 13 };
    tt.padding = 14; tt.cornerRadius = 14; tt.borderColor = "rgba(255,255,255,.2)"; tt.borderWidth = 1; tt.boxPadding = 5;
  }
  function draw(id, cfg) {
    const cv = $("#" + id);
    if (!cv) return;
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(cv, cfg);
  }

  async function load(path, fallback) {
    try {
      const r = await fetch(path + "?v=" + Date.now());
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } catch (e) { return fallback; }
  }


  // ---- Interacción global: tooltip con información, foco de luz, aparición y progreso ----
  const tip = document.createElement("div");
  tip.id = "tip"; tip.setAttribute("role", "tooltip");
  document.body.appendChild(tip);
  let tipEl = null;
  function tipPlace(x, y) {
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let left = x + 18, top = y + 20;
    if (left + w > innerWidth - 12) left = x - w - 18;
    if (top + h > innerHeight - 12) top = y - h - 18;
    tip.style.left = Math.max(12, left) + "px";
    tip.style.top = Math.max(12, top) + "px";
  }
  function tipShow(el, x, y) {
    const [title, ...rest] = (el.dataset.tip || "").split("\n");
    if (!title) return;
    tip.innerHTML = "<b>" + esc(title) + "</b>" + rest.map((l) => "<span>" + esc(l) + "</span>").join("");
    tip.classList.add("on");
    tipPlace(x, y);
  }
  const tipHide = () => { tipEl = null; tip.classList.remove("on"); };
  document.addEventListener("mouseover", (e) => {
    const el = e.target.closest && e.target.closest("[data-tip]");
    if (el === tipEl) return;
    if (!el) return tipHide();
    tipEl = el; tipShow(el, e.clientX, e.clientY);
  });
  document.addEventListener("mousemove", (e) => {
    const t = e.target.closest && e.target.closest("[data-tip]");
    if (t && t !== tipEl) { tipEl = t; tipShow(t, e.clientX, e.clientY); }  // reaparece tras un scroll
    else if (!t && tipEl) tipHide();
    else if (tipEl) tipPlace(e.clientX, e.clientY);
    const c = e.target.closest && e.target.closest(".fx, .panel");
    if (c) { const r = c.getBoundingClientRect(); c.style.setProperty("--mx", (e.clientX - r.left) + "px"); c.style.setProperty("--my", (e.clientY - r.top) + "px"); }
  }, { passive: true });
  document.addEventListener("focusin", (e) => {
    const el = e.target.closest && e.target.closest("[data-tip]");
    if (!el) return;
    const r = el.getBoundingClientRect();
    tipEl = el; tipShow(el, r.left + 24, r.top + r.height / 2);
  });
  document.addEventListener("focusout", tipHide);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") tipHide(); });
  window.addEventListener("scroll", tipHide, { passive: true });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function initEffects() {
    const bar = $("#progress");
    const onScroll = () => { const h = document.documentElement.scrollHeight - innerHeight; bar.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%"; };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    if (!("IntersectionObserver" in window)) { document.querySelectorAll(".rv").forEach((e) => e.classList.add("in")); return; }
    const rv = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); rv.unobserve(e.target); } }), { threshold: 0.05 });
    document.querySelectorAll(".rv").forEach((e) => rv.observe(e));
    const links = [...document.querySelectorAll("nav.main a")];
    const nav = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) links.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id));
    }), { rootMargin: "-35% 0px -60% 0px" });
    links.forEach((a) => { const sec = document.querySelector(a.getAttribute("href")); if (sec) nav.observe(sec); });
  }
  // Los números de los indicadores suben desde cero al aparecer.
  function countUp() {
    const els = [...document.querySelectorAll("[data-to]")];
    const run = (el) => {
      const to = +el.dataset.to, dec = +(el.dataset.dec || 0), pre = el.dataset.pre || "";
      if (reduceMotion) { el.textContent = pre + to.toLocaleString("es-PE", { minimumFractionDigits: dec, maximumFractionDigits: dec }); return; }
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / 1100), v = to * (1 - Math.pow(1 - p, 3));
        el.textContent = pre + v.toLocaleString("es-PE", { minimumFractionDigits: dec, maximumFractionDigits: dec });
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (!("IntersectionObserver" in window)) return els.forEach(run);
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }), { threshold: 0.4 });
    els.forEach((e) => io.observe(e));
  }

  let models = [], allCount = 0, state = { sort: "created", asc: false, shown: 10, picked: [], open: new Set() };

  function renderStatus(meta) {
    const upd = new Date(meta.updated_at);
    const hours = (Date.now() - upd) / 36e5;
    const st = $("#status");
    st.classList.toggle("stale", hours > 36);
    st.dataset.updated = upd.toISOString();  // el reloj de la cabecera muestra cuánto hace que se actualizaron los datos
    if (meta.sample) {
      const b = $("#banner");
      b.hidden = false;
      b.textContent = "Estás viendo datos de ejemplo. Se reemplazan por datos reales en la primera actualización automática.";
    }
    const src = meta.sources || {};
    $("#src-status").textContent = Object.entries(src).map(([k, v]) => k + ": " + (v.ok ? "ok (" + v.count + ")" : "con error, se muestran los últimos datos válidos")).join(" · ");
  }

  function renderKpis(meta, hist) {
    const recent = models.filter((m) => daysAgo(m.created) <= 30);
    const prices = models.filter((m) => daysAgo(m.created) <= 180 && m.price_in > 0).map((m) => m.price_in);
    const cnt = {};
    recent.forEach((m) => { cnt[m.provider] = (cnt[m.provider] || 0) + 1; });
    const topProv = Object.entries(cnt).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([p, n]) => `${provName(p)}: ${n}`);
    const prev = hist.length > 1 ? hist[hist.length - 2] : null;
    const delta = prev ? allCount - prev.total : null;
    const med = prices.length ? median(prices) : null;
    const items = [
      { ic: "layers", to: allCount, l: "modelos en el catálogo" + (delta ? " (" + (delta > 0 ? "+" : "") + delta + " vs. ayer)" : ""),
        tip: "Modelos en el catálogo\nTotal que lista OpenRouter hoy, con variantes (batch, gratuitas, alias).\nEn los análisis se cuentan sin duplicados." },
      { ic: "rocket", to: recent.length, l: "lanzados en los últimos 30 días", tip: "Lanzados en 30 días\nModelos únicos con fecha de lanzamiento en el último mes.\nTodos los proveedores, no solo los principales." },
      { ic: "building-2", to: new Set(recent.map((m) => m.provider)).size, l: "proveedores activos en 30 días", tip: "Proveedores más activos\n" + topProv.join("\n") },
      { ic: "coins", to: med, dec: 2, pre: "$", l: "precio mediano de entrada por millón de tokens (180 días)",
        tip: "Precio mediano de entrada\nLa mitad de los modelos de pago de los últimos 180 días cuesta menos que esto.\nUn millón de tokens equivale a unas 750,000 palabras." },
    ];
    $("#kpis").innerHTML = items.map((k) => `<div class="kpi fx"${tipAttr(k.tip)}><span class="ico">${ico(k.ic)}</span><b data-to="${k.to ?? 0}" data-dec="${k.dec || 0}" data-pre="${esc(k.pre || "")}">${k.to == null ? "n/d" : "0"}</b><span class="l">${esc(k.l)}</span></div>`).join("");
    countUp();
  }

  function chips(m, isNew) {
    const c = [];
    if (isNew) c.push('<span class="chip nw">NUEVO</span>');
    if (m.multimodal) c.push(`<span class="chip mm">${ico("eye")}Multimodal</span>`);
    if (m.reasoning) c.push(`<span class="chip rs">${ico("brain")}Razonamiento</span>`);
    if (m.price_in === 0 && m.price_out === 0) c.push(`<span class="chip fr">${ico("zap")}Gratis</span>`);
    return c.join("");
  }

  const INPUT_ES = { image: "imágenes", file: "archivos", audio: "audio", video: "video" };
  function modelTip(m) {
    const lines = [m.name, `${provName(m.provider)} · lanzado el ${fmtDate(m.created)}`,
      `Entrada ${fmtPrice(m.price_in)} · salida ${fmtPrice(m.price_out)} por millón de tokens`];
    if (m.context) lines.push(`Contexto: ${nf.format(m.context)} tokens (≈ ${nf.format(Math.round((m.context * 0.75) / 1000) * 1000)} palabras)`);
    if (m.price_in > 0 && m.context >= 133000) lines.push(`Analizar un libro de ${nf.format(100000)} palabras costaría ≈ $${((133333 / 1e6) * m.price_in).toFixed(3)} en entrada`);
    const caps = [];
    if (m.multimodal) caps.push("entiende " + (m.inputs || []).filter((i) => i !== "text").map((i) => INPUT_ES[i] || i).join(", "));
    if (m.reasoning) caps.push("razona antes de responder");
    if (caps.length) lines.push("Capacidades: " + caps.join(" y "));
    lines.push("Ideal para: " + uses(m).tags.map((x) => x.t.toLowerCase()).join(", "));
    lines.push("Clic en la fila para ver cuándo conviene usarlo");
    return lines.join("\n");
  }
  const tipAttr = (txt) => ` data-tip="${esc(txt)}" tabindex="0"`;

  // ---- Nueva versión frente a la anterior de la misma familia ----
  function family(m) {
    let n = m.name.includes(": ") ? m.name.split(": ").slice(1).join(": ") : m.name;
    n = n.toLowerCase().replace(/\(.*?\)/g, " ").replace(/\bv?\d+(\.\d+)*[a-z]?\b/g, " ")
      .replace(/\b(preview|beta|exp|experimental|latest|batch)\b/g, " ").replace(/[^a-z ]/g, " ");
    return norm(m.provider) + "|" + n.split(/\s+/).filter(Boolean).join(" ");
  }
  function versionPairs(list) {
    const groups = {};
    list.forEach((m) => { (groups[family(m)] = groups[family(m)] || []).push(m); });
    const out = [];
    Object.values(groups).forEach((g) => {
      g.sort((a, b) => b.created.localeCompare(a.created));
      const cur = g[0], prev = g.find((m) => m.created < cur.created && m.name !== cur.name);
      if (!prev || daysAgo(cur.created) > 90) return;
      const d = (a, b) => (a > 0 && b > 0 ? Math.round(((a - b) / b) * 100) : null);
      out.push({ cur, prev, dIn: d(cur.price_in, prev.price_in), dOut: d(cur.price_out, prev.price_out), same: cur.context === prev.context });
    });
    return out.sort((a, b) => b.cur.created.localeCompare(a.cur.created) || a.cur.name.localeCompare(b.cur.name));
  }
  function deltaCell(now, before, pctv, fmt) {
    if (now == null || before == null) return '<span class="muted">n/d</span>';
    if (now === before) return `<span class="muted">${esc(fmt(now))} sin cambio</span>`;
    const tone = now < before ? "up" : "down";
    const tag = pctv == null ? "" : ` <span class="${tone}">${pctv > 0 ? "+" : ""}${pctv}%</span>`;
    return `<span class="was">${esc(fmt(before))}</span> → <b>${esc(fmt(now))}</b>${tag}`;
  }
  function ctxCell(cur, prev) {
    if (cur === prev) return `<span class="muted">${esc(fmtCtx(cur))} sin cambio</span>`;
    const tone = cur > prev ? "up" : "down";
    return `<span class="was">${esc(fmtCtx(prev))}</span> → <b>${esc(fmtCtx(cur))}</b> <span class="${tone}">${cur > prev ? "más" : "menos"}</span>`;
  }
  function renderVersions() {
    const rows = versionPairs(models.filter(isMajor)).slice(0, 12);
    $("#versions tbody").innerHTML = rows.map(({ cur, prev, dIn, dOut }) => {
      const gains = [];
      if (cur.multimodal && !prev.multimodal) gains.push(`<span class="chip mm">${ico("eye")}+ Multimodal</span>`);
      if (cur.reasoning && !prev.reasoning) gains.push(`<span class="chip rs">${ico("brain")}+ Razonamiento</span>`);
      if (!cur.multimodal && prev.multimodal) gains.push('<span class="chip">− Multimodal</span>');
      if (!cur.reasoning && prev.reasoning) gains.push('<span class="chip">− Razonamiento</span>');
      const days = Math.max(1, Math.round((new Date(cur.created) - new Date(prev.created)) / 864e5));
      const vtip = [`${cur.name.replace(/^[^:]+: /, "")} frente a ${prev.name.replace(/^[^:]+: /, "")}`, `Pasaron ${nf.format(days)} días entre ambos lanzamientos`,
        `Entrada: ${fmtPrice(prev.price_in)} → ${fmtPrice(cur.price_in)}${dIn != null ? " (" + signed(dIn) + ")" : ""}`,
        `Salida: ${fmtPrice(prev.price_out)} → ${fmtPrice(cur.price_out)}${dOut != null ? " (" + signed(dOut) + ")" : ""}`,
        `Contexto: ${fmtCtx(prev.context)} → ${fmtCtx(cur.context)}`].join("\n");
      return `<tr${tipAttr(vtip)}><td class="nm">${provTag(cur.provider)}<br><b>${esc(cur.name.replace(/^[^:]+: /, ""))}</b><small>${esc(fmtDate(cur.created))}</small></td>
        <td class="nm">${esc(prev.name.replace(/^[^:]+: /, ""))}<small>${esc(fmtDate(prev.created))}</small></td>
        <td>${deltaCell(cur.price_in, prev.price_in, dIn, fmtPrice)}</td><td>${deltaCell(cur.price_out, prev.price_out, dOut, fmtPrice)}</td>
        <td>${ctxCell(cur.context, prev.context)}</td><td><div class="chips" style="margin:0">${gains.join("") || '<span class="muted">sin cambios</span>'}</div></td></tr>`;
    }).join("") || '<tr><td colspan="6" class="muted">No hay versiones nuevas con una anterior comparable en los últimos 90 días.</td></tr>';
  }

  // ---- Conclusiones ----
  // Excluye variantes (:batch, alias "~", enrutadores) para no contar dos veces el mismo modelo.
  function baseModels(list) {
    const ids = new Set(list.map((m) => m.id));
    return list.filter((m) => {
      if (m.id.startsWith("~") || m.provider === "openrouter" || m.id.endsWith(":batch")) return false;
      const root = m.id.split(":")[0];
      return !(m.id.includes(":") && ids.has(root));
    });
  }
  const between = (list, a, b) => list.filter((m) => { const d = daysAgo(m.created); return d >= a && d < b; });
  const pct = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 100) : null);
  const signed = (n) => (n > 0 ? "+" : "") + n + "%";
  const paid = (list) => list.filter((m) => m.price_in > 0);
  // Laboratorios y proveedores de primera línea (el resto queda en el comparador).
  const MAJOR = new Set(["openai", "anthropic", "google", "meta-llama", "meta", "mistralai", "deepseek", "qwen", "x-ai", "microsoft", "nvidia", "amazon",
    "moonshotai", "z-ai", "minimax", "cohere", "perplexity", "bytedance-seed", "tencent", "baidu", "xiaomi", "ibm-granite", "stepfun", "ai21", "alibaba"]);
  const isMajor = (m) => MAJOR.has(norm(m.provider));

  function renderInsights(meta) {
    const M = models.filter(isMajor);
    const d30 = between(M, 0, 30), p30 = between(M, 30, 60);
    const refCtx = median(between(M, 0, 180).map((m) => m.context).filter(Boolean));
    const cards = [];
    const headline = [];

    // Ritmo
    const rate = pct(d30.length, p30.length);
    cards.push({ ic: "trending-up", how: "Cuenta modelos únicos (sin variantes) de los laboratorios principales con fecha de lanzamiento en los últimos 30 días y los compara con los 30 días anteriores.", k: "Ritmo de lanzamientos", v: d30.length, u: "modelos en 30 días",
      t: rate == null ? "Sin periodo anterior para comparar." : `${signed(rate)} frente a los 30 días previos (${p30.length}).`, tone: rate == null ? "" : rate >= 0 ? "up" : "down" });
    headline.push(`En los últimos 30 días los laboratorios principales lanzaron ${d30.length} modelos` + (rate == null ? "" : ` (${signed(rate)} vs. el periodo anterior)`));

    // Proveedor líder
    const cnt = {};
    d30.forEach((m) => { cnt[m.provider] = (cnt[m.provider] || 0) + 1; });
    const lead = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
    if (lead) {
      const share = Math.round((lead[1] / d30.length) * 100);
      cards.push({ ic: "crown", how: "Proveedor con más modelos nuevos en los últimos 30 días; el porcentaje es su parte sobre el total de lanzamientos de laboratorios principales.", k: "Quién marca el ritmo", v: provName(lead[0]), vhtml: provTag(lead[0]), u: `${lead[1]} lanzamientos`, t: `Concentra ${share}% de los modelos nuevos de los últimos 30 días.` });
      headline.push(`${provName(lead[0])} lidera con ${lead[1]}`);
    }

    // Balance de precios frente a la versión anterior de cada familia
    const vp = versionPairs(M).filter((p) => p.dIn != null);
    if (vp.length >= 3) {
      const down = vp.filter((p) => p.dIn < 0).length, upn = vp.filter((p) => p.dIn > 0).length, flat = vp.length - down - upn;
      cards.push({ ic: "scale", how: "Se empareja cada modelo nuevo con la versión anterior de su misma familia y se compara el precio de entrada. Solo cuentan los pares con precio en ambos.", k: "Precios vs. versión anterior", v: `${down} ↓  ${upn} ↑`, u: `de ${vp.length} versiones nuevas comparables`,
        t: `${down} bajaron el precio de entrada, ${upn} lo subieron y ${flat} lo mantienen.`, tone: down >= upn ? "up" : "down" });
      headline.push(`${down} de ${vp.length} versiones nuevas bajaron su precio de entrada frente a la anterior`);
    }

    // Mayor recorte de precio frente a la versión anterior
    const cut = versionPairs(M).filter((p) => p.dIn != null && p.dIn <= -10).sort((x, y) => x.dIn - y.dIn)[0];
    if (cut) cards.push({ ic: "coins", how: "La mayor bajada del precio de entrada entre un modelo nuevo y su versión anterior, entre los lanzados en los últimos 90 días.", k: "Mayor recorte de precio", v: cut.dIn + "%", u: cut.cur.name,
      t: `Entrada de ${fmtPrice(cut.prev.price_in)} a ${fmtPrice(cut.cur.price_in)} por millón de tokens frente a ${cut.prev.name.replace(/^[^:]+: /, "")}.`, tone: "up" });

    // Contexto máximo
    const big = [...d30].sort((a, b) => b.context - a.context)[0];
    if (big && big.context && refCtx && big.context / refCtx >= 2) cards.push({ ic: "ruler", how: "El modelo reciente con la ventana de contexto más grande, comparado con la mediana de los últimos 180 días.", k: "Mayor contexto reciente", v: fmtCtx(big.context), u: big.name,
      t: `${(big.context / refCtx).toFixed(1)} veces la mediana de los últimos 180 días (${fmtCtx(refCtx)}).`, prov: big.provider });

    // Capacidades
    const share = (list, f) => (list.length ? Math.round((list.filter(f).length / list.length) * 100) : null);
    const mmNow = share(d30, (m) => m.multimodal), mmPrev = share(p30, (m) => m.multimodal);
    const rsNow = share(d30, (m) => m.reasoning), rsPrev = share(p30, (m) => m.reasoning);
    if (mmNow != null) {
      const dm = mmPrev == null ? "" : ` (${mmNow - mmPrev >= 0 ? "+" : ""}${mmNow - mmPrev} pts vs. periodo previo)`;
      cards.push({ ic: "sparkles", how: "Porcentaje de los lanzamientos de los últimos 30 días que aceptan imágenes, audio o archivos (multimodal) y que ofrecen razonamiento, frente a los 30 días anteriores.", k: "Capacidades", v: mmNow + "%", u: "de los nuevos son multimodales",
        t: `${rsNow}% incorpora razonamiento${rsPrev == null ? "" : ` (antes ${rsPrev}%)`}.${dm ? " Multimodales" + dm.replace(/^ \(/, ": ").replace(/\)$/, "") + "." : ""}` });
    }

    // Hoy
    const today = meta.new_today || 0;
    const todayText = today > 0
      ? `Hoy se sumaron ${today} modelo${today > 1 ? "s" : ""} al catálogo: ${models.filter((m) => m.first_seen === meta.updated_date).slice(0, 3).map((m) => m.name).join(", ") || "ver el comparador"}.`
      : "Hoy no se detectaron modelos nuevos respecto a la actualización anterior.";

    $("#headline").textContent = headline.join("; ") + ".";
    $("#today").textContent = meta.sample ? "" : todayText;
    $("#insights").innerHTML = cards.map((c) => `<article class="ins-card fx"${tipAttr("Cómo se calcula\n" + c.how)}><span class="ico">${ico(c.ic)}</span><span class="ins-k">${esc(c.k)}</span>
      <b class="ins-v">${c.vhtml || esc(c.v)}</b><span class="ins-u">${c.prov ? provTag(c.prov) + " " : ""}${esc(c.u)}</span><p>${esc(c.t)}</p></article>`).join("");
  }

  function renderCharts(hist) {
    // Lanzamientos por mes (12 meses)
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0")); }
    const txt = months.map(() => 0), mm = months.map(() => 0);
    models.forEach((m) => { const i = months.indexOf(m.created.slice(0, 7)); if (i >= 0) (m.multimodal ? mm : txt)[i]++; });
    const label = (k) => { const [y, mo] = k.split("-"); return new Date(+y, +mo - 1, 1).toLocaleDateString("es-PE", { month: "short", year: "2-digit" }); };
    draw("c-releases", { type: "bar", data: { labels: months.map(label), datasets: [
      { label: "Texto", data: txt, backgroundColor: grad(C.violet), borderRadius: 6 },
      { label: "Multimodal", data: mm, backgroundColor: grad(C.cyan), borderRadius: 6 }] },
      options: { scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } } } });

    // Proveedores 90 días
    const cnt = {};
    models.filter((m) => daysAgo(m.created) <= 90).forEach((m) => { cnt[m.provider] = (cnt[m.provider] || 0) + 1; });
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 10);
    draw("c-providers", { type: "bar", data: { labels: top.map((t) => provName(t[0])), datasets: [{ data: top.map((t) => t[1]), backgroundColor: grad(C.cyan, true), borderRadius: 8 }] },
      options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { grid: { display: false } } } } });

    // Precio vs contexto
    const pts = models.filter((m) => daysAgo(m.created) <= 180 && m.price_in > 0 && m.context > 0);
    const ds = (list, lbl, col) => ({ label: lbl, backgroundColor: col + "d9", pointRadius: 6, pointHoverRadius: 9, pointHoverBorderWidth: 3, pointHoverBorderColor: "#fff", data: list.map((m) => ({ x: m.context, y: m.price_in, n: m.name })) });
    draw("c-scatter", { type: "scatter", data: { datasets: [ds(pts.filter((m) => !m.reasoning), "Estándar", C.violet), ds(pts.filter((m) => m.reasoning), "Razonamiento", C.pink)] },
      options: { scales: {
        x: { type: "logarithmic", title: { display: true, text: "Contexto (tokens)" }, ticks: { callback: (v) => (isPow10(v) ? fmtCtx(v) : "") } },
        y: { type: "logarithmic", title: { display: true, text: "USD por millón de tokens (entrada)" }, ticks: { callback: (v) => (isPow10(v) ? "$" + v : "") } } },
        plugins: { tooltip: { callbacks: { label: (c) => c.raw.n + ": " + fmtCtx(c.raw.x) + " · $" + c.raw.y } } } } });

    // Historial
    const ok = hist.length > 1;
    if (!$("#hist-empty")) return;
    $("#hist-empty").hidden = ok;
    $("#c-history").parentElement.hidden = !ok;
    if (ok) draw("c-history", { type: "line", data: { labels: hist.map((h) => fmtDate(h.date)), datasets: [
      { label: "Modelos en catálogo", data: hist.map((h) => h.total), borderColor: C.cyan, backgroundColor: C.cyan + "33", tension: .35, yAxisID: "y", fill: true, borderWidth: 3, pointRadius: 3, pointHoverRadius: 7 },
      { label: "Precio mediano entrada ($/M)", data: hist.map((h) => h.median_price_in), borderColor: C.amber, tension: .3, yAxisID: "y1" }] },
      options: { interaction: { mode: "index", intersect: false }, scales: { y: { position: "left", title: { display: true, text: "Modelos" } }, y1: { position: "right", grid: { drawOnChartArea: false }, title: { display: true, text: "USD/M" } } } } });
  }

  function renderHF(hf) {
    const top = hf.slice(0, 10);
    draw("c-hf", { type: "bar", data: { labels: top.map((m) => m.id.split("/").pop()), datasets: [{ data: top.map((m) => m.downloads), backgroundColor: grad(C.violet, true), borderRadius: 8 }] },
      options: { indexAxis: "y", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => nf.format(c.raw) + " descargas" } } }, scales: { x: { ticks: { callback: (v) => fmtAxis(v) } }, y: { grid: { display: false } } } } });
    $("#hf-list").innerHTML = hf.slice(0, 15).map((m, i) =>
      `<li><a href="https://huggingface.co/${encodeURI(m.id)}" target="_blank" rel="noopener">${i + 1}. ${esc(m.id)}</a><span>${esc(nf.format(m.downloads))} desc. · ${esc(nf.format(m.likes))} likes</span></li>`).join("");
  }

  // ---- Para qué sirve cada modelo ----
  // Orientación calculada con precio, contexto y capacidades (no es una evaluación de calidad) más la descripción del proveedor.
  let thrCache = null;
  function thr() {
    if (thrCache) return thrCache;
    const b = models.filter((m) => isMajor(m) && m.price_in > 0 && m.price_out > 0).map((m) => (m.price_in * 3 + m.price_out) / 4).sort((x, y) => x - y);
    thrCache = { lo: b[Math.floor(b.length / 3)] || 0.6, hi: b[Math.floor((b.length * 2) / 3)] || 3 };
    return thrCache;
  }
  const money = (v) => (v == null ? "n/d" : v === 0 ? "Gratis" : v < 0.01 ? "menos de $0.01" : "$" + v.toFixed(v < 1 ? 3 : 2));
  function uses(m) {
    const tags = [], good = [], care = [];
    const nm = (m.id + " " + m.name).toLowerCase(), ds = (m.description || "").toLowerCase();
    const bl = m.price_in > 0 && m.price_out > 0 ? (m.price_in * 3 + m.price_out) / 4 : null;
    const words = Math.round((m.context * 0.75) / 1000) * 1000;
    const add = (ic, t, why) => { tags.push({ ic, t }); good.push({ t, why }); };
    if (m.price_in === 0 && m.price_out === 0) add("zap", "Probar sin costo", "no cobra por token: sirve para prototipos y pruebas, aunque suele tener límites de uso o menor disponibilidad.");
    if (/code|coder|codex|devstral|codestral/.test(nm) || /\b(coding|programming|software engineering)\b/.test(ds)) add("code", "Programación", "orientado a escribir, revisar y depurar código.");
    if (m.reasoning) { add("brain", "Razonamiento complejo", "piensa paso a paso antes de responder: útil en matemáticas, lógica, análisis y planificación."); care.push("Más lento y con más tokens por respuesta que un modelo sin razonamiento; sobra para tareas simples."); }
    if (m.context >= 500000) add("file-search", "Documentos extensos", `su contexto de ${fmtCtx(m.context)} tokens (≈ ${nf.format(words)} palabras) permite analizar contratos, informes o bases de código completas de una vez.`);
    else if (m.context >= 128000) good.push({ t: "Contexto amplio", why: `con ${fmtCtx(m.context)} tokens (≈ ${nf.format(words)} palabras) maneja manuales e informes largos.` });
    else if (m.context > 0 && m.context <= 64000) care.push(`Contexto de ${fmtCtx(m.context)}: para documentos largos hay que dividirlos en partes.`);
    const ins = m.inputs || [];
    if (ins.includes("image")) add("image", "Analizar imágenes", "acepta imágenes: capturas, gráficos, facturas o documentos escaneados.");
    if (ins.includes("audio") || ins.includes("video")) add("mic", "Audio y video", "puede procesar " + [ins.includes("audio") && "audio", ins.includes("video") && "video"].filter(Boolean).join(" y ") + ".");
    if (/flash|mini|lite|nano|haiku|small|instant|turbo|fast/.test(nm)) add("timer", "Respuestas rápidas", "versión ligera pensada para velocidad y bajo costo: chatbots, clasificación y extracción a gran volumen.");
    if (/sonar|search|online/.test(nm) || /web search|real-time|up-to-date information/.test(ds)) add("search", "Búsqueda con fuentes", "consulta información actual de la web y suele citar fuentes.");
    if (/image|banana|imagen|flux|dall|diffusion/.test(nm) && !/vision/.test(nm)) add("image", "Generación de imágenes", "orientado a crear o editar imágenes.");
    if (/\b(tts|whisper|voice|speech|realtime|audio)\b/.test(nm)) add("mic", "Voz y audio", "orientado a conversación por voz o transcripción.");
    if (/creative|roleplay|role-play|storytelling|fiction/.test(ds) || /euryale|story|\brp\b|roleplay/.test(nm)) add("pen-line", "Escritura creativa", "pensado para relatos, personajes y conversación con estilo.");
    if (/agentic|tool use|tool calling|function calling|\bagents?\b/.test(ds)) add("bot", "Agentes y herramientas", "diseñado para usar herramientas y resolver tareas de varios pasos.");
    if (/multilingual|\b\d{2,3}\+? languages\b/.test(ds)) add("languages", "Varios idiomas", "buen soporte para trabajar en múltiples idiomas.");
    if (/\b(math|mathematical|stem|scientific)\b/.test(ds)) add("calculator", "Matemáticas y ciencia", "destaca en problemas matemáticos y científicos según su descripción.");
    if (bl != null && bl < thr().lo) add("coins", "Alto volumen a bajo costo", `con ≈ ${money(bl)} por millón de tokens conviene para procesar grandes cantidades: clasificar, resumir o atender consultas.`);
    if (bl != null && bl >= thr().hi) { add("target", "Tareas críticas", `gama alta (≈ ${money(bl)} por millón de tokens): para casos donde importa la calidad, como análisis complejo, código difícil y agentes.`); care.push("Cuesta bastante más que las opciones medias y económicas: resérvalo para donde aporte valor."); }
    if (m.price_in > 0 && m.price_out / m.price_in >= 5) care.push(`La salida cuesta ${Math.round(m.price_out / m.price_in)} veces la entrada: ojo con las respuestas muy largas.`);
    if (!tags.length) add("message-square", "Uso general", "conversación, redacción, resumen y consultas cotidianas.");
    return { tags: tags.slice(0, 4), good: good.slice(0, 5), care: care.slice(0, 3) };
  }
  function costExamples(m) {
    if (m.price_in == null || m.price_out == null) return [];
    const c = (tin, tout) => (tin * m.price_in + tout * m.price_out) / 1e6;
    const out = [["message-square", "1,000 conversaciones de soporte (≈ 1,500 tokens de entrada y 500 de salida cada una)", c(1.5e6, 0.5e6)]];
    if (m.context >= 40000) out.push(["file-text", "Resumir un informe de 50 páginas (≈ 35,000 tokens) en un resumen de 1,000 tokens", c(35000, 1000)]);
    if (m.context >= 140000) out.push(["book-open", `Analizar un libro de ${nf.format(100000)} palabras (≈ 133,000 tokens) y responder con 2,000 tokens`, c(133000, 2000)]);
    return out;
  }
  function descText(m) {
    if (m.description_es) return { t: m.description_es, en: false };
    if (m.description) return { t: m.description, en: true };
    return null;
  }
  function useChips(m, tags) {
    return `<div class="chips use-tags">${(tags || uses(m).tags).slice(0, 3).map((x) => `<span class="chip ut${x.rel ? " rel" : ""}">${ico(x.ic)}${esc(x.t)}</span>`).join("")}</div>`;
  }
  // Dentro de un grupo de modelos comparables, destaca lo que distingue a cada uno (lo común a casi todos no ayuda a decidir).
  function distinguish(rows) {
    const n = rows.length || 1, freq = {};
    rows.forEach((m) => uses(m).tags.forEach((t) => { freq[t.t] = (freq[t.t] || 0) + 1; }));
    const minB = Math.min(...rows.map((m) => m.blend)), maxC = Math.max(...rows.map((m) => m.context));
    const nMax = rows.filter((m) => m.context === maxC).length;
    const out = new Map();
    rows.forEach((m) => {
      const rel = [];
      if (n > 3 && m.blend === minB) rel.push({ ic: "coins", t: "Más barato de la gama", rel: true });
      if (n > 3 && m.context === maxC && nMax <= 3) rel.push({ ic: "ruler", t: "Mayor contexto de la gama", rel: true });
      const own = uses(m).tags.slice().sort((a, b) => freq[a.t] - freq[b.t]);
      const rare = own.filter((t) => freq[t.t] / n < 0.7), common = own.filter((t) => freq[t.t] / n >= 0.7);
      out.set(m.id, rel.concat(rare, common).slice(0, 3));
    });
    return out;
  }
  function rankLine(rows, m) {
    const byPrice = [...rows].sort((a, b) => a.blend - b.blend).findIndex((x) => x.id === m.id) + 1;
    const byCtx = [...rows].sort((a, b) => b.context - a.context).findIndex((x) => x.id === m.id) + 1;
    return `Precio mixto: puesto ${byPrice} de ${rows.length} (de más barato a más caro) · Contexto: puesto ${byCtx} de ${rows.length} (de mayor a menor)`;
  }
  function detailRow(m, cols, rows) {
    const u = uses(m), ex = costExamples(m), d = descText(m);
    return `<tr class="md-row"><td colspan="${cols}"><div class="md">
      ${rows ? `<div class="md-col wide md-rank">${ico("trophy")}<span><b>En su gama:</b> ${esc(rankLine(rows, m))}</span></div>` : ""}
      <div class="md-col"><h5>${ico("lightbulb")} Para qué es bueno</h5><ul>${u.good.map((g) => `<li><b>${esc(g.t)}.</b> ${esc(g.why)}</li>`).join("")}</ul></div>
      <div class="md-col"><h5>${ico("triangle-alert")} Con cuidado</h5>${u.care.length ? `<ul>${u.care.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : '<p class="muted">Sin advertencias particulares por precio o contexto.</p>'}
        <h5 class="md-h5b">${ico("receipt")} Costo de ejemplo</h5><ul class="md-cost">${ex.map((e) => `<li>${ico(e[0])}<span>${esc(e[1])}: <b>${esc(money(e[2]))}</b></span></li>`).join("")}</ul></div>
      <div class="md-col wide">${d ? `<h5>${ico("quote")} Según el proveedor ${d.en ? '<span class="chip">en inglés</span>' : ""}</h5><p>${esc(d.t)}</p>` : ""}
        <p class="md-note">${ico("info")}<span>La orientación se calcula con el precio, el contexto y las capacidades del modelo; no mide su calidad real. Pruébalo con tus propios casos antes de decidir.</span></p></div>
    </div></td></tr>`;
  }
  const chev = (open) => ico("chevron-down", "chev" + (open ? " open" : ""));

  // ---- Comparador ----
  function filtered() {
    const q = $("#q").value.trim().toLowerCase(), p = $("#prov").value, f = $("#flt").value;
    return models.filter((m) =>
      (!q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || provName(m.provider).toLowerCase().includes(q)) && (!p || m.provider === p) &&
      (!f || (f === "multimodal" && m.multimodal) || (f === "reasoning" && m.reasoning) || (f === "free" && m.price_in === 0 && m.price_out === 0)));
  }
  function renderTable() {
    const rows = filtered();
    const k = state.sort, dir = state.asc ? 1 : -1;
    rows.sort((a, b) => {
      const x = a[k], y = b[k];
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (typeof x === "string" ? x.localeCompare(y) : x - y) * dir;
    });
    $("#count").textContent = nf.format(rows.length) + " modelos";
    $("#tbl tbody").innerHTML = rows.slice(0, state.shown).map((m) => {
      const open = state.open.has(m.id);
      return `<tr data-row="${esc(m.id)}" class="${open ? "open" : ""}" aria-expanded="${open}"${tipAttr(modelTip(m))}>
      <td><input type="checkbox" data-id="${esc(m.id)}" aria-label="Comparar ${esc(m.name)}" ${state.picked.includes(m.id) ? "checked" : ""}></td>
      <td class="nm">${chev(open)}${esc(m.name)}<small>${esc(m.id)}</small></td><td>${provTag(m.provider)}</td><td>${esc(fmtDate(m.created))}</td>
      <td class="num">${esc(fmtCtx(m.context))}</td><td class="num">${esc(fmtPrice(m.price_in))}</td><td class="num">${esc(fmtPrice(m.price_out))}</td>
      <td>${useChips(m)}</td><td><div class="chips" style="margin:0">${chips(m, false)}</div></td></tr>${open ? detailRow(m, 9) : ""}`;
    }).join("");
    $("#more").hidden = rows.length <= state.shown;
    document.querySelectorAll("#tbl th[data-k]").forEach((th) => {
      const on = th.dataset.k === k;
      th.classList.toggle("sorted", on);
      th.classList.toggle("asc", on && state.asc);
    });
  }
  function renderCompare() {
    const sel = state.picked.map((id) => models.find((m) => m.id === id)).filter(Boolean);
    $("#compare").hidden = sel.length === 0;
    if (!sel.length) return;
    const labels = sel.map((m) => m.name);
    const cols = [C.cyan, C.violet, C.pink, C.amber];
    draw("c-cmp-price", { type: "bar", data: { labels, datasets: [
      { label: "Entrada", data: sel.map((m) => m.price_in), backgroundColor: grad(C.cyan), borderRadius: 8 },
      { label: "Salida", data: sel.map((m) => m.price_out), backgroundColor: grad(C.violet), borderRadius: 8 }] },
      options: { scales: { y: { beginAtZero: true, ticks: { callback: (v) => "$" + v } }, x: { grid: { display: false } } } } });
    draw("c-cmp-ctx", { type: "bar", data: { labels, datasets: [{ data: sel.map((m) => m.context), backgroundColor: sel.map((_, i) => cols[i]), borderRadius: 8 }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: (v) => fmtAxis(v) } }, x: { grid: { display: false } } } } });
    const row = (l, f) => `<tr><th scope="row">${l}</th>${sel.map((m) => `<td>${f(m)}</td>`).join("")}</tr>`;
    $("#cmp-table").innerHTML = row("Modelo", (m) => esc(m.name)) + row("Proveedor", (m) => provTag(m.provider)) + row("Lanzamiento", (m) => esc(fmtDate(m.created))) +
      row("Contexto", (m) => esc(fmtCtx(m.context))) + row("Entrada $/M", (m) => esc(fmtPrice(m.price_in))) + row("Salida $/M", (m) => esc(fmtPrice(m.price_out))) +
      row("Multimodal", (m) => (m.multimodal ? "Sí (" + esc(m.inputs.join(", ")) + ")" : "No")) + row("Razonamiento", (m) => (m.reasoning ? "Sí" : "No")) +
      row("Ideal para", (m) => `<div class="chips use-tags">${uses(m).tags.map((x) => `<span class="chip ut">${ico(x.ic)}${esc(x.t)}</span>`).join("")}</div>`) +
      row("Para qué es bueno", (m) => `<ul class="cmp-list">${uses(m).good.slice(0, 3).map((g) => `<li><b>${esc(g.t)}.</b> ${esc(g.why)}</li>`).join("")}</ul>`) +
      row("Con cuidado", (m) => (uses(m).care.length ? `<ul class="cmp-list">${uses(m).care.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : '<span class="muted">Sin advertencias</span>')) +
      row("1,000 conversaciones de soporte", (m) => esc(money(costExamples(m)[0] && costExamples(m)[0][2]))) +
      row("Según el proveedor", (m) => { const d = descText(m); return d ? `<p class="cmp-desc">${esc(d.t)}${d.en ? ' <span class="chip">en inglés</span>' : ""}</p>` : '<span class="muted">Sin descripción</span>'; });
  }

  function bindTable() {
    const provs = [...new Set(models.map((m) => m.provider))].sort();
    $("#prov").insertAdjacentHTML("beforeend", provs.map((p) => `<option value="${esc(p)}">${esc(provName(p))}</option>`).join(""));
    ["#q", "#prov", "#flt"].forEach((s) => $(s).addEventListener("input", () => { state.shown = 10; renderTable(); }));
    $("#more").addEventListener("click", () => { state.shown += 50; renderTable(); });
    document.querySelectorAll("#tbl th[data-k]").forEach((th) => {
      th.tabIndex = 0;
      const go = () => { const k = th.dataset.k; state.asc = state.sort === k ? !state.asc : k === "name" || k === "provider"; state.sort = k; renderTable(); };
      th.addEventListener("click", go);
      th.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
    const toggleRow = (set, id, redraw) => { set.has(id) ? set.delete(id) : set.add(id); redraw(); };
    $("#tbl tbody").addEventListener("click", (e) => {
      if (e.target.closest("input")) return;
      const tr = e.target.closest("tr[data-row]");
      if (tr) toggleRow(state.open, tr.dataset.row, renderTable);
    });
    $("#tbl tbody").addEventListener("keydown", (e) => {
      const tr = e.target.closest && e.target.closest("tr[data-row]");
      if (tr && e.target === tr && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggleRow(state.open, tr.dataset.row, renderTable); }
    });
    $("#tbl tbody").addEventListener("change", (e) => {
      const id = e.target.dataset.id;
      if (!id) return;
      if (e.target.checked) {
        if (state.picked.length >= 4) { e.target.checked = false; return; }
        state.picked.push(id);
      } else state.picked = state.picked.filter((x) => x !== id);
      renderCompare();
    });
  }

  // ---- Matriz de comparación por gama ----
  const mx = { tier: "alta", sort: "price_in", asc: false, open: new Set() };
  const blend = (m) => (m.price_in * 3 + m.price_out) / 4;
  function currentModels() {
    const groups = {};
    models.filter((m) => isMajor(m) && m.price_in > 0 && m.price_out > 0 && daysAgo(m.created) <= 150)
      .forEach((m) => { (groups[family(m)] = groups[family(m)] || []).push(m); });
    return Object.values(groups).map((g) => g.sort((a, b) => b.created.localeCompare(a.created))[0]).map((m) => ({ ...m, blend: blend(m) }));
  }
  function renderMatrix() {
    const all = currentModels().sort((a, b) => b.blend - a.blend);
    const third = Math.ceil(all.length / 3);
    const tiers = { alta: all.slice(0, third), media: all.slice(third, third * 2), eco: all.slice(third * 2), todos: all };
    const rows = [...tiers[mx.tier]];
    const k = mx.sort, dir = mx.asc ? 1 : -1;
    rows.sort((a, b) => {
      const x = a[k], y = b[k];
      return (typeof x === "string" ? x.localeCompare(y) : (x === y ? 0 : x - y)) * dir;
    });
    const range = (key) => { const v = rows.map((r) => r[key]).filter((n) => typeof n === "number"); return [Math.min(...v), Math.max(...v)]; };
    const heat = (val, key, higherBetter) => {
      const [lo, hi] = range(key);
      if (hi === lo) return "";
      const score = higherBetter ? (val - lo) / (hi - lo) : (hi - val) / (hi - lo);
      return ` style="background-color:color-mix(in srgb, var(--green) ${Math.round(score * 46)}%, transparent)"`;
    };
    const yn = (v) => (v ? `<span class="yes">${ico("circle-check")}Sí</span>` : `<span class="no">${ico("circle-x")}No</span>`);
    const dist = distinguish(rows);
    $("#matrix tbody").innerHTML = rows.map((m) => {
      const open = mx.open.has(m.id);
      return `<tr data-row="${esc(m.id)}" class="${open ? "open" : ""}" aria-expanded="${open}"${tipAttr(modelTip(m))}>
      <td class="nm">${chev(open)}${provTag(m.provider)}<br><b>${esc(m.name.replace(/^[^:]+: /, ""))}</b><small>${esc(fmtDate(m.created))}</small></td>
      <td class="num hm"${heat(m.price_in, "price_in", false)}>${esc(fmtPrice(m.price_in))}</td>
      <td class="num hm"${heat(m.price_out, "price_out", false)}>${esc(fmtPrice(m.price_out))}</td>
      <td class="num hm"${heat(m.blend, "blend", false)}>${esc(fmtPrice(m.blend))}</td>
      <td class="num hm"${heat(m.context, "context", true)}>${esc(fmtCtx(m.context))}</td>
      <td>${yn(m.multimodal)}</td><td>${yn(m.reasoning)}</td><td>${useChips(m, dist.get(m.id))}</td></tr>${open ? detailRow(m, 8, rows) : ""}`;
    }).join("") || '<tr><td colspan="8" class="muted">No hay modelos en esta gama.</td></tr>';
    const lim = (a) => (a.length ? `$${Math.min(...a.map((m) => m.blend)).toFixed(2)} a $${Math.max(...a.map((m) => m.blend)).toFixed(2)}` : "");
    $("#mx-count").textContent = rows.length + " modelos";
    $("#mx-note").textContent = mx.tier === "todos" ? "Gamas por precio mixto: alta " + lim(tiers.alta) + ", media " + lim(tiers.media) + ", económicos " + lim(tiers.eco) + " por millón de tokens."
      : "Esta gama abarca " + lim(tiers[mx.tier]) + " de precio mixto por millón de tokens (3 partes de entrada y 1 de salida). Un modelo por familia, el más reciente.";
    document.querySelectorAll("#mx-tier button").forEach((b) => b.classList.toggle("on", b.dataset.t === mx.tier));
    document.querySelectorAll("#matrix th[data-k]").forEach((th) => { const on = th.dataset.k === k; th.classList.toggle("sorted", on); th.classList.toggle("asc", on && mx.asc); });
  }
  function initMatrix() {
    document.querySelectorAll("#mx-tier button").forEach((b) => b.addEventListener("click", () => { mx.tier = b.dataset.t; renderMatrix(); }));
    document.querySelectorAll("#matrix th[data-k]").forEach((th) => {
      th.tabIndex = 0;
      const go = () => { const k = th.dataset.k; mx.asc = mx.sort === k ? !mx.asc : k === "name" || k === "price_in" || k === "price_out" || k === "blend"; mx.sort = k; renderMatrix(); };
      th.addEventListener("click", go);
      th.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
    const tb = $("#matrix tbody");
    const flip = (id) => { mx.open.has(id) ? mx.open.delete(id) : mx.open.add(id); renderMatrix(); };
    tb.addEventListener("click", (e) => { const tr = e.target.closest("tr[data-row]"); if (tr) flip(tr.dataset.row); });
    tb.addEventListener("keydown", (e) => { const tr = e.target.closest && e.target.closest("tr[data-row]"); if (tr && e.target === tr && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); flip(tr.dataset.row); } });
    renderMatrix();
  }

  // ---- Panel de noticias ----
  const TOPIC_NAMES = { modelos: "Modelos y lanzamientos", productos: "Productos y aplicaciones", negocios: "Negocios y mercado", seguridad: "Seguridad y regulación",
    investigacion: "Investigación", infra: "Chips e infraestructura", general: "General" };
  const TOPIC_COLORS = { modelos: C.cyan, productos: C.green, negocios: C.amber, seguridad: C.pink, investigacion: C.violet, infra: C.blue, general: "#94a3b8" };
  const TOPIC_ICONS = { modelos: "rocket", productos: "app-window", negocios: "briefcase", seguridad: "shield-check", investigacion: "flask-conical", infra: "cpu", general: "globe" };
  const news = { items: [], period: 7, q: "", topic: "", source: "", day: "", shown: 12 };
  const NEWS_KEY = { xai: "x-ai" };
  const pad2 = (n) => String(n).padStart(2, "0");
  const dayKey = (d) => d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  const ageDays = (iso) => {
    const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
    return Math.round((day(new Date()) - day(new Date(iso))) / 864e5);
  };
  const tTitle = (n) => n.title_es || n.title;
  const tSummary = (n) => (n.title_es ? n.summary_es : n.summary) || "";
  const topicOf = (n) => (TOPIC_NAMES[n.topic] ? n.topic : "general");
  function newsIcon(n) {
    const k = NEWS_KEY[n.provider] || n.provider;
    return PROV[k] ? provIcon(k) : `<span class="pi mono" aria-hidden="true">${esc(n.source[0])}</span>`;
  }
  function relLabel(iso) {
    const d = ageDays(iso);
    if (d <= 0) return ["Hoy", "hoy"];
    if (d === 1) return ["Ayer", "ayer"];
    if (d < 7) return ["Esta semana", "hace " + d + " días"];
    return ["Antes", "hace " + d + " días"];
  }
  // Aplica los filtros activos; "skip" omite una dimensión para que su propio gráfico muestre todas las opciones.
  function newsFiltered(...skip) {
    const q = news.q.trim().toLowerCase();
    return news.items.filter((n) => {
      if (!skip.includes("period") && ageDays(n.published) >= news.period) return false;
      if (!skip.includes("topic") && news.topic && topicOf(n) !== news.topic) return false;
      if (!skip.includes("source") && news.source && n.source !== news.source) return false;
      if (!skip.includes("day") && news.day && dayKey(new Date(n.published)) !== news.day) return false;
      if (q && !(tTitle(n) + " " + n.title + " " + tSummary(n) + " " + n.source).toLowerCase().includes(q)) return false;
      return true;
    });
  }
  function toggle(key, val) { news[key] = news[key] === val ? "" : val; news.shown = 12; renderNewsPanel(); }
  const pointer = (e, els) => { if (e.native) e.native.target.style.cursor = els.length ? "pointer" : "default"; };

  function renderNewsCharts() {
    // Por día
    const span = Math.min(30, Math.max(7, news.period));
    const keys = [], labels = [];
    for (let i = span - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); keys.push(dayKey(d)); labels.push(d.toLocaleDateString("es-PE", { day: "2-digit", month: "short" })); }
    const byDay = keys.map(() => 0);
    const base = newsFiltered("period", "day");
    base.forEach((n) => { const i = keys.indexOf(dayKey(new Date(n.published))); if (i >= 0) byDay[i]++; });
    draw("c-n-day", { type: "bar", data: { labels, datasets: [{ data: byDay, backgroundColor: keys.map((k) => (!news.day || k === news.day ? C.cyan : C.cyan + "44")), borderRadius: 6 }] },
      options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } }, y: { beginAtZero: true, ticks: { precision: 0 } } },
        onClick: (e, els) => { if (els.length) toggle("day", keys[els[0].index]); }, onHover: pointer } });

    // Por tema
    const tc = {};
    newsFiltered("topic").forEach((n) => { tc[topicOf(n)] = (tc[topicOf(n)] || 0) + 1; });
    const tk = Object.keys(tc).sort((a, b) => tc[b] - tc[a]);
    draw("c-n-topic", { type: "doughnut", data: { labels: tk.map((k) => TOPIC_NAMES[k]), datasets: [{ data: tk.map((k) => tc[k]), borderWidth: 0,
        backgroundColor: tk.map((k) => (!news.topic || k === news.topic ? TOPIC_COLORS[k] : TOPIC_COLORS[k] + "44")) }] },
      options: { cutout: "58%", plugins: { legend: { position: "right", labels: { boxWidth: 10, font: { size: 11 } } } },
        onClick: (e, els) => { if (els.length) toggle("topic", tk[els[0].index]); }, onHover: pointer } });

    // Por fuente
    const sc = {};
    newsFiltered("source").forEach((n) => { sc[n.source] = (sc[n.source] || 0) + 1; });
    const sk = Object.keys(sc).sort((a, b) => sc[b] - sc[a]).slice(0, 6);
    draw("c-n-src", { type: "bar", data: { labels: sk, datasets: [{ data: sk.map((k) => sc[k]), borderRadius: 8,
        backgroundColor: sk.map((k) => (!news.source || k === news.source ? C.violet : C.violet + "44")) }] },
      options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { grid: { display: false }, ticks: { autoSkip: false, font: { size: 11 } } } },
        onClick: (e, els) => { if (els.length) toggle("source", sk[els[0].index]); }, onHover: pointer } });
  }

  // Carrusel reutilizable: avanza solo, se detiene con el cursor encima, con el foco dentro o con el botón de pausa.
  function createCarousel(track, ctrl, gap, interval) {
    const st = { page: 0, pages: 1, per: 1, paused: window.matchMedia("(prefers-reduced-motion: reduce)").matches, hover: false };
    ctrl.innerHTML = `<button class="c-prev" aria-label="Anterior">${ico("chevron-left")}</button><div class="dots" role="tablist" aria-label="Páginas"></div><span class="c-count" aria-live="off"></span>` +
      `<button class="c-next" aria-label="Siguiente">${ico("chevron-right")}</button><button class="c-play"></button>`;
    const q = (sel) => ctrl.querySelector(sel);
    const items = () => [...track.children];
    function measure() {
      const cs = items();
      if (!cs.length) { st.per = 1; st.pages = 1; return; }
      st.per = Math.max(1, Math.round((track.clientWidth + gap) / (cs[0].offsetWidth + gap)));
      st.pages = Math.max(1, Math.ceil(cs.length / st.per));
    }
    function draw() {
      q(".dots").innerHTML = Array.from({ length: st.pages }, (_, i) =>
        `<button role="tab" class="${i === st.page ? "on" : ""}" aria-selected="${i === st.page}" aria-label="Página ${i + 1} de ${st.pages}" data-i="${i}"></button>`).join("");
      q(".c-count").textContent = (st.page + 1) + " / " + st.pages;
      ctrl.hidden = st.pages <= 1;
    }
    function go(page, smooth) {
      measure();
      st.page = ((page % st.pages) + st.pages) % st.pages;
      const c = items()[st.page * st.per];
      if (c) track.scrollTo({ left: c.offsetLeft - track.offsetLeft, behavior: smooth === false ? "auto" : "smooth" });
      draw();
    }
    function setPaused(p) {
      st.paused = p;
      const b = q(".c-play");
      b.innerHTML = ico(p ? "play" : "pause");
      b.setAttribute("aria-label", p ? "Reanudar el avance automático" : "Pausar el avance automático");
    }
    let timer;
    const restart = () => { clearInterval(timer); timer = setInterval(() => { if (!st.paused && !st.hover && !document.hidden) go(st.page + 1); }, interval); };
    setPaused(st.paused);
    q(".c-prev").addEventListener("click", () => { go(st.page - 1); restart(); });
    q(".c-next").addEventListener("click", () => { go(st.page + 1); restart(); });
    q(".c-play").addEventListener("click", () => setPaused(!st.paused));
    q(".dots").addEventListener("click", (e) => { const i = e.target.dataset && e.target.dataset.i; if (i != null) { go(+i); restart(); } });
    const box = track.parentElement.parentElement;
    ["mouseenter", "focusin"].forEach((ev) => box.addEventListener(ev, () => { st.hover = true; }));
    ["mouseleave", "focusout"].forEach((ev) => box.addEventListener(ev, () => { st.hover = false; }));
    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); go(st.page + 1); } else if (e.key === "ArrowLeft") { e.preventDefault(); go(st.page - 1); }
    });
    let t;
    track.addEventListener("scroll", () => {  // sincroniza los puntos cuando se desliza con el dedo o la rueda
      clearTimeout(t);
      t = setTimeout(() => {
        measure();
        const p = Math.min(st.pages - 1, Math.round(track.scrollLeft / (track.clientWidth + gap)));
        if (p !== st.page) { st.page = p; draw(); }
      }, 120);
    }, { passive: true });
    window.addEventListener("resize", () => go(st.page, false));
    restart();
    return { reset() { track.scrollLeft = 0; go(0, false); } };
  }
  let newsCar = null;

  function renderNewsList() {
    const list = newsFiltered();
    const box = $("#news");
    const active = [news.topic && TOPIC_NAMES[news.topic], news.source, news.day && fmtDate(news.day), news.q && "«" + news.q + "»"].filter(Boolean);
    $("#news-sub").textContent = list.length + (list.length === 1 ? " noticia" : " noticias") + (active.length ? " con: " + active.join(" · ") : "") +
      ". Titulares traducidos al español, con enlace a la fuente original.";
    $("#n-reset").hidden = !(news.topic || news.source || news.day || news.q);
    if (!list.length) {
      box.innerHTML = '<p class="news-empty" style="width:100%">No hay noticias con estos filtros. Prueba ampliar el periodo o quitar filtros.</p>';
      if (newsCar) newsCar.reset();
      return;
    }
    box.innerHTML = list.slice(0, 30).map((n) => {
      const [, rel] = relLabel(n.published);
      const tp = topicOf(n);
      const when = new Date(n.published).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
      const ntip = [n.title_es ? "Título original" : "Noticia en inglés", n.title, `${n.source} · ${when}`, "Clic para leer la fuente"].join("\n");
      return `<article class="news-card fx" style="--a:${TOPIC_COLORS[tp]}"${tipAttr(ntip)}><div class="news-src"><span class="provtag">${newsIcon(n)}<span>${esc(n.source)}</span></span><time datetime="${esc(n.published)}" title="${esc(when)}">${esc(rel)}</time></div>
        <a class="t" href="${esc(n.link)}" target="_blank" rel="noopener noreferrer">${esc(tTitle(n))}</a>${tSummary(n) ? `<p>${esc(tSummary(n))}</p>` : ""}
        <div class="chips"><span class="chip tp" style="color:${TOPIC_COLORS[tp]}">${ico(TOPIC_ICONS[tp])}${esc(TOPIC_NAMES[tp])}</span>${n.title_es ? "" : `<span class="chip">${ico("languages")}Original en inglés</span>`}</div></article>`;
    }).join("");
    if (newsCar) newsCar.reset();
  }

  function renderNewsPanel() {
    document.querySelectorAll("#n-period button").forEach((b) => b.classList.toggle("on", +b.dataset.p === news.period));
    renderNewsCharts();
    renderNewsList();
  }

  function initNews(data) {
    news.items = (data && data.items) || [];
    if (!news.items.length) {
      $("#news-ctrl").hidden = true;
      $("#news").innerHTML = '<p class="news-empty" style="width:100%">Aún no hay noticias cargadas. Aparecerán en la próxima actualización de datos.</p>';
      return;
    }
    // Si hoy no hay noticias, parte del periodo de 7 días; si hay muchas hoy, igualmente se ve el contexto semanal.
    document.querySelectorAll("#n-period button").forEach((b) => b.addEventListener("click", () => { news.period = +b.dataset.p; news.day = ""; news.shown = 12; renderNewsPanel(); }));
    $("#n-q").addEventListener("input", (e) => { news.q = e.target.value; news.shown = 12; renderNewsPanel(); });
    $("#n-reset").addEventListener("click", () => { news.topic = news.source = news.day = news.q = ""; $("#n-q").value = ""; news.shown = 12; renderNewsPanel(); });
    newsCar = createCarousel($("#news"), $("#news-ctrl"), 16, 6000);
    renderNewsPanel();
  }

  // ---- Banner de destacados ----
  function renderHero(meta, fr) {
    const slides = [];
    const link = (href, txt, ext = "") => `<a class="cta" href="${href}"${ext}>${txt}${ico("arrow-right")}</a>`;
    const slide = (acc, ic, k, body, long = false) => ({ acc, long, html: `<span class="bgi">${ico(ic)}</span><div class="k">${ico(ic)}${esc(k)}</div>${body}` });
    const head = $("#headline").textContent;
    const lt = fr && fr.latest && fr.latest.slice(0, 2);
    if (lt && lt.length === 2) slides.push(slide(C.cyan, "rocket", "Lo último", `<p class="big">${esc(lt[0].name)} y ${esc(lt[1].name)}</p><p class="sm">${esc(lt[0].name)} salió el ${esc(fmtDate(lt[0].date))} y ${esc(lt[1].name)} el ${esc(fmtDate(lt[1].date))}. Fechas, precios y fuentes en la sección.</p>${link("#ultimo", "Ver lo último")}`));
    if (head) slides.push(slide(C.violet, "sparkles", "Resumen de hoy", `<p class="big">${esc(head)}</p>${link("#lanzamientos", "Ver qué cambió")}`, head.length > 110));
    const top = news.items.find((n) => n.kind === "lab" && ageDays(n.published) <= 1) || news.items[0];
    if (top) slides.push(slide(C.cyan, "newspaper", "Noticia destacada", `<p class="big">${esc(tTitle(top))}</p><span class="tg">${newsIcon(top)}<span>${esc(top.source)} · ${esc(relLabel(top.published)[1])}</span></span>${link(esc(top.link), "Leer la fuente", ' target="_blank" rel="noopener noreferrer"')}`, tTitle(top).length > 90));
    const cut = versionPairs(models.filter(isMajor)).filter((p) => p.dIn != null && p.dIn <= -10).sort((x, y) => x.dIn - y.dIn)[0];
    if (cut) slides.push(slide(C.green, "coins", "Mayor recorte de precio", `<p class="big">${esc(cut.cur.name)}: ${cut.dIn}% en el precio de entrada</p><p class="sm">De ${esc(fmtPrice(cut.prev.price_in))} a ${esc(fmtPrice(cut.cur.price_in))} por millón de tokens frente a ${esc(cut.prev.name.replace(/^[^:]+: /, ""))}.</p>${link("#lanzamientos", "Ver qué cambió")}`));
    const cm = currentModels();
    if (cm.length) slides.push(slide(C.pink, "table-2", "Matriz de comparación", `<p class="big">${cm.length} modelos comparables en tres gamas de precio</p><p class="sm">Gama alta, media y económicos, con el mejor valor de cada criterio resaltado.</p>${link("#matriz", "Abrir la matriz")}`));
    const box = $("#hero-track");
    if (!slides.length) { box.closest(".hero-car").hidden = true; return; }
    box.innerHTML = slides.map((x) => `<article class="slide fx${x.long ? " long" : ""}" style="--a:${x.acc}">${x.html}</article>`).join("");
    createCarousel(box, $("#hero-ctrl"), 0, 7000).reset();
  }

  async function init() {
    theme();
    initEffects();
    const [data, hist, newsData, fr] = await Promise.all([load("data/current/models.json", null), load("history/catalog.json", []), load("data/current/news.json", null), load("data/current/frontier.json", null)]);
    initNews(newsData);
    if (!data || !data.models) { $("#status-text").textContent = "Sin datos"; return; }
    allCount = data.models.length;
    models = baseModels(data.models);
    renderStatus(data.meta);
    renderKpis(data.meta, hist);
    renderInsights(data.meta);
    renderVersions();
    initMatrix();
    renderHero(data.meta, fr);
    renderCharts(hist);
    renderHF(data.hf || []);
    bindTable();
    renderTable();
    // Se comparte con otras secciones (infografía semanal) sin duplicar lógica.
    window.IAR = { models, news, meta: data.meta, hist, esc, ico, nf, C, draw, countUp, fmtPrice, fmtCtx, fmtDate, daysAgo, ageDays, median, signed, provName, provTag,
      tTitle, topicOf, TOPIC_NAMES, TOPIC_COLORS, TOPIC_ICONS, relLabel, newsIcon, tipAttr, versionPairs, isMajor, currentModels, family, dayKey };
    document.dispatchEvent(new CustomEvent("iar:ready"));
  }
  init();
})();
