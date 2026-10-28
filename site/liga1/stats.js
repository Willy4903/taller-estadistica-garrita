/* Estadísticas anónimas de uso con GoatCounter (sin cookies, sin datos personales).
   Para activarlas, escribe el código de tu cuenta de GoatCounter en GC_CODE
   (por ejemplo "luwiuni" si tu panel es luwiuni.goatcounter.com). Vacío = desactivado.
   Quien administra la página puede excluir su propio navegador entrando una vez con ?stats=off
   (y volver a contarlo con ?stats=on). */
(function () {
  "use strict";

  var GC_CODE = "";
  var VISITOR = "liga1-visitor", OPTOUT = "liga1-nostats";
  var MILESTONES = [30, 60, 180, 300, 600];

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }

  /* interruptor del administrador */
  try {
    var q = new URLSearchParams(location.search), sw = q.get("stats");
    if (sw === "off" || sw === "on") {
      if (sw === "off") lsSet(OPTOUT, "1"); else try { localStorage.removeItem(OPTOUT); } catch (e) { /* nada */ }
      q.delete("stats");
      var rest = q.toString();
      history.replaceState(null, "", location.pathname + (rest ? "?" + rest : "") + location.hash);
    }
  } catch (e) { /* navegador antiguo */ }

  var code = String(window.LIGA1_STATS_ID || GC_CODE || "").replace(/[^a-z0-9-]/gi, "");
  var host = location.hostname;
  var enabled = !!code && !lsGet(OPTOUT) && /^https?:$/.test(location.protocol) && !/^(localhost|127\.|0\.0\.0\.0)/.test(host) && !/claude/i.test(host);

  var queue = [];
  function ready() { return window.goatcounter && typeof window.goatcounter.count === "function"; }
  function flush() { while (queue.length && ready()) window.goatcounter.count(queue.shift()); }
  function track(name) {
    if (!enabled) return;
    queue.push({ path: name, title: name, event: true });
    flush();
  }

  if (enabled) {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://gc.zgo.at/count.js";
    s.setAttribute("data-goatcounter", "https://" + code + ".goatcounter.com/count");
    s.addEventListener("load", flush);
    document.head.appendChild(s);
  }

  /* frecuencia: nuevo o recurrente y días distintos de visita, una vez por sesión */
  function visitor() {
    if (ssGet("liga1-counted")) return;
    ssSet("liga1-counted", "1");
    var d = new Date(), today = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
    var rec = null;
    try { rec = JSON.parse(lsGet(VISITOR) || "null"); } catch (e) { rec = null; }
    var isNew = !rec;
    rec = rec || { days: [] };
    if (rec.days.indexOf(today) < 0) rec.days.push(today);
    rec.days = rec.days.slice(-90);
    lsSet(VISITOR, JSON.stringify(rec));
    var n = rec.days.length;
    track(isNew ? "visitante/nuevo" : "visitante/recurrente");
    track("frecuencia/" + (n === 1 ? "1 dia" : n <= 3 ? "2-3 dias" : n <= 7 ? "4-7 dias" : "8 o mas dias"));
  }

  /* permanencia: segundos con la pestaña visible */
  function dwell() {
    var secs = 0, next = 0;
    setInterval(function () {
      if (document.hidden) return;
      secs++;
      if (next < MILESTONES.length && secs >= MILESTONES[next]) {
        var m = MILESTONES[next++];
        track("permanencia/" + (m < 60 ? m + " s" : m / 60 + " min"));
      }
    }, 1000);
  }

  window.LIGA1_STATS_INIT = function (L1) {
    if (!enabled) return;
    visitor();
    dwell();
    var lastView = null, usedCalc = false;
    L1.on("view", function (v) { if (v !== lastView) { lastView = v; track("seccion/" + v); } });
    L1.on("pred", function () { if (!usedCalc) { usedCalc = true; track("uso/calculadora"); } });
    L1.on("stat", function (name) { track("uso/" + name); });
    track("seccion/" + (L1.view() || "acum"));
    lastView = L1.view();
  };
})();
