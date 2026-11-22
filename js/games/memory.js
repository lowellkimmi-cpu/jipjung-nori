/* 짝꿍 카드 — 카드를 두 장씩 뒤집어 짝 찾기. 그림은 art.js 에 값만 바꿔 넣는 방식 */
"use strict";
(function () {
  const U = JN.util, h = U.h;
  /* [1] 단계 데이터 — 원래 놀이 + 정해 둔 단계 표 그대로 */
  const STAGES = [
    { id: "m1", name: "4장 · 과일 · 미리 보기 3초", cards: 4, preview: 3, pools: ["fruit"] },
    { id: "m2", name: "6장 · 과일·동물 · 미리 보기 2초", cards: 6, preview: 2, pools: ["fruit", "animal"] },
    { id: "m3", name: "8장 · 동물·탈것 · 미리 보기 1초", cards: 8, preview: 1, pools: ["animal", "vehicle"] },
    { id: "m4", name: "12장 · 여러 종류 · 미리 보기 없음", cards: 12, preview: 0, pools: ["fruit", "animal", "vehicle"] },
    { id: "m5", name: "12장 · 비슷한 카드 (색·개수)", cards: 12, preview: 0, pools: ["fruit", "animal", "vehicle"], similar: ["color", "count"], note: "비슷한 카드가 있어요. 잘 보고 찾아요" },
    { id: "m6", name: "16장 · 표정·방향·무늬가 달라요", cards: 16, preview: 0, pools: ["fruit", "animal", "vehicle"], similar: ["expr", "dir", "pattern", "color"], note: "표정·방향·무늬가 조금씩 달라요" },
    { id: "m7", name: "16장 · 짝 규칙이 바뀌어요", cards: 16, preview: 0, rules: ["shadow", "momBaby", "numDots"], oneRulePerRound: true },
    { id: "m8", name: "20장 · 짝 규칙이 섞여요", cards: 20, preview: 0, rules: ["shadow", "momBaby", "numDots"], note: "그림자·엄마와 아기·숫자와 점, 짝 규칙이 섞여 있어요" },
  ];
  const RULE_NOTES = { shadow: "그림과 그 그림자를 짝지어요", momBaby: "엄마 동물과 아기 동물을 짝지어요", numDots: "숫자와 점 개수가 같은 카드를 짝지어요" };
  const CONF = { alwaysExtraPreviewSec: 2, hintPeekMs: 1200, wrongFlipBackMs: 1000 };
  const C = Art.COLORS;
  const F = (t, k, o) => ({ t, k, o: o || {} });
  const POOLS = {
    fruit: Art.FRUITS.map((k) => F("fruit", k)),
    animal: Art.ANIMALS.map((k) => F("animal", k)),
    vehicle: Art.VEHICLES.map((k) => F("vehicle", k)),
  };
  /* 비슷한 카드: 같은 그림 함수에 색·개수·표정·방향·무늬 값만 바꿔요 */
  const SIMILAR = {
    color: [[F("animal", "고양이", { color: C.apricot }), F("animal", "고양이", { color: C.lilac })], [F("vehicle", "자동차", { color: C.sky }), F("vehicle", "자동차", { color: C.apricot })],
            [F("animal", "곰", { color: C.brown }), F("animal", "곰", { color: C.honey })], [F("vehicle", "버스", { color: C.honey }), F("vehicle", "버스", { color: C.mint })]],
    count: [[F("fruit", "사과", { count: 1 }), F("fruit", "사과", { count: 2 })], [F("fruit", "딸기", { count: 1 }), F("fruit", "딸기", { count: 3 })], [F("fruit", "귤", { count: 2 }), F("fruit", "귤", { count: 4 })]],
    expr: [[F("animal", "고양이", { face: "기본" }), F("animal", "고양이", { face: "놀람" })], [F("animal", "강아지", { face: "웃음" }), F("animal", "강아지", { face: "쉬어요" })], [F("fruit", "딸기", { face: "웃음" }), F("fruit", "딸기", { face: "쉬어요" })]],
    dir: [[F("animal", "강아지", { dir: "left" }), F("animal", "강아지", { dir: "right" })], [F("animal", "오리", { dir: "left" }), F("animal", "오리", { dir: "right" })], [F("vehicle", "자동차", { dir: "right" }), F("vehicle", "자동차", { dir: "left" })]],
    pattern: [[F("animal", "토끼", { pattern: "점", color: C.pink }), F("animal", "토끼", { pattern: "하트", color: C.pink })], [F("animal", "곰", { pattern: "줄" }), F("animal", "곰", { pattern: "별" })]],
  };
  const NAMES = (f) => f.t === "num" ? "숫자 " + f.n : f.t === "dots" ? "점 " + f.n + "개" : (f.o.baby ? "아기 " : "") + f.k + (f.o.shadow ? " 그림자" : "") + (f.o.count > 1 ? " " + f.o.count + "개" : "");
  function draw(f) {
    if (f.t === "num") return Art.numberCard(f.n, { color: C.forest });
    if (f.t === "dots") return Art.dotsCard(f.n);
    return Art[f.t](f.k, f.o);
  }
  const keyOf = (f) => JSON.stringify(f);

  JN.registerGame({
    id: "짝꿍카드", stages: STAGES,
    hintHelp: { always: "처음에 카드를 더 오래(최소 2초 + 2초) 보여 줘요", button: "힌트 버튼을 누르면 한 짝을 잠깐 보여 줘요", none: "미리 보기만큼만 보고 찾아요" },
    extraSettings: [{ key: "compareHelp", type: "bool", label: "비슷한 카드를 헷갈리면 \"어디가 다를까?\" 보여 주기", def: true }],
    chart: { key: "time", label: "걸린 시간", unit: "초" },
    describe: (e) => U.fmtTime(e.time) + " · " + (e.tries || 0) + "번 뒤집기 · 다른 짝 " + (e.mistakes || 0) + "번" + (e.hints ? " · 힌트 " + e.hints + "번" : ""),
    intro: (st) => st.note || "같은 그림 짝을 찾아요",
    mount(ctx) {
      const lv = ctx.stage, set = ctx.settings, mode = set.hintMode, board = ctx.board, mem = ctx.mem;
      board.classList.add("mc-board");
      const grid = h("div", { class: "mc-grid", role: "group", "aria-label": "카드판" });
      board.appendChild(grid);
      let cards = [], open = [], lock = true, matched = 0, tries = 0, wrong = 0, hints = 0, note = lv.note || "같은 그림 짝을 찾아요";

      function buildPairs() {
        const need = lv.cards / 2, pairs = [], used = new Set();
        const addSame = (f, sim) => { const k = keyOf(f); if (used.has(k)) return; used.add(k); pairs.push({ a: f, b: f, sim }); };
        if (lv.rules) {
          let rules = lv.rules.slice();
          if (lv.oneRulePerRound) { const r = rules[(mem.ruleTurn | 0) % rules.length]; mem.ruleTurn = (mem.ruleTurn | 0) + 1; rules = [r]; note = RULE_NOTES[r]; }
          const animals = U.shuffle(Art.ANIMALS.slice()), nums = U.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
          const shadowPool = U.shuffle(POOLS.fruit.concat(POOLS.animal, POOLS.vehicle)), usedK = new Set();
          for (let i = 0; pairs.length < need && i < 300; i++) {
            const r = rules[i % rules.length];
            if (r === "momBaby") { const k = animals.find((a) => !usedK.has(a)); if (!k) continue; usedK.add(k); pairs.push({ a: F("animal", k), b: F("animal", k, { baby: true }) }); }
            else if (r === "numDots" && nums.length) { const n = nums.pop(); pairs.push({ a: { t: "num", n }, b: { t: "dots", n } }); }
            else if (r === "shadow") { const f = shadowPool.find((x) => !usedK.has(x.k)); if (!f) continue; usedK.add(f.k); pairs.push({ a: f, b: F(f.t, f.k, { shadow: true }) }); }
          }
        } else {
          (lv.similar || []).forEach((kind) => {
            for (const s of U.shuffle(SIMILAR[kind].slice())) {
              if (pairs.length + s.length > need) break;
              if (s.every((f) => !used.has(keyOf(f)))) { s.forEach((f) => addSame(f, kind)); break; }
            }
          });
          const pool = U.shuffle(lv.pools.flatMap((p) => POOLS[p])), simK = new Set(pairs.map((p) => p.a.k));
          for (const f of pool) { if (pairs.length >= need) break; if (!simK.has(f.k)) addSame(f, null); }
          for (const f of pool) { if (pairs.length >= need) break; addSame(f, null); }
        }
        return pairs;
      }
      function layout() {
        const n = cards.length; if (!n) return;
        const W = board.clientWidth - 28, H = board.clientHeight - 28, gap = 12;
        let best = null;
        for (let cols = 2; cols <= Math.min(n, 6); cols++) {
          const rows = Math.ceil(n / cols);
          const w = Math.min((W - gap * (cols - 1)) / cols, (H - gap * (rows - 1)) / rows / 1.25, 170);
          if (!best || w > best.w) best = { cols, w };
        }
        const w = Math.max(48, Math.floor(best.w)), ht = Math.floor(w * 1.25);
        grid.style.gridTemplateColumns = "repeat(" + best.cols + ", " + w + "px)";
        cards.forEach((c) => { c.el.style.width = w + "px"; c.el.style.height = ht + "px"; });
      }
      function flip(i) {
        const c = cards[i];
        if (lock || c.done || open.includes(i)) return;
        c.el.classList.add("open"); c.el.setAttribute("aria-label", "카드: " + NAMES(c.face));
        ctx.sound("tap");
        open.push(i);
        if (open.length < 2) return;
        tries++;
        const [x, y] = open; open = [];
        const a = cards[x], b = cards[y];
        if (a.pair === b.pair) {
          a.done = b.done = true; matched++;
          ctx.sound("ok");
          ctx.later(() => { a.el.classList.add("gone"); b.el.classList.add("gone"); }, 450);
          if (matched === cards.length / 2) ctx.later(finish, 900);
          else ctx.say(matched === 1 ? "짝꿍을 찾았어요!" : "좋아요!");
        } else {
          wrong++; lock = true;
          const similar = a.sim && a.sim === b.sim && set.compareHelp;
          ctx.later(() => {
            const back = () => { a.el.classList.remove("open"); b.el.classList.remove("open"); a.el.setAttribute("aria-label", "뒤집힌 카드"); b.el.setAttribute("aria-label", "뒤집힌 카드"); lock = false; };
            if (similar) compare(a, b, back); else back();     // 조용히 다시 뒤집기
          }, CONF.wrongFlipBackMs / JN.TIME_SCALE);
        }
      }
      function compare(a, b, done) {
        const ov = h("div", { class: "mc-compare", role: "dialog", "aria-label": "어디가 다를까?" },
          h("div", { class: "box" }, h("h2", { text: "어디가 다를까?" }),
            h("div", { class: "pair" }, h("div", { svg: draw(a.face) }), h("div", { svg: draw(b.face) })),
            h("p", { text: "두 카드를 천천히 살펴봐요." }),
            h("button", { class: "jn-btn jn-btn--primary", type: "button", onclick: () => { ov.remove(); done(); } }, "알겠어요")));
        board.appendChild(ov);
      }
      function finish() {
        const time = ctx.timer.stop();
        ctx.finish({ cleared: true, time, mistakes: wrong, hints, metrics: { tries }, title: "짝꿍을 다 찾았어요!", line: tries + "번 뒤집어서 찾았어요.",
          bestKey: lv.id, bestValue: tries });
      }
      function beginPlay() {
        lock = false; ctx.timer.start(); ctx.say("카드를 두 장씩 뒤집어 보세요");
      }
      ctx.hint(mode === "button", () => {
        if (lock) return;
        const left = cards.map((c, i) => i).filter((i) => !cards[i].done && !open.includes(i));
        if (!left.length) return;
        const p = cards[U.pick(left)].pair, two = cards.filter((c) => c.pair === p && !c.done);
        lock = true; hints++;
        open.forEach((i) => cards[i].el.classList.remove("open")); open = [];
        two.forEach((c) => c.el.classList.add("open"));
        ctx.later(() => { two.forEach((c) => c.el.classList.remove("open")); lock = false; }, CONF.hintPeekMs / JN.TIME_SCALE);
      });

      const pairs = buildPairs();
      pairs.forEach((p, i) => { cards.push({ pair: i, face: p.a, sim: p.sim }); cards.push({ pair: i, face: p.b, sim: p.sim }); });
      U.shuffle(cards);
      cards.forEach((c, i) => {
        c.el = h("button", { class: "card", type: "button", "aria-label": "뒤집힌 카드", "data-i": String(i), "data-pair": String(c.pair) },
          h("span", { class: "inner" }, h("span", { class: "face back", svg: JN.Assets.cardBack() }), h("span", { class: "face front", svg: draw(c.face) }),
            h("span", { class: "check-mark", svg: Art.icon("확인") })));
        c.el.addEventListener("click", () => flip(i));
        grid.appendChild(c.el);
      });
      layout();
      return {
        start() {
          ctx.say(note);
          let pv = lv.preview;
          if (mode === "always") pv = Math.max(pv, 2) + CONF.alwaysExtraPreviewSec;
          if (pv > 0) {
            cards.forEach((c) => c.el.classList.add("open"));
            ctx.say("잘 봐 두세요 (" + pv + "초)");
            ctx.later(() => { cards.forEach((c) => c.el.classList.remove("open")); beginPlay(); }, pv * 1000 / JN.TIME_SCALE);
          } else beginPlay();
        },
        resize: layout,
        destroy() { lock = true; },
        test: { pairs: () => cards.map((c) => c.pair), locked: () => lock, matched: () => matched },
      };
    },
  });
})();
