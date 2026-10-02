/* Lo último de los laboratorios, rankings de terceros, investigación (arXiv cs.AI) y fuentes.
   Datos: data/frontier.json (instantánea curada con fecha), data/live.json (arXiv y LMArena, automático) y estado de feeds de data/news.json. */
(function () {
  "use strict";
  const rootU = document.getElementById("ultimo-root"), rootS = document.getElementById("fuentes-root");
  if (!rootU || !rootS) return;
  if (window.IAR) start(); else document.addEventListener("iar:ready", start, { once: true });

  async function load(path) {
    try { const r = await fetch(path + "?v=" + Date.now()); return r.ok ? await r.json() : null; } catch (e) { return null; }
  }

  async function start() {
    const I = window.IAR, { esc, ico, provTag, fmtDate } = I;
    const [fr, live, news] = await Promise.all([load("data/frontier.json"), load("data/live.json"), load("data/news.json")]);
    const d = (iso) => fmtDate ? fmtDate(iso) : iso;
    const link = (u, t) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`;

    /* ---------- lo último ---------- */
    let html = "";
    if (fr) {
      const cards = fr.latest.map((x, i) => `
        <article class="lt-card fx" style="--a:${["#22d3ee", "#f43f9e", "#fbbf24", "#34d399", "#8b5cf6", "#fb923c", "#4f8cff"][i % 7]}">
          <div class="lt-top">${provTag(x.prov)}<span class="lt-tag">${esc(x.tag)}</span></div>
          <h3>${esc(x.name)}</h3>
          <p class="lt-date">${ico("calendar-days")} ${esc(d(x.date))}</p>
          <p>${esc(x.what)}</p>
          ${x.why ? `<p class="lt-why">${esc(x.why)}</p>` : ""}
          ${x.ctx || x.price ? `<dl class="lt-spec">${x.ctx ? `<div><dt>Contexto</dt><dd>${esc(x.ctx)}</dd></div>` : ""}${x.price ? `<div><dt>Precio</dt><dd>${esc(x.price)}</dd></div>` : ""}</dl>` : ""}
          <p class="lt-src">Fuente: ${link(x.url, x.src)}</p>
        </article>`).join("");
      const ranks = fr.rankings.map((r) => {
        const max = Math.max(...r.items.map((i) => i.v)), min = Math.min(...r.items.map((i) => i.v));
        const lo = Math.max(0, min - (max - min) * 1.2);
        return `<div class="panel fx" style="--a:#8b5cf6"><h3>${esc(r.title)}</h3>
          <p class="sub">Instantánea del ${esc(d(r.date))}. ${link(r.url, "Ver fuente")}</p>
          <ol class="rk">${r.items.map((i) => `<li><span class="rk-n">${provTag(i.prov)}<b>${esc(i.name)}</b></span><span class="rk-bar"><i style="width:${Math.max(8, ((i.v - lo) / (max - lo)) * 100)}%"></i></span><em>${i.v}</em></li>`).join("")}</ol></div>`;
      }).join("");
      const arena = live && live.arena && live.arena.length ? `<div class="panel fx" style="--a:#34d399"><h3>LMArena: preferencia de usuarios</h3>
          <p class="sub">Puntaje Elo de votaciones a ciegas. Datos automáticos del dataset público de LMArena.</p>
          <ol class="rk">${live.arena.slice(0, 8).map((i) => `<li><span class="rk-n"><b>${esc(i.name)}</b><small>${esc(i.org || "")}</small></span><span class="rk-bar"><i style="width:${Math.max(8, (i.rating - live.arena[Math.min(7, live.arena.length - 1)].rating + 20) / (live.arena[0].rating - live.arena[Math.min(7, live.arena.length - 1)].rating + 20) * 100)}%"></i></span><em>${i.rating}</em></li>`).join("")}</ol></div>` : "";
      html = `
        <h2><span class="hi" style="--a:#22d3ee">${ico("rocket")}</span> Lo último de los laboratorios</h2>
        <p class="sub">Lanzamientos de septiembre y octubre de 2026, con fecha, precio y fuente. Actualizado a ${esc(d(fr.asof))}.</p>
        <div class="lt-grid">${cards}</div>
        <h2 class="lt-h2"><span class="hi" style="--a:#8b5cf6">${ico("trophy")}</span> Quién va primero según terceros</h2>
        <div class="grid2 lt-rk">${ranks}${arena}</div>
        <p class="u-note">${ico("info")}<span>${esc(fr.rank_note)} ${esc(fr.note)}</span></p>`;
    }
    rootU.innerHTML = html;

    /* ---------- investigación ---------- */
    const papers = (live && live.papers) || [];
    const research = papers.length ? `
      <h2 class="lt-h2"><span class="hi" style="--a:#fbbf24">${ico("flask-conical")}</span> Investigación reciente en arXiv cs.AI</h2>
      <p class="sub">Los artículos más nuevos de la categoría de inteligencia artificial, antes de revisión por pares.</p>
      <ul class="pp-list">${papers.slice(0, 6).map((p) => `<li class="fx"><a href="${esc(p.link)}" target="_blank" rel="noopener"><b>${esc(p.title_es || p.title)}</b></a><span>${esc(p.authors)} · ${esc(d(p.published.slice(0, 10)))}</span><p>${esc(p.summary_es || p.summary)}</p></li>`).join("")}</ul>` : "";
    rootU.insertAdjacentHTML("beforeend", research);

    /* ---------- fuentes y metodología ---------- */
    const feeds = (news && news.feeds) || {}, st = (live && live.status) || {};
    const feedOk = (...names) => names.every((n) => feeds[n] && feeds[n].ok);
    const S = [
      ["arXiv cs.AI", "https://arxiv.org/list/cs.AI/recent", st.papers ? (st.papers.ok ? "auto" : "caida") : "pend", "Artículos recientes de investigación (panel de investigación)."],
      ["MIT Technology Review", "https://www.technologyreview.com/topic/artificial-intelligence/", feedOk("MIT Technology Review") ? "auto" : "caida", "Titulares en el panel de noticias."],
      ["Blogs de OpenAI, Anthropic y Google DeepMind", "https://openai.com/news/", feedOk("OpenAI", "Anthropic", "Google DeepMind") ? "auto" : "caida", "Titulares de los laboratorios, traducidos."],
      ["The Rundown AI", "https://www.therundown.ai/", feedOk("The Rundown AI") ? "auto" : "caida", "Boletín diario en el panel de noticias. The Neuron no publica un feed abierto verificado; se consulta como referencia."],
      ["Hugging Face Blog", "https://huggingface.co/blog", feedOk("Hugging Face") ? "auto" : "caida", "Titulares y modelos abiertos en tendencia."],
      ["LMSYS Chatbot Arena (LMArena)", "https://lmarena.ai/leaderboard", st.arena && st.arena.ok ? "auto" : "ref", "Preferencia de usuarios. Se muestra solo si su dataset público responde; si no, queda como referencia."],
      ["Artificial Analysis", "https://artificialanalysis.ai/", "snap", "Índice de inteligencia, precio y velocidad. Instantánea curada con fecha (su API exige clave)."],
      ["Hugging Face Open LLM Leaderboard", "https://huggingface.co/open-llm-leaderboard", "ref", "Referencia para modelos abiertos; en la página se usan las descargas y tendencias de Hugging Face."],
      ["BenchLM", "https://benchlm.ai/", "snap", "Tabla de benchmarks y fechas de lanzamiento. Instantánea curada con fecha."],
      ["OpenRouter", "https://openrouter.ai/models", "auto", "Catálogo, precios y contexto de los modelos (actualizado cada día)."]
    ];
    const lab = { auto: ["Automática", "#34d399"], snap: ["Instantánea con fecha", "#fbbf24"], ref: ["Solo referencia", "#8b8fa8"], caida: ["No respondió hoy", "#f43f9e"], pend: ["Pendiente", "#8b8fa8"] };
    rootS.innerHTML = `
      <h2><span class="hi" style="--a:#34d399">${ico("book-open")}</span> Fuentes y metodología</h2>
      <p class="sub">De dónde sale cada dato y qué tan automático es. Los rankings de terceros pueden diferir entre sí porque miden cosas distintas.</p>
      <ul class="src-list">${S.map(([n, u, k, t]) => `<li class="fx" style="--a:${lab[k][1]}"><div><a href="${esc(u)}" target="_blank" rel="noopener"><b>${esc(n)}</b></a><p>${esc(t)}</p></div><span class="src-b">${lab[k][0]}</span></li>`).join("")}</ul>`;
  }
})();
