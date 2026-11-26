/* 보미 우체통 — 보미가 우체통 마을에서 소포를 나눠요 (생각·추리 방).
   위에 규칙 카드(색깔 / 모양), 가운데 소포 하나, 아래에 우체통 둘. 소포를 알맞은 우체통에 넣어요.
   왼쪽 우체통 = 붉은 주황색 동그라미 표시(점 1개), 오른쪽 = 파란색 네모 표시(점 2개). 소포도 색·모양·점 개수가 같은 표시를 달고 있어요.
   2단계부터는 '붉은 주황색 네모' 또는 '파란색 동그라미' 소포만 나와요. 색 규칙과 모양 규칙의 답이 서로 다른 우체통이라서
   한 쪽 우체통만 계속 누르면 다음 소포에서 돌아와요.
   바람이 불면 규칙이 바뀌어요(색깔 ↔ 모양). 규칙 바뀜은 맞게 보낸 소포가 3~4개 쌓일 때마다 와요.
   벌 없음: 틀리면 소포가 가운데로 되돌아오고 보미가 "한 번 더!"만 말해요(빨강·흔들림·점수 없음). 같은 소포를 다시 내요.
   우표첩: 소포를 맞게 보낼 때마다 우표 한 장씩, 12장이 정해진 순서대로 붙어요(무작위 아님).
   12장이 다 차면 '완성 카드'로 끝이고 저절로 새로 시작하지 않아요. 새로 시작은 보호자 설정의 '우표첩 비우기'에서만 해요.
   기록은 이 기기 안에만 저장돼요 (바깥으로 보내지 않아요).
   그림: 기존 보미를 다시 쓰고 우체통·소포·우표·규칙 카드·바람은 이 파일(과 CSS)에서 손그림풍으로 그려요. 새 동물 없음.
   소리: Web Audio 로 직접 만든 음(탁 130Hz · 톡 523Hz · 바람 휙). 꺼져 있어도 그림만으로 놀 수 있어요. */
"use strict";
(function () {
  const U = JN.util, h = U.h, T = JN.t, clamp = U.clamp;   // T: 화면 글자는 lang/ko.js 에서
  const STAMP_MAX = 12;
  /* 단계마다 새 규칙 하나: parcels 소포 수 · conflict 충돌 소포(색과 모양의 답이 달라요) · switches 규칙이 바뀌는 횟수 · after 몇 개 보내면 바뀌는지(범위)
     wind 바람 장면 · cardHide 규칙 카드가 3초 뒤 작아져요 · quiet 바뀌어도 알림이 없고 카드도 안 보여요 */
  const STAGES = [
    { id: "m1", name: T("g.mail.s1"), parcels: 6, conflict: false, switches: 0, after: [3, 4], wind: true, intro: "g.mail.intro" },
    { id: "m2", name: T("g.mail.s2"), parcels: 8, conflict: true, switches: 1, after: [3, 4], wind: true, intro: "g.mail.intro" },
    { id: "m3", name: T("g.mail.s3"), parcels: 10, conflict: true, switches: 3, after: [3, 3], wind: true, intro: "g.mail.intro" },
    { id: "m4", name: T("g.mail.s4"), parcels: 10, conflict: true, switches: 2, after: [3, 4], wind: true, cardHide: true, intro: "g.mail.intro.hide" },
    { id: "m5", name: T("g.mail.s5"), parcels: 10, conflict: true, switches: 2, after: [3, 4], wind: false, cardHide: true, quiet: true, intro: "g.mail.intro.quiet" },
  ];

  /* ---- 그림 (색은 CSS 변수로만) ---- */
  const dotsSvg = (n, x0, y, gap, cls) => { let s = ""; for (let i = 0; i < n; i++) s += '<circle class="' + cls + '" cx="' + (x0 + i * gap) + '" cy="' + y + '" r="4"/>'; return s; };
  /* 소포: s 0 = 동그란 보따리, 1 = 네모 상자. c 0 = 붉은 주황색(점 1개), 1 = 파란색(점 2개) */
  const parcelSvg = (c, s) => '<svg viewBox="0 0 100 100" aria-hidden="true">' +
    (s === 0 ? '<circle class="pc-body" cx="50" cy="50" r="40"/>' : '<rect class="pc-body" x="10" y="10" width="80" height="80" rx="12"/>') +
    '<path class="pc-rib" d="M50 12 V88 M12 50 H88"/>' + dotsSvg(c + 1, 28, 34, 12, "pc-dot") + '</svg>';
  /* 우체통: side 0 = 동그라미 표시 · 점 1개, side 1 = 네모 표시 · 점 2개 */
  const boxSvg = (side) => '<svg viewBox="0 0 100 112" aria-hidden="true"><rect class="bx-post" x="43" y="76" width="14" height="32" rx="3"/>' +
    '<path class="bx-flag" d="M86 52 V28 H98 V40 H92 V52Z"/>' +
    '<path class="bx-body" d="M12 78 V46 C12 24 30 12 50 12 C70 12 88 24 88 46 V78 Z"/>' +
    '<path class="bx-slot" d="M30 60 H70"/>' +
    (side === 0 ? '<circle class="bx-mark" cx="50" cy="38" r="11"/>' : '<rect class="bx-mark" x="39" y="27" width="22" height="22" rx="3"/>') +
    dotsSvg(side + 1, side === 0 ? 50 : 44, 70, 12, "bx-dot") + '</svg>';
  const dropPath = "M0 -13 C9 -3 12 3 12 8 C12 14 6 18 0 18 C-6 18 -12 14 -12 8 C-12 3 -9 -3 0 -13Z";
  const ruleSvg = (rule) => rule === "color"
    ? '<svg viewBox="0 0 80 40" aria-hidden="true"><g transform="translate(22 20) scale(.95)"><path class="rc-drop0" d="' + dropPath + '"/></g><g transform="translate(58 20) scale(.95)"><path class="rc-drop1" d="' + dropPath + '"/></g></svg>'
    : '<svg viewBox="0 0 80 40" aria-hidden="true"><circle class="rc-shape" cx="22" cy="20" r="14"/><rect class="rc-shape" x="45" y="6" width="28" height="28" rx="4"/></svg>';
  const envSvg = '<svg viewBox="0 0 60 40" aria-hidden="true"><rect class="rc-env" x="6" y="6" width="48" height="28" rx="4"/><path class="rc-env" d="M6 8 L30 24 L54 8"/></svg>';
  const WINDSVG = '<svg viewBox="0 0 120 60" aria-hidden="true"><path class="wd" d="M8 20 H78 C96 20 98 6 86 6 C80 6 78 12 82 14"/><path class="wd" d="M18 34 H96 C114 34 116 48 104 48 C98 48 96 42 100 40"/><path class="wd" d="M30 27 H60"/></svg>';
  const BOOKSVG = '<svg viewBox="0 0 60 60" aria-hidden="true"><path class="bk" d="M8 12 H28 C30 12 30 14 30 14 V50 C30 50 28 48 26 48 H8Z"/><path class="bk" d="M52 12 H32 C30 12 30 14 30 14 V50 C30 50 32 48 34 48 H52Z"/></svg>';
  const starPath = () => { let d = ""; for (let i = 0; i < 10; i++) { const r = i % 2 ? 6 : 13, a = -Math.PI / 2 + i * Math.PI / 5; d += (i ? "L" : "M") + (30 + Math.cos(a) * r).toFixed(1) + " " + (32 + Math.sin(a) * r).toFixed(1); } return d + "Z"; };
  const STAR = starPath();
  /* 우표 12장 (정해진 순서): 번호 1~12 · 모양 4가지(동글·별·하트·세모) × 바탕 3가지. 색만으로 구별하지 않게 번호도 적어요 */
  const stampSvg = (i) => {
    const sh = i % 4, bg = ["var(--c-sage-tint)", "var(--c-terracotta-tint)", "var(--c-dustyblue-tint)"][Math.floor(i / 4) % 3];
    const shape = sh === 0 ? '<circle class="st-sh" cx="30" cy="32" r="12"/>' : sh === 1 ? '<path class="st-sh" d="' + STAR + '"/>'
      : sh === 2 ? '<path class="st-sh" d="M30 46 C14 34 18 22 25 24 C28 25 30 28 30 30 C30 28 32 25 35 24 C42 22 46 34 30 46Z"/>' : '<path class="st-sh" d="M30 20 L44 44 H16Z"/>';
    return '<svg viewBox="0 0 60 72" aria-hidden="true"><rect class="st-edge" x="3" y="3" width="54" height="66" rx="4"/><rect class="st-in" x="9" y="9" width="42" height="54" rx="3" style="fill:' + bg + '"/>' +
      shape + '<text class="st-no" x="30" y="59" text-anchor="middle">' + (i + 1) + '</text></svg>';
  };

  JN.registerGame({
    id: "우체통", stages: STAGES, stageLabel: (st) => st.name, desc: T("g.mail.desc"),
    hintHelp: { always: T("g.mail.hh.always"), button: T("g.mail.hh.button"), none: T("g.mail.hh.none") },
    parentNote: T("g.mail.parentNote"),
    /* 보호자 설정의 '우표첩 비우기': 지우는 것은 이 아이의 우표 수(mem.stamps)뿐이에요. 놀이 기록은 그대로 */
    memReset: { key: "stamps", max: STAMP_MAX, label: T("g.mail.reset.label"), sub: T("g.mail.reset.sub"), button: T("g.mail.reset.btn"), confirm: T("g.mail.reset.confirm"), done: T("g.mail.reset.done"), nowKey: "g.mail.reset.now" },
    chart: { key: "parcels", label: T("g.mail.chart"), unit: T("g.mail.unit") },
    describe: (e) => T("g.mail.describe", { n: e.parcels || 0, s: e.switches || 0, r: e.retries || 0 }) + (e.hints ? T("g.number.describe.hint", { n: e.hints }) : ""),
    intro: (st) => T(st.intro),
    mount(ctx) {
      const lv = ctx.stage, mode = ctx.settings.hintMode, mem = ctx.mem, board = ctx.board;
      board.classList.add("mb-board");

      /* ---- 장면 ---- */
      const scene = h("div", { class: "mb-scene", role: "group", "aria-label": T("g.mail.desc"), "data-phase": "idle" });
      const owlEl = h("span", { class: "mb-owl", svg: JN.Assets.owl("웃음", "기본", T("g.mail.aria.owl")) });
      const card = h("div", { class: "mb-card", id: "mbRule", "data-show": "big", "data-rule": "color", role: "img" });
      const faceIcon = h("span", { class: "mb-cardicon" });
      const faceText = h("span", { class: "mb-cardtext" });
      const face = h("span", { class: "mb-face" }, faceIcon, faceText);
      const small = h("span", { class: "mb-cardsmall", svg: envSvg });
      card.append(face, small);
      const stampPop = h("span", { class: "mb-stamp", "aria-hidden": "true" });
      const wind = h("span", { class: "mb-wind", "aria-hidden": "true", svg: WINDSVG });
      const parcel = h("span", { class: "mb-parcel", role: "img", "aria-label": T("g.mail.aria.parcel") });
      const boxes = [0, 1].map((side) => h("button", { type: "button", class: "mb-box", "data-side": side, "aria-label": T("g.mail.aria.box." + side), svg: boxSvg(side) }));
      scene.append(owlEl, card, stampPop, wind, parcel, ...boxes);
      board.appendChild(scene);

      /* 우표첩 (아래 줄 옆 상태 칸) */
      const stampsNow = () => Math.min(STAMP_MAX, mem.stamps | 0);
      const bookTxt = h("span", { text: T("g.mail.book", { n: stampsNow(), max: STAMP_MAX }) });
      const bookIcon = h("i", { class: "bk-i", "aria-hidden": "true", svg: BOOKSVG });
      ctx.status(h("span", { class: "mb-book" }, bookIcon, bookTxt));
      const paintBook = () => { bookTxt.textContent = T("g.mail.book", { n: stampsNow(), max: STAMP_MAX }); bookIcon.classList.add("pop"); ctx.later(() => bookIcon.classList.remove("pop"), 900); };

      /* ---- 놀이 상태 ---- */
      let rule = "color", phase = "idle", done = false, tm = 0;
      let streak = 0, sent = 0, switchesDone = 0, retries = 0, hints = 0, wrongRun = 0, stampGot = 0, completed = false, hintShows = 0;
      let kind = [0, 0], last = [], hideTm = 0, sameSide = 0;
      const pickAfter = () => lv.after[0] + U.rnd(lv.after[1] - lv.after[0] + 1);
      const thresholds = []; for (let i = 0; i < lv.switches; i++) thresholds.push(pickAfter());
      const after = (ms, fn) => { clearTimeout(tm); tm = ctx.later(fn, ms); };
      const setPhase = (p) => { phase = p; scene.dataset.phase = p; };
      const moveMs = () => Math.max(JN.ms(420), 40);
      const correctSide = () => (rule === "color" ? kind[0] : kind[1]);

      /* ---- 규칙 카드 ---- */
      function paintCard() {
        faceIcon.innerHTML = ruleSvg(rule); faceText.textContent = T("g.mail.rule." + rule);
        card.dataset.rule = rule;
        card.setAttribute("aria-label", T(card.dataset.show === "big" ? "g.mail.aria.rule." + rule : "g.mail.aria.rule.hidden"));
      }
      function showCard(big) { card.dataset.show = big ? "big" : "small"; paintCard(); }
      const alwaysBig = mode === "always" || !lv.cardHide;
      function turnCard() {   // 바람이 불면 카드가 한 번 뒤집혀요 (카드가 보일 때만)
        if (card.dataset.show !== "big") return;
        card.classList.remove("turn"); void card.offsetWidth; card.classList.add("turn");
        ctx.later(paintCard, Math.max(JN.ms(380), 20));
      }

      /* ---- 소포 ---- */
      function chooseKind() {
        const pairs = lv.conflict ? [[0, 1], [1, 0]] : [[0, 0], [1, 1]];
        let k = U.pick(pairs);
        if (last.length >= 2 && last[0] === last[1] && last[1] === k[0] + "" + k[1]) k = pairs.find((p) => p[0] + "" + p[1] !== last[1]);   // 같은 소포가 셋 넘게 이어지지 않게
        last = [last[1], k[0] + "" + k[1]]; kind = k;
      }
      function nextParcel() {
        if (done) return;
        wrongRun = 0; chooseKind();
        parcel.dataset.c = kind[0]; parcel.dataset.s = kind[1]; parcel.innerHTML = parcelSvg(kind[0], kind[1]);
        parcel.classList.add("fresh"); parcel.style.transform = ""; parcel.style.opacity = ""; void parcel.offsetWidth; parcel.classList.remove("fresh");
        boxes.forEach((b) => b.classList.remove("got"));
        setPhase("pick"); ctx.say(T("g.mail.say.pick"));
      }
      function send(side) {
        if (done || phase !== "pick") return;   // 날아가는 동안·바람 장면에서는 눌러도 아무 일 없어요
        setPhase("fly");
        const a = parcel.getBoundingClientRect(), b = boxes[side].getBoundingClientRect();
        if (a.width > 4 && b.width > 4) {
          const dx = (b.left + b.width / 2) - (a.left + a.width / 2), dy = (b.top + b.height * 0.4) - (a.top + a.height / 2);
          parcel.style.transform = "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px) scale(.45)";
        }
        after(moveMs() + 40, () => judge(side));
      }
      function judge(side) {
        if (done) return;
        if (side === correctSide()) {
          setPhase("ok"); boxes[side].classList.add("got"); parcel.style.opacity = "0";
          ctx.tone(130, 0.12, 0.05); ctx.tone(523, 0.15, 0.04, 0.1);   // 탁 · 톡
          sent++; streak++; wrongRun = 0;
          const n = stampsNow();
          if (n < STAMP_MAX) {
            mem.stamps = n + 1; ctx.saveMem(); stampGot++; if (n + 1 >= STAMP_MAX) completed = true;
            stampPop.innerHTML = stampSvg(n); stampPop.classList.add("on");
            ctx.later(() => stampPop.classList.remove("on"), Math.max(JN.ms(900), 30));
            paintBook();
          }
          ctx.say(T("g.mail.say.ok"));
          after(Math.max(JN.ms(1000), 40), afterOk);
        } else {   // 벌 없이: 소포가 가운데로 돌아오고 한 번 더
          setPhase("back"); retries++; wrongRun++;
          parcel.style.transform = "";
          ctx.tone(262, 0.25, 0.02);   // 부드러운 낮은 음
          ctx.say(T(lv.quiet && wrongRun >= 2 ? "g.mail.say.maybe" : "g.mail.say.again"));
          after(moveMs() + 40, () => { if (!done) setPhase("pick"); });
        }
      }
      function afterOk() {
        if (done) return;
        if (sent >= lv.parcels) return finishRound();
        if (switchesDone < lv.switches && streak >= thresholds[switchesDone]) return doSwitch();
        nextParcel();
      }
      function doSwitch() {
        switchesDone++; streak = 0; rule = rule === "color" ? "shape" : "color";
        if (lv.wind) {
          setPhase("wind"); ctx.say(T("g.mail.say.wind"));
          [330, 392, 494, 392, 330].forEach((f, i) => ctx.tone(f, 0.16, 0.03, i * 0.13));   // 바람 휙: 올랐다 내려가요
          turnCard();
          after(Math.max(JN.ms(1900), 60), nextParcel);
        } else {   // 알림 없이 조용히 바뀌어요 (카드가 보이는 설정이면 카드만 바뀌어요)
          turnCard();
          after(Math.max(JN.ms(300), 30), nextParcel);
        }
      }

      /* ---- 판 끝 ---- */
      function finishRound() {
        done = true; setPhase("done"); clearTimeout(tm);
        const n = stampsNow(), time = ctx.timer.stop();
        const fin = () => ctx.finish({ cleared: true, time, mistakes: retries, hints, metrics: { parcels: sent, switches: switchesDone, retries }, title: T("g.mail.title"),
          line: T(completed ? "g.mail.line.full" : n >= STAMP_MAX ? "g.mail.line.again" : "g.mail.line", { n }), showTime: false });
        ctx.tone(392, 0.15, 0.04); ctx.tone(523, 0.2, 0.04, 0.12);
        if (completed) after(JN.ms(900), () => showDone(fin)); else after(JN.ms(900), fin);
      }
      /* 우표첩 완성 카드: 우표 12장을 한 줄로 세운 그림 + 따뜻한 말. '고마워요' 단추 하나. 저절로 새로 시작하지 않아요 */
      function showDone(next) {
        if (!ctx.alive()) return;
        const row = h("div", { class: "mb-donestamps", "aria-hidden": "true" });
        for (let i = 0; i < STAMP_MAX; i++) row.appendChild(h("span", { svg: stampSvg(i) }));
        const ok = h("button", { type: "button", class: "jn-btn jn-btn--big", id: "mbDoneOk" }, T("g.mail.done.ok"));
        const dc = h("div", { class: "mb-done", id: "mbDone", role: "group", "aria-label": T("g.mail.done.title") },
          h("div", { class: "mb-donecard" }, h("h2", { text: T("g.mail.done.title") }), row, h("p", { text: T("g.mail.done.body") }), ok));
        board.appendChild(dc);
        setPhase("card");
        U.onTap(ok, () => { if (dc.isConnected) { dc.remove(); next(); } });
        ctx.say(T("g.mail.done.say"));
        try { ok.focus({ preventScroll: true }); } catch (e) { /* 포커스는 없어도 돼요 */ }
      }

      boxes.forEach((b, side) => U.onTap(b, () => send(side)));
      /* 힌트 단추: 규칙 카드가 3초 동안 다시 나타나요 (여러 번 눌러도 돼요) */
      ctx.hint(mode === "button", () => {
        if (done) return;
        hints++; hintShows++; showCard(true); ctx.say(T("g.mail.say.hint." + rule));
        clearTimeout(hideTm);
        if (!alwaysBig) hideTm = ctx.later(() => showCard(false), Math.max(JN.ms(3000), 40));
      });

      function layout() {
        const W = scene.clientWidth, H = scene.clientHeight; if (W < 40 || H < 40) return;
        const cd = clamp(H * 0.17, 34, 64), pc = clamp(H * 0.2, 44, 84), mb = clamp(Math.min(W * 0.32, H * 0.36), 72, 150);
        scene.style.setProperty("--cd", cd.toFixed(1) + "px");
        scene.style.setProperty("--pc", pc.toFixed(1) + "px");
        scene.style.setProperty("--mb", mb.toFixed(1) + "px");
        scene.style.setProperty("--ow", clamp(H * 0.17, 34, 60).toFixed(1) + "px");
        scene.style.setProperty("--tm", moveMs() + "ms");
      }
      layout(); showCard(alwaysBig || !lv.quiet && lv.cardHide);
      if (lv.quiet && mode !== "always") showCard(false);
      parcel.style.opacity = "0";
      return {
        start() {
          ctx.timer.start(); ctx.say(T("g.mail.say.begin"));
          if (lv.cardHide && !lv.quiet && mode !== "always") hideTm = ctx.later(() => showCard(false), Math.max(JN.ms(3000), 40));   // 4단계: 3초 뒤 구석 작은 그림으로
          nextParcel();
        },
        resize: layout,
        visibility(hidden) { /* 소포는 저절로 움직이지 않고 벌도 없어서 따로 멈추지 않아요 */ },
        destroy() { done = true; clearTimeout(tm); clearTimeout(hideTm); },
        test: {
          state: () => ({ phase, rule, streak, sent, total: lv.parcels, switches: switchesDone, switchesTotal: lv.switches, thresholds: JSON.stringify(thresholds),
            retries, hints, wrongRun, parcel: JSON.stringify(kind), kind0: kind[0], kind1: kind[1], correctSide: correctSide(), wrongSide: 1 - correctSide(),
            stamps: stampsNow(), stampGot, done, completed, cardShow: card.dataset.show, cardRule: card.dataset.rule, mode, conflict: !!lv.conflict, quiet: !!lv.quiet, hintShows }),
        },
      };
    },
  });
})();
