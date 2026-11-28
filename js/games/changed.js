/* 달라진 그림 찾기 — 그림을 10초 보여 준 뒤, 바뀐 그림에서 달라진 곳을 찾아요 (주의집중 방).
   '다른 그림 찾기'(spot.js, 보는 힘 방)는 두 그림을 나란히 놓고 비교하지만, 이 놀이는 처음 그림을 잠깐 보고 기억해서 찾아요.
   그림은 spot.js 가 꺼내 둔 손그림풍 장면(JN.spotArt)을 그대로 다시 써요. 새 그림 파일·바깥 요청 없음.
   틀려도 벌이 없어요: 엉뚱한 곳을 눌러도 물결만 나오고, '처음 그림 다시 보기'는 몇 번이든 눌러 볼 수 있어요.
   - 탐정 수첩(수집, 보충 기획 3-2, 2026-11-29): 한 판을 끝낼 때마다 도장이 정해진 순서대로 하나씩 찍혀요(무작위 아님, 12개).
     12개가 다 차면 '완성 카드'로 끝이고 저절로 새로 시작하지 않아요. 새로 시작은 보호자 설정의 '수첩 비우기'에서만 해요.
     아이별로 이 기기 안에만 저장돼요 (바깥으로 보내지 않아요). 점수·순위 없음.
   - 첫 판 손짓 도우미(2026-11-29): 이 놀이를 처음 하는 아이에게만, 달라진 그림에서 엉뚱한 곳을 두 번 누르거나 한참 가만있으면 손 그림이 달라진 곳 하나를 가리켜요. */
"use strict";
(function () {
  const U = JN.util, h = U.h, rnd = U.rnd, shuffle = U.shuffle, T = JN.t;   // T: 화면 글자는 lang/ko.js 에서
  const A = JN.spotArt;
  if (!A) { console.warn("달라진 그림 찾기: spot.js 를 먼저 불러와야 해요"); return; }
  const LOOK_MS = 10000, PEEK_MS = 4000, AUTO_HINT_SEC = 30;
  const STAGES = [
    { id: "c1", name: T("g.changed.c1"), diffs: 3, style: "flat", kinds: ["color", "scale"], bigOnly: true, items: [4, 6] },
    { id: "c2", name: T("g.changed.c2"), diffs: 5, style: "flat2", kinds: ["color", "scale", "move", "remove"], items: [8, 12] },
    { id: "c3", name: T("g.changed.c3"), diffs: 5, style: "flat2", kinds: ["color", "scale", "move", "remove", "flip", "pattern"], items: null },
  ];
  const NS = "http://www.w3.org/2000/svg";
  const PLATE = "plate";
  /* 탐정 수첩 도장 12개 (정해진 순서): 모양 4가지 × 색 3가지 + 번호. 색만으로 구별하지 않게 모양과 번호가 함께 바뀌어요 */
  const STAMP_MAX = 12, K = Art.COLORS || {}, INK = Art.INK || "#2F3E46";
  const STAMP_SHAPES = [
    '<circle cx="30" cy="30" r="15" fill="#fff" opacity=".85"/>',
    '<path d="M30 14 L34.7 24.6 46 25.6 37.4 33.2 40 44.4 30 38.4 20 44.4 22.6 33.2 14 25.6 25.3 24.6Z" fill="#fff" opacity=".85"/>',
    '<path d="M30 44 C14 34 14 20 22 17 C26 15.6 29 18 30 21 C31 18 34 15.6 38 17 C46 20 46 34 30 44Z" fill="#fff" opacity=".85"/>',
    '<rect x="17" y="17" width="26" height="26" rx="5" fill="#fff" opacity=".85" transform="rotate(45 30 30)"/>'];
  const stampSvg = (i) => {
    const f = [K.terracotta || "#C8735A", K.dustyblue || "#7C9CB4", K.sage || "#8FA98B"][Math.floor(i / 4) % 3];
    return `<svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="26" fill="${f}" stroke="${INK}" stroke-width="2.4"/>` +
      `<circle cx="30" cy="30" r="21" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="3 3" opacity=".8"/>${STAMP_SHAPES[i % 4]}` +
      `<text x="30" y="36" text-anchor="middle" font-size="16" font-weight="700" fill="${INK}">${i + 1}</text></svg>`;
  };
  const BOOK_SVG = '<svg viewBox="0 0 60 60" aria-hidden="true"><rect class="bk-c" x="12" y="8" width="36" height="46" rx="4"/><path class="bk-l" d="M18 8 V54 M24 20 H42 M24 28 H42 M24 36 H36"/></svg>';

  /* 처음 그림(base)과 바뀐 그림(mod)을 만들어요. diff 하나 = { kind, a(처음 모습), b(바뀐 모습), found } */
  function build(lv, mem) {
    const sceneIdx = (mem.cscene | 0) % A.SCENES.length, scene = A.SCENES[sceneIdx];
    let all = scene.items.map(([type, x, y, s, c], i) => ({ id: i, type, x, y, s, c, flip: false }));
    if (lv.bigOnly) {   // 쉬움: 큰 물건만 골라 개수도 적게
      const big = all.filter((o) => o.s >= 1);
      if (big.length >= lv.diffs) all = shuffle(big.slice()).slice(0, Math.min(big.length, lv.items[0] + rnd(lv.items[1] - lv.items[0] + 1))).sort((p, q) => p.id - q.id);
    } else if (lv.items) {
      const k = Math.min(all.length, lv.items[0] + rnd(lv.items[1] - lv.items[0] + 1));
      all = shuffle(all.slice()).slice(0, Math.max(k, lv.diffs)).sort((p, q) => p.id - q.id);
    }
    all.forEach((o, i) => (o.id = i));
    const mod = all.map((o) => Object.assign({}, o)), used = new Set(), list = [], kinds = shuffle(lv.kinds.slice());
    for (let i = 0; i < lv.diffs; i++) {
      let kind = kinds[i % kinds.length];
      const free = all.filter((o) => !used.has(o.id));
      let pool = free.filter((o) => A.okKind(kind, o) && (kind !== "flip" || A.ASYM.has(o.type)));
      if (!pool.length) { kind = "color"; pool = free.filter((o) => A.okKind("color", o)); }
      if (!pool.length) { kind = "remove"; pool = free; }
      if (!pool.length) break;
      const o = pool[rnd(pool.length)]; used.add(o.id); A.applyKind(kind, o, mod[o.id]);
      list.push({ kind, a: o, b: mod[o.id], found: false });
    }
    mem.cscene = (sceneIdx + 1) % A.SCENES.length;
    return { scene, base: all, mod, list };
  }

  JN.registerGame({
    id: "달라진그림", stages: STAGES, stageLabel: (st) => st.name,
    hintHelp: { always: T("g.changed.hh.always"), button: T("g.changed.hh.button"), none: T("g.changed.hh.none") },
    parentNote: T("g.changed.parentNote"),
    /* 보호자 설정의 '수첩 비우기': 지우는 것은 이 아이의 수첩 도장 수(mem.stamps)뿐이에요. 놀이 기록은 그대로 */
    memReset: { key: "stamps", max: STAMP_MAX, label: T("g.changed.reset.label"), sub: T("g.changed.reset.sub"), button: T("g.changed.reset.btn"), confirm: T("g.changed.reset.confirm"), done: T("g.changed.reset.done"), nowKey: "g.changed.reset.now" },
    chart: { key: "time", label: T("common.time"), unit: T("common.unit.sec") },
    describe: (e) => U.fmtTime(e.time) + T("g.changed.describe", { m: e.mistakes || 0 }) + (e.replays ? T("g.changed.describe.replay", { n: e.replays }) : "") + (e.hints ? T("g.number.describe.hint", { n: e.hints }) : ""),
    intro: (st) => T("g.changed.intro", { n: st.diffs }),
    mount(ctx) {
      const lv = ctx.stage, mode = ctx.settings.hintMode, board = ctx.board, mem = ctx.mem;
      board.classList.add("sd-board", "cg-board");
      const mk = (id) => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 400 300"); s.setAttribute("class", "cg-svg"); s.id = id; return s; };
      const svgA = mk("cgA"), svgB = mk("cgB");
      svgA.setAttribute("aria-label", T("g.changed.first")); svgB.setAttribute("aria-label", T("g.changed.second"));
      const tag = h("span", { class: "tag", text: T("g.changed.first") });
      const pic = h("div", { class: "sd-pic cg-pic" }, tag); pic.append(svgA, svgB);
      const barFill = h("i"), barText = h("span", { class: "cg-count", "aria-hidden": "true", text: "" });
      const bar = h("div", { class: "cg-bar" }, h("span", { class: "cg-track", "aria-hidden": "true" }, barFill), barText);
      board.appendChild(h("div", { class: "cg-col" }, bar, pic));
      const dotsBox = h("span", { class: "sd-dots", "aria-label": T("g.spot.count.aria") });
      /* 탐정 수첩 (그림 위 줄 오른쪽): 수첩 그림 + n/12 */
      const stampsNow = () => Math.min(STAMP_MAX, mem.stamps | 0);
      const bookTxt = h("span", { class: "cg-bookn" });
      const bookIcon = h("i", { class: "bk-i", "aria-hidden": "true", svg: BOOK_SVG });
      const book = h("span", { class: "cg-book" }, bookIcon, bookTxt);
      const paintBook = () => { bookTxt.textContent = stampsNow() + "/" + STAMP_MAX; book.setAttribute("aria-label", T("g.changed.book", { n: stampsNow(), max: STAMP_MAX })); };
      paintBook();
      bar.appendChild(book);   // 아래 줄은 동그라미·시계로 꽉 차고 그림 귀퉁이엔 물건이 있어서, 수첩은 그림 위 줄 오른쪽에 둬요 (찾는 동안에도 보여요)
      ctx.status(dotsBox);
      let stampGot = 0, completed = false, doneCard = null;
      const mainBtn = h("button", { type: "button", class: "jn-btn jn-btn--primary", id: "cgMain", text: T("g.changed.seen") });
      ctx.bottom.appendChild(mainBtn);

      const G = build(lv, mem), diffs = G.list;
      let phase = "ready", found = 0, wrong = 0, hints = 0, autoHints = 0, replays = 0, hintShown = false, lastFind = 0, iv = 0, lookEnd = 0, peeking = false;
      /* 첫 판 손짓 도우미: 찾는 중이고 처음 그림을 보고 있지 않을 때만, 아직 못 찾은 달라진 곳 하나를 화면 좌표로 알려 줘요 */
      const diffTarget = () => {
        if (phase !== "find" || peeking) return null;
        const d = diffs.find((x) => !x.found), m = d && svgB.getScreenCTM(); if (!m) return null;
        const r = A.hitR(d.b) * Math.abs(m.a);
        return { getBoundingClientRect: () => ({ left: m.a * d.b.x + m.e - r, top: m.d * d.b.y + m.f - r, width: r * 2, height: r * 2 }) };
      };
      const nudge = U.nudge(ctx, diffTarget, { idleMs: 15000 });
      A.renderScene(svgA, G.scene, G.base, lv.style); A.renderScene(svgB, G.scene, G.mod, lv.style);
      const show = (which) => { svgA.classList.toggle("on", which === "A"); svgB.classList.toggle("on", which === "B"); };
      show("A");

      function paintDots() {
        dotsBox.textContent = "";
        diffs.forEach((d) => dotsBox.appendChild(h("i", { class: d.found ? "on" : null, svg: d.found ? Art.icon("확인") : "" })));
      }
      function layout() {
        const W = board.clientWidth - 20, H = board.clientHeight - 20 - 52;
        if (W < 40 || H < 40) return;
        const w = Math.max(120, Math.min(W, H * 4 / 3, 640));
        pic.style.width = Math.floor(w) + "px"; pic.style.height = Math.floor(w * 0.75) + "px";
        bar.style.width = Math.floor(w) + "px";
      }
      function svgPoint(svg, e) {
        const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
        const m = svg.getScreenCTM(); if (!m) return null;
        const p = pt.matrixTransform(m.inverse()); return [p.x, p.y];
      }
      function circle(svg, cls, x, y, r, layer) {
        const host = svg.querySelector(layer || ".marks");
        if (cls === "mark" && window.rough) {   // 찾은 곳 = 연필 동그라미
          const g = document.createElementNS(NS, "g"); g.setAttribute("class", "mark");
          g.innerHTML = JN.rough.paths("ellipse", [+x, +y, r * 2.1, r * 1.95], { stroke: JN.cssVar("--c-olive-deep", "#5E6B2C"), strokeWidth: 3.6, roughness: 1.5, seed: 1 + Math.floor(x + y) });
          host.appendChild(g); return g;
        }
        const c = document.createElementNS(NS, "circle");
        c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", r); c.setAttribute("class", cls);
        host.appendChild(c); return c;
      }
      function clearHint() { hintShown = false; const l = svgB.querySelector(".hintLayer"); if (l) l.innerHTML = ""; }
      function showHint() {
        const d = diffs.find((x) => !x.found); if (!d) return;
        hintShown = true;
        const ang = Math.random() * Math.PI * 2, off = A.hitR(d.b) * 0.5, layer = svgB.querySelector(".hintLayer"), col = A.COLORS.yellow;
        layer.innerHTML = `<defs><radialGradient id="cgHg"><stop offset="0" stop-color="${col}" stop-opacity=".75"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient></defs>`;
        const c = circle(svgB, "hintglow", (d.b.x + Math.cos(ang) * off).toFixed(1), (d.b.y + Math.sin(ang) * off).toFixed(1), (A.hitR(d.b) * 2).toFixed(1), ".hintLayer");
        c.setAttribute("fill", "url(#cgHg)"); c.setAttribute("pointer-events", "none");
      }
      function growStamp() {   // 수첩에 도장 하나 (12개가 다 찼으면 그대로)
        const n = stampsNow();
        if (n >= STAMP_MAX) return false;
        mem.stamps = n + 1; ctx.saveMem(); stampGot++; if (n + 1 >= STAMP_MAX) completed = true;
        paintBook(); bookIcon.innerHTML = stampSvg(n); bookIcon.classList.add("pop");
        ctx.later(() => { bookIcon.classList.remove("pop"); }, 900);
        return true;
      }
      function finish() {
        phase = "done"; clearHint(); clearInterval(iv); nudge.stop();
        const time = ctx.timer.stop();
        mainBtn.disabled = true;
        const grew = growStamp(), n = stampsNow();
        const fin = () => ctx.finish({ cleared: true, time, mistakes: wrong, hints, metrics: { autoHints, replays }, title: T("g.spot.title"),
          line: T("g.changed.line", { n: diffs.length }) + T(completed ? "g.changed.line.full" : grew ? "g.changed.line.stamp" : "g.changed.line.again", { n, max: STAMP_MAX }),
          bestKey: lv.id, bestValue: U.r1(time) });
        if (completed) ctx.later(() => showDone(fin), Math.max(JN.ms(900), 40)); else fin();
      }
      /* 탐정 수첩 완성 카드: 도장 12개를 정해진 순서대로 세운 그림 + 따뜻한 말. '고마워요' 단추 하나. 저절로 새로 시작하지 않아요 */
      function showDone(next) {
        if (!ctx.alive()) return;
        const row = h("div", { class: "cg-donestamps", "aria-hidden": "true" });
        for (let i = 0; i < STAMP_MAX; i++) row.appendChild(h("span", { svg: stampSvg(i) }));
        const ok = h("button", { type: "button", class: "jn-btn jn-btn--big", id: "cgDoneOk" }, T("g.changed.done.ok"));
        doneCard = h("div", { class: "dw-done cg-done", id: "cgDone", role: "group", "aria-label": T("g.changed.done.title") },
          h("div", { class: "dw-donecard" }, h("h2", { text: T("g.changed.done.title") }), row, h("p", { text: T("g.changed.done.body") }), ok));
        board.appendChild(doneCard);
        U.onTap(ok, () => { if (doneCard && doneCard.isConnected) { doneCard.remove(); doneCard = null; next(); } });
        ctx.say(T("g.changed.done.say"));
        try { ok.focus({ preventScroll: true }); } catch (e) { /* 포커스는 없어도 돼요 */ }
      }
      svgB.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        if (phase !== "find" || peeking) return;
        const p = svgPoint(svgB, e); if (!p) return;
        let best = null, bd = Infinity;
        diffs.forEach((d) => { if (d.found) return; [d.a, d.b].forEach((o) => { const dist = Math.hypot(p[0] - o.x, p[1] - o.y); if (dist <= A.hitR(o) && dist < bd) { best = d; bd = dist; } }); });
        if (best) {
          best.found = true; found++; lastFind = Date.now(); clearHint();
          circle(svgA, "mark", best.a.x, best.a.y, A.hitR(best.a) - 4); circle(svgB, "mark", best.b.x, best.b.y, A.hitR(best.b) - 4);
          ctx.sound("ok"); paintDots(); nudge.ok();
          if (found === diffs.length) finish(); else ctx.say(found === 1 ? T("g.spot.say.first") : T("g.spot.say.more"));
        } else {
          wrong++; nudge.wrong();   // 벌은 없어요. 물결만 살짝 (처음 하는 아이는 두 번째부터 손이 도와줘요)
          const r = circle(svgB, "ripple", p[0], p[1], 22); setTimeout(() => r.remove(), 800);
        }
      });

      function toFind() {
        if (phase !== "look") return;
        phase = "find"; clearInterval(iv);
        barFill.style.width = "100%"; barText.textContent = "";
        bar.classList.add("off");
        tag.textContent = T("g.changed.second"); show("B");
        mainBtn.textContent = T("g.changed.replay");
        lastFind = Date.now(); ctx.timer.start(); nudge.arm();
        ctx.say(T("g.changed.say.find", { n: diffs.length }));
        iv = setInterval(() => {
          if (phase === "find" && mode === "always" && !hintShown && !peeking && Date.now() - lastFind >= AUTO_HINT_SEC * 1000 / JN.TIME_SCALE) { autoHints++; showHint(); }
        }, 500);
      }
      function peek() {   // 처음 그림을 잠깐 다시 보여 줘요 (벌 없음, 횟수는 기록에 '다시 봄'으로만)
        if (phase !== "find" || peeking) return;
        peeking = true; replays++; clearHint(); nudge.hide(); tag.textContent = T("g.changed.first"); show("A"); mainBtn.disabled = true;
        ctx.say(T("g.changed.say.peek"));
        ctx.later(() => { peeking = false; if (phase !== "find") return; tag.textContent = T("g.changed.second"); show("B"); mainBtn.disabled = false; ctx.say(T("g.changed.say.find2")); lastFind = Date.now(); }, PEEK_MS / JN.TIME_SCALE);
      }
      U.onTap(mainBtn, () => { if (phase === "look") toFind(); else if (phase === "find") peek(); });
      ctx.hint(mode === "button", () => { if (phase === "find" && !peeking && !hintShown) { hints++; showHint(); } });
      paintDots(); layout();
      return {
        start() {
          phase = "look"; lookEnd = Date.now() + LOOK_MS / JN.TIME_SCALE;
          ctx.say(T("g.changed.say.look"));
          const tick = () => {
            const left = Math.max(0, lookEnd - Date.now()), total = LOOK_MS / JN.TIME_SCALE;
            barFill.style.width = Math.round(left / total * 100) + "%";
            barText.textContent = T("common.sec", { n: Math.ceil(left * JN.TIME_SCALE / 1000) });
            if (left <= 0) toFind();
          };
          tick(); iv = setInterval(tick, 100);
        },
        resize: layout,
        destroy() { phase = "done"; clearInterval(iv); nudge.stop(); },
        test: {
          phase: () => phase,
          state: () => ({ phase, found, wrong, stamps: stampsNow(), stampGot, completed, card: !!(doneCard && doneCard.isConnected), nudgeShown: nudge.shown(), nudgeVisible: nudge.visible() }),
          skip: () => toFind(),
          diffs: () => diffs.map((d) => ({ x: d.b.x, y: d.b.y, found: d.found, kind: d.kind })),
          toClient: (x, y) => { const m = svgB.getScreenCTM(); return [m.a * x + m.e, m.d * y + m.f]; },
        },
      };
    },
  });
})();
