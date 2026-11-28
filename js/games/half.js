/* 반쪽 그림 (옛 '반쪽 그림 완성') — 접는 선 건너편에 나머지 반쪽 그리기 */
"use strict";
(function () {
  const U = JN.util, h = U.h, TX = JN.t;   // TX: 화면 글자는 lang/ko.js 에서 (T 는 아래 좌표 뒤집기 함수)
  const SN = (name) => TX("g.half.shape." + name);   // 그림 이름(name 은 코드용 이름, 화면에는 SN 으로)
  const N = 10, C = 5;   // 10x10 칸, 접는 선 위치
  const SHAPES = {
    "네모": [[[5, 2], [2, 2], [2, 8], [5, 8]]],
    "집": [[[5, 1], [1, 5], [2, 5], [2, 9], [5, 9]], [[2, 5], [5, 5]], [[4, 9], [4, 7], [5, 7]]],
    "나무": [[[5, 1], [3, 1], [1, 3], [1, 5], [3, 7], [4, 7], [4, 9], [5, 9]]],
    "나비": [[[5, 3], [3, 1], [1, 1], [1, 4], [4, 5], [1, 7], [2, 9], [4, 8], [5, 6]], [[5, 3], [4, 1]]],
    "하트": [[[5, 3], [4, 2], [2, 2], [1, 3], [1, 5], [5, 9]]],
    "로켓": [[[5, 0], [3, 2], [3, 8], [5, 8]], [[3, 5], [1, 7], [1, 9], [3, 8]], [[5, 3], [4, 4], [5, 5]], [[4, 8], [5, 10]]],
    "고양이 얼굴": [[[5, 3], [3, 3], [2, 1], [1, 4], [1, 7], [3, 9], [5, 9]], [[3, 5], [3, 6]], [[3, 7], [0, 6]], [[5, 7], [4, 8]]],
    "크리스마스트리": [[[5, 0], [3, 2], [4, 2], [2, 4], [3, 4], [1, 6], [2, 6], [0, 8], [4, 8], [4, 10], [5, 10]]],
    "성": [[[5, 4], [3, 4], [3, 1], [2, 1], [2, 2], [1, 2], [1, 1], [0, 1], [0, 10], [5, 10]], [[4, 10], [4, 7], [5, 6]], [[1, 4], [2, 4], [2, 5], [1, 5], [1, 4]]],
    "꽃병": [[[5, 1], [3, 1], [3, 2], [4, 3], [4, 4], [2, 6], [2, 9], [3, 10], [5, 10]], [[2, 7], [5, 7]]],
  };
  const FISH_H = [[[2, 5], [0, 2], [0, 5]], [[2, 5], [4, 3], [7, 2], [9, 3], [10, 5]], [[8, 3], [8, 4]], [[5, 3], [6, 1], [7, 2]]];
  const T = (segs) => segs.map((l) => l.map(([x, y]) => [y, x]));
  const LV = [
    { name: "네모", axis: "v", dots: true }, { name: "집", axis: "v", dots: true }, { name: "나무", axis: "v", dots: true },
    { name: "나비", axis: "v", dots: true }, { name: "하트", axis: "v", dots: true },
    { name: "로켓", axis: "v", dots: false }, { name: "고양이 얼굴", axis: "v", dots: false }, { name: "크리스마스트리", axis: "v", dots: false },
    { name: "성", axis: "v", dots: false }, { name: "꽃병", axis: "v", dots: false },
    { name: "물고기", axis: "h", dots: true, lines: FISH_H }, { name: "로켓", axis: "h", dots: true, lines: T(SHAPES["로켓"]) },
    { name: "나비", axis: "h", dots: false, lines: T(SHAPES["나비"]) }, { name: "하트", axis: "h", dots: false, lines: T(SHAPES["하트"]) },
  ];
  const STAGES = LV.map((l, i) => Object.assign({ id: "h" + (i + 1), lines: l.lines || SHAPES[l.name] }, l,
    { label: SN(l.name) + (l.axis === "h" ? TX("g.half.updown") : "") + TX("g.half.mode." + (l.dots ? "dots" : "free")) }));
  const CONF = { feedback: { almost: 0.85, good: 0.55 }, tolerance: { dots: 0.35, free: 0.7 }, peekMs: 2500, checkShowMs: 1600 };
  const ERASER = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M38 82 L14 58 a8 8 0 0 1 0 -11 L50 11 a8 8 0 0 1 11 0 L86 36 a8 8 0 0 1 0 11 L51 82 Z M30 42 L66 78 M38 82 H86" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function distSeg(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    const t = U.clamp(l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0, 0, 1);
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  }
  function samples(lines) {
    const out = [];
    lines.forEach((l) => { for (let i = 1; i < l.length; i++) { const a = l[i - 1], b = l[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.2)); for (let k = 0; k <= n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } });
    return out;
  }
  function minDist(p, lines) { let m = Infinity; lines.forEach((l) => { for (let i = 1; i < l.length; i++) m = Math.min(m, distSeg(p, l[i - 1], l[i])); }); return m; }

  JN.registerGame({
    id: "반쪽그림", stages: STAGES, stageLabel: (st) => st.label,
    hintHelp: { always: TX("g.half.hh.always"), button: TX("g.half.hh.button"), none: TX("g.half.hh.none") },
    parentNote: TX("g.half.parentNote"),
    chart: { key: "time", label: TX("common.time"), unit: TX("common.unit.sec") },
    describe: (e) => U.fmtTime(e.time) + TX("g.half.describe", { state: e.cleared ? TX("g.half.done") : TX("g.half.retry"), n: e.strokes || 0 }) + (e.hints ? TX("g.half.describe.hint", { n: e.hints }) : ""),
    intro: (st) => TX("g.half.draw." + st.axis + "." + (st.dots ? "dots" : "free")),
    mount(ctx) {
      const lv = ctx.stage, mode = ctx.settings.hintMode, board = ctx.board;
      board.classList.add("hd-board");
      const COL = { ink: JN.cssVar("--c-ink", "#2F3E46"), kid: JN.cssVar("--c-gentle-strong", "#E07A55"), fold: JN.cssVar("--c-gentle", "#F29E7E"),
        honey: JN.cssVar("--c-honey", "#F2C14E"), sky: JN.cssVar("--area-seeing", "#7FB7D9"), paper: JN.cssVar("--c-surface", "#FFFFFF"), faint: JN.cssVar("--c-ink-faint", "rgba(47,62,70,.3)"), mid: JN.cssVar("--c-ink-mid", "rgba(47,62,70,.6)") };
      const cv = h("canvas", { class: "hd-canvas", "aria-label": TX("g.half.canvas.aria") }), c2 = cv.getContext("2d");
      const tools = h("div", { class: "hd-tools" });
      board.append(h("div", { class: "hd-wrap" }, cv), tools);
      const tool = (label, svgText, fn, extra) => { const b = h("button", Object.assign({ type: "button", class: "toolbtn", "aria-label": label }, extra || {}), h("span", { class: "ic", svg: svgText }), label); U.onTap(b, fn); tools.appendChild(b); return b; };
      let strokes = [], current = null, pending = null, hover = null, eraser = false, peek = false, checked = false, drawing = false, hints = 0, active = false, misses = [];
      let size = 300, pad = 20, cell = 26, dpr = 1;
      const inDraw = (p) => lv.axis === "v" ? p[0] >= C - 0.0001 : p[1] >= C - 0.0001;
      const mirror = (p) => lv.axis === "v" ? [2 * C - p[0], p[1]] : [p[0], 2 * C - p[1]];
      const answer = () => lv.lines.map((l) => l.map(mirror));
      const toPx = (p) => [pad + p[0] * cell, pad + p[1] * cell];

      function layout() {
        const W = board.clientWidth - 16, H = board.clientHeight - 16 - 84;
        size = Math.max(200, Math.min(W, H, 560));
        dpr = window.devicePixelRatio || 1;
        cv.style.width = cv.style.height = size + "px";
        cv.width = cv.height = Math.round(size * dpr);
        pad = size * 0.07; cell = (size - 2 * pad) / N;
        draw();
      }
      function toGrid(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left - pad) / cell, (e.clientY - r.top - pad) / cell]; }
      function clampHalf(g) { let [x, y] = g; x = U.clamp(x, 0, N); y = U.clamp(y, 0, N); if (lv.axis === "v") x = Math.max(C, x); else y = Math.max(C, y); return [x, y]; }
      function nearestDot(g) { const d = [Math.round(g[0]), Math.round(g[1])]; if (d[0] < 0 || d[0] > N || d[1] < 0 || d[1] > N || !inDraw(d)) return null; return Math.hypot(g[0] - d[0], g[1] - d[1]) <= 0.38 ? d : null; }
      function line(pts, color, width, dash, alpha) {
        if (pts.length < 2) return;
        c2.save(); c2.globalAlpha = alpha || 1; c2.strokeStyle = color; c2.lineWidth = width; c2.lineCap = "round"; c2.lineJoin = "round"; c2.setLineDash(dash || []);
        c2.beginPath(); pts.forEach((p, i) => { const [x, y] = toPx(p); i ? c2.lineTo(x, y) : c2.moveTo(x, y); }); c2.stroke(); c2.restore();
      }
      function kidLine(pts, w) { JN.brush(c2, pts.map(toPx), w, COL.kid); }   // 아이가 그은 선 = 붓 느낌
      function draw() {
        c2.setTransform(dpr, 0, 0, dpr, 0, 0); c2.clearRect(0, 0, size, size);
        c2.fillStyle = COL.paper; c2.fillRect(0, 0, size, size);
        const dotR = lv.dots ? Math.max(3, cell * 0.11) : Math.max(1.5, cell * 0.05);
        for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
          const [x, y] = toPx([i, j]);
          c2.fillStyle = inDraw([i, j]) ? (lv.dots ? COL.mid : COL.faint) : COL.faint;
          c2.beginPath(); c2.arc(x, y, inDraw([i, j]) ? dotR : dotR * 0.8, 0, 7); c2.fill();
        }
        const a = toPx(lv.axis === "v" ? [C, -0.3] : [-0.3, C]), b = toPx(lv.axis === "v" ? [C, N + 0.3] : [N + 0.3, C]);
        c2.save(); c2.strokeStyle = COL.fold; c2.lineWidth = 3; c2.setLineDash([6, 7]); c2.beginPath(); c2.moveTo(a[0], a[1]); c2.lineTo(b[0], b[1]); c2.stroke(); c2.restore();
        const lw = Math.max(6, cell * 0.16);
        lv.lines.forEach((l) => line(l, COL.ink, lw));
        if (checked || peek || (mode === "always" && !checked)) answer().forEach((l) => line(l, COL.sky, lw * 2.2, null, checked ? 0.45 : mode === "always" && !peek ? 0.16 : 0.25));
        strokes.forEach((s) => kidLine(s.pts, lw));
        if (current) kidLine(current.pts, lw);
        const from = current && current.pts.length ? current.pts[current.pts.length - 1] : pending;
        if (lv.dots && from && hover) line([from, hover], COL.kid, lw * 0.7, [4, 6], 0.7);
        if (lv.dots && pending) { const [x, y] = toPx(pending); c2.strokeStyle = COL.honey; c2.lineWidth = 4; c2.beginPath(); c2.arc(x, y, cell * 0.3, 0, 7); c2.stroke(); }
        for (const m of misses) { const [x, y] = toPx(m); c2.fillStyle = COL.honey; c2.beginPath(); c2.arc(x, y, Math.max(4, cell * 0.14), 0, 7); c2.fill(); }
      }
      function eraseAt(g) {
        const n = strokes.length;
        strokes = strokes.filter((s) => !s.pts.some((p, i) => i === 0 ? Math.hypot(p[0] - g[0], p[1] - g[1]) < 0.4 : distSeg(g, s.pts[i - 1], p) < 0.4));
        if (strokes.length !== n) { ctx.tone(330, 0.1, 0.03); draw(); }
      }
      cv.addEventListener("pointerdown", (e) => {
        if (checked || !active) return;
        e.preventDefault();
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
        const g = toGrid(e); drawing = true;
        if (eraser) return eraseAt(g);
        if (lv.dots) {
          const d = nearestDot(g);
          if (!d) { drawing = false; return; }
          if (pending && (pending[0] !== d[0] || pending[1] !== d[1])) { current = { pts: [pending, d] }; pending = null; ctx.tone(660, 0.08, 0.03); }
          else current = { pts: [d] };
          hover = g;
        } else current = { pts: [clampHalf(g)] };
        draw();
      });
      cv.addEventListener("pointermove", (e) => {
        if (!drawing) return;
        e.preventDefault();
        const g = toGrid(e);
        if (eraser) return eraseAt(g);
        if (!current) return;
        if (lv.dots) {
          hover = g;
          const d = nearestDot(g), last = current.pts[current.pts.length - 1];
          if (d && (d[0] !== last[0] || d[1] !== last[1])) { current.pts.push(d); ctx.tone(660, 0.08, 0.03); }
        } else {
          const p = clampHalf(g), last = current.pts[current.pts.length - 1];
          if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.05) current.pts.push(p);
        }
        draw();
      });
      function endStroke() {
        if (!drawing) return;
        drawing = false; hover = null;
        if (current) {
          if (current.pts.length >= 2) { strokes.push(current); pending = null; }
          else if (lv.dots) pending = current.pts[0];
          current = null;
        }
        draw();
      }
      cv.addEventListener("pointerup", endStroke);
      cv.addEventListener("pointercancel", endStroke);
      function similarity() {
        const ans = answer(), mine = strokes.map((s) => s.pts);
        if (!mine.length) return 0;
        const tol = lv.dots ? CONF.tolerance.dots : CONF.tolerance.free, A = samples(ans), B = samples(mine);
        const recall = A.filter((p) => minDist(p, mine) <= tol).length / A.length;
        const precision = B.length ? B.filter((p) => minDist(p, ans) <= tol).length / B.length : 0;
        misses = A.filter((p, i) => i % 3 === 0 && minDist(p, mine) > tol);
        return Math.min(recall, precision);
      }
      tool(TX("g.half.tool.undo"), Art.icon("다시"), () => { if (checked) return; if (pending) pending = null; else strokes.pop(); draw(); });
      const er = tool(TX("g.half.tool.eraser"), ERASER, () => { eraser = !eraser; er.setAttribute("aria-pressed", String(eraser)); }, { "aria-pressed": "false" });
      tool(TX("g.half.tool.reset"), Art.icon("지우기"), () => { if (checked) return; strokes = []; pending = null; draw(); });
      const doneBtn = h("button", { type: "button", class: "jn-btn jn-btn--primary", id: "hdDone" }, TX("g.half.done.btn"));
      ctx.bottom.appendChild(doneBtn);
      U.onTap(doneBtn, () => {
        if (!active || checked) return;
        if (!strokes.length) { ctx.say(TX("g.half.say.empty." + lv.axis)); return; }
        checked = true; peek = false; pending = null; active = false;
        const s = similarity(), time = ctx.timer.stop(), cleared = s >= CONF.feedback.good;
        if (s >= CONF.feedback.almost) misses = [];
        ctx.say(s >= CONF.feedback.almost ? TX("g.half.fb.almost") : cleared ? TX("g.half.fb.good") : TX("g.half.fb.again"));
        draw();
        ctx.later(() => ctx.finish({ cleared, time, hints, metrics: { strokes: strokes.length }, title: cleared ? TX("g.half.title.ok") : TX("g.half.title.try"),
          line: cleared ? TX("g.half.line.ok", { name: SN(lv.name) }) : TX("g.half.line.try"), bestKey: cleared ? lv.id : null, bestValue: U.r1(time) }), CONF.checkShowMs / JN.TIME_SCALE);
      });
      ctx.hint(mode === "button", () => {
        if (checked || !active) return;
        hints++; peek = true; draw();
        ctx.later(() => { peek = false; draw(); }, CONF.peekMs);
      });
      layout();
      return {
        start() { active = true; ctx.timer.start(); ctx.say(TX("g.half.draw." + lv.axis + "." + (lv.dots ? "dots" : "free"))); },
        resize: layout,
        destroy() { active = false; },
        test: {
          answer: () => answer(), dots: () => lv.dots,
          toClient: (gx, gy) => { const r = cv.getBoundingClientRect(); return [r.left + pad + gx * cell, r.top + pad + gy * cell]; },
          strokes: () => strokes.length,
        },
      };
    },
  });
})();
