(function () {
  "use strict";

  function boot(live) {
  var D = window.LIGA1;
  var LIVE_OK = !!(live && live.complete && live.fixtures && live.fixtures.length >= 300);
  if (LIVE_OK) D = Object.assign({}, D, { fixtures: live.fixtures, demo: false, live: live });
  var ADJ = (LIVE_OK && live.adjust) || {};
  var UNI = (LIVE_OK && live.uni) || null;
  var TEAMS = D.teams;
  var BY = {};
  TEAMS.forEach(function (t) { BY[t.id] = t; });
  var FOCUS = D.focus;
  if (LIVE_OK) {
    var st = {}, sum = 0, cnt = 0;
    D.fixtures.forEach(function (f) {
      if (f.hg == null) return;
      [[f.h, f.hg, f.ag], [f.a, f.ag, f.hg]].forEach(function (x) {
        var r = st[x[0]] || (st[x[0]] = { p: 0, n: 0 });
        r.n++; r.p += x[1] > x[2] ? 3 : x[1] === x[2] ? 1 : 0;
      });
    });
    TEAMS.forEach(function (t) { if (st[t.id]) { sum += st[t.id].p / st[t.id].n; cnt++; } });
    TEAMS.forEach(function (t) { t.power = st[t.id] ? 74 + 20 * (st[t.id].p / st[t.id].n - sum / cnt) : 74; });
  }
  function adj(tor, id) { return (ADJ[tor] && ADJ[tor][id]) || 0; }
  function applyAdj(rows, tors) { rows.forEach(function (r) { tors.forEach(function (t) { r.pts += adj(t, r.id); }); }); return rows; }
  var NF = Math.max.apply(null, D.fixtures.map(function (f) { return f.f; }));
  var STORE = "liga1-preds-" + D.season + (LIVE_OK ? "-real" : "");
  var THEME = "liga1-theme";
  var LABEL = { A: "Apertura", C: "Clausura" };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- almacenamiento seguro ---------- */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }

  var preds = {};
  try { preds = JSON.parse(lsGet(STORE) || "{}") || {}; } catch (e) { preds = {}; }
  function savePreds() { lsSet(STORE, JSON.stringify(preds)); }
  function fkey(f) { return f.t + "|" + f.f + "|" + f.h + "|" + f.a; }

  /* resultado efectivo: oficial o pronóstico */
  function eff(f, usePreds) {
    if (f.hg != null && f.ag != null) return { h: f.hg, a: f.ag, src: "official" };
    if (usePreds !== false) {
      var p = preds[fkey(f)];
      if (p) return { h: p[0], a: p[1], src: "pred" };
    }
    return null;
  }

  /* ---------- cálculo de tablas ---------- */
  function blank(id) { return { id: id, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 }; }
  function tally(fixtures, usePreds) {
    var m = {};
    TEAMS.forEach(function (t) { m[t.id] = blank(t.id); });
    fixtures.forEach(function (f) {
      var r = eff(f, usePreds);
      if (!r) return;
      var H = m[f.h], A = m[f.a];
      H.pj++; A.pj++;
      H.gf += r.h; H.gc += r.a; A.gf += r.a; A.gc += r.h;
      if (r.h > r.a) { H.pg++; H.pts += 3; A.pp++; }
      else if (r.h < r.a) { A.pg++; A.pts += 3; H.pp++; }
      else { H.pe++; A.pe++; H.pts++; A.pts++; }
    });
    return Object.keys(m).map(function (k) { var x = m[k]; x.dg = x.gf - x.gc; return x; });
  }
  function cmp(a, b) { return b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || (BY[a.id].name < BY[b.id].name ? -1 : 1); }
  function sorted(rows) { return rows.slice().sort(cmp); }

  function compute(usePreds) {
    var fa = D.fixtures.filter(function (f) { return f.t === "A"; });
    var fc = D.fixtures.filter(function (f) { return f.t === "C"; });
    var A = sorted(applyAdj(tally(fa, usePreds), ["A"])), C = sorted(applyAdj(tally(fc, usePreds), ["C"])), T = sorted(applyAdj(tally(D.fixtures, usePreds), ["A", "C", "T"]));
    var pa = {}, pc = {};
    A.forEach(function (r) { pa[r.id] = r.pts; });
    C.forEach(function (r) { pc[r.id] = r.pts; });
    var pos = { A: {}, C: {}, T: {} };
    A.forEach(function (r, i) { pos.A[r.id] = i + 1; });
    C.forEach(function (r, i) { pos.C[r.id] = i + 1; });
    T.forEach(function (r, i) { pos.T[r.id] = i + 1; });
    return { A: A, C: C, T: T, pa: pa, pc: pc, pos: pos, maxT: T[0] ? T[0].pts : 0 };
  }

  var S; /* estado calculado con pronósticos */
  var BASE; /* estado oficial, sin pronósticos */
  function recompute() { S = compute(true); BASE = compute(false); }

  /* puntos acumulados por fecha (1..2*NF) */
  function cumulative() {
    var out = {};
    TEAMS.forEach(function (t) { out[t.id] = []; });
    var idx = {};
    D.fixtures.forEach(function (f) { idx[f.t + f.f] = (idx[f.t + f.f] || []).concat(f); });
    TEAMS.forEach(function (t) {
      var run = 0, broken = false;
      ["A", "C"].forEach(function (tor) {
        for (var n = 1; n <= NF; n++) {
          var v = null;
          if (!broken) {
            if (n === 1) run += adj(tor, t.id) + (tor === "A" ? adj("T", t.id) : 0);
            var f = (idx[tor + n] || []).filter(function (x) { return x.h === t.id || x.a === t.id; })[0];
            var r = f && eff(f);
            if (r) {
              var mine = f.h === t.id ? r.h : r.a, his = f.h === t.id ? r.a : r.h;
              run += mine > his ? 3 : mine === his ? 1 : 0;
              v = run;
            } else broken = true;
          }
          out[t.id].push(v);
        }
      });
    });
    return out;
  }

  /* ultimos 5 partidos oficiales, del mas antiguo al mas reciente, con rival y marcador */
  function formDetail(id) {
    var list = D.fixtures.filter(function (f) { return (f.h === id || f.a === id) && f.hg != null; });
    list.sort(function (x, y) { return (x.t === y.t ? 0 : x.t === "A" ? -1 : 1) || x.f - y.f; });
    return list.slice(-5).map(function (f) {
      var home = f.h === id, mine = home ? f.hg : f.ag, his = home ? f.ag : f.hg;
      return { k: mine > his ? "W" : mine === his ? "D" : "L", rival: home ? f.a : f.h, mine: mine, his: his, home: home, t: f.t, f: f.f, date: f.date };
    });
  }
  /* partidos por jugar de un equipo (sin resultado oficial ni hora ya pasada); tor = "A", "C" o "T" (todos) */
  function pendingOf(id, tor) {
    var list = D.fixtures.filter(function (f) { return (f.h === id || f.a === id) && f.hg == null && !isOver(f) && (tor === "T" || f.t === tor); });
    list.sort(function (x, y) { return (x.t === y.t ? 0 : x.t === "A" ? -1 : 1) || x.f - y.f; });
    return list;
  }

  /* ---------- glosario de siglas (se muestra al pasar el mouse o al tocar) ---------- */
  var TIPS = {
    "#": "Posición en la tabla",
    "Club": "Nombre del club",
    "PJ": "Partidos jugados",
    "PG": "Partidos ganados (3 puntos cada uno)",
    "PE": "Partidos empatados (1 punto cada uno)",
    "PP": "Partidos perdidos (0 puntos)",
    "GF": "Goles a favor: los que anotó el equipo",
    "GC": "Goles en contra: los que recibió el equipo",
    "DG": "Diferencia de goles (GF menos GC). Es el primer desempate tras los puntos",
    "Pts": "Puntos del torneo: 3 por victoria y 1 por empate",
    "Pts Ap.": "Puntos obtenidos en el Torneo Apertura",
    "Pts Cl.": "Puntos obtenidos en el Torneo Clausura",
    "Forma": "Últimos 5 partidos, del más antiguo al más reciente. Verde: ganó. Gris con E: empató. Rojo: perdió. En los verdes y rojos, la letra indica si jugó de local (L) o de visita (V). Pasa el mouse o toca cada uno para ver el rival y el marcador",
    "Pend.": "Partidos que le faltan por jugar. L: local, V: visita. Pasa el mouse o toca cada icono para ver el rival y la fecha",
    "Acum.": "Puntos acumulados de la temporada: Apertura más Clausura. Si hay un descuento por sanción solo en el acumulado, aparece junto al total",
    "Acum. hoy": "Puntos acumulados actuales, con los pronósticos que ingresaste",
    "Acum. proyectado": "Promedio de puntos acumulados al final de la temporada en las simulaciones",
    "Líder Apertura": "Probabilidad de terminar primero en el Apertura",
    "Líder Clausura": "Probabilidad de terminar primero en el Clausura",
    "Libertadores": "Probabilidad de quedar en las posiciones de Copa Libertadores del acumulado",
    "Sudamericana": "Probabilidad de quedar en las posiciones de Copa Sudamericana del acumulado",
    "Descenso": "Probabilidad de quedar en las posiciones de descenso del acumulado"
  };
  function th(label, cls, tip) {
    return "<th" + (cls ? " class='" + cls + "'" : "") + " tabindex='0' data-tip=\"" + (tip || TIPS[label] || "").replace(/"/g, "&quot;") + "\">" + label + "</th>";
  }
  function thFecha(n) {
    var t = n <= NF ? "Apertura, fecha " + n : "Clausura, fecha " + (n - NF);
    return th(n <= NF ? "A" + n : "C" + (n - NF), "", t + ": puntos acumulados hasta esa fecha");
  }

  /* ---------- helpers de vista ---------- */
  function badge(t) {
    return '<span class="badge" style="background:' + t.c1 + ";color:" + t.c2 + '">' + t.id +
      '<img src="escudos/' + t.id + '.png?v=2" alt="" onload="this.parentNode.classList.add(\'has\')" onerror="if(!this.dataset.t){this.dataset.t=1;this.src=this.src.replace(\'.png\',\'.svg\')}else{this.remove()}"></span>';
  }
  function teamCell(t) {
    var paw = t.id === FOCUS ? '<svg class="paw" viewBox="0 0 24 24" aria-label="Garra crema"><use href="#paw"/></svg>' : "";
    return '<span class="team">' + badge(t) + "<span>" + t.short + paw + (t.short !== t.name ? "<small>" + t.name + "</small>" : "") + "</span></span>";
  }
  function zoneClass(i, n) {
    var z = D.zones;
    if (i < z.libertadores) return " z-lib";
    if (i < z.libertadores + z.sudamericana) return " z-sud";
    if (i >= n - z.descenso) return " z-desc";
    return "";
  }
  function legendHtml() {
    var z = D.zones;
    return '<span title="Clasifican a la Copa Libertadores"><i class="lz-lib"></i>Libertadores (puestos 1-' + z.libertadores + ')</span>' +
      '<span title="Clasifican a la Copa Sudamericana"><i class="lz-sud"></i>Sudamericana (puestos ' + (z.libertadores + 1) + "-" + (z.libertadores + z.sudamericana) + ')</span>' +
      '<span title="Descienden a la Liga 2"><i class="lz-desc"></i>Descenso (últimos ' + z.descenso + ")</span>";
  }
  function moveHtml(id, key) {
    var d = BASE.pos[key][id] - S.pos[key][id];
    if (!d) return "";
    return '<span class="delta ' + (d > 0 ? "up" : "down") + '" title="Cambio frente a la tabla oficial">' + (d > 0 ? "▲" : "▼") + Math.abs(d) + "</span>";
  }
  var RES = { W: ["Ganó", "G"], D: ["Empató", "E"], L: ["Perdió", "P"] };
  function crestSrc(id) { return (window.CRESTS && window.CRESTS[id]) || "escudos/" + id + ".png"; }
  function ttAttrs(rivalId, head, sub) {
    return ' tabindex="0" class="tt-el" data-tt-id="' + esc(rivalId) + '" data-tt-h="' + esc(head) + '" data-tt-s="' + esc(sub) + '" aria-label="' + esc(head + ". " + sub) + '"';
  }
  function formHtml(id) {
    var f = formDetail(id), h = "";
    for (var i = 0; i < 5 - f.length; i++) h += '<i class="N" aria-hidden="true">\u00b7</i>';
    return '<span class="form" aria-label="Últimos resultados">' + h + f.map(function (x) {
      var r = BY[x.rival], name = r ? r.short : x.rival, sc = x.mine + "-" + x.his, diff = Math.abs(x.mine - x.his);
      var head = x.k === "W" ? "Ganó " + sc + " a " + name : x.k === "D" ? "Empató " + sc + " con " + name : "Perdió " + sc + " contra " + name;
      var sub = (x.k === "D" ? "Sin diferencia de goles" : "Por " + diff + (diff === 1 ? " gol" : " goles")) + " \u00b7 " + (x.home ? "Local" : "Visita") + " \u00b7 " + LABEL[x.t] + ", fecha " + x.f + (x.date ? " \u00b7 " + fmtDay(x.date) : "");
      return "<i" + ttAttrs(x.rival, head, sub).replace('class="tt-el"', 'class="tt-el ' + x.k + '"') + ">" + (x.k === "D" ? "E" : x.home ? "L" : "V") + "</i>";
    }).join("") + "</span>";
  }
  function pendHtml(id, tor, cap) {
    var list = pendingOf(id, tor);
    if (!list.length) return '<span class="pend-none" title="Sin partidos pendientes">\u2014</span>';
    var shown = list.slice(0, cap), more = list.length - shown.length;
    return shown.map(function (f) {
      var home = f.h === id, rid = home ? f.a : f.h, r = BY[rid], name = r ? r.short : rid;
      var pr = preds[fkey(f)];
      var head = (home ? "Local contra " : "Visita contra ") + name;
      var sub = LABEL[f.t] + ", fecha " + f.f + (f.date ? " \u00b7 " + fmtDay(f.date, f.time) : "") + (pr ? " \u00b7 Tu pronóstico: " + pr[0] + "-" + pr[1] : "");
      return "<span" + ttAttrs(rid, head, sub).replace('class="tt-el"', 'class="tt-el pc ' + (home ? "L" : "V") + (pr ? " pred" : "") + '"') + '><img src="' + esc(crestSrc(rid)) + '" alt="" onerror="this.remove()">' + (home ? "L" : "V") + "</span>";
    }).join("") + (more > 0 ? '<span class="pc more" title="' + more + ' partidos más por jugar">+' + more + "</span>" : "");
  }
  function acumCell(id) {
    var row = S.T.filter(function (r) { return r.id === id; })[0];
    var d = adj("T", id);
    var dsc = d ? '<span class="dsc" title="Descuento de puntos por sanción que figura solo en el acumulado oficial">' + (d > 0 ? "+" : "\u2212") + Math.abs(d) + "</span>" : "";
    return '<td class="acum"><div class="acum-in"><b>' + row.pts + "</b>" + dsc + "</div></td>";
  }

  function renderStd(el, key, opts) {
    var rows = key === "T" ? S.T : S[key];
    var head = "<thead><tr>" + th("#") + th("Club", "club") + th("PJ") + th("PG") + th("PE") + th("PP") + th("GF") + th("GC") + th("DG");
    var anyPend = rows.some(function (r) { return pendingOf(r.id, key).length; });
    if (key === "T") head += th("Pts Ap.") + th("Pts Cl.") + th("Forma") + th("Pend.", "pendh") + th("Acum.", "acumh");
    else head += th("Pts") + th("Forma") + th("Pend.", "pendh") + th("Acum.", "acumh");
    head += "</tr></thead>";
    var body = rows.map(function (r, i) {
      var t = BY[r.id];
      var z = key === "T" ? zoneClass(i, rows.length) : "";
      var dgc = r.dg > 0 ? " pos-n" : r.dg < 0 ? " neg-n" : "";
      var tds = '<td class="pos' + z + '"><span class="n">' + (i + 1) + "</span>" + moveHtml(r.id, key) + '</td><td class="club">' + teamCell(t) + '<span class="pend-m">' + pendHtml(r.id, key, 4) + "</span></td>" +
        "<td>" + r.pj + "</td><td>" + r.pg + "</td><td>" + r.pe + "</td><td>" + r.pp + "</td><td>" + r.gf + "</td><td>" + r.gc + '</td><td class="dg' + dgc + '">' + (r.dg > 0 ? "+" : "") + r.dg + "</td>";
      var pend = '<td class="pend">' + pendHtml(r.id, key, 6) + "</td>";
      if (key === "T") tds += "<td>" + S.pa[r.id] + "</td><td>" + S.pc[r.id] + "</td><td>" + formHtml(r.id) + "</td>" + pend + acumCell(r.id);
      else tds += '<td class="pts">' + r.pts + "</td><td>" + formHtml(r.id) + "</td>" + pend + acumCell(r.id);
      return '<tr class="' + (r.id === FOCUS ? "me" : "") + z.replace(" z-", " rz-") + '">' + tds + "</tr>";
    }).join("");
    el.classList.toggle("nopend", !anyPend);
    el.innerHTML = head + "<tbody>" + body + "</tbody>";
  }

  /* ---------- globo con rival y marcador (iconos de forma y de partidos pendientes) ---------- */
  var ttBox = null, ttCur = null;
  function ttShow(el) {
    if (!ttBox) { ttBox = document.createElement("div"); ttBox.className = "tt"; ttBox.setAttribute("role", "tooltip"); ttBox.hidden = true; document.body.appendChild(ttBox); }
    var d = el.dataset;
    ttBox.innerHTML = (d.ttId ? '<img class="tt-c" src="' + esc(crestSrc(d.ttId)) + '" alt="" onerror="this.remove()">' : "") + '<span class="tt-b"><b>' + esc(d.ttH) + "</b><i>" + esc(d.ttS) + "</i></span>";
    ttBox.hidden = false; ttCur = el;
    var r = el.getBoundingClientRect(), w = ttBox.offsetWidth, h = ttBox.offsetHeight;
    var left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
    var top = r.top - h - 10; if (top < 8) top = r.bottom + 10;
    ttBox.style.left = left + "px"; ttBox.style.top = top + "px";
  }
  function ttHide() { if (ttBox) ttBox.hidden = true; ttCur = null; }
  function initTooltips() {
    var hover = matchMedia("(hover: hover)").matches;
    function target(e) { return e.target && e.target.closest ? e.target.closest(".tt-el") : null; }
    if (hover) {
      document.addEventListener("mouseover", function (e) { var el = target(e); if (el) ttShow(el); });
      document.addEventListener("mouseout", function (e) { if (target(e)) ttHide(); });
    }
    document.addEventListener("focusin", function (e) { var el = target(e); if (el && hover) ttShow(el); });
    document.addEventListener("focusout", function (e) { if (target(e)) ttHide(); });
    document.addEventListener("click", function (e) {
      var el = target(e);
      if (!hover && el) { if (ttCur === el) ttHide(); else ttShow(el); } else if (!el) ttHide();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") ttHide(); });
    function follow() { if (!ttCur) return; if (hover && document.body.contains(ttCur)) ttShow(ttCur); else ttHide(); }
    window.addEventListener("scroll", follow, { passive: true });
    window.addEventListener("resize", follow);
  }

  function renderMini() {
    var el = $("#tbl-mini");
    var head = "<thead><tr>" + th("#") + th("Club", "club") + th("PJ") + th("DG") + th("Pts Ap.") + th("Pts Cl.") + th("Acum.", "acumh") + "</tr></thead>";
    var body = S.T.map(function (r, i) {
      return '<tr class="' + (r.id === FOCUS ? "me" : "") + zoneClass(i, S.T.length).replace(" z-", " rz-") + '"><td class="pos' + zoneClass(i, S.T.length) + '"><span class="n">' + (i + 1) + "</span>" + moveHtml(r.id, "T") + '</td><td class="club">' + teamCell(BY[r.id]) + "</td><td>" + r.pj + "</td><td>" + (r.dg > 0 ? "+" : "") + r.dg + "</td><td>" + S.pa[r.id] + "</td><td>" + S.pc[r.id] + "</td>" + acumCell(r.id) + "</tr>";
    }).join("");
    el.innerHTML = head + "<tbody>" + body + "</tbody>";
  }

  var DAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"], MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  function fmtDay(iso, hhmm) {
    if (!iso) return "";
    var p = iso.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]);
    return DAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()] + (hhmm ? " " + hhmm : "");
  }
  function fmtWhen(startsAt) {
    try {
      var parts = new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(startsAt));
      var g = {}; parts.forEach(function (x) { g[x.type] = x.value; });
      return (g.weekday + " " + g.day + " " + g.month + " " + g.hour + ":" + g.minute).replace(/\./g, "");
    } catch (e) { return ""; }
  }
  function fmtStamp(iso) {
    try { return new Date(iso).toLocaleString("es-PE", { timeZone: "America/Lima", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }); } catch (e) { return iso; }
  }
  function nextFixture(id) {
    var list = D.fixtures.filter(function (f) { return (f.h === id || f.a === id) && f.hg == null; });
    list.sort(function (x, y) { return (x.t === y.t ? 0 : x.t === "A" ? -1 : 1) || x.f - y.f; });
    return list[0];
  }

  function renderHero() {
    var me = BY[FOCUS], nx = nextFixture(FOCUS), nu = UNI && UNI.next;
    if (nu && nu.homeId && nu.awayId && (nu.homeId === FOCUS || nu.awayId === FOCUS)) {
      var home = nu.homeId === FOCUS, rival = BY[home ? nu.awayId : nu.homeId];
      $("#nextMatch").innerHTML = "<div>" + badge(me) + "</div><div><small>Próximo partido · " + (nu.stage || "").replace(" — ", " · ") + " · " + fmtWhen(nu.startsAt) + "</small><b>" +
        me.short + " vs " + rival.short + (home ? " (local)" : " (visita)") + "</b><small>" + (nu.venue || "") + (nu.city ? ", " + nu.city : "") + '</small><small class="nx-cdt" data-cd-txt="' + esc(nu.startsAt) + '"></small></div>';
      tickCd();
    } else
    $("#nextMatch").innerHTML = nx
      ? '<div>' + badge(me) + '</div><div><small>Próximo partido · ' + LABEL[nx.t] + " fecha " + nx.f + "</small><b>" +
        (nx.h === FOCUS ? me.short + " vs " + BY[nx.a].short + " (local)" : BY[nx.h].short + " vs " + me.short + " (visita)") + "</b></div>"
      : "<div><small>Temporada</small><b>Sin partidos pendientes</b></div>";
    var pt = S.T.filter(function (r) { return r.id === FOCUS; })[0];
    var lead = S.T[0];
    var gap = lead.pts - pt.pts;
    var apos = S.pos.A[FOCUS], cpos = S.pos.C[FOCUS];
    $("#kpis").innerHTML =
      '<div class="kpi main"><small>Puesto en el acumulado</small><div class="v">' + S.pos.T[FOCUS] + '<i>º de ' + TEAMS.length + '</i></div><div class="d">' + (gap ? gap + " pts del líder (" + BY[lead.id].short + ")" : "Líder del acumulado") + "</div></div>" +
      '<div class="kpi"><small>Puntos acumulados</small><div class="v">' + pt.pts + '<i> pts</i></div><div class="d">' + pt.pj + " partidos · DG " + (pt.dg > 0 ? "+" : "") + pt.dg + "</div></div>" +
      '<div class="kpi"><small>Apertura</small><div class="v">' + apos + '<i>º</i></div><div class="d">' + S.pa[FOCUS] + " puntos</div></div>" +
      '<div class="kpi"><small>Clausura</small><div class="v">' + cpos + '<i>º</i></div><div class="d">' + S.pc[FOCUS] + " puntos</div></div>" +
      '<button type="button" class="kpi kpi-cmp" data-go="cmp"><span>Comparar Apertura vs Clausura</span><b aria-hidden="true">\u203a</b></button>';
  }

  function renderLegend() {
    $$(".zone-legend").forEach(function (el) { el.innerHTML = legendHtml(); });
  }

  /* ---------- calculadora ---------- */
  var cur = { t: null, f: null };
  function defaultFecha() {
    var t = "C", f = NF;
    var pend = D.fixtures.filter(function (x) { return x.t === "C" && x.hg == null; });
    if (pend.length) f = Math.min.apply(null, pend.map(function (x) { return x.f; }));
    else { var pa = D.fixtures.filter(function (x) { return x.t === "A" && x.hg == null; }); if (pa.length) { t = "A"; f = Math.min.apply(null, pa.map(function (x) { return x.f; })); } }
    return { t: t, f: f };
  }
  function fillFechaSel() {
    var sel = $("#fechaSel"), h = "";
    for (var n = 1; n <= NF; n++) {
      var fx = D.fixtures.filter(function (x) { return x.t === cur.t && x.f === n; });
      var played = fx.filter(function (x) { return x.hg != null; }).length;
      h += '<option value="' + n + '"' + (n === cur.f ? " selected" : "") + ">Fecha " + n + (played === fx.length ? " (jugada)" : played ? " (en juego)" : "") + "</option>";
    }
    sel.innerHTML = h;
  }
  function tagFor(f) {
    if (f.hg != null) return '<span class="tag played">Jugado</span>';
    return preds[fkey(f)] ? '<span class="tag pred">Pronóstico</span>' : '<span class="tag open">Pendiente</span>';
  }
  function stp(i, s, name, val) {
    return '<div class="stp"><button type="button" class="stp-b" data-i="' + i + '" data-s="' + s + '" data-d="1" aria-label="Sumar un gol a ' + esc(name) + '">+</button>' +
      '<input inputmode="numeric" type="number" min="0" max="20" aria-label="Goles ' + esc(name) + '" data-i="' + i + '" data-s="' + s + '" value="' + val + '">' +
      '<button type="button" class="stp-b" data-i="' + i + '" data-s="' + s + '" data-d="-1" aria-label="Restar un gol a ' + esc(name) + '">\u2212</button></div>';
  }
  function renderFixtures() {
    var list = D.fixtures.filter(function (x) { return x.t === cur.t && x.f === cur.f; });
    $("#fixtures").innerHTML = list.map(function (f, i) {
      var H = BY[f.h], A = BY[f.a], p = preds[fkey(f)];
      var mid = f.hg != null
        ? '<div class="score"><span class="fin">' + f.hg + '</span><span class="dash">-</span><span class="fin">' + f.ag + "</span></div>"
        : '<div class="score">' + stp(i, "h", H.name, p ? p[0] : "") + '<span class="dash">-</span>' + stp(i, "a", A.name, p ? p[1] : "") + "</div>";
      return '<article class="fx' + (f.h === FOCUS || f.a === FOCUS ? " me" : "") + '" data-i="' + i + '"><div class="fx-row">' +
        '<div class="fx-t">' + badge(H) + '<span class="n">' + H.short + "</span></div>" + mid +
        '<div class="fx-t away"><span class="n">' + A.short + "</span>" + badge(A) + "</div></div>" +
        '<div class="fx-foot"><span>' + LABEL[f.t] + " · fecha " + f.f + (f.date ? " · " + fmtDay(f.date, f.time) : "") + "</span>" + tagFor(f) + "</div></article>";
    }).join("");
    $$("#fixtures input").forEach(function (inp) { inp.addEventListener("input", onScore); });
    $$("#fixtures .stp-b").forEach(function (b) {
      b.addEventListener("click", function () {
        var card = b.closest(".fx"), hi = $('input[data-s="h"]', card), ai = $('input[data-s="a"]', card);
        var mine = b.dataset.s === "h" ? hi : ai, other = b.dataset.s === "h" ? ai : hi, d = +b.dataset.d;
        var v = Math.max(0, Math.min(20, (mine.value === "" ? 0 : +mine.value) + d));
        mine.value = v; if (other.value === "") other.value = 0;
        try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) { /* sin vibración */ }
        mine.dispatchEvent(new Event("input", { bubbles: true }));
      });
    });
  }
  function onScore(e) {
    var inp = e.target, card = inp.closest(".fx"), i = +card.dataset.i;
    var f = D.fixtures.filter(function (x) { return x.t === cur.t && x.f === cur.f; })[i];
    var h = $('input[data-s="h"]', card).value, a = $('input[data-s="a"]', card).value;
    var pkey = fkey(f), had = !!preds[pkey];
    if (h !== "" && a !== "" && +h >= 0 && +a >= 0) preds[pkey] = [Math.floor(+h), Math.floor(+a)];
    else delete preds[pkey];
    savePreds();
    $(".fx-foot .tag", card).outerHTML = tagFor(f);
    renderAll(true);
    L1.emit("pred", { f: f, key: pkey, val: preds[pkey] || null, isNew: !had && !!preds[pkey] });
  }
  function pois(l) { var L = Math.exp(-l), k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; }
  function lambdas(f) {
    var d = (BY[f.h].power - BY[f.a].power) / 60;
    return [1.3 * Math.exp(d) * 1.08, 1.0 * Math.exp(-d)];
  }
  function randomize(list) {
    var made = [];
    list.forEach(function (f) {
      if (f.hg != null) return;
      var l = lambdas(f), k = fkey(f);
      made.push({ f: f, key: k, had: !!preds[k] });
      preds[k] = [pois(l[0]), pois(l[1])];
    });
    savePreds(); renderFixtures(); renderAll(true);
    made.forEach(function (m) { L1.emit("pred", { f: m.f, key: m.key, val: preds[m.key], isNew: !m.had }); });
    L1.emit("random", {});
  }

  /* ---------- evolución ---------- */
  var PALETTE = ["#1B3A8C", "#2B9FD8", "#E5A800", "#2E7D32", "#7B3FA0", "#E67E22", "#00897B", "#6D4C41", "#D81B60", "#546E7A", "#8E24AA", "#43A047", "#F4511E", "#3949AB", "#00ACC1", "#7CB342", "#C0CA33"];
  var chart = null, shown = null;
  function colorOf(id) {
    if (id === FOCUS) return "#8B0A1A";
    var others = TEAMS.filter(function (t) { return t.id !== FOCUS; });
    for (var i = 0; i < others.length; i++) if (others[i].id === id) return PALETTE[i % PALETTE.length];
    return "#888";
  }
  function initChips() {
    if (!shown) shown = [FOCUS].concat(S.T.filter(function (r) { return r.id !== FOCUS; }).slice(0, 3).map(function (r) { return r.id; }));
    $("#teamChips").innerHTML = TEAMS.map(function (t) {
      return '<button type="button" class="chip" data-id="' + t.id + '" aria-pressed="' + (shown.indexOf(t.id) >= 0) + '"><i style="background:' + colorOf(t.id) + '"></i>' + t.short + "</button>";
    }).join("");
    $$("#teamChips .chip").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.dataset.id, k = shown.indexOf(id);
        if (k >= 0) shown.splice(k, 1); else shown.push(id);
        b.setAttribute("aria-pressed", String(k < 0));
        renderChart();
      });
    });
  }
  function renderMatrix() {
    var cum = cumulative();
    var head = "<thead><tr>" + th("Club", "club");
    for (var n = 1; n <= 2 * NF; n++) head += thFecha(n);
    head += "</tr></thead>";
    var body = S.T.map(function (r) {
      var tds = cum[r.id].map(function (v, i) {
        return "<td class='" + (i === NF ? "cut " : "") + (v == null ? "na" : "") + "'>" + (v == null ? "·" : v) + "</td>";
      }).join("");
      return '<tr class="' + (r.id === FOCUS ? "me" : "") + '"><td class="club">' + teamCell(BY[r.id]) + "</td>" + tds + "</tr>";
    }).join("");
    $("#tbl-matrix").innerHTML = head + "<tbody>" + body + "</tbody>";
  }
  function renderChart() {
    if (!window.Chart) return;
    var cum = cumulative();
    var cs = getComputedStyle(document.documentElement);
    var ink = cs.getPropertyValue("--ink").trim() || "#222", line = cs.getPropertyValue("--line").trim() || "#ddd";
    var labels = [];
    for (var n = 1; n <= 2 * NF; n++) labels.push(n <= NF ? "A" + n : "C" + (n - NF));
    var ds = shown.map(function (id) {
      var me = id === FOCUS;
      return { label: BY[id].short, data: cum[id], borderColor: colorOf(id), backgroundColor: colorOf(id), borderWidth: me ? 4 : 2, pointRadius: me ? 3 : 0, pointHoverRadius: 5, tension: .25, spanGaps: false, order: me ? 0 : 1 };
    });
    if (chart) chart.destroy();
    chart = new Chart($("#evoChart"), {
      type: "line",
      data: { labels: labels, datasets: ds },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
        plugins: { legend: { labels: { color: ink, usePointStyle: true } }, tooltip: { itemSort: function (a, b) { return (b.parsed.y || 0) - (a.parsed.y || 0); } } },
        scales: {
          x: { ticks: { color: ink, maxTicksLimit: 17 }, grid: { color: line }, title: { display: true, text: "Fecha (A: Apertura · C: Clausura)", color: ink } },
          y: { beginAtZero: true, ticks: { color: ink }, grid: { color: line }, title: { display: true, text: "Puntos acumulados", color: ink } }
        }
      }
    });
  }

  /* ---------- pronósticos (Monte Carlo) ---------- */
  var SIMS = 4000;
  function simulate() {
    var pending = D.fixtures.filter(function (f) { return !eff(f); });
    var base = {}, ids = TEAMS.map(function (t) { return t.id; });
    ids.forEach(function (id) { base[id] = { a: [adj("A", id), 0, 0], c: [adj("C", id), 0, 0] }; }); /* pts, gf, gc */
    D.fixtures.forEach(function (f) {
      var r = eff(f); if (!r) return;
      var k = f.t === "A" ? "a" : "c", H = base[f.h][k], A = base[f.a][k];
      H[1] += r.h; H[2] += r.a; A[1] += r.a; A[2] += r.h;
      if (r.h > r.a) H[0] += 3; else if (r.h < r.a) A[0] += 3; else { H[0]++; A[0]++; }
    });
    var lam = pending.map(lambdas);
    var n = ids.length, z = D.zones;
    var acc = {};
    ids.forEach(function (id) { acc[id] = { la: 0, lc: 0, lib: 0, sud: 0, des: 0, pts: 0 }; });
    function rank(arr, key) {
      return arr.slice().sort(function (x, y) { return y[key + "p"] - x[key + "p"] || (y[key + "g"] - y[key + "c"]) - (x[key + "g"] - x[key + "c"]) || y[key + "g"] - x[key + "g"]; });
    }
    for (var s = 0; s < SIMS; s++) {
      var cur2 = {};
      ids.forEach(function (id) { var b = base[id]; cur2[id] = { id: id, ap: b.a[0], ag: b.a[1], ac: b.a[2], cp: b.c[0], cg: b.c[1], cc: b.c[2] }; });
      for (var i = 0; i < pending.length; i++) {
        var f = pending[i], gh = pois(lam[i][0]), ga = pois(lam[i][1]);
        var H = cur2[f.h], A = cur2[f.a], p = f.t === "A" ? "a" : "c";
        H[p + "g"] += gh; H[p + "c"] += ga; A[p + "g"] += ga; A[p + "c"] += gh;
        if (gh > ga) H[p + "p"] += 3; else if (gh < ga) A[p + "p"] += 3; else { H[p + "p"]++; A[p + "p"]++; }
      }
      var arr = ids.map(function (id) { var c = cur2[id]; c.tp = c.ap + c.cp + adj("T", c.id); c.tg = c.ag + c.cg; c.tc = c.ac + c.cc; return c; });
      acc[rank(arr, "a")[0].id].la++;
      acc[rank(arr, "c")[0].id].lc++;
      rank(arr, "t").forEach(function (c, pos) {
        var a = acc[c.id]; a.pts += c.tp;
        if (pos < z.libertadores) a.lib++; else if (pos < z.libertadores + z.sudamericana) a.sud++;
        if (pos >= n - z.descenso) a.des++;
      });
    }
    return { acc: acc, pending: pending.length };
  }
  function pct(v) { return (v / SIMS * 100); }
  function probCell(v, cls) {
    var p = pct(v);
    var txt = p === 0 ? "0%" : p < 1 ? "<1%" : p > 99 ? ">99%" : Math.round(p) + "%";
    return '<td><div class="prob"><b>' + txt + '</b><span class="bar ' + cls + '"><i style="width:' + p + '%"></i></span></div></td>';
  }
  function renderPro() {
    var res = simulate();
    $("#simInfo").textContent = res.pending + " partidos por simular · " + SIMS.toLocaleString("es-PE") + " escenarios.";
    var rows = S.T.map(function (r) { return { r: r, a: res.acc[r.id] }; });
    rows.sort(function (x, y) { return y.a.pts - x.a.pts; });
    var head = "<thead><tr>" + th("#") + th("Club", "club") + th("Acum. hoy") + th("Acum. proyectado", "acumh") + th("Líder Apertura") + th("Líder Clausura") + th("Libertadores") + th("Sudamericana") + th("Descenso") + "</tr></thead>";
    var body = rows.map(function (x, i) {
      return '<tr class="' + (x.r.id === FOCUS ? "me" : "") + '"><td class="pos"><span class="n">' + (i + 1) + '</span></td><td class="club">' + teamCell(BY[x.r.id]) + "</td><td class='pts'>" + x.r.pts + "</td><td class='acum'><div class='acum-in'><b>" + (x.a.pts / SIMS).toFixed(1) + "</b></div></td>" +
        probCell(x.a.la, "b") + probCell(x.a.lc, "b") + probCell(x.a.lib, "g") + probCell(x.a.sud, "b") + probCell(x.a.des, "r") + "</tr>";
    }).join("");
    $("#tbl-pro").innerHTML = head + "<tbody>" + body + "</tbody>";
  }

  /* ---------- La U hoy (noticias y calendario de universitario.pe) ---------- */
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmtNewsDate(iso) {
    var p = (iso || "").split("-");
    return p.length === 3 ? +p[2] + " " + MONTHS[+p[1] - 1] + " " + p[0] : "";
  }
  function resultChip(m) {
    var home = m.homeId === FOCUS, mine = home ? m.homeScore : m.awayScore, his = home ? m.awayScore : m.homeScore;
    var k = mine > his ? "W" : mine === his ? "D" : "L";
    var rival = BY[home ? m.awayId : m.homeId];
    return '<li><i class="' + k + '">' + ({ W: "G", D: "E", L: "P" })[k] + '</i><span class="rs-stage">' + esc((m.stage || "").replace(" — ", " · ")) + "</span>" +
      '<span class="rs-vs">' + (home ? "U" : esc(rival ? rival.short : m.home)) + " <b>" + m.homeScore + " - " + m.awayScore + "</b> " + (home ? esc(rival ? rival.short : m.away) : "U") + "</span></li>";
  }
  var LIGA_MARK = '<svg viewBox="0 0 40 40" width="34" height="34"><circle cx="20" cy="20" r="18" fill="#D91E36"/><path d="M6 24c8-9 20-12 28-6-8-1-17 2-28 6Z" fill="#fff"/><path d="M8 29c8-5 17-7 25-4-8-1-15 0-25 4Z" fill="#fff" opacity=".8"/></svg>';
  function limaParts(iso) {
    var d = new Date(new Date(iso).getTime() - 5 * 3600000);
    return { d: d, wd: ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"][d.getUTCDay()], day: d.getUTCDate(), mo: d.getUTCMonth() + 1,
      hh: ("0" + d.getUTCHours()).slice(-2), mm: ("0" + d.getUTCMinutes()).slice(-2) };
  }
  function fmtWhenShort(iso) { var p = limaParts(iso); return p.wd + " " + ("0" + p.day).slice(-2) + "/" + ("0" + p.mo).slice(-2); }
  function fmtHour(iso) { var p = limaParts(iso); return p.hh + ":" + p.mm; }
  function cdParts(iso) {
    var ms = Math.max(0, new Date(iso).getTime() - Date.now()), s = Math.floor(ms / 1000);
    return { ms: ms, v: [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60] };
  }
  function pad2(n) { return ("0" + n).slice(-2); }
  function cdHtml(iso) {
    var labels = ["Días", "Hrs", "Min", "Seg"], c = cdParts(iso);
    return '<div class="cd" data-cd="' + esc(iso) + '" role="timer" aria-label="Cuenta regresiva al partido">' + labels.map(function (l, i) {
      return (i ? '<em>:</em>' : "") + "<div><b>" + pad2(c.v[i]) + "</b><i>" + l + "</i></div>";
    }).join("") + "</div>";
  }
  function tickCd() {
    var els = document.querySelectorAll("[data-cd]");
    for (var i = 0; i < els.length; i++) {
      var c = cdParts(els[i].getAttribute("data-cd")), bs = els[i].querySelectorAll("b");
      for (var k = 0; k < bs.length && k < 4; k++) { var v = pad2(c.v[k]); if (bs[k].textContent !== v) bs[k].textContent = v; }
    }
    var tx = document.querySelectorAll("[data-cd-txt]");
    for (var j = 0; j < tx.length; j++) {
      var q = cdParts(tx[j].getAttribute("data-cd-txt"));
      tx[j].textContent = q.ms <= 0 ? "Hoy se juega" : "Faltan " + (q.v[0] ? q.v[0] + " d " : "") + q.v[1] + " h " + pad2(q.v[2]) + " min";
    }
  }
  setInterval(tickCd, 1000);
  function renderUni() {
    if (!UNI) return;
    var h = "", n = UNI.next, me = BY[FOCUS];
    if (n && n.homeId && n.awayId) {
      var H = BY[n.homeId], A = BY[n.awayId];
      var st = (n.stage || "").split(" — ");
      h += '<article class="next-card" aria-label="Próximo partido de la U">' +
        '<p class="nx-title">Próximo partido</p>' + cdHtml(n.startsAt) +
        '<div class="nx-glass"><span class="nx-liga" aria-hidden="true">' + LIGA_MARK + '</span>' +
        '<p class="nx-comp">' + esc(n.competition || "Liga 1") + "</p>" +
        '<p class="nx-stage">' + esc(st[0] || "") + (st[1] ? " \u2014 " + esc(st[1]) : "") + "</p>" +
        '<div class="nx-row"><div class="nx-team">' + (H ? badge(H) : "") + '<span class="sr-only">' + esc(H ? H.short : n.home) + '</span></div><div class="nx-vs">VS</div>' +
        '<div class="nx-team">' + (A ? badge(A) : "") + '<span class="sr-only">' + esc(A ? A.short : n.away) + "</span></div></div>" +
        '<p class="nx-venue"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/></svg> ' +
        esc(n.venue || "") + (n.city ? " - " + esc(n.city) : "") + "</p>" +
        '<p class="nx-when"><b>' + esc(fmtWhenShort(n.startsAt)) + "</b> <span>" + esc(fmtHour(n.startsAt)) + " hora de Lima</span></p></div></article>";
    }
    if (UNI.last && UNI.last.length) {
      h += '<article class="last-card"><p class="nc-eyebrow">Últimos resultados</p><ul class="rs">' + UNI.last.map(resultChip).join("") + "</ul></article>";
    }
    var news = (UNI.news || []).map(function (x, i) {
      return '<a class="news' + (i === 0 ? " big" : "") + '" href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer">' +
        (x.image ? '<span class="news-img"><img src="' + esc(x.image) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></span>' : "") +
        '<span class="news-body"><span class="news-meta"><b>' + esc(x.category || "Club") + "</b> · " + esc(fmtNewsDate(x.date)) + "</span>" +
        '<span class="news-title">' + esc(x.title) + "</span>" + (x.summary ? '<span class="news-sum">' + esc(x.summary) + "</span>" : "") +
        '<span class="news-go">Leer en universitario.pe</span></span></a>';
    }).join("");
    $("#uniBox").innerHTML = '<div class="uni-top">' + h + '</div><h3 class="mt">Noticias del club</h3><div class="news-grid">' + news + "</div>" +
      '<p class="note">Contenido de <a href="https://universitario.pe" target="_blank" rel="noopener noreferrer">universitario.pe</a>, sitio oficial del club. Se actualiza todos los días hacia las 8:00 a. m. (hora de Lima).</p>';
    $("#t-uni").hidden = false;
    tickCd();
  }

  /* ---------- resumen de la calculadora ---------- */
  var undoPreds = null, undoTimer = null;
  function clearPreds() {
    var had = Object.keys(preds).length;
    if (!had) return;
    undoPreds = JSON.parse(JSON.stringify(preds));
    var clearedKeys = Object.keys(preds);
    preds = {}; savePreds();
    clearTimeout(undoTimer);
    undoTimer = setTimeout(function () { undoPreds = null; renderCalcSum(); }, 8000);
    renderFixtures(); fillFechaSel(); renderAll(true);
    L1.emit("clear", { keys: clearedKeys });
  }
  function restorePreds() {
    if (!undoPreds) return;
    preds = undoPreds; undoPreds = null; clearTimeout(undoTimer);
    savePreds(); renderFixtures(); fillFechaSel(); renderAll(true);
    Object.keys(preds).forEach(function (k) { var f = D.fixtures.filter(function (x) { return fkey(x) === k; })[0]; if (f) L1.emit("pred", { f: f, key: k, val: preds[k], isNew: false }); });
  }
  function renderCalcSum() {
    var box = $("#calcSum");
    if (!box) return;
    var n = Object.keys(preds).filter(function (k) { return D.fixtures.some(function (f) { return fkey(f) === k && f.hg == null; }); }).length;
    var pt = S.T.filter(function (r) { return r.id === FOCUS; })[0], b0 = BASE.T.filter(function (r) { return r.id === FOCUS; })[0];
    var lead = S.T[0], d = pt.pts - b0.pts;
    if (!n && undoPreds) {
      box.innerHTML = '<div class="cs-text"><b>Pronósticos borrados.</b> Las tablas volvieron a los datos reales.</div><div class="cs-btns"><button type="button" class="btn primary" id="csUndo">Deshacer</button></div>';
      $("#csUndo").addEventListener("click", restorePreds);
      return;
    }
    if (!n) {
      box.innerHTML = '<div class="cs-text"><b>Escribe un marcador</b> y mira aquí cómo cambia la tabla.</div><div class="cs-btns"><button type="button" class="btn" id="csGo">Ver tabla</button></div>';
    } else {
      box.innerHTML = '<div class="cs-text"><span class="cs-k">Con tus ' + n + (n === 1 ? " pronóstico" : " pronósticos") + "</span> la U queda <b>" + S.pos.T[FOCUS] + "º</b> con <b>" + pt.pts + " pts</b>" +
        (d ? ' <span class="cs-d ' + (d > 0 ? "up" : "down") + '">' + (d > 0 ? "+" : "\u2212") + Math.abs(d) + "</span>" : "") + ' <span class="cs-l">Líder: ' + esc(BY[lead.id].short) + " " + lead.pts + "</span></div>" +
        '<div class="cs-btns"><button type="button" class="btn ghost" id="csClear">Limpiar</button><button type="button" class="btn primary" id="csGo">Ver tabla</button></div>';
      $("#csClear").addEventListener("click", clearPreds);
    }
    $("#csGo").addEventListener("click", function () { var t = $("#miniBoard"); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); });
  }

  /* ---------- cinta inferior: próximos partidos ---------- */
  /* partido con fecha y hora ya iniciado hace mas de 110 min (terminado): no va en la cinta */
  function isOver(f) {
    if (!f.date) return false;
    var t = new Date(f.date + "T" + (f.time && /^\d{1,2}:\d{2}/.test(f.time) ? ("0" + f.time).slice(-5) : "23:59") + ":00-05:00").getTime();
    return !isNaN(t) && Date.now() > t + 110 * 60000;
  }
  function tickerRun() {
    var pend = D.fixtures.filter(function (f) { return f.hg == null && !isOver(f); });
    pend.sort(function (x, y) { return ((x.date || "9999") + (x.time || "99")).localeCompare((y.date || "9999") + (y.time || "99")) || x.f - y.f; });
    return pend.slice(0, 18).map(function (f) {
      var H = BY[f.h], A = BY[f.a], me = f.h === FOCUS || f.a === FOCUS;
      return '<span class="tk' + (me ? " me" : "") + '">' + badge(H) + "<b>" + esc(H.short) + "</b><i>vs</i>" + badge(A) + "<b>" + esc(A.short) + "</b><em>" +
        esc(f.date ? fmtDay(f.date, f.time) : LABEL[f.t] + " fecha " + f.f) + "</em></span>";
    }).join("");
  }
  function renderTicker() {
    var run = tickerRun();
    if (!run) return;
    $("#tkTrack").innerHTML = '<div class="tk-run">' + run + '</div><div class="tk-run" aria-hidden="true">' + run + "</div>";
    $("#tkLiveLabel").textContent = LIVE_OK ? "Datos reales" : "Demostración";
    $("#ticker").hidden = false;
    document.body.classList.add("has-ticker");
    var lastRun = run, track = $("#tkTrack"), tkX = 0, tkLast = 0, tkHold = false, tkHover = false, tkW = 0;
    function measure() { var r = $(".tk-run"); tkW = r ? r.getBoundingClientRect().width : 0; }
    function frame(t) {
      var dt = tkLast ? Math.min(0.1, (t - tkLast) / 1000) : 0;
      tkLast = t;
      if (!tkW) measure();
      if (tkW && !tkHold && !tkHover && !$("#ticker").classList.contains("paused") && !document.hidden) {
        tkX -= 48 * dt;
        if (tkX <= -tkW) tkX += tkW;
        track.style.transform = "translate3d(" + tkX.toFixed(2) + "px,0,0)";
      }
      requestAnimationFrame(frame);
    }
    measure();
    setInterval(function () {
      var r = tickerRun();
      if (!r) { $("#ticker").hidden = true; document.body.classList.remove("has-ticker"); return; }
      if (r === lastRun) return;
      lastRun = r;
      $("#tkTrack").innerHTML = '<div class="tk-run">' + r + '</div><div class="tk-run" aria-hidden="true">' + r + "</div>";
      tkX = 0; measure();
    }, 60000);
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    if (matchMedia("(hover: hover)").matches) {
      $("#ticker").addEventListener("mouseenter", function () { tkHover = true; });
      $("#ticker").addEventListener("mouseleave", function () { tkHover = false; });
    }
    $("#tkTrack").addEventListener("pointerdown", function () { tkHold = true; });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) { $("#tkTrack").addEventListener(ev, function () { tkHold = false; }); });
    requestAnimationFrame(frame);
    var info = $("#liveInfo"), btn = $("#tkLive");
    if (!LIVE_OK) $("#liveInfoText").innerHTML = "<strong>Datos de demostración.</strong> Los resultados de esta página no son oficiales.";
    function setInfo(open) { info.hidden = !open; btn.setAttribute("aria-expanded", String(open)); }
    btn.addEventListener("click", function () { setInfo(info.hidden); });
    $("#liveInfoClose").addEventListener("click", function () { setInfo(false); });
    $("#liveInfoSrc").addEventListener("click", function () { setInfo(false); show("src"); window.scrollTo(0, 0); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setInfo(false); });
    $("#tkPause").addEventListener("click", function () {
      var on = !$("#ticker").classList.contains("paused");
      $("#ticker").classList.toggle("paused", on);
      this.setAttribute("aria-pressed", String(on)); this.textContent = on ? "\u25B6" : "II"; this.title = on ? "Reanudar" : "Pausar";
    });
  }

  /* ---------- Historia, glosario y fuentes ---------- */
  var CT = window.LIGA1_CONTENT || { facts: [], timeline: [], curious: [], glossary: [], sources: {} };
  function srcLink(x) { return '<a class="src-link" href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer">Fuente: ' + esc(x.src) + "</a>"; }
  function renderHist() {
    $("#histBox").innerHTML =
      '<div class="fact-grid">' + CT.facts.map(function (f) {
        return '<article class="fact"><div class="fact-big">' + esc(f.big) + '</div><div class="fact-label">' + esc(f.label) + "</div><p>" + esc(f.text) + "</p>" + srcLink(f) + "</article>";
      }).join("") + "</div>" +
      '<h3 class="mt">Línea de tiempo</h3><ol class="tl">' + CT.timeline.map(function (t) {
        return '<li><span class="tl-year">' + esc(t.year) + '</span><div class="tl-body"><h4>' + esc(t.title) + "</h4><p>" + esc(t.text) + "</p>" + srcLink(t) + "</div></li>";
      }).join("") + "</ol>" +
      '<h3 class="mt">Para el hincha</h3><div class="cur-grid">' + CT.curious.map(function (c) {
        return '<article class="cur"><h4>' + esc(c.title) + "</h4><p>" + esc(c.text) + "</p>" + srcLink(c) + "</article>";
      }).join("") + "</div>" +
      '<p class="note">Los datos históricos se tomaron de las fuentes indicadas. Los conteos de títulos cambian según el medio y el año, por eso se cita de dónde sale cada cifra.</p>';
  }
  var gloGroup = "Todos";
  function renderGlos() {
    var groups = ["Todos"].concat(CT.glossary.reduce(function (acc, x) { if (acc.indexOf(x.g) < 0) acc.push(x.g); return acc; }, []));
    $("#gloChips").innerHTML = groups.map(function (g) { return '<button type="button" class="chip" data-g="' + esc(g) + '" aria-pressed="' + (g === gloGroup) + '">' + esc(g) + "</button>"; }).join("");
    $$("#gloChips .chip").forEach(function (b) { b.addEventListener("click", function () { gloGroup = b.dataset.g; renderGlos(); }); });
    var q = fold($("#gloSearch").value || "");
    var list = CT.glossary.filter(function (x) { return (gloGroup === "Todos" || x.g === gloGroup) && (!q || fold(x.t + " " + x.d).indexOf(q) >= 0); });
    var last = "";
    $("#gloList").innerHTML = list.map(function (x) {
      var head = x.g !== last && gloGroup === "Todos" ? '<h3 class="gl-group">' + esc(x.g) + "</h3>" : "";
      last = x.g;
      return head + '<div class="gl-item"><dt>' + esc(x.t) + "</dt><dd>" + esc(x.d) + "</dd></div>";
    }).join("");
    $("#gloEmpty").hidden = list.length > 0;
  }
  function fold(t) { return String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function srcList(items) {
    return '<ul class="src-list">' + items.map(function (s) {
      return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(s.name) + "</a><span>" + esc(s.use) + "</span></li>";
    }).join("") + "</ul>";
  }
  function renderSources() {
    var S2 = CT.sources || {};
    var h = '<h3 class="mt first">Datos que la página lee cada día</h3>' + srcList(S2.daily || []);
    if (LIVE_OK && live.sources) {
      h += '<div class="table-card src-status"><div class="scroll"><table class="std compact"><thead><tr><th class="club">Lectura de hoy</th><th>Estado</th><th class="club">Detalle</th></tr></thead><tbody>' +
        live.sources.map(function (s) {
          return '<tr><td class="club">' + esc(s.name) + '</td><td><span class="tag ' + (s.ok ? "played" : "open") + '">' + (s.ok ? "Correcto" : "Falló") + '</span></td><td class="club">' + esc(s.detail) + "</td></tr>";
        }).join("") + "</tbody></table></div></div>" +
        '<p class="note">Última actualización: ' + esc(fmtStamp(live.updated_at)) + " (hora de Lima). Si una fuente falla, la página conserva el último dato válido.</p>";
    } else {
      h += '<p class="note">Esta vista usa datos de demostración. Con los datos reales aquí aparece el estado de cada lectura.</p>';
    }
    h += '<h3 class="mt">Cómo se actualiza</h3><ol class="how"><li>Cada día, hacia las 8:00 a. m. (hora de Lima), un proceso automático de GitHub Actions lee las fuentes de arriba.</li>' +
      "<li>Los puntos se calculan sumando los marcadores de los 306 partidos y se comparan con las tablas oficiales de Liga1.pe, con FutbolPeruano y con Depor.</li>" +
      "<li>El Acumulado oficial manda: Apertura más Clausura más los descuentos por sanción siempre da el Acumulado. Si una tabla de torneo está desactualizada, se usa la suma de los marcadores y se informa en el aviso de datos.</li>" +
      "<li>Si una fuente no responde, se mantiene el último dato válido y la falla queda registrada en la tabla de estado.</li></ol>" +
      '<h3 class="mt">Fuentes de verificación</h3>' + srcList(S2.verification || []) +
      '<h3 class="mt">Fuentes del contenido histórico</h3>' + srcList(S2.content || []) +
      '<h3 class="mt">Recursos</h3>' + srcList(S2.resources || []) +
      '<p class="note">Esta página es un proyecto del Taller de Estadística Aplicada. No tiene afiliación con la liga ni con los clubes. Escudos, nombres y marcas pertenecen a sus propietarios.</p>';
    $("#srcBox").innerHTML = h;
  }


  /* ---------- Apertura vs Clausura ---------- */
  var cmpSort = "acum", cmpMode = "eq", cmpN = 0;
  /* ultima fecha del Clausura con algun resultado (oficial o pronosticado) */
  function lastPlayedC() {
    var n = 0;
    D.fixtures.forEach(function (f) { if (f.t === "C" && f.f > n && eff(f)) n = f.f; });
    return n || NF;
  }
  /* fila de un equipo con sus primeros k partidos de un torneo */
  function teamWindow(tor, id, k) {
    var r = blank(id);
    D.fixtures.forEach(function (f) {
      if (f.t !== tor || f.f > k || (f.h !== id && f.a !== id)) return;
      var e = eff(f);
      if (!e) return;
      var mine = f.h === id ? e.h : e.a, his = f.h === id ? e.a : e.h;
      r.pj++; r.gf += mine; r.gc += his;
      if (mine > his) { r.pg++; r.pts += 3; } else if (mine === his) { r.pe++; r.pts++; } else r.pp++;
    });
    r.dg = r.gf - r.gc;
    return applyAdj([r], [tor])[0];
  }
  /* n = 0: cada equipo con tantos partidos del Apertura como lleva en el Clausura; n > 0: primeras n fechas de ambos */
  function windowSrc(n) {
    var A, C;
    if (n) {
      A = TEAMS.map(function (t) { return teamWindow("A", t.id, n); });
      C = TEAMS.map(function (t) { return teamWindow("C", t.id, n); });
    } else {
      C = TEAMS.map(function (t) { return teamWindow("C", t.id, NF); });
      var kc = {};
      C.forEach(function (r) { kc[r.id] = r.pj; });
      A = TEAMS.map(function (t) { return teamWindow("A", t.id, kc[t.id]); });
    }
    A = sorted(A); C = sorted(C);
    var pa = {}, pc = {};
    A.forEach(function (r, i) { pa[r.id] = i + 1; });
    C.forEach(function (r, i) { pc[r.id] = i + 1; });
    return { A: A, C: C, posA: pa, posC: pc };
  }
  function perfOf(id, src) {
    var a = src.A.filter(function (r) { return r.id === id; })[0], c = src.C.filter(function (r) { return r.id === id; })[0];
    function one(r, pos) { var pct = r.pj ? r.pts / (r.pj * 3) * 100 : 0; return { pts: r.pts, pj: r.pj, pos: pos[id], pct: pct }; }
    var A = one(a, src.posA), C = one(c, src.posC);
    return { id: id, a: A, c: C, d: C.pct - A.pct, tpos: S.pos.T[id] };
  }
  function trendOf(d) { return d >= 3 ? ["up", "Mejoró"] : d <= -3 ? ["down", "Empeoró"] : ["eq", "Similar"]; }
  function renderCmp() {
    var box = $("#cmpBox");
    if (!box) return;
    var maxN = lastPlayedC();
    if (cmpN > maxN) cmpN = 0;
    var eq = cmpMode === "eq";
    var src = eq ? windowSrc(cmpN) : { A: S.A, C: S.C, posA: S.pos.A, posC: S.pos.C };
    var rows = TEAMS.map(function (t) { return perfOf(t.id, src); });
    var all = rows.slice().sort(function (x, y) { return y.d - x.d; });
    rows.sort(function (x, y) {
      if (cmpSort === "up") return y.d - x.d;
      if (cmpSort === "down") return x.d - y.d;
      return x.tpos - y.tpos;
    });
    var best = all[0], worst = all[all.length - 1], me = perfOf(FOCUS, src);
    function fmt(d) { return (d > 0 ? "+" : d < 0 ? "\u2212" : "") + Math.abs(d).toFixed(1).replace(".0", "") + " pp"; }
    var sum = '<div class="cmp-sum">' +
      '<div class="fx"><small>Más mejoró</small><b>' + teamCell(BY[best.id]) + "</b><span class=\"cmp-v up\">" + fmt(best.d) + "</span></div>" +
      '<div class="fx"><small>Más cayó</small><b>' + teamCell(BY[worst.id]) + "</b><span class=\"cmp-v down\">" + fmt(worst.d) + "</span></div>" +
      '<div class="fx"><small>La U</small><b>' + teamCell(BY[FOCUS]) + "</b><span class=\"cmp-v " + trendOf(me.d)[0] + '">' + fmt(me.d) + "</span></div></div>";
    var modes = [["eq", "Mismas fechas"], ["full", "Torneo completo"]];
    var scope = '<div class="seg cmp-mode" role="group" aria-label="Alcance de la comparación">' + modes.map(function (m) {
      return '<button type="button" data-m="' + m[0] + '" aria-pressed="' + (cmpMode === m[0]) + '">' + m[1] + "</button>";
    }).join("") + "</div>";
    var opts = '<option value="0"' + (cmpN === 0 ? " selected" : "") + ">Mismos partidos jugados (automático)</option>";
    for (var n = maxN; n >= 1; n--) opts += '<option value="' + n + '"' + (n === cmpN ? " selected" : "") + ">Primeras " + n + " fechas</option>";
    var sel = eq ? '<label class="sel cmp-n"><span class="sr-only">Hasta qué fecha comparar</span><select id="cmpN">' + opts + "</select></label>" : "";
    var sorts = [["acum", "Por acumulado"], ["up", "Mejoraron más"], ["down", "Cayeron más"]];
    var ctrl = '<div class="seg cmp-sort" role="group" aria-label="Ordenar">' + sorts.map(function (s) {
      return '<button type="button" data-s="' + s[0] + '" aria-pressed="' + (cmpSort === s[0]) + '">' + s[1] + "</button>";
    }).join("") + "</div>";
    var list = rows.map(function (r) {
      var tr = trendOf(r.d), z = zoneClass(r.tpos - 1, TEAMS.length).replace(" z-", " rz-");
      function side(k, lab, o) {
        return '<div class="cmp-t ' + k + '"><small>' + lab + '</small><div class="cmp-bar" role="img" aria-label="' + lab + " " + Math.round(o.pct) + ' por ciento de los puntos posibles"><i style="width:' + Math.max(2, o.pct) + '%"></i></div>' +
          "<span><b>" + o.pts + "</b> pts \u00b7 " + o.pos + "\u00ba \u00b7 " + Math.round(o.pct) + "% \u00b7 " + o.pj + " PJ</span></div>";
      }
      return '<li class="cmp-row' + (r.id === FOCUS ? " me" : "") + z + '"><div class="cmp-id"><span class="n">' + r.tpos + "</span>" + teamCell(BY[r.id]) + "</div>" +
        side("a", "Apertura", r.a) + side("c", "Clausura", r.c) +
        '<div class="cmp-var ' + tr[0] + '"><b>' + (tr[0] === "up" ? "\u25b2 " : tr[0] === "down" ? "\u25bc " : "= ") + fmt(r.d) + "</b><small>" + tr[1] + "</small></div></li>";
    }).join("");
    var pjC = Math.max.apply(null, src.C.map(function (r) { return r.pj; })), pjA = Math.max.apply(null, src.A.map(function (r) { return r.pj; }));
    var why = eq
      ? (cmpN
        ? "Comparación en igualdad de partidos: se usan solo las primeras " + cmpN + " fechas de cada torneo."
        : "Comparación en igualdad de partidos: de cada equipo se toman en el Apertura tantos partidos como lleva jugados en el Clausura (en orden de fecha).")
      : "Torneo completo: el Apertura tuvo " + pjA + " partidos por equipo y el Clausura lleva " + pjC + ", por eso se compara el porcentaje de rendimiento.";
    box.innerHTML = sum + '<div class="cmp-tools">' + scope + sel + "</div>" +
      '<div class="cmp-tools">' + ctrl + '<div class="legend cmp-key"><span><i class="lk-a"></i>Apertura</span><span><i class="lk-c"></i>Clausura</span></div></div>' +
      '<ul class="cmp-list">' + list + "</ul>" +
      '<p class="note">' + why + " Rendimiento = puntos ganados sobre los puntos posibles (3 por partido jugado). Variación en puntos porcentuales (pp): mejora si pasa de +3 pp, empeora si baja de \u22123 pp. La posición del extremo izquierdo es la del acumulado. Los descuentos por sanción se incluyen desde la fecha 1.</p>";
    $$("#cmpBox .cmp-sort button").forEach(function (b) { b.addEventListener("click", function () { cmpSort = b.dataset.s; renderCmp(); }); });
    $$("#cmpBox .cmp-mode button").forEach(function (b) { b.addEventListener("click", function () { cmpMode = b.dataset.m; renderCmp(); }); });
    var cn = $("#cmpN");
    if (cn) cn.addEventListener("change", function () { cmpN = +cn.value; renderCmp(); });
    $$(".zone-legend").forEach(function (el) { el.innerHTML = legendHtml(); });
  }

  /* ---------- orquestación ---------- */
  var view = "acum", proStale = true;
  function renderAll(fromCalc) {
    recompute();
    renderStd($("#tbl-acum"), "T");
    renderStd($("#tbl-A"), "A");
    renderStd($("#tbl-C"), "C");
    renderMini();
    renderHero();
    renderCalcSum();
    proStale = true;
    if (view === "evo") { renderMatrix(); renderChart(); }
    if (view === "cmp") renderCmp();
    if (view === "pro") { renderPro(); proStale = false; }
    if (fromCalc) return;
  }
  function show(v) {
    view = v;
    $$(".tabs button").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.view === v)); });
    $$(".view").forEach(function (s) { s.hidden = s.id !== "v-" + v; });
    if (v === "evo") { initChips(); renderMatrix(); renderChart(); }
    if (v === "cmp") renderCmp();
    if (v === "pro" && proStale) { renderPro(); proStale = false; }
    if (location.hash !== "#" + v) history.replaceState(null, "", "#" + v);
    document.body.setAttribute("data-view", v);
    if (NAVGROUP[v] === "tabla") lastTabla = v;
    updateNav(v);
    L1.emit("view", v);
  }

  var listeners = {};
  var L1 = window.__L1 = {
    D: D, BY: BY, TEAMS: TEAMS, FOCUS: FOCUS, LIVE_OK: LIVE_OK, esc: esc, fkey: fkey, badge: badge, fmtDay: fmtDay, fmtWhen: fmtWhen,
    getPreds: function () { return preds; }, getS: function () { return S; }, view: function () { return view; }, show: function (v) { show(v); },
    crest: function (id) { return (window.CRESTS && window.CRESTS[id]) || "escudos/" + id + ".png"; },
    on: function (e, fn) { (listeners[e] = listeners[e] || []).push(fn); },
    emit: function (e, d) { (listeners[e] || []).forEach(function (fn) { try { fn(d); } catch (err) { /* el juego no debe romper la página */ } }); }
  };

  /* ---------- navegación para celular ---------- */
  var NAVGROUP = { acum: "tabla", A: "tabla", C: "tabla", cmp: "tabla", calc: "calc", game: "game", uni: "uni", evo: "more", pro: "more", hist: "more", glos: "more", src: "more" };
  var lastTabla = "acum";
  function svg(d, fill) { return '<svg viewBox="0 0 24 24" aria-hidden="true" class="ni"' + (fill ? ' fill="currentColor"' : ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"') + '><path d="' + d + '"/></svg>'; }
  function updateNav(v) {
    var g = NAVGROUP[v];
    $$("#bnav button").forEach(function (b) { b.setAttribute("aria-current", String(b.dataset.go === g)); });
    $$(".seg-tabla button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.view === v)); });
  }
  function closeSheet() { $("#moreSheet").hidden = true; }
  function renderNav() {
    var items = [
      ["tabla", "Tabla", svg("M3 4h18v16H3zM3 9h18M3 14h18M9 4v16")],
      ["calc", "Calcular", svg("M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM8 8h8M8 13h2M14 13h2M8 17h2M14 17h2")],
      ["game", "Juego", svg("M8 4h8v5a4 4 0 01-8 0zM5 5h3M16 5h3M12 13v4M8 20h8M9 17h6")]
    ];
    if (UNI) items.push(["uni", "La U", '<svg viewBox="0 0 24 24" aria-hidden="true" class="ni"><use href="#paw"/></svg>']);
    items.push(["more", "Más", svg("M4 7h16M4 12h16M4 17h16")]);
    $("#bnav").innerHTML = items.map(function (it) { return '<button type="button" data-go="' + it[0] + '">' + it[2] + "<span>" + it[1] + "</span></button>"; }).join("");
    $$("#bnav button").forEach(function (b) {
      b.addEventListener("click", function () {
        var g = b.dataset.go;
        if (g === "more") { $("#moreSheet").hidden = false; return; }
        show(g === "tabla" ? lastTabla : g); window.scrollTo(0, 0);
      });
    });
    var more = [["evo", "Evolución de puntos"], ["pro", "Pronósticos"], ["hist", "Historia del club"], ["glos", "Glosario"], ["src", "Fuentes"]];
    $("#moreList").innerHTML = more.map(function (m) { return '<button type="button" data-v="' + m[0] + '">' + m[1] + "</button>"; }).join("") + '<button type="button" id="moreTheme">Cambiar tema claro u oscuro</button>';
    $$("#moreList button[data-v]").forEach(function (b) { b.addEventListener("click", function () { closeSheet(); show(b.dataset.v); window.scrollTo(0, 0); }); });
    $("#moreTheme").addEventListener("click", function () { $("#themeBtn").click(); });
    $("#moreClose").addEventListener("click", closeSheet);
    $("#moreSheet").addEventListener("click", function (e) { if (e.target === this) closeSheet(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });
    ["acum", "A", "C", "cmp"].forEach(function (id) {
      $("#v-" + id).insertAdjacentHTML("afterbegin", '<div class="seg-tabla" role="group" aria-label="Elegir tabla"><button type="button" data-view="acum">Acumulado</button><button type="button" data-view="A">Apertura</button><button type="button" data-view="C">Clausura</button><button type="button" data-view="cmp">Comparar</button></div>');
    });
    $$(".seg-tabla button").forEach(function (b) { b.addEventListener("click", function () { show(b.dataset.view); }); });
  }

  function init() {
    if (D.demo) $("#demoBanner").hidden = false;
    else {
      var notes = [], NAMES = { A: "en el Apertura", C: "en el Clausura", T: "solo en el Acumulado" };
      ["A", "C", "T"].forEach(function (tor) {
        var items = Object.keys(ADJ[tor] || {}).map(function (id) { return BY[id].short + " " + (ADJ[tor][id] > 0 ? "+" : "\u2212") + Math.abs(ADJ[tor][id]); });
        if (items.length) notes.push(NAMES[tor] + ": " + items.join(", "));
      });
      var stale = (live.notes && live.notes.apertura_liga1pe) || {}, sk = Object.keys(stale);
      $("#liveInfoText").innerHTML = "<strong>Datos reales.</strong> Actualizado el " + fmtStamp(live.updated_at) + " (hora de Lima) y renovado todos los días hacia las 8:00 a. m. " +
        "Tablas: Liga1.pe, FutbolPeruano y Depor. Noticias y calendario de la U: universitario.pe." +
        (notes.length ? " Descuentos de puntos por sanción (" + notes.join("; ") + ")." : "") +
        (sk.length ? " La tabla de Apertura de Liga1.pe aún muestra " + sk.map(function (k) { return BY[k].short + " " + stale[k][0]; }).join(" y ") + "; la página usa " +
          sk.map(function (k) { return stale[k][1]; }).join(" y ") + ", que es lo que suman los marcadores y lo que cuadra con el Acumulado oficial." : "");

    }
    renderUni();
    renderNav();
    renderTicker();
    renderHist(); renderGlos(); renderSources();
    $("#gloSearch").addEventListener("input", renderGlos);
    cur = defaultFecha();
    recompute();
    renderLegend();
    fillFechaSel();
    renderFixtures();
    $$(".seg button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.t === cur.t)); });
    renderAll();

    $$(".tabs button").forEach(function (b) {
      b.addEventListener("click", function () { show(b.dataset.view); });
      b.addEventListener("keydown", function (e) {
        var k = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!k) return;
        var all = $$(".tabs button:not([hidden])"), i = all.indexOf(b);
        var n = all[(i + k + all.length) % all.length]; n.focus(); show(n.dataset.view);
      });
    });
    $$(".seg button").forEach(function (b) {
      b.addEventListener("click", function () {
        cur.t = b.dataset.t;
        $$(".seg button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        fillFechaSel(); renderFixtures();
      });
    });
    $("#fechaSel").addEventListener("change", function (e) { cur.f = +e.target.value; renderFixtures(); });
    $("#btnRandFecha").addEventListener("click", function () {
      randomize(D.fixtures.filter(function (x) { return x.t === cur.t && x.f === cur.f; }));
      fillFechaSel();
    });
    $("#btnRandAll").addEventListener("click", function () { randomize(D.fixtures); fillFechaSel(); });
    $("#btnClear").addEventListener("click", clearPreds);
    $$(".cols-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var on = b.getAttribute("aria-pressed") !== "true";
        b.setAttribute("aria-pressed", String(on));
        b.textContent = on ? "Ver menos columnas" : "Ver todas las columnas";
        b.nextElementSibling.classList.toggle("show-all", on);
      });
    });
    document.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-go=cmp]");
      if (b && b.classList.contains("kpi-cmp")) { show("cmp"); window.scrollTo(0, 0); }
    });
    $$(".go-cmp").forEach(function (b) { b.addEventListener("click", function () { show("cmp"); window.scrollTo(0, 0); }); });
    $("#btnSim").addEventListener("click", function () { renderPro(); proStale = false; });

    var themeBtn = $("#themeBtn");
    var saved = lsGet(THEME);
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    themeBtn.addEventListener("click", function () {
      var attr = document.documentElement.getAttribute("data-theme");
      var dark = attr ? attr === "dark" : !matchMedia("(prefers-color-scheme: light)").matches;
      var next = dark ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next); lsSet(THEME, next);
      if (view === "evo") renderChart();
    });

    initTooltips();
    var h = location.hash.replace("#", "");
    if (["acum", "A", "C", "cmp", "calc", "game", "evo", "pro", "uni", "hist", "glos", "src"].indexOf(h) >= 0 && (h !== "uni" || UNI)) show(h);
    updateNav(view);
    if (window.LIGA1_STATS_INIT) window.LIGA1_STATS_INIT(L1);
    if (window.LIGA1_GAME_INIT) window.LIGA1_GAME_INIT(L1);
  }

  init();
  }

  function start() {
    if (window.LIVE) return boot(window.LIVE);
    if (!window.fetch) return boot(null);
    fetch("data/live.json?v=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (j) { boot(j); });
  }
  start();
})();
