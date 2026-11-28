/* 선 긋기 미로 (옛 '길 따라 선 긋기 · 미로') — 넓은 길 따라 선 긋기 → 미로 */
"use strict";
(function () {
  const U = JN.util, h = U.h, T = JN.t;   // T: 화면 글자는 lang/ko.js 에서
  const DATA = {
    stages: [
      { id: "line1", name: T("g.maze.line1"), kind: "line", courses: ["straight", "zigzag"], width: 124 },
      { id: "line2", name: T("g.maze.line2"), kind: "line", courses: ["zigzag", "wave"], width: 100 },
      { id: "line3", name: T("g.maze.line3"), kind: "line", courses: ["wave", "spiral"], width: 80 },
      { id: "maze5", name: T("g.maze.maze", { n: 5 }), kind: "maze", size: 5, count: 2 },
      { id: "maze7", name: T("g.maze.maze", { n: 7 }), kind: "maze", size: 7, count: 2 },
      { id: "maze9", name: T("g.maze.maze", { n: 9 }), kind: "maze", size: 9, count: 2 },
      { id: "maze11", name: T("g.maze.maze", { n: 11 }), kind: "maze", size: 11, count: 2 },
    ],
    courseNames: { straight: T("g.maze.course.straight"), zigzag: T("g.maze.course.zigzag"), wave: T("g.maze.course.wave"), spiral: T("g.maze.course.spiral") },
    hintButtonMs: 3000, mazeHintCells: 3,
  };
  const STEP = 5, M = 24;

  function genMaze(n) {
    const R = [], D = [], vis = [];
    for (let y = 0; y < n; y++) { R.push(Array(n).fill(true)); D.push(Array(n).fill(true)); vis.push(Array(n).fill(false)); }
    const stack = [[0, 0]]; vis[0][0] = true;
    while (stack.length) {
      const [x, y] = stack[stack.length - 1], nb = [];
      if (x > 0 && !vis[y][x - 1]) nb.push([x - 1, y]);
      if (x < n - 1 && !vis[y][x + 1]) nb.push([x + 1, y]);
      if (y > 0 && !vis[y - 1][x]) nb.push([x, y - 1]);
      if (y < n - 1 && !vis[y + 1][x]) nb.push([x, y + 1]);
      if (!nb.length) { stack.pop(); continue; }
      const [nx, ny] = U.pick(nb);
      if (nx > x) R[y][x] = false; else if (nx < x) R[y][nx] = false; else if (ny > y) D[y][x] = false; else D[ny][x] = false;
      vis[ny][nx] = true; stack.push([nx, ny]);
    }
    return { n, R, D };
  }
  function canMove(m, x, y, nx, ny) {
    if (nx < 0 || ny < 0 || nx >= m.n || ny >= m.n) return false;
    if (ny === y && nx === x + 1) return !m.R[y][x];
    if (ny === y && nx === x - 1) return !m.R[y][nx];
    if (nx === x && ny === y + 1) return !m.D[y][x];
    if (nx === x && ny === y - 1) return !m.D[ny][x];
    return false;
  }
  function solve(m, sx, sy) {
    const n = m.n, prev = new Map(), key = (x, y) => y * n + x, q = [[sx, sy]];
    prev.set(key(sx, sy), null);
    while (q.length) {
      const [x, y] = q.shift();
      if (x === n - 1 && y === n - 1) break;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (canMove(m, x, y, nx, ny) && !prev.has(key(nx, ny))) { prev.set(key(nx, ny), [x, y]); q.push([nx, ny]); } }
    }
    if (!prev.has(key(n - 1, n - 1))) return null;
    const out = []; let c = [n - 1, n - 1];
    while (c) { out.unshift(c); c = prev.get(key(c[0], c[1])); }
    return out;
  }

  JN.registerGame({
    id: "선긋기미로", stages: DATA.stages,
    hintHelp: { always: T("g.maze.hh.always"), button: T("g.maze.hh.button"), none: T("g.maze.hh.none") },
    parentNote: T("g.maze.parentNote"),
    chart: { key: "time", label: T("common.time"), unit: T("common.unit.sec") },
    describe: (e) => U.fmtTime(e.time) + T(e.kind === "maze" ? "g.maze.describe.maze" : "g.maze.describe.line", { n: e.mistakes || 0 }) + (e.course ? " · " + DATA.courseNames[e.course] : ""),
    intro: (st) => st.kind === "line" ? T("g.maze.intro.line") : T("g.maze.intro.maze"),
    mount(ctx) {
      const st = ctx.stage, mode = ctx.settings.hintMode, board = ctx.board, mem = ctx.mem, kind = st.kind;
      board.classList.add("mz-board");
      const total = kind === "line" ? st.courses.length : st.count;
      const memKey = "course_" + st.id;
      let courseIdx = (mem[memKey] | 0) % total;
      const COL = { ink: JN.cssVar("--c-ink", "#2F3E46"), green: JN.cssVar("--c-primary-soft", "#6BAA75"), sky: JN.cssVar("--area-seeing", "#7FB7D9"), honey: JN.cssVar("--c-honey", "#F2C14E"),
        apricot: JN.cssVar("--c-gentle", "#F29E7E"), cream: JN.cssVar("--c-path", "#FCF7EC"), kid: JN.cssVar("--c-kid-line-2", "#8AA6BD") };
      let wallCache = null;   // 미로 벽(연필 선)은 한 번만 그려 두고 다시 써요
      const cv = h("canvas", { class: "mz-canvas", "aria-label": T("g.maze.canvas.aria") }), c2 = cv.getContext("2d");
      board.appendChild(cv);
      const dogImg = U.svgImg(Art.profile("강아지", { color: Art.COLORS.apricot }));
      dogImg.onload = () => draw();
      let LW = 1000, LH = 700, portrait = false, path = [], pw = 100, prog = 0, runs = [], drawing = false, last = null, off = false;
      let mz = null, cellSz = 0, route = [], finger = null, done = true, started = false, mistakes = 0, hints = 0, guideUntil = 0, raf = 0;
      const courseName = () => kind === "line" ? DATA.courseNames[st.courses[courseIdx]] : st.name;

      function layout() {
        const w = Math.max(200, board.clientWidth - 16), hh = Math.max(200, board.clientHeight - 16);
        const wantP = hh > w * 1.1, changed = kind === "line" && wantP !== portrait;
        portrait = wantP;
        if (kind === "maze") { LW = 1000; LH = 1000; } else { LW = portrait ? 700 : 1000; LH = portrait ? 1000 : 700; }
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
      function buildLine() {
        pw = st.width;
        const shape = st.courses[courseIdx], A = portrait ? LH : LW, B = portrait ? LW : LH, m = pw / 2 + 34, uv = (u, v) => (portrait ? [v, u] : [u, v]);
        let raw = [];
        if (shape === "straight") raw = [uv(m, B / 2), uv(A - m, B / 2)];
        else if (shape === "zigzag") { const k = 4, amp = (B / 2 - m) * 0.92; for (let i = 0; i <= k; i++) raw.push(uv(m + (A - 2 * m) * i / k, B / 2 + (i % 2 ? amp : -amp))); }
        else if (shape === "wave") { const amp = (B / 2 - m) * 0.8; for (let i = 0; i <= 240; i++) { const t = i / 240; raw.push(uv(m + (A - 2 * m) * t, B / 2 + amp * Math.sin(Math.PI * 4 * t))); } }
        else { const cx = LW / 2, cy = LH / 2, R = Math.min(LW, LH) / 2 - m, gap = pw * 1.6, rMin = pw * 0.95, TT = (R - rMin) / gap * Math.PI * 2;
          for (let th = 0; th <= TT; th += 0.02) { const r = R - gap * th / (Math.PI * 2); raw.push([cx + r * Math.cos(th - Math.PI / 2), cy + r * Math.sin(th - Math.PI / 2)]); } }
        path = densify(raw); prog = 0; runs = []; off = false; last = null;
      }
      function nearest(x, y, from, to) {
        let bi = -1, bd = Infinity;
        for (let i = Math.max(0, from); i <= Math.min(path.length - 1, to); i++) { const dx = path[i][0] - x, dy = path[i][1] - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = i; } }
        return [bi, Math.sqrt(bd)];
      }
      const lineWindow = () => [prog - Math.ceil(pw / STEP), prog + Math.ceil(pw * 0.9 / STEP)];
      function buildMaze() { mz = genMaze(st.size); cellSz = (1000 - 2 * M) / mz.n; route = [[0, 0]]; finger = null; }
      const cellCenter = (c) => [M + (c[0] + 0.5) * cellSz, M + (c[1] + 0.5) * cellSz];
      function cellAt(x, y) { const cx = Math.floor((x - M) / cellSz), cy = Math.floor((y - M) / cellSz); return cx < 0 || cy < 0 || cx >= mz.n || cy >= mz.n ? null : [cx, cy]; }
      const same = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];
      const guideOn = () => mode === "always" || (mode === "button" && performance.now() < guideUntil);

      function draw() { cancelAnimationFrame(raf); raf = requestAnimationFrame(paint); }
      function poly(pts, width, color, alpha, dash) {
        if (pts.length < 2) return;
        c2.save(); c2.globalAlpha = alpha == null ? 1 : alpha; c2.strokeStyle = color; c2.lineWidth = width; c2.lineCap = "round"; c2.lineJoin = "round";
        if (dash) c2.setLineDash(dash);
        c2.beginPath(); c2.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c2.lineTo(pts[i][0], pts[i][1]); c2.stroke(); c2.restore();
      }
      function circle(x, y, r, fill, stroke, lw) { c2.beginPath(); c2.arc(x, y, r, 0, Math.PI * 2); if (fill) { c2.fillStyle = fill; c2.fill(); } if (stroke) { c2.strokeStyle = stroke; c2.lineWidth = lw || 4; c2.stroke(); } }
      function star(x, y, r) {
        c2.beginPath();
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.48 : r; c2.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); }
        c2.closePath(); c2.fillStyle = COL.honey; c2.fill(); c2.strokeStyle = COL.ink; c2.lineWidth = 4; c2.stroke();
      }
      function paint() {
        c2.clearRect(0, 0, LW, LH);
        if (kind === "line") {
          poly(path, pw + 10, COL.sky, 0.9); poly(path, pw, COL.cream, 1);
          if (guideOn() && !done) poly(path.slice(prog), 6, COL.sky, 1, [2, 16]);
          const [sx, sy] = path[0], [ex, ey] = path[path.length - 1];
          circle(sx, sy, pw * 0.36, COL.green, COL.ink, 4); star(ex, ey, pw * 0.42);
          for (const r of runs) JN.brush(c2, r.pts, Math.max(12, pw * 0.3), COL.kid, r.ok ? 1 : 0.28);   // 아이가 그은 선 = 붓 느낌
          if (!done && prog > 0 && (!drawing || off)) { const [px, py] = path[prog]; circle(px, py, pw * 0.3, null, COL.honey, 7); }
        } else {
          const n = mz.n, wt = Math.max(6, cellSz * 0.12);
          c2.fillStyle = COL.cream; c2.fillRect(M, M, n * cellSz, n * cellSz);
          c2.save(); c2.globalAlpha = 0.35; c2.fillStyle = COL.green; c2.fillRect(M, M, cellSz, cellSz); c2.fillStyle = COL.honey; c2.fillRect(M + (n - 1) * cellSz, M + (n - 1) * cellSz, cellSz, cellSz); c2.restore();
          if (guideOn() && !done) { const sol = solve(mz, route[route.length - 1][0], route[route.length - 1][1]); if (sol) for (const c of sol.slice(1, 1 + DATA.mazeHintCells)) { const [x, y] = cellCenter(c); circle(x, y, cellSz * 0.12, COL.sky); } }
          const pts = route.map(cellCenter); if (finger && drawing) pts.push(finger);
          JN.brush(c2, pts, Math.max(10, cellSz * 0.3), COL.kid);
          c2.drawImage(walls(wt), 0, 0, 1000, 1000);
          const [hx, hy] = cellCenter([n - 1, n - 1]); house(hx, hy, cellSz * 0.78);
          const end = pts.length ? pts[pts.length - 1] : cellCenter([0, 0]), ds = cellSz * 0.72;
          if (dogImg.complete && dogImg.naturalWidth) c2.drawImage(dogImg, end[0] - ds / 2, end[1] - ds / 2, ds, ds); else circle(end[0], end[1], ds * 0.36, COL.apricot, COL.ink, 3);
        }
      }
      /* 미로 벽: rough.js 연필 선 (seed 고정). rough 가 없으면 반듯한 선 */
      function walls(wt) {
        if (wallCache && wallCache.mz === mz) return wallCache.cv;
        const oc = document.createElement("canvas"); oc.width = oc.height = 1000;
        const o = oc.getContext("2d"), n = mz.n, segs = [[M, M, M + n * cellSz, M], [M + n * cellSz, M, M + n * cellSz, M + n * cellSz], [M, M + n * cellSz, M + n * cellSz, M + n * cellSz], [M, M, M, M + n * cellSz]];
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
          const x0 = M + x * cellSz, y0 = M + y * cellSz;
          if (x < n - 1 && mz.R[y][x]) segs.push([x0 + cellSz, y0, x0 + cellSz, y0 + cellSz]);
          if (y < n - 1 && mz.D[y][x]) segs.push([x0, y0 + cellSz, x0 + cellSz, y0 + cellSz]);
        }
        const rc = window.rough ? window.rough.canvas(oc) : null;
        if (rc) for (const [a, b, c, d] of segs) rc.line(a, b, c, d, { stroke: COL.ink, strokeWidth: wt * 0.8, roughness: 1.1, bowing: .8, seed: 11 });
        else { o.strokeStyle = COL.ink; o.lineWidth = wt; o.lineCap = "round"; o.beginPath(); for (const [a, b, c, d] of segs) { o.moveTo(a, b); o.lineTo(c, d); } o.stroke(); }
        wallCache = { mz, cv: oc };
        return oc;
      }
      function house(x, y, s) {
        const w = s * 0.7, hh = s * 0.42;
        c2.save(); c2.lineWidth = Math.max(2, s * 0.05); c2.strokeStyle = COL.ink; c2.lineJoin = "round";
        c2.fillStyle = COL.honey; c2.fillRect(x - w / 2, y - hh * 0.15, w, hh); c2.strokeRect(x - w / 2, y - hh * 0.15, w, hh);
        c2.fillStyle = COL.apricot; c2.beginPath(); c2.moveTo(x - w * 0.62, y - hh * 0.1); c2.lineTo(x, y - s * 0.45); c2.lineTo(x + w * 0.62, y - hh * 0.1); c2.closePath(); c2.fill(); c2.stroke();
        c2.restore();
      }
      const toLogical = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * LW / r.width, (e.clientY - r.top) * LH / r.height]; };
      cv.addEventListener("pointerdown", (e) => {
        if (done) return;
        e.preventDefault();
        const p = toLogical(e);
        if (kind === "line") {
          const [lo, hi] = lineWindow(), [, d] = nearest(p[0], p[1], lo, hi);
          if (d > pw / 2 + 14) { ctx.say(prog === 0 ? T("g.maze.say.start") : T("g.maze.say.continue")); draw(); return; }
          runs.push({ ok: true, pts: [p] }); off = false;
        } else {
          const c = cellAt(p[0], p[1]); let idx = -1;
          if (c) for (let i = route.length - 1; i >= 0; i--) if (same(route[i], c)) { idx = i; break; }
          if (idx < 0) { ctx.say(route.length > 1 ? T("g.maze.say.fromdog") : T("g.maze.say.tapdog")); return; }
          route.length = idx + 1; finger = p;
        }
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
        if (!started) { started = true; ctx.timer.start(); }
        drawing = true; last = p; draw();
      });
      cv.addEventListener("pointermove", (e) => {
        if (!drawing || done) return;
        e.preventDefault();
        const p = toLogical(e), dist = Math.hypot(p[0] - last[0], p[1] - last[1]);
        const n = Math.max(1, Math.ceil(dist / (kind === "line" ? STEP * 1.5 : cellSz / 5)));
        for (let k = 1; k <= n && !done; k++) { const q = [last[0] + (p[0] - last[0]) * k / n, last[1] + (p[1] - last[1]) * k / n]; if (kind === "line") lineStep(q); else mazeStep(q); }
        last = p; draw();
      });
      const endStroke = () => { if (!drawing) return; drawing = false; if (!done && kind === "line" && prog > 0) ctx.say(T("g.maze.say.resume")); draw(); };
      cv.addEventListener("pointerup", endStroke); cv.addEventListener("pointercancel", endStroke);
      function lineStep(q) {
        const [lo, hi] = lineWindow(), [i, d] = nearest(q[0], q[1], lo, hi), ok = d <= pw / 2;
        if (ok) prog = Math.max(prog, i);
        if (!ok && !off) { mistakes++; ctx.say(T("g.maze.say.back")); }
        if (ok && off) ctx.say(T("g.maze.say.go"));
        off = !ok;
        const cur = runs[runs.length - 1];
        if (cur.ok === ok) cur.pts.push(q); else runs.push({ ok, pts: [cur.pts[cur.pts.length - 1], q] });
        if (prog >= path.length - 1 - Math.ceil(12 / STEP)) win();
      }
      function mazeStep(q) {
        const cur = route[route.length - 1], c = cellAt(q[0], q[1]);
        if (c && !same(c, cur)) {
          const prev = route[route.length - 2];
          if (prev && same(c, prev)) route.pop();
          else if (canMove(mz, cur[0], cur[1], c[0], c[1])) { route.push(c); if (c[0] === mz.n - 1 && c[1] === mz.n - 1) { finger = null; win(); return; } }
          else if (Math.abs(c[0] - cur[0]) + Math.abs(c[1] - cur[1]) === 1) {
            if (!finger || !finger.blocked) { mistakes++; ctx.say(T("g.maze.say.wall")); }
            finger = clampToCell(q, route[route.length - 1]); finger.blocked = true; return;
          }
        }
        finger = clampToCell(q, route[route.length - 1]);
      }
      function clampToCell(q, c) { const p = cellSz * 0.3, x0 = M + c[0] * cellSz, y0 = M + c[1] * cellSz; return [Math.min(x0 + cellSz - p, Math.max(x0 + p, q[0])), Math.min(y0 + cellSz - p, Math.max(y0 + p, q[1]))]; }
      function win() {
        done = true; drawing = false;
        const time = ctx.timer.stop(), lastCourse = courseIdx + 1 >= total;
        mem[memKey] = lastCourse ? 0 : courseIdx + 1;
        draw();
        const metrics = { kind }; if (kind === "line") metrics.course = st.courses[courseIdx];
        ctx.finish({ cleared: true, advance: lastCourse, time, mistakes, hints, metrics,
          title: kind === "line" ? T("g.maze.title.line") : T("g.maze.title.maze"), line: courseName() + (lastCourse ? "" : T("g.maze.line.more")),
          bestKey: st.id + (kind === "line" ? ":" + st.courses[courseIdx] : ""), bestValue: U.r1(time) });
      }
      ctx.hint(mode === "button", () => { if (done) return; hints++; guideUntil = performance.now() + DATA.hintButtonMs; ctx.later(draw, DATA.hintButtonMs + 30); draw(); });
      layout();
      if (kind === "line") buildLine(); else buildMaze();
      draw();
      return {
        start() { done = false; ctx.say((kind === "line" ? T("g.maze.say.begin.line") : T("g.maze.intro.maze")) + " (" + (courseIdx + 1) + "/" + total + ")"); draw(); },
        resize() { const ch = layout(); if (ch && !done) buildLine(); draw(); },
        destroy() { done = true; cancelAnimationFrame(raf); },
        test: {
          state: () => ({ kind, courseIdx, done, prog, pathLen: path.length, LW, LH, maze: mz, cellSz, M, route: route.slice(), path: path.filter((_, i) => i % 4 === 0 || i === path.length - 1) }),
          solve: () => mz ? solve(mz, 0, 0) : null,
          toClient: (x, y) => { const r = cv.getBoundingClientRect(); return [r.left + x * r.width / LW, r.top + y * r.height / LH]; },
        },
      };
    },
  });
})();
