/* 불빛 순서 (옛 '불빛 순서 기억하기') — 친구들이 빛난 순서대로 누르기
   - 밤하늘 별자리(수집, 보충 기획 3-2, 2026-11-29): 한 판(순서 10번)을 끝낼 때마다 밤하늘에 별이 정해진 자리·순서대로 하나씩 켜져요(무작위 아님, 12개).
     몇 번 맞혔든 한 판을 끝까지 하면 별 1개(벌 없음). 12개가 다 켜지면 '완성 카드'로 끝이고 저절로 새로 시작하지 않아요.
     새로 시작은 보호자 설정의 '별자리 비우기'에서만 해요. 아이별로 이 기기 안에만 저장돼요 (바깥으로 보내지 않아요). 점수·순위 없음.
   - 첫 판 손짓 도우미(2026-11-29): 이 놀이를 처음 하는 아이에게만, 두 번 다른 친구를 누르거나 한참 가만있으면 손 그림이 다음에 누를 친구를 가리켜요. */
"use strict";
(function () {
  const U = JN.util, h = U.h, TX = JN.t;   // TX: 화면 글자는 lang/ko.js 에서 (T 는 아래 시간 표가 써요)
  const DATA = {
    stages: [2, 3, 4, 5, 6, 7].map((n) => ({ id: "len" + n, name: TX("g.light.stage", { n }), short: TX("g.light.stage.short", { n }), start: n })),
    friendSteps: [{ upTo: 4, count: 4 }, { upTo: 6, count: 6 }, { upTo: 99, count: 9 }],
    /* 친구 9마리: art.js 프로필 동물 8 + 부엉이. 소리 높이는 서로 어울리는 5음계 */
    friends: [
      { kind: "토끼", color: "lilac", note: 261.6 }, { kind: "곰", color: "apricot", note: 293.7 }, { kind: "고양이", color: "honey", note: 329.6 },
      { kind: "강아지", color: "leaf", note: 392.0 }, { kind: "여우", color: "sky", note: 440.0 }, { kind: "펭귄", color: "pink", note: 523.3 },
      { kind: "사자", color: "mint", note: 587.3 }, { kind: "다람쥐", color: "sand", note: 659.3 }, { kind: "부엉이", color: "cream", note: 784.0 },
    ],
    timing: { leadMs: 800, onMs: 600, gapMs: 400, tapMs: 350, afterOkMs: 1200, retryMs: 1400 },
    roundsPerGame: 10, stageUpGain: 2, idleHintMs: 4000, hintButtonMs: 1500,
  };
  const T = DATA.timing;
  const ORDER = { forward: TX("g.light.order.forward"), backward: TX("g.light.order.backward") };
  /* 밤하늘 별자리 12별 (정해진 자리·순서): 별 모양 4가지 × 색 3가지 + 번호. 색만으로 구별하지 않게 모양과 번호가 함께 바뀌어요.
     다른 놀이의 모음(꽃·구슬·우표·조약돌·이불 조각…)과 겹치지 않게 '선으로 이어지는 별'이에요 */
  const K = Art.COLORS || {}, INK = Art.INK || "#4A3F37";
  const STAR_MAX = 12;
  const STAR_SHAPES = [
    (c) => `<path d="M30 9 L36 23 51 24 39 34 43 49 30 41 17 49 21 34 9 24 24 23Z" fill="${c}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
    (c) => `<path d="M30 7 Q33 27 53 30 Q33 33 30 53 Q27 33 7 30 Q27 27 30 7Z" fill="${c}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
    (c) => `<circle cx="30" cy="30" r="11" fill="${c}" stroke="${INK}" stroke-width="2"/><path d="M30 8 V15 M30 45 V52 M8 30 H15 M45 30 H52 M14 14 L19 19 M41 41 L46 46 M46 14 L41 19 M19 41 L14 46" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`,
    (c) => `<path d="M30 8 L44 30 30 52 16 30Z" fill="${c}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M30 18 L37 30 30 42 23 30Z" fill="${K.white || "#FFFCF5"}" opacity=".6"/>`];
  const STAR_COLORS = [K.honey || "#E0A54E", K.cream || "#F5EDDC", K.pink || "#DDA394"];
  const starBody = (i) => STAR_SHAPES[i % 4](STAR_COLORS[Math.floor(i / 4) % 3]);
  const starSvg = (i) => `<svg viewBox="0 0 60 60" aria-hidden="true">${starBody(i)}</svg>`;
  /* 별자리 그림의 정해진 별 자리 (가로 260 × 세로 200 밤하늘) — 차례대로 선으로 이어요 */
  const SKY_POS = [[30, 150], [62, 120], [46, 80], [82, 50], [122, 66], [134, 28], [172, 46], [162, 92], [198, 112], [232, 82], [224, 144], [180, 168]];
  function skySvg() {
    let b = `<rect x="4" y="4" width="252" height="192" rx="12" fill="${K.night || "#55708A"}" stroke="${INK}" stroke-width="2.4"/>`;
    b += `<polyline points="${SKY_POS.map((p) => p.join(",")).join(" ")}" fill="none" stroke="${K.cream || "#F5EDDC"}" stroke-width="2" stroke-dasharray="4 4" opacity=".75"/>`;
    for (let i = 0; i < STAR_MAX; i++) b += `<g transform="translate(${SKY_POS[i][0] - 15} ${SKY_POS[i][1] - 15}) scale(.5)">${starBody(i)}</g>`;
    return `<svg viewBox="0 0 260 200" aria-hidden="true">${b}</svg>`;
  }
  const SKY_ICON = '<svg viewBox="0 0 60 60" aria-hidden="true"><path class="sk-o" d="M30 9 L36 23 51 24 39 34 43 49 30 41 17 49 21 34 9 24 24 23Z"/></svg>';
  const friendCount = (l) => { for (const s of DATA.friendSteps) if (l <= s.upTo) return s.count; return 9; };
  function friendSvg(f) {
    if (f.kind === "부엉이") return Art.owl({ face: "기본", label: TX("g.light.owl") });
    return Art.profile(f.kind, { color: Art.COLORS[f.color], label: f.kind });
  }

  JN.registerGame({
    id: "불빛순서", stages: DATA.stages,
    /* 작은 걸음: 불빛이 걸음마다 조금씩 빨라져요 (켜짐 600→450ms, 사이 400→300ms) */
    tune: (st, f) => Object.assign(st, { onMs: Math.round(T.onMs * (1 - 0.25 * f)), gapMs: Math.round(T.gapMs * (1 - 0.25 * f)) }),
    hintHelp: { always: TX("g.light.hh.always"), button: TX("g.light.hh.button"), none: TX("g.light.hh.none") },
    extraSettings: [{ key: "order", type: "select", label: TX("g.light.x.order"), def: "forward", options: [["forward", TX("g.light.order.forward")], ["backward", TX("g.light.x.order.backward")]] }],
    parentNote: TX("g.light.parentNote"),
    /* 보호자 설정의 '별자리 비우기': 지우는 것은 이 아이의 별 수(mem.stars)뿐이에요. 놀이 기록은 그대로 */
    memReset: { key: "stars", max: STAR_MAX, label: TX("g.light.reset.label"), sub: TX("g.light.reset.sub"), button: TX("g.light.reset.btn"), confirm: TX("g.light.reset.confirm"), done: TX("g.light.reset.done"), nowKey: "g.light.reset.now" },
    chart: { key: "best", label: TX("g.light.chart"), unit: TX("g.light.unit") },
    describe: (e) => TX("g.light.describe", { best: e.best || 0, order: ORDER[e.order || "forward"], m: e.mistakes || 0 }) + (e.hints ? TX("g.number.describe.hint", { n: e.hints }) : ""),
    intro: (st, set) => TX("g.light.intro") + (set.order === "backward" ? TX("g.light.intro.back") : ""),
    mount(ctx) {
      const mem = ctx.mem, st = ctx.stage, set = ctx.settings, mode = set.hintMode, order = set.order === "backward" ? "backward" : "forward";
      const board = ctx.board; board.classList.add("lo-board");
      const grid = h("div", { class: "lo-grid" }); board.appendChild(grid);
      const dots = h("div", { class: "lo-dots", "aria-hidden": "true" }); ctx.bottom.appendChild(dots);
      let phase = "idle", seq = [], len = st.start, fails = 0, roundNo = 0, best = 0, mistakes = 0, hints = 0, autoHints = 0, input = 0, token = 0, idleT = 0, count = 4, alive = true;
      const wait = (ms) => new Promise((r) => setTimeout(r, ms / JN.TIME_SCALE));
      /* 밤하늘 별자리 (상태 칸): 별 그림 + n/12 */
      const starsNow = () => Math.max(0, Math.min(STAR_MAX, mem.stars | 0));
      const skTxt = h("span", { class: "lo-skn" }), skIcon = h("i", { class: "sk-i", "aria-hidden": "true", svg: SKY_ICON });
      const sky = h("span", { class: "lo-sky" }, skIcon, skTxt);
      const paintSky = () => { skTxt.textContent = starsNow() + "/" + STAR_MAX; sky.setAttribute("aria-label", TX("g.light.sky", { n: starsNow(), max: STAR_MAX })); };
      paintSky(); ctx.status(sky);
      let starGot = 0, completed = false, doneCard = null;
      /* 첫 판 손짓 도우미: 누를 차례일 때만 다음 친구를 가리켜요 */
      const nudge = U.nudge(ctx, () => (phase === "input" && alive ? btn(expected()) || null : null));

      function renderGrid() {
        grid.textContent = ""; grid.dataset.n = String(count);
        for (let i = 0; i < count; i++) {
          const f = DATA.friends[i];
          const b = h("button", { type: "button", class: "friend", "data-i": String(i), "aria-label": f.kind, svg: friendSvg(f) });
          b.addEventListener("pointerdown", (e) => { e.preventDefault(); tap(i); });
          grid.appendChild(b);
        }
        layout();
      }
      function layout() {
        const cols = count === 4 ? 2 : 3, rows = Math.ceil(count / cols);
        const W = board.clientWidth - 24, H = board.clientHeight - 24, gap = 14;
        const s = Math.max(64, Math.floor(Math.min((W - gap * (cols - 1)) / cols, (H - gap * (rows - 1)) / rows, 200)));
        grid.style.gridTemplateColumns = "repeat(" + cols + ", " + s + "px)";
        for (const b of grid.children) { b.style.width = b.style.height = s + "px"; }
      }
      const btn = (i) => grid.children[i];
      function light(i, ms) {
        const b = btn(i); if (!b) return;
        b.classList.add("lit");
        ctx.tone(DATA.friends[i].note, Math.min(0.5, ms / 1000), 0.05);
        setTimeout(() => b.classList.remove("lit"), ms / JN.TIME_SCALE);
      }
      function paintDots() {
        dots.textContent = "";
        if (phase !== "input" && phase !== "wait") return;
        for (let k = 0; k < seq.length; k++) dots.appendChild(h("span", { class: "dot" + (k < input ? " on" : "") }));
      }
      function status() { ctx.say(TX("g.light.status", { no: roundNo < DATA.roundsPerGame ? roundNo + 1 : DATA.roundsPerGame, total: DATA.roundsPerGame, len })); }
      function makeSeq(l, n) { const out = []; for (let k = 0; k < l; k++) { let v; do { v = U.rnd(n); } while (k > 0 && v === out[k - 1]); out.push(v); } return out; }
      function nextRound() {
        if (!alive) return;
        if (roundNo >= DATA.roundsPerGame) return end();
        count = friendCount(len); seq = makeSeq(len, count); fails = 0;
        renderGrid(); show();
      }
      async function show() {
        const my = ++token;
        clearTimeout(idleT); clearRing();
        phase = "show"; input = 0; paintDots(); status();
        setEnabled(false);
        await wait(T.leadMs);
        for (const i of seq) { if (my !== token || !alive) return; light(i, st.onMs || T.onMs); await wait((st.onMs || T.onMs) + (st.gapMs || T.gapMs)); }
        if (my !== token || !alive) return;
        phase = "input"; setEnabled(true);
        ctx.say(order === "forward" ? TX("g.light.say.forward") : TX("g.light.say.backward"));
        paintDots(); idleHint(); nudge.arm();
      }
      function setEnabled(on) { for (const b of grid.children) b.setAttribute("aria-disabled", String(!on)); }
      const expected = () => order === "forward" ? seq[input] : seq[seq.length - 1 - input];
      function clearRing() { for (const b of grid.children) b.classList.remove("hint"); }
      function ring(ms) { clearRing(); const b = btn(expected()); if (!b) return; b.classList.add("hint"); setTimeout(() => b.classList.remove("hint"), ms / JN.TIME_SCALE); }
      function idleHint() {
        clearTimeout(idleT);
        if (mode !== "always") return;
        const my = token;
        idleT = setTimeout(() => { if (phase === "input" && my === token && alive) { ring(2000); autoHints++; } }, DATA.idleHintMs / JN.TIME_SCALE);
      }
      function tap(i) {
        if (phase !== "input") return;
        light(i, T.tapMs); clearTimeout(idleT); clearRing();
        if (i === expected()) { input++; nudge.ok(); paintDots(); if (input === seq.length) success(); else idleHint(); }
        else wrongTap();
      }
      function success() {
        phase = "wait"; roundNo++; best = Math.max(best, len);
        ctx.sound("ok");
        ctx.say(U.pick(TX("g.light.say.ok")));
        len++;
        const my = token;
        setTimeout(() => { if (my === token) nextRound(); }, T.afterOkMs / JN.TIME_SCALE);
      }
      function wrongTap() {
        mistakes++; fails++; phase = "wait"; nudge.wrong();
        const my = token;
        if (fails === 1) { ctx.say(TX("g.light.say.again")); setTimeout(() => { if (my === token && alive) show(); }, T.retryMs / JN.TIME_SCALE); }
        else { roundNo++; ctx.say(TX("g.light.say.less")); len = Math.max(2, len - 1); setTimeout(() => { if (my === token) nextRound(); }, T.retryMs / JN.TIME_SCALE); }
      }
      function addStar() {   // 밤하늘에 별 하나 (12개가 다 켜졌으면 그대로)
        const n = starsNow();
        if (n >= STAR_MAX) return false;
        mem.stars = n + 1; ctx.saveMem(); starGot++; if (n + 1 >= STAR_MAX) completed = true;
        paintSky(); skIcon.innerHTML = starSvg(n); skIcon.classList.add("pop");
        ctx.later(() => { skIcon.classList.remove("pop"); }, 900);
        return true;
      }
      function end() {
        phase = "end"; token++; clearTimeout(idleT); nudge.stop();
        const time = ctx.timer.stop(), cleared = best >= st.start + DATA.stageUpGain;
        const grew = addStar(), n = starsNow();
        const fin = () => ctx.finish({ cleared, time, mistakes, hints, metrics: { best, order, rounds: roundNo, autoHints },
          title: best ? TX("g.light.title", { n: best }) : TX("g.light.title.zero"),
          line: TX("g.light.line", { order: ORDER[order] }) + TX(completed ? "g.light.line.full" : grew ? "g.light.line.star" : "g.light.line.again", { n, max: STAR_MAX }),
          bestKey: order, bestValue: best, higherBetter: true });
        if (completed) ctx.later(() => showDone(fin), Math.max(JN.ms(900), 40)); else fin();
      }
      /* 밤하늘 별자리 완성 카드: 12별을 정해진 자리에 이은 별자리 그림 + 따뜻한 말. '고마워요' 단추 하나. 저절로 새로 시작하지 않아요 */
      function showDone(next) {
        if (!ctx.alive()) return;
        const ok = h("button", { type: "button", class: "jn-btn jn-btn--big", id: "loDoneOk" }, TX("g.light.done.ok"));
        doneCard = h("div", { class: "dw-done lo-done", id: "loDone", role: "group", "aria-label": TX("g.light.done.title") },
          h("div", { class: "dw-donecard" }, h("h2", { text: TX("g.light.done.title") }), h("div", { class: "lo-donesky", "aria-hidden": "true", svg: skySvg() }), h("p", { text: TX("g.light.done.body") }), ok));
        board.appendChild(doneCard);
        U.onTap(ok, () => { if (doneCard && doneCard.isConnected) { doneCard.remove(); doneCard = null; next(); } });
        ctx.say(TX("g.light.done.say"));
        try { ok.focus({ preventScroll: true }); } catch (e) { /* 포커스는 없어도 돼요 */ }
      }
      ctx.hint(mode === "button", () => { if (phase !== "input") return; hints++; ring(DATA.hintButtonMs); });
      count = friendCount(len); renderGrid(); setEnabled(false);
      return {
        start() { ctx.timer.start(); nextRound(); },
        resize: layout,
        destroy() { alive = false; token++; clearTimeout(idleT); nudge.stop(); },
        test: { state: () => ({ phase, seq: seq.slice(), len, count, roundNo, best, input, order, mistakes,
          stars: starsNow(), starGot, completed, card: !!(doneCard && doneCard.isConnected), nudgeShown: nudge.shown(), nudgeVisible: nudge.visible() }), expected: () => expected() },
      };
    },
  });
})();
