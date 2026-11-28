/* 숫자 찾기 (옛 '차례차례 콕콕') — 숫자를 차례대로 콕콕 누르기 */
"use strict";
(function () {
  const U = JN.util, h = U.h, T = JN.t;   // T: 화면 글자는 lang/ko.js 에서
  /* [1] 단계 데이터 — 원래 놀이의 GAME_DATA 그대로 (단계 이름·짧은 이름은 언어 파일, 가나다 글자 목록도 언어 파일) */
  const STAGES = [
    { id: "n10", name: T("g.number.n10"), short: T("g.number.n10.short"), type: "range", from: 1, to: 10, step: 1, vary: false },
    { id: "n15", name: T("g.number.n15"), short: T("g.number.n15.short"), type: "range", from: 1, to: 15, step: 1, vary: false },
    { id: "n20", name: T("g.number.n20"), short: T("g.number.n20.short"), type: "range", from: 1, to: 20, step: 1, vary: false },
    { id: "n25", name: T("g.number.n25"), short: T("g.number.n25.short"), type: "range", from: 1, to: 25, step: 1, vary: true },
    { id: "skip2", name: T("g.number.skip2"), short: T("g.number.skip2.short"), type: "range", from: 2, to: 20, step: 2, vary: true },
    { id: "tens", name: T("g.number.tens"), short: T("g.number.tens.short"), type: "range", from: 10, to: 100, step: 10, vary: true },
    { id: "down10", name: T("g.number.down10"), short: T("g.number.down10.short"), type: "range", from: 10, to: 1, step: -1, vary: true },
    { id: "gana", name: T("g.number.gana"), short: T("g.number.gana.short"), type: "list", items: T("g.number.gana.items"), vary: true },
    { id: "mix", name: T("g.number.mix"), short: T("g.number.mix.short"), type: "list", items: T("g.number.mix.items"), vary: true },
  ];
  const LAYOUT = { minButtonPx: 64, maxButtonPx: 96, gapPx: 8, scaleRange: [0.88, 1.15], tiltDeg: 12,
    tints: ["seeing", "attention", "memory", "thinking", "hands", "body", "words"] };   // 동그라미 바탕 = 영역 연한 색
  const HINT_BUTTON_MS = 2500;

  function buildSeq(st) {
    if (st.type === "list") return st.items.map(String);
    const out = [], step = st.step || 1;
    if (step > 0) for (let v = st.from; v <= st.to; v += step) out.push(String(v));
    else for (let v = st.from; v >= st.to; v += step) out.push(String(v));
    return out;
  }
  /* 흩어 놓되 겹치지 않게 (원래 놀이의 배치 규칙) */
  function tryRandom(sizes, w, h2, gap) {
    const order = sizes.map((d, i) => i).sort((a, b) => sizes[b] - sizes[a]);
    const pos = new Array(sizes.length), placed = [];
    for (const i of order) {
      const r = sizes[i] / 2;
      if (2 * r > w || 2 * r > h2) return null;
      let ok = false;
      for (let t = 0; t < 700; t++) {
        const x = U.rand(r, w - r), y = U.rand(r, h2 - r);
        if (!placed.some((p) => { const dx = p.x - x, dy = p.y - y, m = p.r + r + gap; return dx * dx + dy * dy < m * m; })) {
          placed.push({ x, y, r }); pos[i] = { x, y }; ok = true; break;
        }
      }
      if (!ok) return null;
    }
    return pos;
  }
  function gridFallback(n, w, h2, gap, d0) {
    let best = { c: 1, cell: 0 };
    for (let c = 1; c <= n; c++) { const cell = Math.min(w / c, h2 / Math.ceil(n / c)); if (cell > best.cell) best = { c, cell }; }
    const cols = best.c, rows = Math.ceil(n / cols), cw = w / cols, ch = h2 / rows;
    const cells = U.shuffle([...Array(cols * rows).keys()]).slice(0, n);
    const d = Math.max(10, Math.min(d0, Math.min(cw, ch) - gap));
    const pos = cells.map((cell) => {
      const sx = (cw - d - gap) / 2, sy = (ch - d - gap) / 2;
      return { x: (cell % cols) * cw + cw / 2 + U.rand(-sx, sx), y: Math.floor(cell / cols) * ch + ch / 2 + U.rand(-sy, sy) };
    });
    return { pos, sizes: cells.map(() => d) };
  }
  function computeLayout(scales, w, h2) {
    const n = scales.length, gap = LAYOUT.gapPx;
    const rEff = Math.sqrt((w * h2 * 0.34) / (n * Math.PI));
    const base = Math.min(LAYOUT.maxButtonPx, Math.max(LAYOUT.minButtonPx, 2 * rEff - gap));
    for (let k = 0; k < 10; k++) {
      const sizes = scales.map((s) => Math.min(LAYOUT.maxButtonPx, Math.max(LAYOUT.minButtonPx, base * s * (1 - 0.06 * k))));
      for (let t = 0; t < 4; t++) { const pos = tryRandom(sizes, w, h2, gap); if (pos) return { pos, sizes }; }
    }
    return gridFallback(n, w, h2, gap, LAYOUT.minButtonPx);
  }

  JN.registerGame({
    id: "숫자찾기", stages: STAGES, trackTotal: true,
    hintHelp: { always: T("g.number.hh.always"), button: T("g.number.hh.button"), none: T("g.number.hh.none") },
    extraSettings: [
      { key: "showTrail", type: "bool", label: T("g.number.x.trail"), sub: T("g.number.x.trail.sub"), def: false },
      { key: "autoHint", type: "bool", label: T("g.number.x.auto"), sub: T("g.number.x.auto.sub"), def: false },
      { key: "hintDelay", type: "select", label: T("g.number.x.delay"), def: 10, options: [5, 10, 15, 20, 30].map((n) => [n, T("common.sec", { n })]) },
      { key: "vary", type: "select", label: T("g.number.x.vary"), def: "auto", options: [["auto", T("g.number.x.vary.auto")], ["on", T("g.number.x.vary.on")], ["off", T("g.number.x.vary.off")]] },
    ],
    chart: { key: "time", label: T("common.time"), unit: T("common.unit.sec") },
    describe: (e) => U.fmtTime(e.time) + T("g.number.describe", { m: e.mistakes || 0 }) + (e.hints ? T("g.number.describe.hint", { n: e.hints }) : ""),
    intro: (st) => T("g.number.intro", { name: st.name }),
    mount(ctx) {
      const st = ctx.stage, set = ctx.settings, mode = set.hintMode, board = ctx.board;
      board.classList.add("nf-board");
      const seq = buildSeq(st);
      const vary = set.vary === "on" || (set.vary === "auto" && st.vary);
      const tints = U.shuffle(LAYOUT.tints.slice());
      let idx = 0, mistakes = 0, hints = 0, autoHints = 0, active = false, hintT = 0, peekT = 0;
      const items = seq.map((label, i) => {
        const el = h("button", { type: "button", class: "num", "data-order": String(i), "aria-label": label, text: label,
          style: "--paper-bg: var(--area-" + tints[i % tints.length] + "-tint)" });
        el.style.setProperty("--rot", (vary ? U.rand(-LAYOUT.tiltDeg, LAYOUT.tiltDeg) : 0).toFixed(1) + "deg");
        el.addEventListener("pointerdown", (e) => { e.preventDefault(); press(el); });
        board.appendChild(el);
        return { el, label, scale: vary ? U.rand(LAYOUT.scaleRange[0], LAYOUT.scaleRange[1]) : 1 };
      });
      const nb = h("span", { class: "nextbox", "aria-live": "polite" }, h("span", { class: "trail" }), h("span", { class: "w", text: T("g.number.next") }), h("b"));
      ctx.bottom.appendChild(nb);
      nb.style.visibility = mode === "always" ? "visible" : "hidden";

      function layout() {
        const pad = 6, w = board.clientWidth - pad * 2, h2 = board.clientHeight - pad * 2;
        if (w < 40 || h2 < 40) return;
        const { pos, sizes } = computeLayout(items.map((it) => it.scale), w, h2);
        items.forEach((it, i) => {
          const d = sizes[i], s = it.el.style;
          s.width = s.height = d + "px"; s.left = (pad + pos[i].x - d / 2) + "px"; s.top = (pad + pos[i].y - d / 2) + "px";
          s.fontSize = Math.round(d * (it.label.length >= 3 ? 0.32 : 0.42)) + "px";
        });
      }
      function updateNext() {
        nb.querySelector("b").textContent = seq[idx] || "";
        const trail = mode === "always" && set.showTrail ? seq.slice(0, idx) : [];
        const shown = trail.length > 4 ? ["…"].concat(trail.slice(-4)) : trail;
        nb.querySelector(".trail").textContent = shown.length ? shown.join(" → ") + " →" : "";
        nb.querySelector(".w").hidden = shown.length > 0;
      }
      function clearHint() { clearTimeout(hintT); items.forEach((it) => it.el.classList.remove("hint")); }
      function scheduleHint() {
        clearHint();
        if (!set.autoHint || !active || mode === "none") return;
        hintT = ctx.later(() => { const it = items[idx]; if (active && it) { it.el.classList.add("hint"); autoHints++; } }, Math.max(1, Number(set.hintDelay) || 10) * 1000 / JN.TIME_SCALE);
      }
      function press(el) {
        if (!active || el.classList.contains("done")) return;
        if (Number(el.dataset.order) === idx) {
          el.classList.remove("hint"); el.classList.add("done"); el.setAttribute("aria-disabled", "true"); el.tabIndex = -1;
          idx++;
          if (idx >= seq.length) return finish();
          ctx.sound("ok");
          if (mode === "button") { clearTimeout(peekT); nb.style.visibility = "hidden"; }
          updateNext(); scheduleHint();
        } else {
          mistakes++;                    // 화면에는 표시하지 않고 기록에만
          el.classList.remove("gentle"); void el.offsetWidth; el.classList.add("gentle");
          ctx.sound("miss");
        }
      }
      function finish() {
        active = false; clearHint(); clearTimeout(peekT);
        const time = ctx.timer.stop();
        ctx.finish({ cleared: true, time, mistakes, hints, metrics: { autoHints }, title: U.pick(T("g.number.titles")),
          line: hints ? T("g.number.line.hints", { n: hints }) : "", bestKey: st.id, bestValue: U.r1(time) });
      }
      ctx.hint(mode === "button", () => {
        if (!active) return;
        const it = items[idx]; if (!it) return;
        hints++;
        it.el.classList.add("hint");
        nb.style.visibility = "visible";
        clearTimeout(peekT);
        const at = idx;
        peekT = ctx.later(() => { if (mode === "button") nb.style.visibility = "hidden"; if (items[at]) items[at].el.classList.remove("hint"); }, HINT_BUTTON_MS);
      });
      layout(); updateNext();
      return {
        start() { active = true; ctx.timer.start(); ctx.say(T("g.number.say", { name: st.name })); scheduleHint(); },
        resize: layout,
        destroy() { active = false; clearHint(); },
        test: { next: () => seq[idx], seq: () => seq.slice(), idx: () => idx },
      };
    },
  });
})();
