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

  /* 깃발 한 장 (발자국 / 손바닥을 둘 다 그려 두고 data-k 로 하나만 보여요 — 색과 모양이 둘 다 달라요) */
  const FLAG_SVG = '<svg viewBox="0 0 70 90" aria-hidden="true"><path class="pole" d="M14 88 V6"/><g class="cloth-g"><path class="cloth" d="M16 8 L64 10 Q67 28 64 54 L16 56 Z"/>' +
    '<g class="k-foot"><ellipse class="mark" cx="33" cy="36" rx="6.5" ry="10"/><circle class="mark" cx="27" cy="22" r="2.6"/><circle class="mark" cx="33" cy="20" r="2.6"/><circle class="mark" cx="39" cy="22" r="2.6"/>' +
    '<ellipse class="mark" cx="49" cy="40" rx="5.5" ry="8.5"/><circle class="mark" cx="44" cy="27" r="2.2"/><circle class="mark" cx="49" cy="25" r="2.2"/><circle class="mark" cx="54" cy="27" r="2.2"/></g>' +
    '<g class="k-palm"><circle class="mark" cx="40" cy="40" r="9.5"/><rect class="mark" x="29.5" y="19" width="5.4" height="17" rx="2.7"/><rect class="mark" x="36" y="16" width="5.4" height="19" rx="2.7"/><rect class="mark" x="42.5" y="18" width="5.4" height="18" rx="2.7"/><rect class="mark" x="49" y="22" width="5.2" height="15" rx="2.6"/></g></g></svg>';
  const SUN_SVG = '<svg viewBox="0 0 60 60" aria-hidden="true"><circle class="sun" cx="30" cy="30" r="12"/><path class="ray" d="M30 6 V13 M30 47 V54 M6 30 H13 M47 30 H54 M13 13 L18 18 M42 42 L47 47 M47 13 L42 18 M18 42 L13 47"/></svg>';
  const MOON_SVG = '<svg viewBox="0 0 60 60" aria-hidden="true"><path class="moon" d="M38 8 C22 10 12 24 16 40 C20 54 38 58 50 48 C36 48 28 34 34 20 C35 15 36 11 38 8 Z"/><path class="star" d="M48 14 l1.6 3.6 3.6 1.6 -3.6 1.6 -1.6 3.6 -1.6 -3.6 -3.6 -1.6 3.6 -1.6Z"/></svg>';

  JN.registerGame({
    id: "달롱건너기", stages: STAGES, stageLabel: (st) => st.name,
    hintHelp: { always: T("g.dalrong.hh.always"), button: T("g.dalrong.hh.button"), none: T("g.dalrong.hh.none") },
    parentNote: T("g.dalrong.parentNote"),
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
      let retryPending = null, sinceRetry = 9, shownNight = false;
      const recent = [], forced = [];
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
        if (sig.need === "tap") after(goMs(), onGoTimeout); else after(Math.max(JN.ms(sig.stopLen * 1000), 600), onWaited);   // 시험 속도에서도 최소 0.6초는 기다려요
      }
      function step(kind) {
        phase = "moving"; steps++; stone++; moveSnail(false); setFlag("down");
        setSnail("웃음"); setRabbit("웃음");
        if (kind === "go") { ctx.tone(392, 0.12, 0.05); ctx.tone(523, 0.16, 0.05, 0.1); ctx.tone(880, 0.1, 0.03, 0.26); ctx.say(T("g.dalrong.say.go")); }
        else { ctx.tone(196, 0.5, 0.04); ctx.say(T("g.dalrong.say.wait")); }
        after(JN.ms(850), () => { setSnail("기본"); setRabbit("기본"); if (stone >= N) arrive(); else nextTrial(); });
      }
      function onGoTimeout() {   // 못 눌러도 벌 없이 같은 깃발을 한 번 더 (횟수는 기록하지 않아요)
        if (done || phase !== "show") return;
        phase = "gap"; setFlag("down"); setSnail("쉬어요"); ctx.say(T("g.dalrong.say.slow"));
        const sig = cur;
        after(JN.ms(1100), () => { setSnail("기본"); present(sig); });
      }
      function onWaited() { if (!done && phase === "show") step("wait"); }
      function slip() {   // 기다려야 할 때 눌렀어요: 빨강·흔들림 없이 쉼 돌로 쭈르륵
        clearTimeout(tm); phase = "moving"; retries++; setFlag("down");
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
        done = true; phase = "done"; clearTimeout(tm);
        stone = N + 1; moveSnail(false); setSnail("웃음");
        const had = Math.min(FLOWER_MAX, mem.flowers | 0), grew = had < FLOWER_MAX, now = grew ? had + 1 : had;
        if (grew) { mem.flowers = now; ctx.saveMem(); bloomEl.innerHTML = Art.flower(FLOWER_KINDS[(now - 1) % 3], { label: "" }); bloomEl.classList.add("on"); }
        flowerTxt.textContent = T("g.dalrong.flowers", { n: now, max: FLOWER_MAX });
        ctx.tone(392, 0.15, 0.05); ctx.tone(523, 0.18, 0.05, 0.12); ctx.tone(880, 0.3, 0.04, 0.26);
        ctx.say(T("g.dalrong.say.arrive"));
        const time = ctx.timer.stop();
        after(JN.ms(1500), () => ctx.finish({ cleared: true, time, mistakes: retries, hints, metrics: { crossings: 1, steps, retries }, title: T("g.dalrong.title"),
          line: T(now >= FLOWER_MAX ? (grew ? "g.dalrong.line.full" : "g.dalrong.line.again") : "g.dalrong.line", { n: now }), showTime: false }));
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
        destroy() { done = true; clearTimeout(tm); },
        test: {
          state: () => ({ phase, need: cur ? cur.need : null, flag: cur ? cur.flag : null, night: cur ? cur.night : null, stone, stones: N, steps, retries, hints, flowers: Math.min(FLOWER_MAX, mem.flowers | 0), done, check: !!lv.check, warn: !!lv.warn || mode === "always" }),
          queue: (...needs) => { forced.push(...needs); },
          present: (need) => { if (done) return; clearTimeout(tm); present(mk(need, nightNow())); },   // 시험용: 지금 바로 이 깃발을 올려요
          setTrial: (n) => { trialNo = n; },
        },
      };
    },
  });
})();
