/* Casos de uso por perfil y recetas de automatización. Cada caso enlaza con un prompt del Prompt Lab y declara su nivel de riesgo. */
(function () {
  "use strict";
  const root = document.getElementById("casos-root");
  if (!root) return;
  const I = window.IAR, { esc, ico, track, journey } = I;
  const RISK = { verde: ["Riesgo bajo", "ok"], amarillo: ["Requiere verificación", "warn"], rojo: ["Evitar sin controles", "risk"] };

  document.addEventListener("iar:data", () => {
    const U = I.D.usecases, P = I.D.prompts;
    if (!U) { root.innerHTML = ""; return; }
    const lib = (id) => P && P.library && P.library.find((x) => x.id === id);
    let cur = U.profiles[0].id;
    root.innerHTML = `
      <div class="sec-head"><p class="kicker"><b>10</b> Lleva la IA a tu trabajo</p><h2 id="t-casos">Casos de uso y automatización</h2>
        <p class="lead">${esc(U.intro)}</p></div>
      <div class="chips" id="cs-prof" role="group" aria-label="Perfil">${U.profiles.map((p) => `<button type="button" class="chip-btn" data-p="${p.id}" aria-pressed="${p.id === cur}">${esc(p.name)}</button>`).join("")}</div>
      <div class="grid g3 cs-grid" id="cs-grid" aria-live="polite"></div>
      <div class="card cs-auto"><h3>${esc(U.automation.title)}</h3><p class="muted">${esc(U.automation.intro)}</p>
        <div class="grid g3">${U.automation.recipes.map((r) => `<article class="recipe"><h4>${esc(r.t)}</h4><ol>${r.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol><p><b>Herramientas:</b> ${esc(r.tools)}</p><p><b>Control humano:</b> ${esc(r.control)}</p></article>`).join("")}</div>
        <h4>Reglas para empezar bien</h4><ul class="cs-rules">${U.automation.rules.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>
        <p class="muted">¿Quieres llevar esto a tu institución? Mira las <a href="#sigue" data-track="clic_casos_formacion">rutas de formación</a>.</p></div>`;
    const grid = document.getElementById("cs-grid");
    const paint = () => {
      const p = U.profiles.find((x) => x.id === cur);
      grid.innerHTML = p.cases.map((c) => { const l = lib(c.lib), r = RISK[c.risk]; return `<article class="card cs-card"><span class="tag ${r[1]}">${r[0]}</span><h4>${esc(c.task)}</h4><p class="muted"><b>Resultado:</b> ${esc(c.result)}</p>${l ? `<button type="button" class="btn sm ghost" data-lib="${esc(l.id)}">Ver prompt: ${esc(l.label.toLowerCase())}</button>` : ""}</article>`; }).join("");
    };
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-p]"), l = e.target.closest("[data-lib]");
      if (b) { cur = b.dataset.p; root.querySelectorAll("[data-p]").forEach((x) => x.setAttribute("aria-pressed", x === b)); paint(); track("casos_perfil", { p: cur }); journey.mark("casos"); }
      if (l) { track("casos_ir_prompt", { id: l.dataset.lib }); document.dispatchEvent(new CustomEvent("iar:openlib", { detail: l.dataset.lib })); const t = document.getElementById("pl-lib"); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); }
    });
    paint();
  }, { once: true });
})();
