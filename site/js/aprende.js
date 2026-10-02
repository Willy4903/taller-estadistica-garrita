/* 05 Aprende en 5 minutos: ruta de 5 niveles en microlecciones, progreso y quiz "¿Cuánto sabes de IA?". */
(function () {
  "use strict";
  const root = document.getElementById("aprende-root");
  if (!root) return;
  const I = window.IAR, { esc, ico, store, track, journey } = I;
  const done = new Set(store.get("iar_lessons", []));
  const total = (A) => A.levels.reduce((n, l) => n + l.lessons.length, 0);

  function lessonHtml(l) {
    return `<details class="les" data-id="${esc(l.id)}"><summary><span class="les-t">${esc(l.title)}</span><span class="les-m">${l.min} min</span><span class="les-ok ${done.has(l.id) ? "on" : ""}" aria-label="${done.has(l.id) ? "completada" : "pendiente"}">${ico("check")}</span></summary>
      <div class="les-b"><p class="les-one">${esc(l.one)}</p><p>${esc(l.how)}</p><p class="les-ex"><b>Ejemplo.</b> ${esc(l.example)}</p><p class="les-try">${ico("play")} <b>Pruébalo (1 minuto).</b> ${esc(l.try_)}</p>
      <button type="button" class="btn sm ghost mk">${done.has(l.id) ? "Marcar como pendiente" : "Marcar como completada"}</button></div></details>`;
  }
  function progress(A) {
    const n = [...done].filter((id) => A.levels.some((l) => l.lessons.some((x) => x.id === id))).length, t = total(A);
    const p = document.getElementById("ap-prog");
    if (p) p.innerHTML = `<div class="bar"><i style="width:${(n / t) * 100}%"></i></div><span>${n} de ${t} microlecciones completadas</span>`;
  }

  /* ---------- quiz ---------- */
  const Q = { list: [], i: 0, score: 0, answers: [] };
  function quizStart(Z) {
    const pool = [...Z.questions].map((q, i) => ({ ...q, i })).sort(() => Math.random() - 0.5);
    const lastSeen = store.get("iar_quiz_seen", []);
    const fresh = pool.filter((q) => !lastSeen.includes(q.i)), rest = pool.filter((q) => lastSeen.includes(q.i));
    Q.list = fresh.concat(rest).slice(0, 5); Q.i = 0; Q.score = 0; Q.answers = [];
    store.set("iar_quiz_seen", Q.list.map((q) => q.i));
    quizPaint(Z);
  }
  function quizPaint(Z) {
    const box = document.getElementById("quiz");
    if (Q.i >= Q.list.length) {
      const lvl = Z.levels.find((l) => Q.score >= l.min && Q.score <= l.max);
      store.set("iar_quiz_result", { score: Q.score, level: lvl.name });
      journey.mark("quiz"); track("quiz_completado", { score: Q.score });
      box.innerHTML = `<div class="quiz-end"><p class="kicker">Tu resultado</p><h3>${esc(lvl.name)} <span class="muted">· ${Q.score} de 5</span></h3><p>${esc(lvl.text)}</p>
        <details class="les"><summary><span class="les-t">Ver explicación de cada pregunta</span></summary><div class="les-b">${Q.list.map((q, k) => `<p><b>${esc(q.q)}</b><br>Respuesta: ${esc(q.options[q.answer])}.<br><span class="muted">${esc(q.explain)}</span></p>`).join("")}</div></details>
        <div class="row"><button type="button" class="btn ghost" id="q-again">Probar con otras preguntas</button><a class="btn" href="#nivel" data-track="clic_quiz_a_nivel">Evaluar mi nivel de uso ${ico("arrow-right")}</a></div></div>`;
      document.getElementById("q-again").addEventListener("click", () => quizStart(Z));
      return;
    }
    const q = Q.list[Q.i];
    box.innerHTML = `<p class="muted mono">Pregunta ${Q.i + 1} de ${Q.list.length}</p><h3>${esc(q.q)}</h3>
      <div class="q-opts" role="group" aria-label="Opciones">${q.options.map((o, k) => `<button type="button" class="q-opt" data-k="${k}">${esc(o)}</button>`).join("")}</div><div id="q-fb" aria-live="polite"></div>`;
    box.querySelector(".q-opts").addEventListener("click", (e) => {
      const b = e.target.closest(".q-opt"); if (!b || b.disabled) return;
      const k = +b.dataset.k, ok = k === q.answer;
      if (ok) Q.score++;
      box.querySelectorAll(".q-opt").forEach((x) => { x.disabled = true; if (+x.dataset.k === q.answer) x.classList.add("right"); });
      document.getElementById("q-fb").innerHTML = `<div class="callout ${ok ? "ok" : ""}">${ico(ok ? "circle-check" : "lightbulb")}<p><b>${ok ? "Correcto." : "Buena exploración."}</b> ${esc(q.explain)}</p></div><p><button type="button" class="btn sm" id="q-next">${Q.i + 1 >= Q.list.length ? "Ver resultado" : "Siguiente"}</button></p>`;
      document.getElementById("q-next").addEventListener("click", () => { Q.i++; quizPaint(Z); });
    });
  }

  document.addEventListener("iar:data", () => {
    const A = I.D.academy, Z = I.D.quiz;
    if (!A) { root.innerHTML = ""; return; }
    root.innerHTML = `
      <div class="sec-head"><p class="kicker"><b>05</b> Aprende en 5 minutos</p><h2 id="t-aprende">Aprende IA mientras exploras</h2>
        <p class="lead">Una ruta de cinco niveles en microlecciones de 2 a 4 minutos. Cada una termina con algo que puedes probar ahora mismo.</p></div>
      <div id="ap-prog" class="ap-prog"></div>
      <div class="levels">${A.levels.map((l) => `<article class="lvl-card"><header><span class="lvl-n">Nivel ${l.n}</span><h3>${esc(l.name)}</h3><p class="muted">${esc(l.desc)}</p></header>${l.lessons.map(lessonHtml).join("")}</article>`).join("")}</div>
      ${Z ? `<div class="card quiz-card"><p class="kicker">Comprueba lo aprendido</p><h3>¿Cuánto sabes de IA?</h3><p class="muted">Cinco preguntas que cambian cada vez. No hay resultados malos: cada respuesta trae su explicación.</p><div id="quiz"><button type="button" class="btn" id="q-go">Empezar</button></div></div>` : ""}
      <p class="muted">¿Buscas un término? Revisa el <a href="glosario.html" data-track="clic_glosario">glosario con 47 conceptos</a>.</p>`;
    progress(A);
    root.addEventListener("toggle", (e) => { if (e.target.classList && e.target.classList.contains("les") && e.target.open && e.target.dataset.id) { track("microleccion_abierta", { id: e.target.dataset.id }); journey.mark("aprende"); } }, true);
    root.addEventListener("click", (e) => {
      const mk = e.target.closest(".mk");
      if (mk) {
        const d = mk.closest(".les"), id = d.dataset.id;
        if (done.has(id)) done.delete(id); else done.add(id);
        store.set("iar_lessons", [...done]);
        d.querySelector(".les-ok").classList.toggle("on", done.has(id));
        mk.textContent = done.has(id) ? "Marcar como pendiente" : "Marcar como completada";
        progress(A); if (done.size >= 3) journey.mark("microlecciones");
      }
      if (e.target.id === "q-go") quizStart(Z);
    });
  }, { once: true });
})();
