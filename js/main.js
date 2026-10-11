/* ==========================================================================
   MATCH POINT — shared site script
   Scoring, hidden aces, achievements, theme, walkman synth, sfx.
   ========================================================================== */
(() => {
  const PAGES = ["home", "about", "projects", "skills", "contact"];
  const POINT_CALLS = ["LOVE", "15", "30", "40", "AD", "GAME"];
  const KEY = "matchpoint.v1";

  const ACHIEVEMENTS = [
    { id: "first-serve", name: "First Serve", hint: "Open the site." },
    { id: "scout", name: "Scout Report", hint: "Visit all five pages." },
    { id: "ace-hunter", name: "Ace Hunter", hint: "Find the hidden ball on every page." },
    { id: "rally", name: "Baseline Grinder", hint: "Hit a 10-shot rally in the mini game on Home." },
    { id: "maestro", name: "Maestro", hint: "Press play on the walkman." },
    { id: "flip", name: "Card Collector", hint: "Flip the profile card on About." },
    { id: "press", name: "Press Pass", hint: "Send a message from Contact." },
    { id: "clay", name: "Clay Court Specialist", hint: "Some old codes still work… ↑↑↓↓" },
  ];

  /* ---------- State ---------- */
  const fresh = () => ({ visited: [], aces: [], ach: [], best: 0 });
  let state = fresh();
  try { state = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };

  const page = document.body.dataset.page;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- Toasts ---------- */
  const toastBox = document.createElement("div");
  toastBox.className = "toasts";
  toastBox.setAttribute("role", "status");
  toastBox.setAttribute("aria-live", "polite");
  document.body.append(toastBox);

  function toast(title, sub) {
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `<span class="ball-icon" aria-hidden="true"></span><div><b></b><small></small></div>`;
    t.querySelector("b").textContent = title;
    t.querySelector("small").textContent = sub || "";
    toastBox.append(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 400); }, 3600);
  }

  /* ---------- Sound ---------- */
  let actx = null;
  const audio = () => {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
    }
    if (actx.state === "suspended") actx.resume();
    return actx;
  };

  function sfx(kind = "pock") {
    const ctx = audio();
    if (!ctx) return;
    const t = ctx.currentTime;
    if (kind === "pock") {
      // short filtered noise burst + pitched thump = racket on ball
      const len = 0.06, buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      const n = ctx.createBufferSource(); n.buffer = buf;
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1500; bp.Q.value = 1.2;
      const g = ctx.createGain(); g.gain.value = 0.5;
      n.connect(bp).connect(g).connect(ctx.destination); n.start(t);
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.frequency.setValueAtTime(520 + Math.random() * 80, t);
      o.frequency.exponentialRampToValueAtTime(180, t + 0.08);
      og.gain.setValueAtTime(0.25, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.connect(og).connect(ctx.destination); o.start(t); o.stop(t + 0.12);
    } else if (kind === "win") {
      [72, 76, 79, 84].forEach((m, i) => blip(ctx, m, t + i * 0.08, 0.18, "square", 0.06));
    } else if (kind === "out") {
      [60, 55].forEach((m, i) => blip(ctx, m, t + i * 0.14, 0.2, "sawtooth", 0.05));
    }
  }
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function blip(ctx, midi, t, dur, type, vol, dest) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = mtof(midi);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest || ctx.destination); o.start(t); o.stop(t + dur + 0.05);
  }

  /* ---------- Achievements ---------- */
  function unlock(id) {
    if (state.ach.includes(id)) return false;
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (!a) return false;
    state.ach.push(id); save();
    setTimeout(() => { toast("Unlocked: " + a.name, a.hint); sfx("win"); }, 250);
    renderStats();
    return true;
  }

  /* ---------- Scorebug ---------- */
  const bug = $("#scorebug");
  function renderBug() {
    if (!bug) return;
    $("[data-points]", bug).textContent = POINT_CALLS[state.visited.length] || "GAME";
    $("[data-aces]", bug).textContent = `${state.aces.length}/${PAGES.length}`;
  }
  function bump() { if (!bug) return; bug.classList.remove("bump"); void bug.offsetWidth; bug.classList.add("bump"); }

  /* Visit tracking — each new court visited wins a point */
  if (page && PAGES.includes(page) && !state.visited.includes(page)) {
    state.visited.push(page); save();
    const call = POINT_CALLS[state.visited.length];
    setTimeout(() => {
      if (state.visited.length === 1) toast("Welcome!", "Each new page you visit scores a point. There are hidden balls to find too.");
      else if (call === "GAME") toast("Game!", "You've seen every page. Tap the score in the header for your stats.");
      else toast(`Point won — ${call}`, `${PAGES.length - state.visited.length} page(s) left to explore.`);
      bump();
    }, 700);
  }
  /* Mark "played" matches on the home schedule */
  $$("[data-court]").forEach((card) => {
    if (state.visited.includes(card.dataset.court)) {
      card.classList.add("played");
      const s = $(".status", card); if (s) s.textContent = "Played ✓";
    }
  });

  /* ---------- Hidden aces ---------- */
  $$(".ace").forEach((ace) => {
    const id = ace.dataset.ace;
    if (state.aces.includes(id)) { ace.classList.add("gone"); return; }
    ace.addEventListener("click", () => {
      ace.classList.add("found");
      sfx("pock");
      if (!state.aces.includes(id)) { state.aces.push(id); save(); }
      toast(`Ace! ${state.aces.length}/${PAGES.length}`, state.aces.length < PAGES.length ? "There's one hidden on every page." : "Clean sweep. Nobody returns those.");
      renderBug(); bump(); renderStats();
      if (state.aces.length >= PAGES.length) unlock("ace-hunter");
    });
  });

  /* ---------- Stats dialog ---------- */
  const dlg = document.createElement("dialog");
  dlg.className = "stats-dialog";
  dlg.setAttribute("aria-labelledby", "sd-title");
  dlg.innerHTML = `
    <div class="sd-head">
      <button class="sd-close" aria-label="Close match stats">✕</button>
      <span class="kicker" style="color:#9ba7bc"><span class="dot"></span> Live match stats</span>
      <h2 id="sd-title">Your Progress</h2>
      <p>Explore the pages, find the hidden balls, unlock everything.</p>
      <div class="sd-score">
        <span>YOU</span>
        <span>Pages<b data-s="courts"></b></span>
        <span>Aces<b data-s="aces"></b></span>
        <span>Best rally<b data-s="best"></b></span>
      </div>
    </div>
    <div class="sd-body">
      <ul class="ach-list"></ul>
      <div class="sd-foot"><span data-s="pct"></span><button class="link-btn" data-reset>Reset match</button></div>
    </div>`;
  document.body.append(dlg);

  function renderStats() {
    $('[data-s="courts"]', dlg).textContent = `${state.visited.length}/${PAGES.length}`;
    $('[data-s="aces"]', dlg).textContent = `${state.aces.length}/${PAGES.length}`;
    $('[data-s="best"]', dlg).textContent = state.best || 0;
    $('[data-s="pct"]', dlg).textContent = `${state.ach.length} of ${ACHIEVEMENTS.length} achievements unlocked`;
    $(".ach-list", dlg).innerHTML = ACHIEVEMENTS.map((a) => {
      const got = state.ach.includes(a.id);
      return `<li class="ach ${got ? "got" : ""}"><span class="ball-icon" aria-hidden="true"></span>
        <div><b>${got ? a.name : "Locked — " + a.name}</b><small>${a.hint}</small></div></li>`;
    }).join("");
  }
  renderStats();
  renderBug();
  unlock("first-serve");
  if (state.visited.length >= PAGES.length) unlock("scout");

  bug && bug.addEventListener("click", () => { renderStats(); dlg.showModal(); });
  $(".sd-close", dlg).addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  $("[data-reset]", dlg).addEventListener("click", () => {
    if (!confirm("Reset all progress and start a new match?")) return;
    state = fresh(); save();
    try { localStorage.removeItem("mp.clay"); } catch (e) {}
    location.reload();
  });

  /* ---------- Theme ---------- */
  const root = document.documentElement;
  const themeBtn = $("#theme-toggle");
  const isDark = () => root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  themeBtn && themeBtn.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("mp.theme", next); } catch (e) {}
    toast(next === "dark" ? "Night session" : "Day session", next === "dark" ? "Floodlights on." : "Sun's out. Hydrate.");
  });

  /* ---------- Konami → clay court ---------- */
  const code = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let ki = 0;
  addEventListener("keydown", (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    ki = k === code[ki] ? ki + 1 : (k === code[0] ? 1 : 0);
    if (ki === code.length) {
      ki = 0;
      const on = root.dataset.surface !== "clay";
      if (on) root.dataset.surface = "clay"; else delete root.dataset.surface;
      try { localStorage.setItem("mp.clay", on ? "1" : "0"); } catch (e) {}
      toast(on ? "Surface: Clay" : "Surface: Hard court", on ? "Roland-Garros mode engaged." : "Back to the blue.");
      unlock("clay");
    }
  });

  /* ---------- Walkman (procedural lo-fi loop, Web Audio) ---------- */
  const walkman = document.createElement("button");
  walkman.className = "walkman";
  walkman.setAttribute("aria-pressed", "false");
  walkman.setAttribute("aria-label", "Play background music");
  walkman.innerHTML = `<span class="disc" aria-hidden="true"></span>
    <span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
    <span class="track"><span>lofi_serve.wav</span><small>side A · 84 bpm</small></span>`;
  document.body.append(walkman);

  const music = { on: false, timer: 0, step: 0, next: 0, bus: null };
  // Am9 → Fmaj7 → C → G/B, arpeggiated
  const CHORDS = [[57, 60, 64, 67, 71], [53, 57, 60, 64, 69], [48, 55, 60, 64, 67], [47, 55, 59, 62, 67]];
  const BPM = 84, EIGHTH = 60 / BPM / 2;

  function schedule(ctx) {
    while (music.next < ctx.currentTime + 0.15) {
      const s = music.step, t = music.next;
      const chord = CHORDS[Math.floor(s / 8) % CHORDS.length];
      const pattern = [0, 2, 4, 3, 1, 3, 2, 4];
      blip(ctx, chord[pattern[s % 8]] + 12, t, EIGHTH * 1.8, "triangle", 0.07, music.bus);
      if (s % 8 === 0) {
        blip(ctx, chord[0] - 12, t, EIGHTH * 7, "sine", 0.18, music.bus);
        kick(ctx, t);
      }
      if (s % 8 === 4) { kick(ctx, t, 0.5); snap(ctx, t); }
      if (s % 2 === 1) hat(ctx, t);
      music.step++;
      music.next += EIGHTH * (s % 2 ? 0.92 : 1.08); // a little swing
    }
  }
  function kick(ctx, t, v = 0.8) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    g.gain.setValueAtTime(v * 0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g).connect(music.bus); o.start(t); o.stop(t + 0.32);
  }
  function noise(ctx, t, dur, freq, vol, type = "highpass") {
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const n = ctx.createBufferSource(); n.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = vol;
    n.connect(f).connect(g).connect(music.bus); n.start(t);
  }
  const hat = (ctx, t) => noise(ctx, t, 0.04, 7000, 0.06);
  const snap = (ctx, t) => noise(ctx, t, 0.12, 1800, 0.12, "bandpass");

  walkman.addEventListener("click", () => {
    const ctx = audio();
    if (!ctx) return;
    if (!music.bus) {
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2200;
      const g = ctx.createGain(); g.gain.value = 0.55;
      lp.connect(g).connect(ctx.destination);
      music.bus = lp; music.gain = g;
    }
    music.on = !music.on;
    walkman.classList.toggle("playing", music.on);
    walkman.setAttribute("aria-pressed", String(music.on));
    walkman.setAttribute("aria-label", music.on ? "Pause background music" : "Play background music");
    if (music.on) {
      music.gain.gain.setTargetAtTime(0.55, ctx.currentTime, 0.05);
      music.next = ctx.currentTime + 0.05;
      music.timer = setInterval(() => schedule(ctx), 25);
      unlock("maestro");
    } else {
      clearInterval(music.timer);
      music.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08);
    }
  });

  /* ---------- Reveal on scroll ---------- */
  const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { threshold: 0.12 }) : null;
  $$(".reveal").forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 70}ms`;
    io ? io.observe(el) : el.classList.add("in");
  });

  /* ---------- Page: about — player card ---------- */
  const card = $("#player-card");
  if (card) {
    const flip = () => {
      card.classList.toggle("flipped");
      $("#flip-btn").setAttribute("aria-pressed", String(card.classList.contains("flipped")));
      unlock("flip");
    };
    card.addEventListener("click", flip);
    $("#flip-btn").addEventListener("click", flip);
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      card.querySelectorAll(".pc-face").forEach((f) => f.style.setProperty("--shine", `${(1 - x) * 100}%`));
    });
  }

  /* ---------- Page: projects — surface filters ---------- */
  $$(".filter").forEach((btn) => btn.addEventListener("click", () => {
    $$(".filter").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    const f = btn.dataset.filter;
    $$(".project").forEach((p) => { p.hidden = f !== "all" && p.dataset.surface !== f; });
  }));

  /* ---------- Page: contact — message form ----------
     Sends through FormSubmit (no mail app needed). The first message ever sent
     triggers a one-time activation email to the inbox in data-to. */
  const form = $("#press-form");
  if (form) {
    const to = form.dataset.to;
    const status = $("#form-status");
    const btn = $('[type="submit"]', form);
    const btnLabel = btn.innerHTML;
    const gmailLink = (subject = "", body = "") =>
      `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const subject = `[Portfolio · ${fd.get("topic")}] from ${fd.get("name")}`;
      status.className = "form-status"; status.textContent = "";
      btn.disabled = true; btn.textContent = "Sending…";
      try {
        const res = await fetch(`https://formsubmit.co/ajax/${to}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            name: fd.get("name"), email: fd.get("email"), topic: fd.get("topic"), message: fd.get("message"),
            _subject: subject, _replyto: fd.get("email"), _template: "table",
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || String(data.success) !== "true") throw new Error(data.message || "send failed");
        form.reset();
        status.className = "form-status ok";
        status.textContent = "Message sent! I'll get back to you soon.";
        toast("Message sent", "Thanks for reaching out.");
        unlock("press");
      } catch (err) {
        const body = `${fd.get("message")}\n\n— ${fd.get("name")} (${fd.get("email")})`;
        status.className = "form-status err";
        status.innerHTML = `Couldn't send from here. <a href="" target="_blank" rel="noopener">Open it in Gmail</a> instead, or email <b>${to}</b> directly.`;
        $("a", status).href = gmailLink(subject, body);
      } finally {
        btn.disabled = false; btn.innerHTML = btnLabel;
      }
    });
  }

  /* Copy email buttons */
  $$("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); toast("Email copied", b.dataset.copy); }
    catch (e) { prompt("Copy this email:", b.dataset.copy); }
  }));

  /* Expose for page scripts (rally game) */
  window.MP = { sfx, toast, unlock, state, save, renderStats };
})();
