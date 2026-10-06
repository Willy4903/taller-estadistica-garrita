/* Centro de mando de la portada: tarjetas de vidrio con datos reales (Hoy en IA, Aprende, Usuarios y tokens, Prompt Lab, Antes → ahora), indicadores y mapa. Solo presenta datos ya existentes. */
(function () {
  "use strict";
  const L = document.getElementById("st-l"), R = document.getElementById("st-r"), C = document.getElementById("st-ba"), K = document.getElementById("st-kpi"), B = document.getElementById("st-band");
  if (!L || !R) return;
  const I = window.IAR, { esc, ico, nf, fmtDate, fmtPrice, norm, store, track, journey } = I;
  const url = (f) => new URL(I.ROOT + "icons/" + f + ".svg", document.baseURI).href;
  const nm = (m) => m.name.replace(/^[^:]+: /, "");
  const mil = (v) => (v >= 1000 ? (v / 1000).toLocaleString("es-PE", { maximumFractionDigits: 1 }) + " mil millones" : nf.format(v) + " millones");
  const ageM = (ym) => { const [y, m] = ym.split("-").map(Number), n = new Date(); return (n.getFullYear() - y) * 12 + n.getMonth() + 1 - m; };
  const clip = (t, n) => (t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : t);

  /* ---------- tooltip compartido de las tarjetas ---------- */
  const tip = document.createElement("div");
  tip.className = "gtip"; tip.setAttribute("role", "tooltip"); tip.hidden = true;
  document.body.appendChild(tip);
  const showTip = (html, x, y) => {
    tip.innerHTML = html; tip.hidden = false;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, x - w / 2)) + "px";
    tip.style.top = Math.max(8, y - h - 14) + "px";
  };
  const hideTip = () => { tip.hidden = true; };
  document.addEventListener("scroll", hideTip, { passive: true });
  function bindTips(root) {
    root.querySelectorAll("[data-tip]").forEach((el) => {
      const on = () => { const r = el.getBoundingClientRect(); showTip(el.dataset.tip, r.left + r.width / 2, r.top); };
      el.addEventListener("mouseenter", on); el.addEventListener("focus", on); el.addEventListener("mouseleave", hideTip); el.addEventListener("blur", hideTip);
    });
  }

  /* ---------- Hoy en IA ---------- */
  function cardHoy() {
    const el = document.createElement("section");
    el.className = "gl"; el.setAttribute("aria-labelledby", "c-hoy");
    el.innerHTML = `<header><h2 id="c-hoy">Hoy en IA</h2><span class="gl-n">01</span></header>
      <div class="seg sm" role="group" aria-label="Periodo">${["24H", "7D", "30D"].map((p) => `<button type="button" data-p="${p}" aria-pressed="false">${p}</button>`).join("")}</div>
      <div class="gl-body" aria-live="polite"></div><a class="gl-more" href="#hoy" data-track="clic_card_hoy">Ver todo en Hoy en IA ${ico("arrow-right")}</a>`;
    const body = el.querySelector(".gl-body");
    const paint = (p) => {
      el.querySelectorAll("[data-p]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.p === p));
      const r = I.hoyPick ? I.hoyPick(p) : { items: [] }, x = r.items[0];
      body.innerHTML = x ? `<div class="gl-meta"><span class="tag acc">${esc(x.topic)}</span><time class="muted mono">${esc(fmtDate(x.date))}</time></div><h3>${esc(clip(x.title, 90))}</h3>
        <div class="qa3"><div><b>Qué pasó</b><p>${esc(clip(x.what, 150))}</p></div><div><b>Por qué importa</b><p>${esc(clip(x.why, 130))}</p></div><div><b>A quién afecta</b><p>${esc(clip(x.affects, 110))}</p></div></div>
        <p class="gl-src">${ico("link")} <a href="${esc(x.url)}" target="_blank" rel="noopener" data-track="clic_card_hoy_fuente">${esc(x.source)}</a> · ${r.items.length} punto${r.items.length === 1 ? "" : "s"} en este periodo</p>`
        : `<p class="muted">No hay acontecimientos relevantes en este periodo. Prueba con un rango mayor.</p>`;
    };
    el.addEventListener("click", (e) => { const b = e.target.closest("[data-p]"); if (b) { paint(b.dataset.p); track("card_hoy_periodo", { p: b.dataset.p }); } });
    const first = ["24H", "7D", "30D"].find((p) => I.hoyPick && I.hoyPick(p).items.length) || "7D";
    paint(first);
    return el;
  }

  /* ---------- Aprende IA ---------- */
  function cardAprende(D) {
    const A = D.academy; if (!A) return null;
    const done = new Set(store.get("iar_lessons", []));
    const el = document.createElement("section");
    el.className = "gl"; el.setAttribute("aria-labelledby", "c-ap");
    const lv = A.levels.slice(0, 2);
    el.innerHTML = `<header><h2 id="c-ap">Aprende IA</h2><span class="gl-n">02</span></header>
      ${lv.map((l) => { const n = l.lessons.filter((x) => done.has(x.id)).length, t = l.lessons.length, min = l.lessons.reduce((s, x) => s + x.min, 0);
        return `<a class="lvl-row" href="#aprende" data-track="clic_card_aprende"><div><span class="lv-k">Nivel ${l.n}</span><b>${esc(l.name)}</b><small>${t} lecciones · ${min} min</small></div><div class="lv-p"><div class="bar"><i style="width:${(n / t) * 100}%"></i></div><small>${n} de ${t} completadas</small></div></a>`; }).join("")}
      <a class="gl-more" href="#ruta" data-track="clic_card_ruta">Ver mi ruta de 6 pasos ${ico("arrow-right")}</a>`;
    return el;
  }

  /* ---------- Usuarios y tokens ---------- */
  function cardUsers(D) {
    const U = D.users && D.users.items ? [...D.users.items].sort((a, b) => b.value - a.value) : [];
    const T = D.usage && D.usage.items ? D.usage.items.slice(0, 7) : [];
    const el = document.createElement("section");
    el.className = "gl"; el.setAttribute("aria-labelledby", "c-us");
    el.innerHTML = `<header><h2 id="c-us">Usuarios</h2><span class="gl-n">03</span></header>
      <div class="seg sm" role="group" aria-label="Medida"><button type="button" data-m="u" aria-pressed="true">Usuarios</button><button type="button" data-m="t" aria-pressed="false">Tokens</button></div>
      <p class="gl-q" id="us-q"></p><div class="vbars" id="us-bars"></div><p class="gl-cap" id="us-cap"></p>`;
    const paint = (m) => {
      el.querySelectorAll("[data-m]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.m === m));
      el.querySelector("h2").textContent = m === "u" ? "Usuarios" : "Tokens";
      const rows = m === "u" ? U.map((x) => ({ n: x.name, v: x.value, lab: nf.format(x.value) + " M", hot: x.metric === "weekly", tip: `<b>${esc(x.name)}</b><br>${esc(mil(x.value))} ${esc(x.what)}<br><span>Cifra de ${esc(x.asof)} · hace ${ageM(x.asof)} meses · ${esc(x.source)}</span>` }))
        : T.map((x) => ({ n: String(x.model).split("/").pop().replace(/-/g, " "), v: x.value, lab: nf.format(Math.round(x.value / 100) / 10) + " B", hot: false, tip: `<b>${esc(x.model)}</b><br>${esc(nf.format(x.value))} mil millones de tokens<br><span>Procesados en OpenRouter en 7 días</span>` }));
      el.querySelector("#us-q").textContent = m === "u" ? "¿Cuántas personas usan cada IA, según las propias empresas?" : "¿Qué modelos procesan más tokens dentro de OpenRouter?";
      const max = Math.max(1, ...rows.map((r) => r.v));
      el.querySelector("#us-bars").innerHTML = rows.length ? rows.map((r) => `<div class="vb" tabindex="0" data-tip="${esc(r.tip)}"><span class="vb-v">${esc(r.lab)}</span><i class="${r.hot ? "hot" : ""}" style="--h:${Math.max(6, (r.v / max) * 100)}%"></i><span class="vb-n">${esc(clip(r.n, 14))}</span></div>`).join("") : '<p class="muted">Sin datos por ahora.</p>';
      el.querySelector("#us-cap").textContent = m === "u" ? "Azul brillante: activos semanales. Gris: mensuales. Cifras reportadas por las empresas, no auditadas ni comparables de forma estricta." : "Solo refleja a quienes usan OpenRouter, no el uso total del mercado.";
      bindTips(el);
    };
    el.addEventListener("click", (e) => { const b = e.target.closest("[data-m]"); if (b) { paint(b.dataset.m); track("card_usuarios_medida", { m: b.dataset.m }); } });
    paint("u");
    return el;
  }

  /* ---------- Prompt Lab ---------- */
  function cardLab(D) {
    const P = D.prompts; if (!P) return null;
    const G = D.agents, el = document.createElement("section");
    el.className = "gl"; el.setAttribute("aria-labelledby", "c-pl");
    el.innerHTML = `<header><h2 id="c-pl">Prompt Lab</h2><span class="gl-n">04</span></header>
      <div class="ba2"><div class="before"><span>Antes</span><p>${esc(P.weak)}</p></div><div class="after"><span>Ahora</span><ul>${P.steps.slice(0, 5).map((s) => `<li style="--c:${s.color}"><b>${esc(s.label)}</b> ${esc(clip(s.text, 46))}</li>`).join("")}<li class="more">+ ${P.steps.length - 5} bloques más</li></ul></div></div>
      ${G && G.cycle ? `<p class="gl-q">Proceso de un agente</p><ol class="steps6">${G.cycle.map((c, i) => `<li><i>${i + 1}</i><span>${esc(c.t)}</span></li>`).join("")}</ol>` : ""}
      <a class="gl-more" href="#promptlab" data-track="clic_card_promptlab">Abrir el Prompt Lab ${ico("arrow-right")}</a>`;
    return el;
  }

  /* ---------- Antes → ahora ---------- */
  function cardBA(D) {
    const pairs = I.versionPairs(D.base.filter(I.isMajor)).filter((p) => p.cur.price_in != null && p.prev.price_in != null).slice(0, 4);
    const ch = (D.changes && D.changes.items) || [], w = ch.filter((c) => I.daysAgo(c.date) <= 30);
    const nNew = w.filter((c) => c.kind === "nuevo").length, dn = w.filter((c) => c.kind.startsWith("precio") && c.after < c.before).length, up = w.filter((c) => c.kind.startsWith("precio") && c.after > c.before).length;
    const el = document.createElement("section");
    el.className = "gl wide"; el.setAttribute("aria-labelledby", "c-ba");
    let mode = "now";
    el.innerHTML = `<header><h2 id="c-ba">Antes → ahora</h2><div class="seg sm" role="group" aria-label="Momento"><button type="button" data-k="before" aria-pressed="false">Antes</button><button type="button" data-k="now" aria-pressed="true">Ahora</button></div></header>
      <div class="ba-sum"><div><b>${D.all.length}</b><span>modelos en el catálogo</span></div><div><b>${nNew}</b><span>nuevos detectados (30 días)</span></div><div><b>${dn} ↓ ${up} ↑</b><span>cambios de precio (30 días)</span></div></div>
      <div class="ba-cards" id="ba-cards"></div>
      <a class="gl-more" href="#cambios" data-track="clic_card_cambios">Ver todos los cambios con su fuente ${ico("arrow-right")}</a>`;
    const paint = () => {
      el.querySelectorAll("[data-k]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.k === mode));
      el.querySelector("#ba-cards").innerHTML = pairs.length ? pairs.map((p) => { const m = mode === "now" ? p.cur : p.prev, d = p.dIn;
        return `<article class="bac"><div class="bac-h">${I.provTag(p.cur.provider)}<time class="muted mono">${esc(fmtDate(m.created))}</time></div><b>${esc(nm(m))}</b><div class="bac-p"><span>${fmtPrice(m.price_in)}</span><small>entrada por millón</small>${mode === "now" && d != null && d !== 0 ? `<em class="${d < 0 ? "up" : "down"}">${d < 0 ? "↓" : "↑"} ${Math.abs(d)} %</em>` : ""}</div><small class="muted">Contexto ${I.fmtCtx(m.context)}</small></article>`; }).join("") : '<p class="muted">Aún no hay versiones nuevas comparables en los últimos 90 días.</p>';
    };
    el.addEventListener("click", (e) => { const b = e.target.closest("[data-k]"); if (b) { mode = b.dataset.k; paint(); track("card_antes_ahora", { k: mode }); journey.mark("antes_ahora"); } });
    paint();
    return el;
  }

  /* ---------- indicadores con mini gráficos ---------- */
  function spark(vals, w = 220, h = 54) {
    if (vals.length < 2) return "";
    const lo = Math.min(...vals), hi = Math.max(...vals), sp = hi - lo || 1, pts = vals.map((v, i) => [(i / (vals.length - 1)) * w, h - 6 - ((v - lo) / sp) * (h - 14)]);
    const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join("");
    return `<svg viewBox="0 0 ${w} ${h}" class="spark" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="spg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ec60ff" stop-opacity=".5"/><stop offset="1" stop-color="#25d9f5" stop-opacity="0"/></linearGradient></defs><path d="${d}L${w},${h}L0,${h}Z" fill="url(#spg)"/><path d="${d}" fill="none" stroke="url(#spg2)" stroke-width="2.2" stroke-linejoin="round"/><linearGradient id="spg2" x1="0" x2="1"><stop offset="0" stop-color="#25d9f5"/><stop offset="1" stop-color="#ec60ff"/></linearGradient><circle cx="${pts[pts.length - 1][0]}" cy="${pts[pts.length - 1][1]}" r="3.5" fill="#fff"/></svg>`;
  }
  function kpis(D) {
    const major = D.base.filter(I.isMajor), now = Date.now();
    const weeks = Array.from({ length: 8 }, (_, i) => major.filter((m) => { const a = (now - new Date(m.created + "T12:00:00")) / 864e5; return a >= i * 7 && a < (i + 1) * 7; }).length).reverse();
    const n30 = major.filter((m) => I.daysAgo(m.created) <= 30).length, mx = Math.max(1, ...weeks);
    const cur = major.filter((m) => m.price_in > 0 && m.price_out > 0 && I.daysAgo(m.created) <= 150), big = cur.filter((m) => m.context >= 1e6).length, pc = cur.length ? Math.round((big / cur.length) * 100) : 0;
    const H = D.catalog || [], tot = H.map((h) => h.total), pr = H.map((h) => h.median_price_in).filter((v) => v != null);
    const R = 26, Cc = 2 * Math.PI * R;
    const card = (t, v, sub, viz) => `<article class="kp"><h3>${t}</h3><div class="kp-v">${v}</div><p>${sub}</p><div class="kp-viz">${viz}</div></article>`;
    K.innerHTML = [
      card("Lanzamientos por semana", `${n30}<small>en 30 días</small>`, "Modelos nuevos de laboratorios principales, últimas 8 semanas.", `<div class="wk">${weeks.map((v, i) => `<i style="--h:${Math.max(6, (v / mx) * 100)}%" title="${v} lanzamientos"${i === 7 ? ' class="cur"' : ""}></i>`).join("")}</div>`),
      card("Contexto de 1 millón o más", `${pc} %<small>de los vigentes</small>`, `${big} de ${cur.length} modelos de laboratorios principales lanzados en 150 días.`, `<svg viewBox="0 0 64 64" class="donut" aria-hidden="true"><defs><linearGradient id="dg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#25d9f5"/><stop offset="1" stop-color="#ec60ff"/></linearGradient></defs><circle cx="32" cy="32" r="${R}" fill="none" stroke="rgba(141,179,201,.18)" stroke-width="9"/><circle cx="32" cy="32" r="${R}" fill="none" stroke="url(#dg)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(Cc * pc / 100).toFixed(1)} ${Cc.toFixed(1)}" transform="rotate(-90 32 32)"/></svg>`),
      card("Modelos en el catálogo", `${nf.format(D.all.length)}<small>hoy</small>`, tot.length >= 3 ? `Evolución diaria desde ${fmtDate(H[0].date)}.` : "El historial diario se está acumulando.", tot.length >= 3 ? spark(tot) : ""),
      card("Precio mediano de entrada", `${fmtPrice(pr.length ? pr[pr.length - 1] : null)}<small>por millón</small>`, pr.length >= 3 ? `Mediana de todo el catálogo desde ${fmtDate(H[0].date)}.` : "La serie se está acumulando.", pr.length >= 3 ? spark(pr) : ""),
    ].join("");
  }

  /* ---------- insight del día ---------- */
  function insights(D) {
    const out = [], cur = D.base.filter((m) => I.isMajor(m) && m.price_in > 0 && m.price_out > 0 && I.daysAgo(m.created) <= 150);
    const blend = (m) => (m.price_in * 3 + m.price_out) / 4;
    ((D.frontier && D.frontier.hoy) || []).filter((x) => x.metric && I.daysAgo(x.date) <= 14).forEach((x) => out.push({ big: x.metric.big, head: x.metric.head, text: x.metric.label + ". " + x.why, src: x.source, url: x.url, date: x.date }));
    // diferencia de precio dentro de un mismo laboratorio
    const by = {};
    cur.forEach((m) => { (by[norm(m.provider)] = by[norm(m.provider)] || []).push(m); });
    let best = null;
    Object.entries(by).forEach(([p, ms]) => { if (ms.length < 2) return; const a = [...ms].sort((x, y) => blend(y) - blend(x)), hi = a[0], lo = a[a.length - 1], r = blend(hi) / blend(lo); if (!best || r > best.r) best = { p, hi, lo, r }; });
    if (best && best.r >= 5) out.push({ big: Math.round(best.r) + "×", head: `En un mismo laboratorio, el precio puede variar ${Math.round(best.r)} veces`, text: `${nm(best.hi)} cuesta unos $${blend(best.hi).toFixed(2)} por millón de tokens (mezcla 3:1) y ${nm(best.lo)}, de ${I.provName(best.p)}, unos $${blend(best.lo).toFixed(2)}. Elegir la gama correcta importa tanto como elegir el laboratorio.`, src: "Catálogo de OpenRouter", url: "https://openrouter.ai/models", date: D.models.meta.updated_date });
    const big = cur.filter((m) => m.context >= 1e6).length;
    if (cur.length >= 10 && big / cur.length >= 0.2) out.push({ big: Math.round((big / cur.length) * 100) + " %", head: "El millón de tokens de contexto ya es cosa común", text: `${big} de ${cur.length} modelos vigentes de laboratorios principales aceptan 1 millón de tokens o más, equivalente a varios libros en una sola conversación. Más contexto no garantiza que preste atención a todo.`, src: "Catálogo de OpenRouter", url: "https://openrouter.ai/models", date: D.models.meta.updated_date });
    const n30 = D.base.filter((m) => I.isMajor(m) && I.daysAgo(m.created) <= 30).length;
    if (n30 >= 5) out.push({ big: String(n30), head: "Un ritmo de lanzamientos que obliga a comparar de nuevo cada mes", text: `Los laboratorios principales publicaron ${n30} modelos en los últimos 30 días según el catálogo de OpenRouter, sin contar variantes. Las decisiones de hace un trimestre pueden haber quedado desactualizadas.`, src: "Catálogo de OpenRouter", url: "https://openrouter.ai/models", date: D.models.meta.updated_date });
    const T = D.trends && D.trends.sets && D.trends.sets.A, pe = T && T.countries && T.countries.PE;
    if (pe) { const nmz = Object.keys(T.terms).sort((a, b) => pe.share[b] - pe.share[a]); out.push({ big: String(pe.share[nmz[0]]).replace(".", ",") + " %", head: `En Perú, ${nmz[0]} concentra casi todo el interés de búsqueda`, text: `Entre ${nmz.length} asistentes comparados, ${nmz[0]} acumula ese porcentaje del interés relativo en Google. Es una señal de búsqueda, no de usuarios, y "ChatGPT" suele usarse como nombre genérico.`, src: "Google Trends", url: "https://trends.google.com/trends/", date: (D.trends.updated_at || "").slice(0, 10) }); }
    return out;
  }
  function insightUI(D) {
    const box = document.getElementById("insight"); if (!box) return;
    const list = insights(D); if (!list.length) { box.hidden = true; return; }
    let i = Math.floor(Date.now() / 864e5) % list.length, timer;
    const paint = () => {
      const x = list[i];
      box.innerHTML = `<div class="ins-h"><span class="ins-tag"><i class="live"></i>Insight del día</span><div class="ins-dots" role="group" aria-label="Elegir insight">${list.map((_, k) => `<button type="button" data-k="${k}" aria-label="Insight ${k + 1} de ${list.length}" aria-pressed="${k === i}"></button>`).join("")}</div></div>
        <div class="ins-b"><div class="ins-big">${esc(x.big)}</div><div class="ins-t"><b>${esc(x.head)}</b><p>${esc(x.text)}</p></div></div>
        <div class="ins-f"><span>Fuente: <a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.src)}</a>${x.date ? " · " + esc(fmtDate(x.date)) : ""}</span><a class="hud-a" href="#hoy" data-track="clic_insight_hoy">Ver Hoy en IA ${ico("arrow-right")}</a></div>`;
      box.classList.remove("swap"); void box.offsetWidth; box.classList.add("swap");
    };
    const go = (k) => { i = (k + list.length) % list.length; paint(); };
    box.addEventListener("click", (e) => { const b = e.target.closest("[data-k]"); if (b) { go(+b.dataset.k); I.track("insight_manual"); restart(); } });
    const restart = () => { clearInterval(timer); if (!matchMedia("(prefers-reduced-motion: reduce)").matches && list.length > 1) timer = setInterval(() => { if (!box.matches(":hover") && !box.contains(document.activeElement)) go(i + 1); }, 11000); };
    paint(); restart();
  }

  /* ---------- banda: herramientas clave y mapa de Perú ---------- */
  const latest = (D, slugs, n = 1) => {
    const set = new Set([].concat(slugs));
    return D.base.filter((m) => set.has(norm(m.provider)) && m.price_in != null).sort((a, b) => b.created.localeCompare(a.created)).slice(0, n);
  };
  function band(D) {
    const tile = (icon, label, model, sub, cls) => `<a class="tile t-${cls}" href="#modelos" data-track="clic_tile_${cls}"><span class="logo3d" style="--m:url(${url(icon)})"></span><b>${esc(label)}</b><span class="mdl">${esc(model)}</span>${sub ? `<small>${esc(sub)}</small>` : ""}</a>`;
    const t = [];
    const o = latest(D, "openai")[0]; if (o) t.push(tile("openai", "OpenAI", nm(o), fmtDate(o.created), "openai"));
    const arg = D.frontier && D.frontier.latest && D.frontier.latest.find((x) => x.prov === "google"), go = latest(D, "google")[0];
    if (arg) t.push(tile("google", "Google", arg.name, "acceso limitado", "google"));
    if (go) t.push(tile("google", "Google", nm(go), fmtDate(go.created), "google2"));
    const an = latest(D, "anthropic")[0]; if (an) t.push(tile("anthropic", "Anthropic", nm(an), fmtDate(an.created), "anthropic"));
    const me = latest(D, ["meta", "meta-llama"])[0]; if (me) t.push(tile("meta", "Meta", nm(me), fmtDate(me.created), "meta"));
    const cp = D.users && D.users.items.find((x) => /copilot/i.test(x.name));
    t.push(tile("microsoft", "Microsoft", "Copilot", cp ? `${cp.value} M usuarios mensuales` : "", "microsoft"));
    const xa = latest(D, "x-ai")[0]; if (xa) t.push(tile("xai", "xAI", nm(xa), fmtDate(xa.created), "xai"));
    const ds = latest(D, "deepseek")[0]; if (ds) t.push(tile("deepseek", "DeepSeek", nm(ds), fmtDate(ds.created), "deepseek"));
    const co = latest(D, "cohere")[0]; if (co) t.push(tile("cohere", "Cohere", nm(co), fmtDate(co.created), "cohere"));
    const T = D.trends && D.trends.sets && D.trends.sets.A, pe = T && T.countries && T.countries.PE, names = T ? Object.keys(T.terms) : [], lead = pe ? names.slice().sort((a, b) => pe.share[b] - pe.share[a]) : [];
    B.innerHTML = `<section class="gl band-t" aria-labelledby="c-tl"><header><h2 id="c-tl">Herramientas clave y modelos activos</h2><span class="gl-n">05</span></header><div class="tiles">${t.join("")}</div></section>
      <section class="gl band-m" aria-labelledby="c-pe"><header><h2 id="c-pe">IA en Perú</h2><span class="gl-n">06</span></header><p class="gl-q">Herramienta con más interés de búsqueda en cada departamento. Pasa el mouse sobre el mapa.</p><div id="hero-map"></div>
        ${pe ? `<p class="gl-cap">A escala nacional, ${esc(lead[0])} concentra el ${String(pe.share[lead[0]]).replace(".", ",")} % del interés.</p>` : ""}<a class="gl-more" href="#peru" data-track="clic_card_peru">Explorar IA en Perú ${ico("arrow-right")}</a></section>`;
    if (T && I.peruMap) I.peruMap(document.getElementById("hero-map"), T);
  }

  document.addEventListener("iar:data", () => {
    const D = I.D; if (!D.base) return;
    const put = (root, els) => els.filter(Boolean).forEach((e) => root.appendChild(e));
    put(L, [cardHoy(), cardAprende(D)]);
    put(R, [cardUsers(D), cardLab(D)]);
    if (C) C.appendChild(cardBA(D));
    if (K) kpis(D);
    if (B) band(D);
    insightUI(D);
  }, { once: true });
})();
