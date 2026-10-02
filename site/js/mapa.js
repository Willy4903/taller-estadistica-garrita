/* Mapa de Perú por departamentos: color = herramienta con más interés de búsqueda, opacidad = su intensidad. Al pasar el mouse muestra el detalle. */
(function () {
  "use strict";
  const I = window.IAR, { esc } = I;
  const COL = { ChatGPT: "#10c9a0", Gemini: "#4f8cff", Claude: "#f08a5d", Copilot: "#22d3ee", DeepSeek: "#9b82ff", Grok: "#a3adb8", Perplexity: "#26c6da", "Meta AI": "#3b82f6", Kimi: "#c084fc" };
  const nz = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/^departamento de /, "").replace("cuzco", "cusco").trim();
  I.TOOL_COL = COL;

  I.peruMap = async function (el, T, opts = {}) {
    const geo = await I.load("content/peru-map.json", null);
    if (!el) return;
    if (!geo || !T) { el.innerHTML = '<p class="muted">El mapa no está disponible por ahora.</p>'; return; }
    const names = Object.keys(T.terms), byName = {};
    (T.peru_regions || []).forEach((r) => { byName[nz(r.name)] = r; });
    const pct = (v) => String(v).replace(".", ",");
    const leads = (T.peru_regions || []).map((r) => Math.max(...names.map((n) => r.share[n])));
    const lo = Math.min(...leads), hi = Math.max(...leads), span = hi - lo || 1;
    const g = geo.depts.map((d) => {
      const r = byName[nz(d.name)];
      let lead = null, op = 0.25;
      if (r) { lead = names.slice().sort((a, b) => r.share[b] - r.share[a])[0]; op = 0.32 + 0.63 * ((r.share[lead] - lo) / span); }
      const label = r ? `${d.name}: lidera ${lead} con ${pct(r.share[lead])} % del interés` : `${d.name}: sin datos suficientes en Google Trends`;
      return `<path class="pd2${opts.selected && nz(opts.selected) === nz(d.name) ? " sel" : ""}" d="${d.d}" data-n="${esc(d.name)}" tabindex="0" role="img" aria-label="${esc(label)}" style="fill:${lead ? COL[lead] : "rgba(141,179,201,.18)"};fill-opacity:${op}"></path>`;
    }).join("");
    el.classList.add("pmap");
    el.innerHTML = `<div class="mapw"><div class="mrings" aria-hidden="true"></div><div class="msweep" aria-hidden="true"></div>
      <svg viewBox="${geo.viewBox}" role="group" aria-label="Mapa de Perú por departamentos">${g}</svg><div class="mtip" role="tooltip" hidden></div></div>
      <ul class="mleg">${names.map((n) => `<li><i style="background:${COL[n]}"></i>${esc(n)}</li>`).join("")}</ul>
      <p class="hud-cap">Color: herramienta con más interés en el departamento. Cuanto más intenso el color, mayor es el peso de esa herramienta en el departamento (de ${pct(lo)} % a ${pct(hi)} %). Fuente: Google Trends, ${esc(T.window || "últimos 3 meses")}. Señal de búsqueda, no usuarios.</p>`;
    const svg = el.querySelector("svg"), tip = el.querySelector(".mtip"), wrap = el.querySelector(".mapw");
    let last = null;
    const show = (path, x, y) => {
      const n = path.dataset.n, r = byName[nz(n)];
      if (path !== last) { last = path; path.parentNode.appendChild(path); }  // lo trae al frente solo al cambiar de departamento
      if (!r) { tip.innerHTML = `<b>${esc(n)}</b><span class="mt-n">Sin datos suficientes en Google Trends.</span>`; }
      else {
        const rows = names.slice().sort((a, b) => r.share[b] - r.share[a]);
        tip.innerHTML = `<b>${esc(n)}</b><span class="mt-n">Interés relativo de búsqueda</span>
          <table>${rows.map((t, i) => `<tr class="${i === 0 ? "top" : ""}"><td><i style="background:${COL[t]}"></i>${esc(t)}</td><td>${pct(r.share[t])} %</td><td>${r.raw ? Math.round(r.raw[t]) : "n/d"}</td></tr>`).join("")}</table>
          <span class="mt-n">Columnas: composición (%) e intensidad (0 a 100).</span>`;
      }
      tip.hidden = false;
      const b = wrap.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
      let left = x - b.left + 14, top = y - b.top + 14;
      if (left + w > b.width) left = x - b.left - w - 14;
      if (left < 0) left = Math.max(0, (b.width - w) / 2);
      if (top + h > b.height) top = Math.max(0, y - b.top - h - 14);
      tip.style.left = left + "px"; tip.style.top = top + "px";
    };
    const hide = () => { tip.hidden = true; last = null; };
    svg.addEventListener("mousemove", (e) => { const p = e.target.closest("path"); if (p) show(p, e.clientX, e.clientY); else hide(); });
    svg.addEventListener("mouseleave", hide);
    svg.addEventListener("focusin", (e) => { const p = e.target.closest("path"); if (p) { const r = p.getBoundingClientRect(); show(p, r.left + r.width / 2, r.top + r.height / 2); } });
    svg.addEventListener("focusout", hide);
    svg.addEventListener("click", (e) => { const p = e.target.closest("path"); if (p && opts.onPick) { opts.onPick(p.dataset.n); } else if (p) show(p, e.clientX, e.clientY); });
    svg.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && opts.onPick) { const p = e.target.closest("path"); if (p) { e.preventDefault(); opts.onPick(p.dataset.n); } } });
  };
})();
