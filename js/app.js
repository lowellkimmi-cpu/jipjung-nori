/* =========================================================
   집중 놀이터 앱 — 화면 바꾸기(한 페이지 안), 아이 고르기, 영역 방, 놀이 공통 틀,
   칭찬·잠깐 쉬어요, 보호자 잠금(덧셈)·보호자 설정
   ========================================================= */
"use strict";
(function () {
  const CFG = JN.CONFIG, S = JN.Store, U = JN.util, h = U.h;
  const $ = (id) => document.getElementById(id);
  const T = JN.t;   // 화면 글자는 lang/ko.js 에서 가져와요
  const OWL = CFG.MASCOT_NAMES.owl, SNAIL = CFG.MASCOT_NAMES.snail;
  const subj = (n) => U.withI(n) + (U.withI(n) === n ? "가" : "가");   // 보미가 · 달롱이가 (한국어 조사. 다른 언어는 문구에서 이름만 쓰면 돼요)

  const A = {
    kid: null, data: null,        // 지금 아이 · 그 아이 저장 정보
    room: null, gameId: null, inst: null, ctx: null,
    roundsSinceRest: 0, eyeRounds: 0, eyeSec: 0, updateReady: false, run: null, backTo: null, parentKid: null, parentFocusGame: null,
    timers: [],
  };
  JN.App = A;

  /* ---------- 공통 ---------- */
  function fillArt(root) {
    root.querySelectorAll("[data-icon]").forEach((el) => { if (!el.querySelector("svg")) el.insertAdjacentHTML("afterbegin", Art.icon(el.dataset.icon)); });
    root.querySelectorAll("[data-owl]").forEach((el) => { const [face, pose] = el.dataset.owl.split(","); el.innerHTML = JN.Assets.owl(face, pose, OWL); });
    root.querySelectorAll("[data-snail]").forEach((el) => { const [face, pose] = el.dataset.snail.split(","); el.innerHTML = JN.Assets.snail(face, pose, SNAIL); });
  }
  const SCREENS = ["scr-who", "scr-home", "scr-room", "scr-play", "scr-lock", "scr-profile", "scr-parent", "scr-records"];
  function show(id) {
    for (const s of SCREENS) $(s).classList.toggle("on", s === id);
    A.screen = id;
    if (id !== "scr-who") armBackGuard();   // 앞 화면으로 들어갈 때 '뒤로가기 가드'를 쌓아요(아래 설명)
    if (id !== "scr-play") JN.bgm.stop();
    window.scrollTo(0, 0);
    paintUpdateBtn();
  }
  /* 새 버전이 준비됐을 때만 '새 놀이가 왔어요' 단추 (놀이·잠금·설정 화면에서는 숨겨요) */
  function paintUpdateBtn() {
    $("updateBtn").hidden = !(A.updateReady && ["scr-who", "scr-home", "scr-room"].includes(A.screen));
  }
  A.paintUpdateBtn = paintUpdateBtn;
  A.show = show;
  function areaOf(id) { return Art.AREAS.find((a) => a.id === id); }
  function roomVars(el, area) {
    el.style.setProperty("--room", area.color); el.style.setProperty("--room-tint", area.tint); el.style.setProperty("--room-deep", area.deep);
  }
  /* rough.js 연필 도형 (seed 고정 → 다시 그려도 같은 모양). 없으면 빈 칸 */
  function roughSvg(kind, args, opt, vb) {
    if (!window.rough) return "";
    const g = rough.generator();
    const d = g[kind](...args, Object.assign({ roughness: 1.4, bowing: 1.2, stroke: JN.cssVar("--c-pencil", "#4A3F37"), strokeWidth: 2.2, seed: 7 }, opt || {}));
    return '<svg viewBox="' + vb + '" aria-hidden="true" style="overflow:visible">' +
      g.toPaths(d).map((q) => '<path d="' + q.d + '" fill="' + (q.fill || "none") + '" stroke="' + q.stroke + '" stroke-width="' + q.strokeWidth + '" stroke-linecap="round"/>').join("") + "</svg>";
  }
  A.roughSvg = roughSvg;
  /* 별 도장: 칠한 별(받은 별) / 테두리 별(아직) — 모양으로도 구별 */
  function starSvg(on) {
    return on ? '<span class="star on">' + Art.icon("별", { label: T("star.on") }) + "</span>" : '<span class="star off">' + Art.icon("별", { label: T("star.off") }) + "</span>";
  }
  /* 단계 잎사귀: 지난 = 채운 잎, 지금 = 큰 머스터드 잎, 남은 = 빈 잎 */
  function leaves(n, idx) {
    const d = h("span", { class: "jn-dots", "aria-hidden": "true" });
    for (let i = 0; i < n; i++) d.appendChild(h("i", { class: i < idx ? "on" : i === idx ? "now" : null }));
    return d;
  }
  function avatar(p, size) { return Art.profile(p.animal, { color: p.color, label: p.nick, size }); }
  function saveData() { if (A.kid) S.saveChild(A.kid.id, A.data); }

  /* ---------- 단계 ---------- */
  function gameSet(data, gid) { return (data.games[gid] = data.games[gid] || {}); }
  function gameState(data, gid) { return (data.state[gid] = data.state[gid] || {}); }
  /* 시작 단계: "1단계부터" 켜짐 → 1단계 / 놀이별로 고른 단계 / 나이 추천 */
  function startStage(kid, data, gid) {
    const def = JN.GAMES[gid];
    let idx;
    if (data.settings.from1) idx = 0;
    else {
      const o = gameSet(data, gid).start;
      idx = typeof o === "number" ? o : JN.ageStage(gid, kid.age);
    }
    return openAtOrBelow(def, U.clamp(idx, 0, def.stages.length - 1));
  }
  function openAtOrBelow(def, idx) { while (idx > 0 && !def.isStageOpen(idx)) idx--; return idx; }
  function curStage(kid, data, gid) {
    const def = JN.GAMES[gid], st = gameState(data, gid);
    if (typeof st.stage !== "number" || st.stage < 0 || st.stage >= def.stages.length) st.stage = startStage(kid, data, gid);
    return openAtOrBelow(def, st.stage);
  }
  function resetStages(kid, data, only) {
    for (const gid of JN.GAME_ORDER) if (!only || only === gid) gameState(data, gid).stage = startStage(kid, data, gid);
  }
  A.startStage = startStage; A.curStage = curStage;
  function gameSettings(data, gid) {
    const def = JN.GAMES[gid], gs = gameSet(data, gid), out = Object.assign({}, data.settings);
    for (const f of def.extraSettings) {
      const v = gs[f.key];
      out[f.key] = f.type === "bool" ? (typeof v === "boolean" ? v : f.def) : (f.options.some((o) => o[0] === v) ? v : f.def);
    }
    return out;
  }

  /* ---------- 1. 누가 놀까요 ---------- */
  function renderWho() {
    const box = $("kids"); box.textContent = "";
    const list = S.profiles();
    for (const p of list) {
      box.appendChild(h("button", { class: "kid", type: "button", "data-kid": p.id, style: "--tape:" + p.color, onclick: () => pickKid(p.id) },
        h("span", { class: "face", svg: avatar(p) }), h("span", { class: "name", text: p.nick })));
    }
    if (list.length < CFG.MAX_CHILDREN) {
      const ring = roughSvg("circle", [50, 50, 92], { strokeLineDash: [6, 8], stroke: JN.cssVar("--c-ink-soft", "#6A5D52"), roughness: 1.1 }, "0 0 100 100")
        .replace("</svg>", '<path d="M50 34 V66 M34 50 H66" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>');
      box.appendChild(h("button", { class: "kid kid--add", type: "button", id: "addKid", onclick: () => lockThen(() => openProfile(null, "who"), () => show("scr-who")) },
        h("span", { class: "face", svg: ring || Art.icon("더하기") }), h("span", { class: "name", text: T("who.add") }),
        h("small", null, h("i", { svg: Art.icon("보호자") }), T("who.adultcheck"))));
    }
    $("whoBg").innerHTML = JN.Assets.scene("who");
    $("whoBubble").textContent = list.length ? T("who.bubble.hello") : T("who.bubble.first");
    show("scr-who");
  }
  function pickKid(id) {
    const p = S.profiles().find((x) => x.id === id);
    if (!p) return renderWho();
    A.kid = p; A.data = S.child(id); A.roundsSinceRest = 0; A.eyeRounds = 0; A.eyeSec = 0;
    const ap = S.getApp(); ap.last = id; S.setApp(ap);
    renderHome();
  }

  /* ---------- 2. 영역 방 ---------- */
  /* 오늘의 놀이: 열려 있는 방의 놀이 중 최근에 덜 한 놀이를 하나 골라요 (점수·평가 없음, 기록은 이 기기 안에만).
     규칙: 방금 한 놀이는 빼고 → 최근 20판에서 적게 한 놀이 → 그중 가장 오래전에 한(안 한) 놀이 → 그래도 같으면 날짜에 따라 돌아가며 */
  function playableIds() {
    const closed = JN.CONFIG.CLOSED_AREAS || [], out = [];
    for (const a of Art.AREAS) if (!closed.includes(a.id)) for (const g of a.games) if (JN.GAMES[g] && !out.includes(g)) out.push(g);
    return out;
  }
  function pickToday(rounds, ids, seed) {
    if (!ids.length) return null;
    const recent = rounds.slice(-Math.max(20, ids.length)), cnt = {}, last = {};   // 놀이가 20개를 넘어도 한 바퀴를 다 보도록 (골고루)
    recent.forEach((e, i) => { cnt[e.game] = (cnt[e.game] || 0) + 1; last[e.game] = i; });
    const lastGame = recent.length ? recent[recent.length - 1].game : null;
    let pool = ids.filter((g) => g !== lastGame);
    if (!pool.length) pool = ids.slice();
    const min = Math.min(...pool.map((g) => cnt[g] || 0));
    pool = pool.filter((g) => (cnt[g] || 0) === min);
    const lastOf = (g) => (g in last ? last[g] : -1);
    const oldest = Math.min(...pool.map(lastOf));
    pool = pool.filter((g) => lastOf(g) === oldest);
    return pool[Math.abs(seed | 0) % pool.length];
  }
  A.playableIds = playableIds; A.pickToday = pickToday;
  function paintToday() {
    const box = $("todayBox"), card = $("todayCard"); card.textContent = "";
    const ids = playableIds();
    const gid = A.kid && !limitReached() ? pickToday(S.history(A.kid.id).rounds, ids, Math.floor(Date.now() / 864e5)) : null;
    box.hidden = !gid;
    if (!gid) return;
    const def = JN.GAMES[gid], area = areaOf(def.area), si = curStage(A.kid, A.data, gid);
    const el = h("button", { class: "gcard game jn-card", type: "button", "data-today": gid, onclick: () => startGame(gid) },
      h("span", { class: "ic", svg: JN.Assets.gameIcon(gid) }),
      h("span", { class: "txt" }, h("b", { text: def.name }), h("small", { class: "meta", text: T("game.now", { n: si + 1 }) })),
      h("span", { class: "go", svg: Art.icon("다음") }));
    roomVars(el, area);
    card.appendChild(el);
  }
  function renderHome() {
    const p = A.kid;
    $("homeAv").innerHTML = avatar(p);
    $("homeTitle").textContent = T("home.title", { name: U.withI(p.nick) });
    const box = $("rooms"); box.textContent = "";
    for (const a of Art.AREAS) {
      const games = a.games.filter((g) => JN.GAMES[g]);
      /* 닫아 둔 방(JN.CONFIG.CLOSED_AREAS)은 놀이가 있어도 카드를 누르면 "곧 열려요"만 보여요. 놀이 코드는 그대로 둬요 */
      const soon = !games.length || (JN.CONFIG.CLOSED_AREAS || []).includes(a.id);
      const tag = soon ? h("span", { class: "tag soon", text: T("soon.title") })
        : h("span", { class: "tag" }, T("home.tag.games", { n: games.length }) + " ", h("span", { class: "leaves", "aria-hidden": "true" }, games.map(() => h("i"))));
      const art = h("span", { class: "jn-room__art", svg: JN.Assets.roomArt(a.id) }); art.appendChild(tag);
      const el = h("button", { class: "jn-room" + (soon ? " jn-room--soon" : ""), type: "button", "data-area": a.id,
        "aria-label": a.name + (soon ? T("home.room.soon.aria") : T("home.room.games.aria", { n: games.length })), onclick: () => (soon ? showSoon(a) : openRoom(a.id)) },
        art, soon ? h("span", { class: "peek", svg: JN.Assets.snail("기본", "인사", SNAIL) }) : null,
        h("span", { class: "jn-room__label" }, h("span", { class: "jn-room__icon", svg: JN.Assets.areaIcon(a.id) }), h("span", { class: "jn-room__name", text: a.name })));
      roomVars(el, a);
      box.appendChild(el);
    }
    paintToday();
    show("scr-home");
  }
  function showSoon(a, text) {
    $("soonTitle").textContent = T("soon.title");
    $("soonText").textContent = text || T("soon.text", { name: subj(SNAIL), room: a.name });
    $("soon").hidden = false;
  }

  /* ---------- 2-1. 방 안 ---------- */
  function openRoom(areaId) {
    const a = areaOf(areaId); A.room = areaId;
    roomVars($("scr-room"), a);
    $("roomBand").innerHTML = JN.Assets.roomArt(a.id);
    $("roomIcon").innerHTML = JN.Assets.areaIcon(a.id);
    $("roomName").textContent = T("room.name", { name: a.name });
    $("roomPower").textContent = a.power;
    const box = $("gameCards"); box.textContent = "";
    for (const gid of a.games) {
      const def = JN.GAMES[gid]; if (!def) continue;
      const si = curStage(A.kid, A.data, gid);
      box.appendChild(h("button", { class: "gcard game jn-card", type: "button", "data-game": gid, onclick: () => startGame(gid) },
        h("span", { class: "ic", svg: JN.Assets.gameIcon(gid) }),
        h("span", { class: "txt" }, h("b", { text: def.name }), h("small", { class: "meta", text: T("game.now", { n: si + 1 }) }),
          def.stages.length <= 10 ? leaves(def.stages.length, si) : null),
        h("span", { class: "go", svg: Art.icon("다음") })));
    }
    saveData();
    show("scr-room");
  }

  /* ---------- 3. 놀이 공통 틀 ---------- */
  const timer = {
    t0: 0, acc: 0, running: false, iv: 0, hidden: false,
    reset() { this.stop(); this.acc = 0; this.paint(); },
    start() { if (this.running) return; this.t0 = performance.now(); this.running = true; clearInterval(this.iv); this.iv = setInterval(() => this.paint(), 100); this.paint(); },
    stop() { if (this.running) { this.acc += (performance.now() - this.t0) / 1000; this.running = false; } clearInterval(this.iv); this.paint(); return this.acc; },
    elapsed() { return this.acc + (this.running ? (performance.now() - this.t0) / 1000 : 0); },
    paint() { $("timerText").textContent = U.fmtClock(this.elapsed()); },
    hide() { this.hidden = true; syncTimerBox(); },
  };
  function syncTimerBox() { $("timerBox").hidden = timer.hidden || !(A.data && A.data.settings.showTimer); }

  /* ---------- 놀이 도중 끊김 안전 (뒤로가기·화면 끄기·다른 앱·전화·새로고침) ----------
     놀이 중에 화면이 숨으면(visibilitychange/pagehide) 이 한 곳에서 모두 멈춰요: 시간 재기 · 놀이 안의 기다림(ctx.later) · 소리·음성.
     그리고 '잠깐 멈췄어요' 카드(이어서 / 처음부터)를 띄워요. 놀이마다 따로 만들지 않아요.
     - 이어서: 멈춘 자리에서 그대로 (남은 기다림 시간 · 잰 시간 · 점수 그대로)
     - 처음부터: 이 판을 같은 단계의 새 문제로 다시 (끊긴 판은 기록·점수에 넣지 않아요) */
  const laters = new Set(), aliasOf = new Map();
  const nativeClear = window.clearTimeout.bind(window);
  function dropLater(e) { laters.delete(e); e.ids.forEach((i) => aliasOf.delete(i)); }
  /* 놀이가 clearTimeout(id) 로 취소해도, 멈췄다 다시 건 기다림까지 함께 취소돼요 */
  window.clearTimeout = function (id) {
    const e = aliasOf.get(id);
    if (e) { e.dead = true; nativeClear(e.id); dropLater(e); }
    nativeClear(id);
  };
  function armLater(e) {
    e.t0 = performance.now();
    e.id = setTimeout(() => { dropLater(e); if (!e.dead && e.ctx._alive) e.fn(); }, Math.max(0, e.left));
    e.ids.push(e.id); aliasOf.set(e.id, e);
  }
  function laterFor(ctx, fn, ms) {
    const e = { fn, left: ms, ctx, ids: [], dead: false, id: 0, t0: 0 };
    laters.add(e); armLater(e); A.timers.push(e.ids[0]);
    return e.ids[0];
  }
  A.pendingLaters = () => laters.size;
  /* 지금 '놀고 있는 판'(준비 안내 · 놀이 중)인지 — 칭찬·쉬기·눈쉬기·시간끝 화면은 따로 달라요 */
  function roundActive() {
    return A.screen === "scr-play" && !!A.ctx && A.ctx._alive && !A.ctx._done &&
      ["praise", "rest", "eyeRest", "timeUp"].every((id) => $(id).hidden);
  }
  function armPraise() {
    clearTimeout(A.praiseTm);
    const an = $("autoNext");
    an.classList.remove("run");
    requestAnimationFrame(() => requestAnimationFrame(() => an.classList.add("run")));
    A.praiseTm = setTimeout(afterPraise, JN.ms(CFG.PRAISE_MS)); A.timers.push(A.praiseTm);
  }
  function pauseRound() {
    JN.bgm.stop(); JN.speakStop(); JN.audioPause();
    if (A.screen === "scr-play" && !$("praise").hidden && !$("autoNext").hidden && A.praiseTm) { clearTimeout(A.praiseTm); A.praiseTm = 0; A.praiseWait = true; }   // 칭찬 화면: 저절로 넘어가기는 돌아온 뒤에
    if (A.paused || !roundActive()) return;
    A.paused = true;
    A.pauseWasTiming = timer.running; if (timer.running) timer.stop();
    const now = performance.now();
    laters.forEach((e) => { nativeClear(e.id); e.left = Math.max(0, e.left - (now - e.t0)); });
    A.pauseCount = (A.pauseCount || 0) + 1;   // 시험용 숫자
    if (A.inst && A.inst.visibility) { try { A.inst.visibility(true); } catch (e) { console.warn(e); } }
    $("pauseOwl").innerHTML = JN.Assets.owl("쉬어요", "기본", OWL);
    $("pauseTitle").textContent = T("pause.title");
    $("pauseText").textContent = T("pause.text");
    $("pauseBox").hidden = false;
    try { $("pauseGo").focus({ preventScroll: true }); } catch (e) { /* 포커스는 없어도 돼요 */ }
  }
  function resumeRound() {
    if (!A.paused) return;
    A.paused = false; $("pauseBox").hidden = true;
    laters.forEach((e) => armLater(e));
    if (A.pauseWasTiming) timer.start();
    if (A.inst && A.inst.visibility) { try { A.inst.visibility(false); } catch (e) { console.warn(e); } }
    const s = A.ctx && A.ctx.settings;
    if (s && s.bgm !== false) JN.bgm.start();
    if (!$("intro").hidden && s && s.voice !== false) JN.speak($("introText").textContent.replace(/ · /g, ", "));   // 준비 안내가 끊겼으면 다시 읽어 줘요
  }
  function restartRound() {
    A.paused = false; $("pauseBox").hidden = true;
    A.restartCount = (A.restartCount || 0) + 1;   // 시험용 숫자
    mountRound();
  }
  function comeBack() {   // 화면이 다시 보일 때: 멈춤 카드는 아이가 '이어서'를 누를 때까지 그대로 · 칭찬 화면은 다시 저절로 넘어가요
    if (A.praiseWait && !$("praise").hidden && !$("autoNext").hidden) armPraise();
    A.praiseWait = false;
    try { sessionStorage.removeItem("jn.resume"); } catch (e) { /* 무시 */ }   // 같은 화면으로 돌아온 거라 '새로고침 뒤 이어하기' 표시는 필요 없어요
    if (!A.paused && A.screen === "scr-play" && A.data && A.data.settings.bgm !== false && roundActive() && !JN.muted) JN.bgm.start();
  }
  U.tap($("pauseGo"), resumeRound);
  U.tap($("pauseRestart"), restartRound);
  A.pauseRound = pauseRound; A.resumeRound = resumeRound;

  function startGame(gid) {
    if (limitReached()) { A.gameId = gid; return showTimeUp(); }   // 보호자가 정한 하루 시간을 다 썼으면 새 놀이를 열지 않아요
    A.gameId = gid; A.run = null; A.room = JN.GAMES[gid].area; A.visitRounds = 0;
    $("playTitle").textContent = JN.GAMES[gid].name;
    $("playTitle").classList.toggle("long", JN.GAMES[gid].name.length > 8);   // "몸으로 따라 해요!" 처럼 긴 이름은 글자를 조금 작게
    show("scr-play");
    paintSound();
    mountRound();
  }
  function stopRound() {
    A.timers.forEach((t) => clearTimeout(t)); A.timers = [];
    laters.forEach((e) => { e.dead = true; nativeClear(e.id); dropLater(e); });
    A.paused = false; A.praiseTm = 0; A.praiseWait = false; $("pauseBox").hidden = true;
    try { sessionStorage.removeItem("jn.resume"); } catch (e) { /* 무시 */ }   // 놀이를 정상으로 떠났으면 '새로고침 뒤 이어하기' 표시도 지워요
    if (A.ctx) A.ctx._alive = false;
    JN.speakStop();
    if (A.inst && A.inst.destroy) { try { A.inst.destroy(); } catch (e) { console.warn(e); } }
    A.inst = null; A.ctx = null;
    timer.reset();
    $("praise").hidden = true; $("rest").hidden = true; $("intro").hidden = true; $("eyeRest").hidden = true;
  }
  /* 지금 큰 단계 안의 작은 걸음 (0부터). 큰 단계가 바뀌었으면 0 */
  function curStep(st, idx) { return st.stepAt === idx ? U.clamp(st.step || 0, 0, CFG.STEPS_PER_STAGE - 1) : 0; }
  function paintStageChip(def, idx, step) {
    const chip = $("stageChip"); chip.textContent = T("stage.chip", { n: idx + 1 }) + " ";
    if (def.stages.length <= 10) { chip.appendChild(leaves(def.stages.length, idx)); chip.appendChild(h("span", { class: "of-n", text: "/ " + def.stages.length })); }
    else chip.appendChild(h("span", { class: "of", text: "/ " + def.stages.length }));
    if (step != null && def.autoNext !== false) {   // 작은 걸음 점: "2단계 / 6  ●●●○○"
      const sd = leaves(CFG.STEPS_PER_STAGE, step); sd.classList.add("stepdots");
      sd.setAttribute("title", T("stage.step", { n: step + 1, of: CFG.STEPS_PER_STAGE }));
      chip.appendChild(document.createTextNode(" ")); chip.appendChild(sd);
    }
  }
  function mountRound() {
    stopRound();
    const gid = A.gameId, def = JN.GAMES[gid];
    const idx = curStage(A.kid, A.data, gid);
    const st = gameState(A.data, gid);
    st.mem = st.mem && typeof st.mem === "object" ? st.mem : {};
    const settings = gameSettings(A.data, gid);
    const board = $("board"), bottom = $("bottomLeft");
    board.textContent = ""; board.className = "board"; board.removeAttribute("style");
    bottom.textContent = ""; $("playStatus").textContent = ""; $("msgLine").textContent = "";
    $("hintBtn").hidden = true; hintFn = null;
    timer.hidden = false; syncTimerBox();
    const step = curStep(st, idx), stepFrac = CFG.STEPS_PER_STAGE > 1 ? step / (CFG.STEPS_PER_STAGE - 1) : 0;
    paintStageChip(def, idx, step);
    let stage = def.stages[idx];
    if (def.tune) { try { stage = def.tune(Object.assign({}, stage), stepFrac, step) || stage; } catch (e) { console.warn(e); } }
    $("missionIcon").innerHTML = JN.Assets.gameIcon(gid);
    $("sideOwl").innerHTML = JN.Assets.owl("기본", "기본", OWL);
    const ctx = A.ctx = {
      _alive: true, def, stage, step, stepFrac, stageIdx: idx, stages: def.stages, settings, mem: st.mem,
      board, bottom, timer, test: JN.TEST,
      practice: !Object.keys((A.data.firsts && A.data.firsts[gid]) || {}).length,   // 이 놀이를 아직 한 단계도 못 깬 '첫 판'이면 손짓 도우미가 켜져요 (새 놀이 5개)
      firstInVisit: !(A.visitRounds++),   // 놀이를 연 뒤 첫 판인지 (몸놀이 안전 안내를 한 번만 보여 주려고)
      alive() { return this._alive; },
      say(t) { if (this._alive) $("msgLine").textContent = t || ""; },
      sound(kind) { if (!A.paused) JN.sound(settings.sound, kind); },
      tone(f, d, v, dl) { if (!A.paused) JN.tone(settings.sound, f, d, v, dl); },
      hint(showIt, fn) {
        $("hintBtn").hidden = !showIt;
        hintFn = showIt ? () => { if (!ctx._alive) return; $("msgLine").textContent = T("play.hint.say", { name: subj(OWL) }); fn(); } : null;
      },
      status(node) { const s = $("playStatus"); s.textContent = ""; if (node) s.appendChild(node); },
      later(fn, ms) { return laterFor(ctx, fn, ms); },   // 놀이 도중 멈춤(pauseRound) 때 남은 시간이 함께 멈춰요
      saveMem() { saveData(); },
      finish(result) { if (ctx._alive && !ctx._done) { ctx._done = true; onFinish(ctx, result || {}); } },
    };
    let inst;
    try { inst = def.mount(ctx) || {}; } catch (e) { console.error(e); ctx.say(T("play.error")); return; }
    A.inst = inst;
    $("scr-play").classList.toggle("no-bottom", !bottom.children.length && $("hintBtn").hidden);
    if (inst.resize) requestAnimationFrame(() => { if (ctx._alive) inst.resize(); });
    // "준비~" 안내 → 시작
    const intro = $("intro");
    const text = def.intro ? def.intro(ctx.stage, settings, ctx) : "";
    $("introText").textContent = T("play.intro.ready") + (text ? " " + text : "");
    /* 말로 안내: 글을 아직 못 읽는 아이를 위해 할 일을 소리로 읽어 줘요 (보호자 설정에서 끌 수 있어요) */
    if (text && settings.voice !== false) JN.speak(String(text).replace(/ · /g, ", "));
    if (settings.bgm !== false) JN.bgm.start(); else JN.bgm.stop();
    intro.hidden = false;
    const go = () => { if (!ctx._alive || intro.hidden) return; intro.hidden = true; if (inst.start) inst.start(); };
    intro.onpointerdown = (e) => { e.preventDefault(); go(); };
    ctx.later(go, JN.ms(CFG.INTRO_MS));
  }

  function onFinish(ctx, r) {
    const def = ctx.def, gid = def.id, data = A.data, st = gameState(data, gid), idx = ctx.stageIdx;
    const time = U.r1(r.time != null ? r.time : timer.stop());
    timer.stop();
    const mode = ctx.settings.hintMode;
    const entry = Object.assign({ game: gid, stage: ctx.stage.id, stageNo: idx + 1, mode, hints: r.hints || 0, time,
      mistakes: r.mistakes || 0, cleared: !!r.cleared }, r.metrics || {});
    S.addRound(A.kid.id, entry);
    // 최고 기록 (아이 자기 기록과만, 힌트 방식별)
    let newBest = false;
    if (r.bestKey != null && typeof r.bestValue === "number") {
      const b = (data.bests[gid] = data.bests[gid] || {}), k = r.bestKey + "|" + mode, prev = b[k];
      const better = typeof prev === "number" && (r.higherBetter ? r.bestValue > prev : r.bestValue < prev);
      if (typeof prev !== "number" || better) b[k] = r.bestValue;
      newBest = better;
    }
    // 처음 깬 단계
    let firstClear = false;
    if (r.cleared) {
      const f = (data.firsts[gid] = data.firsts[gid] || {});
      if (!f[ctx.stage.id]) { f[ctx.stage.id] = entry.at; firstClear = true; }
    }
    // 힌트를 쓴 판이 이어지는지
    const struggled = (r.hints || 0) > 0 || (r.metrics && r.metrics.autoHints > 0);
    st.hintStreak = struggled ? (st.hintStreak || 0) + 1 : 0;
    // 다음 단계
    const advance = r.advance != null ? r.advance : !!r.cleared;
    let next = idx, allDone = false;
    let stay = false;   // 작은 걸음을 다 올라야 다음 큰 단계로 가요 (config.js STEPS_PER_STAGE)
    if (data.settings.autoNext && def.autoNext !== false) {
      const step = curStep(st, idx); st.stepAt = idx;
      if (advance) {
        st.missStreak = 0;
        const helped = struggled && mode !== "always";                        // '늘 힌트 보기' 아이는 힌트 때문에 멈추지 않게
        st.helpedAt = helped ? (st.helpedAt || 0) + 1 : 0;
        if (helped && st.helpedAt < 2) { st.step = step; stay = true; }      // 힌트로 깼으면 같은 걸음에서 한 번 더 다지기 (두 번째엔 올라가요)
        else if (helped) { st.helpedAt = 0; if (step + 1 < CFG.STEPS_PER_STAGE) { st.step = step + 1; stay = true; } else st.step = 0; }
        else if (step + 1 < CFG.STEPS_PER_STAGE) { st.step = step + 1; stay = true; }
        else st.step = 0;                                                     // 마지막 걸음을 깨면 다음 큰 단계로
      } else {
        st.missStreak = (st.missStreak || 0) + 1;
        st.step = step;
        if (st.missStreak >= CFG.STEP_DOWN_AFTER) { st.step = Math.max(0, step - 1); st.missStreak = 0; }   // 조용히 한 걸음 쉽게
      }
    }
    if (advance && !stay && data.settings.autoNext && def.autoNext !== false) {   // 몸놀이처럼 autoNext:false 인 놀이는 보호자가 단계를 직접 올려요
      let n = idx + 1;
      while (n < def.stages.length && !def.isStageOpen(n)) n++;
      if (n < def.stages.length) next = n; else allDone = firstClear;   // 마지막 단계는 처음 깬 때만 "모두 끝" 화면, 그 뒤엔 같은 단계를 계속 새 문제로
    }
    st.stage = next;
    // 전체 단계를 1단계부터 이어서 깬 총 시간 (숫자 찾기)
    let totalLine = "";
    if (def.trackTotal) {
      if (!A.run || !r.cleared) A.run = r.cleared ? A.run : null;
      if (r.cleared) {
        A.run = A.run || { start: idx, list: [] };
        A.run.list.push({ idx, time });
        if (allDone && A.run.start === 0 && A.run.list.length === def.stages.length) {
          const total = U.r1(A.run.list.reduce((a, x) => a + x.time, 0));
          const b = (data.bests[gid] = data.bests[gid] || {}), k = "total|" + mode;
          totalLine = T("praise.total", { time: U.fmtTime(total) }) + (typeof b[k] === "number" && total < b[k] ? T("praise.total.best") : "");
          if (typeof b[k] !== "number" || total < b[k]) b[k] = total;
          A.run = null;
        }
      }
    }
    let suggestIdx = -1;
    if (data.settings.suggestEasier && st.hintStreak >= CFG.HINT_STREAK_SUGGEST && idx > 0 && !allDone) {
      suggestIdx = openAtOrBelow(def, idx - 1);
      st.hintStreak = 0;
    }
    saveData();
    A.roundsSinceRest++; A.eyeRounds++; A.eyeSec += time;
    JN.sound(ctx.settings.sound, "finish");
    showPraise({
      title: r.title || T("praise.done"),
      line: [r.line, firstClear ? T("praise.firstclear", { n: idx + 1 }) : "", totalLine].filter(Boolean).join(" · "),
      time: r.showTime === false ? null : time, newBest, next, idx, allDone, suggestIdx, def,
    });
  }

  /* ---------- 4. 칭찬 ---------- */
  function showPraise(o) {
    A.praiseCount = (A.praiseCount || 0) + 1;   // 시험용 숫자 (화면에는 영향 없음)
    $("praiseOwl").innerHTML = JN.Assets.owl("응원", "만세", OWL);
    if (!$("praiseBgTall").firstChild) { $("praiseBgTall").innerHTML = JN.Assets.scene("praise", true); $("praiseBgWide").innerHTML = JN.Assets.scene("praise", false); }
    $("praiseStars").innerHTML = starSvg(true) + starSvg(true) + starSvg(true);   // 장식: 늘 칠한 별 3개 (점수 아님)
    $("praiseTitle").textContent = o.title;
    $("praiseLine").textContent = o.line;
    $("praiseStars").hidden = !CFG.SHOW_PRAISE_STARS;
    const tc = $("praiseTime");
    tc.hidden = o.time == null || !A.data.settings.showTimer;
    tc.querySelector("span").textContent = o.time != null ? U.fmtTime(o.time) : "";
    $("praiseBest").hidden = !o.newBest;
    const an = $("autoNext"), sg = $("suggest"), ad = $("allDone"), ag = $("againBox");
    an.hidden = true; sg.hidden = true; ad.hidden = true; ag.hidden = true; $("nextRow").hidden = true;
    an.classList.remove("run");
    A.praiseAt = performance.now();   // 칭찬 화면이 열린 때: 마지막 손가락 탭이 늦게 보내는 click 을 막는 데 써요
    $("praise").hidden = false;
    if (o.allDone) {
      $("praiseTitle").textContent = T("praise.all.title");
      ad.hidden = false;
      $("allAgain").onclick = () => { if (!praiseReady()) return; gameState(A.data, A.gameId).stage = 0; saveData(); afterPraise(); };
      $("allSame").onclick = () => { if (praiseReady()) afterPraise(); };
      $("allRoom").onclick = () => { if (!praiseReady()) return; stopRound(); openRoom(A.room); };
      return;
    }
    if (o.suggestIdx >= 0) {
      $("suggestText").textContent = T("praise.suggest.text", { name: subj(OWL), n: o.suggestIdx + 1 });
      $("suggestYes").textContent = T("praise.suggest.yes", { n: o.suggestIdx + 1 });
      $("suggestYes").onclick = () => { if (!praiseReady()) return; gameState(A.data, A.gameId).stage = o.suggestIdx; saveData(); afterPraise(); };
      $("suggestNo").onclick = () => { if (praiseReady()) afterPraise(); };
      sg.hidden = false;
      return;
    }
    if (o.def.autoRepeat === false) {   // 몸놀이: 자동으로 다음 판을 열지 않고 묻고 기다려요
      ag.hidden = false;   // 단추 동작은 아래 U.tap 으로 한 번만 달아 둬요
      return;
    }
    $("autoNextText").textContent = o.next > o.idx ? T("praise.autonext.stage", { n: o.next + 1 }) : T("praise.autonext.again");
    an.hidden = false;
    $("nextRow").hidden = false;   // 기다리는 동안에도 '한 번 더 / 다른 놀이 / 쉬기'를 바로 고를 수 있어요
    an.style.setProperty("--praise-ms", JN.ms(CFG.PRAISE_MS) / 1000 + "s");
    armPraise();
  }
  /* 몸놀이 "한 번 더 할까요?" 단추: U.tap 으로 달아서, 손가락으로 '했어요'를 누른 뒤 브라우저가 늦게 보내는 click 이
     같은 자리에 나타난 이 단추(특히 '그만할래요')를 누르지 않게 해요 (0.6초 안의 click 은 무시) */
  /* 칭찬 화면 단추는 열리고 CFG.PRAISE_TAP_GUARD_MS(진짜 시간) 동안 눌리지 않아요.
     놀이 마지막 탭(pointerdown 으로 판이 끝남) 뒤에 브라우저가 같은 자리로 보내는 click 이
     그 자리에 막 나타난 '다른 놀이'·'쉬기' 단추를 눌러 버리지 않게 해요 (아이가 모르는 사이 홈·쉬는 화면으로 가던 문제) */
  const praiseReady = () => performance.now() - (A.praiseAt || 0) >= CFG.PRAISE_TAP_GUARD_MS;
  const againOpen = () => !$("praise").hidden && !$("againBox").hidden && praiseReady();
  U.tap($("againYes"), () => { if (againOpen()) afterPraise(); });
  U.tap($("againNo"), () => { if (!againOpen()) return; $("praise").hidden = true; stopRound(); openRoom(A.room); });
  /* 칭찬 화면의 '한 번 더 / 다른 놀이 / 쉬기' (저절로 넘어가기를 기다리지 않고 바로) */
  const nextOpen = () => !$("praise").hidden && !$("nextRow").hidden && praiseReady();
  U.tap($("nextAgain"), () => { if (nextOpen()) afterPraise(); });
  U.tap($("nextOther"), () => { if (!nextOpen()) return; $("praise").hidden = true; stopRound(); renderHome(); });
  U.tap($("nextRest"), () => { if (!nextOpen()) return; $("praise").hidden = true; stopRound(); showRest(); });
  function afterPraise() {
    if ($("praise").hidden) return;
    $("praise").hidden = true;
    if (limitReached()) return showTimeUp();
    if (eyeDue()) return showEyeRest();
    const lim = A.data.settings.restEvery;
    if (lim && A.roundsSinceRest >= lim) showRest(); else mountRound();
  }

  /* ---------- 5-1. 눈 쉬기 (놀이 4판 또는 약 10분마다 부엉이가 20초) ---------- */
  function eyeDue() {
    if (JN.TEST && !JN.TEST_EYE) return false;   // 기본 자동 시험에서는 놀이 흐름을 끊지 않아요
    if (!A.data || A.data.settings.eyeRest === false) return false;
    return A.eyeRounds >= CFG.EYE_REST_ROUNDS || A.eyeSec >= CFG.EYE_REST_MINUTES * 60;
  }
  function showEyeRest() {
    stopRound();
    A.eyeRounds = 0; A.eyeSec = 0; A.roundsSinceRest = 0; A.eyeCount = (A.eyeCount || 0) + 1;   // eyeCount: 시험용 숫자
    $("eyeOwl").innerHTML = JN.Assets.owl("쉬어요", "기본", OWL);
    $("eyeTitle").textContent = T("eye.title", { name: U.withI(OWL) });
    $("eyeText").textContent = T("eye.text");
    let left = CFG.EYE_REST_SECONDS;
    $("eyeCount").textContent = left;
    $("eyeGo").textContent = T("eye.close");   // 처음부터 '닫고 계속 놀기'를 눌러 바로 놀 수 있어요 (강요 없음)
    $("eyeGo").hidden = false;
    $("eyeRest").hidden = false;
    const tick = () => {
      if ($("eyeRest").hidden) return;
      left--; $("eyeCount").textContent = Math.max(left, 0);
      if (left <= 0) { $("eyeText").textContent = T("eye.done"); $("eyeGo").textContent = T("eye.go"); $("eyeGo").hidden = false; }
      else A.timers.push(setTimeout(tick, JN.ms(1000)));
    };
    A.timers.push(setTimeout(tick, JN.ms(1000)));
  }
  $("eyeGo").onclick = () => { $("eyeRest").hidden = true; mountRound(); };
  $("eyeRoom").onclick = () => { $("eyeRest").hidden = true; stopRound(); openRoom(A.room); };

  /* ---------- 5-2. 하루 사용 시간 (보호자가 정한 분) ---------- */
  function limitReached() {
    if (!A.kid || !A.data) return false;
    const m = A.data.settings.dailyLimit;
    return !!m && S.today(A.kid.id).seconds >= m * 60;
  }
  function showTimeUp() {
    stopRound();
    $("timeUpOwl").innerHTML = JN.Assets.owl("웃음", "인사", OWL);
    $("timeUp").hidden = false;
  }
  $("timeUpBye").onclick = () => { $("timeUp").hidden = true; renderWho(); };

  /* ---------- 5. 잠깐 쉬어요 ---------- */
  function showRest() {
    $("restTitle").textContent = T("rest.title", { name: U.withI(SNAIL) });
    $("restGo").hidden = true;
    if (!$("restBgTall").firstChild) {
      $("restBgTall").innerHTML = JN.Assets.scene("rest", true); $("restBgWide").innerHTML = JN.Assets.scene("rest", false);
      $("breathRing").innerHTML = roughSvg("circle", [100, 100, 190], { stroke: JN.cssVar("--c-on-dark", "#FFF8EA"), strokeWidth: 2.6, roughness: 1.2 }, "0 0 200 200");
    }
    $("rest").hidden = false;
    let inhale = true; $("breathText").textContent = T("rest.in");
    const bt = setInterval(() => { if ($("rest").hidden) return clearInterval(bt); inhale = !inhale; $("breathText").textContent = inhale ? T("rest.in") : T("rest.out"); }, 4000);
    A.timers.push(setTimeout(() => { $("restGo").hidden = false; }, JN.ms(CFG.REST_BUTTON_MS)));
  }
  $("restGo").onclick = () => { $("rest").hidden = true; A.roundsSinceRest = 0; mountRound(); };
  $("restRoom").onclick = () => { $("rest").hidden = true; A.roundsSinceRest = 0; stopRound(); openRoom(A.room); };

  let hintFn = null;
  U.onTap($("hintBtn"), () => { if (hintFn) hintFn(); });

  /* ---------- 소리 버튼 ---------- */
  function paintSound() {
    const on = !!(A.data && A.data.settings.sound), b = $("soundBtn");
    b.innerHTML = Art.icon(on ? "소리켬" : "소리끔");
    b.setAttribute("aria-pressed", String(on));
    b.setAttribute("aria-label", on ? T("play.sound.on") : T("play.sound.off"));
  }
  $("soundBtn").onclick = () => {
    A.data.settings.sound = !A.data.settings.sound; saveData(); paintSound();
    if (A.ctx) A.ctx.settings.sound = A.data.settings.sound;
    if (A.inst && A.inst.soundChanged) A.inst.soundChanged(A.data.settings.sound);
    JN.muteAll(!A.data.settings.sound);   // 끄면 배경음·말 안내도 멈춤
    if (A.data.settings.sound && A.screen === "scr-play" && A.data.settings.bgm !== false) JN.bgm.start();
    JN.sound(A.data.settings.sound, "ok");
  };

  /* ---------- 6. 보호자 잠금 (한 자리 + 한 자리 덧셈, 틀리면 경고 없이 새 문제) ---------- */
  const lock = { a: 0, b: 0, val: "", ok: null, cancel: null };
  function newProblem() {
    lock.a = 1 + U.rnd(9); lock.b = 1 + U.rnd(9); lock.val = "";
    paintLock();
  }
  function paintLock() {
    $("lockQ").textContent = lock.a + " + " + lock.b + " =";
    $("lockVal").textContent = lock.val;
    if (!$("lockBox").firstChild) $("lockBox").innerHTML = roughSvg("rectangle", [3, 3, 80, 60], { stroke: JN.cssVar("--c-primary", "#5E6B2C"), strokeWidth: 2.4, roughness: 1.6 }, "0 0 86 66");
  }
  function lockThen(ok, cancel) {
    lock.ok = ok; lock.cancel = cancel;
    newProblem();
    show("scr-lock");
  }
  A.lockThen = lockThen;
  (function buildKeypad() {
    const kp = $("keypad");
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "지우기", "0", "확인"];
    for (const k of keys) {
      kp.appendChild(h("button", { type: "button", class: k === "확인" ? "ok" : k === "지우기" ? "del" : null, "data-key": k, "aria-label": k === "지우기" ? T("lock.del") : null, svg: k === "지우기" ? Art.icon("뒤로") : null,
        onclick: () => {
          if (k === "지우기") lock.val = lock.val.slice(0, -1);
          else if (k === "확인") {
            if (Number(lock.val) === lock.a + lock.b && lock.val !== "") { const f = lock.ok; lock.ok = null; f && f(); return; }
            newProblem(); return;
          } else if (lock.val.length < 2) lock.val += k;
          paintLock();
        } }, k === "지우기" ? null : k === "확인" ? T("lock.ok") : k));   // data-key 는 코드용 이름(바뀌지 않음), 화면 글자만 언어 파일에서
    }
    $("lockBack").onclick = () => { const c = lock.cancel; lock.ok = null; c ? c() : renderWho(); };
  })();

  /* ---------- 아이 추가·고치기 ---------- */
  const prof = { id: null, animal: Art.PROFILE_KINDS[0], color: CFG.PROFILE_COLORS[1], age: 5, from: "who" };
  function openProfile(id, from) {
    const p = id ? S.profiles().find((x) => x.id === id) : null;
    prof.id = p ? p.id : null; prof.from = from;
    prof.animal = p ? p.animal : Art.PROFILE_KINDS[S.profiles().length % 8];
    prof.color = p ? p.color : CFG.PROFILE_COLORS[(S.profiles().length + 1) % 8];
    prof.age = p ? p.age : 5;
    $("profTitle").textContent = p ? T("prof.title.edit") : T("prof.title.add");
    $("profNick").value = p ? p.nick : "";
    $("profDelete").hidden = !p;
    paintProfile();
    show("scr-profile");
  }
  function paintProfile() {
    const ag = $("profAnimals"); ag.textContent = "";
    for (const k of Art.PROFILE_KINDS) ag.appendChild(h("button", { type: "button", "aria-pressed": String(k === prof.animal), "aria-label": T("animal." + k),
      svg: Art.profile(k, { color: prof.color }), onclick: () => { prof.animal = k; paintProfile(); } }));
    const cg = $("profColors"); cg.textContent = "";
    CFG.PROFILE_COLORS.forEach((c, i) => cg.appendChild(h("button", { type: "button", "aria-pressed": String(c === prof.color), "aria-label": CFG.PROFILE_COLOR_NAMES[i],   // 색 이름은 config.js 가 언어 파일에서 가져와요
      onclick: () => { prof.color = c; paintProfile(); } }, h("i", { style: "background:" + c }))));
    $("ageVal").textContent = prof.age;
  }
  $("ageMinus").onclick = () => { prof.age = Math.max(CFG.AGE_MIN, prof.age - 1); paintProfile(); };
  $("agePlus").onclick = () => { prof.age = Math.min(CFG.AGE_MAX, prof.age + 1); paintProfile(); };
  $("profBack").onclick = () => (prof.from === "parent" ? renderParent() : renderWho());
  $("profSave").onclick = () => {
    const nick = $("profNick").value.trim();
    if (!nick) { $("profNick").focus(); $("profNick").classList.add("gentle"); setTimeout(() => $("profNick").classList.remove("gentle"), 450); return; }
    let p;
    if (prof.id) {
      const old = S.profiles().find((x) => x.id === prof.id);
      p = S.updateProfile({ id: prof.id, nick, animal: prof.animal, color: prof.color, age: prof.age });
      if (p && old && old.age !== p.age) {   // 나이가 바뀌면 직접 고르지 않은 놀이는 새 추천 단계로
        const d = S.child(p.id);
        for (const gid of JN.GAME_ORDER) if (typeof gameSet(d, gid).start !== "number") gameState(d, gid).stage = startStage(p, d, gid);
        S.saveChild(p.id, d);
      }
    } else {
      p = S.addProfile({ nick, animal: prof.animal, color: prof.color, age: prof.age });
      if (p) { const d = S.child(p.id); resetStages(p, d); S.saveChild(p.id, d); }
    }
    if (!p) return;
    if (A.kid && A.kid.id === p.id) { A.kid = p; A.data = S.child(p.id); }
    if (prof.from === "parent") { A.parentKid = p.id; renderParent(); } else renderWho();
  };
  $("profDelete").onclick = () => {
    const p = S.profiles().find((x) => x.id === prof.id);
    if (!p || !window.confirm(T("prof.delete.confirm", { name: p.nick }))) return;
    S.deleteProfile(p.id);
    if (A.kid && A.kid.id === p.id) { A.kid = null; A.data = null; }
    A.parentKid = null;
    renderParent();
  };

  /* ---------- 보호자 설정 ---------- */
  function openParent(fromGame) {
    const back = A.screen;
    const gid = fromGame ? A.gameId : null;
    if (fromGame) stopRound();
    lockThen(() => {
      A.backTo = { screen: back, game: gid };
      A.parentKid = A.kid ? A.kid.id : null;
      A.parentFocusGame = gid;
      renderParent();
    }, () => {
      if (gid) { show("scr-play"); mountRound(); } else show(back);
    });
  }
  function closeParent() {
    const b = A.backTo || { screen: "scr-who" };
    A.backTo = null;
    if (A.kid) {   // 지운 아이였으면 처음으로
      const p = S.profiles().find((x) => x.id === A.kid.id);
      if (!p) { A.kid = null; return renderWho(); }
      A.kid = p; A.data = S.child(p.id);
    }
    if (b.game && A.kid) return startGame(b.game);
    if (b.screen === "scr-room" && A.kid) return openRoom(A.room);
    if (b.screen === "scr-home" && A.kid) return renderHome();
    renderWho();
  }
  $("parentClose").onclick = closeParent;
  $("toRecords").onclick = () => JN.Records.open(A.parentKid);

  function kidTabs(box, selected, onPick, withAdd) {
    box.textContent = "";
    for (const p of S.profiles()) box.appendChild(h("button", { type: "button", "aria-pressed": String(p.id === selected), "data-kid": p.id, onclick: () => onPick(p.id) },
      h("i", { svg: avatar(p) }), h("span", { class: "nm", text: p.nick })));
    if (withAdd && S.profiles().length < CFG.MAX_CHILDREN)
      box.appendChild(h("button", { type: "button", class: "addtab", id: "addKidTab", onclick: () => openProfile(null, "parent") }, h("i", { svg: Art.icon("더하기") }), T("parent.tab.add")));
  }
  A.kidTabs = kidTabs;

  function toggleRow(label, sub, value, onChange, id) {
    const inp = h("input", { type: "checkbox", "aria-label": label, id });
    inp.checked = !!value;
    const txt = h("span", { class: "jn-toggle__text", "aria-hidden": "true", text: value ? T("common.on") : T("common.off") });
    inp.addEventListener("change", () => { txt.textContent = inp.checked ? T("common.on") : T("common.off"); onChange(inp.checked); });
    return h("div", { class: "jn-row" }, h("span", { class: "lbl" }, h("b", { text: label }), sub ? h("small", { text: sub }) : null),
      h("span", { class: "tg" }, txt, h("label", { class: "jn-toggle" }, inp, h("span"))));
  }
  function stepperRow(label, sub, value, min, max, fmt, onChange, id) {
    const b = h("b", { text: fmt(value), id });
    let v = value;
    const set = (d) => { v = U.clamp(v + d, min, max); b.textContent = fmt(v); onChange(v); };
    return h("div", { class: "jn-row" }, h("span", { class: "lbl" }, h("b", { text: label }), sub ? h("small", { text: sub }) : null),
      h("span", { class: "stepper" }, h("button", { type: "button", "aria-label": T("stepper.less", { label }), onclick: () => set(-1) }, "−"), b,
        h("button", { type: "button", "aria-label": T("stepper.more", { label }), onclick: () => set(1) }, "+")));
  }
  function selectRow(label, sub, options, value, onChange, id) {
    const s = h("select", { "aria-label": label, id });
    for (const [v, t, dis] of options) { const o = h("option", { value: String(v), disabled: !!dis }, t); s.appendChild(o); }
    s.value = String(value);
    s.addEventListener("change", () => onChange(s.value));
    return h("div", { class: "jn-row" }, h("span", { class: "lbl" }, h("b", { text: label }), sub ? h("small", { text: sub }) : null), s);
  }
  A.ui = { toggleRow, stepperRow, selectRow };

  function renderParent() {
    const list = S.profiles();
    if (!list.some((p) => p.id === A.parentKid)) A.parentKid = list.length ? list[0].id : null;
    kidTabs($("parentTabs"), A.parentKid, (id) => { A.parentKid = id; renderParent(); }, true);
    const body = $("parentBody"); body.textContent = "";
    const kid = list.find((p) => p.id === A.parentKid);
    if (!kid) {
      body.appendChild(h("p", { class: "care", text: T("parent.nokid") }));
      body.appendChild(deviceCard());
    if (JN.Unlock && JN.Unlock.enabled()) body.appendChild(unlockCard());
      body.appendChild(privacyBox());
      body.appendChild(aboutBox());
      show("scr-parent");
      return;
    }
    const data = S.child(kid.id);
    const save = () => { S.saveChild(kid.id, data); if (A.kid && A.kid.id === kid.id) A.data = data; };
    const s = data.settings;

    body.appendChild(todayCard(kid, data, save));
    const cols = h("div", { class: "set-cols" });
    body.appendChild(cols);
    cols.appendChild(h("section", { class: "setcard jn-card" }, h("h2", null, h("i", { svg: Art.icon("설정") }), T("parent.way.title", { name: U.withI(kid.nick) })),
      h("div", { class: "jn-row" }, h("span", { class: "lbl" }, h("b", { text: kid.nick }), h("small", { text: T("parent.kid.meta", { age: kid.age, animal: T("animal." + kid.animal) }) })),
        h("button", { class: "jn-btn", type: "button", id: "editKid", onclick: () => openProfile(kid.id, "parent") }, h("i", { svg: Art.icon("고치기") }), T("parent.edit"))),
      toggleRow(T("parent.from1"), T("parent.from1.sub"), s.from1, (v) => { s.from1 = v; resetStages(kid, data); save(); renderParent(); }, "set-from1"),
      toggleRow(T("parent.sound"), T("parent.sound.sub"), s.sound, (v) => { s.sound = v; save(); }, "set-sound"),
      toggleRow(T("parent.bgm"), T("parent.bgm.sub"), s.bgm !== false, (v) => { s.bgm = v; save(); }, "set-bgm"),
      toggleRow(T("parent.voice"), T("parent.voice.sub"), s.voice !== false, (v) => { s.voice = v; save(); }, "set-voice"),
      toggleRow(T("parent.timer"), null, s.showTimer, (v) => { s.showTimer = v; save(); }, "set-timer"),
      toggleRow(T("parent.autonext"), null, s.autoNext, (v) => { s.autoNext = v; save(); }, "set-autonext"),
      toggleRow(T("parent.suggest"), T("parent.suggest.sub", { n: CFG.HINT_STREAK_SUGGEST }), s.suggestEasier, (v) => { s.suggestEasier = v; save(); }, "set-suggest"),
      stepperRow(T("parent.rest"), T("parent.rest.sub"), s.restEvery, 0, 10, (v) => (v ? T("parent.rest.n", { n: v }) : T("parent.rest.none")), (v) => { s.restEvery = v; save(); }, "set-rest")));

    const seg = h("div", { class: "jn-seg", role: "group", "aria-label": T("parent.hint.title") });
    for (const m of Object.keys(CFG.HINT_MODES)) seg.appendChild(h("button", { type: "button", "aria-pressed": String(s.hintMode === m), "data-mode": m,
      onclick: () => { s.hintMode = m; save(); renderParent(); } }, CFG.HINT_MODES[m]));
    cols.appendChild(h("section", { class: "setcard jn-card" }, h("h2", null, h("i", { svg: Art.icon("힌트") }), T("parent.hint.title")),
      h("div", { class: "jn-row col" }, h("span", { class: "lbl" }, h("b", { text: T("parent.hint.label") }), h("small", { text: T("parent.hint.sub") })), seg),
      h("div", { class: "tip" }, h("span", { class: "m", svg: JN.Assets.snail("웃음", "기본", SNAIL) }),
        h("p", { text: T("parent.hint.tip") }))));

    const games = h("section", { class: "setcard jn-card" }, h("h2", null, h("i", { svg: Art.icon("별") }), T("parent.games.title")),
      h("p", { class: "care", text: T("parent.games.note") }));
    for (const gid of JN.GAME_ORDER) games.appendChild(gameBox(kid, data, gid, save));
    body.appendChild(games);
    body.appendChild(deviceCard());
    if (JN.Unlock && JN.Unlock.enabled()) body.appendChild(unlockCard());
    body.appendChild(privacyBox());
    body.appendChild(aboutBox());
    show("scr-parent");
    if (A.parentFocusGame) {
      const d = body.querySelector('[data-gameset="' + A.parentFocusGame + '"]');
      if (d) { d.open = true; setTimeout(() => d.scrollIntoView({ block: "start" }), 0); }
      A.parentFocusGame = null;
    }
  }
  /* 보호자 요약: 오늘 한 놀이 · 걸린 시간 · 하루 사용 시간 · 눈 쉬기. 점수나 평가는 보여 주지 않아요 (기록은 이 기기 안에만) */
  function todayCard(kid, data, save) {
    const t = S.today(kid.id), s = data.settings;
    const names = Object.keys(t.byGame).map((g) => (JN.GAMES[g] ? JN.GAMES[g].name : g) + " " + T("today.rounds", { n: t.byGame[g] })).join(" · ");
    return h("section", { class: "setcard jn-card", id: "todayCard" }, h("h2", null, h("i", { svg: Art.icon("기록") }), T("today.title")),
      h("div", { class: "today-grid" },
        h("div", null, T("today.played"), h("b", { id: "todayRounds", text: T("today.rounds", { n: t.rounds }) })),
        h("div", null, T("today.time"), h("b", { id: "todayTime", text: t.seconds ? U.fmtTime(t.seconds) : T("today.zero") }))),
      h("p", { class: "care", id: "todayGames", text: names || T("today.none") }),
      h("p", { class: "care", id: "todayLocal", text: T("rec.local") }),
      selectRow(T("today.limit"), T("today.limit.sub"), CFG.DAILY_LIMITS.map((m) => [m, m ? T("today.limit.min", { n: m }) : T("today.limit.off")]), s.dailyLimit,
        (v) => { s.dailyLimit = Number(v); save(); }, "set-daylimit"),
      toggleRow(T("today.eye"), T("today.eye.sub", { rounds: CFG.EYE_REST_ROUNDS, minutes: CFG.EYE_REST_MINUTES, name: OWL, sec: CFG.EYE_REST_SECONDS }),
        s.eyeRest !== false, (v) => { s.eyeRest = v; save(); }, "set-eyerest"));
  }
  function gameBox(kid, data, gid, save) {
    const def = JN.GAMES[gid], area = areaOf(def.area), gs = gameSet(data, gid);
    const cur = curStage(kid, data, gid), rec = JN.ageStage(gid, kid.age);
    const startTxt = data.settings.from1 ? T("gset.from1") : typeof gs.start === "number" ? T("gset.chosen", { n: gs.start + 1 }) : T("gset.rec", { n: rec + 1 });
    const d = h("details", { class: "gameset", "data-gameset": gid },
      h("summary", null, h("span", { class: "gi", style: "background:" + area.tint, svg: JN.Assets.gameIcon(gid) }), h("span", { text: def.name }),
        h("small", null, T("game.now", { n: cur + 1 }), h("br"), startTxt)));
    const inner = h("div", { class: "inner" });
    inner.appendChild(h("p", { class: "care", text: T("gset.power", { power: area.power }) + (def.parentNote ? ". " + def.parentNote : "") }));
    if (def.parentSafety) inner.appendChild(h("p", { class: "care safety-note" }, h("b", { text: def.parentSafety })));
    const opts = [["auto", T("gset.opt.rec", { n: rec + 1 })]].concat(def.stages.map((st, i) =>
      [i, T("gset.opt.stage", { n: i + 1, name: def.stageLabel ? def.stageLabel(st) : st.name }) + (def.isStageOpen(i) ? "" : T("gset.opt.locked")), !def.isStageOpen(i)]));
    inner.appendChild(selectRow(T("gset.start"), data.settings.from1 ? T("gset.start.sub.from1") : T("gset.start.sub"),
      opts, typeof gs.start === "number" ? gs.start : "auto", (v) => {
        gs.start = v === "auto" ? null : Number(v);
        gameState(data, gid).stage = startStage(kid, data, gid);
        save(); renderParentKeepOpen(gid);
      }, "start-" + gid));
    for (const f of def.extraSettings) {
      const val = gameSettings(data, gid)[f.key];
      if (f.type === "bool") inner.appendChild(toggleRow(f.label, f.sub, val, (v) => { gs[f.key] = v; save(); }, "x-" + gid + "-" + f.key));
      else inner.appendChild(selectRow(f.label, f.sub, f.options, val, (v) => {
        const o = f.options.find((x) => String(x[0]) === v); gs[f.key] = o ? o[0] : f.def;
        for (const g of f.shareWith || []) if (JN.GAMES[g]) gameSet(data, g)[f.key] = gs[f.key];   // 같은 값을 쓰는 놀이(예: 낱말 소리)
        save();
        if ((f.shareWith || []).length) renderParentKeepOpen(gid);
      }, "x-" + gid + "-" + f.key));
    }
    if (def.memReset) {   // 예: 달롱 건너기 '새 꽃길 시작' — 확인 한 번 뒤 이 아이의 꽃 수만 0 으로 (놀이 기록은 그대로)
      const m = def.memReset, gst = gameState(data, gid);
      const nowN = Math.min(m.max, (gst.mem && gst.mem[m.key]) | 0);
      const msg = h("small", { id: "memreset-msg-" + gid, text: JN.t(m.nowKey || "g.dalrong.reset.now", { n: nowN, max: m.max }) });
      inner.appendChild(h("div", { class: "jn-row" }, h("span", { class: "lbl" }, h("b", { text: m.label }), h("small", { text: m.sub }), h("br"), msg),
        h("button", { class: "jn-btn", type: "button", id: "memreset-" + gid, onclick: () => {
          if (!window.confirm(m.confirm)) return;
          gst.mem = gst.mem && typeof gst.mem === "object" ? gst.mem : {};
          gst.mem[m.key] = 0; save();
          renderParentKeepOpen(gid);
        } }, m.button)));
    }
    if (def.hintHelp) {
      const ul = h("ul");
      for (const m of Object.keys(CFG.HINT_MODES)) ul.appendChild(h("li", { text: CFG.HINT_MODES[m] + ": " + def.hintHelp[m] }));
      inner.appendChild(h("div", { class: "care" }, h("b", { text: T("gset.hinthelp") }), ul));
    }
    d.appendChild(inner);
    return d;
  }
  function renderParentKeepOpen(gid) { A.parentFocusGame = gid; renderParent(); }
  function privacyBox() {
    return h("div", { class: "care", id: "privacyBox" },
      h("b", { text: T("privacy.title") }), h("br"),
      T("privacy.what"), h("br"),
      T("privacy.where"), h("br"),
      T("privacy.github"), h("br"),
      T("privacy.delete"), h("br"), h("br"),
      h("b", { id: "careNotice", text: T("privacy.care") }), h("br"),
      h("span", { id: "noRecordNotice", text: T("privacy.norecord") }), T("privacy.nomic"), h("br"),
      T("privacy.short"));
  }
  /* 운영자 안내: 무료 비영리 · 연락처(CONTACT 가 있을 때만) · 사용한 공개 소프트웨어 */
  function aboutBox() {
    return h("div", { class: "care", id: "aboutBox" },
      h("b", { text: T("about.title") }), h("br"),
      T("about.free"), h("br"),
      CFG.CONTACT ? h("span", { id: "contactLine", text: T("about.contact", { contact: CFG.CONTACT }) }) : null, CFG.CONTACT ? h("br") : null,
      T("about.oss"));
  }
  /* 이 기기 설정: 그림 질감 줄이기 (느린 기기용, 아이 모두 공통) */
  function deviceCard() {
    return h("section", { class: "setcard jn-card" }, h("h2", null, h("i", { svg: Art.icon("설정") }), T("device.title")),
      toggleRow(T("device.lite"), T("device.lite.sub"), isLite(), (v) => { setLite(v); renderParent(); }, "set-lite"),
      installRow(),
      h("div", { class: "jn-row", id: "onbRow" }, h("span", { class: "lbl" }, h("b", { text: T("device.onb") }), h("small", { text: T("device.onb.sub") })),
        h("button", { class: "jn-btn", type: "button", id: "onbAgain", text: T("device.onb.btn"), onclick: () => A.openOnboarding() })));
  }
  /* 해제 코드 (뼈대 · CONFIG.UNLOCK.ENABLED 가 켜졌을 때만 보여요). 덧셈 잠금 뒤 보호자 화면에만 있고, 사는 단추·안내는 없어요 */
  function unlockCard() {
    const Un = JN.Unlock;
    const input = h("textarea", { id: "unlockInput", class: "unlock-input", rows: "3", spellcheck: "false", autocomplete: "off", autocapitalize: "characters",
      placeholder: T("unlock.ph"), "aria-label": T("unlock.title") });
    const msg = h("p", { id: "unlockMsg", class: "care", role: "status", "aria-live": "polite" });
    const list = h("div", { id: "unlockList", class: "care" });
    function fill() {
      list.textContent = "";
      const codes = Un.saved();
      if (!codes.length) return;
      list.appendChild(h("b", { text: T("unlock.list", { n: codes.length }) }));
      for (const c of codes) list.appendChild(h("div", { class: "unlock-item", text: T("unlock.item", { tail: String(c.serial).slice(-6), bundle: c.bundle }) }));
    }
    const btn = h("button", { class: "jn-btn jn-btn--primary", type: "button", id: "unlockBtn", text: T("unlock.btn"), onclick: async () => {
      btn.disabled = true;
      const r = await Un.add(input.value);
      btn.disabled = false;
      msg.dataset.result = r.ok ? (r.dup ? "dup" : "ok") : r.why;
      msg.textContent = r.ok ? (r.dup ? T("unlock.dup") : T("unlock.ok", { bundle: r.bundle })) : r.why === "nocrypto" ? T("unlock.nocrypto") : T("unlock.bad");
      if (r.ok) input.value = "";
      fill();
    } });
    fill();
    return h("section", { class: "setcard jn-card", id: "unlockCard" }, h("h2", null, h("i", { svg: Art.icon("설정") }), T("unlock.title")),
      h("div", { class: "jn-row col" }, h("span", { class: "lbl" }, h("small", { text: T("unlock.sub") })), input, btn), msg, list);
  }
  /* 앱으로 설치: 브라우저가 설치할 수 있다고 알려 줄 때만 단추가 나와요. 설치 방법 안내 페이지 링크는 늘 있어요. */
  function installRow() {
    const I = JN.Install;
    const sub = h("small", { id: "installSub" });
    const btn = h("button", { class: "jn-btn jn-btn--primary", type: "button", id: "installBtn", hidden: true, onclick: () => I.prompt().then(sync) }, T("install.btn"));
    const help = h("a", { class: "jn-btn", id: "installHelp", href: "install.html" }, T("install.help"));
    const print = h("a", { class: "jn-btn", id: "printHelp", href: "print.html" }, T("install.print"));   // 인쇄용 활동지(보호자용): 보호자 설정 안에만 있어요
    function sync() {
      btn.hidden = !(I && I.canPrompt() && !I.isStandalone());
      sub.textContent = !I ? "" : I.isStandalone() ? T("install.already") : T("install.sub");
    }
    if (I) { I.onChange(sync); sync(); }
    return h("div", { class: "jn-row col", id: "installRow" }, h("span", { class: "lbl" }, h("b", { text: T("install.btn") }), sub), btn, help, print);
  }
  function isLite() { return !!S.getApp().lite; }
  function setLite(v) { const a = S.getApp(); a.lite = !!v; S.setApp(a); applyLite(); }
  function applyLite() {
    const lite = isLite();
    Art.config({ texture: !lite });
    document.documentElement.classList.toggle("lite", lite);
  }
  A.applyLite = applyLite;
  A.privacyBox = privacyBox;

  /* ---------- 버튼 연결 ---------- */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const act = b.dataset.act;
    if (act === "parent") openParent(false);
    else if (act === "parent-game") openParent(true);
    else if (act === "who") renderWho();
    else if (act === "home") renderHome();
    else if (act === "room") { stopRound(); openRoom(A.room); }
    else if (act === "close-soon") $("soon").hidden = true;
  });
  $("soon").addEventListener("click", (e) => { if (e.target.id === "soon") $("soon").hidden = true; });
  /* ---------- 폰 '뒤로가기': 앱을 바로 나가지 않고 화면의 뒤로/닫기 단추를 누른 것처럼 한 단계씩 돌아가요 ----------
     '가드' 기록을 하나 쌓아 두고, 뒤로가기가 오면 한 단계 돌아간 뒤 다시 쌓아요. 첫 화면(누가 놀까요)에서는 원래대로 나가요. */
  function backOneStep() {
    if (!$("soon").hidden) { $("soon").hidden = true; return true; }
    if (!$("onboard").hidden) { $("onbSkip").hidden ? $("onbNext").click() : $("onbSkip").click(); return true; }   // 처음 안내에서 뒤로가기 = 건너뛰기
    const click = (sel) => { const el = document.querySelector(sel); if (el) { el.click(); return true; } return false; };
    switch (A.screen) {
      case "scr-play": return click('#scr-play [data-act="room"]');
      case "scr-room": return click('#scr-room [data-act="home"]');
      case "scr-home": return click('#scr-home [data-act="who"]');
      case "scr-lock": return click("#lockBack");
      case "scr-profile": return click("#profBack");
      case "scr-parent": return click("#parentClose");
      case "scr-records": return click("#recBack");
      default: return false;
    }
  }
  /* 안드로이드 크롬은 '사람이 누르지 않은 채로' 기록을 쌓은 화면을 뒤로가기 때 건너뛰어요(기록 조작 방지 규칙).
     예전에는 앱을 열자마자, 그리고 뒤로가기를 받을 때마다 손길 없이 가드를 쌓아서, 놀이에서 뒤로가기를 누르면
     가드를 건너뛰고 앱이 그냥 닫혔어요(2026-11-28 사용자 제보).
     이제는 화면을 누르는 그 순간에만 '건너뛰지 않는' 가드를 쌓아요. 뒤로가기를 받은 직후에도 일단 하나 쌓고(혹시 모를 때를 위해),
     다음에 화면을 누를 때 하나 더 쌓아 그 자리를 단단하게 해요. */
  var guardOn = false, needFresh = false;   // var: 맨 처음 화면을 그릴 때(이 줄보다 먼저) 불려도 괜찮게
  function pressedNow() {
    const ua = navigator.userActivation;
    return !ua || ua.isActive;   // 이 기능이 없는 브라우저(옛 사파리 등)는 예전처럼 바로 쌓아요
  }
  function pushGuard() { try { history.pushState({ jn: "guard" }, ""); } catch (e) { /* 기록을 못 쓰는 브라우저면 원래대로 */ } }
  function armBackGuard() {
    if (!pressedNow()) return;
    if (!guardOn) { pushGuard(); guardOn = true; needFresh = false; }
    else if (needFresh) { pushGuard(); needFresh = false; }
  }
  A.armBackGuard = armBackGuard;
  try {
    history.replaceState({ jn: "base" }, "");
    window.addEventListener("popstate", () => {
      guardOn = false;
      if (backOneStep() || A.screen !== "scr-who") { pushGuard(); guardOn = true; needFresh = true; }   // 첫 화면이 아니면 앱을 닫지 않아요
      else history.back();   // 첫 화면(누가 놀까요)에서는 원래대로 나가요
    });
    ["pointerup", "touchend", "click", "keydown"].forEach((t) =>
      window.addEventListener(t, (e) => { if (e.isTrusted && A.screen !== "scr-who") armBackGuard(); }, true));
  } catch (e) { /* 기록을 못 쓰는 브라우저면 원래대로 */ }
  document.addEventListener("contextmenu", (e) => { if (!e.target.closest("input,textarea")) e.preventDefault(); });
  let rz = 0;
  window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (A.inst && A.inst.resize) A.inst.resize(); }, 120); });
  /* 화면 끄기 · 다른 앱 · 전화 · 탭 바꾸기 · 홈으로 나가기: 놀이 도중이면 한꺼번에 멈추고 '이어서 / 처음부터' 카드를 보여요 */
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { saveResumeMark(); pauseRound(); } else comeBack();   // 숨는 순간에 표시를 남겨요: 폰이 백그라운드 탭을 몰래 꺼 버려도(pagehide 없이) 다시 켜질 때 이어하기를 물을 수 있어요
  });
  window.addEventListener("pagehide", () => { saveResumeMark(); pauseRound(); });   // 새로고침·닫기 직전에도 (사파리는 pagehide 만 올 때가 있어요)
  document.addEventListener("freeze", () => pauseRound());
  window.addEventListener("pageshow", (e) => { if (e.persisted) comeBack(); });

  /* 새로고침·앱이 꺼졌다 켜졌을 때: 놀던 놀이를 잊지 않고 '이어서 / 처음부터'를 물어요.
     기록은 판이 끝날 때마다 이미 저장돼 있어서 그대로예요. 표시는 이 탭에만 잠깐(sessionStorage) 남기고, 한 번 보면 지워요. */
  const RESUME_KEY = "jn.resume";
  function saveResumeMark() {
    try {
      if (A.kid && A.gameId && A.screen === "scr-play" && A.ctx && A.ctx._alive && !A.ctx._done) sessionStorage.setItem(RESUME_KEY, JSON.stringify({ kid: A.kid.id, game: A.gameId }));
    } catch (e) { /* 저장 못 해도 놀이는 계속 */ }
  }
  function takeResumeMark() {
    try {
      const raw = sessionStorage.getItem(RESUME_KEY); sessionStorage.removeItem(RESUME_KEY);
      const m = raw && JSON.parse(raw);
      if (m && typeof m.kid === "string" && typeof m.game === "string" && S.profiles().some((p) => p.id === m.kid) && JN.GAMES[m.game] &&
          !(CFG.CLOSED_AREAS || []).includes(JN.GAMES[m.game].area)) return m;
    } catch (e) { /* 이상한 표시는 무시 */ }
    return null;
  }
  function offerResume(m) {
    pickKid(m.kid); openRoom(JN.GAMES[m.game].area);
    $("resumeTitle").textContent = T("resume.title");
    $("resumeText").textContent = T("resume.text", { game: JN.GAMES[m.game].name });
    $("resumeOwl").innerHTML = JN.Assets.owl("웃음", "기본", OWL);
    $("resumeGo").onclick = () => { $("resumeBox").hidden = true; startGame(m.game); };
    $("resumeNew").onclick = () => { $("resumeBox").hidden = true; renderWho(); };
    $("resumeBox").hidden = false;
    A.resumeOffered = (A.resumeOffered || 0) + 1;   // 시험용 숫자
  }

  A.renderWho = renderWho; A.renderParent = renderParent; A.renderHome = renderHome; A.openRoom = openRoom; A.startGame = startGame;
  A.pickKid = pickKid; A.stopRound = stopRound; A.mountRound = mountRound; A.gameState = gameState; A.gameSettings = gameSettings;

  /* ---------- 새 버전 알림 (서비스워커 업데이트) ----------
     새 sw.js 가 내려받아지면 '기다리는 중(waiting)'이 돼요. 그때 '새 놀이가 왔어요' 단추를 보여 주고,
     누르면 새 버전에게 "지금 바꿔요"(SKIP_WAITING)를 보내고, 바뀌면 화면을 새로고침해요. 기록은 localStorage 라 그대로예요. */
  function watchUpdate(reg) {
    if (!reg) return;
    const ready = (w) => { if (w && navigator.serviceWorker.controller) { A.updateWorker = w; A.updateReady = true; paintUpdateBtn(); } };
    if (reg.waiting) ready(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      if (w) w.addEventListener("statechange", () => { if (w.state === "installed") ready(w); });
    });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) reg.update().catch(() => {}); });
    reg.update().catch(() => {});
  }
  let reloading = false;
  $("updateBtn").onclick = () => {
    const w = A.updateWorker;
    if (!w) { location.reload(); return; }
    $("updateBtn").disabled = true;
    if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("controllerchange", () => { if (!reloading) { reloading = true; location.reload(); } });
    w.postMessage({ type: "SKIP_WAITING" });
    setTimeout(() => { if (!reloading) { reloading = true; location.reload(); } }, 3000);   // 혹시 신호가 안 와도 새로고침
  };

  /* ---------- 5-5. 처음 안내 (3장) ----------
     처음 여는 기기(아이 목록이 비어 있고 아직 안 봤을 때)에서만 자동으로 떠요. 건너뛰기·끝내기를 하면 jnp.app 의 onboarded 에 true 를 남겨요.
     이미 아이가 있는 기기는 자동으로 뜨지 않고(저장된 정보는 건드리지 않아요), 보호자 설정 → 이 기기 → '처음 안내 다시 보기'로 볼 수 있어요.
     시험 주소(?test=1)에서는 저절로 뜨지 않아요(다른 시험이 막히지 않게). */
  const ONB = [{ n: 1, items: ["a", "b", "c"] }, { n: 2, items: ["a", "b", "c"] }, { n: 3, items: ["a", "b", "c"] }];
  const onb = { i: 0 };
  function onbPaint() {
    const page = ONB[onb.i], last = onb.i === ONB.length - 1;
    $("onbStep").textContent = T("onb.step", { n: onb.i + 1, total: ONB.length });
    $("onbTitle").textContent = T("onb." + page.n + ".title");
    const ul = $("onbList"); ul.textContent = "";
    for (const k of page.items) ul.appendChild(h("li", { text: T("onb." + page.n + "." + k, { name: subj(OWL) }) }));
    $("onbBack").hidden = onb.i === 0;
    $("onbNext").textContent = T(last ? "onb.start" : "onb.next");
    $("onbSkip").hidden = last;
    $("onbOwl").innerHTML = JN.Assets.owl("웃음", onb.i === 2 ? "가리키기" : "인사", OWL);
    $("onbNext").focus();
  }
  function onbClose() {
    $("onboard").hidden = true;
    const ap = S.getApp(); ap.onboarded = true; S.setApp(ap);
    if (A.screen === "scr-who") renderWho();
  }
  function onbOpen() { onb.i = 0; $("onboard").hidden = false; onbPaint(); }
  $("onbNext").onclick = () => { if (onb.i >= ONB.length - 1) onbClose(); else { onb.i++; onbPaint(); } };
  $("onbBack").onclick = () => { if (onb.i > 0) { onb.i--; onbPaint(); } };
  $("onbSkip").onclick = onbClose;
  A.openOnboarding = onbOpen;
  function maybeOnboard(force) {
    if (JN.TEST && !force) return;   // 시험 주소에서는 저절로 뜨지 않아요 (시험이 직접 maybeOnboard(true) 를 불러요)
    if (S.getApp().onboarded || S.profiles().length) return;
    onbOpen();
  }
  A.maybeOnboard = maybeOnboard;

  /* ---------- 시작 ---------- */
  applyLite();
  fillArt(document.body);
  renderWho();
  { const rm = takeResumeMark(); if (rm) offerResume(rm); else maybeOnboard(); }

  /* 웹(http/https)으로 열었을 때만: 홈 화면 앱(manifest) + 오프라인 캐시(service worker). 더블클릭(file://)이면 조용히 건너뛰어요. */
  if (/^https?:$/.test(location.protocol)) {
    document.head.appendChild(h("link", { rel: "manifest", href: "manifest.json" }));
    if ("serviceWorker" in navigator && window.isSecureContext) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").then(watchUpdate).catch(() => { /* 캐시가 안 돼도 놀이는 돼요 */ });
      });
    }
  }
})();
