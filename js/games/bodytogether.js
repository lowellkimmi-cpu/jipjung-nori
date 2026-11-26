/* 같이 놀아요! (같이몸놀이) — 몸·감각 방
   어른과 풍선·공·방석·쿠션·빈 상자로 집 안 놀이길을 만들어 노는 놀이. 항상 어른과 함께.
   몸놀이 카드 틀(JN.BodyKit)은 bodymove.js 에 있어요 → index.html 에서 bodymove.js 다음에 불러요.
   - 3세 시작(1단계)은 풍선 대신 공 주고받기 (안전을 위해). 풍선 약속은 시작 안전 안내에 늘 보여요.
   - 3단계: 아이가 카드를 골라요. 5·6·8단계: 놀이길 순서 보기 (힌트 없이면 5초 뒤 종이 뒷면으로 덮어요).
   - 판이 끝나면 "한 번 더 할까요?"를 묻고 기다려요. 단계 자동 올리기 없음. */
"use strict";
(function () {
  const U = JN.util, h = U.h, Kit = JN.BodyKit, TXT = Kit.TXT, L = JN.t;   // L: 화면 글자는 lang/ko.js 에서
  /* 카드 7종 — 안전 한 줄은 정해 둔 문장 그대로 (키 g.tog.<카드>.name · short · prop · line · safety · chal) */
  const CD = (k) => ({ name: L("g.tog." + k + ".name"), short: L("g.tog." + k + ".short"), line: L("g.tog." + k + ".line"), safety: L("g.tog." + k + ".safety"), chal: L("g.tog." + k + ".chal") });
  const CARDS = {
    공: Object.assign(CD("ball"), { how: ["공주고받기"], rep: { prop: "공" }, prop: "공", propText: L("g.tog.ball.prop") }),
    풍선: Object.assign(CD("balloon"), { how: [{ prop: "풍선" }, "풍선치기"], rep: { prop: "풍선" }, prop: "풍선", propText: L("g.tog.balloon.prop"), safety: TXT.balloon }),
    징검다리: Object.assign(CD("stones"), { how: ["징검다리"], rep: { prop: "방석" }, prop: "방석", propText: L("g.tog.stones.prop") }),
    쿠션: Object.assign(CD("cushion"), { how: ["기어가기"], rep: { prop: "쿠션" }, prop: "쿠션", propText: L("g.tog.cushion.prop") }),
    짐: Object.assign(CD("box"), { how: ["짐안기"], rep: { prop: "상자" }, prop: "상자", propText: L("g.tog.box.prop") }),
    거울: Object.assign(CD("mirror"), { how: ["거울"], rep: "거울", prop: null, propText: L("g.body.noprop") }),
    벽: Object.assign(CD("wall"), { how: ["벽밀기"], rep: "벽밀기", prop: null, propText: L("g.tog.wall.prop"), cap: 30 }),
  };
  const KEYS = Object.keys(CARDS);
  const STAGES = [
    { id: "t1", name: L("g.tog.t1"), kind: "fixed", list: ["공"], sec: 60 },
    { id: "t2", name: L("g.tog.t2"), kind: "fixed", list: ["풍선"], sec: 60 },
    { id: "t3", name: L("g.tog.t3"), kind: "pick", sec: 90 },
    { id: "t4", name: L("g.tog.t4"), kind: "challenge", sec: 120 },
    { id: "t5", name: L("g.tog.t5"), kind: "path", n: 2, sec: 60 },
    { id: "t6", name: L("g.tog.t6"), kind: "path", n: 3, sec: 60 },
    { id: "t7", name: L("g.tog.t7"), kind: "mirror", sec: 30 },
    { id: "t8", name: L("g.tog.t8"), kind: "path", n: 4, sec: 60, chal: true },
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
      const a = { name: L("g.tog.mirror.a.name"), line: L("g.tog.mirror.a.line") };
      const b = { name: L("g.tog.mirror.b.name"), line: L("g.tog.mirror.b.line") };
      return [a, b, a, b].map((x) => card("거울", st, set, x));
    }
    if (st.kind === "path") return U.shuffle(KEYS.slice()).slice(0, st.n).map((k) => card(k, st, set, st.chal ? { challenge: CARDS[k].chal } : null));
    return [];
  }
  const pathText = (cards) => L("g.tog.pathText", { list: cards.map((c) => c.short).join(L("g.word.then")) });

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
    api.put(h("h2", { class: "bm-h", text: L("g.tog.pick.title") }), grid);
    layoutGrid(board);
    ctx.say(L("g.tog.pick.say"));
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
    const prep = h("div", { class: "bt-prep" }, h("b", { text: props.length ? L("g.tog.prep") : L("g.body.noprop") }),
      ...props.map((p) => h("i", { class: "pi", svg: Art.prop(p, { label: p }) })),
      props.includes("풍선") ? h("small", { text: L("g.tog.prep.balloon") }) : null);
    let covered = false;
    const msg = pathText(cards);
    const cover = () => { if (mode === "always" || !board.classList.contains("bt-path-scr")) return; covered = true; wrap.querySelectorAll(".bt-stop").forEach((s) => s.classList.add("covered")); ctx.say(L("g.tog.remember")); };
    api.put(wrap, prep, api.btn("jn-btn--primary jn-btn--big jn-btn--block bm-go", L("g.body.readyBtn"), null, () => { delete board.dataset.screen; done(); }, "btReady"));
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
    hintHelp: { always: L("g.tog.hh.always"),
      button: L("g.tog.hh.button"),
      none: L("g.tog.hh.none") },
    extraSettings: [Kit.cardTimeSetting("몸따라해요")],
    parentNote: L("g.tog.parentNote"),
    parentSafety: TXT.parent,
    chart: { key: "cards", label: L("g.tog.chart"), unit: L("g.tog.unit") },
    describe: (e) => (e.path ? L("g.tog.describe.path", { n: e.path }) : "") + L("g.tog.line", { n: e.cards || 0, time: Kit.fmtMove(e.moveSec) }) + (e.stopped ? L("g.body.describe.stopped", { n: e.stopped }) : ""),
    intro: (st, set, ctx) => Kit.intro(ctx),
    mount(ctx) {
      const st = ctx.stage, set = ctx.settings;
      ctx.board.classList.add("bt-board");
      const opts = { cards: deal(st, set), balloon: true, path: st.kind === "path", title: L("g.tog.title"),
        line: (s) => L("g.tog.line", { n: s.cards, time: Kit.fmtMove(s.moveSec) }) };
      if (st.kind === "pick") opts.before = (api, done) => picker(api, ctx, st, set, done);
      if (st.kind === "path") opts.before = (api, done) => pathView(api, ctx, done);
      const inst = Kit.run(ctx, opts);
      const rz = inst.resize;
      inst.resize = () => { rz(); layoutGrid(ctx.board); drawLine(ctx.board); };
      return inst;
    },
  });
})();
