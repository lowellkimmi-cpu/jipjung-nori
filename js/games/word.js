/* 이게 뭐야? (낱말그림) — 말·언어 방
   1~2단계: 그림 친구를 보고 입으로 이름을 말한 뒤 "말했어요"(또는 작은 "다음")를 눌러요. 말소리는 듣지도 가리지도 않아요.
   3~8단계: 소리(기기 안 음성)나 글자로 알려 준 그림을 손가락으로 찾아요. 누르는 것만 맞고 틀림을 봐요.
   - 마이크·카메라·녹음 없음. 바깥 요청 없음. 낱말 소리는 JN.speak (기기 안 한국어 음성만) — 없으면 소리 단추를 숨겨요.
   - 다른 그림을 누르면 그 칸만 잠깐 흐려지고 "다시 찾아 봐요" 쪽지 (빨간 X·흔들기 없음). */
"use strict";
(function () {
  const U = JN.util, h = U.h, shuffle = U.shuffle, pick = U.pick;
  const STAGES = [
    { id: "w1", name: "과일 친구 이름", mode: "say", count: 5, pool: "fruit" },
    { id: "w2", name: "동물·탈것 친구 이름", mode: "say", count: 6, pool: "all" },
    { id: "w3", name: "듣고 찾기 (2장)", mode: "find", count: 5, cands: 2 },
    { id: "w4", name: "듣고 찾기 (4장)", mode: "find", count: 6, cands: 4, sameCat: true },
    { id: "w5", name: "두 가지 심부름", mode: "order", count: 5, cands: 6, targets: 2 },
    { id: "w6", name: "세 가지 심부름", mode: "order", count: 5, cands: 8, targets: 3 },
    { id: "w7", name: "글자 보고 찾기", mode: "read", count: 6, cands: [4, 4, 4, 6, 6, 6] },
    { id: "w8", name: "처음 소리가 같은 친구", mode: "sound", count: 5, cands: 8, targets: 3 },
  ];
  /* 8단계: 처음 소리가 같은 묶음 (기획서 3-1) — 글자 이름(기역)은 쓰지 않고 기준 그림으로만 */
  const SOUND_GROUPS = [["강아지", "고양이", "곰", "귤", "기차", "개미"], ["바나나", "버스", "배", "벌", "비행기"]];
  const SOUND_OTHERS = ["사과", "수박", "포도", "토끼", "튤립", "딸기", "오리", "코끼리", "나비", "무당벌레", "해바라기"];
  const T = { okMs: 1100, missMs: 1200 };
  const W = () => JN.WORDS;

  function makeQuestions(st) {
    const qs = [];
    if (st.mode === "say") {
      let pool = st.pool === "fruit" ? W().filter((x) => x.kind === "fruit") : W().slice();
      if (st.pool === "all") {   // 종류가 섞이게: 과일·동물·탈것·곤충·꽃에서 고루
        const byCat = {}; for (const x of shuffle(pool)) (byCat[x.cat] = byCat[x.cat] || []).push(x);
        pool = []; const cats = shuffle(Object.keys(byCat));
        for (let r = 0; pool.length < st.count; r++) for (const c of cats) if (byCat[c][r] && pool.length < st.count) pool.push(byCat[c][r]);
      } else pool = shuffle(pool).slice(0, st.count);
      return pool.map((x) => ({ words: [x], targets: [0] }));
    }
    if (st.mode === "sound") {
      for (let i = 0; i < st.count; i++) {
        const g = shuffle(pick(SOUND_GROUPS).slice());
        const base = g[0], tg = g.slice(1, 1 + st.targets), others = shuffle(SOUND_OTHERS.slice()).slice(0, st.cands - st.targets);
        const words = shuffle(tg.concat(others)).map((w) => JN.word(w));
        qs.push({ base: JN.word(base), words, targets: tg.map((w) => words.findIndex((x) => x.w === w)) });
      }
      return qs;
    }
    let last = "";
    for (let i = 0; i < st.count; i++) {
      const n = Array.isArray(st.cands) ? st.cands[i] : st.cands;
      let pool = W().slice();
      if (st.mode === "read") pool = pool.filter((x) => x.w.length >= 2 && x.w.length <= 3);
      if (st.sameCat) { const cat = pick(["과일", "동물", "탈것", "곤충"]); pool = pool.filter((x) => x.cat === cat); }
      let words, tries = 0;
      do { words = shuffle(pool.slice()).slice(0, n); tries++; } while (words[0].w === last && tries < 10);
      const k = st.targets || 1;
      const tWords = words.slice(0, k);   // 앞쪽 k개가 부를 낱말 (순서대로)
      last = tWords[0].w;
      const shown = shuffle(words.slice());
      qs.push({ words: shown, targets: tWords.map((x) => shown.indexOf(x)) });
    }
    return qs;
  }

  JN.registerGame({
    id: "낱말그림", stages: STAGES,
    hintHelp: {
      always: "1~2단계는 그림 아래 낱말 글자가 늘 보여요. 3~7단계는 부른 그림이 조금 크게 놓여요. 8단계는 기준 그림 이름이 늘 보여요",
      button: "1~2단계는 누르면 글자가 나타나요. 3~7단계는 누를 때마다 다른 그림이 하나씩 흐려져요. 8단계는 기준 그림 이름이 나타나요",
      none: "도움 없이 그림만 봐요",
    },
    extraSettings: [{ key: "wordSound", type: "select", label: "낱말 소리", sub: "버튼 누를 때만 기기 안 음성으로 읽어요. '소리'가 켜져 있고 기기에 한국어 음성이 있을 때만 단추가 보여요",
      def: "tap", options: [["tap", "버튼 누를 때만"], ["off", "끔"]], shareWith: ["문장만들기", "감정표정"] }],
    parentNote: "말하기 단계는 아이나 어른이 '말했어요'를 눌러요. 말소리를 듣거나 맞고 틀림을 가리지 않아요. 3~5세는 그림 위주로, 글자는 어른이 읽어 줘도 돼요",
    chart: { key: "time", label: "걸린 시간", unit: "초" },
    describe: (e) => e.said != null && e.stageNo <= 2
      ? (e.words || 0) + "낱말 · " + U.fmtTime(e.time) + " · 말했어요 " + (e.said || 0) + "번"
      : (e.words || 0) + "낱말 · " + U.fmtTime(e.time) + " · 다시 찾은 " + (e.mistakes || 0) + "번" + (e.hints ? " · 힌트 " + e.hints + "번" : ""),
    intro: (st) => st.mode === "say" ? "그림 친구 이름을 말해 봐요" : st.mode === "read" ? "글자를 보고 그림을 찾아 봐요"
      : st.mode === "sound" ? "처음 소리가 같은 친구를 찾아 봐요" : st.mode === "order" ? "부르는 순서대로 찾아 봐요" : "이름을 듣고 찾아 봐요",
    mount(ctx) {
      const st = ctx.stage, set = ctx.settings, mode = set.hintMode, board = ctx.board;
      board.classList.add("wd-board");
      const top = h("div", { class: "wd-top" });
      const main = h("div", { class: "wd-main" });
      const foot = h("div", { class: "wd-foot" });
      board.append(top, main, foot);
      const prog = h("span", { class: "qprog" }); ctx.status(prog);
      const qs = makeQuestions(st);
      let qi = -1, q = null, busy = true, said = 0, heard = 0, mistakes = 0, hints = 0, step = 0, found = [], faded = 0, revealed = false, alive = true;
      let unVoices = () => {};

      const canSpeak = () => !!set.sound && set.wordSound !== "off" && JN.speakAvailable();
      const wantSpeak = () => !!set.sound && set.wordSound !== "off";
      /* 소리 단추 자리(.wd-spk): 음성이 있고 소리가 켜져 있을 때만 단추, 소리를 켰는데 음성이 없으면 안내 글, 아니면 비워요 */
      function speakBtn(text, big) {
        const slot = h("span", { class: "wd-spk" + (big ? " big" : "") });
        slot.dataset.text = text;
        fillSpeak(slot);
        return slot;
      }
      function fillSpeak(slot) {
        slot.textContent = "";
        if (canSpeak()) {
          const b = h("button", { type: "button", class: "speak" + (slot.classList.contains("big") ? " big" : ""), id: "wdSpeak", "aria-label": "소리 듣기", svg: Art.icon("소리켬") });
          U.tap(b, () => { if (JN.speak(slot.dataset.text)) heard++; });
          slot.appendChild(b);
        } else if (wantSpeak()) slot.appendChild(h("span", { class: "wd-nosound", text: "소리가 안 나요. 어른이 읽어 주세요" }));
      }
      const refreshSpeak = () => board.querySelectorAll(".wd-spk").forEach(fillSpeak);
      function paintProg() {
        prog.textContent = "";
        prog.appendChild(leaves(qs.length, qi));
        prog.appendChild(document.createTextNode(" " + (qi + 1) + " / " + qs.length));
      }
      function leaves(n, idx) {
        const d = h("span", { class: "jn-dots", "aria-hidden": "true" });
        for (let i = 0; i < n; i++) d.appendChild(h("i", { class: i < idx ? "on" : i === idx ? "now" : null }));
        return d;
      }
      const promptText = () => {
        if (st.mode === "find") return q.words[q.targets[0]].w + " 어디 있어요?";
        if (st.mode === "order") {   // "사과, 그다음 버스를 눌러요"
          const ws = q.targets.map((t) => q.words[t].w), last = ws.pop();
          return ws.concat(U.josa(last, "을/를")).join(", 그다음 ") + " 눌러요";
        }
        if (st.mode === "read") return "이 글자의 그림을 찾아요";
        return "이 그림과 처음 소리가 같은 친구 " + q.targets.length + "개를 찾아요";
      };
      const speakText = () => st.mode === "find" ? promptText() : st.mode === "order" ? q.targets.map((t) => q.words[t].w).join(", 그다음 ")
        : st.mode === "read" ? q.words[q.targets[0]].w : q.base.w;

      /* ---------- 1~2단계: 보고 말하기 ---------- */
      function paintSay() {
        const it = q.words[0];
        top.textContent = ""; main.textContent = ""; foot.textContent = "";
        top.hidden = true;
        const nameShown = mode === "always" || revealed;
        main.appendChild(h("div", { class: "wd-say" },
          h("div", { class: "wd-pic jn-float", svg: JN.wordArt(it, { face: "웃음" }) }),
          h("div", { class: "wd-namerow" }, speakBtn(it.w, true), h("b", { class: "wd-name" + (nameShown ? "" : " hide"), id: "wdName", text: it.w, "aria-hidden": nameShown ? null : "true" }))));
        const sayBtn = h("button", { type: "button", class: "jn-btn jn-btn--primary jn-btn--big wd-said", id: "wdSaid", svg: Art.icon("확인") }, "말했어요");
        const skip = h("button", { type: "button", class: "jn-btn jn-btn--quiet wd-skip", id: "wdNext" }, "다음");
        U.tap(sayBtn, () => { if (busy) return; said++; ctx.sound("ok"); next(); });
        U.tap(skip, () => { if (!busy) next(); });
        foot.append(sayBtn, skip);
        ctx.say("이게 뭐야? 이름을 말해 봐요");
      }

      /* ---------- 3~8단계: 찾기 ---------- */
      function paintFind() {
        top.textContent = ""; main.textContent = ""; foot.textContent = "";
        top.hidden = false;
        const ptxt = promptText();
        const row = h("div", { class: "wd-prompt" });
        row.appendChild(speakBtn(speakText(), false));
        if (st.mode === "read") row.appendChild(h("b", { class: "wd-readword", id: "wdRead", text: q.words[q.targets[0]].w }));
        else if (st.mode === "sound") {
          const showBase = mode === "always" || revealed;
          row.appendChild(h("span", { class: "wd-base" },
            h("i", { svg: JN.wordArt(q.base, { face: "웃음", label: "기준 그림" }) }), h("b", { class: showBase ? null : "hide", text: q.base.w })));
        }
        row.appendChild(h("span", { class: "wd-ptext", text: st.mode === "read" ? "" : ptxt }));
        top.appendChild(row);
        if (st.mode === "order" || st.mode === "sound") {
          const slots = h("div", { class: "wd-slots", "aria-hidden": "true" });
          q.targets.forEach((t, i) => {
            const done = st.mode === "order" ? i < step : i < found.length;
            const w = done ? (st.mode === "order" ? q.words[q.targets[i]] : q.words[found[i]]) : null;
            slots.appendChild(h("span", { class: "slot" + (done ? " on" : ""), svg: w ? JN.wordArt(w, { face: "웃음" }) : null }, w ? null : String(i + 1)));
          });
          top.appendChild(slots);
        }
        const grid = h("div", { class: "wd-grid", id: "wdGrid" });
        q.words.forEach((w, k) => {
          const b = h("button", { type: "button", class: "wd-tile", "data-k": String(k), "aria-label": w.w },
            h("span", { class: "art", svg: JN.wordArt(w) }), h("b", { class: "nm", text: w.w }));
          U.tap(b, () => choose(k));
          grid.appendChild(b);
        });
        main.appendChild(grid);
        markExpected();
        layout();
        ctx.say(st.mode === "read" ? "글자를 보고 그림을 찾아요" : st.mode === "sound" ? "처음 소리가 같은 친구를 찾아요"
          : st.mode === "order" ? "부르는 순서대로 눌러요" : "이름을 듣고 찾아 봐요");
      }
      function expectedSet() {
        if (st.mode === "order") return [q.targets[step]];
        if (st.mode === "sound") return q.targets.filter((t) => !found.includes(t));
        return q.targets.slice();
      }
      function markExpected() {
        const grid = main.querySelector(".wd-grid"); if (!grid) return;
        for (const b of grid.children) b.classList.remove("big");
        if (mode === "always" && st.mode !== "sound") { const e = expectedSet()[0]; if (grid.children[e]) grid.children[e].classList.add("big"); }
      }
      function choose(k) {
        if (busy) return;
        const grid = main.querySelector(".wd-grid"), b = grid.children[k];
        if (!b || b.classList.contains("right") || b.classList.contains("miss")) return;
        if (expectedSet().includes(k)) {
          right(b, k);
          if (st.mode === "order") { step++; paintSlots(); if (step >= q.targets.length) return doneQ(); markExpected(); ctx.say("좋아요! 다음 것도 찾아요"); return; }
          if (st.mode === "sound") { found.push(k); paintSlots(); if (found.length >= q.targets.length) return doneQ(); ctx.say("찾았어요! 또 있어요"); return; }
          return doneQ();
        }
        mistakes++;
        b.classList.add("miss");
        const note = h("span", { class: "wd-again", text: "다시 찾아 봐요" });
        b.appendChild(note);
        ctx.later(() => { b.classList.remove("miss"); note.remove(); }, T.missMs / JN.TIME_SCALE);
      }
      function right(b, k) {
        const w = q.words[k];
        b.classList.add("right"); b.classList.remove("big", "faded");
        b.querySelector(".art").innerHTML = JN.wordArt(w, { face: "웃음" });
        JN.markRight(b);
        ctx.sound("ok");
      }
      function paintSlots() {
        const slots = top.querySelector(".wd-slots"); if (!slots) return;
        [...slots.children].forEach((s, i) => {
          const done = st.mode === "order" ? i < step : i < found.length;
          if (!done || s.classList.contains("on")) return;
          const w = st.mode === "order" ? q.words[q.targets[i]] : q.words[found[i]];
          s.classList.add("on"); s.textContent = ""; s.innerHTML = JN.wordArt(w, { face: "웃음" });
        });
      }
      function doneQ() {
        busy = true;
        ctx.say(pick(["잘 찾았어요!", "찾았어요!", "맞아요, 이거예요!"]));
        ctx.later(next, T.okMs / JN.TIME_SCALE);
      }
      function layout() {
        const grid = main.querySelector(".wd-grid"); if (!grid) return;
        const n = grid.children.length, gap = 12;
        const Wd = main.clientWidth - 8, Hd = main.clientHeight - 8;
        if (Wd < 40 || Hd < 40) return;
        let best = { cols: 1, s: 0 };
        for (let cols = 1; cols <= n; cols++) {
          const rows = Math.ceil(n / cols);
          const s = Math.min((Wd - gap * (cols - 1)) / cols, (Hd - gap * (rows - 1)) / rows, 220);
          if (s > best.s) best = { cols, s };
        }
        const s = Math.max(56, Math.floor(best.s)), rows = Math.ceil(n / best.cols);
        const th = Math.max(s, Math.min(Math.floor(s * 1.2), Math.floor((Hd - gap * (rows - 1)) / rows)));   // 세로가 남으면 조금 긴 종이 칸
        grid.style.gridTemplateColumns = "repeat(" + best.cols + ", " + s + "px)";
        grid.style.setProperty("--tile", s + "px");
        for (const b of grid.children) { b.style.width = s + "px"; b.style.height = th + "px"; }
      }
      function next() {
        if (!alive) return;
        qi++;
        if (qi >= qs.length) return end();
        q = qs[qi]; step = 0; found = []; faded = 0; revealed = false;
        paintProg();
        if (st.mode === "say") paintSay(); else paintFind();
        busy = false;
      }
      function end() {
        busy = true;
        const time = ctx.timer.stop(), say = st.mode === "say";
        const limit = st.mode === "sound" ? 3 : 2;
        ctx.finish({ cleared: say ? true : mistakes <= limit, time, mistakes, hints,
          metrics: { said, heard, words: qs.length },
          title: say ? "그림 친구를 모두 만났어요!" : "이름을 잘 찾았어요!",
          line: say ? "말했어요 " + said + "번" : "" });
      }
      ctx.hint(mode === "button", () => {
        if (busy || !q) return;
        if (st.mode === "say" || st.mode === "sound") {
          if (revealed) return;
          revealed = true; hints++;
          const n = st.mode === "say" ? main.querySelector("#wdName") : top.querySelector(".wd-base b");
          if (n) { n.classList.remove("hide"); n.removeAttribute("aria-hidden"); }
          return;
        }
        const grid = main.querySelector(".wd-grid"); if (!grid) return;
        const keep = expectedSet().concat(st.mode === "order" ? q.targets : []);
        const cand = [...grid.children].filter((b) => !keep.includes(+b.dataset.k) && !b.classList.contains("faded"));
        if (!cand.length || faded >= q.words.length - 2) return;
        hints++; faded++;
        pick(cand).classList.add("faded");
      });
      unVoices = JN.onVoices(() => { if (alive) refreshSpeak(); });
      return {
        start() { ctx.timer.start(); next(); },
        resize: layout,
        soundChanged() { if (alive) refreshSpeak(); },
        destroy() { alive = false; busy = true; unVoices(); JN.speakStop(); },
        test: {
          state: () => ({ mode: st.mode, qi, n: qs.length, busy, phase: !q || busy ? "wait" : st.mode === "say" ? "say" : "find", expected: q ? expectedSet() : [], said, heard }),
          questions: () => qs.map((x) => ({ words: x.words.map((w) => w.w), targets: x.targets, base: x.base ? x.base.w : null })),
          promptText: () => (q ? promptText() : ""),
        },
      };
    },
  });
})();
