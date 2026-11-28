/* 패턴 잇기 (옛 '다음에 올 모양') — 규칙을 찾아 빈칸에 올 모양 고르기
   - 구슬 목걸이(수집, 보충 기획 3-2, 2026-11-29): 한 판(8문제)을 끝낼 때마다 구슬이 정해진 순서대로 하나씩 꿰어져요(무작위 아님, 12개).
     몇 개를 맞혔든 한 판을 끝까지 하면 구슬 1개(벌 없음). 12개가 다 차면 '완성 카드'로 끝이고 저절로 새로 시작하지 않아요.
     새로 시작은 보호자 설정의 '목걸이 비우기'에서만 해요. 아이별로 이 기기 안에만 저장돼요 (바깥으로 보내지 않아요). 점수·순위 없음.
   - 첫 판 손짓 도우미(2026-11-29): 이 놀이를 처음 하는 아이에게만, 두 번 엉뚱한 보기를 고르거나 한참 가만있으면 손 그림이 알맞은 보기를 가리켜요. */
"use strict";
(function () {
  const U = JN.util, h = U.h, rnd = U.rnd, pick = U.pick, shuffle = U.shuffle, T = JN.t;   // T: 화면 글자는 lang/ko.js 에서
  const K = Art.COLORS, INK = Art.INK;
  const DATA = {
    stages: [
      { id: "ab", name: T("g.pattern.ab"), rule: "repeat", unit: "AB", shown: [5, 6], choices: 3, tip: T("g.pattern.ab.tip") },
      { id: "aab", name: T("g.pattern.aab"), rule: "repeat", unit: "AAB", shown: [5, 7], choices: 3, tip: T("g.pattern.aab.tip") },
      { id: "abc", name: T("g.pattern.abc"), rule: "repeat", unit: "ABC", shown: [5, 7], choices: 4, tip: T("g.pattern.abc.tip") },
      { id: "abb", name: T("g.pattern.abb"), rule: "repeat", unit: "ABB", shown: [5, 7], choices: 4, tip: T("g.pattern.abb.tip") },
      { id: "grow", name: T("g.pattern.grow"), rule: "grow", shown: [4, 4], choices: 4, tip: T("g.pattern.grow.tip") },
      { id: "count", name: T("g.pattern.count"), rule: "count", shown: [3, 4], choices: 4, tip: T("g.pattern.count.tip") },
      { id: "rotate", name: T("g.pattern.rotate"), rule: "rotate", shown: [4, 5], choices: 4, tip: T("g.pattern.rotate.tip") },
      { id: "two", name: T("g.pattern.two"), rule: "two", shown: [5, 7], choices: 4, tip: T("g.pattern.two.tip") },
    ],
    palette: [K.leaf, K.sky, K.honey, K.apricot, K.lilac],
    shapes: ["circle", "square", "triangle", "diamond", "star", "hexagon"],
    sizes: [0.36, 0.48, 0.6, 0.72, 0.84, 0.96],
    questionsPerGame: 8, passScore: 7, timing: { okMs: 1200, showAnswerMs: 2300 },
  };
  /* 구슬 목걸이 12알 (정해진 순서): 모양 4가지 × 색 3가지 + 번호. 색만으로 구별하지 않게 모양과 번호가 함께 바뀌어요 */
  const BEAD_MAX = 12;
  const BEAD_SHAPES = [
    (f) => `<circle cx="30" cy="30" r="24" fill="${f}" stroke="${INK}" stroke-width="2.4"/>`,
    (f) => `<rect x="8" y="8" width="44" height="44" rx="12" fill="${f}" stroke="${INK}" stroke-width="2.4"/>`,
    (f) => `<path d="M30 5 L55 30 30 55 5 30Z" fill="${f}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`,
    (f) => `<path d="M30 6 L51 18 51 42 30 54 9 42 9 18Z" fill="${f}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`];
  const beadBody = (i) => BEAD_SHAPES[i % 4]([K.honey, K.sky, K.apricot][Math.floor(i / 4) % 3]) +
    `<circle cx="22" cy="20" r="4" fill="#fff" opacity=".7"/><text x="30" y="36" text-anchor="middle" font-size="17" font-weight="700" fill="${INK}">${i + 1}</text>`;
  const beadSvg = (i) => `<svg viewBox="0 0 60 60" aria-hidden="true">${beadBody(i)}</svg>`;
  /* 완성 카드의 목걸이: 줄 하나에 12알을 정해진 순서로 (U자 모양) */
  function necklaceSvg() {
    const P0 = [18, 12], P1 = [200, 236], P2 = [382, 12];   // 구슬은 줄(2차 곡선) 위에 그대로 놓여요
    const pts = Array.from({ length: BEAD_MAX }, (_, i) => { const t = 0.1 + 0.8 * i / (BEAD_MAX - 1), u = 1 - t;
      return [0, 1].map((k) => u * u * P0[k] + 2 * u * t * P1[k] + t * t * P2[k]); });
    let b = `<path d="M${P0} Q${P1} ${P2}" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>`;
    pts.forEach(([x, y], i) => { b += `<g transform="translate(${(x - 15).toFixed(1)} ${(y - 15).toFixed(1)}) scale(.5)">${beadBody(i)}</g>`; });
    return `<svg viewBox="0 0 400 160" aria-hidden="true">${b}</svg>`;
  }
  const STRING_SVG = '<svg viewBox="0 0 60 60" aria-hidden="true"><path class="nk-l" d="M8 14 Q30 62 52 14"/><circle class="nk-b" cx="30" cy="37" r="9"/></svg>';
  const between = (a, b) => a + rnd(b - a + 1);
  function item(shape, color, extra) { return Object.assign({ shape, color, size: 0.8, count: 1, rot: 0 }, extra || {}); }
  function sig(it) { return [it.shape, it.color, it.size, it.count, ((it.rot % 360) + 360) % 360].join("|"); }
  const poly = (pts) => pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  function shapeEl(shape, cx, cy, r, color, rot) {
    const pen = JN.cssVar("--c-pencil", INK), sw = r > 20 ? 2.6 : 1.8;
    const st = `fill="${color}"`;
    /* 테두리 = 연필 선 (rough.js, seed 고정) */
    const P = (pts) => { const q = pts.map(([x, y]) => [cx + x * r, cy + y * r]); const o = JN.rough.paths("polygon", [q], { stroke: pen, strokeWidth: sw, roughness: .9, seed: 4 });
      return `<polygon points="${poly(q)}" ${st}/>` + (o || `<polygon points="${poly(q)}" fill="none" stroke="${pen}" stroke-width="${sw}" stroke-linejoin="round"/>`); };
    const reg = (n, a0, k) => Array.from({ length: n }, (_, i) => { const a = (a0 + i * 360 / n) * Math.PI / 180; return [Math.cos(a) * k, Math.sin(a) * k]; });
    let el;
    switch (shape) {
      case "circle": { const o = JN.rough.paths("circle", [cx, cy, r * 1.84], { stroke: pen, strokeWidth: sw, roughness: .9, seed: 4 });
        el = `<circle cx="${cx}" cy="${cy}" r="${(r * 0.92).toFixed(1)}" ${st}/>` + (o || `<circle cx="${cx}" cy="${cy}" r="${(r * 0.92).toFixed(1)}" fill="none" stroke="${pen}" stroke-width="${sw}"/>`); break; }
      case "square": el = P([[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]]); break;
      case "triangle": el = P([[0, -0.95], [0.95, 0.75], [-0.95, 0.75]]); break;
      case "diamond": el = P([[0, -1], [0.8, 0], [0, 1], [-0.8, 0]]); break;
      case "star": el = P(Array.from({ length: 10 }, (_, i) => { const a = (-90 + i * 36) * Math.PI / 180, k = i % 2 ? 0.45 : 1; return [Math.cos(a) * k, Math.sin(a) * k]; })); break;
      case "hexagon": el = P(reg(6, 0, 0.92)); break;
      default: el = P([[-0.85, -0.3], [0.15, -0.3], [0.15, -0.75], [0.95, 0], [0.15, 0.75], [0.15, 0.3], [-0.85, 0.3]]);   // 화살표
    }
    return rot ? `<g transform="rotate(${rot} ${cx} ${cy})">${el}</g>` : el;
  }
  const SPOTS = { 1: [[50, 50]], 2: [[30, 50], [70, 50]], 3: [[50, 28], [28, 70], [72, 70]], 4: [[30, 30], [70, 30], [30, 70], [70, 70]], 5: [[27, 27], [73, 27], [50, 50], [27, 73], [73, 73]], 6: [[30, 22], [70, 22], [30, 50], [70, 50], [30, 78], [70, 78]] };
  function svg(it) {
    let body = "";
    if (it.count > 1) for (const [x, y] of SPOTS[it.count]) body += shapeEl(it.shape, x, y, 13, it.color, it.rot);
    else body = shapeEl(it.shape, 50, 50, 46 * it.size, it.color, it.rot);
    return `<svg viewBox="0 0 100 100" aria-hidden="true">${body}</svg>`;
  }
  function distinct(k) { const sh = shuffle(DATA.shapes.slice()), co = shuffle(DATA.palette.slice()); return Array.from({ length: k }, (_, i) => item(sh[i], co[i])); }
  function fill(answer, pool, n) {
    const seen = new Set([sig(answer)]), out = [answer];
    for (const c of pool) { if (out.length >= n) break; if (!seen.has(sig(c))) { seen.add(sig(c)); out.push(c); } }
    let g = 0;
    while (out.length < n && g++ < 200) { const c = Object.assign({}, answer, { shape: pick(DATA.shapes), color: pick(DATA.palette) }); if (!seen.has(sig(c))) { seen.add(sig(c)); out.push(c); } }
    return out;
  }
  function makeProblem(st) {
    const L = between(st.shown[0], st.shown[1]);
    let seq = [], answer, pool = [], unitLen = 0;
    if (st.rule === "repeat") {
      const letters = [...new Set(st.unit.split(""))], its = distinct(letters.length + 2), map = {};
      letters.forEach((ch, i) => { map[ch] = its[i]; });
      const unit = st.unit.split("").map((ch) => map[ch]); unitLen = unit.length;
      for (let i = 0; i <= L; i++) seq.push(unit[i % unit.length]);
      answer = seq.pop();
      pool = shuffle(letters.map((ch) => map[ch])).concat(its.slice(letters.length));
    } else if (st.rule === "grow") {
      const s = pick(DATA.shapes), c = pick(DATA.palette), o = rnd(DATA.sizes.length - L);
      for (let i = 0; i <= L; i++) seq.push(item(s, c, { size: DATA.sizes[o + i] }));
      answer = seq.pop();
      const other = pick(DATA.shapes.filter((x) => x !== s));
      pool = shuffle([seq[L - 1], seq[L - 2], item(other, c, { size: answer.size }), ...(o + L + 1 < DATA.sizes.length ? [item(s, c, { size: DATA.sizes[o + L + 1] })] : [])]);
    } else if (st.rule === "count") {
      const s = pick(DATA.shapes), c = pick(DATA.palette);
      for (let i = 1; i <= L + 1; i++) seq.push(item(s, c, { count: i }));
      answer = seq.pop();
      const other = pick(DATA.shapes.filter((x) => x !== s));
      pool = shuffle([item(s, c, { count: L }), item(s, c, { count: L + 2 }), item(s, c, { count: L - 1 }), item(other, c, { count: L + 1 })]);
    } else if (st.rule === "rotate") {
      const c = pick(DATA.palette), r0 = rnd(4);
      for (let i = 0; i <= L; i++) seq.push(item("arrow", c, { rot: ((r0 + i) % 4) * 90 }));
      answer = seq.pop();
      pool = shuffle([1, 2, 3].map((k) => item("arrow", c, { rot: (answer.rot + k * 90) % 360 })));
    } else {
      const [p1, p2] = Math.random() < 0.5 ? [2, 3] : [3, 2];
      const shapes = shuffle(DATA.shapes.slice()).slice(0, p1), colors = shuffle(DATA.palette.slice()).slice(0, p2);
      for (let i = 0; i <= L; i++) seq.push(item(shapes[i % p1], colors[i % p2]));
      answer = seq.pop();
      const os = shapes.filter((x) => x !== answer.shape), oc = colors.filter((x) => x !== answer.color);
      pool = shuffle([item(answer.shape, pick(oc)), item(pick(os), answer.color), item(pick(os), pick(oc))]);
    }
    const choices = shuffle(fill(answer, pool, st.choices));
    return { seq, answer, choices, answerIdx: choices.indexOf(answer), unitLen };
  }

  JN.registerGame({
    id: "패턴", stages: DATA.stages,
    hintHelp: { always: T("g.pattern.hh.always"), button: T("g.pattern.hh.button"), none: T("g.pattern.hh.none") },
    parentNote: T("g.pattern.parentNote"),
    /* 보호자 설정의 '목걸이 비우기': 지우는 것은 이 아이의 구슬 수(mem.beads)뿐이에요. 놀이 기록은 그대로 */
    memReset: { key: "beads", max: BEAD_MAX, label: T("g.pattern.reset.label"), sub: T("g.pattern.reset.sub"), button: T("g.pattern.reset.btn"), confirm: T("g.pattern.reset.confirm"), done: T("g.pattern.reset.done"), nowKey: "g.pattern.reset.now" },
    chart: { key: "correct", label: T("g.pattern.chart"), unit: T("g.light.unit") },
    describe: (e) => T("g.shape.describe", { total: e.total || 8, n: e.correct || 0, time: U.fmtTime(e.time) }),
    intro: (st) => st.name,
    mount(ctx) {
      const st = ctx.stage, mode = ctx.settings.hintMode, board = ctx.board, mem = ctx.mem;
      board.classList.add("pt-board");
      const row = h("div", { class: "pt-row", "aria-label": T("g.pattern.row.aria") }), tip = h("div", { class: "pt-tip" }), choices = h("div", { class: "pt-choices" });
      board.append(row, tip, choices);
      let prob = null, qNo = 0, correct = 0, mistakes = 0, hints = 0, busy = true, hinted = false;
      const prog = h("span", { class: "qprog" });
      /* 구슬 목걸이 (상태 칸, 문제 번호 옆): 목걸이 그림 + n/12 */
      const beadsNow = () => Math.max(0, Math.min(BEAD_MAX, mem.beads | 0));
      const nkTxt = h("span", { class: "pt-nkn" }), nkIcon = h("i", { class: "nk-i", "aria-hidden": "true", svg: STRING_SVG });
      const neck = h("span", { class: "pt-neck" }, nkIcon, nkTxt);
      const paintNeck = () => { nkTxt.textContent = beadsNow() + "/" + BEAD_MAX; neck.setAttribute("aria-label", T("g.pattern.neck", { n: beadsNow(), max: BEAD_MAX })); };
      paintNeck();
      ctx.status(h("span", { class: "pt-status" }, prog, neck));
      let beadGot = 0, completed = false, doneCard = null;
      /* 첫 판 손짓 도우미: 고를 수 있을 때만 알맞은 보기를 가리켜요 */
      const nudge = U.nudge(ctx, () => (!busy && prob ? choices.children[prob.answerIdx] || null : null));
      function layout() {
        if (!prob) return;
        const W = board.clientWidth - 24, H = board.clientHeight - 24, n = prob.seq.length + 1;
        const cell = Math.max(34, Math.min(96, Math.floor((W - 6 * (n - 1)) / n), Math.floor(H * 0.28)));
        /* 칸 여백은 px 로 (CSS 의 % 여백은 줄 전체 폭 기준이라 칸이 대부분 여백이 되고 모양이 작아졌어요) */
        const box = (el, px) => { el.style.width = el.style.height = px + "px"; el.style.padding = Math.round(px * 0.08) + "px"; };
        for (const c of row.children) box(c, cell);
        const m = prob.choices.length;
        if (st.rule === "grow") {
          /* 점점 커지기: 크기를 눈으로 비교해야 하니 줄 칸과 보기 칸을 똑같은 크기·여백으로 맞춰요 */
          const s = Math.max(56, Math.min(110, Math.floor((W - 6 * (n - 1)) / n), Math.floor((W - 14 * (m - 1)) / m), Math.floor(H * 0.3)));
          for (const c of row.children) box(c, s);
          for (const b of choices.children) box(b, s);
          return;
        }
        const cs = Math.max(64, Math.min(140, Math.floor((W - 12 * (m - 1)) / m), Math.floor(H * 0.42)));
        for (const b of choices.children) box(b, cs);
      }
      function showHint() { tip.textContent = T("g.pattern.tip", { tip: st.tip }); if (prob.unitLen) [...row.children].slice(0, prob.unitLen).forEach((c) => c.classList.add("unit")); }
      function next() {
        if (!ctx.alive()) return;
        if (qNo >= DATA.questionsPerGame) return end();
        prob = makeProblem(st); busy = false; hinted = false;
        prog.textContent = (qNo + 1) + " / " + DATA.questionsPerGame;
        row.textContent = "";
        for (const it of prob.seq) row.appendChild(h("div", { class: "cell", svg: svg(it) }));
        row.appendChild(h("div", { class: "cell blank", id: "ptBlank", "aria-label": T("g.pattern.blank.aria"), text: "?" }));
        choices.textContent = "";
        prob.choices.forEach((c, k) => {
          const b = h("button", { type: "button", class: "choice", "data-k": String(k), "aria-label": T("g.pattern.choice.aria", { n: k + 1 }), svg: svg(c) });
          b.addEventListener("click", () => choose(k));
          choices.appendChild(b);
        });
        tip.textContent = "";
        if (mode === "always") showHint();
        layout();
        ctx.say(T("g.pattern.say.ask"));
        nudge.arm();
      }
      function choose(k) {
        if (busy) return;
        busy = true; qNo++;
        const btns = choices.children;
        btns[prob.answerIdx].classList.add("right");
        JN.markRight(btns[prob.answerIdx]);   // 정답 = 연필 동그라미
        const blank = row.lastChild; blank.className = "cell filled"; blank.textContent = ""; blank.innerHTML = svg(prob.answer);
        layout();
        if (k === prob.answerIdx) { correct++; nudge.ok(); ctx.sound("ok"); ctx.say(pick(T("g.pattern.say.ok"))); ctx.later(next, DATA.timing.okMs / JN.TIME_SCALE); }
        else { mistakes++; nudge.wrong(); btns[k].classList.add("dim"); ctx.say(T("g.pattern.say.miss")); ctx.later(next, DATA.timing.showAnswerMs / JN.TIME_SCALE); }
      }
      function growBead() {   // 목걸이에 구슬 하나 (12알이 다 찼으면 그대로)
        const n = beadsNow();
        if (n >= BEAD_MAX) return false;
        mem.beads = n + 1; ctx.saveMem(); beadGot++; if (n + 1 >= BEAD_MAX) completed = true;
        paintNeck(); nkIcon.innerHTML = beadSvg(n); nkIcon.classList.add("pop");
        ctx.later(() => { nkIcon.classList.remove("pop"); }, 900);
        return true;
      }
      function end() {
        const time = ctx.timer.stop();
        busy = true; nudge.stop();
        const grew = growBead(), n = beadsNow();
        const fin = () => ctx.finish({ cleared: correct >= DATA.passScore, time, mistakes, hints, metrics: { correct, total: DATA.questionsPerGame },
          title: T("g.pattern.title", { n: correct }),
          line: T("g.pattern.line") + T(completed ? "g.pattern.line.full" : grew ? "g.pattern.line.bead" : "g.pattern.line.again", { n, max: BEAD_MAX }),
          bestKey: st.id, bestValue: correct, higherBetter: true });
        if (completed) ctx.later(() => showDone(fin), Math.max(JN.ms(900), 40)); else fin();
      }
      /* 구슬 목걸이 완성 카드: 구슬 12알을 정해진 순서대로 꿴 목걸이 그림 + 따뜻한 말. '고마워요' 단추 하나. 저절로 새로 시작하지 않아요 */
      function showDone(next) {
        if (!ctx.alive()) return;
        const ok = h("button", { type: "button", class: "jn-btn jn-btn--big", id: "ptDoneOk" }, T("g.pattern.done.ok"));
        doneCard = h("div", { class: "dw-done pt-done", id: "ptDone", role: "group", "aria-label": T("g.pattern.done.title") },
          h("div", { class: "dw-donecard" }, h("h2", { text: T("g.pattern.done.title") }), h("div", { class: "pt-donenecklace", "aria-hidden": "true", svg: necklaceSvg() }), h("p", { text: T("g.pattern.done.body") }), ok));
        board.appendChild(doneCard);
        U.onTap(ok, () => { if (doneCard && doneCard.isConnected) { doneCard.remove(); doneCard = null; next(); } });
        ctx.say(T("g.pattern.done.say"));
        try { ok.focus({ preventScroll: true }); } catch (e) { /* 포커스는 없어도 돼요 */ }
      }
      ctx.hint(mode === "button", () => { if (busy || hinted) return; hinted = true; hints++; showHint(); });
      return {
        start() { ctx.timer.start(); next(); },
        resize: layout,
        destroy() { busy = true; nudge.stop(); },
        test: { state: () => ({ qNo, correct, answer: prob ? prob.answerIdx : -1, n: prob ? prob.choices.length : 0, busy, mistakes,
          beads: beadsNow(), beadGot, completed, card: !!(doneCard && doneCard.isConnected), nudgeShown: nudge.shown(), nudgeVisible: nudge.visible() }) },
      };
    },
  });
})();
