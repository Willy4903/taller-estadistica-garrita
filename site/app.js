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

  const C = { cyan: "#22d3ee", violet: "#a78bfa", pink: "#f472b6", green: "#34d399", amber: "#fbbf24" };
  const charts = {};
  function theme() {
    const s = getComputedStyle(document.documentElement);
    Chart.defaults.color = s.getPropertyValue("--muted").trim();
    Chart.defaults.borderColor = s.getPropertyValue("--line").trim();
    Chart.defaults.font.family = "system-ui, sans-serif";
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.plugins.legend.labels.boxWidth = 12;
  }
  function draw(id, cfg) {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart($("#" + id), cfg);
  }

  async function load(path, fallback) {
    try {
      const r = await fetch(path + "?v=" + Date.now());
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } catch (e) { return fallback; }
  }

  let models = [], state = { sort: "created", asc: false, shown: 25, picked: [] };

  function renderStatus(meta) {
    const upd = new Date(meta.updated_at);
    const hours = (Date.now() - upd) / 36e5;
    const st = $("#status");
    st.classList.toggle("stale", hours > 36);
    $("#status-text").textContent = "Actualizado " + upd.toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: meta.timezone });
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
    const provs = new Set(recent.map((m) => m.provider));
    const prev = hist.length > 1 ? hist[hist.length - 2] : null;
    const delta = prev ? models.length - prev.total : null;
    const items = [
      [nf.format(models.length), "modelos en el catálogo" + (delta ? " (" + (delta > 0 ? "+" : "") + delta + " vs. ayer)" : "")],
      [nf.format(recent.length), "lanzados en los últimos 30 días"],
      [nf.format(provs.size), "proveedores activos en 30 días"],
      [prices.length ? "$" + median(prices).toFixed(2) : "n/d", "precio mediano de entrada por millón de tokens (180 días)"],
    ];
    $("#kpis").innerHTML = items.map(([v, l]) => `<div class="kpi"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join("");
  }

  function chips(m, isNew) {
    const c = [];
    if (isNew) c.push('<span class="chip nw">NUEVO</span>');
    if (m.multimodal) c.push('<span class="chip mm">Multimodal</span>');
    if (m.reasoning) c.push('<span class="chip rs">Razonamiento</span>');
    if (m.price_in === 0 && m.price_out === 0) c.push('<span class="chip fr">Gratis</span>');
    return c.join("");
  }

  function renderLatest(meta) {
    $("#latest").innerHTML = models.slice(0, 12).map((m) => {
      const isNew = !meta.sample && daysAgo(m.first_seen) <= 2 && m.first_seen !== m.created;
      return `<article class="card"><div class="prov">${provTag(m.provider)}</div><h4>${esc(m.name)}</h4>
        <div class="meta"><span>${esc(fmtDate(m.created))}</span><span>Contexto <b>${esc(fmtCtx(m.context))}</b></span>
        <span>Entrada <b>${esc(fmtPrice(m.price_in))}</b></span><span>Salida <b>${esc(fmtPrice(m.price_out))}</b></span></div>
        <div class="chips">${chips(m, isNew)}</div></article>`;
    }).join("");
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
      { label: "Texto", data: txt, backgroundColor: C.violet, borderRadius: 4 },
      { label: "Multimodal", data: mm, backgroundColor: C.cyan, borderRadius: 4 }] },
      options: { scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } } } });

    // Proveedores 90 días
    const cnt = {};
    models.filter((m) => daysAgo(m.created) <= 90).forEach((m) => { cnt[m.provider] = (cnt[m.provider] || 0) + 1; });
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 10);
    draw("c-providers", { type: "bar", data: { labels: top.map((t) => provName(t[0])), datasets: [{ data: top.map((t) => t[1]), backgroundColor: C.cyan, borderRadius: 4 }] },
      options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { grid: { display: false } } } } });

    // Precio vs contexto
    const pts = models.filter((m) => daysAgo(m.created) <= 180 && m.price_in > 0 && m.context > 0);
    const ds = (list, lbl, col) => ({ label: lbl, backgroundColor: col + "cc", pointRadius: 5, pointHoverRadius: 7, data: list.map((m) => ({ x: m.context, y: m.price_in, n: m.name })) });
    draw("c-scatter", { type: "scatter", data: { datasets: [ds(pts.filter((m) => !m.reasoning), "Estándar", C.violet), ds(pts.filter((m) => m.reasoning), "Razonamiento", C.pink)] },
      options: { scales: {
        x: { type: "logarithmic", title: { display: true, text: "Contexto (tokens)" }, ticks: { callback: (v) => (isPow10(v) ? fmtCtx(v) : "") } },
        y: { type: "logarithmic", title: { display: true, text: "USD por millón de tokens (entrada)" }, ticks: { callback: (v) => (isPow10(v) ? "$" + v : "") } } },
        plugins: { tooltip: { callbacks: { label: (c) => c.raw.n + ": " + fmtCtx(c.raw.x) + " · $" + c.raw.y } } } } });

    // Historial
    const ok = hist.length > 1;
    $("#hist-empty").hidden = ok;
    $("#c-history").parentElement.hidden = !ok;
    if (ok) draw("c-history", { type: "line", data: { labels: hist.map((h) => fmtDate(h.date)), datasets: [
      { label: "Modelos en catálogo", data: hist.map((h) => h.total), borderColor: C.cyan, backgroundColor: C.cyan + "33", tension: .3, yAxisID: "y", fill: true },
      { label: "Precio mediano entrada ($/M)", data: hist.map((h) => h.median_price_in), borderColor: C.amber, tension: .3, yAxisID: "y1" }] },
      options: { interaction: { mode: "index", intersect: false }, scales: { y: { position: "left", title: { display: true, text: "Modelos" } }, y1: { position: "right", grid: { drawOnChartArea: false }, title: { display: true, text: "USD/M" } } } } });
  }

  function renderHF(hf) {
    const top = hf.slice(0, 10);
    draw("c-hf", { type: "bar", data: { labels: top.map((m) => m.id.split("/").pop()), datasets: [{ data: top.map((m) => m.downloads), backgroundColor: C.violet, borderRadius: 4 }] },
      options: { indexAxis: "y", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => nf.format(c.raw) + " descargas" } } }, scales: { x: { ticks: { callback: (v) => fmtAxis(v) } }, y: { grid: { display: false } } } } });
    $("#hf-list").innerHTML = hf.slice(0, 15).map((m, i) =>
      `<li><a href="https://huggingface.co/${encodeURI(m.id)}" target="_blank" rel="noopener">${i + 1}. ${esc(m.id)}</a><span>${esc(nf.format(m.downloads))} desc. · ${esc(nf.format(m.likes))} likes</span></li>`).join("");
  }

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
    $("#tbl tbody").innerHTML = rows.slice(0, state.shown).map((m) => `<tr>
      <td><input type="checkbox" data-id="${esc(m.id)}" aria-label="Comparar ${esc(m.name)}" ${state.picked.includes(m.id) ? "checked" : ""}></td>
      <td class="nm">${esc(m.name)}<small>${esc(m.id)}</small></td><td>${provTag(m.provider)}</td><td>${esc(fmtDate(m.created))}</td>
      <td class="num">${esc(fmtCtx(m.context))}</td><td class="num">${esc(fmtPrice(m.price_in))}</td><td class="num">${esc(fmtPrice(m.price_out))}</td>
      <td><div class="chips" style="margin:0">${chips(m, false)}</div></td></tr>`).join("");
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
      { label: "Entrada", data: sel.map((m) => m.price_in), backgroundColor: C.cyan, borderRadius: 4 },
      { label: "Salida", data: sel.map((m) => m.price_out), backgroundColor: C.violet, borderRadius: 4 }] },
      options: { scales: { y: { beginAtZero: true, ticks: { callback: (v) => "$" + v } }, x: { grid: { display: false } } } } });
    draw("c-cmp-ctx", { type: "bar", data: { labels, datasets: [{ data: sel.map((m) => m.context), backgroundColor: sel.map((_, i) => cols[i]), borderRadius: 4 }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: (v) => fmtAxis(v) } }, x: { grid: { display: false } } } } });
    const row = (l, f) => `<tr><th scope="row">${l}</th>${sel.map((m) => `<td>${f(m)}</td>`).join("")}</tr>`;
    $("#cmp-table").innerHTML = row("Modelo", (m) => esc(m.name)) + row("Proveedor", (m) => provTag(m.provider)) + row("Lanzamiento", (m) => esc(fmtDate(m.created))) +
      row("Contexto", (m) => esc(fmtCtx(m.context))) + row("Entrada $/M", (m) => esc(fmtPrice(m.price_in))) + row("Salida $/M", (m) => esc(fmtPrice(m.price_out))) +
      row("Multimodal", (m) => (m.multimodal ? "Sí (" + esc(m.inputs.join(", ")) + ")" : "No")) + row("Razonamiento", (m) => (m.reasoning ? "Sí" : "No"));
  }

  function bindTable() {
    const provs = [...new Set(models.map((m) => m.provider))].sort();
    $("#prov").insertAdjacentHTML("beforeend", provs.map((p) => `<option value="${esc(p)}">${esc(provName(p))}</option>`).join(""));
    ["#q", "#prov", "#flt"].forEach((s) => $(s).addEventListener("input", () => { state.shown = 25; renderTable(); }));
    $("#more").addEventListener("click", () => { state.shown += 50; renderTable(); });
    document.querySelectorAll("#tbl th[data-k]").forEach((th) => {
      th.tabIndex = 0;
      const go = () => { const k = th.dataset.k; state.asc = state.sort === k ? !state.asc : k === "name" || k === "provider"; state.sort = k; renderTable(); };
      th.addEventListener("click", go);
      th.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
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

  async function init() {
    theme();
    const [data, hist] = await Promise.all([load("data/latest.json", null), load("data/history.json", [])]);
    if (!data || !data.models) { $("#status-text").textContent = "Sin datos"; return; }
    models = data.models;
    renderStatus(data.meta);
    renderKpis(data.meta, hist);
    renderLatest(data.meta);
    renderCharts(hist);
    renderHF(data.hf || []);
    bindTable();
    renderTable();
  }
  init();
})();
