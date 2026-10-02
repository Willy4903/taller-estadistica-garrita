/* Fondo del observatorio: campo de circuitos con flujos de partículas de datos. Solo decoración. */
(function () {
  "use strict";
  const c = document.createElement("canvas");
  c.id = "bgfx"; c.setAttribute("aria-hidden", "true");
  document.body.prepend(c);
  const ctx = c.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W = 0, H = 0, dpr = 1, paths = [], bg = null, last = 0, running = false;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const col = (v, d) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || d;
  const G = 56;

  function build() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); c.style.width = W + "px"; c.style.height = H + "px";
    const n = Math.max(14, Math.round((W * H) / 42000));
    paths = [];
    for (let i = 0; i < n; i++) {
      let x = Math.round(rnd(0, W / G)) * G, y = Math.round(rnd(0, H / G)) * G, horiz = Math.random() < 0.5;
      const pts = [[x, y]];
      const segs = 4 + Math.floor(Math.random() * 7);
      for (let s = 0; s < segs; s++) {
        const len = (1 + Math.floor(Math.random() * 5)) * G * (Math.random() < 0.5 ? -1 : 1);
        if (horiz) x += len; else y += len;
        pts.push([x, y]);
        if (Math.random() < 0.18) { const d = G * (1 + Math.floor(Math.random() * 2)); x += d; y += (Math.random() < 0.5 ? d : -d); pts.push([x, y]); }
        horiz = !horiz;
      }
      const cum = [0];
      for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
      paths.push({ pts, cum, total: cum[cum.length - 1], parts: Array.from({ length: 1 + Math.floor(Math.random() * 2) }, () => ({ t: Math.random(), v: rnd(36, 90), hue: Math.random() < 0.7 ? 0 : 1 })) });
    }
    drawStatic();
  }

  function drawStatic() {
    bg = document.createElement("canvas"); bg.width = c.width; bg.height = c.height;
    const b = bg.getContext("2d"); b.scale(dpr, dpr);
    const a = col("--fx-a", "#22d3ee");
    b.lineWidth = 1; b.lineJoin = "round";
    paths.forEach((p) => {
      b.strokeStyle = a + "26"; b.beginPath();
      p.pts.forEach((q, i) => (i ? b.lineTo(q[0], q[1]) : b.moveTo(q[0], q[1]))); b.stroke();
      b.fillStyle = a + "55";
      [p.pts[0], p.pts[p.pts.length - 1]].forEach((q) => { b.beginPath(); b.arc(q[0], q[1], 3, 0, 7); b.fill(); b.strokeStyle = a + "66"; b.beginPath(); b.arc(q[0], q[1], 6, 0, 7); b.stroke(); });
    });
  }

  function at(p, d) {
    let k = 1; while (k < p.cum.length - 1 && p.cum[k] < d) k++;
    const f = (d - p.cum[k - 1]) / (p.cum[k] - p.cum[k - 1] || 1), A = p.pts[k - 1], B = p.pts[k];
    return [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f];
  }

  function frame(t) {
    if (!running) return;
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
    if (!document.hidden) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(bg, 0, 0);
      ctx.scale(dpr, dpr);
      const A = [col("--fx-a", "#22d3ee"), col("--fx-b", "#34d399")];
      ctx.globalCompositeOperation = "lighter";
      paths.forEach((p) => p.parts.forEach((q) => {
        q.t += (q.v * dt) / p.total; if (q.t > 1) q.t -= 1;
        const d = q.t * p.total, head = at(p, d), tail = at(p, Math.max(0, d - 46));
        const g = ctx.createLinearGradient(tail[0], tail[1], head[0], head[1]);
        g.addColorStop(0, A[q.hue] + "00"); g.addColorStop(1, A[q.hue] + "dd");
        ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tail[0], tail[1]); ctx.lineTo(head[0], head[1]); ctx.stroke();
        ctx.fillStyle = A[q.hue]; ctx.shadowColor = A[q.hue]; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(head[0], head[1], 2.2, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      }));
      ctx.globalCompositeOperation = "source-over";
    }
    requestAnimationFrame(frame);
  }

  function start() {
    build();
    if (reduce) { ctx.drawImage(bg, 0, 0); return; }
    if (!running) { running = true; requestAnimationFrame(frame); }
  }
  let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { build(); if (reduce) ctx.drawImage(bg, 0, 0); }, 200); });
  document.addEventListener("iar:theme", () => { drawStatic(); if (reduce) ctx.drawImage(bg, 0, 0); });
  start();
})();
