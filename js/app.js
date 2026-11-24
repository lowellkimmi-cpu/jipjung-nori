/* =========================================================
   집중 놀이터 앱 — 화면 바꾸기(한 페이지 안), 아이 고르기, 영역 방, 놀이 공통 틀,
   칭찬·잠깐 쉬어요, 보호자 잠금(덧셈)·보호자 설정
   ========================================================= */
"use strict";
(function () {
  const CFG = JN.CONFIG, S = JN.Store, U = JN.util, h = U.h;
  const $ = (id) => document.getElementById(id);
  const OWL = CFG.MASCOT_NAMES.owl, SNAIL = CFG.MASCOT_NAMES.snail;
  const subj = (n) => U.withI(n) + (U.withI(n) === n ? "가" : "가");   // 보미가 · 달롱이가

  const A = {
    kid: null, data: null,        // 지금 아이 · 그 아이 저장 정보
    room: null, gameId: null, inst: null, ctx: null,
    roundsSinceRest: 0, run: null, backTo: null, parentKid: null, parentFocusGame: null,
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
    if (id !== "scr-play") JN.bgm.stop();
    window.scrollTo(0, 0);
  }
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
    return on ? '<span class="star on">' + Art.icon("별", { label: "별" }) + "</span>" : '<span class="star off">' + Art.icon("별", { label: "빈 별" }) + "</span>";
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
        h("span", { class: "face", svg: ring || Art.icon("더하기") }), h("span", { class: "name", text: "친구 추가" }),
        h("small", null, h("i", { svg: Art.icon("보호자") }), "어른 확인")));
    }
    $("whoBg").innerHTML = JN.Assets.scene("who");
    $("whoBubble").textContent = list.length ? "안녕! 오늘은 누가 놀러 왔어?" : "반가워! 먼저 친구를 추가해요";
    show("scr-who");
  }
  function pickKid(id) {
    const p = S.profiles().find((x) => x.id === id);
    if (!p) return renderWho();
    A.kid = p; A.data = S.child(id); A.roundsSinceRest = 0;
    const ap = S.getApp(); ap.last = id; S.setApp(ap);
    renderHome();
  }

  /* ---------- 2. 영역 방 ---------- */
  function renderHome() {
    const p = A.kid;
    $("homeAv").innerHTML = avatar(p);
    $("homeTitle").textContent = U.withI(p.nick) + "의 놀이터";
    const box = $("rooms"); box.textContent = "";
    for (const a of Art.AREAS) {
      const games = a.games.filter((g) => JN.GAMES[g]);
      /* 닫아 둔 방(JN.CONFIG.CLOSED_AREAS)은 놀이가 있어도 카드를 누르면 "곧 열려요"만 보여요. 놀이 코드는 그대로 둬요 */
      const soon = !games.length || (JN.CONFIG.CLOSED_AREAS || []).includes(a.id);
      const tag = soon ? h("span", { class: "tag soon", text: "곧 열려요" })
        : h("span", { class: "tag" }, "놀이 " + games.length + " ", h("span", { class: "leaves", "aria-hidden": "true" }, games.map(() => h("i"))));
      const art = h("span", { class: "jn-room__art", svg: JN.Assets.roomArt(a.id) }); art.appendChild(tag);
      const el = h("button", { class: "jn-room" + (soon ? " jn-room--soon" : ""), type: "button", "data-area": a.id,
        "aria-label": a.name + (soon ? " (곧 열려요)" : " · 놀이 " + games.length + "개"), onclick: () => (soon ? showSoon(a) : openRoom(a.id)) },
        art, soon ? h("span", { class: "peek", svg: JN.Assets.snail("기본", "인사", SNAIL) }) : null,
        h("span", { class: "jn-room__label" }, h("span", { class: "jn-room__icon", svg: JN.Assets.areaIcon(a.id) }), h("span", { class: "jn-room__name", text: a.name })));
      roomVars(el, a);
      box.appendChild(el);
    }
    show("scr-home");
  }
  function showSoon(a, text) {
    $("soonTitle").textContent = "곧 열려요";
    $("soonText").textContent = text || (subj(SNAIL) + " " + a.name + " 방을 천천히 준비하고 있어요.");
    $("soon").hidden = false;
  }

  /* ---------- 2-1. 방 안 ---------- */
  function openRoom(areaId) {
    const a = areaOf(areaId); A.room = areaId;
    roomVars($("scr-room"), a);
    $("roomBand").innerHTML = JN.Assets.roomArt(a.id);
    $("roomIcon").innerHTML = JN.Assets.areaIcon(a.id);
    $("roomName").textContent = a.name + " 방";
    $("roomPower").textContent = a.power;
    const box = $("gameCards"); box.textContent = "";
    for (const gid of a.games) {
      const def = JN.GAMES[gid]; if (!def) continue;
      const si = curStage(A.kid, A.data, gid);
      box.appendChild(h("button", { class: "gcard game jn-card", type: "button", "data-game": gid, onclick: () => startGame(gid) },
        h("span", { class: "ic", svg: JN.Assets.gameIcon(gid) }),
        h("span", { class: "txt" }, h("b", { text: def.name }), h("small", { class: "meta", text: "지금 " + (si + 1) + "단계" }),
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

  function startGame(gid) {
    A.gameId = gid; A.run = null; A.room = JN.GAMES[gid].area; A.visitRounds = 0;
    $("playTitle").textContent = JN.GAMES[gid].name;
    $("playTitle").classList.toggle("long", JN.GAMES[gid].name.length > 8);   // "몸으로 따라 해요!" 처럼 긴 이름은 글자를 조금 작게
    show("scr-play");
    paintSound();
    mountRound();
  }
  function stopRound() {
    A.timers.forEach(clearTimeout); A.timers = [];
    if (A.ctx) A.ctx._alive = false;
    JN.speakStop();
    if (A.inst && A.inst.destroy) { try { A.inst.destroy(); } catch (e) { console.warn(e); } }
    A.inst = null; A.ctx = null;
    timer.reset();
    $("praise").hidden = true; $("rest").hidden = true; $("intro").hidden = true;
  }
  function paintStageChip(def, idx) {
    const chip = $("stageChip"); chip.textContent = (idx + 1) + "단계 ";
    if (def.stages.length <= 10) { chip.appendChild(leaves(def.stages.length, idx)); chip.appendChild(h("span", { class: "of-n", text: "/ " + def.stages.length })); }
    else chip.appendChild(h("span", { class: "of", text: "/ " + def.stages.length }));
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
    paintStageChip(def, idx);
    $("missionIcon").innerHTML = JN.Assets.gameIcon(gid);
    $("sideOwl").innerHTML = JN.Assets.owl("기본", "기본", OWL);
    const ctx = A.ctx = {
      _alive: true, def, stage: def.stages[idx], stageIdx: idx, stages: def.stages, settings, mem: st.mem,
      board, bottom, timer, test: JN.TEST,
      firstInVisit: !(A.visitRounds++),   // 놀이를 연 뒤 첫 판인지 (몸놀이 안전 안내를 한 번만 보여 주려고)
      alive() { return this._alive; },
      say(t) { if (this._alive) $("msgLine").textContent = t || ""; },
      sound(kind) { JN.sound(settings.sound, kind); },
      tone(f, d, v, dl) { JN.tone(settings.sound, f, d, v, dl); },
      hint(showIt, fn) {
        $("hintBtn").hidden = !showIt;
        hintFn = showIt ? () => { if (!ctx._alive) return; $("msgLine").textContent = subj(OWL) + " 도와줄게!"; fn(); } : null;
      },
      status(node) { const s = $("playStatus"); s.textContent = ""; if (node) s.appendChild(node); },
      later(fn, ms) { const t = setTimeout(() => { if (ctx._alive) fn(); }, ms); A.timers.push(t); return t; },
      saveMem() { saveData(); },
      finish(result) { if (ctx._alive && !ctx._done) { ctx._done = true; onFinish(ctx, result || {}); } },
    };
    let inst;
    try { inst = def.mount(ctx) || {}; } catch (e) { console.error(e); ctx.say("놀이를 여는 중에 문제가 생겼어요."); return; }
    A.inst = inst;
    $("scr-play").classList.toggle("no-bottom", !bottom.children.length && $("hintBtn").hidden);
    if (inst.resize) requestAnimationFrame(() => { if (ctx._alive) inst.resize(); });
    // "준비~" 안내 → 시작
    const intro = $("intro");
    const text = def.intro ? def.intro(ctx.stage, settings, ctx) : "";
    $("introText").textContent = "준비~" + (text ? " " + text : "");
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
    if (advance && data.settings.autoNext && def.autoNext !== false) {   // 몸놀이처럼 autoNext:false 인 놀이는 보호자가 단계를 직접 올려요
      let n = idx + 1;
      while (n < def.stages.length && !def.isStageOpen(n)) n++;
      if (n < def.stages.length) next = n; else allDone = true;
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
          totalLine = "모든 단계 총 " + U.fmtTime(total) + (typeof b[k] === "number" && total < b[k] ? " · 총 시간 최고 기록!" : "");
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
    A.roundsSinceRest++;
    JN.sound(ctx.settings.sound, "finish");
    showPraise({
      title: r.title || "다 했어요!",
      line: [r.line, firstClear ? (idx + 1) + "단계를 처음 깼어요!" : "", totalLine].filter(Boolean).join(" · "),
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
    an.hidden = true; sg.hidden = true; ad.hidden = true; ag.hidden = true;
    an.classList.remove("run");
    $("praise").hidden = false;
    if (o.allDone) {
      $("praiseTitle").textContent = "모든 단계를 끝까지 했어요!";
      ad.hidden = false;
      $("allAgain").onclick = () => { gameState(A.data, A.gameId).stage = 0; saveData(); afterPraise(); };
      $("allSame").onclick = () => afterPraise();
      $("allRoom").onclick = () => { stopRound(); openRoom(A.room); };
      return;
    }
    if (o.suggestIdx >= 0) {
      $("suggestText").textContent = subj(OWL) + " 살짝 쉬운 단계를 골라 봤어요. " + (o.suggestIdx + 1) + "단계로 해 볼까요?";
      $("suggestYes").textContent = (o.suggestIdx + 1) + "단계로 할래요";
      $("suggestYes").onclick = () => { gameState(A.data, A.gameId).stage = o.suggestIdx; saveData(); afterPraise(); };
      $("suggestNo").onclick = () => afterPraise();
      sg.hidden = false;
      return;
    }
    if (o.def.autoRepeat === false) {   // 몸놀이: 자동으로 다음 판을 열지 않고 묻고 기다려요
      ag.hidden = false;   // 단추 동작은 아래 U.tap 으로 한 번만 달아 둬요
      return;
    }
    $("autoNextText").textContent = o.next > o.idx ? "곧 " + (o.next + 1) + "단계로 가요" : "곧 한 번 더 해요";
    an.hidden = false;
    an.style.setProperty("--praise-ms", JN.ms(CFG.PRAISE_MS) / 1000 + "s");
    requestAnimationFrame(() => requestAnimationFrame(() => an.classList.add("run")));
    A.timers.push(setTimeout(afterPraise, JN.ms(CFG.PRAISE_MS)));
  }
  /* 몸놀이 "한 번 더 할까요?" 단추: U.tap 으로 달아서, 손가락으로 '했어요'를 누른 뒤 브라우저가 늦게 보내는 click 이
     같은 자리에 나타난 이 단추(특히 '그만할래요')를 누르지 않게 해요 (0.6초 안의 click 은 무시) */
  const againOpen = () => !$("praise").hidden && !$("againBox").hidden;
  U.tap($("againYes"), () => { if (againOpen()) afterPraise(); });
  U.tap($("againNo"), () => { if (!againOpen()) return; $("praise").hidden = true; stopRound(); openRoom(A.room); });
  function afterPraise() {
    if ($("praise").hidden) return;
    $("praise").hidden = true;
    const lim = A.data.settings.restEvery;
    if (lim && A.roundsSinceRest >= lim) showRest(); else mountRound();
  }

  /* ---------- 5. 잠깐 쉬어요 ---------- */
  function showRest() {
    $("restTitle").textContent = U.withI(SNAIL) + "랑 잠깐 쉬어요";
    $("restGo").hidden = true;
    if (!$("restBgTall").firstChild) {
      $("restBgTall").innerHTML = JN.Assets.scene("rest", true); $("restBgWide").innerHTML = JN.Assets.scene("rest", false);
      $("breathRing").innerHTML = roughSvg("circle", [100, 100, 190], { stroke: JN.cssVar("--c-on-dark", "#FFF8EA"), strokeWidth: 2.6, roughness: 1.2 }, "0 0 200 200");
    }
    $("rest").hidden = false;
    let inhale = true; $("breathText").textContent = "들이쉬고…";
    const bt = setInterval(() => { if ($("rest").hidden) return clearInterval(bt); inhale = !inhale; $("breathText").textContent = inhale ? "들이쉬고…" : "내쉬고…"; }, 4000);
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
    b.setAttribute("aria-label", on ? "소리 켜짐" : "소리 꺼짐");
  }
  $("soundBtn").onclick = () => {
    A.data.settings.sound = !A.data.settings.sound; saveData(); paintSound();
    if (A.ctx) A.ctx.settings.sound = A.data.settings.sound;
    if (A.inst && A.inst.soundChanged) A.inst.soundChanged(A.data.settings.sound);
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
      kp.appendChild(h("button", { type: "button", class: k === "확인" ? "ok" : k === "지우기" ? "del" : null, "data-key": k, "aria-label": k === "지우기" ? "지우기" : null, svg: k === "지우기" ? Art.icon("뒤로") : null,
        onclick: () => {
          if (k === "지우기") lock.val = lock.val.slice(0, -1);
          else if (k === "확인") {
            if (Number(lock.val) === lock.a + lock.b && lock.val !== "") { const f = lock.ok; lock.ok = null; f && f(); return; }
            newProblem(); return;
          } else if (lock.val.length < 2) lock.val += k;
          paintLock();
        } }, k === "지우기" ? null : k));
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
    $("profTitle").textContent = p ? "아이 정보 고치기" : "친구 추가";
    $("profNick").value = p ? p.nick : "";
    $("profDelete").hidden = !p;
    paintProfile();
    show("scr-profile");
  }
  function paintProfile() {
    const ag = $("profAnimals"); ag.textContent = "";
    for (const k of Art.PROFILE_KINDS) ag.appendChild(h("button", { type: "button", "aria-pressed": String(k === prof.animal), "aria-label": k,
      svg: Art.profile(k, { color: prof.color }), onclick: () => { prof.animal = k; paintProfile(); } }));
    const cg = $("profColors"); cg.textContent = "";
    CFG.PROFILE_COLORS.forEach((c, i) => cg.appendChild(h("button", { type: "button", "aria-pressed": String(c === prof.color), "aria-label": CFG.PROFILE_COLOR_NAMES[i],
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
    if (!p || !window.confirm(p.nick + "의 정보와 기록을 모두 지울까요? 되돌릴 수 없어요.")) return;
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
      box.appendChild(h("button", { type: "button", class: "addtab", id: "addKidTab", onclick: () => openProfile(null, "parent") }, h("i", { svg: Art.icon("더하기") }), "추가"));
  }
  A.kidTabs = kidTabs;

  function toggleRow(label, sub, value, onChange, id) {
    const inp = h("input", { type: "checkbox", "aria-label": label, id });
    inp.checked = !!value;
    const txt = h("span", { class: "jn-toggle__text", "aria-hidden": "true", text: value ? "켬" : "끔" });
    inp.addEventListener("change", () => { txt.textContent = inp.checked ? "켬" : "끔"; onChange(inp.checked); });
    return h("div", { class: "jn-row" }, h("span", { class: "lbl" }, h("b", { text: label }), sub ? h("small", { text: sub }) : null),
      h("span", { class: "tg" }, txt, h("label", { class: "jn-toggle" }, inp, h("span"))));
  }
  function stepperRow(label, sub, value, min, max, fmt, onChange, id) {
    const b = h("b", { text: fmt(value), id });
    let v = value;
    const set = (d) => { v = U.clamp(v + d, min, max); b.textContent = fmt(v); onChange(v); };
    return h("div", { class: "jn-row" }, h("span", { class: "lbl" }, h("b", { text: label }), sub ? h("small", { text: sub }) : null),
      h("span", { class: "stepper" }, h("button", { type: "button", "aria-label": label + " 줄이기", onclick: () => set(-1) }, "−"), b,
        h("button", { type: "button", "aria-label": label + " 늘리기", onclick: () => set(1) }, "+")));
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
      body.appendChild(h("p", { class: "care", text: "아직 아이가 없어요. 위의 '추가'를 눌러 별명으로 아이를 만들어 주세요." }));
      body.appendChild(deviceCard());
      body.appendChild(privacyBox());
      body.appendChild(aboutBox());
      show("scr-parent");
      return;
    }
    const data = S.child(kid.id);
    const save = () => { S.saveChild(kid.id, data); if (A.kid && A.kid.id === kid.id) A.data = data; };
    const s = data.settings;

    const cols = h("div", { class: "set-cols" });
    body.appendChild(cols);
    cols.appendChild(h("section", { class: "setcard jn-card" }, h("h2", null, h("i", { svg: Art.icon("설정") }), U.withI(kid.nick) + "의 놀이 방식"),
      h("div", { class: "jn-row" }, h("span", { class: "lbl" }, h("b", { text: kid.nick }), h("small", { text: "만 " + kid.age + "세 · " + kid.animal })),
        h("button", { class: "jn-btn", type: "button", id: "editKid", onclick: () => openProfile(kid.id, "parent") }, h("i", { svg: Art.icon("고치기") }), "고치기")),
      toggleRow("1단계부터 시작", "켜면 나이와 상관없이 모든 놀이가 1단계부터", s.from1, (v) => { s.from1 = v; resetStages(kid, data); save(); renderParent(); }, "set-from1"),
      toggleRow("효과음", "맞히거나 틀릴 때 나는 짧은 소리", s.sound, (v) => { s.sound = v; save(); }, "set-sound"),
      toggleRow("배경음", "놀이하는 동안 작게 흐르는 잔잔한 음악", s.bgm !== false, (v) => { s.bgm = v; save(); }, "set-bgm"),
      toggleRow("말로 안내", "놀이를 시작할 때 할 일을 소리로 읽어 줘요 (글을 아직 못 읽는 아이용)", s.voice !== false, (v) => { s.voice = v; save(); }, "set-voice"),
      toggleRow("시간 보여 주기", null, s.showTimer, (v) => { s.showTimer = v; save(); }, "set-timer"),
      toggleRow("단계를 깨면 다음 단계로", null, s.autoNext, (v) => { s.autoNext = v; save(); }, "set-autonext"),
      toggleRow("쉬운 단계 제안", "힌트를 " + CFG.HINT_STREAK_SUGGEST + "판 이어서 쓰면 한 단계 쉬운 판을 부드럽게 물어봐요", s.suggestEasier, (v) => { s.suggestEasier = v; save(); }, "set-suggest"),
      stepperRow("쉬는 시간", "몇 판마다 '잠깐 쉬어요' (0은 쉬지 않음)", s.restEvery, 0, 10, (v) => (v ? v + "판" : "안 쉼"), (v) => { s.restEvery = v; save(); }, "set-rest")));

    const seg = h("div", { class: "jn-seg", role: "group", "aria-label": "힌트 방식" });
    for (const m of Object.keys(CFG.HINT_MODES)) seg.appendChild(h("button", { type: "button", "aria-pressed": String(s.hintMode === m), "data-mode": m,
      onclick: () => { s.hintMode = m; save(); renderParent(); } }, CFG.HINT_MODES[m]));
    cols.appendChild(h("section", { class: "setcard jn-card" }, h("h2", null, h("i", { svg: Art.icon("힌트") }), "힌트 방식"),
      h("div", { class: "jn-row col" }, h("span", { class: "lbl" }, h("b", { text: "힌트" }), h("small", { text: "처음엔 힌트 없이 스스로 찾아보게 해요. 기록은 방식별로 따로 비교해요." })), seg),
      h("div", { class: "tip" }, h("span", { class: "m", svg: JN.Assets.snail("웃음", "기본", SNAIL) }),
        h("p", { text: "아이가 오래 막히면 그때 '힌트 버튼'을 켜 주세요. 힌트를 켜면 놀이 화면 오른쪽 아래에 꿀색 단추가 나와요." }))));

    const games = h("section", { class: "setcard jn-card" }, h("h2", null, h("i", { svg: Art.icon("별") }), "놀이별 설정 · 시작 단계"),
      h("p", { class: "care", text: "아이마다 속도가 달라요. 언제든 바꿀 수 있어요. 나이 추천은 출발점일 뿐이에요." }));
    for (const gid of JN.GAME_ORDER) games.appendChild(gameBox(kid, data, gid, save));
    body.appendChild(games);
    body.appendChild(deviceCard());
    body.appendChild(privacyBox());
    body.appendChild(aboutBox());
    show("scr-parent");
    if (A.parentFocusGame) {
      const d = body.querySelector('[data-gameset="' + A.parentFocusGame + '"]');
      if (d) { d.open = true; setTimeout(() => d.scrollIntoView({ block: "start" }), 0); }
      A.parentFocusGame = null;
    }
  }
  function gameBox(kid, data, gid, save) {
    const def = JN.GAMES[gid], area = areaOf(def.area), gs = gameSet(data, gid);
    const cur = curStage(kid, data, gid), rec = JN.ageStage(gid, kid.age);
    const startTxt = data.settings.from1 ? "1단계부터" : typeof gs.start === "number" ? "직접 고름 " + (gs.start + 1) + "단계" : "나이 추천 " + (rec + 1) + "단계";
    const d = h("details", { class: "gameset", "data-gameset": gid },
      h("summary", null, h("span", { class: "gi", style: "background:" + area.tint, svg: JN.Assets.gameIcon(gid) }), h("span", { text: def.name }),
        h("small", null, "지금 " + (cur + 1) + "단계", h("br"), startTxt)));
    const inner = h("div", { class: "inner" });
    inner.appendChild(h("p", { class: "care", text: "쓰는 힘: " + area.name + " — " + area.power + (def.parentNote ? ". " + def.parentNote : "") }));
    if (def.parentSafety) inner.appendChild(h("p", { class: "care safety-note" }, h("b", { text: def.parentSafety })));
    const opts = [["auto", "나이 추천 (" + (rec + 1) + "단계)"]].concat(def.stages.map((st, i) =>
      [i, (i + 1) + "단계 · " + (def.stageLabel ? def.stageLabel(st) : st.name) + (def.isStageOpen(i) ? "" : " (사진이 준비되면 열려요)"), !def.isStageOpen(i)]));
    inner.appendChild(selectRow("시작 단계", data.settings.from1 ? "'1단계부터 시작'이 켜져 있어서 지금은 1단계부터 해요" : "고르면 지금 단계도 여기로 바뀌어요",
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
    if (def.hintHelp) {
      const ul = h("ul");
      for (const m of Object.keys(CFG.HINT_MODES)) ul.appendChild(h("li", { text: CFG.HINT_MODES[m] + ": " + def.hintHelp[m] }));
      inner.appendChild(h("div", { class: "care" }, h("b", { text: "이 놀이의 힌트 방식" }), ul));
    }
    d.appendChild(inner);
    return d;
  }
  function renderParentKeepOpen(gid) { A.parentFocusGame = gid; renderParent(); }
  function privacyBox() {
    return h("div", { class: "care", id: "privacyBox" },
      h("b", { text: "개인정보 안내" }), h("br"),
      "무엇을: 별명, 동물 그림과 색, 만 나이, 놀이 설정, 판마다의 놀이 기록만 저장해요. 실명·생년월일·사진·학교·위치는 받지 않아요.", h("br"),
      "어디에: 이 기기의 브라우저 저장소(localStorage)에만 저장해요. 아이 정보와 기록은 이 기기 밖으로 보내지 않아요. 광고·분석 도구도 없어요.", h("br"),
      "앱 파일은 GitHub Pages에서 받아요. 이때 GitHub가 접속 기록(IP 주소 등)을 남길 수 있어요(GitHub 개인정보 처리방침). 만든 사람은 아이 정보와 기록을 볼 수 없어요.", h("br"),
      "어떻게 지우나: 아이 '고치기' → '이 아이와 기록 지우기', 또는 기록 보기 → '이 아이 기록 지우기'. 브라우저의 사이트 데이터 지우기로도 모두 지워져요.", h("br"), h("br"),
      h("b", { id: "careNotice", text: "집에서 하는 놀이예요. 진단이나 전문가 상담을 대신하지 않아요. 아이 발달이 걱정되면 전문가와 상의해 주세요." }), h("br"),
      h("span", { id: "noRecordNotice", text: "녹음하거나 밖으로 보내지 않아요." }), " 마이크와 카메라를 쓰지 않아요.", h("br"),
      "짧게 놀고 쉬어요. 끝나면 몸으로 하는 놀이로 이어 가도 좋아요.");
  }
  /* 운영자 안내: 무료 비영리 · 연락처(CONTACT 가 있을 때만) · 사용한 공개 소프트웨어 */
  function aboutBox() {
    return h("div", { class: "care", id: "aboutBox" },
      h("b", { text: "이 앱은" }), h("br"),
      "개인이 만든 무료 비영리 앱이에요.", h("br"),
      CFG.CONTACT ? h("span", { id: "contactLine", text: "연락처: " + CFG.CONTACT }) : null, CFG.CONTACT ? h("br") : null,
      "사용한 공개 소프트웨어: rough.js, perfect-freehand (MIT 라이선스, vendor 폴더 LICENSE 참고)");
  }
  /* 이 기기 설정: 그림 질감 줄이기 (느린 기기용, 아이 모두 공통) */
  function deviceCard() {
    return h("section", { class: "setcard jn-card" }, h("h2", null, h("i", { svg: Art.icon("설정") }), "이 기기"),
      toggleRow("그림 질감 줄이기", "느린 기기에서 켜면 물감 번짐·종이결을 줄여 더 가볍게 그려요", isLite(), (v) => { setLite(v); renderParent(); }, "set-lite"),
      installRow());
  }
  /* 앱으로 설치: 브라우저가 설치할 수 있다고 알려 줄 때만 단추가 나와요. 설치 방법 안내 페이지 링크는 늘 있어요. */
  function installRow() {
    const I = JN.Install;
    const sub = h("small", { id: "installSub" });
    const btn = h("button", { class: "jn-btn jn-btn--primary", type: "button", id: "installBtn", hidden: true, onclick: () => I.prompt().then(sync) }, "앱으로 설치");
    const help = h("a", { class: "jn-btn", id: "installHelp", href: "install.html" }, "설치 방법 보기");
    function sync() {
      btn.hidden = !(I && I.canPrompt() && !I.isStandalone());
      sub.textContent = !I ? "" : I.isStandalone() ? "이미 앱으로 열려 있어요" : "홈 화면(바탕화면)에 두면 앱처럼 열려요. 아이폰은 설치 방법 안내를 봐 주세요";
    }
    if (I) { I.onChange(sync); sync(); }
    return h("div", { class: "jn-row col", id: "installRow" }, h("span", { class: "lbl" }, h("b", { text: "앱으로 설치" }), sub), btn, help);
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
  document.addEventListener("contextmenu", (e) => { if (!e.target.closest("input,textarea")) e.preventDefault(); });
  let rz = 0;
  window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (A.inst && A.inst.resize) A.inst.resize(); }, 120); });
  document.addEventListener("visibilitychange", () => {
    if (A.inst && A.inst.visibility) A.inst.visibility(document.hidden);
    if (document.hidden) { JN.bgm.stop(); JN.speakStop(); }
    else if (A.screen === "scr-play" && A.data && A.data.settings.bgm !== false) JN.bgm.start();
  });

  A.renderWho = renderWho; A.renderParent = renderParent; A.renderHome = renderHome; A.openRoom = openRoom; A.startGame = startGame;
  A.pickKid = pickKid; A.stopRound = stopRound; A.mountRound = mountRound; A.gameState = gameState; A.gameSettings = gameSettings;

  /* ---------- 시작 ---------- */
  applyLite();
  fillArt(document.body);
  renderWho();

  /* 웹(http/https)으로 열었을 때만: 홈 화면 앱(manifest) + 오프라인 캐시(service worker). 더블클릭(file://)이면 조용히 건너뛰어요. */
  if (/^https?:$/.test(location.protocol)) {
    document.head.appendChild(h("link", { rel: "manifest", href: "manifest.json" }));
    if ("serviceWorker" in navigator && window.isSecureContext) {
      window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => { /* 캐시가 안 돼도 놀이는 돼요 */ }); });
    }
  }
})();
