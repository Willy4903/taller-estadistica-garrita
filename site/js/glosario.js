/* Glosario: búsqueda y filtro por categoría sobre el HTML ya generado (funciona sin JavaScript para lectura). */
(function () {
  "use strict";
  const I = window.IAR, list = document.getElementById("gl-list");
  if (!list) return;
  const items = [...list.querySelectorAll(".gl")], q = document.getElementById("gl-q"), cats = document.getElementById("gl-cats"), n = document.getElementById("gl-n");
  const st = { q: "", c: "" };
  function apply() {
    let k = 0;
    items.forEach((a) => { const ok = (!st.c || a.dataset.cat === st.c) && (!st.q || a.dataset.q.includes(st.q)); a.hidden = !ok; if (ok) k++; });
    n.textContent = k ? `${k} término${k === 1 ? "" : "s"}` : "Sin resultados. Prueba con otra palabra.";
  }
  let t;
  q.addEventListener("input", () => { st.q = q.value.trim().toLowerCase(); apply(); clearTimeout(t); t = setTimeout(() => { I.track("glosario_busqueda"); I.journey.mark("glosario"); }, 800); });
  cats.addEventListener("click", (e) => { const b = e.target.closest("[data-c]"); if (!b) return; st.c = b.dataset.c; cats.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b)); apply(); });
  if (location.hash) { const el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView(); }
  apply();
})();
