/* 03 Radar de modelos: selector por problema, capacidades por laboratorio, tabla de modelos vigentes y comparador. */
(function () {
  "use strict";
  const root = document.getElementById("modelos-root"), cat = document.getElementById("catalog-root");
  if (!root && !cat) return;
  const I = window.IAR, { esc, ico, fmtDate, fmtCtx, fmtPrice, nf, provTag, provName, isMajor, family, uses, costExamples, descText, money, track, journey, daysAgo, INPUT_ES } = I;
  const blend = (m) => (m.price_in * 3 + m.price_out) / 4;
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9.]/g, "");
  const nm = (m) => m.name.replace(/^[^:]+: /, "");

  /* ---------- benchmarks por modelo (cada fuente por separado, nunca mezcladas) ---------- */
  function benchOf(D, m) {
    const key = slug(nm(m)), out = [];
    ((D.frontier && D.frontier.rankings) || []).forEach((r) => {
      const hit = r.items.find((i) => slug(i.name) === key);
      if (hit) out.push({ src: r.title.split(":")[0], v: hit.v, unit: "índice", url: r.url });
    });
    const a = ((D.arena && D.arena.rows) || []).find((x) => { const k = slug(x.name); return k === key || k.startsWith(key + "-") || k.startsWith(key); });
    if (a) out.push({ src: "LMArena", v: a.rating, unit: "Elo", url: "https://lmarena.ai/leaderboard" });
    return out;
  }
  const benchHtml = (b) => (b.length ? b.map((x) => `<span class="tag acc" title="${esc(x.src)}: ${x.v} (${x.unit})">${esc(x.src)} ${x.v}</span>`).join(" ") : '<span class="muted">sin dato comparable</span>');

  /* ---------- modelos vigentes por familia ---------- */
  function current(D, days = 150) {
    const g = {};
    D.base.filter((m) => isMajor(m) && m.price_in > 0 && m.price_out > 0 && daysAgo(m.created) <= days).forEach((m) => { (g[family(m)] = g[family(m)] || []).push(m); });
    return Object.values(g).map((a) => a.sort((x, y) => y.created.localeCompare(x.created))[0]).map((m) => ({ ...m, blend: blend(m) }));
  }
  const modal = (m) => ["texto", ...(m.inputs || []).filter((i) => i !== "text").map((i) => INPUT_ES[i] || i)].join(", ");

  /* ---------- selector por problema ---------- */
  function candidates(D, f) {
    let c = current(D).filter((m) => (!f.minContext || m.context >= f.minContext) && (!f.reasoning || m.reasoning) && (!f.inputs || f.inputs.every((i) => (m.inputs || []).includes(i))));
    let relaxed = false;
    if (f.tag) {
      const t = c.filter((m) => uses(m).tags.some((x) => x.t === f.tag));
      if (t.length >= 3) c = t; else relaxed = true;
    }
    return { list: c, relaxed };
  }
  function pickABC(list, cheap) {
    const s = [...list].sort((a, b) => (cheap ? a.blend - b.blend : b.blend - a.blend));
    if (s.length <= 3) return s;
    const pick = [s[0], s[Math.floor(s.length / 2)], s[s.length - 1]];
    const seen = new Set(), out = [];
    for (const m of pick) { if (!seen.has(m.id)) { seen.add(m.id); out.push(m); } }
    return out;
  }
  function whyText(m, role, p) {
    const bits = [];
    bits.push(`Contexto de ${fmtCtx(m.context)} tokens`);
    if (m.reasoning) bits.push("razona antes de responder");
    if ((m.inputs || []).includes("file")) bits.push("acepta archivos");
    else if ((m.inputs || []).includes("image")) bits.push("acepta imágenes");
    const ex = costExamples(m)[0];
    const cost = ex ? ` Como referencia, 1,000 conversaciones de soporte costarían unos ${money(ex[2])}.` : "";
    return `${role}. ${bits.join(", ")}. Cuesta ${fmtPrice(m.price_in)} de entrada y ${fmtPrice(m.price_out)} de salida por millón de tokens.${cost}`;
  }
  function optionsFor(D, p) {
    if (p.filter.local) {
      const hf = ((D.models && D.models.hf) || []).slice(0, 3);
      const roles = ["Más descargado en tendencia", "Alternativa popular", "Otra opción en tendencia"];
      return { opts: hf.map((h, i) => ({ name: h.id, prov: h.id.split("/")[0], why: `${roles[i]} en Hugging Face (${nf.format(h.downloads)} descargas, ${nf.format(h.likes)} me gusta). Antes de descargarlo revisa la licencia, el tamaño y si tu equipo tiene memoria suficiente.`, url: "https://huggingface.co/" + h.id })), note: "La tendencia indica popularidad, no calidad. Confirma licencia y requisitos de hardware." };
    }
    const f = p.filter;
    if (p.nodata) return { opts: [], note: p.nodata };
    const { list, relaxed } = candidates(D, f);
    const picked = pickABC(list, f.cheapBias);
    const roles = f.cheapBias ? ["Opción más económica", "Opción intermedia", "Opción de mayor gama"] : ["Gama alta: el mayor precio, suele ser el más capaz", "Gama media: equilibrio entre costo y capacidad", "Gama económica: el menor precio entre los que cumplen"];
    return { opts: picked.map((m, i) => ({ m, prov: m.provider, name: nm(m), why: whyText(m, roles[i] || "Alternativa", p), url: "https://openrouter.ai/" + m.id })), note: relaxed ? `Ningún modelo declara "${f.tag}" de forma explícita; se muestran los que cumplen los demás requisitos.` : "" };
  }
  function selector(D) {
    const R = D.recommender;
    if (!R) return "";
    return `<div class="card sel" id="selector">
      <h3>Elige tu problema y compara opciones</h3>
      <p class="muted">IA Radar no responde "usa X". Te muestra tres opciones y por qué cada una encaja.</p>
      <div class="chips" role="group" aria-label="Problema">${R.problems.map((p, i) => `<button type="button" class="chip-btn" data-p="${p.id}" aria-pressed="${i === 0}">${ico(p.icon)} ${esc(p.label)}</button>`).join("")}</div>
      <div id="sel-out" aria-live="polite"></div><p class="muted sel-note">${esc(R.note)}</p></div>`;
  }
  function paintSelector(D, id) {
    const p = D.recommender.problems.find((x) => x.id === id);
    const { opts, note } = optionsFor(D, p);
    const L = ["A", "B", "C"];
    document.getElementById("sel-out").innerHTML = `
      <div class="sel-need"><b>Qué importa para ${esc(p.label.toLowerCase())}:</b> ${esc(p.need)}</div>
      ${opts.length ? `<div class="grid g3">${opts.map((o, i) => `<article class="opt"><span class="opt-l">Opción ${L[i]}</span>${provTag(o.prov)}<h4>${esc(o.name)}</h4><p>${esc(o.why)}</p><a href="${esc(o.url)}" target="_blank" rel="noopener">Ver ficha</a></article>`).join("")}</div>` : ""}
      ${note ? `<div class="callout warn">${ico("info")}<p>${esc(note)}</p></div>` : ""}
      <div class="callout ok">${ico("lightbulb")}<p><b>Consejo:</b> ${esc(p.tip)}</p></div>`;
  }

  /* ---------- capacidades por laboratorio ---------- */
  const LABS = [["openai", "OpenAI"], ["anthropic", "Anthropic"], ["google", "Google"], ["x-ai", "xAI"], ["meta-llama", "Meta"], ["deepseek", "DeepSeek"], ["mistralai", "Mistral"], ["qwen", "Qwen"], ["moonshotai", "Kimi"]];
  function labMatrix(D) {
    const open = new Set((D.recommender && D.recommender.open_providers) || []);
    const cur = current(D, 365);
    const rows = LABS.map(([slugp, label]) => {
      const ms = cur.filter((m) => I.norm(m.provider) === slugp || (slugp === "meta-llama" && I.norm(m.provider) === "meta")).sort((a, b) => b.created.localeCompare(a.created));
      if (!ms.length) return `<tr><td><b>${esc(label)}</b></td><td colspan="7" class="muted">Sin modelos vigentes en el catálogo de OpenRouter durante el último año.</td></tr>`;
      const top = ms[0], ctx = Math.max(...ms.map((m) => m.context)), pr = ms.map((m) => m.blend), any = (f) => ms.some(f);
      const yes = '<span class="tag ok">Sí</span>', no = '<span class="tag">No declarado</span>';
      const bench = ms.flatMap((m) => benchOf(D, m)).filter((b, i, a) => a.findIndex((x) => x.src === b.src) === i);
      return `<tr><td>${provTag(slugp)}<small>Más reciente: ${esc(nm(top))} (${esc(fmtDate(top.created))})</small></td>
        <td>${any((m) => m.reasoning) ? yes : no}</td><td>${any((m) => m.multimodal) ? yes : no}</td><td>${fmtCtx(ctx)}</td>
        <td>${money(Math.min(...pr))} a ${money(Math.max(...pr))}<small>por millón (mixto 3:1)</small></td>
        <td>${open.has(slugp) ? '<span class="tag acc">Algunos modelos</span>' : no}</td><td>${benchHtml(bench)}</td></tr>`;
    }).join("");
    return `<div class="table-wrap"><table><thead><tr><th>Laboratorio</th><th>Razonamiento</th><th>Multimodal</th><th>Contexto máx.</th><th>Precio</th><th>Pesos abiertos</th><th>Benchmarks</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="muted">${ico("info")} Código, investigación, agentes, imagen, video, voz y velocidad dependen de benchmarks específicos. IA Radar no los mezcla ni los inventa: consúltalos en <a href="https://artificialanalysis.ai/" target="_blank" rel="noopener">Artificial Analysis</a> y <a href="https://lmarena.ai/leaderboard" target="_blank" rel="noopener">LMArena</a>. "Pesos abiertos: algunos modelos" indica que el laboratorio publica modelos descargables, no que todos lo sean.</p>`;
  }

  /* ---------- tabla de modelos vigentes + comparador ---------- */
  const picked = new Set();
  function detail(D, m) {
    const u = uses(m), d = descText(m), ex = costExamples(m), b = benchOf(D, m);
    const upd = D.models.meta.updated_date;
    return `<div class="md">
      <dl class="md-spec"><div><dt>Proveedor</dt><dd>${esc(provName(m.provider))}</dd></div><div><dt>Versión</dt><dd>${esc(nm(m))}</dd></div><div><dt>Fecha</dt><dd>${esc(fmtDate(m.created))}</dd></div>
        <div><dt>Contexto</dt><dd>${nf.format(m.context)} tokens</dd></div><div><dt>Precio por millón</dt><dd>${fmtPrice(m.price_in)} entrada · ${fmtPrice(m.price_out)} salida</dd></div><div><dt>Modalidades</dt><dd>${esc(modal(m))}</dd></div>
        <div><dt>API</dt><dd>Disponible por la API de OpenRouter (<code>${esc(m.id)}</code>) y por la del proveedor</dd></div><div><dt>Benchmarks</dt><dd>${benchHtml(b)}</dd></div>
        <div><dt>Disponibilidad</dt><dd>Listado en el catálogo de OpenRouter</dd></div><div><dt>Fuente</dt><dd><a href="https://openrouter.ai/${encodeURI(m.id)}" target="_blank" rel="noopener">OpenRouter</a></dd></div><div><dt>Última actualización</dt><dd>${esc(fmtDate(upd))}</dd></div></dl>
      <div class="md-cols"><div><h5>${ico("lightbulb")} Para qué es bueno</h5><ul>${u.good.map((g) => `<li><b>${esc(g.t)}.</b> ${esc(g.why)}</li>`).join("")}</ul></div>
        <div><h5>${ico("triangle-alert")} Con cuidado</h5>${u.care.length ? `<ul>${u.care.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : '<p class="muted">Sin advertencias por precio o contexto.</p>'}
        ${ex.length ? `<h5>${ico("receipt")} Costo de ejemplo</h5><ul>${ex.map((e) => `<li>${esc(e[1])}: <b>${esc(money(e[2]))}</b></li>`).join("")}</ul>` : ""}</div></div>
      ${d ? `<p class="md-d"><b>Según el proveedor${d.en ? " (en inglés)" : ""}:</b> ${esc(d.t)}</p>` : ""}
      <p class="muted">La orientación se calcula con precio, contexto y capacidades; no mide la calidad real.</p></div>`;
  }
  function radarTable(D, list, opts = {}) {
    const curated = (opts.curated || []).map((c) => `<tr class="cur"><td></td><td><span class="tag">curado</span> ${provTag(c.prov)}<br><b>${esc(c.name)}</b><small>${esc(fmtDate(c.date))}</small></td><td>${esc(c.ctx || "n/d")}</td><td>${esc(c.price || "n/d")}</td><td colspan="3">${esc(c.what)} <a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.src)}</a></td></tr>`).join("");
    return `<div class="table-wrap"><table class="radar"><thead><tr><th>Seleccionar</th><th>Modelo</th><th>Contexto</th><th>Precio por millón</th><th>Modalidades</th><th>Benchmarks</th><th></th></tr></thead><tbody>
      ${curated}
      ${list.map((m) => `<tr data-id="${esc(m.id)}"><td><input type="checkbox" class="pk" aria-label="Comparar ${esc(nm(m))}" ${picked.has(m.id) ? "checked" : ""}></td>
        <td>${provTag(m.provider)}<br><b>${esc(nm(m))}</b><small>${esc(fmtDate(m.created))}</small></td><td>${fmtCtx(m.context)}</td>
        <td>${fmtPrice(m.price_in)} / ${fmtPrice(m.price_out)}</td><td>${esc(modal(m))}${m.reasoning ? ", razonamiento" : ""}</td><td>${benchHtml(benchOf(D, m))}</td>
        <td><button type="button" class="chip-btn tg" aria-expanded="false">Detalle</button></td></tr>`).join("")}</tbody></table></div>`;
  }
  function bindTable(D, scope, getList) {
    scope.addEventListener("click", (e) => {
      const tg = e.target.closest(".tg");
      if (tg) {
        const tr = tg.closest("tr"), open = tg.getAttribute("aria-expanded") === "true";
        tg.setAttribute("aria-expanded", !open);
        const nx = tr.nextElementSibling;
        if (nx && nx.classList.contains("md-row")) nx.remove();
        if (!open) {
          const m = D.base.find((x) => x.id === tr.dataset.id);
          tr.insertAdjacentHTML("afterend", `<tr class="md-row"><td colspan="7">${detail(D, m)}</td></tr>`);
          track("modelo_detalle");
        }
      }
    });
    scope.addEventListener("change", (e) => {
      if (!e.target.classList.contains("pk")) return;
      const id = e.target.closest("tr").dataset.id;
      if (e.target.checked) { if (picked.size >= 4) { e.target.checked = false; return; } picked.add(id); } else picked.delete(id);
      paintCompare(D);
    });
  }
  function paintCompare(D) {
    const box = document.getElementById("cmp-out");
    if (!box) return;
    const ms = [...picked].map((id) => D.base.find((m) => m.id === id)).filter(Boolean);
    if (ms.length < 2) { box.innerHTML = `<p class="muted">Marca de 2 a 4 modelos en la tabla para compararlos lado a lado (${ms.length} elegido${ms.length === 1 ? "" : "s"}).</p>`; return; }
    track("comparador_usado", { n: ms.length }); journey.mark("comparo");
    const row = (l, f) => `<tr><th>${l}</th>${ms.map((m) => `<td>${f(m)}</td>`).join("")}</tr>`;
    box.innerHTML = `<div class="table-wrap"><table class="cmp"><thead><tr><th></th>${ms.map((m) => `<th>${esc(nm(m))}</th>`).join("")}</tr></thead><tbody>
      ${row("Proveedor", (m) => provTag(m.provider))}${row("Fecha", (m) => esc(fmtDate(m.created)))}${row("Contexto", (m) => nf.format(m.context) + " tokens")}
      ${row("Precio de entrada", (m) => fmtPrice(m.price_in))}${row("Precio de salida", (m) => fmtPrice(m.price_out))}${row("Modalidades", (m) => esc(modal(m)))}
      ${row("Razonamiento", (m) => (m.reasoning ? "Sí" : "No declarado"))}${row("Benchmarks", (m) => benchHtml(benchOf(D, m)))}${row("Ideal para", (m) => esc(uses(m).tags.map((t) => t.t).join(", ")))}</tbody></table></div>
      <p class="muted">Cada benchmark pertenece a una fuente distinta y no se suman ni se promedian.</p>`;
  }

  document.addEventListener("iar:data", () => {
    const D = I.D;
    if (!D.base) { (root || cat).innerHTML = '<div class="callout warn">' + ico("triangle-alert") + "<p>No se pudo cargar el catálogo de modelos.</p></div>"; return; }
    if (root) {
      const rank = (m) => { const i = LABS.findIndex(([k]) => k === I.norm(m.provider) || (k === "meta-llama" && I.norm(m.provider) === "meta")); return i < 0 ? 99 : i; };
      const list = current(D).filter((m) => rank(m) < 99).sort((a, b) => b.created.localeCompare(a.created) || b.blend - a.blend).slice(0, 8);
      const curated = ((D.frontier && D.frontier.latest) || []).filter((x) => x.ctx && x.price && !D.base.some((m) => slug(nm(m)) === slug(x.name)));
      root.innerHTML = `
        <div class="sec-head"><p class="kicker"><b>03</b> Quién destaca y en qué</p><h2 id="t-modelos">Radar de modelos</h2>
          <p class="lead">No hay un ganador universal. Cada modelo destaca en cosas distintas, así que se compara por tarea, precio y contexto.</p></div>
        ${selector(D)}
        <h3 class="sub-h">Capacidades por laboratorio</h3>${labMatrix(D)}
        <h3 class="sub-h">Modelos vigentes</h3>
        ${radarTable(D, list, { curated })}
        <div id="cmp-out" class="cmp-out" aria-live="polite"></div>
        <p><a class="btn ghost" href="modelos.html" data-track="clic_catalogo_completo">Ver el catálogo completo ${ico("arrow-right")}</a></p>`;
      const first = D.recommender && D.recommender.problems[0];
      if (first) paintSelector(D, first.id);
      root.querySelector("#selector").addEventListener("click", (e) => {
        const b = e.target.closest("[data-p]"); if (!b) return;
        root.querySelectorAll("#selector [data-p]").forEach((x) => x.setAttribute("aria-pressed", x === b));
        paintSelector(D, b.dataset.p); track("selector_problema", { p: b.dataset.p }); journey.mark("selector");
      });
      bindTable(D, root); paintCompare(D);
    }
    if (cat) {
      const st = { q: "", prov: "", n: 30 };
      const provs = [...new Set(D.base.map((m) => m.provider))].sort();
      cat.innerHTML = `<div class="cat-bar"><label class="f">Buscar<input type="search" id="cq" placeholder="Modelo o proveedor"></label>
        <label class="f">Proveedor<select id="cp"><option value="">Todos</option>${provs.map((p) => `<option value="${esc(p)}">${esc(provName(p))}</option>`).join("")}</select></label><span class="muted" id="cc"></span></div>
        <div id="cat-tbl"></div><div id="cmp-out" class="cmp-out"></div><p><button class="btn ghost" id="cmore" type="button">Mostrar más</button></p>`;
      const paint = () => {
        const q = st.q.toLowerCase();
        const L = D.base.filter((m) => (!st.prov || m.provider === st.prov) && (!q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q))).sort((a, b) => b.created.localeCompare(a.created));
        document.getElementById("cc").textContent = nf.format(L.length) + " modelos";
        document.getElementById("cat-tbl").innerHTML = radarTable(D, L.slice(0, st.n));
        document.getElementById("cmore").hidden = L.length <= st.n;
      };
      cat.addEventListener("input", (e) => { if (e.target.id === "cq") { st.q = e.target.value; st.n = 30; paint(); } });
      cat.addEventListener("change", (e) => { if (e.target.id === "cp") { st.prov = e.target.value; st.n = 30; paint(); } });
      document.getElementById("cmore").addEventListener("click", () => { st.n += 30; paint(); });
      bindTable(D, cat); paint(); paintCompare(D);
    }
  }, { once: true });
})();
