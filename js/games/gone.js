/* 사라진 물건 찾기 (기억 놀이 방, 2026-11-28) — 보미 돗자리 위 물건을 잘 보고, 바람에 날린 잎이 덮었다 걷히면 없어진 물건을 골라요
   - 물건 그림은 기존 그림(과일 6 · 동물 6 ·탈것 6)만 다시 써요. 새 캐릭터 없음.
   - 고르기 카드에는 '돗자리에 처음부터 없던 물건'이 섞여 있어서, 처음 모습을 기억해야 고를 수 있어요.
   - 단계마다 새 규칙 하나: 물건 3개 → 4개 → 자리가 바뀌어요 → 비슷한 물건이 섞여요 → 두 개가 사라져요 → 모두 함께.
   - 벌 없음: 다른 카드를 누르면 그 카드만 살짝 흐려지고 "다시 생각해 볼까?". 두 번 막히면 처음 모습을 잠깐 다시 보여 줘요.
   - 찾으면 그 물건이 제자리로 폴짝 돌아와요(재미 장치). 움직임 줄이기 설정이면 그냥 나타나요.
   - 기록은 이 기기 안에만(찾은 물건 수 · 한 번에 찾은 판 수). */
"use strict";
(function () {
  const U = JN.util, h = U.h, shuffle = U.shuffle, T = JN.t;
  const K = Art.COLORS, INK = Art.INK;
  const STAGES = [
    { id: "g1", name: T("g.gone.s1"), n: 3, gone: 1, choices: 2, move: false, similar: false, intro: "g.gone.intro.s1" },
    { id: "g2", name: T("g.gone.s2"), n: 4, gone: 1, choices: 3, move: false, similar: false, intro: "g.gone.intro.s2" },
    { id: "g3", name: T("g.gone.s3"), n: 4, gone: 1, choices: 3, move: true, similar: false, intro: "g.gone.intro.s3" },     // 남은 물건 자리가 바뀌어요
    { id: "g4", name: T("g.gone.s4"), n: 5, gone: 1, choices: 4, move: false, similar: true, intro: "g.gone.intro.s4" },     // 색·개수만 다른 비슷한 카드가 섞여요
    { id: "g5", name: T("g.gone.s5"), n: 5, gone: 2, choices: 4, move: false, similar: false, intro: "g.gone.intro.s5" },    // 두 개가 사라져요
    { id: "g6", name: T("g.gone.s6"), n: 6, gone: 2, choices: 5, move: true, similar: true, intro: "g.gone.intro.s6" },
  ];
  const ROUNDS = 4, PASS_CLEAN = 3;
  const TIMING = { lookBase: 2600, lookPer: 600, coverMs: 650, holdMs: 450, nopeMs: 480, peekMs: 1400, backMs: 520, afterMs: 900 };
  const POOL = [].concat(Art.FRUITS.map((k) => ({ t: "fruit", k })), Art.ANIMALS.map((k) => ({ t: "animal", k })), Art.VEHICLES.map((k) => ({ t: "vehicle", k })));
  const ALT_COLOR = [K.honey, K.lilac, K.mint, K.apricot, K.sky, K.pink];
  const draw = (it) => Art[it.t](it.k, it.o || {});
  const keyOf = (it) => it.t + ":" + it.k + (it.o ? JSON.stringify(it.o) : "");
  const nameOf = (it) => it.k;
  /** 비슷한 물건: 같은 그림에 색(동물·탈것)이나 개수(과일)만 바꿔요 */
  function similarOf(it) {
    if (it.t === "fruit") return { t: it.t, k: it.k, o: { count: 2 } };
    return { t: it.t, k: it.k, o: { color: U.pick(ALT_COLOR) } };
  }
  /* 덮는 잎 (바람에 날려 와서 돗자리를 덮어요) */
  const COVER_SVG = `<svg viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden="true">
    <path d="M6 66 C10 22 70 4 112 8 C160 12 196 40 194 66 C190 98 140 116 96 114 C46 112 4 102 6 66Z" fill="${K.sage}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M14 64 C60 58 130 58 186 62 M60 60 L40 34 M60 62 L42 92 M110 60 L94 26 M110 62 L96 100 M152 62 L142 32 M152 64 L144 96" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity=".55"/>
    <ellipse cx="70" cy="32" rx="16" ry="6" fill="#fff" opacity=".25"/></svg>`;

  JN.registerGame({
    id: "사라진물건", stages: STAGES, stageLabel: (st) => st.name, desc: T("g.gone.desc"),
    hintHelp: { always: T("g.gone.hh.always"), button: T("g.gone.hh.button"), none: T("g.gone.hh.none") },
    parentNote: T("g.gone.parentNote"),
    chart: { key: "found", label: T("g.gone.chart"), unit: T("g.gone.unit") },
    describe: (e) => T("g.gone.describe", { n: e.found || 0, c: e.clean || 0 }) + (e.hints ? T("g.number.describe.hint", { n: e.hints }) : ""),
    intro: (st) => T(st.intro),
    mount(ctx) {
      const st = ctx.stage, mode = ctx.settings.hintMode, board = ctx.board;
      board.classList.add("gn-board");
      const mat = h("div", { class: "gn-mat", role: "list", "aria-label": T("g.gone.mat.aria") });
      const cover = h("div", { class: "gn-cover", "aria-hidden": "true", svg: COVER_SVG });
      const side = h("div", { class: "gn-side" });
      const ready = h("button", { type: "button", class: "gn-ready jn-btn jn-btn--primary", text: T("g.gone.ready") });
      const picks = h("div", { class: "gn-picks", role: "group", "aria-label": T("g.gone.picks.aria") });
      ready.hidden = true; picks.hidden = true;   // '준비~' 안내가 끝나고 판이 시작되면 보여요
      mat.appendChild(cover);
      side.append(ready, picks);
      board.append(mat, side);
      const prog = h("span", { class: "qprog" }); ctx.status(prog);
      const reduced = () => { try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; } };
      let round = 0, phase = "idle", busy = true, items = [], spots = [], gone = [], choices = [], foundNow = 0, roundMiss = 0, peeked = false, hinted = false;
      let found = 0, clean = 0, mistakes = 0, hints = 0, peeks = 0, backs = 0;
      const nudge = U.nudge(ctx, () => (phase === "pick" ? picks.children[answerIdx()] || null : null));

      function layout() {
        const W = Math.max(200, board.clientWidth - 24), H = Math.max(200, board.clientHeight - 24), g = 10;
        const wide = W > H * 1.45;
        board.classList.toggle("wide", wide);
        const n = st.n, m = st.choices;
        const cols = n <= 3 ? n : Math.ceil(n / 2), rows = n <= 3 ? 1 : 2;
        let mW = wide ? W * 0.58 : W, mH = wide ? H : H * 0.56;
        const s1 = Math.max(56, Math.min(130, Math.floor((mW - 16 - g * (cols - 1)) / cols), Math.floor((mH - 16 - g * (rows - 1)) / rows)));
        mat.style.gridTemplateColumns = `repeat(${cols}, ${s1}px)`;
        for (const el of mat.querySelectorAll(".gn-spot")) el.style.width = el.style.height = s1 + "px";
        let pc = wide ? (m <= 2 ? 1 : 2) : m, pr = Math.ceil(m / pc);
        const cW = wide ? W * 0.4 : W, cH = wide ? H - 70 : H * 0.36;
        let s2 = Math.min(120, Math.floor((cW - g * (pc - 1)) / pc), Math.floor((cH - g * (pr - 1)) / pr));
        if (!wide && s2 < 64 && m > 3) { pc = Math.ceil(m / 2); pr = 2; s2 = Math.min(120, Math.floor((cW - g * (pc - 1)) / pc), Math.floor((cH - g) / 2)); }
        s2 = Math.max(60, s2);
        picks.style.gridTemplateColumns = `repeat(${pc}, ${s2}px)`;
        for (const el of picks.children) el.style.width = el.style.height = s2 + "px";
      }
      const answerIdx = () => choices.findIndex((c) => c.ok && !c.got);
      function paintSpots(showGone) {
        spots.forEach((sp, i) => {
          const it = items[i];
          const isGone = gone.includes(i) && !showGone;
          sp.el.innerHTML = isGone ? "" : draw(it);
          sp.el.classList.toggle("empty", isGone);
          sp.el.classList.toggle("mark", isGone && mode === "always" && phase === "pick");
          sp.el.setAttribute("aria-label", isGone ? T("g.gone.spot.empty") : nameOf(it));
        });
      }
      /** 잎을 왼쪽 처음 자리로 (돗자리 위를 다시 지나가지 않게 움직임 없이) */
      function resetCover() {
        cover.style.transition = "none";
        cover.classList.remove("on", "off");
        void cover.offsetWidth;
        cover.style.transition = "";
      }
      function nextRound() {
        if (!ctx.alive()) return;
        if (round >= ROUNDS) return end();
        round++; prog.textContent = round + " / " + ROUNDS;
        phase = "look"; busy = true; foundNow = 0; roundMiss = 0; peeked = false; hinted = false;
        const pool = shuffle(POOL.slice());
        items = pool.slice(0, st.n);
        const others = pool.slice(st.n);
        gone = shuffle(items.map((_, i) => i)).slice(0, st.gone).sort((a, b) => a - b);
        // 고르기 카드: 사라진 것 + (비슷한 것) + 처음부터 없던 것
        const cs = gone.map((i) => ({ it: items[i], ok: true, idx: i }));
        if (st.similar) cs.push({ it: similarOf(items[gone[0]]), ok: false, kind: "similar" });
        for (const it of others) { if (cs.length >= st.choices) break; cs.push({ it, ok: false, kind: "new" }); }
        choices = shuffle(cs);
        [...mat.querySelectorAll(".gn-spot")].forEach((e) => e.remove());
        spots = items.map((it, i) => {
          const el = h("div", { class: "gn-spot", role: "listitem", "data-i": String(i) });
          mat.insertBefore(el, cover);
          return { el };
        });
        picks.textContent = ""; picks.hidden = true;
        ready.hidden = false; ready.disabled = false;
        resetCover();
        paintSpots(true); layout();
        ctx.say(T("g.gone.say.look"));
        if (ctx.settings.voice !== false) JN.speak(T("g.gone.say.look"));
        ctx.later(hide, (TIMING.lookBase + TIMING.lookPer * st.n) / JN.TIME_SCALE);
      }
      function hide() {
        if (!ctx.alive() || phase !== "look") return;
        phase = "cover"; ready.hidden = true;
        ctx.say(T("g.gone.say.wind"));
        ctx.tone(330, 0.18, 0.03); ctx.tone(262, 0.2, 0.03, 0.12);
        cover.classList.add("on");
        ctx.later(() => {
          if (!ctx.alive()) return;
          // 덮인 동안: 물건이 사라지고, (자리 바꾸기 단계면) 남은 물건 자리가 섞여요
          if (st.move) {
            const order = shuffle(items.map((_, i) => i));
            if (order.every((v, i) => v === i)) order.push(order.shift());
            const newItems = order.map((i) => items[i]);
            gone = gone.map((gi) => order.indexOf(gi)).sort((a, b) => a - b);
            choices.forEach((c) => { if (c.ok) c.idx = order.indexOf(c.idx); });
            items = newItems;
          }
          paintSpots(false);
          ctx.later(uncover, TIMING.holdMs / JN.TIME_SCALE);
        }, TIMING.coverMs / JN.TIME_SCALE);
      }
      function uncover() {
        if (!ctx.alive()) return;
        cover.classList.remove("on"); cover.classList.add("off");
        ctx.later(() => {
          if (!ctx.alive()) return;
          phase = "pick"; busy = false;
          paintSpots(false);
          picks.textContent = ""; picks.hidden = false;
          choices.forEach((c, k) => {
            const b = h("button", { type: "button", class: "gn-pick", "data-k": String(k), "aria-label": nameOf(c.it), svg: draw(c.it) });
            b.addEventListener("click", () => tap(k));
            picks.appendChild(b);
          });
          layout();
          const ask = st.gone > 1 ? T("g.gone.say.ask2") : T("g.gone.say.ask");
          ctx.say(ask);
          if (ctx.settings.voice !== false) JN.speak(ask);
          nudge.arm();
        }, TIMING.coverMs / JN.TIME_SCALE);
      }
      function peek(byHint) {
        if (busy || phase !== "pick") return;
        busy = true; peeks++;
        if (byHint) { hinted = true; hints++; }
        else peeked = true;
        ctx.say(T("g.gone.say.peek"));
        for (const i of gone) { const c = choices.find((x) => x.ok && x.idx === i); if (c && c.got) continue; spots[i].el.innerHTML = draw(items[i]); spots[i].el.classList.add("ghost"); }
        ctx.later(() => {
          if (!ctx.alive()) return;
          for (const i of gone) { const c = choices.find((x) => x.ok && x.idx === i); spots[i].el.classList.remove("ghost"); if (!(c && c.got)) spots[i].el.innerHTML = ""; }
          busy = false;
          ctx.say(st.gone > 1 ? T("g.gone.say.ask2") : T("g.gone.say.ask"));
        }, TIMING.peekMs / JN.TIME_SCALE);
      }
      function tap(k) {
        if (busy || phase !== "pick") return;
        const c = choices[k], b = picks.children[k];
        if (!c || c.got || c.no) return;
        if (!c.ok) {
          mistakes++; roundMiss++; c.no = true;
          b.classList.add("nope"); b.disabled = true;
          ctx.say(c.kind === "similar" ? T("g.gone.say.similar") : T("g.gone.say.new"));
          nudge.wrong();
          if (roundMiss >= 2 && !peeked) ctx.later(() => peek(false), TIMING.nopeMs / JN.TIME_SCALE);
          return;
        }
        c.got = true; foundNow++; found++;
        b.classList.add("got"); b.disabled = true;
        nudge.ok();
        const sp = spots[c.idx].el;
        sp.innerHTML = draw(c.it); sp.classList.remove("empty", "mark", "ghost");
        sp.setAttribute("aria-label", nameOf(c.it));
        if (!reduced()) { sp.classList.add("back"); backs++; ctx.later(() => sp.classList.remove("back"), TIMING.backMs / JN.TIME_SCALE); }
        ctx.tone(523 + foundNow * 60, 0.14, 0.04);
        if (foundNow < st.gone) { ctx.say(T("g.gone.say.one")); return; }
        roundDone();
      }
      function roundDone() {
        phase = "after"; busy = true; nudge.stop();
        if (!roundMiss) clean++;
        ctx.sound("ok");
        const last = choices.filter((c) => c.ok).map((c) => nameOf(c.it));
        ctx.say(last.length > 1 ? U.pick(T("g.gone.say.ok")) : U.josa(last[0], "이/가") + " " + T("g.gone.say.back"));
        ctx.later(nextRound, TIMING.afterMs / JN.TIME_SCALE);
      }
      function end() {
        phase = "done"; nudge.stop();
        const time = ctx.timer.stop();
        ctx.finish({ cleared: clean >= PASS_CLEAN, time, mistakes, hints, metrics: { found, clean },
          title: T("g.gone.title", { n: found }), line: T("g.gone.line"), bestKey: st.id, bestValue: clean, higherBetter: true });
      }
      ready.addEventListener("click", () => { if (phase === "look") { ready.disabled = true; hide(); } });
      ctx.hint(mode === "button", () => { if (busy || hinted || phase !== "pick") return; peek(true); });
      return {
        start() { ctx.timer.start(); nextRound(); },
        resize: layout,
        destroy() { busy = true; phase = "done"; nudge.stop(); },
        test: { state: () => ({ phase, busy, round, n: items.length, gone: gone.slice(), goneNames: gone.map((i) => nameOf(items[i])), answer: phase === "pick" ? answerIdx() : -1,
          choices: choices.map((c) => ({ k: nameOf(c.it), ok: !!c.ok, kind: c.kind || "gone", got: !!c.got, no: !!c.no })), items: items.map(keyOf),
          found, clean, mistakes, hints, peeks, backs, foundNow, nudgeShown: nudge.shown(), mode }) },
      };
    },
  });
})();
