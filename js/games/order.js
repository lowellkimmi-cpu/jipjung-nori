/* 그림 순서 맞추기 (규칙 놀이 방, 2026-11-28) — 섞인 그림 카드를 일어난 순서대로 눌러 1·2·3… 칸에 놓아요
   - 이야기 8개(꽃이 자라요 · 블록을 쌓아요 · 눈사람 · 물 따르기 · 풍선 · 사과 먹기 · 케이크 꾸미기 · 그림 그리기), 그림마다 5장면.
     3장·4장 단계는 5장면 중 처음과 끝을 꼭 넣고 가운데를 골라요(순서가 늘 한 가지로 정해져요).
   - 그림은 모두 코드로 그린 SVG(새 동물·사람 캐릭터 없음). 소리는 직접 만든 짧은 음(꺼져 있어도 놀 수 있어요).
   - 벌 없음: 다른 카드를 누르면 카드가 살짝 들썩였다가 제자리, "다음 그림은 뭘까?"만. 빨강·흔들림·점수 없음.
   - 이야기를 다 놓으면 놓은 그림이 차례로 넘어가며 '움직이는 그림책'처럼 보여요(재미 장치).
   - 기록은 이 기기 안에만(끝낸 이야기 수 · 한 번에 놓은 이야기 수). */
"use strict";
(function () {
  const U = JN.util, h = U.h, shuffle = U.shuffle, T = JN.t;
  const K = Art.COLORS, INK = Art.INK;
  const STAGES = [
    { id: "o1", name: T("g.order.s1"), n: 3, given: 1, odd: false, intro: "g.order.intro.s1" },   // 1번 칸은 미리 놓여 있어요
    { id: "o2", name: T("g.order.s2"), n: 3, given: 0, odd: false, intro: "g.order.intro.s2" },
    { id: "o3", name: T("g.order.s3"), n: 4, given: 0, odd: false, intro: "g.order.intro.s3" },
    { id: "o4", name: T("g.order.s4"), n: 4, given: 0, odd: true, intro: "g.order.intro.s4" },    // 다른 이야기 카드 1장이 섞여요
    { id: "o5", name: T("g.order.s5"), n: 5, given: 0, odd: false, intro: "g.order.intro.s5" },
    { id: "o6", name: T("g.order.s6"), n: 5, given: 0, odd: true, intro: "g.order.intro.s4" },
  ];
  const STORIES_PER_GAME = 4, PASS_CLEAN = 3;
  const TIMING = { placeMs: 380, nopeMs: 520, flipMs: 420, flipLoops: 2, afterMs: 700 };

  /* ---------- 그림 (viewBox 0 0 100 100) ---------- */
  const LN = `stroke="${INK}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"`;
  const PAPER = "#FFFCF5";
  const c = (x, y, r, f) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${LN}/>`;
  const rc = (x, y, w, hh, f, r = 3) => `<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="${r}" fill="${f}" ${LN}/>`;
  const pth = (d, f = "none") => `<path d="${d}" fill="${f}" ${LN}/>`;
  const ground = `<path d="M6 86 H94" ${LN} opacity=".6"/>`;
  const DRAW = {
    flower(i) {
      let s = `<path d="M30 86 Q50 80 70 86 Z" fill="${K.bark}" ${LN}/>` + ground;
      if (i === 0) return s + `<ellipse cx="50" cy="80" rx="5" ry="3.4" fill="${K.sand}" ${LN}/>`;
      const top = [0, 72, 58, 44, 40][i];
      s += pth(`M50 84 V${top}`) ;
      s += pth(`M50 ${top + 6} q-10 -2 -13 -9 q10 0 13 9 Z`, K.sprout) + pth(`M50 ${top + 6} q10 -2 13 -9 q-10 0 -13 9 Z`, K.sprout);
      if (i >= 2) s += pth(`M50 ${top + 22} q-12 -2 -16 -10 q12 0 16 10 Z`, K.leaf);
      if (i === 3) s += pth(`M50 ${top} q-7 -5 0 -15 q7 10 0 15 Z`, K.rose);
      if (i === 4) { for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; s += c((50 + Math.cos(a) * 10).toFixed(1), (top - 10 + Math.sin(a) * 10).toFixed(1), 7, K.rose); } s += c(50, top - 10, 6, K.mustard); }
      return s;
    },
    tower(i) {
      const cols = [K.terracotta, K.dustyblue, K.mustard, K.sage, K.mauve];
      let s = ground;
      for (let k = 0; k <= i; k++) s += rc(34 + (k % 2 ? 2 : -2), 72 - k * 14, 32, 14, cols[k], 2);
      return s;
    },
    snowman(i) {
      let s = ground;
      if (i === 0) return s + c(50, 78, 8, PAPER);
      s += c(50, 66, 20, PAPER);
      if (i >= 2) s += c(50, 34, 13, PAPER);
      if (i >= 3) s += `<circle cx="45" cy="31" r="1.8" fill="${INK}"/><circle cx="55" cy="31" r="1.8" fill="${INK}"/>` + pth("M50 36 l9 2 l-9 2 Z", K.apricot);
      if (i >= 4) s += rc(40, 14, 20, 8, K.night, 1) + rc(36, 21, 28, 3.5, K.night, 1);
      return s;
    },
    cup(i) {
      const lv = [0, 0.25, 0.5, 0.75, 1][i], top = 40, bot = 86, wy = bot - (bot - top - 4) * lv;
      let s = ground;
      if (i > 0 && i < 4) s += pth("M58 10 h20 v10 l-10 6 h-10 Z", K.dustyblue) + `<path d="M58 22 Q52 26 52 ${wy.toFixed(1)}" fill="none" stroke="${K.sky}" stroke-width="3" stroke-linecap="round"/>`;
      if (lv > 0) s += `<path d="M33 ${wy.toFixed(1)} H67 L65 84 H35 Z" fill="${K.sky}" opacity=".85"/>`;
      s += `<path d="M31 ${top} H69 L65 86 H35 Z" fill="none" ${LN}/>`;
      return s;
    },
    balloon(i) {
      const r = [7, 12, 17, 22, 26][i], cy = 60 - r * 0.9;
      let s = ground + `<ellipse cx="50" cy="${cy.toFixed(1)}" rx="${(r * 0.88).toFixed(1)}" ry="${r}" fill="${K.terracotta}" ${LN}/>`;
      s += `<ellipse cx="${(50 - r * 0.35).toFixed(1)}" cy="${(cy - r * 0.4).toFixed(1)}" rx="${(r * 0.15).toFixed(1)}" ry="${(r * 0.25).toFixed(1)}" fill="#fff" opacity=".6"/>`;
      s += pth(`M50 ${(cy + r).toFixed(1)} l-3 4 h6 Z`, K.terracotta);
      if (i === 4) s += pth(`M50 ${(cy + r + 4).toFixed(1)} q-6 8 0 14 q6 6 0 12`);
      return s;
    },
    apple(i) {
      let s = ground;
      if (i === 4) return s + pth("M44 30 q6 6 6 14 q0 10 -4 16 q4 8 4 20 h4 q0 -12 4 -20 q-4 -6 -4 -16 q0 -8 6 -14 Z", "#F4E3B5") + pth("M50 30 v-8") + pth("M50 24 q8 -6 14 -2 q-6 6 -14 2 Z", K.leaf);
      s += c(50, 58, 24, K.red) + pth("M50 34 v-10") + pth("M50 28 q8 -6 14 -2 q-6 6 -14 2 Z", K.leaf);
      const bites = [[], [[74, 50]], [[74, 50], [74, 66]], [[74, 50], [74, 66], [26, 56]]][i];
      for (const [x, y] of bites) s += `<circle cx="${x}" cy="${y}" r="9" fill="${PAPER}" stroke="none"/>` + `<path d="M${x - 4} ${y - 8} a9 9 0 0 ${x > 50 ? 0 : 1} 0 16" fill="none" ${LN} opacity=".7"/>`;
      return s;
    },
    cake(i) {
      let s = ground + `<ellipse cx="50" cy="80" rx="34" ry="5" fill="${K.cream}" ${LN}/>` + rc(24, 56, 52, 24, K.sand, 4);
      if (i >= 1) s += pth("M24 60 q0 -6 6 -6 h40 q6 0 6 6 q-4 6 -8 0 q-4 6 -9 0 q-4 6 -9 0 q-5 6 -9 0 q-4 6 -9 0 q-4 6 -8 0 Z", PAPER);
      if (i >= 2) s += c(34, 52, 4.2, K.red) + c(50, 51, 4.2, K.red) + c(66, 52, 4.2, K.red);
      if (i >= 3) s += rc(47.5, 30, 5, 18, K.dustyblue, 1.5);
      if (i >= 4) s += pth("M50 28 q-5 -6 0 -14 q5 8 0 14 Z", K.mustard);
      return s;
    },
    drawing(i) {
      let s = rc(16, 14, 68, 72, PAPER, 3) + `<path d="M74 80 l14 -22" stroke="${K.mustard}" stroke-width="5" stroke-linecap="round"/>`;
      if (i >= 1) s += `<circle cx="48" cy="48" r="20" fill="${i >= 4 ? K.honey : "none"}" ${LN}/>`;
      if (i >= 2) s += `<circle cx="41" cy="44" r="2.4" fill="${INK}"/><circle cx="55" cy="44" r="2.4" fill="${INK}"/>`;
      if (i >= 3) s += pth("M40 53 q8 8 16 0");
      return s;
    },
  };
  const STORY_IDS = Object.keys(DRAW);
  JN.orderArt = { ids: STORY_IDS, svg: (sid, i) => svgOf(sid, i) };   // 그림 모아 보기(시험·캡처)용
  function svgOf(sid, i) { return svgOf_(sid, i); }
  const svgOf_ = (sid, i) => `<svg viewBox="0 0 100 100" aria-hidden="true">${DRAW[sid](i)}</svg>`;
  /** 5장면 중 n장 고르기: 처음과 끝은 꼭, 가운데는 순서대로 골라요 */
  function frames(n) {
    if (n >= 5) return [0, 1, 2, 3, 4];
    const mid = shuffle([1, 2, 3]).slice(0, n - 2).sort();
    return [0, ...mid, 4];
  }

  JN.registerGame({
    id: "그림순서", stages: STAGES, stageLabel: (st) => st.name, desc: T("g.order.desc"),
    hintHelp: { always: T("g.order.hh.always"), button: T("g.order.hh.button"), none: T("g.order.hh.none") },
    parentNote: T("g.order.parentNote"),
    chart: { key: "stories", label: T("g.order.chart"), unit: T("g.order.unit") },
    describe: (e) => T("g.order.describe", { n: e.stories || 0, c: e.clean || 0 }) + (e.hints ? T("g.number.describe.hint", { n: e.hints }) : ""),
    intro: (st) => T(st.intro),
    mount(ctx) {
      const st = ctx.stage, mode = ctx.settings.hintMode, board = ctx.board;
      board.classList.add("so-board");
      const title = h("div", { class: "so-title" });
      const slots = h("div", { class: "so-slots", role: "list", "aria-label": T("g.order.slots.aria") });
      const tray = h("div", { class: "so-tray", "aria-label": T("g.order.tray.aria") });
      board.append(title, slots, tray);
      const prog = h("span", { class: "qprog" }); ctx.status(prog);
      const order = shuffle(STORY_IDS.slice());
      let sNo = 0, story = null, seq = [], cards = [], placed = 0, busy = true, phase = "idle";
      let stories = 0, clean = 0, mistakes = 0, hints = 0, storyMiss = 0, hinted = false;

      function layout() {
        const W = board.clientWidth - 24, H = board.clientHeight - 24;
        const n = slots.children.length || 3, m = tray.children.length || 3;
        const s1 = Math.max(52, Math.min(130, Math.floor((W - 10 * (n - 1)) / n), Math.floor(H * 0.3)));
        const s2 = Math.max(60, Math.min(140, Math.floor((W - 12 * (m - 1)) / m), Math.floor(H * 0.34)));
        for (const el of slots.children) el.style.width = el.style.height = s1 + "px";
        for (const el of tray.children) el.style.width = el.style.height = (el.classList.contains("so-flip") ? Math.min(W, Math.floor(H * 0.42), 220) : s2) + "px";
      }
      const nextIdx = () => cards.findIndex((cd) => !cd.used && !cd.odd && cd.f === seq[placed]);
      function markNext() {
        for (const b of tray.children) b.classList.remove("next");
        if (mode === "always" || hinted) { const k = nextIdx(); if (k >= 0) tray.children[k].classList.add("next"); }
      }
      function nextStory() {
        if (!ctx.alive()) return;
        if (sNo >= STORIES_PER_GAME) return end();
        story = order[sNo % order.length]; sNo++;
        seq = frames(st.n); placed = 0; storyMiss = 0; hinted = false; phase = "pick";
        prog.textContent = sNo + " / " + STORIES_PER_GAME;
        title.textContent = T("g.order.story." + story);
        slots.textContent = "";
        seq.forEach((f, i) => slots.appendChild(h("div", { class: "so-slot", role: "listitem", "data-i": String(i), "aria-label": T("g.order.slot.aria", { n: i + 1 }) }, [h("b", { class: "so-num", text: String(i + 1) })])));
        cards = seq.map((f) => ({ f, used: false, odd: false }));
        if (st.odd) {
          const other = order.find((x) => x !== story && order.indexOf(x) >= sNo) || STORY_IDS.find((x) => x !== story);
          cards.push({ f: 2, used: false, odd: true, sid: other });
        }
        cards = shuffle(cards);
        tray.textContent = "";
        cards.forEach((cd, k) => {
          const b = h("button", { type: "button", class: "so-card", "data-k": String(k), "aria-label": T("g.order.card.aria", { n: k + 1 }), svg: svgOf(cd.odd ? cd.sid : story, cd.f) });
          b.addEventListener("click", () => tapCard(k));
          tray.appendChild(b);
        });
        for (let g = 0; g < st.given; g++) place(nextIdx(), true);
        busy = false;
        markNext(); layout();
        ctx.say(T("g.order.say.ask"));
        if (ctx.settings.voice !== false) JN.speak(title.textContent);
      }
      function place(k, quiet) {
        const cd = cards[k], b = tray.children[k], slot = slots.children[placed];
        cd.used = true; b.classList.add("used"); b.disabled = true;
        slot.classList.add("filled"); slot.insertAdjacentHTML("beforeend", svgOf(story, cd.f));
        placed++;
        if (!quiet) ctx.tone(392 + placed * 40, 0.12, 0.04);
      }
      function tapCard(k) {
        if (busy || phase !== "pick") return;
        const cd = cards[k], b = tray.children[k];
        if (!cd || cd.used) return;
        if (cd.odd) {
          mistakes++; storyMiss++;
          b.classList.add("odd"); b.disabled = true;
          ctx.say(T("g.order.say.odd"));
          return;
        }
        if (cd.f !== seq[placed]) {
          mistakes++; storyMiss++;
          b.classList.add("nope"); busy = true;
          ctx.say(T("g.order.say.miss"));
          ctx.later(() => { b.classList.remove("nope"); busy = false; }, TIMING.nopeMs / JN.TIME_SCALE);
          return;
        }
        place(k);
        markNext();
        if (placed >= seq.length) done();
      }
      function done() {
        busy = true; phase = "flip"; stories++; if (!storyMiss) clean++;
        ctx.sound("ok"); ctx.say(U.pick(T("g.order.say.ok")));
        tray.textContent = "";
        const flip = h("div", { class: "so-flip", "aria-label": T("g.order.flip.aria") });
        tray.appendChild(flip); layout();
        let t = 0; const total = seq.length * TIMING.flipLoops;
        const step = () => {
          if (!ctx.alive()) return;
          if (t >= total) { phase = "after"; return ctx.later(nextStory, TIMING.afterMs / JN.TIME_SCALE); }
          const i = t % seq.length;
          flip.innerHTML = svgOf(story, seq[i]);
          for (const sl of slots.children) sl.classList.toggle("now", sl.dataset.i === String(i));
          t++; ctx.later(step, TIMING.flipMs / JN.TIME_SCALE);
        };
        step();
      }
      function end() {
        const time = ctx.timer.stop();
        ctx.finish({ cleared: clean >= PASS_CLEAN, time, mistakes, hints, metrics: { stories, clean },
          title: T("g.order.title", { n: stories }), line: T("g.order.line"), bestKey: st.id, bestValue: clean, higherBetter: true });
      }
      ctx.hint(mode === "button", () => { if (busy || hinted || phase !== "pick") return; hinted = true; hints++; markNext(); });
      return {
        start() { ctx.timer.start(); nextStory(); },
        resize: layout,
        destroy() { busy = true; },
        test: { state: () => ({ phase, busy, story, sNo, placed, n: seq.length, next: phase === "pick" ? nextIdx() : -1, odd: cards.findIndex((cd) => cd.odd && !cd.used), stories, clean, mistakes, hints, cards: cards.length, seq: seq.join(",") }) },
      };
    },
  });
})();
