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
  function chrome() {
    const h = $("#site-header");
    if (h) {
      h.innerHTML = `<div class="wrap wide hd">
        <button class="icon-btn burger" id="burger" type="button" aria-label="Abrir el menú de secciones" aria-expanded="false" aria-controls="sidebar">${ico("menu")}</button>
        <a class="logo" href="${href(home ? "#top" : "index.html")}" aria-label="IA Radar, inicio"><svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" stroke-width="2" opacity=".55"/><path d="M16 16 L26 9" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/><circle cx="16" cy="16" r="2.4" fill="var(--accent)"/></svg><span>IA Radar</span></a>
        <button class="icon-btn" id="theme" type="button" aria-label="Cambiar entre modo claro y oscuro">${ico("contrast")}</button>
      </div><div class="prog" id="prog" aria-hidden="true"></div>`;
      $("#theme").addEventListener("click", () => { const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; applyTheme(t); store.set("iar_theme", t); document.dispatchEvent(new CustomEvent("iar:theme")); });
      const prog = $("#prog");
      const onScroll = () => { const m = document.documentElement.scrollHeight - innerHeight; prog.style.transform = `scaleX(${m > 0 ? scrollY / m : 0})`; };
      addEventListener("scroll", onScroll, { passive: true }); onScroll();
    }
    const f = $("#site-footer");
    if (f) {
      f.innerHTML = `<div class="wrap ft">
        <div><strong class="ft-t">IA Radar</strong><p>Lo importante de la inteligencia artificial, explicado con datos.</p>
          <p class="ft-sm">IA Radar es una iniciativa educativa de WGIA. <a href="${CONFIG.wgia}" target="_blank" rel="noopener" data-track="clic_instructor">Conoce al instructor</a>.</p></div>
        <div><strong>Explora</strong><ul><li><a href="${href("#hoy")}">Hoy en IA</a></li><li><a href="${href("#modelos")}">Radar de modelos</a></li><li><a href="${ROOT}glosario.html">Glosario</a></li><li><a href="${ROOT}responsable.html">IA responsable y normativa</a></li><li><a href="${ROOT}about.html">Acerca de IA Radar</a></li><li><a href="${href("#fuentes")}">Fuentes y metodología</a></li></ul></div>
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


  /* ---------- barra lateral (escritorio) y cajón (móvil) ---------- */
  const SIDE = [
    { g: "", items: [["#top", "Inicio", "house", "Volver al comienzo"]] },
    { g: "Qué está pasando", items: [["#hoy", "Hoy en IA", "newspaper", "Noticias y hechos recientes"], ["#modelos", "Modelos de IA", "cpu", "Comparar capacidades, precio y contexto"], ["#uso", "Uso", "chart-column", "Qué usa la gente, con datos"], ["#peru", "IA en Perú", "map-pin", "Búsquedas, normativa y contexto"]] },
    { g: "Aprende a usarla", items: [["#ruta", "Tu ruta", "list-checks", "Seis pasos con tu progreso"], ["#aprende", "Aprende desde cero", "graduation-cap", "Microlecciones de 2 a 4 minutos"], ["#promptlab", "Prompt Lab", "flask-conical", "Instrucciones por objetivo"], ["#agentes", "Agentes", "bot", "De chatbot a multiagente"], ["glosario.html", "Glosario", "book-open", "Conceptos clave explicados"]] },
    { g: "Úsala con criterio", items: [["#responsable", "IA responsable", "shield-check", "Principios, riesgos y normativa"], ["#fuentes", "Fuentes", "database", "De dónde sale cada dato"]] },
    { g: "Lleva la IA a tu trabajo", items: [["#casos", "Casos de uso", "briefcase", "Por perfil y automatización"], ["#nivel", "Tu nivel", "target", "Diagnóstico de 60 segundos"]] },
    { g: "", items: [["about.html", "Acerca de IA Radar", "info", "Quién, cómo y con qué criterios"]] },
  ];
  const MORE = [["glosario.html", "Glosario de IA"], ["modelos.html", "Catálogo de modelos"], ["responsable.html", "IA responsable y normativa"], ["about.html", "Acerca de IA Radar"]];
  const norm = (t) => String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let SEARCH = null;
  async function searchIndex() {
    if (SEARCH) return SEARCH;
    const [g, a, seo, pr, uc] = await Promise.all([load("content/glossary.json", { terms: [] }), load("content/academy.json", null), load("content/seo.json", { pages: [] }), load("content/prompts.json", null), load("content/usecases.json", null)]);
    const out = [];
    SIDE.forEach((gr) => gr.items.forEach(([h, t, , d]) => out.push({ k: "Sección", t, d, h: href(h) })));
    (g.terms || []).forEach((x) => out.push({ k: "Glosario", t: x.term + " · " + x.es, d: x.short, h: ROOT + "glosario.html#t-" + x.term.toLowerCase().replace(/ /g, "-").replace(/\//g, "-") }));
    ((a && a.levels) || []).forEach((l) => l.lessons.forEach((x) => out.push({ k: "Microlección", t: x.title, d: x.one, h: href("#aprende") })));
    (seo.pages || []).forEach((x) => out.push({ k: "Guía", t: x.h1, d: x.description, h: ROOT + "guias/" + x.slug + ".html" }));
    ((pr && pr.library) || []).forEach((x) => out.push({ k: "Prompt Lab", t: "Prompt para " + x.label.toLowerCase(), d: x.objetivo, h: href("#promptlab") }));
    ((uc && uc.profiles) || []).forEach((p) => p.cases.forEach((c) => out.push({ k: "Caso de uso · " + p.name, t: c.task, d: c.result, h: href("#casos") })));
    SEARCH = out.map((x) => ({ ...x, n: norm(x.t + " " + (x.d || "")) }));
    return SEARCH;
  }
  function searchBox(el) {
    const q = $("#sb-q", el), res = $("#sb-res", el);
    let sel = -1, items = [];
    const show = (list) => {
      items = list; sel = -1;
      res.hidden = !q.value.trim();
      res.innerHTML = list.length ? list.map((x, i) => `<li role="option" id="sr${i}"><a href="${x.h}"><span class="sr-k">${esc(x.k)}</span><b>${esc(x.t)}</b></a></li>`).join("") : `<li class="sr-none">Sin resultados. Prueba con otra palabra.</li>`;
    };
    const run = async () => {
      const t = norm(q.value.trim()); if (!t) { res.hidden = true; return; }
      const words = t.split(/\s+/), idx = await searchIndex();
      const sc = idx.map((x) => { let s = 0; for (const w of words) { if (!x.n.includes(w)) return null; s += norm(x.t).includes(w) ? 3 : 1; } return { x, s }; }).filter(Boolean).sort((a, b) => b.s - a.s).slice(0, 8).map((o) => o.x);
      show(sc); track("buscar");
    };
    let to; q.addEventListener("input", () => { clearTimeout(to); to = setTimeout(run, 120); });
    q.addEventListener("focus", () => searchIndex());
    q.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!items.length) return; sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length; $$("li", res).forEach((li, i) => li.classList.toggle("on", i === sel)); q.setAttribute("aria-activedescendant", "sr" + sel); }
      else if (e.key === "Enter") { const a = $$("li a", res)[Math.max(sel, 0)]; if (a) { e.preventDefault(); a.click(); } }
      else if (e.key === "Escape") { q.value = ""; res.hidden = true; }
    });
    res.addEventListener("click", (e) => { if (e.target.closest("a")) { q.value = ""; res.hidden = true; closeDrawer(); } });
    document.addEventListener("click", (e) => { if (!el.contains(e.target)) res.hidden = true; });
  }
  const drawer = { open: false };
  function closeDrawer() {
    const sb = $("#sidebar"), b = $("#burger"); if (!sb || !drawer.open) return;
    drawer.open = false; sb.classList.remove("open"); document.body.classList.remove("nav-open"); if (b) { b.setAttribute("aria-expanded", "false"); b.innerHTML = ico("menu"); b.setAttribute("aria-label", "Abrir el menú de secciones"); }
  }
  function openDrawer() {
    const sb = $("#sidebar"), b = $("#burger"); if (!sb) return;
    drawer.open = true; sb.classList.add("open"); document.body.classList.add("nav-open"); if (b) { b.setAttribute("aria-expanded", "true"); b.innerHTML = ico("x"); b.setAttribute("aria-label", "Cerrar el menú de secciones"); }
    const f = $("#sb-q", sb); if (f) setTimeout(() => f.focus({ preventScroll: true }), 50);
  }
  function sidebar() {
    const el = document.createElement("aside");
    el.id = "sidebar"; el.setAttribute("aria-label", "Navegación principal");
    const link = ([h, t, ic, d]) => `<a href="${h === "#top" && !home ? ROOT + "index.html" : href(h)}" data-h="${h}">${ico(ic)}<span class="sb-t"><b>${esc(t)}</b><small>${esc(d)}</small></span></a>`;
    el.innerHTML = `<a class="sb-logo" href="${home ? "#top" : ROOT + "index.html"}" aria-label="IA Radar, inicio"><span class="orb sm"><i></i><i></i><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="32" cy="32" r="10" fill="none" stroke="currentColor" stroke-width="2.4" opacity=".6"/><path d="M32 32 L50 17" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"/><circle cx="32" cy="32" r="3.6" fill="var(--accent)"/></svg></span><span class="sb-name"><b>IA Radar</b><small>Observatorio de IA</small></span></a>
      <div class="sb-search" role="search"><label class="sr" for="sb-q">Buscar en IA Radar</label>${ico("search")}<input id="sb-q" type="search" placeholder="Buscar términos, guías, prompts" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="sb-res"><ul id="sb-res" class="sb-res" role="listbox" hidden></ul></div>
      <nav class="sb-nav" aria-label="Secciones">${SIDE.map((g) => `<div class="sb-g">${g.g ? `<p>${esc(g.g)}</p>` : ""}${g.items.map(link).join("")}</div>`).join("")}</nav>
      <div class="sb-route" id="sb-route" hidden></div>
      <div class="sb-foot"><p class="sb-orient">Empieza entendiendo la IA, aprende a conversar con ella, dirige sus respuestas, intégrala en tus procesos y úsala con responsabilidad.</p>
        <a class="sb-cta" href="${href("#sigue")}" data-track="clic_especializate_nav">${ico("rocket")}<span>Especialízate</span></a>
        <button type="button" class="sb-theme" id="theme2">${ico("contrast")}<span>Cambiar tema</span></button>
        <p>IA Radar es una iniciativa educativa de WGIA.</p></div>`;
    document.body.prepend(el);
    const back = document.createElement("div"); back.className = "sb-back"; back.addEventListener("click", closeDrawer); document.body.appendChild(back);
    $("#theme2", el).addEventListener("click", () => $("#theme") && $("#theme").click());
    searchBox(el);
    const burger = $("#burger"); if (burger) burger.addEventListener("click", () => (drawer.open ? closeDrawer() : openDrawer()));
    el.addEventListener("click", (e) => { if (e.target.closest(".sb-nav a, .sb-cta")) closeDrawer(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && drawer.open) { closeDrawer(); if (burger) burger.focus(); } });
    addEventListener("resize", () => { if (innerWidth > 1120) closeDrawer(); });
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

  /* ---------- botones flotantes: inicio y (en móvil) menú ---------- */
  function fab() {
    const el = document.createElement("div");
    el.className = "fab"; el.id = "fab"; el.hidden = true;
    el.innerHTML = `<button type="button" class="fab-b fab-menu" id="fab-menu" aria-controls="sidebar" aria-expanded="false">${ico("list")}<span>Secciones</span></button><button type="button" class="fab-b fab-top" id="fab-top" aria-label="Volver al inicio de la página">${ico("arrow-up")}<span>Inicio</span></button>`;
    document.body.appendChild(el);
    $("#fab-menu", el).addEventListener("click", () => { openDrawer(); track("fab_secciones"); });
    $("#fab-top", el).addEventListener("click", () => { track("fab_inicio"); window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); });
    const upd = () => { el.hidden = scrollY < 360; };
    addEventListener("scroll", upd, { passive: true }); upd();
  }

  chrome();
  sidebar();
  fab();
  reveal();
  trackSections();
  document.addEventListener("DOMContentLoaded", () => {});
})();
