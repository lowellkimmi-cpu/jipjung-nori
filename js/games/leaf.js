/* 잎 아래 어디? — 달롱이 열매를 잎 아래에 숨기면 잎이 자리를 바꿔요. 열매가 있는 잎을 눌러 찾아요 (기억력 방).
   한 판은 세 번 찾아요. 한 번의 흐름: ① 열매가 보여요(잎이 살짝 들려요) → ② 잎이 덮이고 서로 자리를 바꿔요(땅이 불룩하게 지나가요)
   → ③ 잎이 멈추면 하나를 눌러요. 입력은 ②(섞는 동안)에는 잠겨 있어요.
   벌 없음: 못 찾으면 그 잎과 열매가 있던 잎을 열어서 보여 주고(빨강·흔들림·점수 없음), 같은 배치를 처음부터 한 번 더 조금 더 천천히 보여 줘요
   (속도 ×0.8, 몇 번이든 괜찮아요). 다시 해서 찾은 열매도 보따리에 들어가요.
   보따리: 열매 12가지가 정해진 순서대로 한 개씩 들어가요(무작위 아님). 12개가 다 차면 '완성 카드'로 끝이고, 저절로 새로 시작하지 않아요.
   새로 시작은 보호자 설정의 '보따리 비우기'에서만 해요. 기록은 이 기기 안에만 저장돼요 (바깥으로 보내지 않아요).
   그림: 기존 열매(Art.fruit)·달롱·나비를 다시 쓰고, 큰 잎·땅 불룩 효과·보따리만 이 파일(과 CSS)에서 그려요. 새 동물 없음.
   소리: Web Audio 로 직접 만든 음(쓱 330Hz, 톡 523Hz). 소리가 꺼져 있어도 그림만으로 놀 수 있어요. */
"use strict";
(function () {
  const U = JN.util, h = U.h, T = JN.t, clamp = U.clamp;   // T: 화면 글자는 lang/ko.js 에서
  const FRUIT_MAX = 12, TRIES = 3;
  const KINDS = ["사과", "바나나", "딸기", "포도", "수박", "귤"];
  /* 열매 12가지 (정해진 순서): 앞 여섯은 그냥, 뒤 여섯은 점무늬. 색만으로 구별하지 않게 무늬도 달라요 */
  const fruitSvg = (i) => Art.fruit(KINDS[i % 6], i >= 6 ? { pattern: "점", label: "" } : { label: "" });
  /* 단계마다 새 규칙 하나: leaves 잎 수 · swaps 바꾸는 횟수 · sec 한 번 바꾸는 시간(초) · ask 열매 2개를 숨기고 하나만 물어요 · butterfly 나비가 지나가요 */
  const STAGES = [
    { id: "y1", name: T("g.leaf.s1"), leaves: 2, swaps: 1, sec: 1.2 },
    { id: "y2", name: T("g.leaf.s2"), leaves: 3, swaps: 2, sec: 1.1 },
    { id: "y3", name: T("g.leaf.s3"), leaves: 3, swaps: 4, sec: 0.8 },
    { id: "y4", name: T("g.leaf.s4"), leaves: 4, swaps: 3, sec: 1.0, ask: true },
    { id: "y5", name: T("g.leaf.s5"), leaves: 5, swaps: 6, sec: 0.9, butterfly: true },
  ];
  const GY = 66;   // 땅 줄 높이(장면 위에서부터 %)

  /* 큰 잎 한 장 (색은 CSS, 아래쪽 점 n개로도 구별해요) */
  const leafSvg = (n) => {
    let dots = "";
    for (let i = 0; i < n; i++) dots += '<circle class="dot" cx="' + (50 + (i - (n - 1) / 2) * 10).toFixed(1) + '" cy="76" r="3.2"/>';
    return '<svg viewBox="0 0 100 90" aria-hidden="true"><path class="lf" d="M8 80 C2 42 28 8 52 6 C76 10 98 42 92 80 C70 90 30 90 8 80Z"/>' +
      '<path class="vein" d="M50 12 V66 M50 36 L31 24 M50 50 L28 40 M50 36 L69 24 M50 50 L72 40"/>' + dots + '</svg>';
  };
  /* 달롱 보따리 */
  const BAG_SVG = '<svg viewBox="0 0 60 60" aria-hidden="true"><path class="bag" d="M20 18 C10 28 6 44 14 52 C24 58 36 58 46 52 C54 44 50 28 40 18 Z"/>' +
    '<path class="bag" d="M20 18 C24 12 36 12 40 18"/><path class="bagline" d="M22 23 C28 27 34 27 38 23"/></svg>';

  JN.registerGame({
    id: "잎아래", stages: STAGES, stageLabel: (st) => st.name, desc: T("g.leaf.desc"),
    hintHelp: { always: T("g.leaf.hh.always"), button: T("g.leaf.hh.button"), none: T("g.leaf.hh.none") },
    parentNote: T("g.leaf.parentNote"),
    /* 보호자 설정의 '보따리 비우기': 지우는 것은 이 아이의 보따리 열매 수(mem.fruits)뿐이에요. 놀이 기록은 그대로 */
    memReset: { key: "fruits", max: FRUIT_MAX, label: T("g.leaf.reset.label"), sub: T("g.leaf.reset.sub"), button: T("g.leaf.reset.btn"), confirm: T("g.leaf.reset.confirm"), done: T("g.leaf.reset.done"), nowKey: "g.leaf.reset.now" },
    chart: { key: "found", label: T("g.leaf.chart"), unit: T("g.leaf.unit") },
    describe: (e) => T("g.leaf.describe", { n: e.found || 1, r: e.retries || 0 }) + (e.hints ? T("g.number.describe.hint", { n: e.hints }) : ""),
    intro: () => T("g.leaf.intro"),
    mount(ctx) {
      const lv = ctx.stage, mode = ctx.settings.hintMode, mem = ctx.mem, board = ctx.board, N = lv.leaves;
      board.classList.add("ly-board");

      /* ---- 장면 ---- */
      const scene = h("div", { class: "ly-scene", role: "group", "aria-label": T("g.leaf.desc"), "data-phase": "idle" });
      scene.style.setProperty("--gy", GY);
      scene.appendChild(h("span", { class: "ly-ground" }));
      const snailEl = h("span", { class: "ly-snail", svg: JN.Assets.snail("기본", "기본", T("g.leaf.aria.snail")) });
      scene.appendChild(snailEl);
      const askChip = h("span", { class: "ly-ask", hidden: true });
      scene.appendChild(askChip);
      const xOf = (slot) => +(((slot + 0.5) / N) * 100).toFixed(2);
      const leaves = [];
      for (let L = 0; L < N; L++) {
        const fr = h("span", { class: "ly-fruit", "aria-hidden": "true" });
        const lid = h("span", { class: "ly-lid", svg: leafSvg(L + 1) });
        const arc = h("span", { class: "ly-arc" }, fr, lid);
        const el = h("button", { type: "button", class: "ly-leaf", "data-leaf": L, "data-c": L % 5, "data-slot": L }, arc);
        leaves.push({ el, fr });
        scene.appendChild(el);
      }
      if (lv.butterfly) scene.appendChild(h("span", { class: "ly-bfly", "aria-hidden": "true", svg: Art.insect("나비", { label: T("g.leaf.aria.bfly") }) }));
      board.appendChild(scene);

      /* 보따리 (아래 줄 옆 상태 칸) */
      const fruitsNow = () => Math.min(FRUIT_MAX, mem.fruits | 0);
      const bagTxt = h("span", { text: T("g.leaf.bag", { n: fruitsNow(), max: FRUIT_MAX }) });
      const bagIcon = h("i", { class: "bg", "aria-hidden": "true", svg: BAG_SVG });
      ctx.status(h("span", { class: "ly-bag" }, bagIcon, bagTxt));
      const paintBag = (popFruit) => {
        const n = fruitsNow();
        bagTxt.textContent = T("g.leaf.bag", { n, max: FRUIT_MAX });
        if (popFruit != null) { bagIcon.innerHTML = fruitSvg(popFruit); bagIcon.classList.add("pop"); ctx.later(() => bagIcon.classList.remove("pop"), 900); }
      };

      /* ---- 놀이 상태 ---- */
      let slotOf = leaves.map((_, i) => i);      // 잎 → 지금 자리
      let fruitOf = new Array(N).fill(-1);       // 잎 → 그 아래 열매(0~11), 없으면 -1
      let phase = "idle", done = false, tm = 0, trial = 0, found = 0, retries = 0, hints = 0, speed = 1;
      let plan = [], targetLeaf = 0, targetFruit = 0, hintUsed = false, completed = false, extra = 0, swapsDone = 0;
      const after = (ms, fn) => { clearTimeout(tm); tm = ctx.later(fn, ms); };
      const setPhase = (p) => { phase = p; scene.dataset.phase = p; };
      const setSnail = (f) => { snailEl.innerHTML = JN.Assets.snail(f, "기본", T("g.leaf.aria.snail")); };
      const gapMs = () => Math.max(JN.ms(220), 30);
      const durMs = (k) => Math.max(JN.ms(lv.sec * 1000 / speed * (k || 1)), 40);

      function place(instant) {
        if (instant) scene.classList.add("nomove");
        leaves.forEach((o, L) => {
          o.el.style.setProperty("--x", xOf(slotOf[L]));
          o.el.dataset.slot = slotOf[L];
          o.el.setAttribute("aria-label", T("g.leaf.aria.leaf", { n: slotOf[L] + 1 }));
        });
        if (instant) { void scene.offsetWidth; scene.classList.remove("nomove"); }
      }
      function paintFruits() {
        leaves.forEach((o, L) => { o.fr.innerHTML = fruitOf[L] >= 0 ? fruitSvg(fruitOf[L]) : ""; o.el.classList.remove("open", "found", "up", "down"); });
      }
      const slotsAfter = (k) => { const s = leaves.map((_, i) => i); for (let i = 0; i < k; i++) { const [a, b] = plan[i]; [s[a], s[b]] = [s[b], s[a]]; } return s; };
      function makePlan() {
        let p = [];
        for (let g = 0; g < 80; g++) {
          p = []; let prev = "";
          for (let k = 0; k < lv.swaps; k++) {
            let a, b, key;
            do { a = U.rnd(N); b = U.rnd(N); key = Math.min(a, b) + "-" + Math.max(a, b); } while (a === b || key === prev);
            p.push([a, b]); prev = key;
          }
          const s = leaves.map((_, i) => i); for (const [a, b] of p) [s[a], s[b]] = [s[b], s[a]];
          if (s[targetLeaf] !== targetLeaf) return p;   // 열매가 처음 자리에 그대로 돌아오지 않게
        }
        return p;
      }
      const nextFruit = () => { const n = fruitsNow(); return n < FRUIT_MAX ? n : (extra++ % FRUIT_MAX); };

      /* 땅이 불룩하게 지나가는 효과 (두 자리 사이) */
      function mound(sa, sb, dur) {
        const m = h("span", { class: "ly-mound", "aria-hidden": "true" }); scene.appendChild(m);
        const xa = xOf(sa) + "%", xb = xOf(sb) + "%";
        try { m.animate([{ left: xa, opacity: 0 }, { left: xa, opacity: 0.95, offset: 0.15 }, { left: xb, opacity: 0.95, offset: 0.85 }, { left: xb, opacity: 0 }], { duration: dur, easing: "ease-in-out" }); } catch (e) { /* 효과는 없어도 돼요 */ }
        ctx.later(() => m.remove(), dur + 80);
      }
      function dew(sa, sb) {   // '늘 보기' 힌트: 열매가 있는 잎이 지나간 자리에 연한 이슬 자국
        const a = xOf(sa), b = xOf(sb);
        scene.appendChild(h("span", { class: "ly-dew", "aria-hidden": "true", style: "left:" + Math.min(a, b) + "%;width:" + Math.abs(a - b) + "%" }));
      }
      const clearDew = () => scene.querySelectorAll(".ly-dew, .ly-mound").forEach((e) => e.remove());

      function doSwap(pair, dur, cb) {
        const [a, b] = pair, sa = slotOf[a], sb = slotOf[b];
        slotOf[a] = sb; slotOf[b] = sa; swapsDone++;
        scene.style.setProperty("--sw", dur + "ms");
        leaves[a].el.classList.add("up"); leaves[b].el.classList.add("down");
        place(false);
        mound(sa, sb, dur);
        if (mode === "always" && (fruitOf[a] >= 0 || fruitOf[b] >= 0)) dew(sa, sb);
        ctx.tone(330, 0.12, 0.03);   // 쓱
        after(dur + 30, () => { leaves[a].el.classList.remove("up"); leaves[b].el.classList.remove("down"); cb(); });
      }

      /* ---- 한 번의 흐름 ---- */
      function newTrial() {
        if (done) return;
        trial++; speed = 1;
        targetFruit = nextFruit();
        const order = U.shuffle(leaves.map((_, i) => i));
        fruitOf.fill(-1);
        targetLeaf = order[0]; fruitOf[targetLeaf] = targetFruit;
        if (lv.ask) fruitOf[order[1]] = (targetFruit + 1) % FRUIT_MAX;   // 다른 종류 열매 하나를 더 숨겨요 (물어보는 것은 늘 보따리에 들어갈 열매)
        plan = makePlan();
        runTrial();
      }
      function runTrial() {   // 같은 배치를 처음부터 (다시 볼 때도 이 함수)
        if (done) return;
        clearDew();
        askChip.hidden = true;
        slotOf = leaves.map((_, i) => i); place(true); paintFruits();
        setPhase("look"); setSnail("기본");
        leaves.forEach((o, L) => o.el.classList.toggle("open", fruitOf[L] >= 0));
        ctx.say(T("g.leaf.say.look"));
        after(JN.ms(2000), () => {
          leaves.forEach((o) => o.el.classList.remove("open"));
          after(Math.max(JN.ms(500), 40), startShuffle);
        });
      }
      function startShuffle() {
        if (done) return;
        setPhase("shuffle"); ctx.say(T("g.leaf.say.shuffle"));
        let k = 0;
        const next = () => {
          if (done) return;
          if (k >= plan.length) return endShuffle();
          doSwap(plan[k++], durMs(), () => after(gapMs(), next));
        };
        next();
      }
      function endShuffle() {
        setPhase("pick");
        if (lv.ask) {
          askChip.innerHTML = ""; askChip.append(h("i", { svg: fruitSvg(targetFruit), "aria-hidden": "true" }));
          askChip.setAttribute("aria-label", T("g.leaf.fruit." + targetFruit)); askChip.hidden = false;
          ctx.say(T("g.leaf.say.askName", { name: T("g.leaf.fruit." + targetFruit) }));
        } else ctx.say(T("g.leaf.say.pick"));
      }
      const isRight = (L) => (lv.ask ? fruitOf[L] === targetFruit : fruitOf[L] >= 0);

      function pick(L) {
        if (done || phase !== "pick") return;   // 섞는 동안·열어 보여 주는 동안 눌러도 아무 일 없어요
        setPhase("judge");
        const el = leaves[L].el; el.classList.add("open");
        if (isRight(L)) {
          el.classList.add("found"); setSnail("웃음");
          ctx.tone(523, 0.15, 0.05);   // 톡
          found++;
          const n = fruitsNow();
          if (n < FRUIT_MAX) { mem.fruits = n + 1; ctx.saveMem(); if (n + 1 >= FRUIT_MAX) completed = true; }
          paintBag(targetFruit);
          ctx.say(T("g.leaf.say.found"));
          after(JN.ms(1400), () => { if (found >= TRIES) finishRound(); else newTrial(); });
        } else {   // 벌 없이: 열어서 보여 주고 같은 배치를 한 번 더, 조금 더 천천히
          retries++;
          leaves.forEach((o, i) => { if (fruitOf[i] >= 0) o.el.classList.add("open"); });
          ctx.tone(262, 0.3, 0.02);   // 부드러운 낮은 음
          ctx.say(T("g.leaf.say.miss"));
          after(JN.ms(1900), () => {
            speed = Math.max(0.5, speed * 0.8);
            ctx.say(T("g.leaf.say.again"));
            after(JN.ms(700), runTrial);
          });
        }
      }

      function finishRound() {
        done = true; setPhase("done"); clearTimeout(tm);
        const n = fruitsNow(), time = ctx.timer.stop();
        const fin = () => ctx.finish({ cleared: true, time, mistakes: retries, hints, metrics: { found, retries }, title: T("g.leaf.title"),
          line: T(completed ? "g.leaf.line.full" : n >= FRUIT_MAX ? "g.leaf.line.again" : "g.leaf.line", { n }), showTime: false });
        ctx.tone(392, 0.15, 0.04); ctx.tone(523, 0.2, 0.04, 0.12);
        if (completed) after(JN.ms(900), () => showDone(fin)); else after(JN.ms(900), fin);
      }
      /* 보따리 완성 카드: 열매 12개를 한 줄로 세운 그림 + 따뜻한 말. '고마워요' 단추 하나. 저절로 새로 시작하지 않아요 */
      function showDone(next) {
        if (!ctx.alive()) return;
        const row = h("div", { class: "ly-donefruits", "aria-hidden": "true" });
        for (let i = 0; i < FRUIT_MAX; i++) row.appendChild(h("span", { svg: fruitSvg(i) }));
        const ok = h("button", { type: "button", class: "jn-btn jn-btn--big", id: "lyDoneOk" }, T("g.leaf.done.ok"));
        const card = h("div", { class: "ly-done", id: "lyDone", role: "group", "aria-label": T("g.leaf.done.title") },
          h("div", { class: "ly-donecard" }, h("h2", { text: T("g.leaf.done.title") }), row, h("p", { text: T("g.leaf.done.body") }), ok));
        board.appendChild(card);
        setPhase("card");
        U.onTap(ok, () => { if (card.isConnected) { card.remove(); next(); } });
        ctx.say(T("g.leaf.done.say"));
        try { ok.focus({ preventScroll: true }); } catch (e) { /* 포커스는 없어도 돼요 */ }
      }

      leaves.forEach((o, L) => U.onTap(o.el, () => pick(L)));
      /* 힌트 단추: 섞기가 끝난 뒤 누르면 마지막 두 번의 바꿈을 천천히 한 번 다시 보여 줘요 (한 판에 한 번) */
      ctx.hint(mode === "button", () => {
        if (done || phase !== "pick" || hintUsed) return;
        hintUsed = true; hints++; ctx.hint(false, null);
        setPhase("replay"); askChip.hidden = true; ctx.say(T("g.leaf.say.hint"));
        const n = plan.length, from = Math.max(0, n - 2);
        slotOf = slotsAfter(from); place(true);
        let k = from;
        const run = () => {
          if (done) return;
          if (k >= n) { endShuffle(); return; }
          doSwap(plan[k++], durMs(1.6), () => after(gapMs(), run));
        };
        after(Math.max(JN.ms(500), 40), run);
      });

      function layout() {
        const W = scene.clientWidth, H = scene.clientHeight; if (W < 40 || H < 40) return;
        scene.style.setProperty("--ls", clamp(Math.min(W / (N + 0.6), H * 0.42), 58, 150).toFixed(1) + "px");
        scene.style.setProperty("--sn", clamp(H * 0.2, 40, 84).toFixed(1) + "px");
      }
      layout(); place(true);
      return {
        start() { ctx.timer.start(); ctx.say(T("g.leaf.say.begin")); newTrial(); },
        resize: layout,
        visibility(hidden) { /* 잎은 저절로 움직여도 벌이 없어서 따로 멈추지 않아요 */ },
        destroy() { done = true; clearTimeout(tm); },
        test: {
          state: () => ({ phase, trial, found, retries, hints, speed, leaves: N, swaps: plan.length, swapsDone, ask: !!lv.ask, askFruit: lv.ask ? targetFruit : -1,
            fruit: targetFruit, fruits: fruitsNow(), rightSlot: slotOf[targetLeaf], plan: JSON.stringify(plan), slots: JSON.stringify(slotOf),
            fruitLeaves: fruitOf.map((f, i) => (f >= 0 ? i : -1)).filter((i) => i >= 0).map((i) => slotOf[i]), hintUsed, done, completed, mode }),
        },
      };
    },
  });
})();
