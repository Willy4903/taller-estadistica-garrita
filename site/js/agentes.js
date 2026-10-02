/* 07 De prompts a agentes: método transversal, context engineering interactivo y escalera prompt -> sistema multiagente. */
(function () {
  "use strict";
  const root = document.getElementById("agentes-root");
  if (!root) return;
  const I = window.IAR, { esc, ico, track, journey } = I;

  document.addEventListener("iar:data", () => {
    const G = I.D.agents;
    if (!G) { root.innerHTML = ""; return; }
    const on = new Set();
    root.innerHTML = `
      <div class="sec-head"><p class="kicker"><b>07</b> Aplicar a escala</p><h2 id="t-agentes">Del prompt al contexto, y de ahí a los agentes</h2>
        <p class="lead">Usar IA no es escribir una pregunta y copiar la respuesta. Es formular el problema, elegir herramienta, dar contexto, revisar fuentes, verificar y convertir el resultado en un entregable.</p></div>
      <ol class="method">${G.method.map((m, i) => `<li><span>${i + 1}</span><b>${esc(m.t)}</b><small>${esc(m.d)}</small></li>`).join("")}</ol>

      <div class="card ctx">
        <h3>Del prompt al contexto</h3>
        <p>Un buen modelo con mal contexto puede producir un mal resultado. Un contexto bien construido puede transformar la calidad del trabajo. Activa cada pieza y mira cuántas cosas deja de adivinar la IA.</p>
        <div class="grid g2 ctx-cmp"><div class="cc"><span class="pl-k">${esc(G.compare.prompt.t)}</span><p>"${esc(G.compare.prompt.q)}"</p></div><div class="cc on"><span class="pl-k">${esc(G.compare.context.t)}</span><p>"${esc(G.compare.context.q)}"</p></div></div>
        <div class="ctx-grid">${G.context_parts.map((c, i) => `<button type="button" class="ctx-p" data-i="${i}" aria-pressed="false"><b>${esc(c.t)}</b><span>${esc(c.ex)}</span></button>`).join("")}</div>
        <div class="ctx-res" aria-live="polite"></div>
        <p class="ctx-eq mono">system prompt + instrucciones + archivos + datos + memoria + herramientas + historial + reglas = contexto de trabajo</p>
      </div>

      <h3 class="sub-h">De un prompt a un sistema multiagente</h3>
      <div class="ladder">${G.ladder.map((l, i) => `<details class="rung" ${i === 0 ? "open" : ""}><summary><span class="rg-n">${i + 1}</span><b>${esc(l.t)}</b><span class="muted">${esc(l.what)}</span></summary>
        <dl><div><dt>Qué resuelve</dt><dd>${esc(l.solves)}</dd></div><div><dt>Cuándo usarlo</dt><dd>${esc(l.when)}</dd></div><div><dt>Ejemplo</dt><dd>${esc(l.ex)}</dd></div><div><dt>Herramientas actuales</dt><dd>${esc(l.tools)}</dd></div></dl></details>`).join("")}</div>
      <div class="callout warn">${ico("triangle-alert")}<div><p><b>Más autonomía, más responsabilidad.</b> Antes de dar autonomía a un agente:</p><ul>${G.agent_rules.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></div></div>`;

    const paint = () => {
      const n = on.size, t = G.context_parts.length;
      root.querySelector(".ctx-res").innerHTML = `<div class="bar"><i style="width:${(n / t) * 100}%"></i></div><p><b>${n} de ${t}</b> preguntas que el modelo ya no tiene que adivinar.${n ? "" : " Con solo el prompt, tiene que suponerlas todas."}</p>
        <ul>${[...on].sort((a, b) => a - b).map((i) => `<li>${esc(G.context_parts[i].q)}</li>`).join("")}</ul>`;
    };
    root.querySelector(".ctx-grid").addEventListener("click", (e) => {
      const b = e.target.closest(".ctx-p"); if (!b) return;
      const i = +b.dataset.i; if (on.has(i)) on.delete(i); else on.add(i);
      b.setAttribute("aria-pressed", on.has(i)); paint(); track("contexto_pieza"); journey.mark("contexto");
    });
    paint();
  }, { once: true });
})();
