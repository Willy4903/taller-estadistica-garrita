/* Fuentes y metodología: jerarquía de evidencia, estado real de cada fuente y proceso de actualización. */
(function () {
  "use strict";
  const root = document.getElementById("fuentes-root");
  if (!root) return;
  const I = window.IAR, { esc, ico, lima, fmtDate } = I;

  function statusOf(it, D) {
    const S = (D.status && D.status.sources) || {}, F = (D.news && D.news.feeds) || {};
    if (it.ref) return { k: "ref", t: "Solo referencia", d: "No hay conexión automática verificada." };
    if (it.snapshot && !(S[it.src] && S[it.src].ok)) return { k: "snap", t: "Instantánea con fecha", d: "Cargada y revisada a mano" + (D.frontier ? ` (${fmtDate(D.frontier.asof)}).` : ".") };
    if (it.feed) {
      const names = [].concat(it.feed), ok = names.filter((n) => F[n] && F[n].ok).length;
      if (!Object.keys(F).length) return { k: "pend", t: "Sin estado", d: "Aún no hay registro de la última actualización." };
      return ok ? { k: "auto", t: "Automática", d: `${ok} de ${names.length} feeds respondieron.` } : { k: "caida", t: "Sin respuesta", d: "Se muestra el último dato válido." };
    }
    const s = S[it.src];
    if (!s) return { k: "pend", t: "Sin estado", d: "Aún no hay registro de la última actualización." };
    return s.ok ? { k: "auto", t: "Automática", d: `Última respuesta: ${lima(s.retrieved_at || D.status.updated_at)}.` } : { k: "caida", t: "Sin respuesta", d: "Se muestra el último dato válido." };
  }
  const TAG = { auto: "ok", snap: "warn", ref: "", caida: "risk", pend: "" };

  document.addEventListener("iar:data", () => {
    const D = I.D, S = D.sources;
    if (!S) { root.innerHTML = ""; return; }
    root.innerHTML = `
      <div class="sec-head"><p class="kicker"><b>+</b> Confianza</p><h2 id="t-fuentes">Fuentes y metodología</h2>
        <p class="lead">Cada dato dice de dónde viene, cuándo se obtuvo y qué tan automático es. Si una fuente falla, se muestra el último dato válido y se avisa. Nada se inventa.</p></div>
      <h3 class="sub-h">Jerarquía de evidencia</h3>
      <ol class="lvl">${S.levels.map((l) => `<li><b>${l.n}</b><div><strong>${esc(l.name)}</strong><span>${esc(l.desc)}</span></div></li>`).join("")}</ol>
      <h3 class="sub-h">Cómo se actualiza</h3>
      <ol class="flow"><li>Recuperar</li><li>Normalizar</li><li>Validar</li><li>Comparar</li><li>Detectar cambios</li><li>Publicar</li></ol>
      <p class="muted">Una automatización de GitHub Actions corre cada día (11:00 UTC), guarda una copia en el histórico del repositorio y no sobrescribe el dato anterior. Cada cifra conserva valor, unidad, tipo de métrica, fuente, URL, fecha de publicación, fecha de obtención, proveedor, confianza y nota de metodología (<a href="data/current/facts.json">ver datos</a>).</p>
      <h3 class="sub-h">Estado de cada fuente</h3>
      <div class="table-wrap"><table><thead><tr><th>Fuente</th><th>Nivel</th><th>Uso en IA Radar</th><th>Estado</th></tr></thead><tbody>
        ${S.items.map((it) => { const s = statusOf(it, D); return `<tr><td><a href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.name)}</a></td><td>${it.level}</td><td>${esc(it.use)}</td><td><span class="tag ${TAG[s.k]}">${esc(s.t)}</span><small>${esc(s.d)}</small></td></tr>`; }).join("")}</tbody></table></div>
      <div class="callout">${ico("info")}<p>Los rankings de terceros pueden diferir porque miden cosas distintas. IA Radar los muestra por separado y no promedia sus puntajes. Los puntos con "instantánea" se revisan a mano y pueden estar desactualizados: confirma en la fuente original.</p></div>`;
  }, { once: true });
})();
