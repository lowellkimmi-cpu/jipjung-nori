/* 짝꿍 카드 — 카드를 두 장씩 뒤집어 짝 찾기. 그림은 art.js 에 값만 바꿔 넣는 방식 */
"use strict";
(function () {
  const U = JN.util, h = U.h, T = JN.t;   // T: 화면 글자는 lang/ko.js 에서
  /* [1] 단계 데이터 — 원래 놀이 + 정해 둔 단계 표 그대로 */
  const STAGES = [
    { id: "m1", name: T("g.memory.m1"), cards: 4, preview: 3, pools: ["fruit"] },
    { id: "m2", name: T("g.memory.m2"), cards: 6, preview: 2, pools: ["fruit", "animal"] },
    { id: "m3", name: T("g.memory.m3"), cards: 8, preview: 1, pools: ["animal", "vehicle"] },
    { id: "m4", name: T("g.memory.m4"), cards: 12, preview: 0, pools: ["fruit", "animal", "vehicle"] },
    { id: "m5", name: T("g.memory.m5"), cards: 12, preview: 0, pools: ["fruit", "animal", "vehicle"], similar: ["color", "count"], note: T("g.memory.m5.note") },
    { id: "m6", name: T("g.memory.m6"), cards: 16, preview: 0, pools: ["fruit", "animal", "vehicle"], similar: ["expr", "dir", "pattern", "color"], note: T("g.memory.m6.note") },
    { id: "m7", name: T("g.memory.m7"), cards: 16, preview: 0, rules: ["shadow", "momBaby", "numDots"], oneRulePerRound: true },
    { id: "m8", name: T("g.memory.m8"), cards: 20, preview: 0, rules: ["shadow", "momBaby", "numDots"], note: T("g.memory.m8.note") },
  ];
  const RULE_NOTES = { shadow: T("g.memory.rule.shadow"), momBaby: T("g.memory.rule.momBaby"), numDots: T("g.memory.rule.numDots") };
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
  const NAMES = (f) => f.t === "num" ? T("g.memory.name.num", { n: f.n }) : f.t === "dots" ? T("g.memory.name.dots", { n: f.n }) : (f.o.baby ? T("g.memory.name.baby") : "") + f.k + (f.o.shadow ? T("g.memory.name.shadow") : "") + (f.o.count > 1 ? T("g.memory.name.count", { n: f.o.count }) : "");
  function draw(f) {
    if (f.t === "num") return Art.numberCard(f.n, { color: C.forest });
    if (f.t === "dots") return Art.dotsCard(f.n);
    return Art[f.t](f.k, f.o);
  }
  const keyOf = (f) => JSON.stringify(f);

  JN.registerGame({
    id: "짝꿍카드", stages: STAGES,
    hintHelp: { always: T("g.memory.hh.always"), button: T("g.memory.hh.button"), none: T("g.memory.hh.none") },
    extraSettings: [{ key: "compareHelp", type: "bool", label: T("g.memory.x.compare"), def: true }],
    chart: { key: "time", label: T("common.time"), unit: T("common.unit.sec") },
    describe: (e) => U.fmtTime(e.time) + T("g.memory.describe", { tries: e.tries || 0, m: e.mistakes || 0 }) + (e.hints ? T("g.number.describe.hint", { n: e.hints }) : ""),
    intro: (st) => st.note || T("g.memory.intro"),
    mount(ctx) {
      const lv = ctx.stage, set = ctx.settings, mode = set.hintMode, board = ctx.board, mem = ctx.mem;
      board.classList.add("mc-board");
      const grid = h("div", { class: "mc-grid", role: "group", "aria-label": T("g.memory.aria.board") });
      board.appendChild(grid);
      let cards = [], open = [], lock = true, matched = 0, tries = 0, wrong = 0, hints = 0, note = lv.note || T("g.memory.intro");

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
        c.el.classList.add("open"); c.el.setAttribute("aria-label", T("g.memory.aria.card", { name: NAMES(c.face) }));
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
          else ctx.say(matched === 1 ? T("g.memory.say.first") : T("g.memory.say.good"));
        } else {
          wrong++; lock = true;
          const similar = a.sim && a.sim === b.sim && set.compareHelp;
          ctx.later(() => {
            const back = () => { a.el.classList.remove("open"); b.el.classList.remove("open"); a.el.setAttribute("aria-label", T("g.memory.aria.back")); b.el.setAttribute("aria-label", T("g.memory.aria.back")); lock = false; };
            if (similar) compare(a, b, back); else back();     // 조용히 다시 뒤집기
          }, CONF.wrongFlipBackMs / JN.TIME_SCALE);
        }
      }
      function compare(a, b, done) {
        const ov = h("div", { class: "mc-compare", role: "dialog", "aria-label": T("g.memory.cmp.title") },
          h("div", { class: "box" }, h("h2", { text: T("g.memory.cmp.title") }),
            h("div", { class: "pair" }, h("div", { svg: draw(a.face) }), h("div", { svg: draw(b.face) })),
            h("p", { text: T("g.memory.cmp.text") }),
            h("button", { class: "jn-btn jn-btn--primary", type: "button", onclick: () => { ov.remove(); done(); } }, T("soon.ok"))));
        board.appendChild(ov);
      }
      function finish() {
        const time = ctx.timer.stop();
        ctx.finish({ cleared: true, time, mistakes: wrong, hints, metrics: { tries }, title: T("g.memory.title"), line: T("g.memory.line", { n: tries }),
          bestKey: lv.id, bestValue: tries });
      }
      function beginPlay() {
        lock = false; ctx.timer.start(); ctx.say(T("g.memory.say.begin"));
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
        c.el = h("button", { class: "card", type: "button", "aria-label": T("g.memory.aria.back"), "data-i": String(i), "data-pair": String(c.pair) },
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
            ctx.say(T("g.memory.say.watch", { n: pv }));
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
