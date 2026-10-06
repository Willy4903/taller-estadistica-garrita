/* Esfera neuronal holográfica de la portada: nodos y conexiones que giran. Solo decoración. */
(function () {
  "use strict";
  const cv = document.getElementById("sphere");
  if (!cv) return;
  const ctx = cv.getContext("2d"), reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const N = 150, pts = [], rnd = (a, b) => a + Math.random() * (b - a);
  const gold = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = gold * i; pts.push({ x: Math.cos(t) * r, y, z: Math.sin(t) * r, ph: rnd(0, 6.28), sz: rnd(1.2, 2.6) }); }
  let W = 0, H = 0, dpr = 1, ang = 0, last = 0, run = false, vis = true;
  function size() { dpr = Math.min(devicePixelRatio || 1, 2); const b = cv.getBoundingClientRect(); W = b.width; H = b.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const mix = (a, b, t) => `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
  const CY = [37, 217, 245], MG = [236, 96, 255];
  function frame(t) {
    if (!run) return;
    requestAnimationFrame(frame);
    if (!vis || document.hidden) return;
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t; ang += dt * 0.22;
    draw(t / 1000);
  }
  function draw(time) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const R = Math.min(W, H) * 0.42, cx = W / 2, cy = H / 2, ca = Math.cos(ang), sa = Math.sin(ang), tilt = 0.35, ct = Math.cos(tilt), st = Math.sin(tilt);
    const P = pts.map((p) => { const x = p.x * ca + p.z * sa, z0 = -p.x * sa + p.z * ca, y = p.y * ct - z0 * st, z = p.y * st + z0 * ct, k = 1 / (1.9 - z * 0.55); return { x: cx + x * R * k * 1.35, y: cy + y * R * k * 1.35, z, k, ph: p.ph, sz: p.sz }; });
    // halo
    const g = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.15); g.addColorStop(0, "rgba(236,96,255,.16)"); g.addColorStop(.55, "rgba(37,217,245,.08)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter"; ctx.lineWidth = 1;
    const TH = R * 0.36;
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const a = P[i], b = P[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
      if (d < TH) { const al = (1 - d / TH) * 0.5 * (0.35 + 0.65 * ((a.z + b.z) / 2 + 1) / 2); ctx.strokeStyle = mix(CY, MG, (a.x - cx) / (R * 1.4) / 2 + 0.5).replace("rgb", "rgba").replace(")", `,${al.toFixed(3)})`); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    }
    P.forEach((p) => { const pulse = 0.65 + 0.35 * Math.sin(time * 1.6 + p.ph), al = (0.35 + 0.65 * (p.z + 1) / 2) * pulse, c = mix(CY, MG, (p.x - cx) / (R * 1.4) / 2 + 0.5); ctx.fillStyle = c.replace("rgb", "rgba").replace(")", `,${al.toFixed(3)})`); ctx.shadowColor = c; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * p.k * 1.5, 0, 7); ctx.fill(); });
    ctx.shadowBlur = 0; ctx.globalCompositeOperation = "source-over";
  }
  size(); addEventListener("resize", () => { size(); if (reduce) draw(0); });
  if (reduce) { draw(0); return; }
  if ("IntersectionObserver" in window) new IntersectionObserver((es) => { vis = es[0].isIntersecting; }).observe(cv);
  run = true; requestAnimationFrame(frame);
})();
