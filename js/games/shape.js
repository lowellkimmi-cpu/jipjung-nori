/* 같은 모양 (옛 '똑같은 모양 찾기') — 보기와 똑같은 모양 찾기. 오답은 보기와 딱 한 가지만 달라요
   - 조각 이불(수집, 보충 기획 3-2, 2026-11-29): 한 판(10문제)을 끝낼 때마다 이불 조각이 정해진 순서대로 하나씩 붙어요(무작위 아님, 12조각 = 4×3).
     몇 개를 찾았든 한 판을 끝까지 하면 조각 1개(벌 없음). 12조각이 다 차면 '완성 카드'로 끝이고 저절로 새로 시작하지 않아요.
     새로 시작은 보호자 설정의 '이불 비우기'에서만 해요. 아이별로 이 기기 안에만 저장돼요 (바깥으로 보내지 않아요). 점수·순위 없음.
   - 첫 판 손짓 도우미(2026-11-29): 이 놀이를 처음 하는 아이에게만, 두 번 다른 후보를 고르거나 한참 가만있으면 손 그림이 똑같은 모양을 가리켜요. */
"use strict";
(function () {
  const U = JN.util, h = U.h, rnd = U.rnd, pick = U.pick, shuffle = U.shuffle, T = JN.t;   // T: 화면 글자는 lang/ko.js 에서
  const K = Art.COLORS, INK = Art.INK;
  const DATA = {
    stages: [
      { id: "c3", name: T("g.shape.c3"), choices: 3, diffs: ["color", "body"], tip: T("g.shape.c3.tip") },
      { id: "c4", name: T("g.shape.c4"), choices: 4, diffs: ["color", "body", "dot"], tip: T("g.shape.c4.tip") },
      { id: "c6", name: T("g.shape.c6"), choices: 6, diffs: ["dot", "lines", "mirror", "rotate"], tip: T("g.shape.c6.tip") },
      { id: "c9", name: T("g.shape.c9"), choices: 9, diffs: ["dot", "lines", "mirror", "rotate"], tip: T("g.shape.c6.tip") },
    ],
    palette: [K.leaf, K.sky, K.honey, K.apricot, K.lilac],
    bodies: ["circle", "square", "triangle", "diamond", "pentagon", "hexagon"],
    farBodies: { circle: ["triangle", "square", "diamond"], square: ["circle", "triangle"], triangle: ["circle", "square", "hexagon"],
      diamond: ["circle", "hexagon", "square"], pentagon: ["triangle", "square", "diamond"], hexagon: ["triangle", "diamond"] },
    dots: [[-10, -5], [10, -5], [0, -16], [0, 2]], lineYs: [10, 16, 22], tab: [[4, -10], [40, -38], [14, -2]],
    questionsPerGame: 10, passScore: 8, timing: { okMs: 1100, showAnswerMs: 2200 },
  };
  /* 조각 이불 12조각 (정해진 순서): 무늬 4가지 × 바탕색 3가지 + 번호. 색만으로 구별하지 않게 무늬와 번호가 함께 바뀌어요.
     다른 놀이의 모음(구슬·우표·꽃·조약돌…)과 겹치지 않게 '바느질한 네모 천 조각' 모양이에요 */
  const PATCH_MAX = 12;
  const PATCH_MOTIFS = [
    (m) => `<circle cx="30" cy="30" r="13" fill="${m}" stroke="${INK}" stroke-width="2"/>`,
    (m) => `<path d="M30 15 L45 42 15 42Z" fill="${m}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
    (m) => `<path d="M10 22 H50 M10 30 H50 M10 38 H50" stroke="${m}" stroke-width="4.5" stroke-linecap="round"/>`,
    (m) => `<rect x="15" y="15" width="12" height="12" fill="${m}"/><rect x="33" y="33" width="12" height="12" fill="${m}"/><rect x="33" y="15" width="12" height="12" fill="none" stroke="${m}" stroke-width="2.5"/><rect x="15" y="33" width="12" height="12" fill="none" stroke="${m}" stroke-width="2.5"/>`];
  const PATCH_BG = [K.honey, K.sky, K.sprout], PATCH_MO = [K.white, K.cream, K.white];
  const patchBody = (i) => { const c = Math.floor(i / 4) % 3;
    return `<rect x="3" y="3" width="54" height="54" rx="6" fill="${PATCH_BG[c]}" stroke="${INK}" stroke-width="2.4"/>` +
      `<rect x="8" y="8" width="44" height="44" rx="3" fill="none" stroke="${INK}" stroke-width="1.4" stroke-dasharray="3 3" opacity=".55"/>` +
      PATCH_MOTIFS[i % 4](PATCH_MO[c]) + `<text x="49" y="54" text-anchor="middle" font-size="12" font-weight="700" fill="${INK}">${i + 1}</text>`; };
  const patchSvg = (i) => `<svg viewBox="0 0 60 60" aria-hidden="true">${patchBody(i)}</svg>`;
  /* 완성 카드의 이불: 4칸 × 3줄, 정해진 순서대로 */
  function quiltSvg() {
    let b = `<rect x="4" y="4" width="252" height="192" rx="12" fill="${K.paper}" stroke="${INK}" stroke-width="2.4"/>`;
    for (let i = 0; i < PATCH_MAX; i++) b += `<g transform="translate(${10 + (i % 4) * 60} ${10 + Math.floor(i / 4) * 60})">${patchBody(i)}</g>`;
    return `<svg viewBox="0 0 260 200" aria-hidden="true">${b}</svg>`;
  }
  const QUILT_ICON = '<svg viewBox="0 0 60 60" aria-hidden="true"><rect class="qt-o" x="6" y="6" width="48" height="48" rx="6"/><path class="qt-l" d="M30 8 V52 M8 30 H52"/></svg>';
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
    hintHelp: { always: T("g.shape.hh.always"), button: T("g.shape.hh.button"), none: T("g.shape.hh.none") },
    parentNote: T("g.shape.parentNote"),
    /* 보호자 설정의 '이불 비우기': 지우는 것은 이 아이의 이불 조각 수(mem.patches)뿐이에요. 놀이 기록은 그대로 */
    memReset: { key: "patches", max: PATCH_MAX, label: T("g.shape.reset.label"), sub: T("g.shape.reset.sub"), button: T("g.shape.reset.btn"), confirm: T("g.shape.reset.confirm"), done: T("g.shape.reset.done"), nowKey: "g.shape.reset.now" },
    chart: { key: "correct", label: T("g.shape.chart"), unit: T("g.light.unit") },
    describe: (e) => T("g.shape.describe", { total: e.total || 10, n: e.correct || 0, time: U.fmtTime(e.time) }),
    intro: () => T("g.shape.intro"),
    mount(ctx) {
      const st = ctx.stage, mode = ctx.settings.hintMode, board = ctx.board, mem = ctx.mem;
      board.classList.add("ss-board");
      const target = h("div", { class: "ss-card ss-target", "aria-label": T("g.shape.target.aria") });
      const tip = h("div", { class: "ss-tip" });
      const cands = h("div", { class: "ss-cands" });
      board.append(h("div", { class: "ss-left" }, h("span", { class: "ss-tag", text: T("g.shape.tag") }), target, tip), cands);
      let prob = null, qNo = 0, correct = 0, mistakes = 0, hints = 0, busy = true, hinted = false;
      const prog = h("span", { class: "qprog" });
      /* 조각 이불 (상태 칸, 문제 번호 옆): 이불 그림 + n/12 */
      const patchesNow = () => Math.max(0, Math.min(PATCH_MAX, mem.patches | 0));
      const qtTxt = h("span", { class: "ss-qtn" }), qtIcon = h("i", { class: "qt-i", "aria-hidden": "true", svg: QUILT_ICON });
      const quilt = h("span", { class: "ss-quilt" }, qtIcon, qtTxt);
      const paintQuilt = () => { qtTxt.textContent = patchesNow() + "/" + PATCH_MAX; quilt.setAttribute("aria-label", T("g.shape.quilt", { n: patchesNow(), max: PATCH_MAX })); };
      paintQuilt();
      ctx.status(h("span", { class: "ss-status" }, prog, quilt));
      let patchGot = 0, completed = false, doneCard = null;
      /* 첫 판 손짓 도우미: 고를 수 있을 때만 똑같은 모양을 가리켜요 */
      const nudge = U.nudge(ctx, () => (!busy && prob ? cands.children[prob.answer] || null : null));

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
          const b = h("button", { type: "button", class: "ss-card", "data-k": String(k), "aria-label": T("g.shape.cand.aria", { n: k + 1 }), svg: svg(c) });
          b.addEventListener("click", () => choose(k));
          cands.appendChild(b);
        });
        tip.textContent = mode === "always" ? T("g.shape.tip", { tip: st.tip }) : "";
        layout();
        ctx.say(T("g.shape.intro"));
        nudge.arm();
      }
      function choose(k) {
        if (busy) return;
        busy = true; qNo++;
        const btns = cands.children;
        btns[prob.answer].classList.add("right");
        JN.markRight(btns[prob.answer]);   // 정답 = 연필 동그라미
        if (k === prob.answer) { correct++; nudge.ok(); ctx.sound("ok"); ctx.say(pick(T("g.shape.say.ok"))); ctx.later(next, DATA.timing.okMs / JN.TIME_SCALE); }
        else { mistakes++; nudge.wrong(); btns[k].classList.add("dim"); ctx.say(T("g.shape.say.miss")); ctx.later(next, DATA.timing.showAnswerMs / JN.TIME_SCALE); }
      }
      function addPatch() {   // 이불에 조각 하나 (12조각이 다 찼으면 그대로)
        const n = patchesNow();
        if (n >= PATCH_MAX) return false;
        mem.patches = n + 1; ctx.saveMem(); patchGot++; if (n + 1 >= PATCH_MAX) completed = true;
        paintQuilt(); qtIcon.innerHTML = patchSvg(n); qtIcon.classList.add("pop");
        ctx.later(() => { qtIcon.classList.remove("pop"); }, 900);
        return true;
      }
      function end() {
        const time = ctx.timer.stop();
        busy = true; nudge.stop();
        const grew = addPatch(), n = patchesNow();
        const fin = () => ctx.finish({ cleared: correct >= DATA.passScore, time, mistakes, hints, metrics: { correct, total: DATA.questionsPerGame },
          title: T("g.shape.title", { n: correct }),
          line: T("g.shape.line") + T(completed ? "g.shape.line.full" : grew ? "g.shape.line.patch" : "g.shape.line.again", { n, max: PATCH_MAX }),
          bestKey: st.id, bestValue: correct, higherBetter: true });
        if (completed) ctx.later(() => showDone(fin), Math.max(JN.ms(900), 40)); else fin();
      }
      /* 조각 이불 완성 카드: 12조각을 정해진 순서대로 이은 이불 그림 + 따뜻한 말. '고마워요' 단추 하나. 저절로 새로 시작하지 않아요 */
      function showDone(next) {
        if (!ctx.alive()) return;
        const ok = h("button", { type: "button", class: "jn-btn jn-btn--big", id: "ssDoneOk" }, T("g.shape.done.ok"));
        doneCard = h("div", { class: "dw-done ss-done", id: "ssDone", role: "group", "aria-label": T("g.shape.done.title") },
          h("div", { class: "dw-donecard" }, h("h2", { text: T("g.shape.done.title") }), h("div", { class: "ss-donequilt", "aria-hidden": "true", svg: quiltSvg() }), h("p", { text: T("g.shape.done.body") }), ok));
        board.appendChild(doneCard);
        U.onTap(ok, () => { if (doneCard && doneCard.isConnected) { doneCard.remove(); doneCard = null; next(); } });
        ctx.say(T("g.shape.done.say"));
        try { ok.focus({ preventScroll: true }); } catch (e) { /* 포커스는 없어도 돼요 */ }
      }
      ctx.hint(mode === "button", () => {
        if (busy || hinted) return;
        hinted = true; hints++;
        const w = shuffle([...cands.children].filter((b) => +b.dataset.k !== prob.answer));
        w.slice(0, Math.max(1, Math.floor(w.length / 2))).forEach((b) => b.classList.add("faded"));
        tip.textContent = T("g.shape.tip", { tip: st.tip });
      });
      return {
        start() { ctx.timer.start(); next(); },
        resize: layout,
        destroy() { busy = true; nudge.stop(); },
        test: { state: () => ({ qNo, correct, answer: prob ? prob.answer : -1, n: prob ? prob.cands.length : 0, busy, mistakes,
          patches: patchesNow(), patchGot, completed, card: !!(doneCard && doneCard.isConnected), nudgeShown: nudge.shown(), nudgeVisible: nudge.visible() }), makeProblem: (i) => { const p = makeProblem(DATA.stages[i]); return { t: signature(p.target), c: p.cands.map(signature), a: p.answer }; } },
      };
    },
  });
})();
