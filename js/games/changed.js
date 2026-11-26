/* 달라진 그림 찾기 — 그림을 10초 보여 준 뒤, 바뀐 그림에서 달라진 곳을 찾아요 (주의집중 방).
   '다른 그림 찾기'(spot.js, 보는 힘 방)는 두 그림을 나란히 놓고 비교하지만, 이 놀이는 처음 그림을 잠깐 보고 기억해서 찾아요.
   그림은 spot.js 가 꺼내 둔 손그림풍 장면(JN.spotArt)을 그대로 다시 써요. 새 그림 파일·바깥 요청 없음.
   틀려도 벌이 없어요: 엉뚱한 곳을 눌러도 물결만 나오고, '처음 그림 다시 보기'는 몇 번이든 눌러 볼 수 있어요. */
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
      const barFill = h("i"), barText = h("span", { class: "cg-count", text: "" });
      const bar = h("div", { class: "cg-bar", "aria-hidden": "true" }, h("span", { class: "cg-track" }, barFill), barText);
      board.appendChild(h("div", { class: "cg-col" }, bar, pic));
      const dotsBox = h("span", { class: "sd-dots", "aria-label": T("g.spot.count.aria") });
      ctx.status(dotsBox);
      const mainBtn = h("button", { type: "button", class: "jn-btn jn-btn--primary", id: "cgMain", text: T("g.changed.seen") });
      ctx.bottom.appendChild(mainBtn);

      const G = build(lv, mem), diffs = G.list;
      let phase = "ready", found = 0, wrong = 0, hints = 0, autoHints = 0, replays = 0, hintShown = false, lastFind = 0, iv = 0, lookEnd = 0, peeking = false;
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
      function finish() {
        phase = "done"; clearHint(); clearInterval(iv);
        const time = ctx.timer.stop();
        mainBtn.disabled = true;
        ctx.finish({ cleared: true, time, mistakes: wrong, hints, metrics: { autoHints, replays }, title: T("g.spot.title"), line: T("g.changed.line", { n: diffs.length }), bestKey: lv.id, bestValue: U.r1(time) });
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
          ctx.sound("ok"); paintDots();
          if (found === diffs.length) finish(); else ctx.say(found === 1 ? T("g.spot.say.first") : T("g.spot.say.more"));
        } else {
          wrong++;   // 벌은 없어요. 물결만 살짝
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
        lastFind = Date.now(); ctx.timer.start();
        ctx.say(T("g.changed.say.find", { n: diffs.length }));
        iv = setInterval(() => {
          if (phase === "find" && mode === "always" && !hintShown && !peeking && Date.now() - lastFind >= AUTO_HINT_SEC * 1000 / JN.TIME_SCALE) { autoHints++; showHint(); }
        }, 500);
      }
      function peek() {   // 처음 그림을 잠깐 다시 보여 줘요 (벌 없음, 횟수는 기록에 '다시 봄'으로만)
        if (phase !== "find" || peeking) return;
        peeking = true; replays++; clearHint(); tag.textContent = T("g.changed.first"); show("A"); mainBtn.disabled = true;
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
        destroy() { phase = "done"; clearInterval(iv); },
        test: {
          phase: () => phase,
          skip: () => toFind(),
          diffs: () => diffs.map((d) => ({ x: d.b.x, y: d.b.y, found: d.found, kind: d.kind })),
          toClient: (x, y) => { const m = svgB.getScreenCTM(); return [m.a * x + m.e, m.d * y + m.f]; },
        },
      };
    },
  });
})();
