/* ==========================================================================
   Center Court rally — a tiny top-down tennis game on <canvas id="rally">.
   Move with mouse / touch / ← →. Click, tap or Space to serve.
   ========================================================================== */
(() => {
  const cv = document.getElementById("rally");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const rallyEl = document.getElementById("rally-count");
  const bestEl = document.getElementById("rally-best");
  const MP = window.MP || { sfx() {}, toast() {}, unlock() {}, state: { best: 0 }, save() {} };

  let W = 0, H = 0, dpr = 1;
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  let colors = {};
  const readColors = () => { colors = { court: css("--court"), court2: css("--court-2"), grass: css("--grass"), ball: css("--ball") }; };

  const P = { x: 0, w: 0, h: 12, target: 0 };   // player (bottom)
  const C = { x: 0, w: 0, h: 12 };              // cpu (top)
  const B = { x: 0, y: 0, vx: 0, vy: 0, r: 7, trail: [] };
  let mode = "ready"; // ready | play | over
  let rally = 0, message = "TAP TO SERVE", sub = "First to keep it going wins";
  let keys = { left: false, right: false };
  let visible = true, raf = 0, last = 0;

  const margin = () => ({ x: W * 0.09, y: H * 0.06 });

  function resize() {
    const r = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    P.w = C.w = Math.max(56, W * 0.2);
    if (mode !== "play") resetPositions();
    readColors();
    draw();
  }

  function resetPositions() {
    P.x = P.target = W / 2; C.x = W / 2;
    B.x = W / 2; B.y = H - margin().y - 34; B.vx = 0; B.vy = 0; B.trail = [];
  }

  function serve() {
    resetPositions();
    rally = 0; updateHud();
    const speed = H * 0.0095;
    B.vx = (Math.random() - 0.5) * speed * 0.8;
    B.vy = -speed;
    mode = "play";
    MP.sfx("pock");
  }

  function updateHud() {
    rallyEl.textContent = rally;
    bestEl.textContent = MP.state.best || 0;
  }

  function endPoint(playerWon) {
    mode = "over";
    if (rally > (MP.state.best || 0)) { MP.state.best = rally; MP.save(); }
    updateHud();
    if (playerWon) { message = "WINNER!"; sub = `Clean past the CPU · rally ${rally}`; MP.sfx("win"); }
    else { message = "OUT!"; sub = `Rally of ${rally} · tap to serve again`; MP.sfx("out"); }
    if (rally >= 10) MP.unlock("rally");
    MP.renderStats && MP.renderStats();
  }

  function step(dt) {
    const m = margin();
    // player movement
    if (keys.left) P.target -= 9 * dt;
    if (keys.right) P.target += 9 * dt;
    P.target = Math.max(P.w / 2, Math.min(W - P.w / 2, P.target));
    P.x += (P.target - P.x) * Math.min(1, 0.35 * dt);

    if (mode !== "play") return;

    // cpu: tracks the ball when it's coming, drifts to centre otherwise
    const cpuSpeed = (3.4 + rally * 0.12) * dt;
    const goal = B.vy < 0 ? B.x + Math.sin(performance.now() / 300) * C.w * 0.18 : W / 2;
    C.x += Math.max(-cpuSpeed, Math.min(cpuSpeed, goal - C.x));
    C.x = Math.max(C.w / 2, Math.min(W - C.w / 2, C.x));

    B.trail.push({ x: B.x, y: B.y }); if (B.trail.length > 8) B.trail.shift();
    B.x += B.vx * dt; B.y += B.vy * dt;

    // side walls (keeps rallies alive; it's arcade tennis)
    if (B.x < B.r + 4) { B.x = B.r + 4; B.vx = Math.abs(B.vx); }
    if (B.x > W - B.r - 4) { B.x = W - B.r - 4; B.vx = -Math.abs(B.vx); }

    const py = H - m.y - 14, cy = m.y + 14;
    // player hit
    if (B.vy > 0 && B.y + B.r >= py && B.y + B.r <= py + P.h + Math.abs(B.vy) && Math.abs(B.x - P.x) <= P.w / 2 + B.r) {
      const off = (B.x - P.x) / (P.w / 2);
      const sp = Math.min(Math.abs(B.vy) * 1.045, H * 0.024);
      B.vy = -sp; B.vx = off * sp * 0.9;
      B.y = py - B.r;
      rally++; updateHud(); MP.sfx("pock");
      if (rally === 10) MP.unlock("rally");
    }
    // cpu hit
    if (B.vy < 0 && B.y - B.r <= cy + C.h && B.y - B.r >= cy - Math.abs(B.vy) && Math.abs(B.x - C.x) <= C.w / 2 + B.r) {
      const off = (B.x - C.x) / (C.w / 2);
      B.vy = Math.abs(B.vy);
      B.vx = off * B.vy * 0.75 + (Math.random() - 0.5) * 2;
      B.y = cy + C.h + B.r;
      MP.sfx("pock");
    }
    if (B.y > H + 20) endPoint(false);
    if (B.y < -20) endPoint(true);
  }

  function racket(x, y, w, h, color, flip) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    roundRect(x - w / 2, y, w, h, h / 2); ctx.fill();
    ctx.shadowColor = "transparent";
    // strings
    ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1;
    for (let i = x - w / 2 + 8; i < x + w / 2 - 4; i += 7) { ctx.beginPath(); ctx.moveTo(i, y + 2); ctx.lineTo(i, y + h - 2); ctx.stroke(); }
    // handle nub
    ctx.fillStyle = "#1a1a1a";
    roundRect(x - 6, flip ? y - 7 : y + h, 12, 7, 3); ctx.fill();
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw() {
    if (!W) return;
    const m = margin();
    ctx.clearRect(0, 0, W, H);
    // surround
    ctx.fillStyle = colors.grass; ctx.fillRect(0, 0, W, H);
    // court
    ctx.fillStyle = colors.court; ctx.fillRect(m.x, m.y, W - m.x * 2, H - m.y * 2);
    // lines
    ctx.strokeStyle = "rgba(255,255,255,.92)"; ctx.lineWidth = 2;
    const cx = m.x, cy = m.y, cw = W - m.x * 2, ch = H - m.y * 2, alley = cw * 0.12;
    ctx.strokeRect(cx, cy, cw, ch);
    ctx.beginPath();
    ctx.moveTo(cx + alley, cy); ctx.lineTo(cx + alley, cy + ch);
    ctx.moveTo(cx + cw - alley, cy); ctx.lineTo(cx + cw - alley, cy + ch);
    const svc = ch * 0.27;
    ctx.moveTo(cx + alley, cy + svc); ctx.lineTo(cx + cw - alley, cy + svc);
    ctx.moveTo(cx + alley, cy + ch - svc); ctx.lineTo(cx + cw - alley, cy + ch - svc);
    ctx.moveTo(W / 2, cy + svc); ctx.lineTo(W / 2, cy + ch - svc);
    ctx.moveTo(W / 2, cy); ctx.lineTo(W / 2, cy + 8);
    ctx.moveTo(W / 2, cy + ch); ctx.lineTo(W / 2, cy + ch - 8);
    ctx.stroke();
    // net
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(cx - 10, H / 2 - 1, cw + 20, 6);
    ctx.strokeStyle = "rgba(255,255,255,.95)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - 10, H / 2 - 2); ctx.lineTo(cx + cw + 10, H / 2 - 2); ctx.stroke();
    ctx.fillStyle = "#e9edf3"; ctx.fillRect(cx - 14, H / 2 - 6, 5, 9); ctx.fillRect(cx + cw + 9, H / 2 - 6, 5, 9);

    // rackets
    racket(C.x, m.y + 14, C.w, C.h, "#f2f5fa", true);
    racket(P.x, H - m.y - 14, P.w, P.h, colors.ball, false);

    // ball trail + ball
    B.trail.forEach((p, i) => {
      ctx.fillStyle = `rgba(255,255,255,${(i / B.trail.length) * 0.25})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, B.r * (i / B.trail.length), 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = "rgba(0,0,0,.25)";
    ctx.beginPath(); ctx.ellipse(B.x + 4, B.y + 6, B.r, B.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = colors.ball;
    ctx.beginPath(); ctx.arc(B.x, B.y, B.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(B.x - B.r * 1.1, B.y, B.r * 0.95, -0.9, 0.9); ctx.stroke();

    // overlay text
    if (mode !== "play") {
      ctx.fillStyle = "rgba(8,12,22,.55)";
      roundRect(W * 0.12, H * 0.36, W * 0.76, H * 0.2, 14); ctx.fill();
      ctx.fillStyle = mode === "over" && message === "OUT!" ? "#ff7c4f" : colors.ball;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `900 ${Math.round(W * 0.11)}px "Big Shoulders Display", sans-serif`;
      ctx.fillText(message, W / 2, H * 0.44);
      ctx.fillStyle = "rgba(255,255,255,.85)";
      ctx.font = `500 ${Math.max(11, Math.round(W * 0.032))}px "JetBrains Mono", monospace`;
      ctx.fillText(sub, W / 2, H * 0.505);
    }
  }

  function loop(t) {
    const dt = last ? Math.min(3, (t - last) / 16.67) : 1;
    last = t;
    step(dt);
    draw();
    if (visible) raf = requestAnimationFrame(loop);
  }

  // Input
  const setTarget = (clientX) => { const r = cv.getBoundingClientRect(); P.target = clientX - r.left; };
  cv.addEventListener("pointermove", (e) => setTarget(e.clientX));
  cv.addEventListener("pointerdown", (e) => { setTarget(e.clientX); if (mode !== "play") serve(); });
  cv.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { keys.left = true; e.preventDefault(); }
    if (e.key === "ArrowRight") { keys.right = true; e.preventDefault(); }
    if ((e.key === " " || e.key === "Enter") && mode !== "play") { serve(); e.preventDefault(); }
  });
  cv.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft") keys.left = false;
    if (e.key === "ArrowRight") keys.right = false;
  });

  // Pause when off-screen
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible) { last = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }
  }).observe(cv);

  // Re-read colours if theme / surface changes
  new MutationObserver(() => { readColors(); draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-surface"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { readColors(); draw(); });

  new ResizeObserver(resize).observe(cv);
  document.fonts && document.fonts.ready.then(draw);
  updateHud();
})();
