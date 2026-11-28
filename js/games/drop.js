/* 이슬 방울 나르기 (그리기 놀이 방, 2026-11-28) — 잎맥 길을 따라 이슬 방울을 손가락으로 살살 옮겨 꽃까지 데려다줘요
   - 기획서 v3 12장 2차 후보 '길 따라 쓱쓱' 대신 새로 설계한 규칙: 길 가장자리에 닿으면 방울이 '쉼터 잎'(마지막으로 지난 곳)으로 굴러 돌아가요.
     선 긋기 미로(그은 선이 남음)와 달리 방울 하나를 잡고 옮기는 놀이라 손을 천천히 조절해야 해요.
   - 벌 없음: 방울이 돌아가도 점수·시간 벌칙 없음, 실패 화면 없음. 손을 떼면 방울은 그 자리에서 쉬어요.
   - 단계 6개: 넓은 길(쉼터 3) → 굽은 길 → 꼬불 길(쉼터 2) → 좁은 길(쉼터 1) → 좁은 꼬불 길 → 쉼터 없이.
   - 힌트 3가지: 늘 보기(가야 할 길 점선) / 힌트 버튼(3초) / 없이. 그림은 코드로만 그려요(새 캐릭터 없음).
   - 첫 판 손짓 도우미(2026-11-28): 이 놀이를 처음 하는 아이에게만, 가만히 있거나 두 번 막히면(방울 아닌 곳 잡기·가장자리 닿기) 손 그림이 방울을 가리켜요.
   - 꽃밭(수집, 보충 기획 3-2): 길 하나를 끝까지 옮길 때마다 꽃 한 송이가 정해진 순서대로 피어요(무작위 아님, 12송이).
     12송이가 다 피면 '완성 카드'로 끝이고 저절로 새로 시작하지 않아요. 새로 시작은 보호자 설정의 '꽃밭 비우기'에서만 해요.
     아이별로 이 기기 안에만 저장돼요 (바깥으로 보내지 않아요). 점수·순위 없음. */
"use strict";
(function () {
  const U = JN.util, h = U.h, T = JN.t;   // T: 화면 글자는 lang/ko.js 에서
  const STAGES = [
    { id: "w1", name: T("g.drop.s1"), courses: ["straight", "wave"], width: 140, cps: 3 },
    { id: "w2", name: T("g.drop.s2"), courses: ["wave", "zigzag"], width: 116, cps: 3 },
    { id: "w3", name: T("g.drop.s3"), courses: ["zigzag", "spiral"], width: 98, cps: 2 },
    { id: "w4", name: T("g.drop.s4"), courses: ["wave", "zigzag"], width: 82, cps: 1 },
    { id: "w5", name: T("g.drop.s5"), courses: ["spiral", "zigzag"], width: 74, cps: 1 },
    { id: "w6", name: T("g.drop.s6"), courses: ["wave", "spiral"], width: 70, cps: 0 },
  ];
  const STEP = 5, HINT_MS = 3000;
  /* 꽃밭 12송이 (정해진 순서): 기존 꽃 그림(Art.flower) 3가지 모양 × 색 4가지. 모양이 번갈아 바뀌어 색만으로 구별하지 않아요 */
  const BLOOM_MAX = 12, BLOOM_KINDS = ["동글꽃", "튤립", "해바라기"], BLOOM_COLORS = [null, "lilac", "apricot", "dustyblue"];
  const bloomSvg = (i) => Art.flower(BLOOM_KINDS[i % 3], { color: BLOOM_COLORS[Math.floor(i / 3) % 4] || undefined, label: "" });

  JN.registerGame({
    id: "이슬방울", stages: STAGES, desc: T("g.drop.desc"),
    hintHelp: { always: T("g.drop.hh.always"), button: T("g.drop.hh.button"), none: T("g.drop.hh.none") },
    parentNote: T("g.drop.parentNote"),
    /* 보호자 설정의 '꽃밭 비우기': 지우는 것은 이 아이의 꽃밭 꽃 수(mem.blooms)뿐이에요. 놀이 기록은 그대로 */
    memReset: { key: "blooms", max: BLOOM_MAX, label: T("g.drop.reset.label"), sub: T("g.drop.reset.sub"), button: T("g.drop.reset.btn"), confirm: T("g.drop.reset.confirm"), done: T("g.drop.reset.done"), nowKey: "g.drop.reset.now" },
    chart: { key: "time", label: T("common.time"), unit: T("common.unit.sec") },
    describe: (e) => U.fmtTime(e.time) + T("g.drop.describe", { n: e.mistakes || 0 }) + (e.hints ? T("g.number.describe.hint", { n: e.hints }) : ""),
    intro: () => T("g.drop.intro"),
    /* 작은 걸음: 걸음이 오를수록 길이 조금씩(최대 10%) 좁아져요 */
    tune: (st, f) => Object.assign(st, { width: Math.round(st.width * (1 - 0.1 * f)) }),
    mount(ctx) {
      const st = ctx.stage, mode = ctx.settings.hintMode, board = ctx.board, mem = ctx.mem;
      board.classList.add("mz-board", "dw-board");
      const total = st.courses.length, memKey = "course_" + st.id;
      let courseIdx = (mem[memKey] | 0) % total;
      const COL = { ink: JN.cssVar("--c-ink", "#2F3E46"), leaf: JN.cssVar("--c-primary-soft", "#6BAA75"), sky: JN.cssVar("--area-seeing", "#7FB7D9"),
        honey: JN.cssVar("--c-honey", "#F2C14E"), apricot: JN.cssVar("--c-gentle", "#F29E7E"), cream: JN.cssVar("--c-path", "#FCF7EC"), drop: "#8CC4E6" };
      const cv = h("canvas", { class: "mz-canvas dw-canvas", "aria-label": T("g.drop.canvas.aria") }), c2 = cv.getContext("2d");
      board.appendChild(cv);
      let LW = 1000, LH = 700, portrait = false, path = [], pw = st.width, cps = [], prog = 0, maxProg = 0, drawing = false, last = null, finger = null;
      let done = true, started = false, mistakes = 0, hints = 0, guideUntil = 0, raf = 0, spill = null, spills = 0;
      const dropR = () => pw * 0.27;

      /* 꽃밭 (아래 줄 옆 상태 칸) */
      const bloomsNow = () => Math.min(BLOOM_MAX, mem.blooms | 0);
      let bloomGot = 0, completed = false;
      const gardenTxt = h("span", { text: T("g.drop.garden", { n: bloomsNow(), max: BLOOM_MAX }) });
      const gardenIcon = h("i", { class: "fl", "aria-hidden": "true", svg: bloomSvg(Math.max(0, bloomsNow() - 1)) });
      ctx.status(h("span", { class: "dw-garden" }, gardenIcon, gardenTxt));
      function growBloom() {   // 꽃이 한 송이 피어요 (12송이가 다 피었으면 그대로)
        const n = bloomsNow();
        if (n >= BLOOM_MAX) return false;
        mem.blooms = n + 1; ctx.saveMem(); bloomGot++; if (n + 1 >= BLOOM_MAX) completed = true;
        gardenIcon.innerHTML = bloomSvg(n); gardenTxt.textContent = T("g.drop.garden", { n: n + 1, max: BLOOM_MAX });
        gardenIcon.classList.add("pop"); ctx.later(() => gardenIcon.classList.remove("pop"), 900);
        return true;
      }
      /* 첫 판 손짓 도우미: 방울을 안 잡고 있을 때만 손이 방울을 가리켜요 (캔버스 위 방울 자리를 화면 좌표로 바꿔 알려 줘요) */
      const dropTarget = {
        getBoundingClientRect() {
          const r = cv.getBoundingClientRect(), [x, y] = path[prog] || [0, 0], sx = r.width / LW, sy = r.height / LH, rr = dropR() * 1.2;
          return { left: r.left + (x - rr) * sx, top: r.top + (y - rr) * sy, width: rr * 2 * sx, height: rr * 2 * sy };
        },
      };
      const nudge = U.nudge(ctx, () => (!done && !drawing && path.length ? dropTarget : null));

      function layout() {
        const w = Math.max(200, board.clientWidth - 16), hh = Math.max(200, board.clientHeight - 16);
        const wantP = hh > w * 1.1, changed = wantP !== portrait;
        portrait = wantP; LW = portrait ? 700 : 1000; LH = portrait ? 1000 : 700;
        const sc = Math.min(w / LW, hh / LH), cssW = Math.floor(LW * sc), cssH = Math.floor(LH * sc), dpr = window.devicePixelRatio || 1;
        cv.style.width = cssW + "px"; cv.style.height = cssH + "px";
        cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
        c2.setTransform(cv.width / LW, 0, 0, cv.height / LH, 0, 0);
        return changed;
      }
      function densify(pts) {
        const out = [pts[0]];
        for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / STEP)); for (let k = 1; k <= n; k++) out.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]); }
        return out;
      }
      function buildPath() {
        pw = st.width;
        const shape = st.courses[courseIdx], A = portrait ? LH : LW, B = portrait ? LW : LH, m = pw / 2 + 40, uv = (u, v) => (portrait ? [v, u] : [u, v]);
        let raw = [];
        if (shape === "straight") { for (let i = 0; i <= 60; i++) { const t = i / 60; raw.push(uv(m + (A - 2 * m) * t, B / 2 + (B / 2 - m) * 0.25 * Math.sin(Math.PI * t))); } }
        else if (shape === "zigzag") { const k = 4, amp = (B / 2 - m) * 0.9; for (let i = 0; i <= k; i++) raw.push(uv(m + (A - 2 * m) * i / k, B / 2 + (i % 2 ? amp : -amp))); }
        else if (shape === "wave") { const amp = (B / 2 - m) * 0.8; for (let i = 0; i <= 240; i++) { const t = i / 240; raw.push(uv(m + (A - 2 * m) * t, B / 2 + amp * Math.sin(Math.PI * 3 * t))); } }
        else { const cx = LW / 2, cy = LH / 2, R = Math.min(LW, LH) / 2 - m, gap = pw * 1.55, rMin = pw * 0.95, TT = (R - rMin) / gap * Math.PI * 2;
          for (let th = 0; th <= TT; th += 0.02) { const r = R - gap * th / (Math.PI * 2); raw.push([cx + r * Math.cos(th - Math.PI / 2), cy + r * Math.sin(th - Math.PI / 2)]); } }
        path = densify(raw); prog = 0; maxProg = 0; last = null; finger = null; spill = null;
        cps = [0]; for (let k = 1; k <= st.cps; k++) cps.push(Math.round((path.length - 1) * k / (st.cps + 1)));
      }
      const restIdx = () => { let r = 0; for (const c of cps) if (c <= maxProg) r = c; return r; };
      function nearest(x, y, from, to) {
        let bi = -1, bd = Infinity;
        for (let i = Math.max(0, from); i <= Math.min(path.length - 1, to); i++) { const dx = path[i][0] - x, dy = path[i][1] - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = i; } }
        return [bi, Math.sqrt(bd)];
      }
      const win_ = () => [prog - Math.ceil(pw / STEP), prog + Math.ceil(pw * 0.9 / STEP)];
      const guideOn = () => mode === "always" || (mode === "button" && performance.now() < guideUntil);

      function draw() { cancelAnimationFrame(raf); raf = requestAnimationFrame(paint); }
      function poly(pts, width, color, alpha, dash) {
        if (pts.length < 2) return;
        c2.save(); c2.globalAlpha = alpha == null ? 1 : alpha; c2.strokeStyle = color; c2.lineWidth = width; c2.lineCap = "round"; c2.lineJoin = "round";
        if (dash) c2.setLineDash(dash);
        c2.beginPath(); c2.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c2.lineTo(pts[i][0], pts[i][1]); c2.stroke(); c2.restore();
      }
      function circle(x, y, r, fill, stroke, lw) { c2.beginPath(); c2.arc(x, y, r, 0, Math.PI * 2); if (fill) { c2.fillStyle = fill; c2.fill(); } if (stroke) { c2.strokeStyle = stroke; c2.lineWidth = lw || 4; c2.stroke(); } }
      function leafPad(x, y, r, a) {   // 쉼터 잎 (작은 잎 모양)
        c2.save(); c2.translate(x, y); c2.rotate(a || -0.5);
        c2.beginPath(); c2.moveTo(-r, 0); c2.quadraticCurveTo(0, -r * 0.8, r, 0); c2.quadraticCurveTo(0, r * 0.8, -r, 0); c2.closePath();
        c2.fillStyle = COL.leaf; c2.globalAlpha = 0.55; c2.fill(); c2.globalAlpha = 1; c2.strokeStyle = COL.ink; c2.lineWidth = 3; c2.stroke();
        c2.beginPath(); c2.moveTo(-r * 0.8, 0); c2.lineTo(r * 0.8, 0); c2.lineWidth = 2; c2.stroke(); c2.restore();
      }
      function flower(x, y, r, open) {   // 목마른 꽃 (방울이 닿으면 활짝)
        c2.save(); c2.translate(x, y);
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c2.beginPath(); c2.ellipse(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * (open ? 0.5 : 0.4), r * 0.3, a, 0, Math.PI * 2);
          c2.fillStyle = COL.apricot; c2.fill(); c2.strokeStyle = COL.ink; c2.lineWidth = 3; c2.stroke(); }
        circle(0, 0, r * 0.32, COL.honey, COL.ink, 3); c2.restore();
      }
      function dropAt(x, y, r, alpha) {   // 이슬 방울: 위가 뾰족한 물방울 + 반짝
        c2.save(); c2.globalAlpha = alpha == null ? 1 : alpha; c2.translate(x, y);
        c2.beginPath(); c2.moveTo(0, -r * 1.35); c2.bezierCurveTo(r * 0.6, -r * 0.6, r, -r * 0.1, r, r * 0.25); c2.arc(0, r * 0.25, r, 0, Math.PI); c2.bezierCurveTo(-r, -r * 0.1, -r * 0.6, -r * 0.6, 0, -r * 1.35); c2.closePath();
        c2.fillStyle = COL.drop; c2.fill(); c2.strokeStyle = COL.ink; c2.lineWidth = 3.5; c2.stroke();
        c2.beginPath(); c2.ellipse(-r * 0.35, -r * 0.05, r * 0.16, r * 0.3, 0.4, 0, Math.PI * 2); c2.fillStyle = "#FFFFFF"; c2.globalAlpha *= 0.85; c2.fill();
        c2.restore();
      }
      const dropPos = () => (drawing && finger ? finger : path[prog]);
      function paint() {
        c2.clearRect(0, 0, LW, LH);
        poly(path, pw + 12, COL.leaf, 0.75); poly(path, pw, COL.cream, 1);
        poly(path, 3, COL.leaf, 0.35, [10, 14]);   // 잎맥 무늬
        if (guideOn() && !done) poly(path.slice(prog), 7, COL.sky, 1, [2, 16]);
        cps.forEach((c, i) => { const [x, y] = path[c]; leafPad(x, y, pw * (i === 0 ? 0.42 : 0.3), i % 2 ? 0.6 : -0.6); });
        const [ex, ey] = path[path.length - 1]; flower(ex, ey, pw * 0.48, done && prog >= path.length - 4);
        if (spill && performance.now() < spill.until) { dropAt(spill.x, spill.y, dropR() * 0.8, 0.3); draw(); }
        const [dx, dy] = dropPos();
        if (!done && !drawing && (guideOn() || prog === 0)) circle(dx, dy, dropR() * 1.7, null, COL.honey, 6);
        if (!(done && prog >= path.length - 4)) dropAt(dx, dy, dropR());
      }
      const toLogical = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * LW / r.width, (e.clientY - r.top) * LH / r.height]; };
      cv.addEventListener("pointerdown", (e) => {
        if (done) return;
        e.preventDefault();
        const p = toLogical(e), [dx, dy] = path[prog];
        if (Math.hypot(p[0] - dx, p[1] - dy) > Math.max(dropR() * 1.9, 46)) { ctx.say(T("g.drop.say.grab")); nudge.wrong(); draw(); return; }
        nudge.hide();
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
        if (!started) { started = true; ctx.timer.start(); }
        drawing = true; last = p; finger = p; draw();
      });
      cv.addEventListener("pointermove", (e) => {
        if (!drawing || done) return;
        e.preventDefault();
        const p = toLogical(e), n = Math.max(1, Math.ceil(Math.hypot(p[0] - last[0], p[1] - last[1]) / (STEP * 1.5)));
        for (let k = 1; k <= n && drawing && !done; k++) step([last[0] + (p[0] - last[0]) * k / n, last[1] + (p[1] - last[1]) * k / n]);
        last = p; draw();
      });
      const endDrag = () => { if (!drawing) return; drawing = false; finger = null; if (!done && prog > 0) ctx.say(T("g.drop.say.rest")); nudge.arm(); draw(); };
      cv.addEventListener("pointerup", endDrag); cv.addEventListener("pointercancel", endDrag);
      function step(q) {
        const [lo, hi] = win_(), [i, d] = nearest(q[0], q[1], lo, hi);
        if (d > pw / 2 - dropR() * 0.2) {   // 가장자리에 닿음 → 방울이 쉼터로 굴러 돌아가요 (벌 없음)
          mistakes++; spills++;
          spill = { x: q[0], y: q[1], until: performance.now() + 700 };
          drawing = false; finger = null; prog = restIdx();
          ctx.say(prog > 0 ? T("g.drop.say.spillRest") : T("g.drop.say.spillStart"));
          nudge.wrong();
          return;
        }
        prog = i; maxProg = Math.max(maxProg, i); finger = q;
        if (prog >= path.length - 1 - Math.ceil(12 / STEP)) win();
      }
      function win() {
        done = true; drawing = false; finger = null; prog = path.length - 1; nudge.stop();
        const time = ctx.timer.stop(), lastCourse = courseIdx + 1 >= total;
        mem[memKey] = lastCourse ? 0 : courseIdx + 1;
        const grew = growBloom(), n = bloomsNow();
        draw();
        const fin = () => ctx.finish({ cleared: true, advance: lastCourse, time, mistakes, hints, metrics: { course: st.courses[courseIdx] },
          title: T("g.drop.title"), line: (spills ? T("g.drop.line.slow") : T("g.drop.line.clean")) +
            T(completed ? "g.drop.line.full" : grew ? "g.drop.line.bloom" : "g.drop.line.again", { n }) + (lastCourse ? "" : T("g.drop.line.more")),
          bestKey: st.id + ":" + st.courses[courseIdx], bestValue: U.r1(time) });
        if (completed) ctx.later(() => showDone(fin), Math.max(JN.ms(900), 40)); else fin();
      }
      /* 꽃밭 완성 카드: 꽃 12송이를 정해진 순서대로 세운 그림 + 따뜻한 말. '고마워요' 단추 하나. 저절로 새로 시작하지 않아요 */
      let doneCard = null;
      function showDone(next) {
        if (!ctx.alive()) return;
        const row = h("div", { class: "dw-doneflowers", "aria-hidden": "true" });
        for (let i = 0; i < BLOOM_MAX; i++) row.appendChild(h("span", { svg: bloomSvg(i) }));
        const ok = h("button", { type: "button", class: "jn-btn jn-btn--big", id: "dwDoneOk" }, T("g.drop.done.ok"));
        doneCard = h("div", { class: "dw-done", id: "dwDone", role: "group", "aria-label": T("g.drop.done.title") },
          h("div", { class: "dw-donecard" }, h("h2", { text: T("g.drop.done.title") }), row, h("p", { text: T("g.drop.done.body") }), ok));
        board.appendChild(doneCard);
        U.onTap(ok, () => { if (doneCard && doneCard.isConnected) { doneCard.remove(); doneCard = null; next(); } });
        ctx.say(T("g.drop.done.say"));
        try { ok.focus({ preventScroll: true }); } catch (e) { /* 포커스는 없어도 돼요 */ }
      }
      ctx.hint(mode === "button", () => { if (done) return; hints++; guideUntil = performance.now() + HINT_MS; ctx.later(draw, HINT_MS + 30); draw(); });
      layout(); buildPath(); draw();
      return {
        start() { done = false; ctx.say(T("g.drop.say.begin") + " (" + (courseIdx + 1) + "/" + total + ")"); nudge.arm(); draw(); },
        resize() { const ch = layout(); if (ch && !done) buildPath(); draw(); },
        destroy() { done = true; cancelAnimationFrame(raf); nudge.stop(); },
        test: {
          state: () => ({ courseIdx, done, prog, maxProg, rest: restIdx(), cps: cps.slice(), pathLen: path.length, pw, mistakes, drawing, LW, LH,
            blooms: bloomsNow(), bloomGot, completed, card: !!(doneCard && doneCard.isConnected), nudgeShown: nudge.shown(), nudgeVisible: nudge.visible(),
            path: path.filter((_, i) => i % 3 === 0 || i === path.length - 1), full: path.length }),
          point: (i) => path[Math.max(0, Math.min(path.length - 1, i))],
          toClient: (x, y) => { const r = cv.getBoundingClientRect(); return [r.left + x * r.width / LW, r.top + y * r.height / LH]; },
        },
      };
    },
  });
})();
