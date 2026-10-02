/* IA Radar: núcleo compartido (utilidades, datos, cabecera y pie, tema, analítica respetuosa y progreso). */
(function () {
  "use strict";
  const CONFIG = {
    wgia: "https://wgia.luisito4903.chatgpt.site/",
    // Analítica respetuosa: sin cookies ni identificadores. Solo cuenta eventos agregados.
    // Para centralizarlos, define un endpoint que reciba POST JSON (por ejemplo un contador propio). Vacío = solo en este navegador.
    endpoint: "",
  };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nf = new Intl.NumberFormat("es-PE");
  const fmtCtx = (n) => (!n ? "n/d" : n >= 1e6 ? (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + "M" : Math.round(n / 1e3) + "K");
  const fmtPrice = (p) => (p == null ? "n/d" : p === 0 ? "Gratis" : "$" + (p < 1 ? p.toFixed(3) : p.toFixed(2)));
  const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const fmtDate = (d) => { const x = new Date(d + "T12:00:00"); return String(x.getDate()).padStart(2, "0") + " " + MES[x.getMonth()] + " " + x.getFullYear(); };
  const daysAgo = (d) => Math.floor((Date.now() - new Date(d + "T12:00:00")) / 864e5);
  const ico = (name, cls = "") => `<i class="ui ${cls}" style="--i:url(${new URL(ROOT + "icons/ui/" + name + ".svg", document.baseURI).href})" aria-hidden="true"></i>`;

  const page = document.body.dataset.page || "home";
  const ROOT = document.body.dataset.root || "";   // "" en la raíz, "../" en subcarpetas
  const home = page === "home";
  const href = (h) => (h.startsWith("#") && !home ? ROOT + "index.html" + h : h.startsWith("#") ? h : ROOT + h);

  /* ---------- almacenamiento seguro ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* modo privado */ } },
  };

  /* ---------- datos ---------- */
  const cache = {};
  function load(path, fallback = null) {
    if (!cache[path]) {
      cache[path] = fetch(ROOT + path + "?v=" + (document.body.dataset.v || Date.now())).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(() => fallback);
    }
    return cache[path];
  }

  /* ---------- progreso del recorrido y analítica ---------- */
  const journey = {
    get() { return store.get("iar_journey", {}); },
    mark(k) { const j = this.get(); if (!j[k]) { j[k] = new Date().toISOString().slice(0, 10); store.set("iar_journey", j); document.dispatchEvent(new CustomEvent("iar:journey", { detail: j })); } },
  };
  function track(name, props) {
    const ev = store.get("iar_events", {});
    ev[name] = (ev[name] || 0) + 1;
    store.set("iar_events", ev);
    if (window.dataLayer) window.dataLayer.push({ event: "iar_" + name, ...props });
    if (CONFIG.endpoint && navigator.sendBeacon) {
      try { navigator.sendBeacon(CONFIG.endpoint, JSON.stringify({ e: name, p: props || {}, page, t: Date.now() })); } catch (e) { /* sin red */ }
    }
  }
  function trackSections() {
    if (!("IntersectionObserver" in window)) return;
    const seen = new Set();
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting && !seen.has(e.target.id)) {
        const id = e.target.id;
        setTimeout(() => { if (e.target.getBoundingClientRect().top < innerHeight && !seen.has(id)) { seen.add(id); track("seccion_" + id); journey.mark("leyo_" + id); } }, 1800);
      }
    }), { threshold: 0.35 });
    $$("main section[id]").forEach((s) => io.observe(s));
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-track]");
    if (a) track(a.dataset.track, { to: a.getAttribute("href") });
  });

  /* ---------- tema ---------- */
  function applyTheme(t) { document.documentElement.dataset.theme = t; }
  const savedTheme = store.get("iar_theme", null);
  applyTheme(savedTheme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

  /* ---------- cabecera y pie ---------- */
  const NAV = [["#hoy", "Hoy"], ["#modelos", "Modelos"], ["#uso", "Uso"], ["#aprende", "Aprende"], ["#promptlab", "Prompt Lab"], ["#agentes", "Agentes"], ["#responsable", "IA responsable"], ["#peru", "Perú"], ["glosario.html", "Glosario"], ["#fuentes", "Fuentes"]];
  function chrome() {
    const h = $("#site-header");
    if (h) {
      h.innerHTML = `<div class="wrap hd">
        <a class="logo" href="${href(home ? "#top" : "index.html")}" aria-label="IA Radar, inicio"><svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" stroke-width="2" opacity=".55"/><path d="M16 16 L26 9" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/><circle cx="16" cy="16" r="2.4" fill="var(--accent)"/></svg><span>IA Radar</span></a>
        <nav class="nav" id="nav" aria-label="Secciones">${NAV.map(([h2, t]) => `<a href="${href(h2)}">${esc(t)}</a>`).join("")}<a class="nav-cta" href="${href("#sigue")}" data-track="clic_especializate_nav">Especialízate</a></nav>
        <button class="icon-btn" id="theme" type="button" aria-label="Cambiar entre modo claro y oscuro">${ico("contrast")}</button>
        <button class="icon-btn burger" id="burger" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav">${ico("menu")}</button>
      </div><div class="prog" id="prog" aria-hidden="true"></div>`;
      const nav = $("#nav"), b = $("#burger");
      b.addEventListener("click", () => { const o = nav.classList.toggle("open"); b.setAttribute("aria-expanded", o); b.innerHTML = ico(o ? "x" : "menu"); });
      nav.addEventListener("click", (e) => { if (e.target.closest("a")) { nav.classList.remove("open"); b.setAttribute("aria-expanded", "false"); b.innerHTML = ico("menu"); } });
      $("#theme").addEventListener("click", () => { const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; applyTheme(t); store.set("iar_theme", t); document.dispatchEvent(new CustomEvent("iar:theme")); });
      const prog = $("#prog");
      const onScroll = () => { const m = document.documentElement.scrollHeight - innerHeight; prog.style.transform = `scaleX(${m > 0 ? scrollY / m : 0})`; };
      addEventListener("scroll", onScroll, { passive: true }); onScroll();
      if (home && "IntersectionObserver" in window) {
        const links = $$("#nav a");
        const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id)); }), { rootMargin: "-30% 0px -65% 0px" });
        links.forEach((a) => { const s = a.getAttribute("href").startsWith("#") && $(a.getAttribute("href")); if (s) io.observe(s); });
      }
    }
    const f = $("#site-footer");
    if (f) {
      f.innerHTML = `<div class="wrap ft">
        <div><strong class="ft-t">IA Radar</strong><p>Lo importante de la inteligencia artificial, explicado con datos.</p>
          <p class="ft-sm">IA Radar es una iniciativa educativa de WGIA. <a href="${CONFIG.wgia}" target="_blank" rel="noopener" data-track="clic_instructor">Conoce al instructor</a>.</p></div>
        <div><strong>Explora</strong><ul><li><a href="${href("#hoy")}">Hoy en IA</a></li><li><a href="${href("#modelos")}">Radar de modelos</a></li><li><a href="${ROOT}glosario.html">Glosario</a></li><li><a href="${ROOT}responsable.html">IA responsable y normativa</a></li><li><a href="${href("#fuentes")}">Fuentes y metodología</a></li></ul></div>
        <div><strong>Guías</strong><ul id="ft-guides"></ul></div>
        <div><strong>Privacidad</strong><p class="ft-sm">Sin cookies ni cuentas. Solo se guardan en tu navegador tu tema, tu progreso y contadores de uso anónimos de las herramientas.</p></div>
      </div>`;
      load("content/seo.json", { pages: [] }).then((d) => { const u = $("#ft-guides"); if (u) u.innerHTML = (d.pages || []).slice(0, 6).map((p) => `<li><a href="${ROOT}guias/${p.slug}.html">${esc(p.short || p.title)}</a></li>`).join(""); });
    }
  }

  /* ---------- revelado al hacer scroll ---------- */
  function reveal() {
    const els = $$(".rv");
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return els.forEach((e) => e.classList.add("in"));
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.06 });
    els.forEach((e) => io.observe(e));
  }

  /* ---------- gráficos: tema compartido ---------- */
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const charts = {};
  function chartTheme() {
    if (!window.Chart) return;
    Chart.defaults.color = css("--muted");
    Chart.defaults.borderColor = css("--line");
    Chart.defaults.font.family = '"Inter", system-ui, sans-serif';
    Chart.defaults.font.size = 13;
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 9;
    const tt = Chart.defaults.plugins.tooltip;
    tt.backgroundColor = css("--ink"); tt.titleColor = css("--bg"); tt.bodyColor = css("--bg"); tt.padding = 12; tt.cornerRadius = 8; tt.titleFont = { weight: "700" };
  }
  function draw(id, cfg) {
    const cv = document.getElementById(id);
    if (!cv || !window.Chart) return;
    chartTheme();
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(cv, cfg);
    cv._cfg = cfg;
    return charts[id];
  }
  document.addEventListener("iar:theme", () => { chartTheme(); Object.values(charts).forEach((c) => c.update()); });

  /* ---------- bloque estándar de lectura de un gráfico ---------- */
  // Todo gráfico declara qué mide, qué no mide, de dónde viene y cuándo se obtuvo.
  function chartMeta(m) {
    return `<dl class="cm"><div><dt>Qué mide</dt><dd>${esc(m.mide)}</dd></div><div><dt>Qué no mide</dt><dd>${esc(m.nomide)}</dd></div>
      <div><dt>Fuente</dt><dd>${m.url ? `<a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.fuente)}</a>` : esc(m.fuente)}</dd></div><div><dt>Fecha</dt><dd>${esc(m.fecha || "n/d")}</dd></div></dl>`;
  }
  const lima = (iso) => {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const p = new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d).reduce((o, x) => (o[x.type] = x.value, o), {});
    return `${p.day} ${p.month.replace(".", "").toUpperCase()} ${p.year} · ${p.hour}:${p.minute} PET`;
  };

  const ready = [];
  function onReady(fn) { ready.push(fn); }
  window.IAR = { CONFIG, $, $$, esc, nf, fmtCtx, fmtPrice, fmtDate, daysAgo, ico, load, store, journey, track, draw, chartMeta, lima, css, ROOT, page, home, onReady, href };

  chrome();
  reveal();
  trackSections();
  document.addEventListener("DOMContentLoaded", () => {});
})();
