/* 불빛 순서 (옛 '불빛 순서 기억하기') — 친구들이 빛난 순서대로 누르기 */
"use strict";
(function () {
  const U = JN.util, h = U.h, TX = JN.t;   // TX: 화면 글자는 lang/ko.js 에서 (T 는 아래 시간 표가 써요)
  const DATA = {
    stages: [2, 3, 4, 5, 6, 7].map((n) => ({ id: "len" + n, name: TX("g.light.stage", { n }), short: TX("g.light.stage.short", { n }), start: n })),
    friendSteps: [{ upTo: 4, count: 4 }, { upTo: 6, count: 6 }, { upTo: 99, count: 9 }],
    /* 친구 9마리: art.js 프로필 동물 8 + 부엉이. 소리 높이는 서로 어울리는 5음계 */
    friends: [
      { kind: "토끼", color: "lilac", note: 261.6 }, { kind: "곰", color: "apricot", note: 293.7 }, { kind: "고양이", color: "honey", note: 329.6 },
      { kind: "강아지", color: "leaf", note: 392.0 }, { kind: "여우", color: "sky", note: 440.0 }, { kind: "펭귄", color: "pink", note: 523.3 },
      { kind: "사자", color: "mint", note: 587.3 }, { kind: "다람쥐", color: "sand", note: 659.3 }, { kind: "부엉이", color: "cream", note: 784.0 },
    ],
    timing: { leadMs: 800, onMs: 600, gapMs: 400, tapMs: 350, afterOkMs: 1200, retryMs: 1400 },
    roundsPerGame: 10, stageUpGain: 2, idleHintMs: 4000, hintButtonMs: 1500,
  };
  const T = DATA.timing;
  const ORDER = { forward: TX("g.light.order.forward"), backward: TX("g.light.order.backward") };
  const friendCount = (l) => { for (const s of DATA.friendSteps) if (l <= s.upTo) return s.count; return 9; };
  function friendSvg(f) {
    if (f.kind === "부엉이") return Art.owl({ face: "기본", label: TX("g.light.owl") });
    return Art.profile(f.kind, { color: Art.COLORS[f.color], label: f.kind });
  }

  JN.registerGame({
    id: "불빛순서", stages: DATA.stages,
    /* 작은 걸음: 불빛이 걸음마다 조금씩 빨라져요 (켜짐 600→450ms, 사이 400→300ms) */
    tune: (st, f) => Object.assign(st, { onMs: Math.round(T.onMs * (1 - 0.25 * f)), gapMs: Math.round(T.gapMs * (1 - 0.25 * f)) }),
    hintHelp: { always: TX("g.light.hh.always"), button: TX("g.light.hh.button"), none: TX("g.light.hh.none") },
    extraSettings: [{ key: "order", type: "select", label: TX("g.light.x.order"), def: "forward", options: [["forward", TX("g.light.order.forward")], ["backward", TX("g.light.x.order.backward")]] }],
    parentNote: TX("g.light.parentNote"),
    chart: { key: "best", label: TX("g.light.chart"), unit: TX("g.light.unit") },
    describe: (e) => TX("g.light.describe", { best: e.best || 0, order: ORDER[e.order || "forward"], m: e.mistakes || 0 }) + (e.hints ? TX("g.number.describe.hint", { n: e.hints }) : ""),
    intro: (st, set) => TX("g.light.intro") + (set.order === "backward" ? TX("g.light.intro.back") : ""),
    mount(ctx) {
      const st = ctx.stage, set = ctx.settings, mode = set.hintMode, order = set.order === "backward" ? "backward" : "forward";
      const board = ctx.board; board.classList.add("lo-board");
      const grid = h("div", { class: "lo-grid" }); board.appendChild(grid);
      const dots = h("div", { class: "lo-dots", "aria-hidden": "true" }); ctx.bottom.appendChild(dots);
      let phase = "idle", seq = [], len = st.start, fails = 0, roundNo = 0, best = 0, mistakes = 0, hints = 0, autoHints = 0, input = 0, token = 0, idleT = 0, count = 4, alive = true;
      const wait = (ms) => new Promise((r) => setTimeout(r, ms / JN.TIME_SCALE));

      function renderGrid() {
        grid.textContent = ""; grid.dataset.n = String(count);
        for (let i = 0; i < count; i++) {
          const f = DATA.friends[i];
          const b = h("button", { type: "button", class: "friend", "data-i": String(i), "aria-label": f.kind, svg: friendSvg(f) });
          b.addEventListener("pointerdown", (e) => { e.preventDefault(); tap(i); });
          grid.appendChild(b);
        }
        layout();
      }
      function layout() {
        const cols = count === 4 ? 2 : 3, rows = Math.ceil(count / cols);
        const W = board.clientWidth - 24, H = board.clientHeight - 24, gap = 14;
        const s = Math.max(64, Math.floor(Math.min((W - gap * (cols - 1)) / cols, (H - gap * (rows - 1)) / rows, 200)));
        grid.style.gridTemplateColumns = "repeat(" + cols + ", " + s + "px)";
        for (const b of grid.children) { b.style.width = b.style.height = s + "px"; }
      }
      const btn = (i) => grid.children[i];
      function light(i, ms) {
        const b = btn(i); if (!b) return;
        b.classList.add("lit");
        ctx.tone(DATA.friends[i].note, Math.min(0.5, ms / 1000), 0.05);
        setTimeout(() => b.classList.remove("lit"), ms / JN.TIME_SCALE);
      }
      function paintDots() {
        dots.textContent = "";
        if (phase !== "input" && phase !== "wait") return;
        for (let k = 0; k < seq.length; k++) dots.appendChild(h("span", { class: "dot" + (k < input ? " on" : "") }));
      }
      function status() { ctx.say(TX("g.light.status", { no: roundNo < DATA.roundsPerGame ? roundNo + 1 : DATA.roundsPerGame, total: DATA.roundsPerGame, len })); }
      function makeSeq(l, n) { const out = []; for (let k = 0; k < l; k++) { let v; do { v = U.rnd(n); } while (k > 0 && v === out[k - 1]); out.push(v); } return out; }
      function nextRound() {
        if (!alive) return;
        if (roundNo >= DATA.roundsPerGame) return end();
        count = friendCount(len); seq = makeSeq(len, count); fails = 0;
        renderGrid(); show();
      }
      async function show() {
        const my = ++token;
        clearTimeout(idleT); clearRing();
        phase = "show"; input = 0; paintDots(); status();
        setEnabled(false);
        await wait(T.leadMs);
        for (const i of seq) { if (my !== token || !alive) return; light(i, st.onMs || T.onMs); await wait((st.onMs || T.onMs) + (st.gapMs || T.gapMs)); }
        if (my !== token || !alive) return;
        phase = "input"; setEnabled(true);
        ctx.say(order === "forward" ? TX("g.light.say.forward") : TX("g.light.say.backward"));
        paintDots(); idleHint();
      }
      function setEnabled(on) { for (const b of grid.children) b.setAttribute("aria-disabled", String(!on)); }
      const expected = () => order === "forward" ? seq[input] : seq[seq.length - 1 - input];
      function clearRing() { for (const b of grid.children) b.classList.remove("hint"); }
      function ring(ms) { clearRing(); const b = btn(expected()); if (!b) return; b.classList.add("hint"); setTimeout(() => b.classList.remove("hint"), ms / JN.TIME_SCALE); }
      function idleHint() {
        clearTimeout(idleT);
        if (mode !== "always") return;
        const my = token;
        idleT = setTimeout(() => { if (phase === "input" && my === token && alive) { ring(2000); autoHints++; } }, DATA.idleHintMs / JN.TIME_SCALE);
      }
      function tap(i) {
        if (phase !== "input") return;
        light(i, T.tapMs); clearTimeout(idleT); clearRing();
        if (i === expected()) { input++; paintDots(); if (input === seq.length) success(); else idleHint(); }
        else wrongTap();
      }
      function success() {
        phase = "wait"; roundNo++; best = Math.max(best, len);
        ctx.sound("ok");
        ctx.say(U.pick(TX("g.light.say.ok")));
        len++;
        const my = token;
        setTimeout(() => { if (my === token) nextRound(); }, T.afterOkMs / JN.TIME_SCALE);
      }
      function wrongTap() {
        mistakes++; fails++; phase = "wait";
        const my = token;
        if (fails === 1) { ctx.say(TX("g.light.say.again")); setTimeout(() => { if (my === token && alive) show(); }, T.retryMs / JN.TIME_SCALE); }
        else { roundNo++; ctx.say(TX("g.light.say.less")); len = Math.max(2, len - 1); setTimeout(() => { if (my === token) nextRound(); }, T.retryMs / JN.TIME_SCALE); }
      }
      function end() {
        phase = "end"; token++; clearTimeout(idleT);
        const time = ctx.timer.stop(), cleared = best >= st.start + DATA.stageUpGain;
        ctx.finish({ cleared, time, mistakes, hints, metrics: { best, order, rounds: roundNo, autoHints },
          title: best ? TX("g.light.title", { n: best }) : TX("g.light.title.zero"), line: TX("g.light.line", { order: ORDER[order] }),
          bestKey: order, bestValue: best, higherBetter: true });
      }
      ctx.hint(mode === "button", () => { if (phase !== "input") return; hints++; ring(DATA.hintButtonMs); });
      count = friendCount(len); renderGrid(); setEnabled(false);
      return {
        start() { ctx.timer.start(); nextRound(); },
        resize: layout,
        destroy() { alive = false; token++; clearTimeout(idleT); },
        test: { state: () => ({ phase, seq: seq.slice(), len, count, roundNo, best, input, order }), expected: () => expected() },
      };
    },
  });
})();
