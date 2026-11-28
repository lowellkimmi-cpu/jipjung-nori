/* =========================================================
   공통 도구 — 놀이 등록, 작은 도우미, 소리
   ========================================================= */
"use strict";
(function () {
  /* ---------- 놀이 등록 ----------
     놀이 파일(js/games/*.js)이 JN.registerGame({...}) 를 불러 자기를 등록해요. 자세한 형식은 README "놀이 추가하는 방법". */
  JN.GAMES = {};
  JN.GAME_ORDER = [];
  JN.registerGame = function (def) {
    const meta = Art.GAMES.find((g) => g.id === def.id) || {};
    def.name = def.name || meta.name || def.id;
    def.area = def.area || meta.area;
    def.extraSettings = def.extraSettings || [];
    def.isStageOpen = def.isStageOpen || (() => true);
    JN.GAMES[def.id] = def;
    JN.GAME_ORDER.push(def.id);
  };

  /* ---------- 작은 도우미 ---------- */
  const U = JN.util = {};
  U.rnd = (n) => Math.floor(Math.random() * n);
  U.rand = (a, b) => a + Math.random() * (b - a);
  U.pick = (a) => a[U.rnd(a.length)];
  U.shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = U.rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.r1 = (s) => Math.round(s * 10) / 10;
  U.fmtTime = (sec) => {
    sec = U.r1(sec || 0);
    if (sec < 60) return JN.t("common.sec", { n: sec.toFixed(1) });   // 글자는 lang/ko.js 에서
    const m = Math.floor(sec / 60);
    return JN.t("common.minsec", { m, s: Math.round(sec - m * 60) });
  };
  U.fmtClock = (sec) => {
    const t = Math.floor(sec * 10) / 10;
    if (t < 60) return t.toFixed(1);
    const m = Math.floor(t / 60);
    return m + ":" + (t - m * 60).toFixed(1).padStart(4, "0");
  };
  /* 글자는 늘 textContent 로 넣어요. html 옵션은 코드로 만든 그림(SVG)에만 써요. */
  U.h = function (tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k === "svg") el.innerHTML = v;            // Art.* 이 만든 SVG 문자열만
      else if (k === "style") el.style.cssText = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    return el;
  };
  /* 누르기: 손가락을 뗄 때 바로 반응 (그리기 바로 뒤의 탭이 click 으로 안 오는 기기가 있어서). 키보드는 click 으로 */
  U.onTap = function (el, fn) {
    let down = null, fired = 0;
    el.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
    el.addEventListener("pointerup", (e) => {
      if (!down || down.id !== e.pointerId) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 24; down = null;
      if (moved) return;
      fired = Date.now(); fn(e);
    });
    el.addEventListener("pointercancel", () => { down = null; });
    el.addEventListener("click", (e) => { if (Date.now() - fired < 600) return; fn(e); });
  };
  /* 화면을 바꾸는 단추용 누르기 (새 놀이 4개): 손가락을 뗀 뒤 브라우저가 늦게 보내는 click 이
     바뀐 화면의 같은 자리 단추를 또 누르지 않게, 어느 단추든 방금(0.6초) 눌렸으면 click 은 무시해요 */
  let lastTapAt = 0;
  U.tap = function (el, fn) {
    let down = null;
    el.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
    el.addEventListener("pointerup", (e) => {
      if (!down || down.id !== e.pointerId) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 24; down = null;
      if (moved || Date.now() - lastTapAt < 250) return;
      lastTapAt = Date.now(); fn(e);
    });
    el.addEventListener("pointercancel", () => { down = null; });
    el.addEventListener("click", (e) => { if (Date.now() - lastTapAt < 600) return; lastTapAt = Date.now(); fn(e); });
  };
  /* 첫 판 손짓 도우미: 처음 하는 아이에게만(ctx.practice) 몇 번 막히거나 가만히 있으면 '손 그림'이 알맞은 곳을 천천히 가리켜요.
     글자·벌점·깜빡임 없음(위아래로 천천히 오가기만, 움직임 줄이기 설정이면 가만히 있어요). 아이가 화면을 누르면 손은 사라져요.
     getTarget(): 가리킬 칸(없으면 null) · o.idleMs 가만있는 시간(0이면 가만있기로는 안 보임) · o.wrongAt 몇 번째 막힘부터 · o.showMs 손이 보이는 시간 */
  const HAND_SVG = '<svg viewBox="0 0 60 84" aria-hidden="true"><g class="hd-ol"><rect x="22" y="4" width="15" height="46" rx="7.5"/><rect x="10" y="36" width="42" height="42" rx="15"/><rect x="3" y="46" width="15" height="26" rx="7.5" transform="rotate(-18 10 59)"/></g>' +
    '<g class="hd-in"><rect x="22" y="4" width="15" height="46" rx="7.5"/><rect x="10" y="36" width="42" height="42" rx="15"/><rect x="3" y="46" width="15" height="26" rx="7.5" transform="rotate(-18 10 59)"/></g></svg>';
  U.nudge = function (ctx, getTarget, o) {
    o = o || {};
    const idleMs = o.idleMs == null ? 8000 : o.idleMs, wrongAt = o.wrongAt || 2, showMs = o.showMs || 4000;
    let hand = null, idleT = 0, wrongs = 0, shown = 0;
    const on = () => !!ctx.practice && ctx.alive();
    const hide = () => { document.querySelectorAll(".jn-hand").forEach((e) => e.remove()); hand = null; };
    const stop = () => { clearTimeout(idleT); hide(); };
    function arm(ms) {
      clearTimeout(idleT);
      if (!on()) return;
      const wait = ms != null ? ms : idleMs;
      if (!wait) return;
      idleT = ctx.later(show, Math.max(JN.ms(wait), 30));
    }
    function show() {
      if (!on()) return;
      const el = getTarget(), r = el && el.getBoundingClientRect();
      if (!el || !r || r.width < 4) { arm(wrongs >= wrongAt ? 1200 : null); return; }   // 지금 가리킬 곳이 없으면 조금 뒤에 다시 봐요
      hide();
      hand = U.h("span", { class: "jn-hand", "aria-hidden": "true", svg: HAND_SVG });
      hand.style.left = (r.left + r.width / 2) + "px"; hand.style.top = (r.top + r.height * 0.55) + "px";
      document.body.appendChild(hand); shown++;
      idleT = ctx.later(() => { hide(); arm(); }, Math.max(JN.ms(showMs), 60));
    }
    ctx.board.addEventListener("pointerdown", () => { if (hand) { hide(); arm(); } });
    return {
      arm: () => arm(),                                         // 새 문제가 나왔어요: 가만있기 시간을 다시 재요
      ok() { wrongs = 0; hide(); arm(); },                      // 잘 했어요
      wrong() { wrongs++; hide(); arm(wrongs >= wrongAt ? 1500 : null); },   // 막혔어요: 두 번째부터 손이 나와요
      hide, stop, shown: () => shown, visible: () => !!hand,
    };
  };
  /* 받침이 있으면 "하늘이의", 없으면 "콩의" 처럼 */
  U.withI = (name) => {
    const c = name.charCodeAt(name.length - 1);
    return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? name + "이" : name;
  };
  /* 받침 보고 조사 붙이기: josa("토끼", "이/가") → "토끼가", josa("곰", "을/를") → "곰을", josa("곰", "과/와") → "곰과"
     (앞쪽 = 받침 있을 때, 뒤쪽 = 받침 없을 때) */
  U.hasBatchim = (w) => { const c = String(w).charCodeAt(String(w).length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 > 0; };
  U.josa = (w, pair) => { const [a, b] = pair.split("/"); return w + (U.hasBatchim(w) ? a : b); };
  JN.josa = U.josa;
  U.svgImg = (svgText) => {   // 캔버스에 그릴 그림 (data: 주소, 외부 요청 없음)
    const im = new Image();
    im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText);
    return im;
  };

  /* ---------- 나이 추천 · 시작 단계 ---------- */
  JN.ageStage = function (gameId, age) {
    const t = JN.AGE_START[gameId];
    const g = JN.GAMES[gameId];
    if (!t || !g) return 0;
    const ages = Object.keys(t).map(Number).sort((a, b) => a - b);
    let pick = ages[0];
    for (const a of ages) if (age >= a) pick = a;
    return U.clamp((t[pick] || 1) - 1, 0, g.stages.length - 1);
  };


  /* ---------- 아이가 그은 선 (붓 느낌: perfect-freehand 가 있으면 쓰고, 없으면 둥근 선) ---------- */
  JN.brush = function (c2d, pts, width, color, alpha) {
    if (!pts || !pts.length) return;
    c2d.save();
    c2d.globalAlpha = alpha == null ? 1 : alpha;
    const PF = window.PerfectFreehand;
    if (PF && PF.getStroke && pts.length > 1) {
      const outline = PF.getStroke(pts, { size: width * 1.2, thinning: 0.6, smoothing: 0.6, streamline: 0.4, simulatePressure: true, last: true });   // 디자인 권장 값 (시작·끝이 가늘게)
      if (outline.length) {
        c2d.fillStyle = color; c2d.beginPath(); c2d.moveTo(outline[0][0], outline[0][1]);
        for (let i = 1; i < outline.length; i++) c2d.lineTo(outline[i][0], outline[i][1]);
        c2d.closePath(); c2d.fill(); c2d.restore(); return;
      }
    }
    c2d.strokeStyle = color; c2d.fillStyle = color; c2d.lineWidth = width; c2d.lineCap = "round"; c2d.lineJoin = "round";
    c2d.beginPath(); c2d.moveTo(pts[0][0], pts[0][1]);
    if (pts.length === 1) { c2d.arc(pts[0][0], pts[0][1], width / 2, 0, Math.PI * 2); c2d.fill(); }
    else { for (let i = 1; i < pts.length; i++) c2d.lineTo(pts[i][0], pts[i][1]); c2d.stroke(); }
    c2d.restore();
  };
  /* tokens.css 색을 캔버스에서도 쓰려고 읽어 오기 */
  JN.cssVar = (name, fb) => { try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb; } catch (e) { return fb; } };


  /* ---------- 연필 도형 (rough.js, seed 고정이면 늘 같은 모양) ---------- */
  JN.rough = {
    gen() { return window.rough ? window.rough.generator() : null; },
    /* rough 도형 → SVG path 문자열들 */
    paths(kind, args, opt) {
      const g = this.gen(); if (!g) return "";
      const d = g[kind](...args, Object.assign({ roughness: 1.3, bowing: 1, stroke: JN.cssVar("--c-pencil", "#4A3F37"), strokeWidth: 2.2, seed: 5 }, opt || {}));
      return g.toPaths(d).map((q) => '<path d="' + q.d + '" fill="' + (q.fill || "none") + '" stroke="' + q.stroke + '" stroke-width="' + q.strokeWidth + '" stroke-linecap="round" stroke-linejoin="round"/>').join("");
    },
    /* 정답 표시: 연필로 두 번 그린 동그라미 (overlay span 용 SVG) */
    ring(color) {
      const c = color || JN.cssVar("--c-olive-deep", "#5E6B2C");
      const p = this.paths("ellipse", [50, 50, 92, 88], { stroke: c, strokeWidth: 3.2, roughness: 1.6, seed: 1 + Math.floor(Math.random() * 999) });
      return '<svg viewBox="0 0 100 100" aria-hidden="true" style="overflow:visible">' + (p || '<ellipse cx="50" cy="50" rx="46" ry="44" fill="none" stroke="' + c + '" stroke-width="3.2"/>') + "</svg>";
    },
  };
  JN.markRight = function (el) {
    if (!el || el.querySelector(".pencil-mark")) return;
    const s = document.createElement("span"); s.className = "pencil-mark"; s.innerHTML = JN.rough.ring();
    el.appendChild(s);
  };

  /* ---------- 소리 (Web Audio, 첫 터치 뒤에만 시작 — 아이폰 사파리 규칙) ---------- */
  let ac = null;
  function unlock() {
    try {
      if (!ac) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ac = new AC(); }
      if (ac && ac.state !== "running" && ac.state !== "closed") ac.resume();   // 'suspended' 뿐 아니라 아이폰이 전화·화면 끄기 뒤에 남기는 'interrupted' 도 다시 깨워요
    } catch (e) { ac = null; }
  }
  ["pointerdown", "touchend", "keydown"].forEach((t) => window.addEventListener(t, unlock, { capture: true, passive: true }));
  const TONE_BOOST = 5;   // 예전 값이 폰에서 거의 안 들려서 5배로
  JN.tone = function (on, freq, dur, vol, delay) {
    if (!on || !ac || ac.state !== "running") return;
    try {
      const d = dur || 0.25, t0 = ac.currentTime + (delay || 0);
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "sine"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.min(0.4, (vol || 0.05) * TONE_BOOST), t0 + 0.03);   // 폰 스피커에서 들리게 키움
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + d + 0.05);
    } catch (e) { /* 소리가 안 나도 놀이는 계속 */ }
  };
  /* ---------- 배경음 (Web Audio 로 직접 만든 잔잔한 오르골 소리 — 파일·바깥 요청 없음) ----------
     놀이 화면에서만 작게 흘러요. 보호자 설정의 '배경음'으로 끌 수 있어요. */
  JN.bgm = (function () {
    const BPM = 76, BEAT = 60 / BPM;
    /* 도레미솔라(5음)만 써서 어떤 음이 겹쳐도 부드럽게. [음 높이(Hz), 박자] */
    const C4 = 261.63, D4 = 293.66, E4 = 329.63, G4 = 392.0, A4 = 440.0, C5 = 523.25, D5 = 587.33, E5 = 659.25;
    const MEL = [[E4, 1], [G4, 1], [A4, 1], [G4, 1], [E4, 1], [D4, 1], [C4, 2],
                 [D4, 1], [E4, 1], [G4, 1], [E4, 1], [D4, 2], [0, 2],
                 [E4, 1], [G4, 1], [C5, 1], [A4, 1], [G4, 1], [E4, 1], [D4, 2],
                 [E4, 1], [D4, 1], [C4, 2], [0, 4]];
    const BASS = [C4 / 2, A4 / 4, D4 / 2, G4 / 4];   // 한 마디(4박)마다 낮은 음 하나
    let master = null, timer = null, next = 0, step = 0, beatPos = 0, on = false;
    function note(freq, t, len, vol, type) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + len + 0.05);
    }
    function tick() {
      if (!on || !ac) return;
      while (next < ac.currentTime + 0.6) {
        const [f, b] = MEL[step % MEL.length];
        if (f) { note(f, next, b * BEAT * 1.6, 0.5, "triangle"); note(f * 2, next, b * BEAT, 0.08, "sine"); }
        if (beatPos % 4 === 0) note(BASS[(beatPos / 4) % BASS.length], next, BEAT * 3.5, 0.35, "sine");
        next += b * BEAT; beatPos += b; step++;
      }
    }
    return {
      start() {
        if (on || JN.muted) return;   // 놀이 화면의 '소리 꺼짐' 을 누른 뒤에는 배경음도 시작하지 않아요
        try {
          if (!ac) return;   // 소리 장치는 아이가 화면을 누른 뒤(unlock)에만 생겨요 — 누르기 전에는 배경음도 시작하지 않아요
          if (ac.state !== "running" && ac.state !== "closed") ac.resume();
          if (!master) { master = ac.createGain(); master.connect(ac.destination); }
          master.gain.cancelScheduledValues(ac.currentTime);
          master.gain.setValueAtTime(0.0001, ac.currentTime);
          master.gain.exponentialRampToValueAtTime(0.07, ac.currentTime + 1.5);   // 작게, 천천히 커지게
          on = true; step = 0; beatPos = 0; next = ac.currentTime + 0.15;
          tick(); timer = setInterval(tick, 200);
        } catch (e) { on = false; }
      },
      stop() {
        if (!on) return;
        on = false; clearInterval(timer); timer = null;
        try { master.gain.cancelScheduledValues(ac.currentTime); master.gain.setValueAtTime(master.gain.value, ac.currentTime); master.gain.linearRampToValueAtTime(0, ac.currentTime + 0.3); } catch (e) { /* 무시 */ }
      },
      get playing() { return on; },
    };
  })();
  /* ---------- 낱말 들려주기 (기기 안에 들어 있는 한국어 음성만) ----------
     speechSynthesis 의 한국어 음성 중 기기 안 음성(localService === true)만 써요.
     (2026-11-29 기획서 v3 9장 확인 과제 1) 크롬 PC 의 'Google 한국의' 같은 온라인 음성은 읽을 글을 인터넷으로 보내므로 쓰지 않아요.
     음성 목록을 받았는데 기기 안 한국어 음성이 없으면 JN.speakAvailable() 이 false → 놀이는 소리 단추를 숨기고 그림+글자로만 놀아요.
     음성 목록이 아직 비어 있는 기기(삼성 인터넷·안드로이드 크롬 처음)는 기기 기본 음성(lang ko-KR)으로 읽어요 — 목록이 오면 다시 골라요.
     (읽는 글은 놀이 안내·낱말 같은 정해진 문장뿐이고, 아이 정보는 읽지 않아요)
     아이가 단추를 눌렀을 때만 불러요(자동으로 읽지 않음). */
  let koVoice = null, voicesKnown = false;
  const voiceFns = [];
  function pickVoice() {
    try {
      const ss = window.speechSynthesis;
      if (!ss || typeof ss.getVoices !== "function" || typeof window.SpeechSynthesisUtterance !== "function") { koVoice = null; return null; }
      const voices = ss.getVoices() || [];
      voicesKnown = voices.length > 0;
      const local = Array.prototype.filter.call(voices, (v) => /^ko/i.test(v.lang || "") && v.localService === true);   // 기기 안 한국어 음성만
      koVoice = local.find((v) => /^ko[-_]KR/i.test(v.lang)) || local[0] || null;
    } catch (e) { koVoice = null; }
    return koVoice;
  }
  try {
    if (window.speechSynthesis) {
      pickVoice();
      const onv = () => { pickVoice(); voiceFns.slice().forEach((f) => { try { f(); } catch (e) { /* 무시 */ } }); };
      if (window.speechSynthesis.addEventListener) window.speechSynthesis.addEventListener("voiceschanged", onv);
      else window.speechSynthesis.onvoiceschanged = onv;
    }
  } catch (e) { koVoice = null; }
  const hasSynth = () => { try { return !!window.speechSynthesis && typeof window.SpeechSynthesisUtterance === "function"; } catch (e) { return false; } };
  /* 기기 안 한국어 음성이 있거나, 음성 목록을 아직 못 받았을 때(기기 기본 음성)만 읽어요. 목록에 온라인 음성뿐이면 읽지 않고 글자로 */
  JN.speakAvailable = () => !!(koVoice || pickVoice() || (!voicesKnown && hasSynth()));
  /* 시험·보호자 안내용: 지금 고른 음성이 기기 안 음성인지 ("local" / "default"(목록 없음, 기기 기본) / "none") */
  JN.voiceKind = () => (koVoice || pickVoice() ? "local" : (!voicesKnown && hasSynth() ? "default" : "none"));
  /* 음성 목록이 늦게 오는 기기(크롬)를 위해: 바뀌면 fn 을 불러 줘요. 돌려받은 함수를 부르면 그만 들어요 */
  JN.onVoices = (fn) => { voiceFns.push(fn); return () => { const i = voiceFns.indexOf(fn); if (i >= 0) voiceFns.splice(i, 1); }; };
  JN.speak = function (text) {
    if (JN.muted || !JN.speakAvailable()) return false;
    try {
      const ss = window.speechSynthesis, u = new SpeechSynthesisUtterance(String(text));
      if (koVoice) u.voice = koVoice;   // 기기 안 음성 (온라인 음성은 고르지 않아요)
      u.lang = (koVoice && koVoice.lang) || "ko-KR"; u.rate = 0.9; u.volume = 1;
      if (ss.speaking || ss.pending) { ss.cancel(); setTimeout(() => { try { ss.speak(u); } catch (e) { /* 무시 */ } }, 60); }
      else ss.speak(u);
      if (ss.paused) ss.resume();
      return true;
    } catch (e) { return false; }
  };
  JN.speakStop = () => { try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* 무시 */ } };
  /* 놀이 화면의 소리 단추를 '꺼짐' 으로 하면 배경음·말 안내까지 모두 멈춰요 (저장된 보호자 설정은 그대로 두고, 이번에 켜 둔 동안만) */
  JN.muted = false;
  JN.muteAll = function (m) { JN.muted = !!m; if (JN.muted) { JN.bgm.stop(); JN.speakStop(); } };
  /* 다른 화면·앱으로 가면 소리 장치도 잠시 멈춰요 (다시 소리 나는 건 아이가 화면을 누르거나 놀이로 돌아온 뒤) */
  JN.audioPause = function () { try { if (ac && ac.state === "running") ac.suspend(); } catch (e) { /* 무시 */ } };

  /* ---------- 낱말 그림 목록 (이게 뭐야? · 누가 뭐 해요? 가 같이 써요) — 그림은 art.js 것을 그대로 ---------- */
  const WK = (w, kind, key, cat) => ({ w, kind, key: key || w, cat });
  JN.WORDS = [
    ...["사과", "바나나", "딸기", "포도", "수박", "귤"].map((w) => WK(w, "fruit", w, "과일")),
    ...["강아지", "고양이", "토끼", "곰", "오리", "코끼리"].map((w) => WK(w, "animal", w, "동물")),
    ...["자동차", "버스", "기차", "비행기", "배", "자전거"].map((w) => WK(w, "vehicle", w, "탈것")),
    ...["벌", "나비", "무당벌레", "잠자리", "개미"].map((w) => WK(w, "insect", w, "곤충")),
    WK("꽃", "flower", "동글꽃", "꽃"), WK("튤립", "flower", "튤립", "꽃"), WK("해바라기", "flower", "해바라기", "꽃"),
  ];
  JN.word = (w) => JN.WORDS.find((x) => x.w === w);
  /* 낱말 그림 SVG. o.face: '웃음' 이면 과일·동물에 웃는 얼굴 */
  JN.wordArt = function (w, o) {
    const it = typeof w === "string" ? JN.word(w) : w, op = Object.assign({ label: it.w }, o || {});
    if (it.kind === "fruit") return Art.fruit(it.key, op.face ? op : { label: op.label });
    if (it.kind === "animal") return Art.animal(it.key, op.face ? op : { label: op.label });
    if (it.kind === "vehicle") return Art.vehicle(it.key, { label: op.label });
    if (it.kind === "insect") return Art.insect(it.key, { label: op.label });
    return Art.flower(it.key, { label: op.label });
  };

  JN.sound = function (on, kind) {
    if (kind === "ok") JN.tone(on, 660, 0.2, 0.05);
    else if (kind === "miss") JN.tone(on, 294, 0.2, 0.022);
    else if (kind === "finish") { JN.tone(on, 523, 0.3, 0.045); JN.tone(on, 659, 0.3, 0.045, 0.15); JN.tone(on, 784, 0.45, 0.045, 0.3); }
    else if (kind === "tap") JN.tone(on, 440, 0.08, 0.025);
  };
})();
