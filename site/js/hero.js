/* Portada: indicadores del catálogo e insight del día. Las secciones completas viven más abajo; aquí no se repiten. */
(function () {
  "use strict";
  const K = document.getElementById("st-kpi");
  if (!K) return;
  const I = window.IAR, { esc, ico, nf, fmtDate, fmtPrice, norm } = I;
  const nm = (m) => m.name.replace(/^[^:]+: /, "");

  /* ---------- indicadores con mini gráficos ---------- */
  function spark(vals, w = 220, h = 54) {
    if (vals.length < 2) return "";
    const lo = Math.min(...vals), hi = Math.max(...vals), sp = hi - lo || 1, pts = vals.map((v, i) => [(i / (vals.length - 1)) * w, h - 6 - ((v - lo) / sp) * (h - 14)]);
    const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join("");
    return `<svg viewBox="0 0 ${w} ${h}" class="spark" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="spg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ec60ff" stop-opacity=".5"/><stop offset="1" stop-color="#25d9f5" stop-opacity="0"/></linearGradient></defs><path d="${d}L${w},${h}L0,${h}Z" fill="url(#spg)"/><path d="${d}" fill="none" stroke="url(#spg2)" stroke-width="2.2" stroke-linejoin="round"/><linearGradient id="spg2" x1="0" x2="1"><stop offset="0" stop-color="#25d9f5"/><stop offset="1" stop-color="#ec60ff"/></linearGradient><circle cx="${pts[pts.length - 1][0]}" cy="${pts[pts.length - 1][1]}" r="3.5" fill="#fff"/></svg>`;
  }
  const usd = (v) => (v == null ? "n/d" : v === 0 ? "Gratis" : "US$ " + (v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(2) : v.toFixed(0)).replace(".", ","));
  const ago = (d) => { const n = I.daysAgo(d); return n <= 0 ? "hoy" : n === 1 ? "ayer" : "hace " + n + " días"; };
  const quarters = (pc) => { const k = Math.round(pc / 25); return ["muy pocos", "1 de cada 4", "la mitad", "3 de cada 4", "casi todos"][k]; };
  function kpis(D) {
    const major = D.base.filter(I.isMajor);
    const recent = major.filter((m) => I.daysAgo(m.created) <= 30).sort((a, b) => b.created.localeCompare(a.created));
    const cur = major.filter((m) => m.price_in > 0 && m.price_out > 0 && I.daysAgo(m.created) <= 150), big = cur.filter((m) => m.context >= 1e6).length, pc = cur.length ? Math.round((big / cur.length) * 100) : 0;
    const prices = D.base.map((m) => m.price_in).filter((v) => v > 0).sort((x, y) => x - y);
    const q = (f) => prices.length ? prices[Math.min(prices.length - 1, Math.floor(prices.length * f))] : null, mid = q(0.5), lo = q(0.25), hi = q(0.75);
    const R = 26, Cc = 2 * Math.PI * R;
    const card = (t, v, sub, viz, icon) => `<article class="kp"><span class="kp-ic" aria-hidden="true">${ico(icon)}</span><h3>${t}</h3><div class="kp-v">${v}</div><p>${sub}</p><div class="kp-viz">${viz}</div></article>`;
    K.innerHTML = [
      card("Novedades", `${recent.length}<small>modelos nuevos este mes</small>`, "Lanzados en los últimos 30 días por los grandes laboratorios (OpenAI, Google, Anthropic y otros). Los más recientes:", `<ul class="kp-list">${recent.slice(0, 3).map((m) => `<li><b>${esc(nm(m))}</b><span>${esc(I.provName(m.provider))} · ${ago(m.created)}</span></li>`).join("")}</ul>`, "rocket"),
      card("Memoria de la IA", `${quarters(pc)}<small>de los modelos recientes</small>`, `pueden leer unos 10 libros a la vez (1 millón de tokens). Se cuentan ${cur.length} modelos de los últimos 5 meses; ${big} lo logran.`, `<svg viewBox="0 0 64 64" class="donut" aria-hidden="true"><defs><linearGradient id="dg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#25d9f5"/><stop offset="1" stop-color="#ec60ff"/></linearGradient></defs><circle cx="32" cy="32" r="${R}" fill="none" stroke="rgba(141,179,201,.18)" stroke-width="9"/><circle cx="32" cy="32" r="${R}" fill="none" stroke="url(#dg)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(Cc * pc / 100).toFixed(1)} ${Cc.toFixed(1)}" transform="rotate(-90 32 32)"/></svg>`, "book-open"),
      card("Para elegir", `${nf.format(D.base.length)}<small>modelos de IA disponibles</small>`, `Del catálogo público de OpenRouter, que reúne modelos de OpenAI, Google, Anthropic, Meta y más.`, "", "layers"),
      card("Cuánto cuesta", `${usd(mid)}<small>por leer unos 10 libros</small>`, "Precio típico (la mediana) entre los modelos de pago del catálogo. Lo habitual va " + (lo != null && hi != null ? `de ${usd(lo)} a ${usd(hi)}` : "según el modelo") + "; hay modelos gratis y otros mucho más caros.", "", "coins"),
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


  document.addEventListener("iar:data", () => {
    const D = I.D; if (!D.base) return;
    kpis(D);
    insightUI(D);
  }, { once: true });
})();
