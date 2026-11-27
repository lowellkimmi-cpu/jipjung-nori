/* 이럴 땐 어떻게? — 같은 장면에서도 방법이 여러 가지예요 (말·언어 방).
   곰이 만난 그림 장면(장난감 빌리기·줄이 길어요·같이 놀고 싶어요·탑이 쓰러졌어요·친구가 울고 있어요·인사해요)을 보고,
   '방법 카드' 중 하나를 고르면 그 방법을 해 본 결과 그림이 나와요. 어느 카드를 골라도 결과 그림 뒤에 똑같이 "다른 방법도 해 볼까?" 가 나와요.
   정답이 없어요: 고른 방법을 두고 맞고 틀림을 말하는 글·표정·소리가 없고, 점수도, 별·박수도 없어요. 결과 그림은 서로 다른 장면일 뿐이에요.
   이야기 하나 = 서로 다른 카드 2장의 결과 그림을 보면 끝 (같은 카드만 고르면 끝나지 않고 "다른 방법도 해 볼까?" 로 이어져요).
   쌓이는 것: 이야기를 끝내면 이야기책에 책갈피가 정해진 순서(1편 → 6편)로 하나씩 꽂혀요. 6개가 다 차면 완성 카드로 끝이고, 저절로 새로 시작하지 않아요.
   단계 5개: 1 두 가지 방법(카드 2장) · 2 결과가 여러 가지(카드 3장) · 3 마음 말 붙이기(먼저 곰의 마음을 고르고 카드) ·
             4 내가 먼저 말해요(말 조각 2개를 차례로 이어 붙이기) · 5 친구가 달라져요(토끼 친구와 강아지 친구, 같은 카드도 그림이 달라요).
   소리 안내: 상황 문장과 "다른 방법도 해 볼까?" 를 기기(브라우저) 안 음성(JN.speak)으로 읽어 줘요. 보호자 설정에서 소리 안내를 끄면 글자와 그림만 나와요.
               소리를 저절로 켜지 않아요. 별·박수·신호음 같은 소리는 쓰지 않아요.
   기록: stories(끝낸 이야기), repicks(이미 해 본 방법을 다시 고른 횟수). 이 기기 안에만 저장돼요. 카메라·마이크·바깥 통신 없음.
   결과 그림 세 가지(smile·come·think)는 곰·친구 얼굴이 모두 같은 기본 얼굴이고, 표정·몸짓·말풍선 차이가 없어요. 차이는 '누가 있는지·어디 있는지' 장면 내용뿐이에요.
   그림: 기존 동물(Art.animal)·보미 부엉이·공(Art.prop)을 다시 쓰고, 탑 블록·미끄럼틀 조각만 이 파일(과 CSS)에서 그려요. 새 동물 없음. 사람 얼굴·실제 이름 없음. */
"use strict";
(function () {
  const U = JN.util, h = U.h, T = JN.t, clamp = U.clamp;
  const STORY_MAX = 6;
  const STAGES = [
    { id: "t1", name: T("g.sit.s1"), cards: 2 },
    { id: "t2", name: T("g.sit.s2"), cards: 3 },
    { id: "t3", name: T("g.sit.s3"), cards: 3, feel: true },
    { id: "t4", name: T("g.sit.s4"), cards: 3, build: true },
    { id: "t5", name: T("g.sit.s5"), cards: 3, friends: true },
  ];
  /* 이야기 6편 (정해진 순서). variants: 카드마다 결과 그림 종류 (smile 곰과 친구가 제자리 · think 친구가 가운데 쪽에 · come 다른 친구가 와 있는 그림. 표정은 모두 같아요) */
  const STORIES = [
    { friend: "토끼", third: "오리", prop: "공", variants: ["smile", "think", "come"] },
    { friend: "오리", third: "강아지", prop: "slide", line: true, variants: ["think", "come", "smile"] },
    { friend: "오리", third: "강아지", prop: "공", variants: ["come", "smile", "think"] },
    { friend: "고양이", third: "토끼", prop: "tower", variants: ["smile", "come", "think"] },
    { friend: "코끼리", third: "고양이", prop: "", sad: true, variants: ["think", "smile", "come"] },
    { friend: "강아지", third: "토끼", prop: "", variants: ["come", "think", "smile"] },
  ];
  const FRIENDS5 = ["토끼", "강아지"], FLAV5 = ["quiet", "lively"];
  const FEELS = [{ id: "joy", face: "웃음" }, { id: "wow", face: "놀람" }, { id: "sad", face: "시무룩" }];
  const BM_COLORS = ["mustard", "terracotta", "sage", "dustyblue", "kraft", "honey"];
  const ani = (kind, face, dir) => Art.animal(kind, { face: face || "기본", dir: dir || "left", label: "" });

  /* ---- 그림: 탑 · 미끄럼틀 (색은 CSS) ---- */
  const towerSvg = '<svg viewBox="0 0 60 80" aria-hidden="true"><rect class="sb-blk b1" x="8" y="56" width="44" height="18" rx="2"/><rect class="sb-blk b2" x="14" y="38" width="32" height="18" rx="2"/>' +
    '<rect class="sb-blk b3" x="20" y="20" width="20" height="18" rx="2"/><path class="sb-edge" d="M30 74 V78"/></svg>';
  const slideSvg = '<svg viewBox="0 0 80 70" aria-hidden="true"><path class="sb-wood" d="M10 66 V8 H20 V66Z"/><path class="sb-wood" d="M20 12 H28 V16 H20Z"/>' +
    '<path class="sb-slide" d="M28 10 C52 14 66 36 74 62 L62 66 C56 42 44 28 28 24Z"/></svg>';
  const glyph = (i) => '<svg viewBox="0 0 40 40" aria-hidden="true">' + [
    '<circle class="sb-gl g0" cx="20" cy="20" r="14"/>',
    '<rect class="sb-gl g1" x="7" y="7" width="26" height="26" rx="4"/>',
    '<path class="sb-gl g2" d="M20 5 L35 33 H5Z"/>'][i] + '</svg>';
  const ribbonSvg = (c, empty) => '<svg viewBox="0 0 30 60" aria-hidden="true"><path class="sb-rib ' + (empty ? "empty" : "c-" + c) + '" d="M4 2 H26 V56 L15 46 L4 56Z"/></svg>';

  /* 그림 한 장 (장면 · 결과). mode: scene | smile | think | come. flav: "" | quiet | lively (5단계 친구 모습) */
  function buildPic(o) {
    const S = STORIES[o.story], fk = o.friend || S.friend, v = o.mode, flav = o.flav || "";
    /* 결과 그림 세 가지는 얼굴이 모두 같아요 (곰은 기본 얼굴, 친구는 장면과 같은 얼굴). 5편은 친구가 장면과 똑같이 울상이에요 */
    let meFace = o.meFace || "기본", frFace = S.sad ? "시무룩" : "기본";
    const el = h("div", { class: "sit-pic", "data-mode": v, "data-flav": flav, "data-line": S.line ? "1" : "", "data-story": o.story, "data-me-face": meFace, "data-fr-face": frFace });
    el.appendChild(h("span", { class: "sp-ground" }));
    if (S.prop === "공") el.appendChild(h("span", { class: "sp-prop", svg: Art.prop("공", { label: "" }) }));
    if (S.prop === "slide") el.appendChild(h("span", { class: "sp-slide", svg: slideSvg }));
    if (S.prop === "tower") el.appendChild(h("span", { class: "sp-prop sp-tower", svg: towerSvg }));
    if (S.line) {
      el.appendChild(h("span", { class: "sp-q sp-q2", svg: ani("코끼리", "기본") }));
      el.appendChild(h("span", { class: "sp-q sp-q1", svg: ani("고양이", "기본") }));
    }
    el.appendChild(h("span", { class: "sp-me", svg: ani("곰", meFace, "right") }));
    el.appendChild(h("span", { class: "sp-fr", svg: ani(fk, frFace) }));
    if (v === "come") el.appendChild(h("span", { class: "sp-3", svg: ani(S.third === fk ? ["오리", "토끼", "강아지"].find((k) => k !== fk && k !== S.friend) : S.third, "기본") }));
    return el;
  }

  JN.registerGame({
    id: "이럴땐", stages: STAGES, stageLabel: (st) => st.name, desc: T("g.sit.desc"),
    hintHelp: { always: T("g.sit.hh.always"), button: T("g.sit.hh.button"), none: T("g.sit.hh.none") },
    parentNote: T("g.sit.guardian") + " " + T("g.sit.parentNote"),
    recordNote: T("g.sit.guardian"),
    memReset: { key: "stories", max: STORY_MAX, label: T("g.sit.reset.label"), sub: T("g.sit.reset.sub"), button: T("g.sit.reset.btn"), confirm: T("g.sit.reset.confirm"), done: T("g.sit.reset.done"), nowKey: "g.sit.reset.now" },
    chart: { key: "stories", label: T("g.sit.chart"), unit: T("g.sit.unit") },
    describe: (e) => T("g.sit.describe", { n: e.stories || 1, r: e.repicks || 0 }) + (e.hints ? T("g.number.describe.hint", { n: e.hints }) : ""),
    intro: (stage, settings) => T(settings && settings.voice !== false && JN.speakAvailable() ? "g.sit.intro.voice" : "g.sit.intro.quiet"),
    mount(ctx) {
      const lv = ctx.stage, mode = ctx.settings.hintMode, mem = ctx.mem, board = ctx.board;
      board.classList.add("sit-board");
      /* 소리 안내: 보호자 설정에서 켜져 있고 기기에 음성이 있을 때만. 꺼져 있으면 글자·그림만 (저절로 켜지 않아요) */
      const canSpeak = () => ctx.settings.voice !== false && JN.speakAvailable();
      let spoken = 0;
      const speak = (t) => { if (canSpeak()) { JN.speak(t); spoken++; } };

      const storiesNow0 = clamp(mem.stories | 0, 0, STORY_MAX);
      const wasFull = storiesNow0 >= STORY_MAX;
      let storiesNow = storiesNow0;
      const sIdx = wasFull ? (mem.replay | 0) % STORY_MAX : storiesNow0;   // 이야기 순서는 정해져 있어요 (무작위 아님)
      const S = STORIES[sIdx], n1 = sIdx + 1;
      const sitText = T("g.sit." + n1 + ".sit");

      let phase = "idle", done = false, tm = 0, fi = 0, feeling = null, pending = -1, builtN = 0, usedP = new Set(), order = [0, 1], hintOn = false, completed = false;
      let repicks = 0, hints = 0, picksN = 0, lastVariant = "", lastSay = "";
      const tried = [new Set(), new Set()];
      const after = (ms, fn) => { clearTimeout(tm); tm = ctx.later(fn, ms); };
      const setPhase = (p) => { phase = p; board.dataset.phase = p; };
      /* 첫 판: 정답은 없어요. 가만히 있으면 손이 '눌러 볼 곳'(아직 안 해 본 카드 · 마음 그림 · 말 조각)을 가리켜요. 틀렸다고 알리는 일은 없어요 */
      const nudge = U.nudge(ctx, () => {
        if (phase === "choose") { const cs = panel.querySelectorAll(".sit-card"); return Array.from(cs).find((c) => !tried[fi].has(+c.dataset.i)) || cs[0] || null; }
        if (phase === "feel") return panel.querySelector(".sit-feel");
        if (phase === "build") return panel.querySelector(".sit-piece:not(.used)");
        return null;
      }, { idleMs: 7000 });
      const friendKind = () => (lv.friends ? FRIENDS5[fi] : S.friend);
      const flav = () => (lv.friends ? FLAV5[fi] : "");

      /* ---- 화면 짜기: 위(보미 + 글자 말풍선) · 가운데 그림 · 아래 카드/조각 ---- */
      const owlEl = h("span", { class: "sit-owl", svg: JN.Assets.owl("웃음", "기본", T("g.sit.aria.owl")) });
      const txt = h("span", { class: "sit-text", id: "sitText" });
      const reread = h("button", { type: "button", class: "sit-reread jn-btn", id: "sitReread", hidden: !canSpeak() }, T("g.sit.reread"));
      const bubble = h("div", { class: "sit-bubble", role: "status" }, txt, reread);
      const top = h("div", { class: "sit-top" }, owlEl, bubble);
      const wrap = h("div", { class: "sit-wrap", role: "img", "aria-label": T("g.sit.aria.scene") });
      const panel = h("div", { class: "sit-panel", id: "sitPanel" });
      board.append(top, wrap, panel);
      U.onTap(reread, () => { if (!done && canSpeak()) { JN.speak(txt.textContent); spoken++; } });

      const bmTxt = h("span", {});
      ctx.status(h("span", { class: "sit-bm", "aria-label": T("g.sit.bm.aria") }, bmTxt));
      const paintBm = () => { bmTxt.textContent = T("g.sit.bm", { n: storiesNow, max: STORY_MAX }); };
      paintBm();

      const setText = (t) => { txt.textContent = t; };
      const setPic = (opts) => { wrap.textContent = ""; wrap.appendChild(buildPic(Object.assign({ story: sIdx, friend: friendKind(), flav: flav() }, opts))); };

      /* ---- 장면 → (마음 고르기) → 카드 고르기 ---- */
      function showSituation(first) {
        if (done) return;
        feeling = null;
        setPic({ mode: "scene" });
        const pre = lv.friends ? T("g.sit.friend." + fi) + " " : "";
        setText(pre + sitText);
        speak(pre + sitText);
        ctx.say(first ? T("g.sit.ask") : T("g.sit.again"));
        if (lv.feel) { setPhase("feel"); ctx.say(T("g.sit.say.feel")); } else setPhase("choose");
        renderPanel();
      }
      function renderPanel() {
        panel.textContent = ""; nudge.arm();
        if (phase === "choose") {
          const box = h("div", { class: "sit-cards", role: "group", "aria-label": T("g.sit.say.choose") });
          for (let i = 0; i < lv.cards; i++) {
            const name = T("g.sit." + n1 + ".c" + (i + 1)), was = tried[fi].has(i);
            const kids = [h("span", { class: "sit-gl", svg: glyph(i) }), h("span", { class: "sit-cardtxt", text: name })];
            if (mode === "always") kids.push(h("span", { class: "sit-prev", role: "img", "aria-label": T("g.sit.aria.preview") }, buildPic({ story: sIdx, friend: friendKind(), flav: flav(), mode: S.variants[i] })));
            if (hintOn && was) kids.push(h("span", { class: "sit-mark", text: T("g.sit.mark.txt") }));
            const b = h("button", { type: "button", class: "sit-card" + (hintOn ? (was ? " tried" : " fresh") : ""), "data-i": i,
              "aria-label": T(hintOn && was ? "g.sit.aria.card.tried" : "g.sit.aria.card", { name }) }, kids);
            U.onTap(b, () => pickCard(i));
            box.appendChild(b);
          }
          panel.appendChild(box);
        } else if (phase === "feel") {
          const box = h("div", { class: "sit-feels", role: "group", "aria-label": T("g.sit.say.feel") });
          FEELS.forEach((f, i) => {
            const nm = T("g.sit.feel." + f.id);
            const b = h("button", { type: "button", class: "sit-feel", "data-f": f.id, "aria-label": T("g.sit.aria.feel", { name: nm }) },
              h("span", { class: "sit-feelart", svg: ani("곰", f.face, "right") }), h("span", { class: "sit-feeltxt", text: nm }));
            U.onTap(b, () => pickFeel(f));
            box.appendChild(b);
          });
          panel.appendChild(box);
        } else if (phase === "build") {
          const a = T("g.sit." + n1 + ".w" + (pending + 1) + "a"), b2 = T("g.sit." + n1 + ".w" + (pending + 1) + "b"), words = [a, b2];
          const slots = h("div", { class: "sit-slots", id: "sitSlots", "aria-hidden": "true" });
          for (let k = 0; k < 2; k++) slots.appendChild(h("span", { class: "sit-slot" + (usedP.has(k) ? " on" : ""), text: usedP.has(k) ? words[k] : "" }));
          const row = h("div", { class: "sit-pieces", role: "group", "aria-label": T("g.sit.say.build") });
          order.forEach((p) => {
            const used = usedP.has(p);
            const pb = h("button", { type: "button", class: "sit-piece" + (used ? " used" : ""), "data-p": p, disabled: used,
              "aria-label": T("g.sit.aria.piece", { name: words[p] }) }, words[p]);
            U.onTap(pb, () => pickPiece(p));
            row.appendChild(pb);
          });
          panel.append(slots, row);
        } else if (phase === "bookmark") {
          const shelf = h("div", { class: "sit-shelf", role: "img", "aria-label": T("g.sit.bm.aria") });
          for (let i = 0; i < STORY_MAX; i++) shelf.appendChild(h("span", { class: "sit-rib" + (i === storiesNow - 1 && !wasFull ? " new" : ""), svg: ribbonSvg(BM_COLORS[i], i >= storiesNow) }));
          panel.appendChild(shelf);
        }
      }

      function pickFeel(f) {
        if (done || phase !== "feel") return;
        feeling = f;
        setPic({ mode: "scene", meFace: f.face });
        setPhase("choose"); ctx.say(T(picksN > 0 ? "g.sit.again" : "g.sit.say.afterfeel"));
        renderPanel();
      }
      function pickCard(i) {
        if (done || phase !== "choose") return;
        picksN++; hintOn = false;
        if (tried[fi].has(i)) repicks++;
        tried[fi].add(i); pending = i;
        if (lv.build) startBuild(); else showResult();
      }

      /* ---- 4단계: 말 조각 2개를 이어 붙여요 (어느 조각을 먼저 눌러도 되고, 순서에 대한 반응은 없어요) ---- */
      function startBuild() {
        builtN = 0; usedP = new Set(); order = U.shuffle([0, 1]);
        setPhase("build"); ctx.say(T("g.sit.say.build"));
        renderPanel();
      }
      function pickPiece(p) {
        if (done || phase !== "build") return;
        if (usedP.has(p)) return;
        usedP.add(p); builtN = usedP.size;
        if (builtN < 2) { ctx.say(T("g.sit.say.build")); renderPanel(); return; }
        renderPanel();
        const said = T("g.sit." + n1 + ".w" + (pending + 1) + "a") + " " + T("g.sit." + n1 + ".w" + (pending + 1) + "b");
        setPhase("speech"); setText(said); speak(said);
        after(Math.max(JN.ms(1800), 60), showResult);
      }

      /* ---- 결과 그림 → 똑같은 한 줄 → 다음 ---- */
      function showResult() {
        if (done) return;
        setPhase("result");
        lastVariant = S.variants[pending];
        setPic({ mode: lastVariant, meFace: undefined });
        wrap.setAttribute("aria-label", T("g.sit.aria.pic"));
        setText(T("g.sit.again")); ctx.say(""); speak(T("g.sit.again"));
        panel.textContent = "";
        after(Math.max(JN.ms(2800), 80), afterResult);
      }
      const isComplete = () => (lv.friends ? tried[0].size >= 1 && tried[1].size >= 1 : tried[0].size >= 2);
      function afterResult() {
        if (done) return;
        wrap.setAttribute("aria-label", T("g.sit.aria.scene"));
        if (isComplete()) return finishStory();
        if (lv.friends && fi === 0) fi = 1;
        showSituation(false);
      }

      /* ---- 이야기 끝: 책갈피 하나 ---- */
      function finishStory() {
        setPhase("bookmark");
        if (!wasFull) { storiesNow++; mem.stories = storiesNow; if (storiesNow >= STORY_MAX) completed = true; }
        else mem.replay = (mem.replay | 0) + 1;
        ctx.saveMem(); paintBm();
        setText(T("g.sit.say.bookmark")); ctx.say(T("g.sit.say.bookmark")); speak(T("g.sit.say.bookmark"));
        renderPanel();
        after(Math.max(JN.ms(2400), 80), () => { if (completed) showDone(); else finishRound(); });
      }
      function finishRound() {
        if (done) return;
        done = true; setPhase("done"); clearTimeout(tm); nudge.stop();
        const time = ctx.timer.stop();
        ctx.finish({ cleared: true, time, mistakes: 0, hints, metrics: { stories: 1, repicks }, title: T("g.sit.title"),
          line: T(completed ? "g.sit.line.full" : wasFull ? "g.sit.line.again" : "g.sit.line", { n: storiesNow, max: STORY_MAX }), showTime: false });
      }
      /* 이야기책 완성 카드: 책갈피 6개 + 따뜻한 말 + '고마워요' 단추 하나. 저절로 새로 시작하지 않아요 */
      function showDone() {
        if (!ctx.alive()) return;
        const row = h("div", { class: "sit-donerow", "aria-hidden": "true" });
        for (let i = 0; i < STORY_MAX; i++) row.appendChild(h("span", { svg: ribbonSvg(BM_COLORS[i], false) }));
        const ok = h("button", { type: "button", class: "jn-btn jn-btn--big", id: "sitDoneOk" }, T("g.sit.done.ok"));
        const dc = h("div", { class: "sit-done", id: "sitDone", role: "group", "aria-label": T("g.sit.done.title") },
          h("div", { class: "sit-donecard" }, h("h2", { text: T("g.sit.done.title") }), row, h("p", { text: T("g.sit.done.body") }), ok));
        board.appendChild(dc);
        setPhase("card");
        U.onTap(ok, () => { if (dc.isConnected) { dc.remove(); finishRound(); } });
        ctx.say(T("g.sit.done.say")); speak(T("g.sit.done.say"));
        try { ok.focus({ preventScroll: true }); } catch (e) { /* 포커스는 없어도 돼요 */ }
      }

      /* 힌트 단추: 해 본 방법에 연필 표시, 아직 안 해 본 방법은 크게 */
      ctx.hint(mode === "button", () => {
        if (done || phase !== "choose") return;
        hints++; hintOn = true; renderPanel();
      });

      return {
        start() { ctx.timer.start(); ctx.say(T("g.sit.say.begin")); showSituation(true); },
        resize() { /* 그림은 칸 크기를 따라가요 */ },
        visibility(hidden) { /* 저절로 움직이는 것도 벌도 없어서 따로 멈추지 않아요 */ },
        destroy() { done = true; clearTimeout(tm); nudge.stop(); JN.speakStop(); },
        test: {
          state: () => ({ phase, story: sIdx, stage: lv.id, cards: lv.cards, friend: friendKind(), fi, tried: JSON.stringify(tried.map((s) => Array.from(s).sort())),
            picks: picksN, repicks, hints, spoken, stories: storiesNow, wasFull, completed, feeling: feeling ? feeling.id : "", next: builtN, usedP: JSON.stringify(Array.from(usedP).sort()), order: JSON.stringify(order),
            pending, variant: lastVariant, text: txt.textContent, msg: document.getElementById("msgLine") ? document.getElementById("msgLine").textContent : "",
            nudgeShown: nudge.shown(), nudgeVisible: nudge.visible(), hintOn, complete: isComplete(), done, mode, canSpeak: canSpeak() }),
        },
      };
    },
  });
})();
