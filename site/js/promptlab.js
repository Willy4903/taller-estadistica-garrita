/* 06 Prompt Lab: de una pregunta débil a una instrucción profesional, constructor de prompts, prompt vs system prompt y prompt engineering. */
(function () {
  "use strict";
  const root = document.getElementById("promptlab-root");
  if (!root) return;
  const I = window.IAR, { esc, ico, track, journey } = I;
  const st = { step: 0 };

  function lab(P) {
    const n = P.steps.length;
    const parts = P.steps.slice(0, st.step);
    const score = Math.round((st.step / n) * 100);
    const last = st.step ? P.steps[st.step - 1] : null;
    document.getElementById("pl-prompt").innerHTML = (st.step === 0 ? `<span class="pl-weak">${esc(P.weak)}</span>` : parts.map((s) => `<p class="pl-line" style="--c:${s.color}"><span class="pl-tag">${esc(s.label)}</span>${esc(s.text)}</p>`).join(""));
    document.getElementById("pl-effect").innerHTML = last ? `<p class="pl-eff"><b>Qué cambia:</b> ${esc(last.effect)}</p><p class="pl-out"><b>Resultado que cabe esperar</b> <span class="tag">ilustración, no es una salida real</span><br>${esc(last.out)}</p>`
      : `<p class="pl-eff"><b>Punto de partida:</b> la IA debe adivinar qué analizar, para quién y en qué formato.</p><p class="pl-out"><b>Resultado que cabe esperar</b> <span class="tag">ilustración, no es una salida real</span><br>Un resumen genérico de columnas y promedios, sin foco ni criterio.</p>`;
    document.getElementById("pl-meter").innerHTML = `<div class="bar"><i style="width:${score}%"></i></div><span>Estructura de la instrucción: ${st.step} de ${n} bloques</span>`;
    document.getElementById("pl-add").disabled = st.step >= n;
    document.getElementById("pl-add").textContent = st.step >= n ? "Instrucción completa" : st.step === 0 ? `Añadir ${P.steps[0].label.toLowerCase()}` : `Añadir ${P.steps[st.step].label.toLowerCase()}`;
    document.getElementById("pl-back").disabled = st.step === 0;
  }

  function build(P) {
    const v = {};
    P.builder.forEach((b) => { v[b.id] = (document.getElementById("pb-" + b.id).value || "").trim(); });
    const blocks = [["OBJETIVO", v.objetivo], ["CONTEXTO", v.contexto], ["FUENTES", v.fuentes], ["REGLAS", v.reglas], ["ENTREGABLE", v.entregable], ["VERIFICACIÓN", v.verificacion]].filter((b) => b[1]);
    return blocks.map(([k, t]) => `${k}\n${t}`).join("\n\n");
  }

  function paintBuilder(P) {
    const txt = build(P), out = document.getElementById("pb-out"), has = txt.length > 0;
    out.textContent = has ? txt : "Completa al menos un campo y el prompt aparecerá aquí.";
    out.classList.toggle("empty", !has);
    ["pb-copy", "pb-gpt", "pb-claude"].forEach((id) => { document.getElementById(id).disabled = !has; });
    const gpt = document.getElementById("pb-gpt"), cl = document.getElementById("pb-claude");
    gpt.href = has ? "https://chatgpt.com/?q=" + encodeURIComponent(txt) : "#";
    cl.href = has ? "https://claude.ai/new?q=" + encodeURIComponent(txt) : "#";
    const filled = P.builder.filter((b) => document.getElementById("pb-" + b.id).value.trim()).length;
    document.getElementById("pb-count").textContent = `${filled} de ${P.builder.length} bloques completos`;
  }

  document.addEventListener("iar:data", () => {
    const P = I.D.prompts;
    if (!P) { root.innerHTML = ""; return; }
    const S = P.system_example;
    root.innerHTML = `
      <div class="sec-head"><p class="kicker"><b>06</b> Aplicar</p><h2 id="t-promptlab">Prompt Lab</h2>
        <p class="lead">De una pregunta débil a una instrucción profesional. Prueba, construye la tuya y llévala a tu herramienta.</p></div>

      <div class="card pl-lab">
        <h3>De una pregunta débil a una instrucción profesional</h3>
        <p class="muted">Añade un bloque a la vez y mira qué mejora. Los resultados son ilustraciones de lo que cabe esperar, no salidas reales de un modelo.</p>
        <div class="pl-grid">
          <div><p class="pl-k">Tu instrucción</p><div class="pl-box" id="pl-prompt" aria-live="polite"></div>
            <div class="row"><button type="button" class="btn" id="pl-add"></button><button type="button" class="btn ghost" id="pl-back">Quitar el último</button><button type="button" class="btn ghost" id="pl-reset">Reiniciar</button></div></div>
          <div><p class="pl-k">Qué mejora</p><div id="pl-effect" class="pl-fx"></div><div id="pl-meter" class="ap-prog"></div></div>
        </div>
      </div>

      <div class="card pl-lab">
        <h3>Constructor de prompts</h3>
        <p class="muted">Responde seis preguntas y obtén una instrucción estructurada: objetivo + contexto + fuentes + reglas + entregable + verificación.</p>
        <div class="pb-grid"><div class="pb-form">${P.builder.map((b) => `<div><label class="f" for="pb-${b.id}">${esc(b.label)}<small>${esc(b.hint)}</small></label><textarea id="pb-${b.id}" placeholder="${esc(b.ph)}"></textarea></div>`).join("")}</div>
          <div><p class="pl-k">Tu prompt <span class="muted" id="pb-count"></span></p><pre class="pl-box pb-out" id="pb-out" aria-live="polite"></pre>
            <div class="row"><button type="button" class="btn" id="pb-copy">Copiar prompt</button><a class="btn ghost" id="pb-gpt" target="_blank" rel="noopener" href="#">Probar en ChatGPT</a><a class="btn ghost" id="pb-claude" target="_blank" rel="noopener" href="#">Probar en Claude</a><button type="button" class="btn ghost" id="pb-reset">Reiniciar</button></div>
            <p class="muted pb-note">${esc(P.builder_note)} <span id="pb-ok" role="status"></span></p></div></div>
      </div>

      <div class="grid g2">
        <div class="card"><h3>Prompt vs System Prompt</h3>
          <div class="sp"><div class="sp-sys"><span class="pl-k">System prompt</span><p class="muted">Las reglas bajo las cuales quieres que el asistente trabaje.</p><ul>${S.system.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
            <div class="sp-usr"><span class="pl-k">Prompt del usuario</span><p class="muted">Lo que quieres resolver ahora.</p><p class="sp-q">${esc(S.user)}</p></div></div>
          <p>El system prompt define el comportamiento; el prompt del usuario define la tarea. Cambia la tarea sin tocar las reglas, o cambia las reglas para que todas las tareas se hagan con otro criterio.</p></div>
        <div class="card"><h3>Prompt Engineering</h3>
          <p class="muted">No son frases mágicas. Es un método para evolucionar la forma de pedir.</p>
          <ol class="evo">${P.evolution.map((e) => `<li><b>${esc(e.t)}</b><span>${esc(e.d)}</span></li>`).join("")}</ol></div>
      </div>
      <details class="more"><summary>Ocho piezas de una buena instrucción</summary>
      <div class="grid g4 pillars">${P.pillars.map((p, i) => `<article class="pill"><span class="pill-n">${String(i + 1).padStart(2, "0")}</span><h4>${esc(p.t)}</h4><p>${esc(p.d)}</p><p class="muted"><b>Ejemplo:</b> ${esc(p.ex)}</p></article>`).join("")}</div></details>`;

    document.getElementById("pl-add").addEventListener("click", () => { if (st.step < P.steps.length) { st.step++; lab(P); track("promptlab_paso", { n: st.step }); journey.mark("promptlab"); } });
    document.getElementById("pl-back").addEventListener("click", () => { if (st.step > 0) { st.step--; lab(P); } });
    document.getElementById("pl-reset").addEventListener("click", () => { st.step = 0; lab(P); });
    lab(P);

    const form = root.querySelector(".pb-form");
    form.addEventListener("input", () => { paintBuilder(P); });
    form.addEventListener("focusin", () => journey.mark("promptlab"), { once: true });
    document.getElementById("pb-copy").addEventListener("click", async () => {
      const t = build(P);
      try { await navigator.clipboard.writeText(t); document.getElementById("pb-ok").textContent = "Copiado."; } catch (e) { document.getElementById("pb-ok").textContent = "Selecciona el texto y cópialo manualmente."; }
      track("prompt_copiado"); journey.mark("prompt_construido");
    });
    ["pb-gpt", "pb-claude"].forEach((id) => document.getElementById(id).addEventListener("click", (e) => { if (e.currentTarget.getAttribute("href") === "#") e.preventDefault(); else { track("prompt_probar_" + id.slice(3)); journey.mark("prompt_construido"); } }));
    document.getElementById("pb-reset").addEventListener("click", () => { P.builder.forEach((b) => { document.getElementById("pb-" + b.id).value = ""; }); document.getElementById("pb-ok").textContent = ""; paintBuilder(P); });
    paintBuilder(P);
  }, { once: true });
})();
