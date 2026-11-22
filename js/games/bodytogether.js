/* 같이 놀아요! (같이몸놀이) — 몸·감각 방
   어른과 풍선·공·방석·쿠션·빈 상자로 집 안 놀이길을 만들어 노는 놀이. 항상 어른과 함께.
   몸놀이 카드 틀(JN.BodyKit)은 bodymove.js 에 있어요 → index.html 에서 bodymove.js 다음에 불러요.
   - 3세 시작(1단계)은 풍선 대신 공 주고받기 (안전을 위해). 풍선 약속은 시작 안전 안내에 늘 보여요.
   - 3단계: 아이가 카드를 골라요. 5·6·8단계: 놀이길 순서 보기 (힌트 없이면 5초 뒤 종이 뒷면으로 덮어요).
   - 판이 끝나면 "한 번 더 할까요?"를 묻고 기다려요. 단계 자동 올리기 없음. */
"use strict";
(function () {
  const U = JN.util, h = U.h, Kit = JN.BodyKit, TXT = Kit.TXT;
  /* 카드 7종 — 안전 한 줄은 정해 둔 문장 그대로 */
  const CARDS = {
    공: { name: "톡톡 공 주고받기", short: "공 주고받기", how: ["공주고받기"], rep: { prop: "공" }, prop: "공", propText: "준비물: 말랑한 공이나 양말 뭉치",
      line: "말랑한 공이나 양말 뭉치를 어른과 굴리거나 던져서 주고받아요", safety: "가까이에서 부드럽게. 얼굴 쪽으로 던지지 않아요", chal: "도전! 공을 받을 때마다 \"하나, 둘\" 세어요" },
    풍선: { name: "풍선아 떨어지지 마!", short: "풍선 띄우기", how: [{ prop: "풍선" }, "풍선치기"], rep: { prop: "풍선" }, prop: "풍선", propText: "준비물: 풍선 (어른이 불어 줘요)",
      line: "풍선이 바닥에 닿지 않게 손으로 톡톡 쳐요", safety: TXT.balloon, chal: "도전! 풍선을 한 번 치고 박수 한 번" },
    징검다리: { name: "징검다리 건너요", short: "징검다리", how: ["징검다리"], rep: { prop: "방석" }, prop: "방석", propText: "준비물: 미끄러지지 않는 방석이나 매트",
      line: "방석이나 매트를 띄엄띄엄 놓고 밟아서 건너요", safety: "미끄러지지 않는 방석이나 매트만. 맨발이나 미끄럼 방지 양말을 신어요", chal: "도전! 방석 위에서 \"하나, 둘\" 멈췄다 가요" },
    쿠션: { name: "쿠션 산 넘기", short: "쿠션 산", how: ["기어가기"], rep: { prop: "쿠션" }, prop: "쿠션", propText: "준비물: 낮은 쿠션",
      line: "낮은 쿠션을 기어서 넘고 돌아와요", safety: "높게 쌓지 않아요. 가구 모서리를 치워요. 쿠션 위에서 뛰어내리지 않아요", chal: "도전! 쿠션을 넘을 때마다 \"영차\" 말해요" },
    짐: { name: "짐 나르는 일꾼", short: "짐 나르기", how: ["짐안기"], rep: { prop: "상자" }, prop: "상자", propText: "준비물: 가벼운 빈 상자나 빨래 바구니",
      line: "가벼운 빈 상자를 들고 이쪽에서 저쪽으로 옮겨요", safety: "가벼운 것만. 앞이 잘 보이게. 상자를 머리에 쓰거나 안에 들어가지 않아요. 계단에서는 하지 않아요", chal: "도전! 상자를 살살 내려놓아요" },
    거울: { name: "거울 놀이", short: "거울 놀이", how: ["거울"], rep: "거울", prop: null, propText: "준비물 없음",
      line: "어른이 천천히 움직이면 거울처럼 똑같이 따라 해요. 다음엔 내가 먼저!", safety: "천천히 움직여요", chal: "도전! 아주아주 천천히 움직여요" },
    벽: { name: "벽을 쭉 밀어요", short: "벽 밀기", how: ["벽밀기"], rep: "벽밀기", prop: null, propText: "준비물 없음 (벽)", cap: 30,
      line: "두 손으로 벽을 쭉 밀어요", safety: "맨발이나 미끄럼 방지 양말을 신어요. 아프거나 어지러우면 멈춰요.", chal: "도전! 벽을 밀면서 열까지 세어요" },
  };
  const KEYS = Object.keys(CARDS);
  const STAGES = [
    { id: "t1", name: "어른과 공", kind: "fixed", list: ["공"], sec: 60 },
    { id: "t2", name: "풍선 하나", kind: "fixed", list: ["풍선"], sec: 60 },
    { id: "t3", name: "내가 고르는 놀이", kind: "pick", sec: 90 },
    { id: "t4", name: "도전 한 줄", kind: "challenge", sec: 120 },
    { id: "t5", name: "놀이길 2칸", kind: "path", n: 2, sec: 60 },
    { id: "t6", name: "놀이길 3칸", kind: "path", n: 3, sec: 60 },
    { id: "t7", name: "서로 바꿔 거울", kind: "mirror", sec: 30 },
    { id: "t8", name: "놀이길 4칸 + 도전", kind: "path", n: 4, sec: 60, chal: true },
  ];
  function card(key, st, set, extra) {
    const c = Object.assign({ id: key }, CARDS[key], extra || {});
    c.sec = Kit.sec(st.sec, set, c.cap);
    c.challenge = extra && extra.challenge != null ? extra.challenge : null;
    return c;
  }
  function deal(st, set) {
    if (st.kind === "fixed") return st.list.map((k) => card(k, st, set));
    if (st.kind === "challenge") { const k = U.pick(KEYS); return [card(k, st, set, { challenge: CARDS[k].chal })]; }
    if (st.kind === "mirror") {
      const a = { name: "거울 놀이 · 어른이 먼저", line: "어른이 천천히 움직이면 내가 거울처럼 따라 해요" };
      const b = { name: "거울 놀이 · 내가 먼저", line: "내가 천천히 움직이면 어른이 거울처럼 따라 해요" };
      return [a, b, a, b].map((x) => card("거울", st, set, x));
    }
    if (st.kind === "path") return U.shuffle(KEYS.slice()).slice(0, st.n).map((k) => card(k, st, set, st.chal ? { challenge: CARDS[k].chal } : null));
    return [];
  }
  const pathText = (cards) => "순서를 봐요. " + cards.map((c) => c.short).join(", 그다음 ");

  /* 3단계: 아이가 고르는 화면 */
  function picker(api, ctx, st, set, done) {
    const board = api.board;
    api.clear(); board.classList.add("bt-pick-scr"); board.dataset.screen = "pick"; api.setHint(null);
    const grid = h("div", { class: "bt-grid", id: "btGrid" });
    KEYS.forEach((k) => {
      const c = CARDS[k];
      const b = h("button", { type: "button", class: "bt-tile", "data-k": k, "aria-label": c.name },
        h("i", { svg: Kit.art(c.how[c.how.length - 1], { label: "" }) }), h("b", { text: c.short }));
      U.tap(b, () => { delete board.dataset.screen; api.cards = [card(k, st, set)]; done(); });
      grid.appendChild(b);
    });
    api.put(h("h2", { class: "bm-h", text: "오늘은 어떤 놀이를 할까요?" }), grid);
    layoutGrid(board);
    ctx.say("하고 싶은 놀이를 골라요");
  }
  function layoutGrid(board) {
    const grid = board.querySelector(".bt-grid"); if (!grid) return;
    const n = grid.children.length, gap = 10, Wd = board.clientWidth - 32, Hd = board.clientHeight - 32 - 44;
    if (Wd < 40 || Hd < 40) return;
    let best = { cols: 1, s: 0 };
    for (let cols = 1; cols <= n; cols++) { const rows = Math.ceil(n / cols); const s = Math.min((Wd - gap * (cols - 1)) / cols, (Hd - gap * (rows - 1)) / rows / 1.12, 170); if (s > best.s) best = { cols, s }; }
    const s = Math.max(60, Math.floor(best.s));
    grid.style.gridTemplateColumns = "repeat(" + best.cols + ", " + s + "px)";
    for (const b of grid.children) { b.style.width = s + "px"; b.style.height = Math.floor(s * 1.12) + "px"; }
  }

  /* 5·6·8단계: 놀이길 순서 보기 */
  function pathView(api, ctx, done) {
    const board = api.board, mode = api.mode, cards = api.cards;
    api.clear(); board.classList.add("bt-path-scr"); board.dataset.screen = "path";
    const wrap = h("div", { class: "bt-path", id: "btPath" });
    const line = document.createElementNS("http://www.w3.org/2000/svg", "svg"); line.setAttribute("class", "bt-line"); line.setAttribute("aria-hidden", "true");
    wrap.appendChild(line);
    cards.forEach((c, i) => wrap.appendChild(h("div", { class: "bt-stop", "data-i": String(i) },
      h("span", { class: "no", text: String(i + 1) }),
      h("i", { class: "pic", svg: Kit.art(c.how[c.how.length - 1], { label: c.short }) }),
      h("span", { class: "back", "aria-hidden": "true", svg: JN.Assets.cardBack() }),
      h("b", { class: "nm", text: c.name }),
      c.prop ? h("i", { class: "pp", svg: Art.prop(c.prop, { label: "" }) }) : null)));
    const props = [...new Set(cards.map((c) => c.prop).filter(Boolean))];
    const prep = h("div", { class: "bt-prep" }, h("b", { text: props.length ? "준비물" : "준비물 없음" }),
      ...props.map((p) => h("i", { class: "pi", svg: Art.prop(p, { label: p }) })),
      props.includes("풍선") ? h("small", { text: "풍선은 어른이 불어 줘요" }) : null);
    let covered = false;
    const msg = pathText(cards);
    const cover = () => { if (mode === "always" || !board.classList.contains("bt-path-scr")) return; covered = true; wrap.querySelectorAll(".bt-stop").forEach((s) => s.classList.add("covered")); ctx.say("순서가 기억나요? 어른에게 말해 봐요"); };
    api.put(wrap, prep, api.btn("jn-btn--primary jn-btn--big jn-btn--block bm-go", "준비됐어요", null, () => { delete board.dataset.screen; done(); }, "btReady"));
    ctx.say(msg);
    requestAnimationFrame(() => drawLine(board));
    if (mode !== "always") ctx.later(cover, 5000 / JN.TIME_SCALE);
    // 힌트 단추 = "다음 칸이 뭐였지?" — 덮인 칸을 앞에서부터 하나씩 열어 줘요
    api.setHint(() => {
      if (!covered) return;
      const s = wrap.querySelector(".bt-stop.covered"); if (!s) return;
      s.classList.remove("covered"); api.addHint();
    });
  }
  function drawLine(board) {
    const wrap = board.querySelector(".bt-path"); if (!wrap) return;
    const svg = wrap.querySelector(".bt-line"), r0 = wrap.getBoundingClientRect();
    const pts = [...wrap.querySelectorAll(".bt-stop")].map((s) => { const r = s.getBoundingClientRect(); return [r.left - r0.left + r.width / 2, r.top - r0.top + r.height / 2]; });
    svg.setAttribute("viewBox", "0 0 " + Math.max(1, r0.width) + " " + Math.max(1, r0.height));
    if (pts.length < 2) { svg.innerHTML = ""; return; }
    let d = "M" + pts[0].join(" ");
    for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; d += " C" + x0 + " " + (y0 + y1) / 2 + " " + x1 + " " + (y0 + y1) / 2 + " " + x1 + " " + y1; }
    svg.innerHTML = '<path d="' + d + '" class="road"/><path d="' + d + '" class="dash"/>';
  }

  JN.registerGame({
    id: "같이몸놀이", stages: STAGES, autoRepeat: false, autoNext: false,
    hintHelp: { always: "하는 법 그림 + 한 줄 설명 + 준비물이 늘 보여요. 놀이길 단계는 순서 그림이 늘 보여요",
      button: "처음엔 이름과 준비물만. 힌트 단추를 누르면 하는 법이 나와요. 놀이길 단계는 '다음 칸이 뭐였지?'처럼 덮인 칸을 하나씩 열어 줘요",
      none: "이름과 준비물만 보여요. 놀이길 단계는 순서 그림을 5초 보여 주고 덮어요" },
    extraSettings: [Kit.cardTimeSetting("몸따라해요")],
    parentNote: "항상 어른과 함께해요(3~5세는 손 닿는 거리에서). 집에 있는 풍선·말랑한 공·방석·쿠션·빈 상자만 써요. 판이 끝나면 '한 번 더 할까요?'를 묻고 기다려요. 단계는 자동으로 오르지 않으니 여기서 직접 골라 주세요",
    parentSafety: TXT.parent,
    chart: { key: "cards", label: "같이 한 카드", unit: "장" },
    describe: (e) => (e.path ? "놀이길 " + e.path + "칸 · " : "") + "같이 한 카드 " + (e.cards || 0) + "장 · 움직인 시간 " + Kit.fmtMove(e.moveSec) + (e.stopped ? " · 일찍 멈춘 카드 " + e.stopped + "장" : ""),
    intro: (st, set, ctx) => Kit.intro(ctx),
    mount(ctx) {
      const st = ctx.stage, set = ctx.settings;
      ctx.board.classList.add("bt-board");
      const opts = { cards: deal(st, set), balloon: true, path: st.kind === "path", title: "같이 놀아서 신나요!",
        line: (s) => "같이 한 카드 " + s.cards + "장 · 움직인 시간 " + Kit.fmtMove(s.moveSec) };
      if (st.kind === "pick") opts.before = (api, done) => picker(api, ctx, st, set, done);
      if (st.kind === "path") opts.before = (api, done) => pathView(api, ctx, done);
      const inst = Kit.run(ctx, opts);
      const rz = inst.resize;
      inst.resize = () => { rz(); layoutGrid(ctx.board); drawLine(ctx.board); };
      return inst;
    },
  });
})();
