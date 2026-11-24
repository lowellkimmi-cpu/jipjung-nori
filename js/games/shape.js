/* 같은 모양 (옛 '똑같은 모양 찾기') — 보기와 똑같은 모양 찾기. 오답은 보기와 딱 한 가지만 달라요 */
"use strict";
(function () {
  const U = JN.util, h = U.h, rnd = U.rnd, pick = U.pick, shuffle = U.shuffle;
  const K = Art.COLORS, INK = Art.INK;
  const DATA = {
    stages: [
      { id: "c3", name: "후보 3개 · 색과 모양이 달라요", choices: 3, diffs: ["color", "body"], tip: "색과 모양을 살펴봐요" },
      { id: "c4", name: "후보 4개 · 색·모양·점이 달라요", choices: 4, diffs: ["color", "body", "dot"], tip: "색, 모양, 작은 점을 살펴봐요" },
      { id: "c6", name: "후보 6개 · 점·줄·방향이 달라요", choices: 6, diffs: ["dot", "lines", "mirror", "rotate"], tip: "작은 점 자리, 줄 개수, 뾰족한 귀의 방향을 살펴봐요" },
      { id: "c9", name: "후보 9개 · 점·줄·뒤집힘·회전", choices: 9, diffs: ["dot", "lines", "mirror", "rotate"], tip: "작은 점 자리, 줄 개수, 뾰족한 귀의 방향을 살펴봐요" },
    ],
    palette: [K.leaf, K.sky, K.honey, K.apricot, K.lilac],
    bodies: ["circle", "square", "triangle", "diamond", "pentagon", "hexagon"],
    farBodies: { circle: ["triangle", "square", "diamond"], square: ["circle", "triangle"], triangle: ["circle", "square", "hexagon"],
      diamond: ["circle", "hexagon", "square"], pentagon: ["triangle", "square", "diamond"], hexagon: ["triangle", "diamond"] },
    dots: [[-10, -5], [10, -5], [0, -16], [0, 2]], lineYs: [10, 16, 22], tab: [[4, -10], [40, -38], [14, -2]],
    questionsPerGame: 10, passScore: 8, timing: { okMs: 1100, showAnswerMs: 2200 },
  };
  function regular(n, r, d0) { const out = []; for (let i = 0; i < n; i++) { const a = (d0 + i * 360 / n) * Math.PI / 180; out.push([r * Math.cos(a), r * Math.sin(a)]); } return out; }
  const BODY = { square: [[-28, -28], [28, -28], [28, 28], [-28, 28]], triangle: [[0, -36], [34, 28], [-34, 28]], diamond: [[0, -36], [34, 0], [0, 36], [-34, 0]], pentagon: regular(5, 34, -90), hexagon: regular(6, 32, 0) };
  function xf(d, [x, y]) { if (d.mirror) x = -x; for (let k = 0; k < d.rot; k++) [x, y] = [-y, x]; return [x, y]; }
  function build(d) {
    const P = (pts) => pts.map((p) => xf(d, p));
    const prims = [{ t: "poly", fill: d.tabColor, pts: P(DATA.tab) }];
    if (d.body === "circle") prims.push({ t: "circ", fill: d.color, c: xf(d, [0, 0]), r: 31 });
    else prims.push({ t: "poly", fill: d.color, pts: P(BODY[d.body]) });
    for (let k = 0; k < d.lines; k++) { const y = DATA.lineYs[k]; prims.push({ t: "line", pts: P([[-11, y], [11, y]]) }); }
    prims.push({ t: "circ", fill: INK, c: xf(d, DATA.dots[d.dot]), r: 5.5 });
    return prims;
  }
  const r1 = (v) => { const s = (Math.round(v * 10) / 10).toFixed(1); return s === "-0.0" ? "0.0" : s; };
  function signature(d) {   // 겉모습이 같으면 같은 글자 → 정답이 하나뿐인지 확인
    return build(d).map((p) => p.t === "circ" ? "c" + p.fill + r1(p.c[0]) + "," + r1(p.c[1]) + "," + p.r : p.t + (p.fill || "") + p.pts.map((q) => r1(q[0]) + "," + r1(q[1])).sort().join(";")).join("|");
  }
  /* 모양 테두리 = 연필 선 (rough.js, seed 고정 → 같은 모양은 늘 같은 선) */
  const PEN = () => JN.cssVar("--c-pencil", INK);
  function svg(d) {
    const parts = build(d).map((p) => {
      if (p.t === "circ") {
        if (p.fill === INK) return `<circle cx="${r1(p.c[0])}" cy="${r1(p.c[1])}" r="${p.r}" fill="${PEN()}"/>`;
        const o = JN.rough.paths("circle", [p.c[0], p.c[1], p.r * 2], { stroke: PEN(), strokeWidth: 2.6, roughness: 1, seed: 3 });
        return `<circle cx="${r1(p.c[0])}" cy="${r1(p.c[1])}" r="${p.r}" fill="${p.fill}"/>` + (o || `<circle cx="${r1(p.c[0])}" cy="${r1(p.c[1])}" r="${p.r}" fill="none" stroke="${PEN()}" stroke-width="3"/>`);
      }
      const pts = p.pts.map((q) => r1(q[0]) + "," + r1(q[1])).join(" ");
      if (p.t === "line") return `<polyline points="${pts}" stroke="${PEN()}" stroke-width="3.5" stroke-linecap="round" fill="none"/>`;
      const o = JN.rough.paths("polygon", [p.pts], { stroke: PEN(), strokeWidth: 2.6, roughness: 1, seed: 3 });
      return `<polygon points="${pts}" fill="${p.fill}"/>` + (o || `<polygon points="${pts}" fill="none" stroke="${PEN()}" stroke-width="3" stroke-linejoin="round"/>`);
    });
    return `<svg viewBox="-50 -50 100 100" aria-hidden="true">${parts.join("")}</svg>`;
  }
  function variants(t, type) {
    const out = [], v = (ch) => out.push(Object.assign({}, t, ch, { diff: type }));
    if (type === "color") for (const c of DATA.palette) { if (c !== t.color && c !== t.tabColor) v({ color: c }); }
    if (type === "body") for (const b of DATA.farBodies[t.body]) v({ body: b });
    if (type === "dot") for (let i = 0; i < DATA.dots.length; i++) { if (i !== t.dot) v({ dot: i }); }
    if (type === "lines") for (let n = 1; n <= DATA.lineYs.length; n++) { if (n !== t.lines) v({ lines: n }); }
    if (type === "mirror") v({ mirror: !t.mirror });
    if (type === "rotate") for (let k = 1; k < 4; k++) v({ rot: (t.rot + k) % 4 });
    return shuffle(out);
  }
  function makeProblem(st) {
    for (let tries = 0; tries < 50; tries++) {
      const color = pick(DATA.palette);
      const t = { body: pick(DATA.bodies), color, tabColor: pick(DATA.palette.filter((c) => c !== color)), dot: rnd(DATA.dots.length), lines: 1 + rnd(DATA.lineYs.length), mirror: Math.random() < 0.5, rot: rnd(4) };
      const pools = shuffle(st.diffs.slice()).map((d) => variants(t, d)), seen = new Set([signature(t)]), wrongs = [];
      while (wrongs.length < st.choices - 1 && pools.some((p) => p.length)) {
        for (const p of pools) {
          if (wrongs.length >= st.choices - 1) break;
          while (p.length) { const c = p.shift(), s = signature(c); if (!seen.has(s)) { seen.add(s); wrongs.push(c); break; } }
        }
      }
      if (wrongs.length < st.choices - 1) continue;
      const cands = shuffle([t, ...wrongs]);
      return { target: t, cands, answer: cands.indexOf(t) };
    }
    throw new Error("문제를 만들지 못했어요");
  }

  JN.registerGame({
    id: "같은모양", stages: DATA.stages,
    hintHelp: { always: "어디를 살펴볼지 글로 늘 알려 줘요", button: "힌트 버튼을 누르면 다른 후보 몇 개가 흐려져요", none: "힌트 없이 찾아요" },
    parentNote: "한 판은 10문제예요. 8개 이상 찾으면 다음 판은 한 단계 위에서 해요",
    chart: { key: "correct", label: "찾은 개수 (10문제 중)", unit: "개" },
    describe: (e) => (e.total || 10) + "문제 중 " + (e.correct || 0) + "개 · " + U.fmtTime(e.time),
    intro: () => "보기와 똑같은 모양을 찾아요",
    mount(ctx) {
      const st = ctx.stage, mode = ctx.settings.hintMode, board = ctx.board;
      board.classList.add("ss-board");
      const target = h("div", { class: "ss-card ss-target", "aria-label": "보기 모양" });
      const tip = h("div", { class: "ss-tip" });
      const cands = h("div", { class: "ss-cands" });
      board.append(h("div", { class: "ss-left" }, h("span", { class: "ss-tag", text: "보기" }), target, tip), cands);
      let prob = null, qNo = 0, correct = 0, mistakes = 0, hints = 0, busy = true, hinted = false;
      const prog = h("span", { class: "qprog" }); ctx.status(prog);

      function layout() {
        const W = board.clientWidth - 24, H = board.clientHeight - 24, n = st.choices;
        const side = W > H * 1.05;
        board.classList.toggle("side", side);
        const tSize = Math.max(96, Math.min(side ? H * 0.6 : H * 0.3, side ? W * 0.3 : W * 0.5, 220));
        target.style.width = target.style.height = tSize + "px";
        const cw = side ? W - tSize - 32 : W, ch = side ? H : H - tSize - 56;
        let best = { cols: 1, s: 0 };
        /* 후보가 4개 이하면 늘 한 줄 (두 줄로 나뉘면 어린아이가 아랫줄을 못 봐요).
           더 많을 때도 마지막 줄이 비지 않게, 칸이 딱 나눠떨어지는 배치만 써요 (6개 = 3×2, 9개 = 3×3) */
        const colsList = n <= 4 ? [n] : [...Array(n).keys()].map((i) => i + 1).filter((c) => n % c === 0 && c > 1 && c < n);
        for (const cols of colsList) { const rows = Math.ceil(n / cols); const s = Math.min((cw - 12 * (cols - 1)) / cols, (ch - 12 * (rows - 1)) / rows, 180); if (s > best.s) best = { cols, s }; }
        const s = Math.max(60, Math.floor(best.s));
        cands.style.gridTemplateColumns = "repeat(" + best.cols + ", " + s + "px)";
        for (const b of cands.children) b.style.width = b.style.height = s + "px";
      }
      function next() {
        if (!ctx.alive()) return;
        if (qNo >= DATA.questionsPerGame) return end();
        prob = makeProblem(st); busy = false; hinted = false;
        prog.textContent = (qNo + 1) + " / " + DATA.questionsPerGame;
        target.innerHTML = svg(prob.target);
        cands.textContent = "";
        prob.cands.forEach((c, k) => {
          const b = h("button", { type: "button", class: "ss-card", "data-k": String(k), "aria-label": "후보 " + (k + 1), svg: svg(c) });
          b.addEventListener("click", () => choose(k));
          cands.appendChild(b);
        });
        tip.textContent = mode === "always" ? "살펴볼 곳: " + st.tip : "";
        layout();
        ctx.say("보기와 똑같은 모양을 찾아요");
      }
      function choose(k) {
        if (busy) return;
        busy = true; qNo++;
        const btns = cands.children;
        btns[prob.answer].classList.add("right");
        JN.markRight(btns[prob.answer]);   // 정답 = 연필 동그라미
        if (k === prob.answer) { correct++; ctx.sound("ok"); ctx.say(pick(["잘 찾았어요!", "똑같은 걸 찾았어요!", "꼼꼼하게 봤어요!"])); ctx.later(next, DATA.timing.okMs / JN.TIME_SCALE); }
        else { mistakes++; btns[k].classList.add("dim"); ctx.say("똑같은 건 이거예요. 다음 것도 찾아봐요"); ctx.later(next, DATA.timing.showAnswerMs / JN.TIME_SCALE); }
      }
      function end() {
        const time = ctx.timer.stop();
        ctx.finish({ cleared: correct >= DATA.passScore, time, mistakes, hints, metrics: { correct, total: DATA.questionsPerGame },
          title: correct + "개를 찾았어요!", line: "끝까지 꼼꼼히 봤어요.", bestKey: st.id, bestValue: correct, higherBetter: true });
      }
      ctx.hint(mode === "button", () => {
        if (busy || hinted) return;
        hinted = true; hints++;
        const w = shuffle([...cands.children].filter((b) => +b.dataset.k !== prob.answer));
        w.slice(0, Math.max(1, Math.floor(w.length / 2))).forEach((b) => b.classList.add("faded"));
        tip.textContent = "살펴볼 곳: " + st.tip;
      });
      return {
        start() { ctx.timer.start(); next(); },
        resize: layout,
        destroy() { busy = true; },
        test: { state: () => ({ qNo, correct, answer: prob ? prob.answer : -1, n: prob ? prob.cands.length : 0, busy }), makeProblem: (i) => { const p = makeProblem(DATA.stages[i]); return { t: signature(p.target), c: p.cands.map(signature), a: p.answer }; } },
      };
    },
  });
})();
