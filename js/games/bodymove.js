/* 몸으로 따라 해요! (몸따라해요) — 몸·감각 방
   화면을 내려놓고 카드 그림대로 나무·동물이 되어 몸을 움직이는 놀이.
   이 파일 앞부분의 JN.BodyKit = "몸놀이 카드 틀"은 같이 놀아요(bodytogether.js)도 같이 써요 (index.html 에서 이 파일을 먼저 불러요).
   흐름: 안전 안내(놀이를 열 때 1번) → 카드 → "준비됐어요" → 큰 타이머 → 보미 만세 → "했어요"(아이가 눌러야 다음 카드)
        → 판 끝: 칭찬 후 "한 번 더 할까요?" 묻고 기다림 (autoRepeat:false). 단계 자동 올리기 없음 (autoNext:false).
   - 남은 시간은 끝나는 시각(Date.now)으로 계산 → 화면이 꺼졌다 켜져도 맞게 나와요.
   - "맞았어요/틀렸어요" 없음. 일찍 멈춘 것도 그냥 기록(metrics.stopped). 안전 문구는 정해 둔 문장 그대로. */
"use strict";
(function () {
  const U = JN.util, h = U.h;
  const TXT = {
    safeAll: "주변을 치우고 어른과 함께 해요. 아프거나 어지러우면 멈춰요.",
    safeShort: "아프거나 어지러우면 멈춰요. (어른 곁에서)",
    balloon: "8세 미만은 어른이 꼭 지켜봐요. 바람 빠진 풍선, 터진 조각은 바로 버려요. 풍선을 입에 넣거나 물지 않아요.",
    parent: "몸이 불편하거나 다친 적이 있으면 먼저 의사와 상의해 주세요. 주변 안전은 보호자가 살펴 주세요.",
    down: "화면을 내려놓고 몸으로 놀아요",
  };
  const MAX_SEC = 120;   // 카드 하나는 최대 2분 (화면 오래 보지 않게)
  const fmtMove = (sec) => { sec = Math.round(sec || 0); if (sec < 60) return sec + "초"; const m = Math.floor(sec / 60), s = sec % 60; return m + "분" + (s ? " " + s + "초" : ""); };

  /* ---------- 몸놀이 카드 틀 ---------- */
  const Kit = JN.BodyKit = {
    TXT, MAX_SEC, fmtMove,
    /* 보호자 설정 "카드 시간" (두 몸놀이가 같은 값을 써요) */
    cardTimeSetting: (other) => ({ key: "cardTime", type: "select", label: "카드 시간", sub: "카드 하나의 움직이는 시간 (최대 2분)", def: "1",
      options: [["0.7", "짧게"], ["1", "기본"], ["1.5", "길게"]], shareWith: [other] }),
    /* 카드 시간 계산: 기본 초 × 설정, 5초 단위, 최대 2분 (cap 이 있으면 그보다 짧게 — 숨 고르기 30초 이하) */
    sec(base, set, cap) { const m = parseFloat(set.cardTime) || 1; return Math.min(cap || MAX_SEC, MAX_SEC, Math.max(10, Math.round(base * m / 5) * 5)); },
    intro: (ctx) => ctx && ctx.firstInVisit ? "놀기 전에 약속해요" : "몸으로 놀 준비!",
    /* 카드 그림: pose 이름 / prop 이름 / {crab:true} / {animal:'곰'} */
    art(spec, o) {
      if (!spec) return "";
      if (typeof spec === "string") return Art.pose(spec, o);
      if (spec.prop) return Art.prop(spec.prop, o);
      if (spec.crab) return Art.crab(o);
      if (spec.animal) return Art.animal(spec.animal, Object.assign({ face: "웃음" }, o));
      return Art.pose(spec.pose, o);
    },
    /* ctx 와 카드 목록으로 놀이 한 판을 돌려요. opts: { cards, balloon, title, before(api, done), path, line(stats) }
       카드: { id, name, how:[자세1, 자세2?], rep(없이 모드 그림), line, sec, safety, badge, prop, propText, challenge, phases } */
    run(ctx, opts) {
      const set = ctx.settings, mode = set.hintMode, board = ctx.board, TS = JN.TIME_SCALE;
      board.classList.add("bm-board");
      const baseClass = board.className;   // 화면을 바꿀 때 놀이 기본 class 는 남겨요
      ctx.timer.hide();   // 놀이 시간 시계 대신 카드 안 큰 타이머 (설정 '시간 보여 주기'와 상관없이 늘 보임)
      let cards = opts.cards || [], ci = 0, moveSec = 0, done = 0, stopped = 0, hints = 0, showHow = false, alive = true;
      const tm = { total: 0, endAt: 0, remain: 0, paused: false, iv: 0, phase: 0, on: false };
      const clear = () => { board.textContent = ""; board.className = baseClass; delete board.dataset.screen; };
      const put = (...els) => board.append(...els.filter(Boolean));
      const btn = (cls, text, icon, fn, id) => { const b = h("button", { type: "button", class: "jn-btn " + cls, id, svg: icon ? Art.icon(icon) : null }, text); U.tap(b, () => { if (alive) fn(); }); return b; };
      const setHint = (fn) => ctx.hint(mode === "button" && !!fn, fn || (() => {}));
      const api = {
        board, mode, h, btn, clear, put, setHint, TXT,
        get cards() { return cards; }, set cards(v) { cards = v; },
        addHint() { hints++; },
        art: Kit.art,
      };

      /* 1. 안전 안내 (놀이를 열 때 1번) */
      function showSafety(next) {
        clear(); board.classList.add("bm-safety-scr"); setHint(null);
        const tiles = h("div", { class: "bm-safe3" });
        [["치우기", "주변을 치워요"], ["어른곁", "어른과 함께 해요"], ["멈춰요", "아프거나 어지러우면 멈춰요"]].forEach(([k, t], i) =>
          tiles.appendChild(h("div", { class: "bm-safe" }, h("span", { class: "no", text: String(i + 1) }), h("i", { svg: Art.safety(k, { label: t }) }), h("b", { text: t }))));
        const left = h("div", { class: "bm-safe-l" }, h("h2", { class: "bm-h", text: "놀기 전에 약속해요" }), tiles, h("p", { class: "bm-safeall", id: "bmSafeAll", text: TXT.safeAll }));
        const right = h("div", { class: "bm-safe-r" });
        if (opts.balloon) right.appendChild(h("div", { class: "bm-balloon", id: "bmBalloon" }, h("i", { svg: Art.prop("풍선", { label: "풍선" }) }),
          h("div", null, h("b", { text: "풍선 약속 (어른이 읽어 주세요)" }), h("p", { text: TXT.balloon }))));
        right.appendChild(btn("jn-btn--primary jn-btn--big jn-btn--block", "알겠어요", null, next, "bmOk"));
        put(left, right);
        ctx.say("놀기 전에 약속해요");
      }

      /* 2. 카드 */
      const cardNo = () => opts.path ? "놀이길 " + (ci + 1) + "칸째 / " + cards.length + "칸" : "카드 " + (ci + 1) + " / " + cards.length;
      function safeLine(c, small) {
        const lines = [c.safety, c.safety2].filter(Boolean);
        return lines.length ? h("p", { class: "bm-cardsafe" + (small ? " sm" : "") }, h("i", { svg: Art.safety("멈춰요", { label: "" }) }), h("span", { text: lines.join(" ") })) : null;
      }
      function pics(c) {
        const how = mode === "always" || showHow;
        const box = h("div", { class: "bm-pics" + (how && c.how.length > 1 ? " two" : "") });
        if (how) c.how.forEach((p, i) => {
          if (i) box.appendChild(h("span", { class: "bm-arrow", "aria-hidden": "true", svg: Art.icon("다음") }));
          box.appendChild(h("div", { class: "bm-pic" }, c.how.length > 1 ? h("span", { class: "no", text: String(i + 1) }) : null, h("i", { svg: Kit.art(p, { label: c.name }) })));
        });
        else box.appendChild(h("div", { class: "bm-pic one" }, h("i", { svg: Kit.art(c.rep, { label: c.name }) })));
        if (c.badge) box.appendChild(h("span", { class: "bm-badge", svg: Kit.art(c.badge, { label: c.badgeLabel || "" }) }));
        return box;
      }
      function pathStrip() {
        if (!opts.path || mode !== "always") return null;
        const s = h("div", { class: "bm-strip", "aria-hidden": "true" });
        cards.forEach((c, i) => s.appendChild(h("span", { class: i === ci ? "now" : i < ci ? "on" : null }, h("b", { text: String(i + 1) }), h("i", { svg: Kit.art(c.how[0], { label: "" }) }))));
        return s;
      }
      function showCard() {
        const c = cards[ci];
        clear(); board.classList.add("bm-card-scr");
        const how = mode === "always" || showHow;
        const card = h("div", { class: "bm-card jn-card jn-tape" },
          h("h2", { class: "bm-name", id: "bmName", text: c.name }), h("p", { class: "bm-no", text: cardNo() }),
          pics(c),
          how && c.line ? h("p", { class: "bm-line", text: c.line }) : null,
          c.challenge ? h("p", { class: "bm-chal", text: c.challenge }) : null,
          h("div", { class: "bm-chips" }, h("span", { class: "chip" }, h("i", { svg: Art.icon("시계") }), c.sec + "초"),
            h("span", { class: "chip" }, c.prop ? h("i", { svg: Art.prop(c.prop, { label: "" }) }) : null, c.propText || "준비물 없음")),
          safeLine(c));
        put(h("p", { class: "bm-top-safe" }, h("i", { svg: Art.safety("멈춰요", { label: "" }) }), h("span", { text: TXT.safeShort })),
          pathStrip(), card, btn("jn-btn--primary jn-btn--big jn-btn--block bm-go", "준비됐어요", null, startTimer, "bmReady"));
        setHint(showHow ? null : () => { if (showHow) return; showHow = true; hints++; showCard(); });
        ctx.say(c.name);
      }

      /* 3. 큰 타이머 */
      const R = 84, CIRC = 2 * Math.PI * R;
      function ringSvg() {
        return '<svg viewBox="0 0 200 200" aria-hidden="true">' +
          '<circle cx="100" cy="100" r="95" fill="none" class="pen"/><circle cx="100" cy="100" r="73" class="inner"/><circle cx="100" cy="100" r="73" fill="none" class="pen"/>' +
          '<circle cx="100" cy="100" r="' + R + '" fill="none" class="bg"/>' +
          '<circle cx="100" cy="100" r="' + R + '" fill="none" class="fg" transform="rotate(-90 100 100)" stroke-dasharray="' + CIRC.toFixed(1) + '" stroke-dashoffset="0"/>' +
          '<text x="100" y="112" text-anchor="middle" class="num"></text><text x="100" y="140" text-anchor="middle" class="unit">초</text></svg>';
      }
      function head(c, sub) {
        const p = c.phases ? c.phases[tm.phase] : null;
        return h("div", { class: "bm-head jn-paper" }, h("i", { svg: Kit.art(p ? p.pose : c.rep, { label: "" }) }),
          h("div", null, h("b", { class: "bm-hname", text: p ? p.name : c.name }), sub));
      }
      function startTimer() {
        const c = cards[ci];
        tm.total = c.sec * 1000 / TS; tm.endAt = Date.now() + tm.total; tm.paused = false; tm.phase = 0; tm.on = true;
        clear(); board.classList.add("bm-timer-scr"); setHint(null);
        const ring = h("div", { class: "bm-ring", id: "bmRing", svg: ringSvg() });
        const pause = btn("bm-pause", "잠깐 멈춰요", "멈춤", togglePause, "bmPause");
        const quit = btn("jn-btn--quiet", "그만할래요", null, stopCard, "bmStop");
        put(head(c, safeLine(c, true) || h("small", { class: "bm-hsub", text: cardNo() })),
          h("div", { class: "bm-ringbox" }, ring), h("p", { class: "bm-down" }, h("i", { svg: Art.icon("쉬기") }), h("span", { id: "bmDown", text: TXT.down })),
          h("div", { class: "bm-btns" }, pause, quit));
        layout(); tick();
        clearInterval(tm.iv); tm.iv = setInterval(tick, Math.max(40, 250 / TS));
        ctx.say(TXT.down);
      }
      const remainMs = () => tm.paused ? tm.remain : Math.max(0, tm.endAt - Date.now());
      function tick() {
        if (!alive || !tm.on) return;
        const c = cards[ci], left = remainMs(), ring = board.querySelector("#bmRing");
        if (ring) {
          ring.querySelector(".num").textContent = String(Math.ceil(left * TS / 1000));
          ring.querySelector(".fg").setAttribute("stroke-dashoffset", (CIRC * (1 - left / tm.total)).toFixed(1));
        }
        if (c.phases) {   // 한 카드 안 두 동작: 절반이 지나면 다음 동작
          const ph = Math.min(c.phases.length - 1, Math.floor((1 - left / tm.total) * c.phases.length));
          if (ph !== tm.phase) {
            tm.phase = ph;
            const hd = board.querySelector(".bm-head");
            if (hd) hd.replaceWith(head(c, h("small", { class: "bm-hsub", text: "이제 " + c.phases[ph].name + "!" })));
            ctx.tone(523, 0.3, 0.04);
          }
        }
        if (left <= 0 && !tm.paused) cardEnd();
      }
      function togglePause() {
        const b = board.querySelector("#bmPause"); if (!tm.on) return;
        if (!tm.paused) { tm.remain = remainMs(); tm.paused = true; if (b) { b.lastChild.textContent = "다시 해요"; b.querySelector("svg").outerHTML = Art.icon("다음"); } ctx.say("잠깐 쉬어요. 준비되면 '다시 해요'"); }
        else { tm.endAt = Date.now() + tm.remain; tm.paused = false; if (b) { b.lastChild.textContent = "잠깐 멈춰요"; b.querySelector("svg").outerHTML = Art.icon("멈춤"); } ctx.say(TXT.down); }
      }
      const elapsedSec = () => Math.round((tm.total - remainMs()) * TS / 1000);
      function stopTimer() { tm.on = false; clearInterval(tm.iv); }
      /* 일찍 끝내기: 틀림이 아니라 그냥 기록 */
      function stopCard() {
        if (!tm.on) return;
        moveSec += elapsedSec(); stopped++;
        stopTimer();
        nextCard("괜찮아요. 쉬었다 해도 좋아요");
      }
      /* 4. 다 됐어요 → 했어요 */
      function cardEnd() {
        const c = cards[ci];
        stopTimer();
        ctx.sound("ok");
        clear(); board.classList.add("bm-done-scr");
        const ring = h("div", { class: "bm-ring full", id: "bmRing", svg: ringSvg() });
        ring.appendChild(h("span", { class: "owl jn-pop", svg: JN.Assets.owl("응원", "만세", JN.CONFIG.MASCOT_NAMES.owl) }));
        put(head(c, h("small", { class: "bm-hsub", text: cardNo() })), h("div", { class: "bm-ringbox" }, ring),
          h("p", { class: "bm-doneline", text: "다 됐어요! 했어요를 눌러요" }),
          btn("jn-btn--primary jn-btn--big jn-btn--block bm-go", "했어요", "확인", () => { moveSec += c.sec; done++; nextCard(); }, "bmDid"));
        ring.querySelector(".num").textContent = ""; ring.querySelector(".unit").textContent = "";
        layout();
        ctx.say("다 됐어요!");
      }
      function nextCard(msg) {
        ci++; showHow = false;
        if (ci >= cards.length) return end();
        showCard();
        if (msg) ctx.say(msg);
      }
      function end() {
        alive = false; setHint(null);
        const time = ctx.timer.stop();
        const stats = { moveSec, cards: done, stopped, total: cards.length };
        ctx.finish({ cleared: true, advance: false, time, mistakes: 0, hints, showTime: false,
          metrics: { moveSec, cards: done, stopped, path: opts.path ? cards.length : 0 },
          title: opts.title || "몸으로 잘 놀았어요!", line: opts.line ? opts.line(stats) : "카드 " + done + "장 · 움직인 시간 " + fmtMove(moveSec) });
      }
      function layout() {
        const box = board.querySelector(".bm-ringbox"), ring = board.querySelector("#bmRing");
        if (!box || !ring) return;
        const s = Math.max(120, Math.floor(Math.min(box.clientWidth, box.clientHeight, 300)));
        ring.style.width = ring.style.height = s + "px";
      }
      function begin() {
        const go = () => { if (!alive) return; if (opts.before) opts.before(api, () => { ci = 0; showCard(); }); else showCard(); };
        if (ctx.firstInVisit) showSafety(go); else go();
      }
      return {
        start() { ctx.timer.start(); begin(); },
        resize: layout,
        visibility(hidden) { if (!hidden) tick(); },   // 다른 앱에 갔다 와도 끝나는 시각으로 다시 계산
        destroy() { alive = false; stopTimer(); },
        test: {
          state: () => ({ screen: board.classList.contains("bm-safety-scr") ? "safety" : board.classList.contains("bm-card-scr") ? "card"
            : board.classList.contains("bm-timer-scr") ? "timer" : board.classList.contains("bm-done-scr") ? "done" : (board.dataset.screen || "other"),
            ci, n: cards.length, moveSec, done, stopped, paused: tm.paused, cards: cards.map((c) => ({ id: c.id, sec: c.sec })) }),
        },
      };
    },
  };

  /* ---------- 몸으로 따라 해요! 카드 6종 ---------- */
  const ANIMALS = {
    곰: { name: "곰처럼 쿵쿵", pose: "곰걸음", badge: null, /* 곰 걸음 그림 안에 곰이 이미 있어요 */ line: "손과 발을 바닥에 대고 곰처럼 쿵쿵 걸어요" },
    토끼: { name: "토끼처럼 폴짝", pose: "토끼폴짝", badge: { animal: "토끼" }, line: "몸을 웅크렸다가 토끼처럼 폴짝 뛰어요" },
    게: { name: "게처럼 옆으로", pose: "게걸음", badge: { crab: true }, line: "팔을 집게처럼 들고 옆으로 살금살금 걸어요" },
  };
  const CARDS = {
    나무: () => ({ id: "나무", name: "나무가 되어요", how: ["나무", "바람"], rep: "나무", line: "두 팔을 위로, 바람이 오면 살랑살랑", base: 30 }),
    동물: (k) => { const a = ANIMALS[k || U.pick(Object.keys(ANIMALS))]; return { id: "동물", name: a.name, how: ["서기", a.pose], rep: a.pose, line: a.line, badge: a.badge, badgeLabel: a.name, base: 30 }; },
    하늘: () => ({ id: "하늘", name: "공중에 그려요", how: ["서기", "공중그림"], rep: "공중그림", line: "손으로 공중에 동그라미, 번개를 그려요", base: 30 }),
    한발: () => ({ id: "한발", name: "한 발로 서요", how: ["서기", "한발서기"], rep: "한발서기", line: "한 발로 서서 버텨요. 반대쪽 발도 해요", safety: "벽이나 어른 옆에서. 흔들리면 두 발로", base: 30 }),
    늘이기: () => ({ id: "늘이기", name: "쭉~ 동글동글", how: ["늘이기", "웅크리기"], rep: "늘이기", line: "높이 쭉 늘였다가 작게 웅크려요", base: 30 }),
    숨: () => ({ id: "숨", name: "풍선 숨", how: ["숨들이쉬기", "숨내쉬기"], rep: "숨내쉬기", line: "코로 들이쉬고, 풍선 불듯이 입으로 천천히 후~ (진짜 풍선은 불지 않아요)",
      safety: "숨을 참지 않아요. 천천히 후~", safety2: "어지러우면 멈춰요.", base: 30, cap: 30 }),
  };
  const STAGES = [
    { id: "b1", name: "하나만", n: 1, sec: 30 },
    { id: "b2", name: "동물 되기", n: 1, sec: 45 },
    { id: "b3", name: "둘 이어서", n: 2, sec: 30 },
    { id: "b4", name: "둘 이어서 더", n: 2, sec: 45 },
    { id: "b5", name: "몸 균형", n: 3, sec: 30 },
    { id: "b6", name: "마무리 숨", n: 3, sec: 30 },
    { id: "b7", name: "두 동작 이어 하기", n: 1, sec: 30 },
    { id: "b8", name: "한 바퀴", n: 4, sec: 30 },
  ];
  function deal(st, set) {
    const shuffle = U.shuffle, mk = (k, a) => CARDS[k](a);
    let list;
    const i = STAGES.indexOf(st);
    if (i === 0) list = [mk(U.pick(["나무", "늘이기", "숨"]))];
    else if (i === 1) list = [mk("동물")];
    else if (i === 2 || i === 3) list = shuffle(["나무", "동물", "하늘", "늘이기"]).slice(0, 2).map((k) => mk(k));
    else if (i === 4) list = shuffle(["한발"].concat(shuffle(["나무", "동물", "하늘", "늘이기"]).slice(0, 2))).map((k) => mk(k));
    else if (i === 5) list = shuffle(["나무", "동물", "하늘", "늘이기", "한발"]).slice(0, 2).map((k) => mk(k)).concat(mk("숨"));
    else if (i === 6) {
      const [a, b] = shuffle(Object.keys(ANIMALS)).slice(0, 2), A = ANIMALS[a], B = ANIMALS[b];
      list = [{ id: "두동작", name: A.name + ", 그다음 " + B.name, how: [A.pose, B.pose], rep: A.pose, line: "먼저 " + A.name + ", 반이 지나면 " + B.name,
        phases: [{ name: A.name, pose: A.pose }, { name: B.name, pose: B.pose }], base: st.sec * 2, badge: A.badge, badgeLabel: A.name }];
      list[0].sec = Kit.sec(st.sec, set) * 2;
      return list;
    } else list = shuffle(["나무", "동물", "하늘", "늘이기"]).slice(0, 2).map((k) => mk(k)).concat([Object.assign(mk("한발"), { base: 60 }), mk("숨")]);
    for (const c of list) c.sec = Kit.sec(c.id === "한발" && i === 7 ? 60 : st.sec, set, c.cap);
    return list;
  }

  JN.registerGame({
    id: "몸따라해요", stages: STAGES, autoRepeat: false, autoNext: false,
    stageLabel: (st) => st.name + " · 카드 " + st.n + "장",
    hintHelp: { always: "처음 자세와 움직이는 자세 그림 2컷 + 한 줄 설명이 늘 보여요", button: "처음엔 이름과 대표 자세 1컷. 힌트 단추를 누르면 2컷과 설명이 나와요", none: "이름과 대표 자세 1컷만 보여요" },
    extraSettings: [Kit.cardTimeSetting("같이몸놀이")],
    parentNote: "화면을 내려놓고 카드 그림대로 몸을 움직여요. 3~5세는 어른이 곁에서 같이 해 주세요. 판이 끝나면 '한 번 더 할까요?'를 묻고 기다려요. 단계는 자동으로 오르지 않으니 여기서 직접 골라 주세요",
    parentSafety: TXT.parent,
    chart: { key: "moveSec", label: "움직인 시간", unit: "초" },
    describe: (e) => "카드 " + (e.cards || 0) + "장 · 움직인 시간 " + fmtMove(e.moveSec) + (e.stopped ? " · 일찍 멈춘 카드 " + e.stopped + "장" : ""),
    intro: (st, set, ctx) => Kit.intro(ctx),
    mount(ctx) {
      return Kit.run(ctx, { cards: deal(ctx.stage, ctx.settings), title: "몸으로 잘 놀았어요!" });
    },
  });
})();
