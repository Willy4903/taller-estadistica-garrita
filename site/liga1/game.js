/* La Polla Crema: puntos, niveles, rachas, insignias, trivia y retos entre amigos.
   Todo vive en el navegador de cada persona. Los retos viajan dentro de un enlace, sin servidor. */
(function () {
  "use strict";

  var KEY = "liga1-game-v1";
  var LEVELS = [
    { xp: 0, name: "Cachimbo" }, { xp: 30, name: "Hincha crema" }, { xp: 80, name: "Garra novata" },
    { xp: 150, name: "Garra firme" }, { xp: 250, name: "Capitán de tribuna" }, { xp: 400, name: "Estratega crema" },
    { xp: 600, name: "Cerebro del Monumental" }, { xp: 900, name: "Leyenda crema" }, { xp: 1300, name: "Ídolo de Ate" },
    { xp: 1800, name: "El más campeón" }
  ];
  var ICONS = {
    star: "M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z",
    paw: "M12 12c-3 0-6 3.5-6 6 0 2 1.5 3 3 3 1.2 0 2-.6 3-.6s1.8.6 3 .6c1.5 0 3-1 3-3 0-2.5-3-6-6-6zM5.5 7a1.9 2.5 0 100 5 1.9 2.5 0 000-5zm4.3-3.7a1.9 2.6 0 100 5.2 1.9 2.6 0 000-5.2zm4.4 0a1.9 2.6 0 100 5.2 1.9 2.6 0 000-5.2zM18.5 7a1.9 2.5 0 100 5 1.9 2.5 0 000-5z",
    flame: "M12 2c1 4-3 5-3 9a3 3 0 006 0c0-1-.4-1.800-1-2.600 3 1.200 5 4 5 7a7 7 0 01-14 0c0-6 5-8 7-13.400z",
    target: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 110 12 6 6 0 010-12zm0 3a3 3 0 100 6 3 3 0 000-6z",
    crown: "M3 8l4.500 4L12 5l4.500 7L21 8l-2 11H5z",
    ball: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 5l3.500 2.500-1.300 4.200H9.800L8.500 9.500zM3 12l2.500-1M21 12l-2.500-1",
    trophy: "M7 3h10v4a5 5 0 01-10 0zM4 4h3v3a3 3 0 01-3-3zm16 0h-3v3a3 3 0 003-3zM11 12h2v4h3v3H8v-3h3z",
    book: "M5 3h12a2 2 0 012 2v14H7a2 2 0 01-2-2zm2 2v10h10V5z",
    share: "M18 8a3 3 0 10-2.800-4L8.700 7.400a3 3 0 100 5.200l6.500 3.400a3 3 0 10.800-1.600L9.500 10.400l6.500-3.400A3 3 0 0018 8z",
    users: "M9 11a3.500 3.500 0 100-7 3.500 3.500 0 000 7zm7 1a3 3 0 100-6 3 3 0 000 6zM2 20c0-3.500 3-6 7-6s7 2.500 7 6zm14-5c3 0 6 1.800 6 5h-5c0-2-.5-3.500-1-5z",
    bolt: "M13 2L4 14h6l-1 8 9-12h-6z",
    dice: "M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm3 5a1.500 1.500 0 100 3 1.500 1.500 0 000-3zm8 0a1.500 1.500 0 100 3 1.500 1.500 0 000-3zM8 13a1.500 1.500 0 100 3 1.500 1.500 0 000-3zm8 0a1.500 1.500 0 100 3 1.500 1.500 0 000-3z"
  };
  function icon(name, cls) { return '<svg class="gi ' + (cls || "") + '" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="' + ICONS[name] + '"/></svg>'; }

  var BADGES = [
    { id: "first", name: "Primer pronóstico", desc: "Escribe tu primer marcador en la calculadora.", icon: "ball" },
    { id: "five", name: "Calentando motores", desc: "Haz 5 pronósticos distintos.", icon: "bolt" },
    { id: "fecha", name: "Fecha completa", desc: "Pronostica todos los partidos pendientes de una fecha.", icon: "target" },
    { id: "uni", name: "Hincha pronosticador", desc: "Pronostica un partido de la U.", icon: "paw" },
    { id: "leader", name: "La U líder", desc: "Arma un escenario donde la U termina primera del acumulado.", icon: "crown" },
    { id: "dice", name: "Suerte loca", desc: "Usa el sorteo de marcadores.", icon: "dice" },
    { id: "exact", name: "Ojo de águila", desc: "Acierta un marcador exacto.", icon: "target" },
    { id: "pts10", name: "Diez de polla", desc: "Suma 10 puntos en la polla.", icon: "star" },
    { id: "pts50", name: "Cincuentón crema", desc: "Suma 50 puntos en la polla.", icon: "trophy" },
    { id: "streak3", name: "Racha de garra", desc: "Entra 3 días seguidos.", icon: "flame" },
    { id: "streak7", name: "Semana crema", desc: "Entra 7 días seguidos.", icon: "flame" },
    { id: "trivia", name: "Estudioso", desc: "Completa la trivia crema del día.", icon: "book" },
    { id: "perfect", name: "Sabiondo crema", desc: "Responde bien las 5 preguntas de la trivia.", icon: "star" },
    { id: "share", name: "Embajador", desc: "Comparte tu polla con un amigo.", icon: "share" },
    { id: "rival", name: "Reto aceptado", desc: "Acepta el reto de un amigo.", icon: "users" }
  ];

  /* Preguntas con respuesta verificada (las mismas fuentes de la pestaña Historia y del glosario). */
  var QUIZ = [
    { q: "¿En qué año se fundó Universitario?", o: ["1914", "1924", "1934", "1944"], a: 1, n: "Fue el 7 de agosto de 1924." },
    { q: "¿Contra quién perdió la final de la Copa Libertadores de 1972?", o: ["Santos", "Peñarol", "Independiente", "Boca Juniors"], a: 2, n: "Cayó ante Independiente de Avellaneda: 0-0 en Lima y 2-1 en Argentina." },
    { q: "¿Qué club peruano jugó primero una final de Copa Libertadores?", o: ["Alianza Lima", "Universitario", "Sporting Cristal", "Melgar"], a: 1, n: "Universitario, en 1972." },
    { q: "¿En qué distrito de Lima está el Estadio Monumental?", o: ["Ate", "San Miguel", "Surco", "La Victoria"], a: 0, n: "En Ate, al este de Lima." },
    { q: "¿Con qué club se inauguró el Monumental el 2 de julio de 2000?", o: ["Alianza Lima", "Melgar", "Sporting Cristal", "Cienciano"], a: 2, n: "Con un partido ante Sporting Cristal." },
    { q: "¿Cuántos clubes juegan la Liga 1 2026?", o: ["16", "18", "20", "14"], a: 1, n: "Son 18 clubes y 17 fechas por torneo corto." },
    { q: "¿Cuántos puntos vale una victoria?", o: ["1", "2", "3", "4"], a: 2, n: "Victoria 3, empate 1, derrota 0." },
    { q: "¿Cómo se llama la mascota oficial de la U?", o: ["Garrita", "Cremita", "Pumita", "Merengue"], a: 0, n: "Garrita, un felino que representa la garra." },
    { q: "¿Cuál fue el primer nombre del club?", o: ["Club Deportivo Universitario", "Federación Universitaria de Fútbol", "Sporting Universitario", "Unión Universitaria"], a: 1, n: "Cambió a Universitario de Deportes en 1933." },
    { q: "¿En qué año el club adoptó el nombre Universitario de Deportes?", o: ["1924", "1933", "1950", "1972"], a: 1, n: "Fue en 1933." },
    { q: "¿Qué significa DG en la tabla?", o: ["Derrotas generales", "Diferencia de goles", "Duelos ganados", "Descuento de goles"], a: 1, n: "Es GF menos GC y sirve de primer desempate en esta página." },
    { q: "¿Cuál es el aforo aproximado del Monumental?", o: ["30 000", "50 000", "80 000", "120 000"], a: 2, n: "Alrededor de 80 000 personas." },
    { q: "¿Qué expresión resume el espíritu del club?", o: ["Garra Crema", "Fuerza Merengue", "Orgullo de Ate", "Pasión Roja"], a: 0, n: "La Garra Crema." },
    { q: "¿En qué años fue campeón nacional el tricampeonato reciente?", o: ["2021, 2022 y 2023", "2023, 2024 y 2025", "2022, 2023 y 2024", "2024, 2025 y 2026"], a: 1, n: "Campeón en 2023, 2024 y 2025." },
    { q: "¿Qué es la tabla acumulada?", o: ["Solo el Clausura", "Apertura más Clausura", "Los últimos 5 partidos", "Solo los partidos de local"], a: 1, n: "Suma de los puntos de los dos torneos cortos." }
  ];

  function today() { return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" }); }
  function addDays(iso, n) { var d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }
  function levelOf(xp) { var i = 0; while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++; return i; }
  function seeded(seed) { var s = 0; for (var i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function b64e(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function b64d(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return JSON.parse(decodeURIComponent(escape(atob(s)))); }

  window.LIGA1_GAME_INIT = function (L1) {
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
    var esc = L1.esc;

    var G = { name: "", xp: 0, streak: { last: "", count: 0, best: 0 }, badges: {}, snap: {}, scored: {}, rivals: {}, day: {}, trivia: {}, shared: 0, rolls: 0 };
    try { var raw = JSON.parse(lsGet(KEY) || "{}"); Object.keys(raw).forEach(function (k) { G[k] = raw[k]; }); } catch (e) { /* datos nuevos */ }
    function save() { lsSet(KEY, JSON.stringify(G)); }

    /* ---------- avisos, confeti y vibración ---------- */
    function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* sin vibración */ } }
    var toastBox = $("#toasts");
    function toast(html, kind) {
      if (!toastBox) return;
      var t = document.createElement("div");
      t.className = "toast " + (kind || "xp");
      t.innerHTML = html;
      toastBox.appendChild(t);
      while (toastBox.children.length > 3) toastBox.removeChild(toastBox.firstChild);
      setTimeout(function () { t.classList.add("out"); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 400); }, 2800);
    }
    var cv = null, parts = [], raf = 0;
    function confetti(n) {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (!cv) { cv = document.createElement("canvas"); cv.className = "confetti"; cv.setAttribute("aria-hidden", "true"); document.body.appendChild(cv); }
      var W = cv.width = innerWidth, H = cv.height = innerHeight, cols = ["#E21B34", "#8B0A1A", "#F4EBD6", "#E8C96A", "#FFFFFF"];
      for (var i = 0; i < (n || 140); i++) parts.push({ x: W / 2 + (Math.random() - .5) * W * .3, y: H * .55, vx: (Math.random() - .5) * 11, vy: -Math.random() * 14 - 4, g: .35, r: Math.random() * 6 + 3, c: cols[i % cols.length], a: Math.random() * 6, va: (Math.random() - .5) * .4, life: 1 });
      if (raf) return;
      var ctx = cv.getContext("2d");
      (function loop() {
        ctx.clearRect(0, 0, W, H);
        parts = parts.filter(function (p) { return p.life > 0 && p.y < H + 20; });
        parts.forEach(function (p) { p.vy += p.g; p.x += p.vx; p.y += p.vy; p.a += p.va; p.life -= .006; ctx.save(); ctx.globalAlpha = Math.max(0, p.life); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore(); });
        if (parts.length) raf = requestAnimationFrame(loop); else { raf = 0; ctx.clearRect(0, 0, W, H); }
      })();
    }
    var celQueue = [], celOpen = false;
    function celebrate(o) { celQueue.push(o); if (!celOpen) nextCel(); }
    function nextCel() {
      var o = celQueue.shift(), box = $("#celebrate");
      if (!o || !box) { celOpen = false; return; }
      celOpen = true;
      box.innerHTML = '<div class="cel-card"><div class="cel-ic">' + icon(o.icon || "star") + '</div><p class="cel-k">' + esc(o.kicker) + "</p><h3>" + esc(o.title) + "</h3><p>" + esc(o.text || "") + '</p><button type="button" class="btn primary" id="celOk">¡Dale!</button></div>';
      box.hidden = false; confetti(o.big ? 220 : 130); buzz([30, 50, 30, 50, 80]);
      $("#celOk").addEventListener("click", function () { box.hidden = true; celOpen = false; setTimeout(nextCel, 150); });
    }

    /* ---------- XP, nivel e insignias ---------- */
    function gainXP(n, why, quiet) {
      if (!n) return;
      var before = levelOf(G.xp);
      G.xp += n; save();
      var after = levelOf(G.xp);
      if (!quiet) toast('<b>+' + n + " XP</b> " + esc(why || ""), "xp");
      if (after > before) celebrate({ kicker: "Subiste de nivel", title: "Nivel " + (after + 1) + ": " + LEVELS[after].name, text: "Sigue sumando XP para llegar a " + (LEVELS[after + 1] ? LEVELS[after + 1].name : "la cima") + ".", icon: "crown", big: true });
      renderPill(); if (L1.view() === "game") renderGame();
    }
    function award(id) {
      if (G.badges[id]) return false;
      var b = BADGES.filter(function (x) { return x.id === id; })[0];
      if (!b) return false;
      G.badges[id] = Date.now(); save();
      toast('<span class="toast-ic">' + icon(b.icon) + '</span><span><b>Insignia desbloqueada</b><br>' + esc(b.name) + " · +15 XP</span>", "award");
      confetti(60); buzz([20, 30, 20]);
      gainXP(15, "por la insignia", true);
      if (L1.view() === "game") renderGame();
      return true;
    }
    function totalPts() { return Object.keys(G.scored).reduce(function (s, k) { return s + G.scored[k].pts; }, 0); }
    function exacts() { return Object.keys(G.scored).filter(function (k) { return G.scored[k].pts && G.scored[k].exact; }).length; }

    /* ---------- racha diaria y misiones ---------- */
    function dayState() { var t = today(); if (G.day.d !== t) G.day = { d: t, visit: false, preds: {}, claimed2: false, claimed3: false }; return G.day; }
    function dailyVisit() {
      var t = today(), d = dayState();
      if (G.streak.last === t) return;
      G.streak.count = G.streak.last === addDays(t, -1) ? G.streak.count + 1 : 1;
      G.streak.best = Math.max(G.streak.best || 0, G.streak.count);
      G.streak.last = t; d.visit = true; save();
      gainXP(10, "por entrar hoy · racha de " + G.streak.count + (G.streak.count === 1 ? " día" : " días"));
      if (G.streak.count >= 3) award("streak3");
      if (G.streak.count >= 7) award("streak7");
    }
    function missions() {
      var d = dayState(), np = Object.keys(d.preds).length;
      return [
        { id: "visit", t: "Entra hoy", xp: 10, done: true, p: "1/1" },
        { id: "preds", t: "Pronostica 3 partidos", xp: 15, done: np >= 3, p: Math.min(np, 3) + "/3" },
        { id: "trivia", t: "Completa la trivia crema", xp: 20, done: !!(G.trivia.d === today() && G.trivia.done), p: (G.trivia.d === today() && G.trivia.done) ? "1/1" : "0/1" }
      ];
    }

    /* ---------- puntaje de la polla ---------- */
    function kickoff(f) { return f.date && f.time ? new Date(f.date + "T" + f.time + ":00-05:00").getTime() : null; }
    function outcome(h, a) { return h > a ? 1 : h < a ? -1 : 0; }
    function score(pred, f) {
      if (pred[0] === f.hg && pred[1] === f.ag) return { pts: 5, exact: true };
      if (outcome(pred[0], pred[1]) === outcome(f.hg, f.ag)) return { pts: 3, exact: false };
      return { pts: 0, exact: false };
    }
    function isU(f) { return f.h === L1.FOCUS || f.a === L1.FOCUS; }
    function scoreAll() {
      var any = false;
      L1.D.fixtures.forEach(function (f) {
        if (f.hg == null) return;
        var k = L1.fkey(f), s = G.snap[k];
        if (!s || G.scored[k]) return;
        var ko = kickoff(f), late = ko != null && s.at >= ko;
        var r = late ? { pts: 0, exact: false } : score(s.p, f);
        var mult = isU(f) ? 2 : 1;
        G.scored[k] = { pts: r.pts * mult, exact: r.exact, pred: s.p, real: [f.hg, f.ag], u: isU(f), late: late, h: f.h, a: f.a, t: f.t, f: f.f };
        any = true;
        if (late) toast("Tu pronóstico de " + L1.BY[f.h].short + " vs " + L1.BY[f.a].short + " llegó después del inicio y no suma.", "info");
        else { toast("<b>" + (r.pts * mult ? "+" + r.pts * mult + " pts" : "0 pts") + "</b> " + esc(L1.BY[f.h].short + " " + f.hg + "-" + f.ag + " " + L1.BY[f.a].short) + (r.exact ? " · marcador exacto" : ""), r.pts ? "xp" : "info"); gainXP(r.pts * mult * 2, "de polla", true); }
        if (r.exact && !late) award("exact");
      });
      if (any) {
        save();
        var tp = totalPts();
        if (tp >= 10) award("pts10");
        if (tp >= 50) award("pts50");
      }
    }
    function scoreRival(r) {
      var pts = 0, ex = 0, n = 0;
      L1.D.fixtures.forEach(function (f) {
        if (f.hg == null) return;
        var k = L1.fkey(f), p = r.preds[k];
        if (!p) return;
        var ko = kickoff(f);
        if (ko != null && r.at >= ko) return;
        var s = score(p, f), m = isU(f) ? 2 : 1;
        pts += s.pts * m; n++; if (s.exact) ex++;
      });
      return { pts: pts, exact: ex, n: n };
    }

    /* ---------- eventos de la calculadora ---------- */
    function pendingForFecha(t, fe) { return L1.D.fixtures.filter(function (f) { return f.t === t && f.f === fe && f.hg == null; }); }
    L1.on("pred", function (e) {
      var d = dayState(), now = Date.now();
      if (e.val) {
        G.snap[e.key] = { p: e.val, at: now };
        if (e.isNew) {
          var firstToday = !d.preds[e.key];
          d.preds[e.key] = 1;
          if (firstToday && Object.keys(d.preds).length <= 10) gainXP(2, "por pronosticar", true);
          if (Object.keys(d.preds).length === 1) toast("<b>+2 XP</b> por pronosticar", "xp");
        }
        save();
        var n = Object.keys(G.snap).length;
        if (n >= 1) award("first");
        if (n >= 5) award("five");
        if (isU(e.f)) award("uni");
        var left = pendingForFecha(e.f.t, e.f.f).filter(function (f) { return !L1.getPreds()[L1.fkey(f)]; });
        if (!left.length) award("fecha");
        var m = missions();
        if (m[1].done && !d.claimed2) { d.claimed2 = true; save(); gainXP(15, "misión: 3 pronósticos"); confetti(60); }
        var S = L1.getS();
        if (S && S.pos.T[L1.FOCUS] === 1) award("leader");
      } else {
        delete G.snap[e.key]; save();
      }
      renderStrip(); if (L1.view() === "game") renderGame();
    });
    L1.on("random", function () { G.rolls = (G.rolls || 0) + 1; save(); award("dice"); });
    L1.on("clear", function (e) { (e.keys || []).forEach(function (k) { delete G.snap[k]; }); save(); renderStrip(); if (L1.view() === "game") renderGame(); });
    L1.on("view", function (v) { if (v === "game") renderGame(); });

    /* ---------- cabecera y tira de misiones ---------- */
    function renderPill() {
      var el = $("#xpPill"); if (!el) return;
      var lv = levelOf(G.xp), cur = LEVELS[lv], nx = LEVELS[lv + 1], pct = nx ? Math.round((G.xp - cur.xp) / (nx.xp - cur.xp) * 100) : 100;
      el.innerHTML = '<span class="xp-lv">Nv ' + (lv + 1) + '</span><span class="xp-bar"><i style="width:' + pct + '%"></i></span>' + (G.streak.count ? '<span class="xp-st">' + icon("flame") + G.streak.count + "</span>" : "");
      el.hidden = false;
      el.setAttribute("aria-label", "Nivel " + (lv + 1) + ", " + G.xp + " XP, racha de " + G.streak.count + " días. Abrir el juego");
    }
    function renderStrip() {
      var el = $("#gameStrip"); if (!el) return;
      var m = missions(), done = m.filter(function (x) { return x.done; }).length, lv = levelOf(G.xp);
      el.innerHTML = '<div class="gs-main"><div class="gs-top"><b>La Polla Crema</b><span>Nivel ' + (lv + 1) + " · " + esc(LEVELS[lv].name) + '</span></div>' +
        '<div class="gs-chips"><span class="gs-chip">' + icon("flame") + " racha " + G.streak.count + '</span><span class="gs-chip">' + icon("star") + " " + totalPts() + ' pts</span><span class="gs-chip">Misiones ' + done + "/3</span></div></div>" +
        '<button type="button" class="btn primary" id="gsGo">Jugar</button>';
      $("#gsGo").addEventListener("click", function () { L1.show("game"); window.scrollTo(0, 0); });
      el.hidden = false;
    }

    /* ---------- vista del juego ---------- */
    var gameTab = "perfil", quizState = null;
    function renderGame() {
      var box = $("#gameBox"); if (!box) return;
      var tabs = [["perfil", "Perfil"], ["polla", "Mi polla"], ["amigos", "Amigos"], ["trivia", "Trivia"]];
      var h = '<div class="g-tabs" role="tablist">' + tabs.map(function (t) { return '<button type="button" role="tab" data-g="' + t[0] + '" aria-selected="' + (t[0] === gameTab) + '">' + t[1] + "</button>"; }).join("") + "</div>";
      h += gameTab === "perfil" ? viewPerfil() : gameTab === "polla" ? viewPolla() : gameTab === "amigos" ? viewAmigos() : viewTrivia();
      box.innerHTML = h;
      $$(".g-tabs button", box).forEach(function (b) { b.addEventListener("click", function () { gameTab = b.dataset.g; renderGame(); }); });
      bindGame(box);
    }
    function viewPerfil() {
      var lv = levelOf(G.xp), cur = LEVELS[lv], nx = LEVELS[lv + 1], pct = nx ? Math.round((G.xp - cur.xp) / (nx.xp - cur.xp) * 100) : 100;
      var m = missions();
      var h = '<section class="g-hero"><div class="g-avatar">' + esc((G.name || "H").charAt(0).toUpperCase()) + "</div><div class=\"g-who\">" +
        '<label class="g-name"><span>Tu nombre</span><input id="gName" maxlength="18" placeholder="Hincha crema" value="' + esc(G.name) + '" autocomplete="nickname"></label>' +
        '<p class="g-lv">Nivel ' + (lv + 1) + " · " + esc(cur.name) + '</p></div></section>' +
        '<div class="g-xp"><div class="g-xpbar"><i style="width:' + pct + '%"></i></div><p>' + G.xp + " XP" + (nx ? " · faltan " + (nx.xp - G.xp) + " para " + esc(nx.name) : " · nivel máximo") + "</p></div>" +
        '<div class="g-stats"><div><b>' + G.streak.count + "</b><span>Racha de días</span></div><div><b>" + totalPts() + "</b><span>Puntos de polla</span></div><div><b>" + exacts() + "</b><span>Marcadores exactos</span></div><div><b>" + Object.keys(G.badges).length + "/" + BADGES.length + "</b><span>Insignias</span></div></div>" +
        '<h3 class="mt">Misiones de hoy</h3><ul class="g-miss">' + m.map(function (x) { return '<li class="' + (x.done ? "done" : "") + '"><span class="mk">' + (x.done ? "✓" : "") + "</span><span class=\"mt2\">" + esc(x.t) + '</span><span class="mp">' + x.p + '</span><span class="mx">+' + x.xp + " XP</span></li>"; }).join("") + "</ul>" +
        '<div class="g-actions"><button type="button" class="btn primary" id="gShare">Compartir mi polla</button><button type="button" class="btn" id="gCard">Tarjeta para compartir</button></div>' +
        '<h3 class="mt">Insignias</h3><div class="g-badges">' + BADGES.map(function (b) {
          var on = !!G.badges[b.id];
          return '<div class="gb ' + (on ? "on" : "off") + '"><div class="gb-ic">' + icon(b.icon) + "</div><b>" + esc(b.name) + "</b><span>" + esc(b.desc) + "</span></div>";
        }).join("") + "</div>" +
        '<h3 class="mt">Niveles</h3><ol class="g-levels">' + LEVELS.map(function (l, i) { return '<li class="' + (i <= lv ? "on" : "") + '"><b>' + (i + 1) + "</b><span>" + esc(l.name) + "</span><em>" + l.xp + " XP</em></li>"; }).join("") + "</ol>" +
        '<h3 class="mt">Cómo se juega</h3><ul class="g-how"><li>Escribe marcadores en la Calculadora. Cada partido nuevo que pronosticas da 2 XP.</li><li>Cuando se juega el partido, tu pronóstico se califica solo: marcador exacto 5 puntos, resultado correcto (gana, empata o pierde) 3 puntos. Los partidos de la U valen doble.</li><li>Solo cuentan los pronósticos hechos antes del inicio del partido.</li><li>Cada punto de polla da 2 XP. Entra todos los días para mantener la racha.</li></ul>';
      return h;
    }
    function viewPolla() {
      var ks = Object.keys(G.scored).sort(function (a, b) { var x = G.scored[a], y = G.scored[b]; return y.t.localeCompare(x.t) || y.f - x.f; });
      var pend = Object.keys(G.snap).filter(function (k) { return !G.scored[k] && L1.D.fixtures.some(function (f) { return L1.fkey(f) === k && f.hg == null; }); });
      var h = '<div class="g-stats"><div><b>' + totalPts() + "</b><span>Puntos</span></div><div><b>" + ks.length + "</b><span>Calificados</span></div><div><b>" + pend.length + "</b><span>Por jugarse</span></div></div>";
      if (pend.length) {
        h += '<h3 class="mt">Por jugarse</h3><ul class="g-list">' + pend.map(function (k) {
          var f = L1.D.fixtures.filter(function (x) { return L1.fkey(x) === k; })[0], s = G.snap[k];
          return '<li><span class="gl-m">' + esc(L1.BY[f.h].short) + " vs " + esc(L1.BY[f.a].short) + '</span><span class="gl-p">' + s.p[0] + " - " + s.p[1] + '</span><span class="gl-w">' + (f.date ? esc(L1.fmtDay(f.date, f.time)) : "Fecha " + f.f) + "</span></li>";
        }).join("") + "</ul>";
      }
      h += '<h3 class="mt">Resultados calificados</h3>';
      if (!ks.length) h += '<p class="note">Todavía no se jugó ninguno de tus partidos pronosticados. Cuando termine uno, aquí verás tus puntos.</p>';
      else h += '<ul class="g-list">' + ks.map(function (k) {
        var s = G.scored[k];
        return '<li class="' + (s.pts ? "win" : "") + '"><span class="gl-m">' + esc(L1.BY[s.h].short) + " vs " + esc(L1.BY[s.a].short) + (s.u ? ' <i class="gl-u">doble</i>' : "") + '</span><span class="gl-p">tú ' + s.pred[0] + "-" + s.pred[1] + " · real " + s.real[0] + "-" + s.real[1] + '</span><span class="gl-w">' + (s.late ? "tarde" : s.exact ? "exacto +" + s.pts : s.pts ? "+" + s.pts : "0") + "</span></li>";
      }).join("") + "</ul>";
      return h;
    }
    function rivalRows() {
      var me = { name: G.name || "Tú", me: true, pts: totalPts(), exact: exacts(), n: Object.keys(G.scored).length };
      var rows = [me].concat(Object.keys(G.rivals).map(function (id) { var r = G.rivals[id], s = scoreRival(r); return { id: id, name: r.name, pts: s.pts, exact: s.exact, n: s.n }; }));
      rows.sort(function (a, b) { return b.pts - a.pts || b.exact - a.exact; });
      return rows;
    }
    function viewAmigos() {
      var rows = rivalRows();
      var h = '<p class="g-lead">Reta a tus amigos: compartes un enlace con tus pronósticos y, cuando se jueguen los partidos, ven quién suma más. Sin registrarse.</p>' +
        '<div class="g-actions"><button type="button" class="btn primary" id="gShare">Retar a un amigo</button></div><h3 class="mt">Tabla de la polla</h3>';
      h += '<ol class="g-rank">' + rows.map(function (r, i) {
        return '<li class="' + (r.me ? "me" : "") + '"><span class="rk">' + (i + 1) + '</span><span class="rn">' + esc(r.name) + (r.me ? " (tú)" : "") + '</span><span class="rp">' + r.pts + " pts</span><span class=\"rx\">" + r.exact + " exactos</span>" + (r.me ? "" : '<button type="button" class="rd" data-del="' + esc(r.id) + '" aria-label="Quitar a ' + esc(r.name) + '">×</button>') + "</li>";
      }).join("") + "</ol>";
      if (rows.length === 1) h += '<p class="note">Aún no tienes rivales. Comparte tu enlace o abre el de un amigo para empezar.</p>';
      return h;
    }
    function quizToday() {
      var rnd = seeded(today()), pool = QUIZ.slice(), out = [];
      while (out.length < 5) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
      return out;
    }
    function viewTrivia() {
      var t = today();
      if (G.trivia.d === t && G.trivia.done) {
        return '<section class="g-quiz done"><h3>Trivia de hoy completada</h3><p class="g-big">' + G.trivia.correct + " de 5</p><p class=\"note\">Vuelve mañana por 5 preguntas nuevas.</p></section>";
      }
      if (!quizState || quizState.d !== t) quizState = { d: t, qs: quizToday(), i: 0, ok: 0, pick: null };
      var q = quizState.qs[quizState.i];
      var h = '<section class="g-quiz"><div class="gq-top"><span>Trivia crema</span><span>' + (quizState.i + 1) + " de 5</span></div><div class=\"gq-bar\"><i style=\"width:" + (quizState.i / 5 * 100) + '%"></i></div><h3>' + esc(q.q) + '</h3><div class="gq-opts">';
      h += q.o.map(function (o, i) {
        var cls = quizState.pick == null ? "" : i === q.a ? " right" : i === quizState.pick ? " wrong" : "";
        return '<button type="button" class="gq-o' + cls + '" data-o="' + i + '"' + (quizState.pick != null ? " disabled" : "") + ">" + esc(o) + "</button>";
      }).join("") + "</div>";
      if (quizState.pick != null) h += '<p class="gq-n">' + esc(q.n) + '</p><button type="button" class="btn primary" id="gqNext">' + (quizState.i === 4 ? "Terminar" : "Siguiente") + "</button>";
      return h + "</section>";
    }
    function bindGame(box) {
      var nm = $("#gName", box);
      if (nm) nm.addEventListener("input", function () { G.name = nm.value.trim(); save(); });
      $$(".gq-o", box).forEach(function (b) {
        b.addEventListener("click", function () {
          var q = quizState.qs[quizState.i], i = +b.dataset.o;
          quizState.pick = i;
          if (i === q.a) { quizState.ok++; buzz(20); } else buzz([60, 40, 60]);
          renderGame();
        });
      });
      var nx = $("#gqNext", box);
      if (nx) nx.addEventListener("click", function () {
        if (quizState.i < 4) { quizState.i++; quizState.pick = null; renderGame(); return; }
        G.trivia = { d: today(), done: true, correct: quizState.ok }; save(); L1.emit("stat", "trivia-completa");
        var d = dayState();
        gainXP(quizState.ok * 4, "por la trivia", true);
        if (!d.claimed3) { d.claimed3 = true; save(); gainXP(20, "misión: trivia"); }
        award("trivia"); if (quizState.ok === 5) award("perfect");
        confetti(quizState.ok >= 4 ? 160 : 70); quizState = null; renderStrip(); renderGame();
      });
      $$("[data-del]", box).forEach(function (b) { b.addEventListener("click", function () { delete G.rivals[b.dataset.del]; save(); renderGame(); }); });
      var sh = $("#gShare", box); if (sh) sh.addEventListener("click", shareLink);
      var cd = $("#gCard", box); if (cd) cd.addEventListener("click", shareCard);
    }

    /* ---------- compartir ---------- */
    function myPending() {
      var out = [];
      Object.keys(G.snap).forEach(function (k) {
        var f = L1.D.fixtures.filter(function (x) { return L1.fkey(x) === k; })[0];
        if (f && f.hg == null) out.push([k, G.snap[k].p[0], G.snap[k].p[1]]);
      });
      return out;
    }
    function shareLink() {
      var p = myPending();
      if (!p.length) { toast("Primero pronostica algunos partidos en la Calculadora.", "info"); return; }
      var url = location.origin + location.pathname + "?polla=" + b64e({ v: 1, n: G.name || "Un amigo", t: Date.now(), p: p });
      var text = "Te reto a la Polla Crema de la Liga 1. Mira mis " + p.length + " pronósticos y compite conmigo.";
      var done = function () { L1.emit("stat", "compartir-reto"); if (!G.shared) { G.shared = 1; save(); award("share"); } };
      if (navigator.share) { navigator.share({ title: "Polla Crema", text: text, url: url }).then(done, function () { /* cancelado */ }); return; }
      var copy = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text + " " + url) : Promise.reject();
      copy.then(function () { toast("Enlace copiado. Pégalo en WhatsApp.", "info"); done(); }, function () { $("#shareFallback").value = text + " " + url; $("#shareBox").hidden = false; $("#shareFallback").select(); done(); });
    }
    function shareCard() {
      var W = 1080, H = 1350, c = document.createElement("canvas"); c.width = W; c.height = H;
      var x = c.getContext("2d"), lv = levelOf(G.xp);
      var g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#2A0710"); g.addColorStop(.55, "#8B0A1A"); g.addColorStop(1, "#0D0608");
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.strokeStyle = "rgba(232,201,106,.45)"; x.lineWidth = 6; x.beginPath(); x.arc(W - 120, 160, 280, 0, 7); x.stroke();
      x.fillStyle = "#E8C96A"; x.font = "700 40px 'Barlow Condensed',Arial Narrow,sans-serif"; x.fillText("LA POLLA CREMA · LIGA 1 2026", 80, 130);
      x.fillStyle = "#F7EEDC"; x.font = "800 190px 'Barlow Condensed',Impact,sans-serif"; x.fillText((G.name || "HINCHA").toUpperCase().slice(0, 12), 80, 380);
      x.fillStyle = "#E8C96A"; x.font = "700 64px 'Barlow Condensed',Arial Narrow,sans-serif"; x.fillText("NIVEL " + (lv + 1) + " · " + LEVELS[lv].name.toUpperCase(), 80, 470);
      var stats = [[G.xp, "XP"], [totalPts(), "PUNTOS"], [G.streak.count, "RACHA"], [Object.keys(G.badges).length, "INSIGNIAS"]];
      stats.forEach(function (s, i) { var px = 80 + i * 245; x.fillStyle = "rgba(255,255,255,.08)"; x.fillRect(px, 560, 225, 220); x.fillStyle = "#F7EEDC"; x.font = "800 110px 'Barlow Condensed',Impact,sans-serif"; x.fillText(String(s[0]), px + 22, 690); x.fillStyle = "#CDB9B3"; x.font = "700 34px 'Barlow Condensed',Arial Narrow,sans-serif"; x.fillText(s[1], px + 22, 750); });
      var S = L1.getS(), pos = S ? S.pos.T[L1.FOCUS] : null, me = S ? S.T.filter(function (r) { return r.id === L1.FOCUS; })[0] : null;
      x.fillStyle = "#F7EEDC"; x.font = "700 56px 'Barlow Condensed',Arial Narrow,sans-serif"; x.fillText("CON MIS PRONÓSTICOS", 80, 900);
      x.fillStyle = "#E8C96A"; x.font = "800 150px 'Barlow Condensed',Impact,sans-serif"; x.fillText(pos ? "LA U: " + pos + "º" : "LA U", 80, 1050);
      x.fillStyle = "#F7EEDC"; x.font = "700 60px 'Barlow Condensed',Arial Narrow,sans-serif"; x.fillText(me ? me.pts + " PUNTOS EN EL ACUMULADO" : "", 80, 1130);
      x.fillStyle = "#CDB9B3"; x.font = "600 38px Arial,sans-serif"; x.fillText("Juega y reta a tus amigos", 80, 1236); x.fillStyle = "#E8C96A"; x.fillText(location.host, 80, 1290);
      var finish = function () {
        c.toBlob(function (blob) {
          if (!blob) { toast("No se pudo crear la imagen.", "info"); return; }
          var file; try { file = new File([blob], "polla-crema.png", { type: "image/png" }); } catch (e) { file = null; }
          if (file && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: "Mi Polla Crema" }).then(function () { if (!G.shared) { G.shared = 1; save(); award("share"); } }, function () { }); return; }
          var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "polla-crema.png"; document.body.appendChild(a); a.click(); a.remove();
          toast("Imagen guardada.", "info"); if (!G.shared) { G.shared = 1; save(); award("share"); }
        }, "image/png");
      };
      var img = new Image(); img.onload = function () { x.drawImage(img, W - 330, 330, 240, 240); finish(); }; img.onerror = finish; img.src = L1.crest(L1.FOCUS);
    }

    /* ---------- retos entrantes (?polla=) ---------- */
    function incoming() {
      var q = new URLSearchParams(location.search).get("polla");
      if (!q) return;
      try {
        var o = b64d(q), r = { name: String(o.n || "Amigo").slice(0, 18), at: +o.t || Date.now(), preds: {} };
        (o.p || []).forEach(function (a) { if (a && a.length === 3) r.preds[String(a[0])] = [+a[1], +a[2]]; });
        var n = Object.keys(r.preds).length;
        if (!n) return;
        var box = $("#challenge");
        box.innerHTML = '<div class="cel-card"><div class="cel-ic">' + icon("users") + '</div><p class="cel-k">Reto de la Polla Crema</p><h3>' + esc(r.name) + " te retó</h3><p>Tiene " + n + " pronósticos. ¿Aceptas el reto y ves quién suma más?</p><div class=\"g-actions\"><button type=\"button\" class=\"btn primary\" id=\"chYes\">Aceptar reto</button><button type=\"button\" class=\"btn\" id=\"chNo\">Ahora no</button></div></div>";
        box.hidden = false;
        L1.emit("stat", "reto-recibido");
        var clean = function () { box.hidden = true; history.replaceState(null, "", location.pathname + location.hash); };
        $("#chNo").addEventListener("click", clean);
        $("#chYes").addEventListener("click", function () {
          G.rivals[String(r.at) + "-" + r.name] = r; save(); clean(); L1.emit("stat", "reto-aceptado"); award("rival"); gameTab = "amigos"; L1.show("game"); confetti(100); toast("Reto aceptado. Mucha suerte.", "xp");
        });
      } catch (e) { /* enlace dañado */ }
    }

    /* ---------- arranque ---------- */
    Object.keys(L1.getPreds()).forEach(function (k) { if (!G.snap[k]) G.snap[k] = { p: L1.getPreds()[k], at: Date.now() }; });
    save();
    scoreAll();
    dailyVisit();
    renderPill(); renderStrip();
    var pill = $("#xpPill"); if (pill) pill.addEventListener("click", function () { gameTab = "perfil"; L1.show("game"); window.scrollTo(0, 0); });
    var sc = $("#shareClose"); if (sc) sc.addEventListener("click", function () { $("#shareBox").hidden = true; });
    incoming();
    L1.game = { gainXP: gainXP, award: award };
  };
})();
