/* 감정 표정 고르기 (감정표정) — 말·언어 방
   마음을 나타내는 낱말(기쁘다·슬프다·화나다·무섭다·놀랐다)과 얼굴 표정을 이어 봐요.
   - 쉬움(1~2단계): 낱말을 보고/듣고 맞는 표정 고르기
   - 보통(3~4단계): 표정을 보고 맞는 낱말 고르기
   - 어려움(5~6단계): 짧은 이야기(2~3문장)를 읽고, 주인공 기분에 맞는 표정을 고른 뒤 낱말도 고르기
   - 표정 그림은 이 파일에서 코드로 직접 그려요 (손그림풍 SVG, 색은 Art.COLORS · 선은 Art.INK). 사진·AI 그림·바깥 파일 없음.
   - 틀려도 벌 없음: 그 카드만 잠깐 흐려지고 "다시 찾아 봐요". 힌트(보호자 설정)와 "다시 읽어 줘요" 단추.
   - 이야기는 무섭거나 슬퍼도 끝에는 꼭 안심이 되게 끝나요.
   - 화면 문구는 아래 TXT 에 모아 뒀어요 (이 앱은 따로 언어 파일이 없어서 놀이마다 문구를 한곳에 둬요).
   - 소리는 JN.speak (기기 안 음성만). 마이크·카메라·바깥 요청 없음. 아이 이름·사진 등 개인정보 없음(이야기 속 이름은 지어낸 이름). */
"use strict";
(function () {
  const U = JN.util, h = U.h, shuffle = U.shuffle, pick = U.pick;

  const TXT = {
    name: "감정 표정 고르기",
    introW2F: "낱말에 맞는 표정을 찾아요",
    introF2W: "표정에 맞는 낱말을 찾아요",
    introStory: "이야기를 읽고 마음을 찾아요",
    sayW2F: "이 낱말에는 어떤 표정이 어울릴까요?",
    sayF2W: "이 표정은 어떤 마음일까요?",
    sayStoryFace: "주인공은 어떤 표정일까요?",
    sayStoryWord: "맞아요! 이 마음을 뭐라고 할까요?",
    again: "다시 찾아 봐요",
    reread: "다시 읽어 줘요",
    good: "잘 찾았어요!",
    title: "마음을 잘 찾았어요!",
    hintAlways: "맞는 카드가 살짝 커져서 늘 보여요",
    hintButton: "누르면 틀린 카드가 하나씩 흐려져요 (한 문제에 한 번 이상 눌러도 돼요)",
    hintNone: "도움 없이 찾아요",
    parentNote: "얼굴 표정과 마음 낱말을 이어 보는 놀이예요. 정답을 못 맞춰도 괜찮아요. 아이와 함께 \"너는 언제 이런 마음이었어?\" 하고 이야기해 보세요. 3~5세는 어른이 낱말과 이야기를 읽어 주세요",
  };

  /* 다섯 가지 마음: k=표정 이름, w=낱말 */
  const EM = [
    { k: "joy", w: "기쁘다" }, { k: "sad", w: "슬프다" }, { k: "angry", w: "화나다" },
    { k: "scared", w: "무섭다" }, { k: "surprised", w: "놀랐다" },
  ];
  const emOf = (k) => EM.find((e) => e.k === k);
  const ALL = EM.map((e) => e.k);

  /* 이야기 (아이 일상, 2~3문장). 무섭거나 슬픈 이야기도 마지막은 안심 */
  const STORIES = [
    { k: "joy", text: "민이가 새 장난감 자동차를 선물로 받았어요. 바퀴가 데굴데굴 잘 굴러가요. 민이는 방긋 웃으며 자동차를 꼭 안았어요." },
    { k: "sad", text: "소라의 곰 인형이 빨래통에 들어갔어요. 소라는 눈물이 또르르 났어요. 엄마가 꼭 안아 주었고, 인형은 보송보송해져서 돌아왔어요." },
    { k: "angry", text: "동생이 하준이가 쌓은 블록 탑을 와르르 무너뜨렸어요. 하준이는 얼굴이 빨개지고 주먹을 꽉 쥐었어요. 숨을 크게 세 번 쉬니 마음이 차분해졌어요." },
    { k: "scared", text: "깜깜한 밤에 천둥이 쿠르릉 울렸어요. 지아는 이불 속으로 쏙 숨었어요. 아빠가 옆에 와서 \"괜찮아, 아빠 여기 있어\" 하고 말해 주었어요." },
    { k: "surprised", text: "서윤이가 선물 상자를 열자 인형이 팡 하고 튀어나왔어요. 서윤이는 눈이 동그래졌어요. 친구가 몰래 준비한 선물이었어요." },
    { k: "sad", text: "비 오는 날, 도윤이는 친구와 놀이터에서 놀기로 했는데 비가 와서 못 나가게 됐어요. 도윤이는 시무룩했어요. 그런데 친구가 우산을 쓰고 놀러 와서 같이 블록놀이를 했어요." },
    { k: "joy", text: "친구가 \"같이 놀자!\" 하고 불러 주었어요. 유나는 친구 손을 잡고 신나게 달려갔어요. 둘이 깔깔깔 웃으며 놀았어요." },
    { k: "scared", text: "비 오는 날, 큰 강아지가 멍멍 짖으며 달려왔어요. 하늘이는 다리가 덜덜 떨렸어요. 강아지 주인이 얼른 와서 데려갔고, 엄마가 하늘이 손을 꼭 잡아 주었어요." },
    { k: "angry", text: "친구가 우진이 장난감을 말도 없이 가져갔어요. 우진이는 입을 꾹 다물고 \"내 거야!\" 하고 소리쳤어요. 친구가 \"미안해\" 하고 돌려주어서 함께 놀았어요." },
    { k: "surprised", text: "비가 그친 뒤 하늘에 커다란 무지개가 짠 하고 나타났어요. 나연이는 입이 떡 벌어졌어요. 엄마와 함께 한참 무지개를 바라보았어요." },
  ];

  const STAGES = [
    { id: "e1", name: "쉬움 1 · 낱말 듣고 표정 찾기", mode: "w2f", n: 2, pool: ["joy", "sad"], count: 5 },
    { id: "e2", name: "쉬움 2 · 낱말 듣고 표정 찾기 더", mode: "w2f", n: 3, pool: ALL, count: 5 },
    { id: "e3", name: "보통 1 · 표정 보고 낱말 찾기", mode: "f2w", n: 3, pool: ALL, count: 5 },
    { id: "e4", name: "보통 2 · 표정 보고 낱말 찾기 더", mode: "f2w", n: 5, pool: ALL, count: 5 },
    { id: "e5", name: "어려움 1 · 이야기 속 마음 찾기", mode: "story", n: 3, pool: ALL, count: 5 },
    { id: "e6", name: "어려움 2 · 이야기 속 마음 찾기 더", mode: "story", n: 5, pool: ALL, count: 5 },
  ];
  const T = { okMs: 900, missMs: 1200 };

  /* ---------- 표정 그림 (손그림풍, 코드로 직접) ---------- */
  const FILL = { joy: "#EFC25E", sad: "#B9CCDA", angry: "#E8A084", scared: "#CDBFD0", surprised: "#F1D57F" };
  function faceArt(k, label) {
    const C = Art.COLORS, INK = Art.INK, TX = Art.TEXT || INK;
    const pen = (d, w, col, extra) => '<path d="' + d + '" fill="none" stroke="' + (col || TX) + '" stroke-width="' + (w || 3.2) + '" stroke-linecap="round" stroke-linejoin="round"' + (extra || "") + "/>";
    const dot = (x, y, r) => '<ellipse cx="' + x + '" cy="' + y + '" rx="' + r + '" ry="' + (r * 1.1) + '" fill="' + TX + '"/><circle cx="' + (x + r * 0.35) + '" cy="' + (y - r * 0.4) + '" r="' + (r * 0.34) + '" fill="#FFF9EE"/>';
    const wide = (x, y, r, pr) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#FFF9EE" stroke="' + TX + '" stroke-width="2.4"/><circle cx="' + x + '" cy="' + (y + 0.6) + '" r="' + pr + '" fill="' + TX + '"/><circle cx="' + (x + pr * 0.4) + '" cy="' + (y - pr * 0.3) + '" r="' + (pr * 0.32) + '" fill="#FFF9EE"/>';
    const cheek = (x, y, op) => '<ellipse cx="' + x + '" cy="' + y + '" rx="7" ry="4.4" fill="' + C.cheek + '" opacity="' + op + '"/>';
    const drop = (x, y, s) => '<path d="M' + x + " " + y + " Q" + (x - 5 * s) + " " + (y + 9 * s) + " " + x + " " + (y + 12 * s) + " Q" + (x + 5 * s) + " " + (y + 9 * s) + " " + x + " " + y + 'Z" fill="#C4DDF0" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round"/>';
    let f = "";
    if (k === "joy") {
      f = pen("M29 48 Q36 38 43 48", 3.4) + pen("M57 48 Q64 38 71 48", 3.4) + cheek(24, 60, 0.55) + cheek(76, 60, 0.55) +
        '<path d="M33 60 Q50 82 67 60 Q50 65 33 60Z" fill="' + TX + '" stroke="' + TX + '" stroke-width="2" stroke-linejoin="round"/>' +
        '<path d="M42 71 Q50 66 58 71 Q50 77 42 71Z" fill="' + C.cheek + '"/>';
    } else if (k === "sad") {
      f = pen("M26 43 Q35 41 43 34", 3) + pen("M74 43 Q65 41 57 34", 3) + dot(36, 50, 3.7) + dot(64, 50, 3.7) +
        pen("M38 73 Q50 63 62 73", 3.2) + drop(29, 56, 1) + cheek(22, 64, 0.3) + cheek(78, 64, 0.3);
    } else if (k === "angry") {
      f = pen("M25 34 L44 43", 4) + pen("M75 34 L56 43", 4) + dot(36, 51, 3.5) + dot(64, 51, 3.5) +
        pen("M37 72 Q50 63 63 72", 3.4) + cheek(24, 62, 0.65) + cheek(76, 62, 0.65) +
        pen("M68 17 Q73 19 73 24 M82 17 Q77 19 77 24 M68 31 Q73 29 73 24 M82 31 Q77 29 77 24", 2.6, C.red);
    } else if (k === "scared") {
      f = pen("M26 37 L43 30", 3) + pen("M74 37 L57 30", 3) + wide(36, 47, 7, 2.4) + wide(64, 47, 7, 2.4) +
        pen("M35 71 Q40 64 45 71 Q50 78 55 71 Q60 64 65 71", 3.2) + drop(81, 32, 1.1);
    } else {
      f = pen("M27 31 Q35 22 43 31", 3) + pen("M57 31 Q65 22 73 31", 3) + wide(36, 47, 7.4, 3.4) + wide(64, 47, 7.4, 3.4) +
        '<ellipse cx="50" cy="71" rx="6" ry="8" fill="' + TX + '"/><ellipse cx="50" cy="74" rx="3.2" ry="3.4" fill="' + C.cheek + '" opacity=".8"/>' + cheek(23, 62, 0.4) + cheek(77, 62, 0.4);
    }
    const body = '<path d="M50 9 C73 8 92 27 91 51 C90 74 72 92 49 91 C27 90 8 73 9 49 C10 27 28 10 50 9Z" fill="' + FILL[k] + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M26 28 Q34 17 46 15" fill="none" stroke="#FFF9EE" stroke-width="4" stroke-linecap="round" opacity=".55"/>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="' + String(label).replace(/[&<>"]/g, "") + '" style="overflow:visible">' + body + f + "</svg>";
  }
  const faceLabel = (k) => emOf(k).w + " 표정";

  /* ---------- 문제 만들기 ---------- */
  function makeQuestions(st) {
    const qs = [], pool = st.pool.slice();
    let last = "", lastStory = -1;
    for (let i = 0; i < st.count; i++) {
      let ans, story = null;
      if (st.mode === "story") {
        let idx; do { idx = U.rnd(STORIES.length); } while (idx === lastStory && STORIES.length > 1);
        lastStory = idx; story = STORIES[idx]; ans = story.k;
      } else {
        let t = 0; do { ans = pick(pool); t++; } while (ans === last && t < 20);
      }
      last = ans;
      const others = shuffle(ALL.filter((k) => k !== ans && pool.indexOf(k) >= 0)).slice(0, st.n - 1);
      const cands = shuffle([ans].concat(others));
      qs.push({ ans, story, cands, wordCands: shuffle([ans].concat(shuffle(ALL.filter((k) => k !== ans)).slice(0, st.n - 1))) });
    }
    return qs;
  }

  JN.registerGame({
    id: "감정표정", stages: STAGES, name: TXT.name,
    hintHelp: { always: TXT.hintAlways, button: TXT.hintButton, none: TXT.hintNone },
    extraSettings: [{ key: "wordSound", type: "select", label: "낱말 소리", sub: "이게 뭐야?와 같은 값이에요. 버튼 누를 때만 기기 안 음성으로 읽어요",
      def: "tap", options: [["tap", "버튼 누를 때만"], ["off", "끔"]], shareWith: ["낱말그림", "문장만들기"] }],
    parentNote: TXT.parentNote,
    chart: { key: "time", label: "걸린 시간", unit: "초" },
    describe: (e) => (e.questions || 5) + "문제 · " + U.fmtTime(e.time) + " · 다시 찾은 " + (e.mistakes || 0) + "번" + (e.hints ? " · 힌트 " + e.hints + "번" : ""),
    intro: (st) => st.mode === "w2f" ? TXT.introW2F : st.mode === "f2w" ? TXT.introF2W : TXT.introStory,
    mount(ctx) {
      const st = ctx.stage, set = ctx.settings, mode = set.hintMode, board = ctx.board;
      board.classList.add("sn-board", "em-board");
      const top = h("div", { class: "em-top", id: "emTop" });
      const area = h("div", { class: "sn-area em-area", id: "emArea" });
      board.append(top, area);
      const prog = h("span", { class: "qprog" }); ctx.status(prog);
      const qs = makeQuestions(st);
      let qi = -1, q = null, step = "face", busy = true, mistakes = 0, hints = 0, heard = 0, hinted = 0, phase = "wait", alive = true, answerK = -1;
      const canSpeak = () => !!set.sound && set.wordSound !== "off" && JN.speakAvailable();
      const wantSpeak = () => !!set.sound && set.wordSound !== "off";

      function speakSlot(text) {
        const slot = h("span", { class: "wd-spk" }); slot.dataset.text = text; fillSpeak(slot); return slot;
      }
      function fillSpeak(slot) {
        slot.textContent = "";
        if (canSpeak()) {
          const b = h("button", { type: "button", class: "speak", id: "emSpeak", "aria-label": "소리 듣기", svg: Art.icon("소리켬") });
          U.tap(b, () => { if (JN.speak(slot.dataset.text)) heard++; });
          slot.appendChild(b);
        } else if (wantSpeak()) slot.appendChild(h("span", { class: "wd-nosound", text: "소리가 안 나요. 어른이 읽어 주세요" }));
      }
      const refreshSpeak = () => board.querySelectorAll(".wd-spk").forEach(fillSpeak);
      function paintProg() {
        prog.textContent = "";
        const d = h("span", { class: "jn-dots", "aria-hidden": "true" });
        for (let i = 0; i < qs.length; i++) d.appendChild(h("i", { class: i < qi ? "on" : i === qi ? "now" : null }));
        prog.append(d, " " + (qi + 1) + " / " + qs.length);
      }

      /* 위쪽: 문제 (낱말 / 표정 / 이야기) */
      function paintTop() {
        top.textContent = ""; top.className = "em-top";
        if (st.mode === "w2f") {
          const w = emOf(q.ans).w;
          top.appendChild(h("div", { class: "sn-bubble jn-bubble em-q" }, speakSlot(w), h("b", { id: "emWord", text: w })));
        } else if (st.mode === "f2w") {
          top.classList.add("pic");
          top.appendChild(h("span", { class: "em-big", id: "emFace", svg: faceArt(q.ans, faceLabel(q.ans)) }));
        } else {
          top.classList.add("story");
          if (step === "word") top.appendChild(h("span", { class: "em-big small", id: "emFace", svg: faceArt(q.ans, faceLabel(q.ans)) }));
          const re = h("button", { type: "button", class: "jn-btn jn-btn--quiet em-reread", id: "emReread" }, TXT.reread);
          U.tap(re, () => { if (JN.speak(q.story.text)) heard++; });
          const bubble = h("div", { class: "sn-bubble jn-bubble em-story" }, speakSlot(q.story.text), h("b", { id: "emStory", text: q.story.text }));
          top.appendChild(bubble);
          if (canSpeak()) top.appendChild(re);
        }
      }
      /* 아래쪽: 고르는 카드 (표정 카드 또는 낱말 카드) */
      function paintCards() {
        area.textContent = ""; area.className = "sn-area em-area";
        const faceStep = (st.mode === "w2f") || (st.mode === "story" && step === "face");
        const keys = faceStep ? q.cands : q.wordCands;
        answerK = keys.indexOf(q.ans);
        const grid = h("div", { class: "em-grid n" + keys.length + (faceStep ? " faces" : " words"), id: "emGrid" });
        keys.forEach((k, i) => {
          const b = faceStep
            ? h("button", { type: "button", class: "sn-card em-card", "data-k": String(i), "aria-label": faceLabel(k) }, h("i", { svg: faceArt(k, faceLabel(k)) }))
            : h("button", { type: "button", class: "sn-card em-card em-wordcard", "data-k": String(i), "aria-label": emOf(k).w }, h("b", { text: emOf(k).w }));
          U.tap(b, () => choose(i, keys));
          grid.appendChild(b);
        });
        area.appendChild(grid);
        if (mode === "always") { const b = grid.children[answerK]; if (b) b.classList.add("big"); }
        phase = "pick"; busy = false; hinted = 0;
        ctx.say(st.mode === "w2f" ? TXT.sayW2F : st.mode === "f2w" ? TXT.sayF2W : step === "face" ? TXT.sayStoryFace : TXT.sayStoryWord);
      }
      function choose(i, keys) {
        if (busy) return;
        const b = area.querySelector('[data-k="' + i + '"]');
        if (!b || b.classList.contains("miss") || b.classList.contains("faded")) return;
        if (keys[i] === q.ans) {
          busy = true; b.classList.add("right"); JN.markRight(b); ctx.sound("ok");
          if (st.mode === "story" && step === "face") {
            ctx.say(TXT.good);
            ctx.later(() => { step = "word"; paintTop(); paintCards(); }, T.okMs / JN.TIME_SCALE);
          } else ctx.later(next, T.okMs / JN.TIME_SCALE);
          return;
        }
        mistakes++;   // 벌은 없어요: 그 카드만 잠깐 흐려지고 다시 고를 수 있어요
        b.classList.add("miss");
        const note = h("span", { class: "again-note", text: TXT.again });
        b.appendChild(note);
        ctx.later(() => { b.classList.remove("miss"); note.remove(); }, T.missMs / JN.TIME_SCALE);
      }
      function next() {
        if (!alive) return;
        qi++;
        if (qi >= qs.length) return end();
        q = qs[qi]; step = "face";
        paintProg(); paintTop();
        if (st.mode === "f2w") step = "word";
        paintCards();
      }
      function end() {
        busy = true; phase = "end";
        const time = ctx.timer.stop();
        ctx.finish({ cleared: mistakes <= 3, time, mistakes, hints, metrics: { questions: qs.length, heard },
          title: TXT.title, line: "마음 " + qs.length + "개를 찾았어요" });
      }
      ctx.hint(mode === "button", () => {
        if (busy || !q || phase !== "pick") return;
        const w = [...area.querySelectorAll(".em-card")].filter((b) => +b.dataset.k !== answerK && !b.classList.contains("faded"));
        if (!w.length) return;
        hints++; hinted++; pick(w).classList.add("faded");
      });
      const unVoices = JN.onVoices(() => { if (alive) refreshSpeak(); });
      return {
        start() { ctx.timer.start(); next(); },
        resize() {},
        soundChanged() { if (alive) refreshSpeak(); },
        destroy() { alive = false; busy = true; unVoices(); JN.speakStop(); },
        test: {
          state: () => ({ mode: st.mode, qi, n: qs.length, busy, phase, step, answer: busy || !q ? -1 : answerK, ans: q ? q.ans : "" }),
          make: (i) => makeQuestions(STAGES[i]).map((x) => ({ ans: x.ans, cands: x.cands.slice(), wordCands: x.wordCands.slice(), story: x.story ? x.story.text : "" })),
          faceSvg: faceArt,
          stories: () => STORIES.map((s) => ({ k: s.k, text: s.text })),
        },
      };
    },
  });
})();
