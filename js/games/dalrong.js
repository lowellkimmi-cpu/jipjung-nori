/* 달롱 건너기 — 깃발을 보고 톡 누르거나 기다리며 징검돌을 건너요 (주의집중 방).
   발자국 깃발이면 톡(달롱이 한 걸음), 손바닥 깃발이면 기다려요(기다리면 그것도 한 걸음).
   기다려야 할 때 눌러도 벌은 없어요: 달롱이 쉼 돌로 미끄러져 돌아가고 '다시!' 한마디만 나와요. 깃발을 못 보고 지나가도 같은 깃발이 한 번 더 나와요.
   그림은 기존 손그림풍 그림(보미·달롱·토끼·꽃·나비)만 다시 쓰고, 깃발·징검돌·해/달만 이 파일에서 그려요. 새 그림 파일·바깥 요청 없음.
   소리는 Web Audio 로 직접 만든 음(폴짝·퐁·쉬이)이고, 소리가 꺼져 있어도 그림만으로 놀 수 있어요.
   꽃길: 건널 때마다 꽃이 정해진 순서대로 한 송이씩 피어요(아이별로 이 기기에만 저장, 30송이에서 끝). 점수·순위·반응 시간은 재지도 저장하지도 않아요. */
"use strict";
(function () {
  const U = JN.util, h = U.h, T = JN.t, clamp = U.clamp;   // T: 화면 글자는 lang/ko.js 에서
  const FLOWER_MAX = 30, FLOWER_KINDS = ["동글꽃", "튤립", "해바라기"];
  /* 단계마다 새 규칙 하나: stones 징검돌 수 · ratio 톡:기다려 비율 · goSec 톡 깃발을 기다려 주는 시간 · stop 기다리는 길이(초 범위)
     warn 기다려 깃발 전에 반쯤 올라오는 예고 · check 쉼 돌로 돌아가기 · butterfly 나비 · night 해/달 거꾸로 */
  const STAGES = [
    { id: "d1", name: T("g.dalrong.s1"), stones: 4, ratio: [3, 1], goSec: 4, stop: [2, 2], warn: true, check: false },
    { id: "d2", name: T("g.dalrong.s2"), stones: 6, ratio: [3, 2], goSec: 3, stop: [2, 2], warn: false, check: true },
    { id: "d3", name: T("g.dalrong.s3"), stones: 6, ratio: [3, 2], goSec: 3, stop: [1, 4], warn: false, check: true },
    { id: "d4", name: T("g.dalrong.s4"), stones: 6, ratio: [1, 1], goSec: 3, stop: [1, 4], warn: false, check: true, butterfly: true },
    { id: "d5", name: T("g.dalrong.s5"), stones: 6, ratio: [1, 1], goSec: 3, stop: [1, 4], warn: false, check: true, butterfly: true, night: true },
  ];
  const CHECK_EVERY = 3;   // 3칸마다 쉼 돌

  /* 깃발 한 장 (발자국 / 손바닥을 둘 다 그려 두고 data-k 로 하나만 보여요 — 색과 모양이 둘 다 달라요)
     (2026-11-27 요청 '깃발 그림 이상해' → 손바닥을 엄지 있는 진짜 손 모양으로, 발자국도 다시 그림. 같은 모양을 두 번 겹쳐(굵은 선 + 크림색 속) 테두리를 그려요) */
  const FLAG_SVG = '<svg viewBox="0 0 70 90" aria-hidden="true"><path class="pole" d="M14 88 V6"/><circle class="knob" cx="14" cy="6" r="3.2"/><g class="cloth-g"><path class="cloth" d="M16 9' +
    ' C26 4 34 12 42 8 S58 5 64 9 L64 53 C56 49 50 57 42 53 S26 50 16 55 Z"/><g class="k-foot"><g class="mk-ol"><ellipse cx="30" cy="41" rx="6.2" ry="9.4"/><circle cx="36.0" c' +
    'y="25.8" r="2.5"/><circle cx="31.6" cy="23.0" r="2.3"/><circle cx="27.1" cy="23.4" r="2.1"/><circle cx="23.4" cy="26.6" r="1.9"/><ellipse cx="50" cy="32" rx="6.2" ry="9.4' +
    '"/><circle cx="44.0" cy="16.8" r="2.5"/><circle cx="48.4" cy="14.0" r="2.3"/><circle cx="52.9" cy="14.4" r="2.1"/><circle cx="56.6" cy="17.6" r="1.9"/></g><g class="mk-in' +
    '"><ellipse cx="30" cy="41" rx="6.2" ry="9.4"/><circle cx="36.0" cy="25.8" r="2.5"/><circle cx="31.6" cy="23.0" r="2.3"/><circle cx="27.1" cy="23.4" r="2.1"/><circle cx="2' +
    '3.4" cy="26.6" r="1.9"/><ellipse cx="50" cy="32" rx="6.2" ry="9.4"/><circle cx="44.0" cy="16.8" r="2.5"/><circle cx="48.4" cy="14.0" r="2.3"/><circle cx="52.9" cy="14.4" ' +
    'r="2.1"/><circle cx="56.6" cy="17.6" r="1.9"/></g></g><g transform="translate(20 11) scale(.4)"><g class="k-palm"><g class="mk-ol"><rect x="30" y="14" width="11" height="' +
    '46" rx="5.5"/><rect x="43" y="8" width="11.5" height="52" rx="5.75"/><rect x="56" y="12" width="11" height="48" rx="5.5"/><rect x="68" y="25" width="10" height="38" rx="5' +
    '.0"/><rect x="29" y="44" width="49" height="46" rx="17"/><rect x="19" y="46" width="12.5" height="42" rx="6.25" transform="rotate(-34 25 67)"/></g><g class="mk-in"><rect ' +
    'x="30" y="14" width="11" height="46" rx="5.5"/><rect x="43" y="8" width="11.5" height="52" rx="5.75"/><rect x="56" y="12" width="11" height="48" rx="5.5"/><rect x="68" y=' +
    '"25" width="10" height="38" rx="5.0"/><rect x="29" y="44" width="49" height="46" rx="17"/><rect x="19" y="46" width="12.5" height="42" rx="6.25" transform="rotate(-34 25 ' +
    '67)"/></g></g></g></g></svg>';
  const SUN_SVG = '<svg viewBox="0 0 60 60" aria-hidden="true"><circle class="sun" cx="30" cy="30" r="12"/><path class="ray" d="M30 6 V13 M30 47 V54 M6 30 H13 M47 30 H54 M13 13 L18 18 M42 42 L47 47 M47 13 L42 18 M18 42 L13 47"/></svg>';
  const MOON_SVG = '<svg viewBox="0 0 60 60" aria-hidden="true"><path class="moon" d="M38 8 C22 10 12 24 16 40 C20 54 38 58 50 48 C36 48 28 34 34 20 C35 15 36 11 38 8 Z"/><path class="star" d="M48 14 l1.6 3.6 3.6 1.6 -3.6 1.6 -1.6 3.6 -1.6 -3.6 -3.6 -1.6 3.6 -1.6Z"/></svg>';

  JN.registerGame({
    id: "달롱건너기", stages: STAGES, stageLabel: (st) => st.name,
    hintHelp: { always: T("g.dalrong.hh.always"), button: T("g.dalrong.hh.button"), none: T("g.dalrong.hh.none") },
    parentNote: T("g.dalrong.parentNote"),
    /* 보호자 설정의 '새 꽃길 시작': 지우는 것은 이 아이의 꽃길 수(mem.flowers)뿐이에요. 놀이 기록은 그대로 */
    memReset: { key: "flowers", max: FLOWER_MAX, label: T("g.dalrong.reset.label"), sub: T("g.dalrong.reset.sub"), button: T("g.dalrong.reset.btn"), confirm: T("g.dalrong.reset.confirm"), done: T("g.dalrong.reset.done") },
    chart: { key: "crossings", label: T("g.dalrong.chart"), unit: T("g.dalrong.unit") },
    describe: (e) => T("g.dalrong.describe", { n: e.crossings || 1, r: e.retries || 0 }) + (e.hints ? T("g.number.describe.hint", { n: e.hints }) : ""),
    intro: (st) => (st.night ? T("g.dalrong.intro.night") : T("g.dalrong.intro")),
    mount(ctx) {
      const lv = ctx.stage, mode = ctx.settings.hintMode, mem = ctx.mem, board = ctx.board, N = lv.stones;
      board.classList.add("dg-board");

      /* ---- 장면 ---- */
      const mkSnail = (face) => JN.Assets.snail(face, "기본", T("g.dalrong.aria.snail"));
      const mkRabbit = (face) => Art.animal("토끼", { face, label: T("g.dalrong.aria.rabbit") });
      const scene = h("div", { class: "dg-scene", role: "img", "aria-label": T("g.dalrong.aria.scene") });
      scene.append(h("span", { class: "dg-bank l" }), h("span", { class: "dg-bank r" }));
      const pos = (i) => (7 + i * 86 / (N + 1)).toFixed(2) + "%";
      for (let i = 1; i <= N; i++) scene.appendChild(h("span", { class: "dg-stone" + (lv.check && i % CHECK_EVERY === 0 ? " check" : ""), style: "left:" + pos(i) }));
      const snailEl = h("span", { class: "dg-snail", style: "left:" + pos(0), svg: mkSnail("기본") });
      const owlEl = h("span", { class: "dg-owl", style: "left:" + pos(N + 1), svg: JN.Assets.owl("웃음", "기본", T("g.dalrong.aria.owl")) });
      const bloomEl = h("span", { class: "dg-bloom", "aria-hidden": "true" });
      const flag = h("span", { class: "dg-flag", "data-s": "down", "data-k": "foot", role: "img", "aria-label": T("g.dalrong.aria.flag"), svg: FLAG_SVG });
      const rabbitEl = h("span", { class: "dg-rabbit", svg: mkRabbit("기본") });
      const sign = h("span", { class: "dg-sign", hidden: lv.night ? null : true, role: "img", "aria-label": T("g.dalrong.aria.sun"), svg: SUN_SVG });
      scene.append(sign, h("span", { class: "dg-flagger" }, flag, rabbitEl), snailEl, owlEl, bloomEl);

      const tapBtn = h("button", { type: "button", class: "dg-tap", id: "dgTap", "aria-label": T("g.dalrong.tap") }, h("span", { text: T("g.dalrong.tap") }));
      const tapBox = h("div", { class: "dg-tapbox" }, tapBtn);
      if (lv.butterfly) tapBox.appendChild(h("span", { class: "dg-bfly", "aria-hidden": "true", svg: Art.insect("나비", { label: T("g.dalrong.aria.bfly") }) }));
      board.append(scene, tapBox);

      const flowersNow = Math.min(FLOWER_MAX, mem.flowers | 0);
      const flowerTxt = h("span", { text: T("g.dalrong.flowers", { n: flowersNow, max: FLOWER_MAX }) });
      ctx.status(h("span", { class: "dg-flowers" }, h("i", { class: "fl", "aria-hidden": "true", svg: Art.flower(FLOWER_KINDS[flowersNow % 3], { label: "" }) }), flowerTxt));

      /* ---- 놀이 상태 ---- */
      let stone = 0, phase = "idle", cur = null, steps = 0, retries = 0, hints = 0, done = false, trialNo = 0, tm = 0;
      let retryPending = null, sinceRetry = 9, shownNight = false, held = false;
      const recent = [], forced = [];
      const nudge = U.nudge(ctx, () => (cur ? (cur.need === "tap" ? tapBtn : flag) : null), { idleMs: 0 });   // 첫 판: 두 번 막히면 손이 '톡' 단추(또는 깃발)를 가리켜요
      const after = (ms, fn) => { clearTimeout(tm); tm = ctx.later(fn, ms); };
      const goMs = () => Math.max(JN.ms(lv.goSec * 1000), 700);   // 시험 속도에서도 눌러 볼 시간은 남겨요
      const nightNow = () => !!lv.night && Math.floor(trialNo / 3) % 2 === 1;
      const setSnail = (f) => { snailEl.innerHTML = mkSnail(f); };
      const setRabbit = (f) => { rabbitEl.innerHTML = mkRabbit(f); };
      const setFlag = (s, k) => { flag.dataset.s = s; if (k) { flag.dataset.k = k; flag.setAttribute("aria-label", T(k === "foot" ? "g.dalrong.aria.foot" : "g.dalrong.aria.palm")); } };
      const setSign = (night) => { sign.innerHTML = night ? MOON_SVG : SUN_SVG; sign.setAttribute("aria-label", T(night ? "g.dalrong.aria.moon" : "g.dalrong.aria.sun")); sign.dataset.k = night ? "moon" : "sun"; };
      const moveSnail = (slip) => { snailEl.classList.toggle("slip", !!slip); snailEl.style.left = pos(stone); };
      const mk = (need, night) => ({ need, night, flag: need === "tap" ? (night ? "palm" : "foot") : (night ? "foot" : "palm"), stopLen: Math.round(U.rand(lv.stop[0], lv.stop[1]) * 2) / 2 });
      function pickSig() {
        if (forced.length) { trialNo++; return mk(forced.shift(), nightNow()); }
        if (retryPending && sinceRetry >= 1) { const r = retryPending; retryPending = null; return mk("wait", r.night); }   // 눌러 버린 '기다려'는 나중에 다시 나와요
        const n = nightNow();
        let need = Math.random() * (lv.ratio[0] + lv.ratio[1]) < lv.ratio[0] ? "tap" : "wait";
        if (recent.length >= 3 && recent.slice(-3).every((x) => x === need)) need = need === "tap" ? "wait" : "tap";   // 같은 깃발이 3번 넘게 이어지지 않게
        trialNo++; sinceRetry++;
        return mk(need, n);
      }
      function nextTrial() {
        if (done) return;
        const sig = pickSig(); recent.push(sig.need);
        phase = "gap"; cur = null; setFlag("down");
        after(JN.ms(700), () => present(sig));
      }
      function present(sig) {
        if (done) return;
        cur = sig;
        if (lv.night && sig.night !== shownNight) { shownNight = sig.night; setSign(sig.night); ctx.say(T(sig.night ? "g.dalrong.say.night" : "g.dalrong.say.day")); }
        if (sig.need === "wait" && (lv.warn || mode === "always")) { phase = "warn"; setFlag("half", sig.flag); after(JN.ms(1000), () => reveal(sig)); }
        else reveal(sig);
      }
      function reveal(sig) {
        if (done) return;
        phase = "show"; setFlag("up", sig.flag);
        if (held) { clearTimeout(tm); return; }   // 시험용 멈춤 (앱에서는 항상 꺼져 있어요)
        if (sig.need === "tap") after(goMs(), onGoTimeout); else after(Math.max(JN.ms(sig.stopLen * 1000), 600), onWaited);   // 시험 속도에서도 최소 0.6초는 기다려요
      }
      function step(kind) {
        phase = "moving"; steps++; stone++; moveSnail(false); setFlag("down"); nudge.ok();
        setSnail("웃음"); setRabbit("웃음");
        if (kind === "go") { ctx.tone(392, 0.12, 0.05); ctx.tone(523, 0.16, 0.05, 0.1); ctx.tone(880, 0.1, 0.03, 0.26); ctx.say(T("g.dalrong.say.go")); }
        else { ctx.tone(196, 0.5, 0.04); ctx.say(T("g.dalrong.say.wait")); }
        after(JN.ms(850), () => { setSnail("기본"); setRabbit("기본"); if (stone >= N) arrive(); else nextTrial(); });
      }
      function onGoTimeout() {   // 못 눌러도 벌 없이 같은 깃발을 한 번 더 (횟수는 기록하지 않아요)
        if (done || phase !== "show") return;
        phase = "gap"; setFlag("down"); setSnail("쉬어요"); ctx.say(T("g.dalrong.say.slow")); nudge.wrong();
        const sig = cur;
        after(JN.ms(1100), () => { setSnail("기본"); present(sig); });
      }
      function onWaited() { if (!done && phase === "show") step("wait"); }
      function slip() {   // 기다려야 할 때 눌렀어요: 빨강·흔들림 없이 쉼 돌로 쭈르륵
        clearTimeout(tm); phase = "moving"; retries++; setFlag("down"); nudge.wrong();
        const sig = cur; setRabbit("기본");
        if (lv.check) {
          const back = stone - (stone % CHECK_EVERY);
          const moved = back !== stone; stone = back; moveSnail(true);
          ctx.say(T(moved ? "g.dalrong.say.slipBack" : "g.dalrong.say.slip"));
          retryPending = { night: sig.night }; sinceRetry = 0;
          after(JN.ms(1400), nextTrial);
        } else {   // 1단계: 쉼 돌 없이 그 깃발만 다시
          ctx.say(T("g.dalrong.say.slip"));
          after(JN.ms(1200), () => present(mk("wait", sig.night)));
        }
      }
      function arrive() {
        done = true; phase = "done"; clearTimeout(tm); nudge.stop();
        stone = N + 1; moveSnail(false); setSnail("웃음");
        const had = Math.min(FLOWER_MAX, mem.flowers | 0), grew = had < FLOWER_MAX, now = grew ? had + 1 : had;
        if (grew) { mem.flowers = now; ctx.saveMem(); bloomEl.innerHTML = Art.flower(FLOWER_KINDS[(now - 1) % 3], { label: "" }); bloomEl.classList.add("on"); }
        flowerTxt.textContent = T("g.dalrong.flowers", { n: now, max: FLOWER_MAX });
        ctx.tone(392, 0.15, 0.05); ctx.tone(523, 0.18, 0.05, 0.12); ctx.tone(880, 0.3, 0.04, 0.26);
        ctx.say(T("g.dalrong.say.arrive"));
        const time = ctx.timer.stop();
        const fin = () => ctx.finish({ cleared: true, time, mistakes: retries, hints, metrics: { crossings: 1, steps, retries }, title: T("g.dalrong.title"),
          line: T(now >= FLOWER_MAX ? (grew ? "g.dalrong.line.full" : "g.dalrong.line.again") : "g.dalrong.line", { n: now }), showTime: false });
        if (grew && now >= FLOWER_MAX) after(JN.ms(1500), () => showDone(fin));   // 30송이가 다 피면 칭찬 화면 앞에 '꽃길 완성' 카드
        else after(JN.ms(1500), fin);
      }
      /* 꽃길 완성 카드: 꽃 30송이를 한 줄로 세운 그림 + 따뜻한 말. 벌·점수 없이 '고마워요' 단추 하나 */
      function showDone(next) {
        if (!ctx.alive()) return;
        const row = h("div", { class: "dg-doneflowers", "aria-hidden": "true" });
        for (let i = 0; i < FLOWER_MAX; i++) row.appendChild(h("span", { svg: Art.flower(FLOWER_KINDS[i % 3], { label: "" }) }));
        const ok = h("button", { type: "button", class: "jn-btn jn-btn--big", id: "dgDoneOk" }, T("g.dalrong.done.ok"));
        const card = h("div", { class: "dg-done", id: "dgDone", role: "group", "aria-label": T("g.dalrong.done.title") },
          h("div", { class: "dg-donecard" }, h("h2", { text: T("g.dalrong.done.title") }), row, h("p", { text: T("g.dalrong.done.body") }), ok));
        board.appendChild(card);
        phase = "card";
        U.onTap(ok, () => { if (card.isConnected) { card.remove(); next(); } });
        ctx.say(T("g.dalrong.done.say"));
        try { ok.focus({ preventScroll: true }); } catch (e) { /* 포커스는 없어도 돼요 */ }
      }
      function press() {
        if (done) return;
        if (phase === "show" && cur) { if (cur.need === "tap") { clearTimeout(tm); step("go"); } else slip(); }
        /* 깃발이 없을 때·움직이는 중에 눌러도 아무 일 없어요 */
      }
      U.onTap(tapBtn, press);
      tapBtn.addEventListener("pointerdown", (e) => e.preventDefault());
      ctx.hint(mode === "button", () => {
        if (done) return;
        hints++; flag.classList.add("big"); ctx.say(T("g.dalrong.say.hint"));
        ctx.later(() => flag.classList.remove("big"), 1500);
      });

      function layout() {
        const W = scene.clientWidth, H = scene.clientHeight; if (W < 40 || H < 40) return;
        const st = clamp(Math.min(W / (N + 4), H * 0.2), 26, 72);
        scene.style.setProperty("--st", st.toFixed(1) + "px");
        scene.style.setProperty("--sn", clamp(Math.min(st * 1.9, H * 0.3), 46, 110).toFixed(1) + "px");
        scene.style.setProperty("--rb", clamp(H * 0.36, 50, 130).toFixed(1) + "px");
      }
      layout();
      return {
        start() { ctx.timer.start(); ctx.say(T("g.dalrong.say.begin")); nextTrial(); },
        resize: layout,
        visibility(hidden) { /* 깃발은 저절로 지나가도 벌이 없어서 따로 멈추지 않아요 */ },
        destroy() { done = true; clearTimeout(tm); nudge.stop(); },
        test: {
          state: () => ({ phase, need: cur ? cur.need : null, flag: cur ? cur.flag : null, night: cur ? cur.night : null, stone, stones: N, steps, retries, hints, flowers: Math.min(FLOWER_MAX, mem.flowers | 0), done, check: !!lv.check, warn: !!lv.warn || mode === "always" }),
          queue: (...needs) => { forced.push(...needs); },
          present: (need) => { if (done) return; clearTimeout(tm); present(mk(need, nightNow())); },   // 시험용: 지금 바로 이 깃발을 올려요
          setTrial: (n) => { trialNo = n; },
          nudge: () => ({ shown: nudge.shown(), visible: nudge.visible() }),
          hold: (b) => { held = !!b; },   // 시험용: 깃발이 올라온 뒤 저절로 지나가는 시간 재기를 멈춰요 (PC 가 바빠도 시험이 흔들리지 않게)
        },
      };
    },
  });
})();
