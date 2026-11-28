/* 소리 듣고 찾기 (말 놀이 방, 2026-11-28) — 보미가 들려주는 소리('멍멍', '빵빵')를 잘 듣고, 그 소리를 내는 그림 카드를 골라요
   - 그림은 기존 그림(동물 · 탈것)만 다시 써요. 새 캐릭터 없음. 소리는 기기 음성으로 흉내 말을 읽어 줘요(기존 동요·녹음 없음).
   - 조용한 모드: 말 안내가 꺼져 있거나 소리를 껐거나 기기에 음성이 없으면, 소리 대신 말풍선에 흉내 말을 크게 보여 줘요(3-4 소리 규칙).
   - 단계마다 새 규칙 하나: 카드 2장 → 3장 → 같은 무리 4장 → 소리 두 개를 들은 순서대로 → 소리 세 개.
   - 벌 없음: 다른 카드를 누르면 그 카드만 살짝 흐려지고 "다시 들어 볼까?" 하며 소리를 한 번 더 들려줘요.
   - 힌트: 늘 보기 = 말풍선 글자도 함께 / 힌트 버튼 = 아닌 카드 한 장을 흐리게(판마다 한 번) / 없이.
   - 첫 판 손짓: 처음 하는 아이가 두 번 막히거나 가만있으면 손 그림이 맞는 카드를 가리켜요(글자 없음).
   - 기록은 이 기기 안에만(찾은 소리 수 · 한 번에 찾은 판 수 · 다시 들은 횟수). */
"use strict";
(function () {
  const U = JN.util, h = U.h, shuffle = U.shuffle, T = JN.t;
  const STAGES = [
    { id: "h1", name: T("g.sound.s1"), cards: 2, seq: 1, same: false, intro: "g.sound.intro.s1" },
    { id: "h2", name: T("g.sound.s2"), cards: 3, seq: 1, same: false, intro: "g.sound.intro.s2" },
    { id: "h3", name: T("g.sound.s3"), cards: 4, seq: 1, same: true, intro: "g.sound.intro.s3" },    // 같은 무리(동물끼리 · 탈것끼리)만 나와요
    { id: "h4", name: T("g.sound.s4"), cards: 4, seq: 2, same: false, intro: "g.sound.intro.s4" },   // 소리 두 개 → 들은 순서대로
    { id: "h5", name: T("g.sound.s5"), cards: 5, seq: 3, same: false, intro: "g.sound.intro.s5" },   // 소리 세 개
  ];
  const ROUNDS = 4, PASS_CLEAN = 3;
  const TIMING = { firstMs: 450, nopeMs: 500, afterMs: 900 };
  /* 소리 나는 것 (흉내 말은 lang 파일) · 소리 없는 것은 '아닌 카드'로만 써요 */
  const SOUNDY = [
    { t: "animal", k: "강아지", g: "a" }, { t: "animal", k: "고양이", g: "a" }, { t: "animal", k: "오리", g: "a" },
    { t: "vehicle", k: "자동차", g: "v" }, { t: "vehicle", k: "기차", g: "v" }, { t: "vehicle", k: "비행기", g: "v" },
    { t: "vehicle", k: "자전거", g: "v" }, { t: "vehicle", k: "배", g: "v" },
  ];
  const QUIET = [{ t: "animal", k: "토끼", g: "a" }, { t: "animal", k: "곰", g: "a" }, { t: "animal", k: "코끼리", g: "a" }, { t: "vehicle", k: "버스", g: "v" }];
  const cry = (it) => T("g.sound.cry." + it.k);
  const draw = (it) => Art[it.t](it.k, {});
  const SPEAKER_SVG = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 18 H16 L26 9 V39 L16 30 H8 Z" fill="currentColor" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M32 17 C36 21 36 27 32 31 M37 12 C44 19 44 29 37 36" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';

  JN.registerGame({
    id: "소리찾기", stages: STAGES, stageLabel: (st) => st.name, desc: T("g.sound.desc"),
    hintHelp: { always: T("g.sound.hh.always"), button: T("g.sound.hh.button"), none: T("g.sound.hh.none") },
    parentNote: T("g.sound.parentNote"),
    chart: { key: "found", label: T("g.sound.chart"), unit: T("g.sound.unit") },
    describe: (e) => T("g.sound.describe", { n: e.found || 0, c: e.clean || 0 }) + (e.hints ? T("g.number.describe.hint", { n: e.hints }) : ""),
    /* 3-4 소리 규칙: 시작할 때 "소리로 알려 줘요"(말 안내 꺼짐이면 "말풍선 글자로 보여 줘요")를 먼저 말해요 */
    intro: (st, settings) => T(settings && settings.voice === false ? "g.sound.intro.quiet" : "g.sound.intro.voice") + " " + T(st.intro),
    mount(ctx) {
      const st = ctx.stage, mode = ctx.settings.hintMode, board = ctx.board;
      board.classList.add("sd2-board");
      const top = h("div", { class: "sd2-top" });
      const again = h("button", { type: "button", class: "sd2-again jn-btn jn-btn--primary", "aria-label": T("g.sound.again.aria") },
        h("i", { class: "sd2-spk", "aria-hidden": "true", svg: SPEAKER_SVG }), h("span", { text: T("g.sound.again") }));
      const bubble = h("div", { class: "sd2-bubble", role: "status", "aria-live": "polite" });
      const seqBox = h("div", { class: "sd2-seq", "aria-hidden": "true" });
      top.append(again, bubble, seqBox);
      top.hidden = true;   // '준비~' 안내가 끝나고 판이 시작되면 보여요 (안내 글과 겹치지 않게)
      const cards = h("div", { class: "sd2-cards", role: "group", "aria-label": T("g.sound.cards.aria") });
      board.append(top, cards);
      const prog = h("span", { class: "qprog" });
      ctx.status(prog);
      let round = 0, phase = "idle", busy = true, deck = [], answers = [], step = 0, roundMiss = 0, hinted = false;
      let found = 0, clean = 0, mistakes = 0, hints = 0, replays = 0, plays = 0, lastSaid = "";
      /* 소리로 들려줄 수 있는지: 말 안내 켜짐 + 놀이 화면 소리 단추가 꺼짐(JN.muted)이 아님 + 기기 음성 있음 (효과음 설정과는 따로) */
      const audible = () => ctx.settings.voice !== false && !JN.muted && JN.speakAvailable();
      const nudge = U.nudge(ctx, () => (phase === "pick" ? cards.children[answerIdx()] || null : null));
      const answerIdx = () => (phase === "pick" && answers[step] ? deck.findIndex((d) => d === answers[step]) : -1);

      function layout() {
        const W = Math.max(200, board.clientWidth - 24), H = Math.max(200, board.clientHeight - 24 - top.offsetHeight - 14), g = 12;
        const n = deck.length || st.cards;
        let best = { s: 0, c: n };
        for (let c = 1; c <= n; c++) {
          const r = Math.ceil(n / c);
          const s = Math.min(150, Math.floor((W - g * (c - 1)) / c), Math.floor((H - g * (r - 1)) / r));
          if (s > best.s) best = { s, c };
        }
        const s = Math.max(60, best.s);
        cards.style.gridTemplateColumns = `repeat(${best.c}, ${s}px)`;
        for (const el of cards.children) el.style.width = el.style.height = s + "px";
      }
      /** 지금 들려줄 소리(순서 단계면 여러 개)를 말하고, 조용한 모드·늘 보기면 말풍선에도 보여 줘요 */
      function play(byUser) {
        if (!ctx.alive()) return;
        const words = answers.map(cry);
        const text = words.join(", ");
        lastSaid = text; plays++;
        if (byUser) replays++;
        const quiet = !audible();
        const showText = quiet || mode === "always";
        bubble.textContent = showText ? words.join(" · ") : "";
        bubble.classList.toggle("on", showText);
        bubble.classList.toggle("quiet", quiet);
        if (!quiet) JN.speak(text);
        again.classList.remove("ring"); void again.offsetWidth; again.classList.add("ring");
      }
      function paintSeq() {
        seqBox.textContent = "";
        if (st.seq < 2) return;
        answers.forEach((it, i) => seqBox.appendChild(h("span", { class: "sd2-dot" + (i < step ? " done" : i === step ? " now" : ""), text: String(i + 1) })));
      }
      function nextRound() {
        if (!ctx.alive()) return;
        if (round >= ROUNDS) return end();
        round++; prog.textContent = round + " / " + ROUNDS; top.hidden = false;
        phase = "pick"; busy = false; step = 0; roundMiss = 0; hinted = false;
        let pool = shuffle(SOUNDY.slice());
        if (st.same) { const g = U.pick(["a", "v"]); pool = pool.filter((x) => x.g === g); }
        answers = pool.slice(0, st.seq);
        const group = st.same ? answers[0].g : null;
        const rest = shuffle(pool.slice(st.seq).concat(QUIET.filter((x) => !group || x.g === group)));
        deck = shuffle(answers.concat(rest.slice(0, st.cards - st.seq)));
        cards.textContent = "";
        deck.forEach((it, k) => {
          const b = h("button", { type: "button", class: "sd2-card", "data-k": String(k), "aria-label": it.k, svg: draw(it) });
          b.addEventListener("click", () => tap(k));
          cards.appendChild(b);
        });
        paintSeq(); layout();
        ctx.say(st.seq === 3 ? T("g.sound.say.ask3") : st.seq === 2 ? T("g.sound.say.ask2") : T("g.sound.say.ask"));
        ctx.later(() => { play(false); nudge.arm(); }, TIMING.firstMs / JN.TIME_SCALE);
      }
      /** 아닌 카드 한 장 흐리게 (힌트 버튼 · 두 번 막혔을 때) */
      function dimOne() {
        const k = deck.findIndex((d, i) => !answers.includes(d) && !cards.children[i].disabled);
        if (k < 0) return false;
        const b = cards.children[k]; b.classList.add("nope"); b.disabled = true;
        return true;
      }
      function tap(k) {
        if (busy || phase !== "pick") return;
        const it = deck[k], b = cards.children[k];
        if (!it || !b || b.disabled) return;
        if (it !== answers[step]) {
          mistakes++; roundMiss++;
          if (answers.includes(it)) {   // 들린 소리는 맞지만 순서가 달라요 → 흐리게 하지 않고 순서만 알려 줘요
            ctx.say(T("g.sound.say.order"));
          } else {
            b.classList.add("nope"); b.disabled = true;
            ctx.say(T("g.sound.say.nope"));
            if (roundMiss >= 2 && !hinted) dimOne();
          }
          nudge.wrong();
          busy = true;
          ctx.later(() => { if (!ctx.alive() || phase !== "pick") return; busy = false; play(false); }, TIMING.nopeMs / JN.TIME_SCALE);
          return;
        }
        step++; found++;
        b.classList.add("got"); b.disabled = true;
        if (st.seq > 1) b.setAttribute("data-n", String(step));
        nudge.ok();
        ctx.tone(523 + step * 60, 0.14, 0.04);
        paintSeq();
        if (step < answers.length) { ctx.say(T("g.sound.say.next")); return; }
        roundDone();
      }
      function roundDone() {
        phase = "after"; busy = true; nudge.stop();
        if (!roundMiss) clean++;
        ctx.sound("ok");
        bubble.textContent = answers.map(cry).join(" · "); bubble.classList.add("on");   // 다 찾으면 무슨 소리였는지 글자로도 보여 줘요
        ctx.say(answers.length > 1 ? U.pick(T("g.sound.say.ok")) : T("g.sound.say.okOne", { who: U.josa(answers[0].k, "이/가"), cry: cry(answers[0]) }));
        ctx.later(nextRound, TIMING.afterMs / JN.TIME_SCALE);
      }
      function end() {
        phase = "done"; nudge.stop();
        const time = ctx.timer.stop();
        ctx.finish({ cleared: clean >= PASS_CLEAN, time, mistakes, hints, metrics: { found, clean, replays },
          title: T("g.sound.title", { n: found }), line: T("g.sound.line"), bestKey: st.id, bestValue: clean, higherBetter: true });
      }
      again.addEventListener("click", () => { if (phase === "pick") play(true); });
      ctx.hint(mode === "button", () => { if (busy || hinted || phase !== "pick") return; if (dimOne()) { hinted = true; hints++; } });
      return {
        start() { ctx.timer.start(); nextRound(); },
        resize: layout,
        soundChanged() { if (phase === "pick") play(false); },
        destroy() { busy = true; phase = "done"; nudge.stop(); },
        test: { state: () => ({ phase, busy, round, step, seq: st.seq, answer: answerIdx(), answers: answers.map((a) => a.k), deck: deck.map((d) => d.k),
          groups: deck.map((d) => d.g), found, clean, mistakes, hints, replays, plays, lastSaid, bubble: bubble.textContent, bubbleOn: bubble.classList.contains("on"),
          quiet: !audible(), mode, nudgeShown: nudge.shown(), nudgeVisible: nudge.visible() }) },
      };
    },
  });
})();
