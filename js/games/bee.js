/* 윙윙 꽃밭 (옛 '윙윙 꽃밭 손님') — 꿀벌이 나타나면 그때 살짝 누르기 */
"use strict";
(function () {
  const U = JN.util, h = U.h, T = JN.t;   // T: 화면 글자는 lang/ko.js 에서
  /* [1] 단계 데이터 — 원래 놀이의 LEVELS 그대로 (곤충 이름만 art.js 이름으로) */
  const KINDS4 = ["나비", "무당벌레", "개미", "잠자리"];
  const STAGES = [
    { id: "L1", name: T("g.bee.L1"), insects: 3, kinds: ["나비", "무당벌레", "개미"], lookalikes: 0, beeStay: 4500, beeCount: [5, 6], glow: false, glowEvery: [0, 0], flowers: 4, frontFlowers: 0, hideChance: 0, doubleChance: 0 },
    { id: "L2", name: T("g.bee.L2"), insects: 5, kinds: KINDS4, lookalikes: 0, beeStay: 3800, beeCount: [5, 7], glow: true, glowEvery: [3500, 5500], flowers: 4, frontFlowers: 0, hideChance: 0, doubleChance: 0 },
    { id: "L3", name: T("g.bee.L3"), insects: 7, kinds: KINDS4, lookalikes: 0, beeStay: 2600, beeCount: [6, 8], glow: true, glowEvery: [3000, 5000], flowers: 5, frontFlowers: 0, hideChance: 0, doubleChance: 0 },
    { id: "L4", name: T("g.bee.L4"), insects: 7, kinds: KINDS4, lookalikes: 0, beeStay: 2600, beeCount: [6, 8], glow: true, glowEvery: [3000, 5000], flowers: 5, frontFlowers: 3, hideChance: 0.5, doubleChance: 0 },
    { id: "L5", name: T("g.bee.L5"), insects: 7, kinds: KINDS4, lookalikes: 2, beeStay: 2600, beeCount: [6, 8], glow: true, glowEvery: [3000, 5000], flowers: 5, frontFlowers: 3, hideChance: 0.4, doubleChance: 0 },
    { id: "L6", name: T("g.bee.L6"), insects: 7, kinds: KINDS4, lookalikes: 2, beeStay: 2600, beeCount: [6, 8], glow: true, glowEvery: [3000, 5000], flowers: 5, frontFlowers: 3, hideChance: 0.4, doubleChance: 0.4 },
  ];
  const CFG = {
    baseSpeed: { 개미: [40, 55], 잠자리: [85, 110], other: [55, 75], 벌: [10, 16] },
    levelSpeedStep: 0.12, speedMult: { slow: 0.6, normal: 1, fast: 1.4 },
    passRate: 0.7,          // 나타난 꿀벌 중 이만큼 만나면 다음 단계로 (통합하며 새로 정한 기준)
    hintGlowMs: 1500,
    flowerKinds: ["동글꽃", "튤립", "해바라기"],
  };
  const NOFLIP = { 나비: 1, 무당벌레: 1, 잠자리: 1 };   // 위에서 본 곤충은 뒤집지 않아요

  JN.registerGame({
    id: "벌찾기", stages: STAGES,
    /* 작은 걸음: 벌이 머무는 시간이 걸음마다 조금씩 짧아져요 (마지막 걸음 = 80%) */
    tune: (lv, f) => Object.assign(lv, { beeStay: Math.round(lv.beeStay * (1 - 0.2 * f)) }),
    hintHelp: { always: T("g.bee.hh.always"), button: T("g.bee.hh.button"), none: T("g.bee.hh.none") },
    extraSettings: [
      { key: "length", type: "select", label: T("g.bee.x.length"), def: 60, options: [[30, T("common.sec", { n: 30 })], [45, T("common.sec", { n: 45 })], [60, T("g.bee.len.60")], [90, T("g.bee.len.90")]] },
      { key: "moveSpeed", type: "select", label: T("g.bee.x.speed"), def: "normal", options: [["slow", T("g.bee.speed.slow")], ["normal", T("g.bee.speed.normal")], ["fast", T("g.bee.speed.fast")]] },
    ],
    parentNote: T("g.bee.parentNote"),
    chart: { key: "caught", label: T("g.bee.chart"), unit: T("g.bee.unit") },
    /* 보호자 화면에는 "만난 꿀벌 / 걸린 시간"만 보여요 (평균 반응 시간은 재지도 저장하지도 않아요) */
    describe: (e) => T("g.bee.describe", { n: e.caught || 0, time: U.fmtTime(e.time) }),
    intro: () => T("g.bee.intro"),
    mount(ctx) {
      const lv = ctx.stage, set = ctx.settings, mode = set.hintMode, stage = ctx.board;
      stage.classList.add("bee-board");
      stage.appendChild(h("div", { class: "bee-bg", svg: JN.Assets.scene("meadow") }));   // v2 풀밭 그림 (assets.js 에서 바꿀 수 있어요)
      const lvNo = ctx.stageIdx + 1;
      const durationMs = (Number(set.length) || 60) * 1000;
      const mult = CFG.speedMult[set.moveSpeed] || 1;
      const g = { t: 0, running: false, ended: false, creatures: [], bees: [], flowers: [], schedule: [], pendingFollow: [], nextGlow: Infinity, caught: 0, missed: 0, shown: 0, hints: 0 };
      let raf = 0, last = 0;
      ctx.timer.hide();
      // 작은 꽃 시계 (지름 32px, 풀잎색이 줄어들어요. 마지막에도 빨갛게 바꾸지 않아요)
      const clock = h("span", { class: "flowerclock", "aria-hidden": "true", svg: '<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" class="bg"/><circle cx="18" cy="18" r="15" class="fg" pathLength="100" stroke-dasharray="100 100" transform="rotate(-90 18 18)"/></svg>' });
      ctx.status(clock);
      const fg = clock.querySelector(".fg");

      const size = () => ({ w: stage.clientWidth, h: stage.clientHeight });
      function sizes() { const s = size(); const vis = Math.max(56, Math.min(s.w, s.h) * 0.14); return { vis, hit: vis + 24 }; }
      function speedOf(kind) {
        const r = CFG.baseSpeed[kind] || CFG.baseSpeed.other;
        return U.rand(r[0], r[1]) * (1 + (lvNo - 1) * CFG.levelSpeedStep) * mult;
      }
      function makeCreature(kind, isBee) {
        const el = h("div", { class: "creature" + (isBee ? " is-bee" : ""), "data-kind": kind, role: isBee ? "button" : null, "aria-label": isBee ? T("g.bee.aria") : kind });
        const halo = h("div", { class: "halo" }), ring = h("div", { class: "ring" }), body = h("div", { class: "body", svg: Art.insect(kind, { label: kind }) });
        el.append(halo, ring, body);
        const c = { el, halo, ring, body, kind, isBee, x: 0, y: 0, angle: U.rand(0, Math.PI * 2), speed: speedOf(kind), turn: U.rand(0.4, 0.9),
          bob: U.rand(0, Math.PI * 2), glowStart: -1, glowDur: 2600, startle: -1, state: "fly", alpha: 1, scale: 1, hintUntil: -1 };
        apply(c, sizes());
        el.addEventListener("pointerdown", (ev) => { ev.preventDefault(); tap(c); });
        stage.appendChild(el);
        return c;
      }
      function apply(c, sz) { c.hit = sz.hit; c.vis = sz.vis; c.el.style.width = c.el.style.height = sz.hit + "px"; c.body.style.width = c.body.style.height = sz.vis + "px"; }
      function randomPos(c) { const s = size(); c.x = U.rand(0, Math.max(0, s.w - c.hit)); c.y = U.rand(0, Math.max(0, s.h - c.hit)); }
      function clampPos(c) { const s = size(); c.x = U.clamp(c.x, 0, Math.max(0, s.w - c.hit)); c.y = U.clamp(c.y, 0, Math.max(0, s.h - c.hit)); }
      function layoutFlowers() {
        const s = size(), base = Math.max(56, s.h * 0.18);
        for (const f of g.flowers) {
          const w = base * f.size; f.w = w;
          f.px = U.clamp(f.fx * s.w - w / 2, 0, Math.max(0, s.w - w)); f.py = U.clamp(f.fy * s.h - w * 0.4, 0, Math.max(0, s.h - w));
          f.el.style.width = f.el.style.height = w + "px";
          f.el.style.transform = "translate(" + f.px + "px," + f.py + "px)";
          f.cx = f.px + w / 2; f.cy = f.py + w * 0.36;
        }
      }
      function makeFlowers() {
        const total = lv.flowers + lv.frontFlowers, order = U.shuffle([...Array(total).keys()]);
        for (let i = 0; i < total; i++) {
          const front = i >= lv.flowers;
          const el = h("div", { class: "flower " + (front ? "front" : "back"), svg: Art.flower(U.pick(CFG.flowerKinds)) });
          stage.appendChild(el);
          g.flowers.push({ el, front, fx: (order[i] + 0.5) / total + U.rand(-0.25, 0.25) / total, fy: front ? U.rand(0.4, 0.8) : U.rand(0.62, 0.9), size: front ? U.rand(1.05, 1.25) : U.rand(0.85, 1.05) });
        }
      }
      function makeSchedule() {
        let n = Math.max(3, Math.round(U.rand(lv.beeCount[0], lv.beeCount[1] + 1) * durationMs / 60000) | 0);
        const groups = [];
        while (n > 0) { const dbl = n >= 2 && Math.random() < lv.doubleChance; groups.push(dbl ? 2 : 1); n -= dbl ? 2 : 1; }
        const startMargin = 2200, usable = durationMs - startMargin - 1200, slot = usable / groups.length;
        return groups.map((cnt, i) => ({ at: startMargin + i * slot + U.rand(0, Math.max(0, slot - (cnt * lv.beeStay + (cnt - 1) * 700 + 1200))), count: cnt }));
      }
      function spawnBee(follow) {
        const c = makeCreature("벌", true);
        c.state = "hover"; c.speed = U.rand(CFG.baseSpeed.벌[0], CFG.baseSpeed.벌[1]);
        c.appearAt = g.t; c.stay = lv.beeStay; c.followUp = follow || 0; c.alpha = 0;
        const front = g.flowers.filter((f) => f.front);
        if (front.length && Math.random() < lv.hideChance) {
          const f = U.pick(front), a = U.rand(0, Math.PI * 2);
          c.x = f.cx + Math.cos(a) * f.w * 0.35 - c.hit / 2; c.y = f.cy + Math.sin(a) * f.w * 0.35 - c.hit / 2; c.hiddenNear = true;
        } else randomPos(c);
        clampPos(c);
        if (mode === "always") c.ring.classList.add("on");
        g.bees.push(c); g.shown++;
        ctx.tone(440, 0.3, 0.025);
        render(c, g.t);
      }
      function tap(c) {
        if (!g.running) return;
        if (c.isBee) {
          if (c.state !== "hover") return;
          c.state = "caught"; c.caughtAt = g.t; g.caught++; c.el.classList.add("caught");
          const f = nearestFlower(c);
          c.from = { x: c.x, y: c.y }; c.to = f ? { x: f.cx - c.hit / 2, y: f.cy - c.hit / 2 } : { x: c.x, y: c.y };
          c.bubble = h("div", { class: "bubble-s", text: U.pick(T("g.bee.found")) });
          c.el.appendChild(c.bubble);
          ctx.tone(660, 0.35, 0.06); ctx.tone(880, 0.4, 0.05, 0.12);
          queueFollow(c);
        } else if (c.state === "fly") {
          c.startle = g.t; c.angle += Math.PI * U.rand(0.6, 1.4);   // 살짝 놀라기만 (기록하지 않아요)
        }
      }
      function queueFollow(c) { if (c.followUp > 0) { g.pendingFollow.push({ at: g.t + 700, followUp: c.followUp - 1 }); c.followUp = 0; } }
      function nearestFlower(c) {
        let best = null, bd = Infinity; const cx = c.x + c.hit / 2, cy = c.y + c.hit / 2;
        for (const f of g.flowers) { const d = (f.cx - cx) ** 2 + (f.cy - cy) ** 2; if (d < bd) { bd = d; best = f; } }
        return best;
      }
      function wander(c, dt) {
        const s = size(), sec = dt / 1000;
        c.angle += (Math.random() - 0.5) * c.turn * sec * 4;
        let sp = c.speed; if (c.startle >= 0 && g.t - c.startle < 900) sp *= 1.5;
        c.x += Math.cos(c.angle) * sp * sec; c.y += Math.sin(c.angle) * sp * sec;
        if (c.x < 0 || c.x > Math.max(0, s.w - c.hit)) c.angle = Math.PI - c.angle;
        if (c.y < 0 || c.y > Math.max(0, s.h - c.hit)) c.angle = -c.angle;
        clampPos(c);
      }
      function render(c, t) {
        let bob = c.kind !== "개미" ? Math.sin(t / 700 + c.bob) * 3 : 0, rot = 0;
        if (c.startle >= 0) { const p = (t - c.startle) / 600; if (p >= 0 && p < 1) { bob -= Math.sin(p * Math.PI) * 10; rot = Math.sin(p * Math.PI * 2) * 4; } else if (p >= 1) c.startle = -1; }
        let faceRight = Math.cos(c.angle) > 0;
        if (c.state === "caught" && c.to) faceRight = c.to.x > c.from.x;
        const sx = NOFLIP[c.kind] ? 1 : faceRight ? -1 : 1;   // art.js 곤충은 왼쪽을 봐요
        c.el.style.transform = "translate(" + c.x.toFixed(1) + "px," + c.y.toFixed(1) + "px)";
        c.el.style.opacity = c.alpha.toFixed(3);
        c.body.style.transform = "translateY(" + bob.toFixed(1) + "px) rotate(" + rot.toFixed(1) + "deg) scale(" + (sx * c.scale).toFixed(3) + "," + c.scale.toFixed(3) + ")";
        let gl = 0;   // 반짝임: 한 번 천천히 밝아졌다 어두워져요 (깜빡임 아님)
        if (c.glowStart >= 0) { const p = (t - c.glowStart) / c.glowDur; if (p >= 0 && p <= 1) gl = Math.sin(p * Math.PI); else if (p > 1) c.glowStart = -1; }
        if (c.state === "caught") gl = Math.max(gl, 0.7 * Math.sin(Math.min(1, (t - c.caughtAt) / 500) * Math.PI / 2));
        c.halo.style.opacity = (gl * 0.9).toFixed(3);
        if (c.isBee && mode === "button") c.ring.classList.toggle("on", c.state === "hover" && t < c.hintUntil);
      }
      function updateBee(c, dt) {
        const t = g.t;
        if (c.state === "hover") {
          c.alpha = U.clamp((t - c.appearAt) / 350, 0, 1); c.scale = 0.8 + 0.2 * c.alpha;
          if (!c.hiddenNear) wander(c, dt); else clampPos(c);
          if (t - c.appearAt >= c.stay) { c.state = "leaving"; c.leaveAt = t; g.missed++; c.ring.classList.remove("on"); queueFollow(c); }
        } else if (c.state === "leaving") {
          const p = U.clamp((t - c.leaveAt) / 900, 0, 1); c.alpha = 1 - p; c.y -= dt * 0.03; clampPos(c); if (p >= 1) c.state = "gone";
        } else if (c.state === "caught") {
          const q = U.clamp((t - c.caughtAt - 450) / 1200, 0, 1), e = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
          c.x = c.from.x + (c.to.x - c.from.x) * e; c.y = c.from.y + (c.to.y - c.from.y) * e;
          if (c.bubble) c.bubble.style.opacity = String(1 - U.clamp((t - c.caughtAt - 900) / 500, 0, 1));
          const f = U.clamp((t - c.caughtAt - 1650) / 500, 0, 1); c.alpha = 1 - f; c.scale = 1 - 0.3 * f; clampPos(c);
          if (f >= 1) c.state = "gone";
        }
        if (c.state === "gone") c.el.remove();
      }
      function loop(now) {
        if (!g.running) return;
        const dt = Math.min(100, now - last) * JN.TIME_SCALE; last = now; g.t += dt; const t = g.t;
        while (g.schedule.length && t >= g.schedule[0].at) spawnBee(g.schedule.shift().count - 1);
        for (let i = g.pendingFollow.length - 1; i >= 0; i--) if (t >= g.pendingFollow[i].at) { const pf = g.pendingFollow.splice(i, 1)[0]; if (t < durationMs - 600) spawnBee(pf.followUp); }
        if (t >= g.nextGlow) {
          const c = g.creatures.filter((x) => x.glowStart < 0 && x.startle < 0);
          if (c.length) U.pick(c).glowStart = t;
          g.nextGlow = t + U.rand(lv.glowEvery[0], lv.glowEvery[1]);
        }
        g.creatures.forEach((c) => { wander(c, dt); render(c, t); });
        g.bees = g.bees.filter((b) => { updateBee(b, dt); if (b.state !== "gone") render(b, t); return b.state !== "gone"; });
        fg.setAttribute("stroke-dasharray", (U.clamp(1 - t / durationMs, 0, 1) * 100).toFixed(1) + " 100");
        const busy = g.bees.length || g.pendingFollow.length || g.schedule.length;
        if (t >= durationMs && (!busy || t >= durationMs + 5000)) return end();
        raf = requestAnimationFrame(loop);
      }
      function end() {
        if (g.ended) return;
        g.ended = true; g.running = false;
        g.bees.forEach((b) => { if (b.state === "hover") g.missed++; });
        const total = g.caught + g.missed, rate = total ? g.caught / total : 0;
        ctx.finish({ cleared: rate >= CFG.passRate, time: durationMs / 1000, hints: g.hints, metrics: { caught: g.caught },
          title: T("g.bee.title"), line: T("g.bee.line", { n: g.caught }), showTime: false,
          bestKey: lv.id, bestValue: g.caught, higherBetter: true });
      }
      ctx.hint(mode === "button", () => {
        if (!g.running) return;
        g.hints++;
        g.bees.forEach((b) => { if (b.state === "hover") b.hintUntil = g.t + CFG.hintGlowMs * 1; });
      });
      makeFlowers(); layoutFlowers();
      g.schedule = makeSchedule();
      const kinds = [];
      for (let i = 0; i < lv.lookalikes; i++) kinds.push("꽃등에");
      while (kinds.length < lv.insects) kinds.push(lv.kinds[kinds.length % lv.kinds.length]);
      U.shuffle(kinds).forEach((k) => { const c = makeCreature(k, false); randomPos(c); g.creatures.push(c); render(c, 0); });
      g.nextGlow = lv.glow ? U.rand(lv.glowEvery[0], lv.glowEvery[1]) : Infinity;
      return {
        start() { g.running = true; last = performance.now(); ctx.say(T("g.bee.say")); raf = requestAnimationFrame(loop); },
        resize() { const sz = sizes(); g.creatures.concat(g.bees).forEach((c) => { apply(c, sz); clampPos(c); }); layoutFlowers(); },
        visibility(hidden) { if (g.ended || !g.t && !g.running) return; if (hidden) { g.running = false; cancelAnimationFrame(raf); } else if (!g.running) { g.running = true; last = performance.now(); raf = requestAnimationFrame(loop); } },
        destroy() { g.running = false; g.ended = true; cancelAnimationFrame(raf); },
        test: { state: () => ({ t: g.t, duration: durationMs, caught: g.caught, missed: g.missed, shown: g.shown, ended: g.ended, active: g.bees.filter((b) => b.state === "hover").length }),
          spawnBee: () => spawnBee(0), sizes, flowerCount: () => g.flowers.length },
      };
    },
  });
})();
