/* Carga central de datos. Cada módulo espera IAR.whenData y se pinta con lo que haya; si falta una fuente muestra el último dato válido o lo dice. */
(function () {
  "use strict";
  const I = window.IAR;
  const files = {
    models: ["data/current/models.json", null], news: ["data/current/news.json", { items: [], feeds: {} }], changes: ["data/current/changes.json", { items: [] }],
    frontier: ["data/current/frontier.json", null], status: ["data/current/status.json", { sources: {} }], trends: ["data/current/trends.json", null],
    users: ["data/current/users.json", null], usage: ["data/current/usage.json", null], arena: ["data/current/arena.json", null],
    research: ["data/current/research.json", null], aa: ["data/current/aa.json", null], regchecks: ["data/current/regulation_checks.json", { checks: {} }],
    catalog: ["history/catalog.json", []],
    regulation: ["content/regulation.json", null], glossary: ["content/glossary.json", { terms: [] }], academy: ["content/academy.json", null],
    cases: ["content/cases.json", null], prompts: ["content/prompts.json", null], ethics: ["content/ethics.json", null], quiz: ["content/quiz.json", null],
    diag: ["content/diagnostic.json", null], agents: ["content/agents.json", null], usecases: ["content/usecases.json", null], recommender: ["content/recommender.json", null], sources: ["content/sources.json", null],
  };
  const need = (document.body.dataset.need || Object.keys(files).join(",")).split(",");
  const D = {};
  I.D = D;
  I.whenData = Promise.all(need.filter((k) => files[k]).map((k) => I.load(files[k][0], files[k][1]).then((v) => { D[k] = v; }))).then(() => {
    if (D.models && I.baseModels) {
      D.all = D.models.models;
      D.base = I.baseModels(D.all);
      I.setModels(D.base);
    }
    const upd = D.models && D.models.meta && D.models.meta.updated_at;
    const el = document.getElementById("updated");
    if (el && upd) {
      const s = D.status && D.status.sources ? Object.values(D.status.sources) : [];
      el.textContent = "Actualizado: " + I.lima(upd).replace(" · ", " • ") + (s.length ? ` • ${s.filter((x) => x.ok).length} de ${s.length} fuentes respondieron en la última actualización.` : "");
      // La automatización corre una vez al día (GitHub puede demorarla varias horas). Pasadas 26 h se avisa de forma explícita.
      const horas = (Date.now() - new Date(upd)) / 36e5;
      if (horas > 26) {
        document.getElementById("hero-meta").classList.add("stale");
        el.textContent += ` Atención: estos datos tienen ${Math.floor(horas)} horas; la actualización de hoy aún no llega.`;
      }
    } else if (el) el.textContent = "Datos no disponibles por ahora";
    document.dispatchEvent(new CustomEvent("iar:data"));
    return D;
  });
})();
