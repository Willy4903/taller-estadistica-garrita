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
  applyTheme(savedTheme || "dark");

  /* ---------- cabecera y pie ---------- */
  const NAV = [["#hoy", "Hoy"], ["#modelos", "Modelos"], ["#uso", "Uso"], ["#aprende", "Aprende"], ["#promptlab", "Prompt Lab"], ["#agentes", "Agentes"], ["#responsable", "IA responsable"], ["#peru", "Perú"], ["glosario.html", "Glosario"], ["#fuentes", "Fuentes"]];
  function chrome() {
    const h = $("#site-header");
    if (h) {
      const orb = `<a class="logo-orb" href="${href(home ? "#top" : "index.html")}" aria-label="IA Radar, inicio"><span class="orb"><i></i><i></i><i></i><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="32" cy="32" r="11" fill="none" stroke="currentColor" stroke-width="2" opacity=".6"/><path d="M32 32 L50 17" stroke="var(--accent)" stroke-width="3.5" stroke-linecap="round"/><circle cx="32" cy="32" r="3.4" fill="var(--accent)"/></svg><b>IA Radar</b></span></a>`;
      const link = ([h2, t]) => `<a href="${href(h2)}">${esc(t)}</a>`;
      h.innerHTML = `<div class="wrap wide hd">
        <a class="logo" href="${href(home ? "#top" : "index.html")}" aria-label="IA Radar, inicio"><svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" stroke-width="2" opacity=".55"/><path d="M16 16 L26 9" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/><circle cx="16" cy="16" r="2.4" fill="var(--accent)"/></svg><span>IA Radar</span></a>
        <nav class="nav" id="nav" aria-label="Secciones"><div class="ng">${NAV.slice(0, 6).map(link).join("")}</div>${orb}<div class="ng">${NAV.slice(6).map(link).join("")}<a class="nav-cta" href="${href("#sigue")}" data-track="clic_especializate_nav">Especialízate</a></div></nav>
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


  /* ---------- botones flotantes: volver al inicio y mapa de secciones ---------- */
  const SECS = [["#top", "Inicio"], ["#hoy", "01 · Hoy en IA"], ["#cambios", "02 · Qué cambió"], ["#modelos", "03 · Radar de modelos"], ["#uso", "04 · Qué está usando la gente"], ["#aprende", "05 · Aprende en 5 minutos"], ["#promptlab", "06 · Prompt Lab"], ["#agentes", "07 · De prompts a agentes"], ["#responsable", "08 · Usa IA con criterio"], ["#peru", "09 · IA en Perú"], ["#nivel", "10 · ¿En qué nivel estás?"], ["#sigue", "11 · Sigue aprendiendo"], ["#fuentes", "Fuentes y metodología"]];
  const MORE = [["glosario.html", "Glosario de IA"], ["modelos.html", "Catálogo de modelos"], ["responsable.html", "IA responsable y normativa"]];
  function fab() {
    const el = document.createElement("div");
    el.className = "fab"; el.id = "fab"; el.hidden = true;
    const li = ([h, t]) => `<li><a href="${h === "#top" && !home ? ROOT + "index.html" : href(h)}" data-h="${h}">${esc(t)}</a></li>`;
    el.innerHTML = `<nav class="fab-panel" id="fab-panel" aria-label="Todas las secciones" hidden><p class="fab-t">Todas las secciones</p><ol>${SECS.map(li).join("")}</ol><p class="fab-t">Más páginas</p><ol>${MORE.map(li).join("")}</ol></nav>
      <button type="button" class="fab-b" id="fab-menu" aria-expanded="false" aria-controls="fab-panel">${ico("list")}<span>Secciones</span></button>
      <button type="button" class="fab-b fab-top" id="fab-top" aria-label="Volver al inicio de la página">${ico("arrow-up")}<span>Inicio</span></button>`;
    document.body.appendChild(el);
    const panel = $("#fab-panel", el), menu = $("#fab-menu", el);
    const close = () => { panel.hidden = true; menu.setAttribute("aria-expanded", "false"); };
    menu.addEventListener("click", () => { const o = panel.hidden; panel.hidden = !o; menu.setAttribute("aria-expanded", String(o)); if (o) track("fab_secciones"); });
    $("#fab-top", el).addEventListener("click", () => { track("fab_inicio"); close(); window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); });
    panel.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
    document.addEventListener("click", (e) => { if (!el.contains(e.target)) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { close(); menu.focus(); } });
    const upd = () => { el.hidden = scrollY < 360; if (el.hidden) close(); };
    addEventListener("scroll", upd, { passive: true }); upd();
    if (home && "IntersectionObserver" in window) {
      const links = $$("a[data-h]", panel);
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.classList.toggle("on", a.dataset.h === "#" + e.target.id)); }), { rootMargin: "-30% 0px -65% 0px" });
      SECS.forEach(([h]) => { const s = h !== "#top" && $(h); if (s) io.observe(s); });
    }
  }

  /* ---------- barra lateral (escritorio) ---------- */
  const SIDE = [
    { g: "", items: [["#top", "Inicio", "house"]] },
    { g: "Actualidad y datos", items: [["#hoy", "Hoy", "newspaper"], ["#modelos", "Modelos", "cpu"], ["#uso", "Uso", "chart-column"], ["#peru", "Perú", "map-pin"]] },
    { g: "Aprender", items: [["#aprende", "Aprende", "graduation-cap"], ["#promptlab", "Prompt Lab", "flask-conical"], ["#agentes", "Agentes", "bot"], ["glosario.html", "Glosario", "book-open"]] },
    { g: "Confianza", items: [["#responsable", "IA responsable", "shield-check"], ["#fuentes", "Fuentes", "database"]] },
  ];
  function sidebar() {
    const el = document.createElement("aside");
    el.id = "sidebar"; el.setAttribute("aria-label", "Navegación principal");
    const link = ([h, t, ic]) => `<a href="${h === "#top" && !home ? ROOT + "index.html" : href(h)}" data-h="${h}">${ico(ic)}<span>${esc(t)}</span></a>`;
    el.innerHTML = `<a class="sb-logo" href="${home ? "#top" : ROOT + "index.html"}" aria-label="IA Radar, inicio"><span class="orb sm"><i></i><i></i><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="32" cy="32" r="10" fill="none" stroke="currentColor" stroke-width="2.4" opacity=".6"/><path d="M32 32 L50 17" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"/><circle cx="32" cy="32" r="3.6" fill="var(--accent)"/></svg></span><span class="sb-name"><b>IA Radar</b><small>Observatorio de IA</small></span></a>
      <nav class="sb-nav">${SIDE.map((g) => `<div class="sb-g">${g.g ? `<p>${esc(g.g)}</p>` : ""}${g.items.map(link).join("")}</div>`).join("")}</nav>
      <div class="sb-foot"><a class="sb-cta" href="${href("#sigue")}" data-track="clic_especializate_nav">${ico("rocket")}<span>Especialízate</span></a>
        <button type="button" class="sb-theme" id="theme2">${ico("contrast")}<span>Cambiar tema</span></button>
        <p>IA Radar es una iniciativa educativa de WGIA.</p></div>`;
    document.body.prepend(el);
    $("#theme2", el).addEventListener("click", () => $("#theme") && $("#theme").click());
    const pd = document.createElement("div"); pd.className = "progd"; pd.setAttribute("aria-hidden", "true"); document.body.appendChild(pd);
    const on = () => { const m = document.documentElement.scrollHeight - innerHeight; pd.style.transform = `scaleX(${m > 0 ? scrollY / m : 0})`; };
    addEventListener("scroll", on, { passive: true }); on();
    if (home && "IntersectionObserver" in window) {
      const links = $$("a[data-h]", el);
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.classList.toggle("on", a.dataset.h === "#" + e.target.id)); }), { rootMargin: "-30% 0px -65% 0px" });
      links.forEach((a) => { const h = a.dataset.h; const sec = h.startsWith("#") && h !== "#top" && $(h); if (sec) io.observe(sec); });
      const top = $('a[data-h="#top"]', el); if (top) top.classList.add("on");
      addEventListener("scroll", () => { if (scrollY < 300) links.forEach((a) => a.classList.toggle("on", a.dataset.h === "#top")); }, { passive: true });
    } else {
      const here = location.pathname.split("/").pop();
      $$("a[data-h]", el).forEach((a) => { if (a.dataset.h === here) a.classList.add("on"); });
    }
  }

  chrome();
  sidebar();
  fab();
  reveal();
  trackSections();
  document.addEventListener("DOMContentLoaded", () => {});
})();
