/* 누가 뭐 해요? (문장만들기) — 말·언어 방
   위의 그림 줄 [누구][하는 일][무엇]을 보고, 낱말 카드를 눌러 빈 칸을 순서대로 채워 "토끼가 딸기를 먹어요" 같은 말을 만들어요.
   다 만들면 말풍선에 문장이 나오고, 아이나 어른이 "말했어요"(또는 작은 "다음")를 눌러요. 말소리는 듣지도 가리지도 않아요.
   - 지금 칸에 맞지 않는 카드를 누르면 그 카드만 잠깐 흐려지고 "다른 카드를 찾아 봐요" (빨간 X·흔들기 없음)
   - 7단계는 거꾸로: 글자 문장(+소리)을 보고 그림 줄 3개 중 고르기. 8단계는 정답 없이 마음대로.
   - 낱말 그림은 core.js 의 JN.WORDS / JN.wordArt, 조사는 JN.josa, 소리는 JN.speak (기기 안 음성만). */
"use strict";
(function () {
  const U = JN.util, h = U.h, shuffle = U.shuffle, pick = U.pick, josa = U.josa;
  const ANIMALS = ["강아지", "고양이", "토끼", "곰", "오리", "코끼리"];
  const STATES = [{ w: "자요", face: "쉬어요" }, { w: "웃어요", face: "웃음" }, { w: "놀라요", face: "놀람" }, { w: "응원해요", face: "응원" }];
  /* 하는 일과 어울리는 무엇 (짝이 맞는 것만 문제로 내요) */
  const VERBS = { 먹어요: ["과일"], 타요: ["탈것"], 좋아해요: ["과일", "꽃", "곤충", "탈것"], 봐요: ["꽃", "곤충", "탈것"] };
  const STAGES = [
    { id: "s1", name: "누가 어때요?", type: "state", n: 2, states: ["자요", "웃어요"] },
    { id: "s2", name: "누가 어때요? 더", type: "state", n: 3, states: ["자요", "웃어요", "놀라요", "응원해요"] },
    { id: "s3", name: "누가 무엇을 먹어요", type: "act", n: 3, verbs: ["먹어요"], fixVerb: true },
    { id: "s4", name: "누가 무엇을 해요", type: "act", n: 3, verbs: ["먹어요", "타요"] },
    { id: "s5", name: "하는 일 더 많이", type: "act", n: 4, verbs: ["먹어요", "타요", "좋아해요", "봐요"] },
    { id: "s6", name: "둘이서 해요", type: "two", n: 3, verbs: ["먹어요", "타요", "좋아해요"] },
    { id: "s7", name: "말 읽고 장면 찾기", type: "read", n: 3, verbs: ["먹어요", "타요", "좋아해요", "봐요"] },
    { id: "s8", name: "내 마음대로 말 만들기", type: "free", n: 4 },
  ];
  const PER_GAME = 5, T = { okMs: 700, missMs: 1200 };
  const art = {
    who: (w) => Art.animal(w, { face: "웃음", label: w }),
    what: (w) => JN.wordArt(w),
    verb: (v) => Art.action(v, { label: v }),
    state: (s) => Art.face(STATES.find((x) => x.w === s).face, { label: s }),
  };
  const wordsOf = (cats) => JN.WORDS.filter((x) => cats.includes(x.cat)).map((x) => x.w);
  /* 후보 카드: 정답 + 다른 것 (n-1개) */
  const cands = (answer, pool, n) => shuffle([answer].concat(shuffle(pool.filter((x) => x !== answer)).slice(0, n - 1)));

  /* 한 문장 만들기. slot: { label, kind, answer, cards:[낱말], text(낱말) → 카드 글자, part(그림 줄 자리) } */
  function makeSentence(st, prev) {
    let who, what, verb, state, who2;
    for (let t = 0; t < 20; t++) {
      who = pick(ANIMALS);
      if (st.type === "state") state = pick(st.states);
      else if (st.type !== "free") { verb = pick(st.verbs); what = pick(wordsOf(VERBS[verb])); }
      if (st.type === "two") { who2 = pick(ANIMALS.filter((a) => a !== who)); }
      if (!prev || prev.key !== [who, what, verb, state].join()) break;
    }
    const S = { key: [who, what, verb, state].join(), slots: [], pics: [] };
    if (st.type === "state") {
      S.pics = [{ kind: "who", w: who }, { kind: "state", w: state }];
      S.slots = [{ label: "누가", kind: "who", answer: who, pool: ANIMALS, text: (w) => josa(w, "이/가"), part: 0 },
        { label: "어때요", kind: "state", answer: state, pool: st.states, text: (w) => w, part: 1 }];
    } else if (st.type === "two") {
      S.pics = [{ kind: "who", w: who }, { kind: "who", w: who2 }, { kind: "verb", w: verb }, { kind: "what", w: what }];
      S.slots = [{ label: "누구와", kind: "who", answer: who, pool: ANIMALS.filter((a) => a !== who2), text: (w) => josa(w, "과/와"), part: 0 },
        { label: "누가", kind: "who", answer: who2, pool: ANIMALS.filter((a) => a !== who), text: (w) => josa(w, "이/가"), part: 1 },
        { label: "무엇을", kind: "what", answer: what, pool: wordsOf(VERBS[verb]), text: (w) => josa(w, "을/를"), part: 3 },
        { label: "어떻게", kind: "verb", answer: verb, pool: st.verbs, text: (w) => w, part: 2 }];
    } else if (st.type === "free") {
      const all = JN.WORDS.map((x) => x.w);
      S.pics = [];
      S.slots = [{ label: "누가", kind: "who", free: true, cards: shuffle(ANIMALS.slice()).slice(0, st.n), text: (w) => josa(w, "이/가"), part: 0 },
        { label: "무엇을", kind: "what", free: true, cards: shuffle(all.slice()).slice(0, st.n), text: (w) => josa(w, "을/를"), part: 2 },
        { label: "어떻게", kind: "verb", free: true, cards: Object.keys(VERBS), text: (w) => w, part: 1 }];
    } else {
      S.pics = [{ kind: "who", w: who }, { kind: "verb", w: verb }, { kind: "what", w: what }];
      // 무엇 후보: 하는 일이 하나(먹어요)면 과일끼리, 여럿이면 여러 종류에서 (정답은 그림 줄이 정해요)
      const whatPool = st.verbs.length > 1 ? wordsOf(["과일", "탈것", "꽃", "곤충"]) : wordsOf(VERBS[verb]);
      S.slots = [{ label: "누가", kind: "who", answer: who, pool: ANIMALS, text: (w) => josa(w, "이/가"), part: 0 },
        { label: "무엇을", kind: "what", answer: what, pool: whatPool, text: (w) => josa(w, "을/를"), part: 2 },
        { label: "어떻게", kind: "verb", answer: verb, pool: st.fixVerb ? [verb] : st.verbs, text: (w) => w, part: 1, fixed: !!st.fixVerb }];
    }
    for (const s of S.slots) if (!s.cards) s.cards = s.fixed ? [s.answer] : cands(s.answer, s.pool, s.kind === "verb" ? Math.min(st.n, s.pool.length) : st.n);
    return S;
  }
  const sentenceText = (S, picks) => S.slots.map((s, i) => s.text(picks ? picks[i] : s.answer)).join(" ");
  /* 7단계: 같은 문장에서 한 가지만 다른 그림 줄 2개 */
  function readChoices(S, st) {
    const base = S.pics.map((p) => Object.assign({}, p)), rows = [base], seen = new Set([JSON.stringify(base)]);
    for (let t = 0; rows.length < 3 && t < 40; t++) {
      const r = base.map((p) => Object.assign({}, p)), k = pick([0, 1, 2]);
      if (k === 0) r[0].w = pick(ANIMALS.filter((a) => a !== base[0].w));
      else if (k === 1) { const v = pick(st.verbs.filter((x) => x !== base[1].w)); if (!VERBS[v].includes(JN.word(base[2].w).cat)) continue; r[1].w = v; }
      else r[2].w = pick(wordsOf(VERBS[base[1].w]).filter((w) => w !== base[2].w));
      const key = JSON.stringify(r); if (seen.has(key)) continue;
      seen.add(key); rows.push(r);
    }
    const order = shuffle(rows.map((r, i) => i));
    return { rows: order.map((i) => rows[i]), answer: order.indexOf(0) };
  }

  JN.registerGame({
    id: "문장만들기", stages: STAGES,
    hintHelp: { always: "지금 채울 칸에 해당하는 그림에 연한 테두리가 늘 보여요",
      button: "누르면 지금 칸에 해당하는 그림에 테두리가 생기고 맞는 카드가 살짝 커져요 (칸 수만큼)", none: "도움 없이 만들어요" },
    extraSettings: [{ key: "wordSound", type: "select", label: "낱말 소리", sub: "이게 뭐야?와 같은 값이에요. 버튼 누를 때만 기기 안 음성으로 읽어요",
      def: "tap", options: [["tap", "버튼 누를 때만"], ["off", "끔"]], shareWith: ["낱말그림"] }],
    parentNote: "그림 위주라 글자를 못 읽어도 할 수 있어요. 3~5세는 어른이 곁에서 카드 글자를 같이 읽어 주세요. '말했어요'는 아이나 어른이 눌러요(말소리를 듣거나 가리지 않아요)",
    chart: { key: "time", label: "걸린 시간", unit: "초" },
    describe: (e) => (e.sentences || PER_GAME) + "문장 · " + U.fmtTime(e.time) + (e.stageNo === 8 ? " · 마음대로 만들기" : " · 다시 고른 " + (e.mistakes || 0) + "번") + (e.hints ? " · 힌트 " + e.hints + "번" : ""),
    intro: (st) => st.type === "read" ? "말을 읽고 그림을 찾아요" : st.type === "free" ? "마음대로 골라요. 웃긴 말도 좋아요!" : "그림을 보고 말을 만들어요",
    mount(ctx) {
      const st = ctx.stage, set = ctx.settings, mode = set.hintMode, board = ctx.board;
      board.classList.add("sn-board");
      const picsEl = h("div", { class: "sn-pics", id: "snPics" });
      const slotsEl = h("div", { class: "sn-slots", id: "snSlots" });
      const area = h("div", { class: "sn-area", id: "snArea" });
      board.append(picsEl, slotsEl, area);
      const prog = h("span", { class: "qprog" }); ctx.status(prog);
      let qi = -1, S = null, si = 0, picks = [], busy = true, mistakes = 0, hints = 0, said = 0, heard = 0, hinted = 0, read = null, phase = "wait", alive = true;
      const canSpeak = () => !!set.sound && set.wordSound !== "off" && JN.speakAvailable();
      const wantSpeak = () => !!set.sound && set.wordSound !== "off";
      function speakSlot(text) {
        const slot = h("span", { class: "wd-spk" }); slot.dataset.text = text; fillSpeak(slot); return slot;
      }
      function fillSpeak(slot) {
        slot.textContent = "";
        if (canSpeak()) {
          const b = h("button", { type: "button", class: "speak", id: "snSpeak", "aria-label": "소리 듣기", svg: Art.icon("소리켬") });
          U.tap(b, () => { if (JN.speak(slot.dataset.text)) heard++; });
          slot.appendChild(b);
        } else if (wantSpeak()) slot.appendChild(h("span", { class: "wd-nosound", text: "소리가 안 나요. 어른이 읽어 주세요" }));
      }
      const refreshSpeak = () => board.querySelectorAll(".wd-spk").forEach(fillSpeak);
      function paintProg() {
        prog.textContent = "";
        const d = h("span", { class: "jn-dots", "aria-hidden": "true" });
        for (let i = 0; i < PER_GAME; i++) d.appendChild(h("i", { class: i < qi ? "on" : i === qi ? "now" : null }));
        prog.append(d, " " + (qi + 1) + " / " + PER_GAME);
      }
      const picSvg = (p) => art[p.kind](p.w);
      function paintPics(list, el) {
        el.textContent = "";
        list.forEach((p, i) => el.appendChild(h("span", { class: "part", "data-part": String(i), svg: picSvg(p) })));
      }
      function paintSlots() {
        slotsEl.textContent = ""; slotsEl.classList.toggle("four", S.slots.length > 3);
        S.slots.forEach((s, i) => {
          const filled = i < si || s.fixed;
          slotsEl.appendChild(h("div", { class: "sn-slot" + (filled ? " on" : i === si ? " now" : "") },
            h("small", { text: s.label }), h("b", { text: filled ? s.text(s.fixed ? s.answer : picks[i]) : "" })));
        });
        // 늘 보기: 지금 칸에 해당하는 그림 부분에 테두리
        picsEl.querySelectorAll(".part").forEach((p) => p.classList.remove("hl"));
        if (mode === "always" && S.slots[si] && !S.slots[si].free) { const p = picsEl.children[S.slots[si].part]; if (p) p.classList.add("hl"); }
      }
      function paintCards() {
        area.textContent = ""; area.className = "sn-area";
        const s = S.slots[si];
        const grid = h("div", { class: "sn-grid", id: "snGrid" });
        s.cards.forEach((w, k) => {
          const b = h("button", { type: "button", class: "sn-card", "data-k": String(k), "aria-label": s.text(w) },
            h("i", { svg: art[s.kind](w) }), h("b", { text: s.text(w) }));
          U.tap(b, () => choose(k));
          grid.appendChild(b);
        });
        area.appendChild(grid);
        layout();
        phase = "pick";
        ctx.say(st.type === "free" ? "마음대로 골라요. 웃긴 말도 좋아요!" : "카드를 눌러서 칸에 넣어요");
      }
      function nextSlot() {
        while (S.slots[si] && S.slots[si].fixed) si++;
        paintSlots();
        if (si >= S.slots.length) return complete();
        paintCards();
        busy = false;
      }
      function choose(k) {
        if (busy) return;
        const s = S.slots[si], b = area.querySelector('[data-k="' + k + '"]');
        if (!b || b.classList.contains("miss")) return;
        if (s.free || s.cards[k] === s.answer) {
          picks[si] = s.cards[k]; si++; busy = true;
          ctx.sound("tap");
          b.classList.add("picked");
          ctx.later(() => { busy = false; nextSlot(); }, 250 / JN.TIME_SCALE);
          return;
        }
        mistakes++;
        b.classList.add("miss");
        const note = h("span", { class: "again-note", text: "다른 카드를 찾아 봐요" });
        b.appendChild(note);
        ctx.later(() => { b.classList.remove("miss"); note.remove(); }, T.missMs / JN.TIME_SCALE);
      }
      /* 다 만들었으면: 말풍선 문장 + 소리 + 말했어요 / 다음 */
      function complete() {
        busy = true; phase = "said";
        const text = sentenceText(S, st.type === "free" ? picks : null);
        if (st.type === "free") {   // 고른 대로 그림 줄을 보여 줘요
          paintPics([{ kind: "who", w: picks[0] }, { kind: "verb", w: picks[2] }, { kind: "what", w: picks[1] }], picsEl);
          picsEl.hidden = false;
        }
        picsEl.querySelectorAll(".part").forEach((p) => p.classList.remove("hl"));
        area.textContent = ""; area.className = "sn-area done";
        const sayBtn = h("button", { type: "button", class: "jn-btn jn-btn--primary jn-btn--big wd-said", id: "snSaid", svg: Art.icon("확인") }, "말했어요");
        const skip = h("button", { type: "button", class: "jn-btn jn-btn--quiet", id: "snNext" }, "다음");
        U.tap(sayBtn, () => { if (phase !== "said") return; said++; ctx.sound("ok"); next(); });
        U.tap(skip, () => { if (phase === "said") next(); });
        area.append(...[h("div", { class: "sn-bubble jn-bubble jn-pop" }, speakSlot(text), h("b", { id: "snText", text })),
          st.type === "free" ? h("p", { class: "sn-fun", text: "웃긴 말도 좋아요!" }) : null,
          h("div", { class: "sn-btns" }, sayBtn, skip)].filter(Boolean));
        ctx.say(st.type === "free" ? "어떤 말이 됐을까요? 읽어 봐요" : "말을 잘 만들었어요! 읽어 봐요");
      }
      /* 7단계: 글자 문장 → 그림 줄 고르기 */
      function paintRead() {
        const text = sentenceText(S);
        picsEl.hidden = true; slotsEl.textContent = "";
        slotsEl.appendChild(h("div", { class: "sn-bubble jn-bubble sn-q" }, speakSlot(text), h("b", { id: "snText", text })));
        read = readChoices(S, st);
        area.textContent = ""; area.className = "sn-area";
        const list = h("div", { class: "sn-rows", id: "snRows" });
        read.rows.forEach((r, k) => {
          const b = h("button", { type: "button", class: "sn-rowbtn", "data-k": String(k), "aria-label": "그림 줄 " + (k + 1) });
          r.forEach((p) => b.appendChild(h("span", { class: "part", svg: picSvg(p) })));
          U.tap(b, () => chooseRow(k));
          list.appendChild(b);
        });
        area.appendChild(list);
        phase = "pick"; busy = false;
        ctx.say("말을 읽고 맞는 그림을 찾아요");
      }
      function chooseRow(k) {
        if (busy) return;
        const b = area.querySelector('[data-k="' + k + '"]');
        if (!b || b.classList.contains("miss")) return;
        if (k === read.answer) {
          busy = true; b.classList.add("right"); JN.markRight(b); ctx.sound("ok");
          ctx.later(() => { picsEl.hidden = false; paintPics(S.pics, picsEl); slotsEl.textContent = ""; complete(); }, T.okMs / JN.TIME_SCALE);
          return;
        }
        mistakes++;
        b.classList.add("miss");
        const note = h("span", { class: "again-note", text: "다시 찾아 봐요" });
        b.appendChild(note);
        ctx.later(() => { b.classList.remove("miss"); note.remove(); }, T.missMs / JN.TIME_SCALE);
      }
      function layout() {
        const grid = area.querySelector(".sn-grid"); if (!grid) return;
        const n = grid.children.length, gap = 10, Wd = area.clientWidth - 4, Hd = area.clientHeight - 4;
        if (Wd < 40 || Hd < 40) return;
        let best = { cols: 1, w: 0, hh: 0, score: 0 };
        for (let cols = 1; cols <= n; cols++) {
          const rows = Math.ceil(n / cols);
          const w = Math.min((Wd - gap * (cols - 1)) / cols, 190), hh = Math.min((Hd - gap * (rows - 1)) / rows, w * 0.95, 170);
          const score = Math.min(w, hh * 1.25);
          if (score > best.score) best = { cols, w, hh, score };
        }
        const w = Math.max(80, Math.floor(best.w)), hh = Math.max(64, Math.floor(best.hh));
        grid.style.gridTemplateColumns = "repeat(" + best.cols + ", " + w + "px)";
        for (const b of grid.children) { b.style.width = w + "px"; b.style.height = hh + "px"; }
      }
      function next() {
        if (!alive) return;
        qi++;
        if (qi >= PER_GAME) return end();
        S = makeSentence(st, S); si = 0; picks = []; hinted = 0;
        paintProg();
        picsEl.hidden = st.type === "free";
        if (st.type === "read") return paintRead();
        paintPics(S.pics, picsEl);
        nextSlot();
      }
      function end() {
        busy = true; phase = "end";
        const time = ctx.timer.stop();
        ctx.finish({ cleared: st.type === "free" ? true : mistakes <= 2, time, mistakes, hints, metrics: { said, heard, sentences: PER_GAME },
          title: "말을 잘 만들었어요!", line: "말했어요 " + said + "번" });
      }
      ctx.hint(mode === "button" && st.type !== "free", () => {
        if (busy || !S || phase !== "pick") return;
        if (st.type === "read") {   // 7단계: 다른 그림 줄 하나 흐리게
          const w = [...area.querySelectorAll(".sn-rowbtn")].filter((b) => +b.dataset.k !== read.answer && !b.classList.contains("faded"));
          if (!w.length || hinted >= 1) return;
          hinted++; hints++; pick(w).classList.add("faded"); return;
        }
        const s = S.slots[si]; if (!s || hinted >= S.slots.length) return;
        hinted++; hints++;
        const p = picsEl.children[s.part]; if (p) p.classList.add("hl");
        const b = area.querySelector('[data-k="' + s.cards.indexOf(s.answer) + '"]'); if (b) b.classList.add("big");
      });
      const unVoices = JN.onVoices(() => { if (alive) refreshSpeak(); });
      return {
        start() { ctx.timer.start(); next(); },
        resize: layout,
        soundChanged() { if (alive) refreshSpeak(); },
        destroy() { alive = false; busy = true; unVoices(); JN.speakStop(); },
        test: {
          state: () => ({ type: st.type, qi, n: PER_GAME, busy, phase, si,
            answer: !S || busy ? -1 : st.type === "read" ? (read ? read.answer : -1) : S.slots[si] ? (S.slots[si].free ? 0 : S.slots[si].cards.indexOf(S.slots[si].answer)) : -1,
            text: S ? sentenceText(S, st.type === "free" ? picks : null) : "" }),
          make: (i) => { const s = makeSentence(STAGES[i]); return { text: sentenceText(s), slots: s.slots.map((x) => ({ cards: x.cards.slice(), answer: x.answer })) }; },
        },
      };
    },
  });
})();
