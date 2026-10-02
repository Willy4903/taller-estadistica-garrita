/* Portada tipo consola: paneles de estadísticas y aprendizaje (izquierda) y herramientas clave y modelos activos (derecha). Solo presentación de datos ya existentes. */
(function () {
  "use strict";
  const L = document.getElementById("obs-l"), R = document.getElementById("obs-r");
  if (!L || !R) return;
  const I = window.IAR, { esc, ico, nf, fmtDate, PROV, norm } = I;
  const url = (f) => new URL(I.ROOT + "icons/" + f + ".svg", document.baseURI).href;
  const nm = (m) => m.name.replace(/^[^:]+: /, "");

  /* ---------- izquierda ---------- */
  function left(D) {
    const U = D.users && D.users.items ? [...D.users.items].sort((a, b) => b.value - a.value) : [];
    const max = Math.ceil(Math.max(1, ...U.map((x) => x.value)) / 200) * 200, ticks = Array.from({ length: max / 200 + 1 }, (_, i) => i * 200);
    const bars = U.length ? `<div class="hbars">${U.map((x) => `<div class="hb"><span class="hb-n">${esc(x.name)}</span><span class="hb-t"><i class="${x.metric === "weekly" ? "hot" : ""}" style="--w:${(x.value / max) * 100}%"></i></span><b>${nf.format(x.value)} M</b></div>`).join("")}<div class="hb-ax" aria-hidden="true">${ticks.map((t) => `<span>${nf.format(t)} M</span>`).join("")}</div></div>
      <p class="hud-cap"><i class="hot"></i> activos semanales <i></i> activos mensuales · cifras que reportan las empresas, no auditadas</p>` : '<p class="muted">Sin cifras de usuarios cargadas.</p>';

    const ch = (D.changes && D.changes.items) || [], w = ch.filter((c) => I.daysAgo(c.date) <= 30);
    const nNew = w.filter((c) => c.kind === "nuevo").length, dn = w.filter((c) => c.kind.startsWith("precio") && c.after < c.before).length, up = w.filter((c) => c.kind.startsWith("precio") && c.after > c.before).length;
    const A = D.academy, lv = A ? A.levels : [], l1 = lv[0];
    const G = (D.glossary && D.glossary.terms) || [];
    const g = G.length ? G[Math.floor(Date.now() / 864e5) % G.length] : null;

    L.innerHTML = `
      <section class="hud" aria-labelledby="hl-t"><h2 class="hud-t" id="hl-t">Estadísticas y aprendizaje</h2>
        <div class="hud-in"><h3>Usuarios</h3><p class="hud-s">¿Cuántas personas usan cada IA, según las propias empresas?</p>${bars}</div>
        <div class="hud-row">
          <div class="hud-in"><h3>Antes → ahora</h3><p class="hud-s">Cada cambio frente a la versión anterior, con la fuente al lado.</p>
            <div class="kpi2"><div><b>${nNew}</b><span>modelos nuevos detectados</span></div><div><b>${dn} ↓ ${up} ↑</b><span>cambios de precio</span></div></div>
            <a class="hud-a" href="#cambios">Ver qué cambió ${ico("arrow-right")}</a></div>
          <div class="hud-in"><h3>Glosario de IA</h3>${g ? `<p class="gl-p"><b>${esc(g.term)}</b><span>${esc(g.es)}</span></p><p class="hud-s">En 20 segundos: ${esc(g.short)}</p><a class="hud-a" href="glosario.html">Abrir el glosario ${ico("arrow-right")}</a>` : ""}</div>
        </div>
        <div class="hud-in"><h3>${l1 ? esc(l1.name) : "Entender"}</h3>${l1 ? `<p class="hud-s">${esc(l1.desc)}</p><ul class="les-p">${l1.lessons.map((x) => `<li><span>${esc(x.title)}</span><em>${x.min} min</em></li>`).join("")}</ul><a class="hud-a" href="#aprende">Empezar la ruta ${ico("arrow-right")}</a>` : ""}</div>
      </section>`;
    const C = document.getElementById("obs-c");
    if (C) C.innerHTML = `<section class="hud" aria-label="Ruta de aprendizaje"><h2 class="hud-t">Ruta de aprendizaje</h2><div class="hud-in">
          <ol class="route-p">${lv.map((x) => `<li><b>Nivel ${x.n} · ${esc(x.name)}</b><span>${esc(x.desc)}</span></li>`).join("")}</ol></div></section>`;
  }

  /* ---------- derecha ---------- */
  const latest = (D, slugs, n = 1) => {
    const set = new Set([].concat(slugs));
    return D.base.filter((m) => set.has(norm(m.provider)) && m.price_in != null).sort((a, b) => b.created.localeCompare(a.created)).slice(0, n);
  };
  const DEPT = { Amazonas: [-77.9, -5.9], Apurímac: [-72.9, -14], Arequipa: [-72.5, -15.8], Ayacucho: [-74, -13.8], Cajamarca: [-78.5, -6.8], Callao: [-77.15, -12.05], Cuzco: [-72, -13.2], "Departamento de Lima": [-76.6, -11.6], Huancavelica: [-75, -13], Huánuco: [-76.2, -9.6], Ica: [-75.3, -14.2], Junín: [-75, -11.6], "La Libertad": [-78.4, -8], Lambayeque: [-79.6, -6.4], Loreto: [-74, -4.5], "Madre de Dios": [-70.5, -12], Moquegua: [-70.9, -16.9], Pasco: [-75.6, -10.5], Piura: [-80.3, -5.2], Puno: [-70, -14.5], "San Martín": [-76.7, -7], Tacna: [-70.3, -17.6], Tumbes: [-80.4, -3.8], Ucayali: [-73.4, -9.6] };
  const OUT = [[-81.3, -4.7], [-80.3, -3.4], [-79.3, -4], [-78.9, -4.6], [-78.3, -3.4], [-77.8, -2.9], [-76.6, -2.6], [-75.6, -1.5], [-75.2, -0.1], [-74, -0.9], [-73.2, -2.4], [-71.5, -2.2], [-70.2, -4.2], [-70.8, -7.6], [-72.5, -9], [-73, -9.4], [-72, -10], [-70.6, -11], [-69.6, -10.9], [-69.1, -12.4], [-68.7, -12.6], [-69.4, -14.3], [-69.1, -15.3], [-69.5, -16.2], [-69.2, -17.7], [-70.4, -18.3], [-71.5, -17.3], [-73, -16.2], [-75, -14.7], [-76.3, -13.2], [-77.1, -12], [-78.5, -10], [-79.5, -8.2], [-80.4, -6.8], [-81.2, -5.9]];
  const COLT = { ChatGPT: "#10a37f", Gemini: "#4f8cff", Claude: "#e8845f", Copilot: "#22d3ee", DeepSeek: "#8a6cff" };
  function map(D) {
    const T = D.trends && D.trends.sets && D.trends.sets.A;
    if (!T) return `<div class="hud-in"><h3>IA en Perú</h3><p class="hud-s">Los datos de Google Trends aún no están disponibles.</p></div>`;
    const X = (lon) => (lon + 82) * 18, Y = (lat) => -lat * 18 + 6;
    const poly = OUT.map((p) => X(p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1)).join(" ");
    const names = Object.keys(T.terms);
    const dots = (T.peru_regions || []).filter((r) => DEPT[r.name]).map((r) => {
      const lead = names.slice().sort((a, b) => r.share[b] - r.share[a])[0], inten = r.raw ? r.raw[lead] : r.total / 2;
      return `<g><circle cx="${X(DEPT[r.name][0]).toFixed(1)}" cy="${Y(DEPT[r.name][1]).toFixed(1)}" r="${(3 + (inten / 100) * 7).toFixed(1)}" fill="${COLT[lead]}" class="pd"><title>${esc(r.name.replace("Departamento de ", ""))}: ${esc(lead)} ${r.share[lead]} %</title></circle></g>`;
    }).join("");
    const pe = T.countries && T.countries.PE;
    const lead = pe ? names.slice().sort((a, b) => pe.share[b] - pe.share[a]) : [];
    return `<div class="hud-in mapp"><h3>IA en Perú</h3><p class="hud-s">Herramienta con mayor interés de búsqueda en cada departamento (Google Trends).</p>
      <div class="mapw"><div class="mrings" aria-hidden="true"></div><div class="msweep" aria-hidden="true"></div>
      <svg viewBox="0 0 250 340" role="img" aria-label="Mapa de Perú con la herramienta de IA más buscada por departamento"><polygon points="${poly}" class="pe-shape"/>${dots}</svg></div>
      <ul class="mleg">${names.slice(0, 4).map((n) => `<li><i style="background:${COLT[n]}"></i>${esc(n)}</li>`).join("")}</ul>
      ${pe ? `<p class="hud-cap">A escala nacional, ${esc(lead[0])} concentra el ${pe.share[lead[0]]} % del interés. Es una señal de búsqueda, no de usuarios.</p>` : ""}</div>`;
  }

  function right(D) {
    const tile = (slug, icon, label, model, sub, cls) => `<a class="tile t-${cls}" href="#modelos" data-track="clic_tile_${cls}"><span class="logo3d" style="--m:url(${url(icon)})"></span><b>${esc(label)}</b><span class="mdl">${esc(model)}</span>${sub ? `<small>${esc(sub)}</small>` : ""}</a>`;
    const t = [];
    const o = latest(D, "openai")[0]; if (o) t.push(tile("openai", "openai", "OpenAI", nm(o), fmtDate(o.created), "openai"));
    const arg = D.frontier && D.frontier.latest && D.frontier.latest.find((x) => x.prov === "google");
    const go = latest(D, "google", 1)[0];
    if (arg) t.push(tile("google", "google", "Google", arg.name, "acceso limitado", "google"));
    if (go) t.push(tile("google", "google", "Google", nm(go), fmtDate(go.created), "google2"));
    const an = latest(D, "anthropic")[0]; if (an) t.push(tile("anthropic", "anthropic", "Anthropic", nm(an), fmtDate(an.created), "anthropic"));
    const me = latest(D, ["meta", "meta-llama"])[0]; if (me) t.push(tile("meta", "meta", "Meta", nm(me), fmtDate(me.created), "meta"));
    t.push(tile("microsoft", "microsoft", "Microsoft", "Copilot", D.users && D.users.items.find((x) => /copilot/i.test(x.name)) ? "150 M usuarios mensuales" : "", "microsoft"));
    const xa = latest(D, "x-ai")[0]; if (xa) t.push(tile("xai", "xai", "xAI", nm(xa), fmtDate(xa.created), "xai"));
    const ds = latest(D, "deepseek")[0]; if (ds) t.push(tile("deepseek", "deepseek", "DeepSeek", nm(ds), fmtDate(ds.created), "deepseek"));
    const co = latest(D, "cohere")[0]; if (co) t.push(tile("cohere", "cohere", "Cohere", nm(co), fmtDate(co.created), "cohere"));
    R.innerHTML = `<section class="hud" aria-labelledby="hr-t"><h2 class="hud-t" id="hr-t">Herramientas clave y modelos activos</h2><div class="tiles">${t.join("")}</div>${map(D)}</section>`;
  }

  document.addEventListener("iar:data", () => { const D = I.D; if (!D.base) return; left(D); right(D); }, { once: true });
})();
