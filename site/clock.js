/* Reloj digital (hora de Lima), fecha del día, antigüedad de los datos y reloj mundial de los centros de la IA. */
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ico = (n, c = "") => `<i class="ui ${c}" style="--i:url(icons/ui/${n}.svg)" aria-hidden="true"></i>`;

  const HUBS = [
    { city: "Lima", tz: "America/Lima", labs: "Tu ubicación", me: true },
    { city: "San Francisco", tz: "America/Los_Angeles", labs: "OpenAI · Anthropic · Google (Mountain View)" },
    { city: "Londres", tz: "Europe/London", labs: "Google DeepMind" },
    { city: "París", tz: "Europe/Paris", labs: "Mistral AI" },
    { city: "China", tz: "Asia/Shanghai", labs: "DeepSeek · Qwen (Alibaba) · Moonshot AI" },
  ];
  const fmtTime = (tz, secs) => new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit", ...(secs ? { second: "2-digit" } : {}), hour12: false, timeZone: tz }).format(new Date());
  const parts = (tz) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", weekday: "short", day: "numeric", month: "numeric", timeZone: tz }).formatToParts(new Date()).map((x) => [x.type, x.value]));
    return { h: +p.hour, wd: p.weekday, day: +p.day };
  };
  const localMs = (tz) => new Date(new Date().toLocaleString("en-US", { timeZone: tz })).getTime();
  const diffH = (tz) => Math.round((localMs(tz) - localMs("America/Lima")) / 36e5);

  function hubInfo(h) {
    const p = parts(h.tz), weekday = !["Sat", "Sun"].includes(p.wd), work = weekday && p.h >= 9 && p.h < 18, night = p.h < 6 || p.h >= 18;
    const d = h.me ? 0 : diffH(h.tz), off = d === 0 ? "misma hora que Lima" : `${d > 0 ? "+" : "−"}${Math.abs(d)} h frente a Lima`;
    const lima = parts("America/Lima"), nextDay = !h.me && p.day !== lima.day ? (p.day > lima.day || (p.day === 1 && lima.day > 27) ? "mañana" : "ayer") : "";
    return { work, night, off, nextDay };
  }

  function renderHubs() {
    const box = $("#hubs");
    if (!box) return;
    const info = HUBS.map(hubInfo);
    const awake = info.filter((x, i) => !HUBS[i].me && x.work).length;
    box.innerHTML = `<div class="hubs-head"><h3>${ico("globe")} Ahora en los centros de la IA</h3>
      <span class="hubs-sum">${awake === 0 ? "Ningún centro está en horario laboral" : awake + (awake === 1 ? " centro está" : " centros están") + " en horario laboral"}</span></div>
      <div class="hubs-grid">${HUBS.map((h, i) => { const x = info[i];
        const tip = [h.city + " · " + fmtTime(h.tz, true), "Laboratorios: " + h.labs, x.off, x.work ? "Ahora es horario laboral (9:00 a 18:00 en días hábiles)" : "Fuera del horario laboral típico (9:00 a 18:00)"].join("\n");
        return `<div class="hub fx${x.work ? " work" : ""}${h.me ? " me" : ""}" data-tip="${esc(tip)}" tabindex="0">
          <span class="hub-top">${ico(x.night ? "moon" : "sun")}<b>${esc(h.city)}</b>${x.nextDay ? `<em>${x.nextDay}</em>` : ""}</span>
          <span class="hub-time">${fmtTime(h.tz, false)}</span>
          <span class="hub-labs">${esc(h.labs)}</span>
          <span class="hub-st">${h.me ? "Tu hora" : x.work ? '<i class="dot"></i>En horario laboral' : "Fuera de horario"}</span></div>`; }).join("")}</div>`;
  }

  function ago(iso) {
    const m = Math.max(0, Math.round((Date.now() - new Date(iso)) / 6e4));
    if (m < 1) return "ahora";
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), r = m % 60;
    if (h < 48) return `${h} h${r ? " " + r + " min" : ""}`;
    return `${Math.floor(h / 24)} días`;
  }

  let lastMin = -1;
  function tick() {
    const t = $("#clock-time");
    if (t) t.textContent = fmtTime("America/Lima", true);
    const now = new Date(), min = now.getMinutes();
    const st = $("#status"), up = st && st.dataset.updated;
    const txt = $("#status-text");
    if (txt) txt.textContent = up ? "Datos de hace " + ago(up) : "Cargando datos…";
    if (st) {
      const when = up ? new Date(up).toLocaleString("es-PE", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" }) : "";
      st.dataset.tip = "Hora de Lima\n" + new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Lima" }).format(now) + (up ? "\nÚltima actualización de los datos: " + when : "");
    }
    if (min !== lastMin) {
      lastMin = min;
      const pill = $("#today-pill");
      if (pill) { const s = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Lima" }).format(now); pill.textContent = s.charAt(0).toUpperCase() + s.slice(1); }
      renderHubs();
    }
  }
  tick();
  setInterval(() => { if (!document.hidden) tick(); }, 1000);
})();
