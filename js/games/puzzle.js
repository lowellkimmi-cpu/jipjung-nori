/* 퍼즐 맞추기 — 그림 조각을 제자리에 놓아 그림을 완성해요 (생각·추리 방).
   원본 그림은 왼쪽 위에 늘 보이고, 조각은 4개 → 6개 → 9개로 단계마다 늘어요.
   그림은 spot.js 가 꺼내 둔 손그림풍 장면(JN.spotArt)을 그대로 다시 써요. 새 그림 파일·바깥 요청 없음.
   조각을 끌어다 놓거나, 조각을 누르고 빈 자리를 눌러도 돼요. 엉뚱한 자리에 놓아도 벌 없이 그냥 다시 해 볼 수 있어요. */
"use strict";
(function () {
  const U = JN.util, h = U.h, shuffle = U.shuffle, T = JN.t;   // T: 화면 글자는 lang/ko.js 에서
  const A = JN.spotArt;
  if (!A) { console.warn("퍼즐 맞추기: spot.js 를 먼저 불러와야 해요"); return; }
  const NS = "http://www.w3.org/2000/svg";
  const HINT_MS = 3500, DRAG_PX = 10;
  const STAGES = [
    { id: "p1", name: T("g.puzzle.p1"), cols: 2, rows: 2 },
    { id: "p2", name: T("g.puzzle.p2"), cols: 3, rows: 2 },
    { id: "p3", name: T("g.puzzle.p3"), cols: 3, rows: 3 },
  ];

  JN.registerGame({
    id: "퍼즐", stages: STAGES, stageLabel: (st) => st.name,
    hintHelp: { always: T("g.puzzle.hh.always"), button: T("g.puzzle.hh.button"), none: T("g.puzzle.hh.none") },
    parentNote: T("g.puzzle.parentNote"),
    chart: { key: "time", label: T("common.time"), unit: T("common.unit.sec") },
    describe: (e) => U.fmtTime(e.time) + T("g.puzzle.describe", { n: e.pieces || "" }) + (e.restarts ? T("g.puzzle.describe.restart", { n: e.restarts }) : "") + (e.hints ? T("g.number.describe.hint", { n: e.hints }) : ""),
    intro: (st) => T("g.puzzle.intro", { n: st.cols * st.rows }),
    mount(ctx) {
      const lv = ctx.stage, mode = ctx.settings.hintMode, board = ctx.board, mem = ctx.mem;
      const cols = lv.cols, rows = lv.rows, n = cols * rows;
      board.classList.add("pz-board");
      if (mode === "always") board.classList.add("always");

      /* 그림 한 장 (spot.js 의 장면을 처음 모습 그대로) */
      const sceneIdx = (mem.pscene | 0) % A.SCENES.length, scene = A.SCENES[sceneIdx];
      mem.pscene = (sceneIdx + 1) % A.SCENES.length;
      const items = scene.items.map(([type, x, y, s, c], i) => ({ id: i, type, x, y, s, c, flip: false }));
      const full = document.createElementNS(NS, "svg"); full.id = "pzFull"; full.setAttribute("viewBox", "0 0 400 300");
      A.renderScene(full, scene, items, "flat");
      const inner = full.innerHTML;
      function svgFor(vb, label) {
        const s = document.createElementNS(NS, "svg");
        s.setAttribute("viewBox", vb); s.setAttribute("preserveAspectRatio", "xMidYMid slice");
        if (label) s.setAttribute("aria-label", label); else s.setAttribute("aria-hidden", "true");
        s.innerHTML = inner; return s;
      }
      const cw = 400 / cols, ch = 300 / rows;
      const vbOf = (i) => [(i % cols) * cw, Math.floor(i / cols) * ch, cw, ch].map((v) => +v.toFixed(2)).join(" ");

      /* 화면 만들기: 왼쪽 위 = 원래 그림 + 그 옆에 조각 상자, 그 옆(또는 아래) = 맞출 판 */
      const ref = h("div", { class: "pz-ref" }, h("span", { class: "pz-ref-label", text: T("g.puzzle.ref") }));
      ref.appendChild(svgFor("0 0 400 300", T("g.puzzle.ref")));
      const tray = h("div", { class: "pz-top" }, ref);
      const grid = h("div", { class: "pz-grid", "aria-label": T("g.puzzle.grid.aria") });
      grid.style.gridTemplateColumns = "repeat(" + cols + ", 1fr)"; grid.style.gridTemplateRows = "repeat(" + rows + ", 1fr)";
      board.append(tray, grid);
      const cells = [], pieces = [];
      for (let i = 0; i < n; i++) {
        const c = h("div", { class: "pz-cell", "data-i": i, role: "button", "aria-label": T("g.puzzle.cell.aria", { n: i + 1 }) });
        c.appendChild(svgFor(vbOf(i)));
        grid.appendChild(c); cells.push(c);
      }
      for (let i = 0; i < n; i++) {
        const p = h("button", { type: "button", class: "pz-piece", "data-i": i, "aria-label": T("g.puzzle.piece.aria") });
        p.appendChild(svgFor(vbOf(i)));
        pieces.push(p);
      }
      const placed = new Array(n).fill(false);
      let sel = -1, wrong = 0, hints = 0, restarts = 0, done = false, active = false, hintTimer = 0, drag = null;

      function fillTray() {
        let order = shuffle([...Array(n).keys()]);
        if (order.every((v, k) => v === k)) order = order.reverse();   // 처음부터 맞춰진 순서로 나오지 않게
        pieces.forEach((p) => { if (p.parentNode) p.parentNode.removeChild(p); });
        order.forEach((i) => tray.appendChild(pieces[i]));
      }
      fillTray();

      const status = h("span", { class: "pz-count", text: "" });
      ctx.status(status);
      const paintCount = () => { status.textContent = T("g.puzzle.count", { a: placed.filter(Boolean).length, n }); };
      paintCount();
      const againBtn = h("button", { type: "button", class: "jn-btn", id: "pzAgain", text: T("g.puzzle.again") });
      ctx.bottom.appendChild(againBtn);

      function clearHint() { clearTimeout(hintTimer); pieces.forEach((p) => p.classList.remove("hint")); cells.forEach((c) => c.classList.remove("hint")); }
      function select(i) {
        pieces.forEach((p) => p.classList.remove("sel"));
        sel = i;
        if (i >= 0) pieces[i].classList.add("sel");
      }
      function place(i, cellIdx) {   // 조각 i 를 cellIdx 번째 자리에 놓기 (맞으면 붙고, 아니면 그대로 남아요)
        if (done || !active || placed[i] || placed[cellIdx]) return false;
        if (i !== cellIdx) {
          wrong++;   // 벌 없음: 기록에 '다른 자리에 놓아 봄'으로만 남고, 조각은 그대로예요
          const c = cells[cellIdx]; c.classList.add("nope"); setTimeout(() => c.classList.remove("nope"), 700);
          ctx.say(T("g.puzzle.say.nope"));
          return false;
        }
        placed[i] = true; clearHint(); select(-1);
        pieces[i].classList.add("placed"); cells[i].classList.add("done");
        ctx.sound("ok"); paintCount();
        if (placed.every(Boolean)) finish(); else ctx.say(placed.filter(Boolean).length === 1 ? T("g.puzzle.say.first") : T("g.puzzle.say.more"));
        return true;
      }
      function finish() {
        done = true; clearHint();
        const time = ctx.timer.stop();
        againBtn.disabled = true;
        ctx.say(T("g.puzzle.say.done"));
        ctx.later(() => ctx.finish({ cleared: true, time, mistakes: wrong, hints, metrics: { pieces: n, restarts }, title: T("g.puzzle.title"), line: T("g.puzzle.line", { n }), bestKey: lv.id, bestValue: U.r1(time) }), JN.ms(900));
      }

      /* 조각: 끌어다 놓기 · 누르면 고르기 */
      pieces.forEach((p, i) => {
        p.addEventListener("pointerdown", (e) => {
          if (!active || done || placed[i]) return;
          drag = { i, id: e.pointerId, x0: e.clientX, y0: e.clientY, moving: false, ghost: null };
          try { p.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
        });
        p.addEventListener("pointermove", (e) => {
          if (!drag || drag.i !== i || drag.id !== e.pointerId) return;
          if (!drag.moving && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > DRAG_PX) {
            drag.moving = true; select(i); p.classList.add("lifting");
            const r = p.getBoundingClientRect(), g = h("div", { class: "pz-drag" });
            g.style.width = r.width + "px"; g.style.height = r.height + "px"; g.appendChild(svgFor(vbOf(i)));
            document.body.appendChild(g); drag.ghost = g;
          }
          if (drag.moving && drag.ghost) { const g = drag.ghost; g.style.left = (e.clientX - parseFloat(g.style.width) / 2) + "px"; g.style.top = (e.clientY - parseFloat(g.style.height) / 2) + "px"; }
        });
        const end = (e, cancel) => {
          if (!drag || drag.i !== i || drag.id !== e.pointerId) return;
          const d = drag; drag = null;
          p.classList.remove("lifting");
          if (d.ghost) d.ghost.remove();
          if (cancel) return;
          if (d.moving) {
            const el = document.elementFromPoint(e.clientX, e.clientY), cell = el && el.closest ? el.closest(".pz-cell") : null;
            if (cell) place(i, +cell.dataset.i);
          } else select(sel === i ? -1 : i);   // 톡 누르면 고르기 / 한 번 더 누르면 풀기
        };
        p.addEventListener("pointerup", (e) => end(e, false));
        p.addEventListener("pointercancel", (e) => end(e, true));
        p.addEventListener("click", (e) => { if (e.detail === 0 && active && !done && !placed[i]) select(sel === i ? -1 : i); });   // 키보드(Enter·Space)
      });
      cells.forEach((c, k) => U.onTap(c, () => { if (sel >= 0) place(sel, k); else if (!placed[k] && active && !done) ctx.say(T("g.puzzle.say.pickfirst")); }));

      U.onTap(againBtn, () => {   // 다시 섞기: 놓은 조각을 모두 거두고 새로 섞어요 (벌 없음)
        if (done || !active) return;
        restarts++; clearHint(); select(-1);
        placed.fill(false);
        pieces.forEach((p) => p.classList.remove("placed", "sel"));
        cells.forEach((c) => c.classList.remove("done"));
        fillTray(); paintCount(); layout();
        ctx.say(T("g.puzzle.say.reshuffled"));
      });
      ctx.hint(mode === "button", () => {
        if (done || !active) return;
        const pick = tray.querySelector(".pz-piece:not(.placed)");   // 상자 맨 앞 조각 → 그 조각이 들어갈 자리를 알려 줘요
        const idx = pick ? +pick.dataset.i : -1;
        if (idx < 0) return;
        hints++; clearHint(); select(idx);
        pieces[idx].classList.add("hint"); cells[idx].classList.add("hint");
        hintTimer = setTimeout(clearHint, JN.ms(HINT_MS));
      });

      function layout() {
        const W = board.clientWidth - 16, H = board.clientHeight - 16;
        if (W < 60 || H < 60) return;
        const wide = W / H > 1.3, r = ch / cw;   // r = 조각 세로/가로
        board.classList.toggle("wide", wide);
        const minPw = Math.ceil(Math.max(56, 56 / r));   // 어느 조각이든 가로·세로 56px 이상
        let gw, left;
        if (wide) { gw = Math.floor(Math.min(H * 4 / 3, W * 0.6, 640)); left = W - gw - 12; }
        else { gw = Math.floor(Math.min(W, 640)); left = W; }
        /* 좁은 폰 세로(조각 상자 너비 360px 미만): 간격을 좁히고 원래 그림을 조금 줄여 조각이 한 줄에 4개 들어가게 → 맞출 판의 칸이 커져요 */
        const compact = !wide && left < 360;
        tray.style.gap = compact ? "4px" : "";
        const refW = compact ? 76 : Math.round(U.clamp(left * 0.24, 84, 150));
        ref.style.width = refW + "px";
        let pw = Math.round(U.clamp(gw / cols * 0.65, minPw, 100));
        const setPieces = () => pieces.forEach((p) => { p.style.width = pw + "px"; p.style.height = Math.ceil(pw * r) + "px"; });
        setPieces();
        tray.style.width = Math.floor(left) + "px";
        if (!wide) {
          let topH = tray.offsetHeight;
          /* 좁은 폰 세로: 맞출 판의 칸이 44px 보다 작아지면 조각을 (56px 까지) 줄여서 판에 자리를 내줘요 */
          const needH = Math.ceil(44 * rows + 8 + 3 * (rows - 1)), needW = Math.ceil(44 * cols + 8 + 3 * (cols - 1));
          while (pw > minPw && Math.min(gw, (H - topH - 10) * 4 / 3) < Math.max(needW, needH * 4 / 3)) {
            pw = Math.max(minPw, pw - 4); setPieces(); topH = tray.offsetHeight;
          }
          gw = Math.floor(Math.max(120, Math.min(gw, (H - topH - 10) * 4 / 3)));
        }
        grid.style.width = gw + "px"; grid.style.height = Math.round(gw * 0.75) + "px";
      }
      layout();
      return {
        start() { active = true; ctx.timer.start(); ctx.say(T("g.puzzle.say.begin")); },
        resize: layout,
        destroy() { active = false; done = true; clearHint(); if (drag && drag.ghost) drag.ghost.remove(); drag = null; },
        test: {
          state: () => ({ n, placed: placed.filter(Boolean).length, sel, done }),
          pieces: () => [...tray.querySelectorAll(".pz-piece:not(.placed)")].map((p) => +p.dataset.i),
        },
      };
    },
  });
})();
