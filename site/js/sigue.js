/* 11 Sigue aprendiendo: la formación aparece como siguiente paso lógico, según lo que la persona ya hizo. */
(function () {
  "use strict";
  const root = document.getElementById("sigue-root");
  if (!root) return;
  const I = window.IAR, { esc, ico, store, journey, track } = I;

  function steps(j) {
    const learned = j.microlecciones || j.quiz || j.aprende;
    const tried = j.prompt_construido || j.promptlab || j.selector || j.semaforo || j.checklist;
    const level = j.diagnostico;
    return [["Ya aprendiste algo", !!(learned || j.leyo_aprende)], ["Ya probaste algo", !!tried], ["Ya identificaste tu nivel", !!level], ["Ahora puedes profundizar", !!(learned && tried && level)]];
  }
  function paint() {
    const j = journey.get(), diag = store.get("iar_diag", null), Z = I.D.diag;
    const st = steps(j), done = st.filter((s) => s[1]).length;
    const rec = new Set((diag && diag.routes) || []);
    const routes = Z ? Object.entries(Z.routes) : [];
    root.innerHTML = `
      <p class="kicker light"><b>11</b> Sigue aprendiendo</p>
      <h2 id="t-sigue">Ya entendiste qué está cambiando.<br>Ahora aprende a convertirlo en resultados.</h2>
      <p class="lead light">Pasa de consultar una IA a utilizarla profesionalmente en tu trabajo.</p>
      <ol class="seq">${st.map(([t, ok]) => `<li class="${ok ? "ok" : ""}"><i>${ok ? ico("check") : ""}</i>${esc(t)}</li>`).join("")}</ol>
      <p><a class="btn big light" href="${esc(I.ROOT + "talleres.html")}" data-track="clic_descubrir_ruta">Descubrir mi ruta de aprendizaje ${ico("arrow-right")}</a></p>
      ${routes.length ? `<div class="grid g3 routes">${routes.map(([k, r]) => `<article class="route ${rec.has(k) ? "rec" : ""}">${rec.has(k) ? '<span class="tag acc">Sugerida para tu nivel</span>' : ""}<span class="rt-n">${esc(r.n)}</span><h3>${esc(r.t)}</h3><p class="rt-f">Para personas que:</p><ul>${r.for.map((f) => `<li>${esc(f)}</li>`).join("")}</ul><a class="btn light ghost" href="${esc(I.routeHref(k))}" data-track="clic_ruta_${k}">${esc(r.cta)}</a></article>`).join("")}</div>` : ""}
      <blockquote class="quotes"><p>Leer sobre IA te mantiene informado. Saber utilizarla cambia cómo trabajas.</p><p>Un buen prompt ayuda. Un buen sistema de trabajo transforma el resultado.</p><p>La diferencia no está en tener acceso a IA. Está en saber dirigirla, contextualizarla y verificarla.</p></blockquote>
      <div class="closing"><h2>Entender la IA es el primer paso.</h2><p class="lead light">Aprender a utilizarla profesionalmente es el siguiente.</p>
        <div class="row"><a class="btn big light" href="${esc(I.ROOT + "talleres.html")}" data-track="clic_ver_talleres">Ver talleres y especializaciones</a><a class="btn big light ghost" href="#nivel" data-track="clic_evaluar_nivel">Evaluar mi nivel</a></div>
        <p class="light small">Formación práctica en IA, ChatGPT y Claude de WG IA Estratégica. <a href="${esc(I.CONFIG.wgia)}" target="_blank" rel="noopener" data-track="clic_instructor">Conoce al instructor</a></p></div>`;
  }
  document.addEventListener("iar:data", paint, { once: true });
  document.addEventListener("iar:journey", () => { if (I.D && I.D.diag) paint(); });
})();
