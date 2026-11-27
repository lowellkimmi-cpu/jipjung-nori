/* 달롱 집 심부름 — 보미 말을 듣고 달롱 집을 꾸며요 (말·언어 방).
   보미가 "공을 상자 안에 놓아요" 처럼 한 번 말해 줘요(기기 안 음성으로 읽고, 글자는 잠깐만 보여요). 아래 물건 줄에서 물건을 골라
   달롱 집 장면의 알맞은 자리에 놓아요: 물건을 끌어다 놓거나, 물건을 누른 뒤 자리를 눌러요(둘 다 돼요).
   물건 줄에는 말에 없는 물건이 섞여 있어요. 한 판 = 심부름 3개.
   벌 없음: 다른 물건이나 다른 자리에 놓으면 물건이 줄로 둥실 돌아오고 "다시 해 볼까?"만 나와요(소리·빨강·흔들림 없음).
   말은 다시 들려주지 않아요 (힌트 버튼 방식에서만 한 번 더).
   꾸미기: 심부름을 끝낼 때마다 놓은 물건이 집에 남고, 6개를 끝내면 방이 하나 완성돼요. 방 순서는 정해져 있어요(방 → 부엌 → 정원).
   18개를 끝내면 '달롱 집이 다 꾸며졌어요!' 카드로 끝이고 저절로 새로 시작하지 않아요. 새로 시작은 보호자 설정에서만 해요.
   기록은 이 기기 안에만 저장돼요 (바깥으로 보내지 않아요). 소리를 녹음하지 않아요.
   그림: 기존 달롱·보미·공·방석·쿠션·과일을 다시 쓰고, 집 단면 장면 3개·가구·컵·책·꽃병·색깔 공은 이 파일(과 CSS)에서 손그림풍으로 그려요. 새 동물 없음.
   소리: Web Audio 로 직접 만든 음(놓을 때 392Hz 톡 · 심부름 끝 330·392·523Hz). 꺼져 있어도 그림과 글자로 놀 수 있어요. */
"use strict";
(function () {
  const U = JN.util, h = U.h, T = JN.t, clamp = U.clamp;
  const ERR_MAX = 18, ROOM_N = 6, PER_ROUND = 3;
  /* 단계마다 새 규칙 하나: tray 물건 줄 칸 수(말에 없는 물건이 2~3개 섞여요) */
  const STAGES = [
    { id: "e1", name: T("g.err.s1"), tray: 4 },
    { id: "e2", name: T("g.err.s2"), tray: 5 },
    { id: "e3", name: T("g.err.s3"), tray: 4 },
    { id: "e4", name: T("g.err.s4"), tray: 5 },
    { id: "e5", name: T("g.err.s5"), tray: 5 },
  ];

  /* ---- 놓을 자리 (장면 100 x 75 칸 기준: x y 는 자리 가운데, w h 는 크기, ax ay 는 물건이 앉는 가운데) ---- */
  const ZONES = {
    선반위:   { x: 18, y: 19,   w: 30, h: 22, ax: 18, ay: 24 },
    탁자위:   { x: 55, y: 37,   w: 28, h: 18, ax: 55, ay: 40 },
    탁자아래: { x: 55, y: 62,   w: 18, h: 16, ax: 55, ay: 63.5 },
    의자위:   { x: 77, y: 46,   w: 13, h: 14, ax: 77, ay: 48 },
    의자아래: { x: 77, y: 63.5, w: 12, h: 12, ax: 77, ay: 63.5 },
    의자옆:   { x: 91, y: 63,   w: 12, h: 16, ax: 91, ay: 63.5 },
    상자안:   { x: 14, y: 60,   w: 20, h: 16, ax: 14, ay: 58.5 },
    상자밖:   { x: 33, y: 63,   w: 14, h: 14, ax: 33, ay: 63.5 },
  };
  const ZONE_IDS = Object.keys(ZONES);
  const ITEM_IDS = ["공", "사과", "딸기", "바나나", "귤", "컵", "책", "꽃병", "방석", "쿠션"];
  const OFFS = [0, -7, 7, -3.5, 3.5];   // 같은 자리에 물건이 여러 개일 때 옆으로 조금씩

  /* ---- 문장 은행: 단계마다 10개 (사람 이름·실제 상호·광고 이름 없음) ---- */
  const BANK = {
    e1: ["공", "사과", "딸기", "컵", "책", "꽃병", "방석", "쿠션", "바나나", "귤"].map((it) => [it, "상자안"]),
    e2: [["사과", "탁자위", "컵", "선반위"], ["공", "상자안", "책", "선반위"], ["딸기", "탁자위", "방석", "의자위"], ["컵", "탁자위", "사과", "상자안"],
      ["꽃병", "선반위", "공", "의자아래"], ["쿠션", "의자위", "귤", "탁자아래"], ["책", "탁자위", "바나나", "상자안"], ["방석", "의자위", "딸기", "선반위"],
      ["귤", "탁자위", "컵", "의자아래"], ["꽃병", "탁자위", "쿠션", "상자안"]],
    e3: [["공", "의자아래"], ["공", "의자옆"], ["공", "의자위"], ["공", "상자밖"], ["공", "상자안"],
      ["사과", "탁자아래"], ["사과", "탁자위"], ["사과", "의자옆"], ["사과", "상자밖"], ["사과", "의자아래"]],
    e4: [["small", 2, "상자안"], ["big", 2, "탁자위"], ["red", 2, "상자안"], ["blue", 2, "의자옆"], ["small", 2, "탁자아래"],
      ["big", 1, "의자위"], ["red", 1, "탁자위"], ["blue", 1, "상자밖"], ["small", 1, "의자아래"], ["red", 2, "탁자아래"]],
    e5: [["b", "컵", "선반위", "사과", "탁자위"], ["b", "공", "상자안", "책", "탁자위"], ["b", "딸기", "탁자위", "꽃병", "선반위"], ["b", "쿠션", "의자위", "공", "상자안"],
      ["b", "책", "선반위", "귤", "탁자위"], ["b", "컵", "탁자위", "바나나", "상자안"], ["a", "사과", "탁자위", "컵", "선반위"], ["a", "공", "의자아래", "책", "탁자위"],
      ["a", "꽃병", "선반위", "딸기", "탁자아래"], ["a", "방석", "의자위", "귤", "상자안"]],
  };
  const S = (id, place, n, size, color) => ({ id, place, n: n || 1, size: size || "big", color: color || "green" });
  const keyOf = (id, size, color) => id + "|" + (size || "big") + "|" + (color || "green");
  const nm = (id) => T("g.err.item." + id);
  const obj = (id) => JN.josa(nm(id), "을/를");
  const pl = (z) => T("g.err.place." + z);
  /* 은행 한 줄을 문장(text)과 놓을 순서(steps)로 풀어요. extra 는 물건 줄에 꼭 있어야 하는 것(공의 크기·색 문제) */
  function make(stageId, e) {
    if (stageId === "e1" || stageId === "e3") return { text: T("g.err.t1", { a: obj(e[0]), p: pl(e[1]) }), steps: [S(e[0], e[1])] };
    if (stageId === "e2") return { text: T("g.err.t2", { a: obj(e[0]), p: pl(e[1]), b: obj(e[2]), q: pl(e[3]) }), steps: [S(e[0], e[1]), S(e[2], e[3])] };
    if (stageId === "e4") {
      const m = e[0], n = e[1], size = m === "small" ? "small" : "big", color = m === "red" || m === "blue" ? m : "green";
      const sizeMod = m === "small" || m === "big";
      const other = sizeMod ? { size: m === "small" ? "big" : "small", color: "green" } : { size: "big", color: m === "red" ? "blue" : "red" };
      const extra = [];
      for (let i = n; i < 2; i++) extra.push({ id: "공", size, color });          // 말한 공이 줄에 두 개는 있게
      for (let i = 0; i < 2; i++) extra.push({ id: "공", size: other.size, color: other.color });   // 다른 크기·색 공 둘
      return { text: T("g.err.t4", { m: T("g.err.mod." + m), n: T("g.err.qty." + n), p: pl(e[2]) }), steps: [S("공", e[2], n, size, color)], extra, ballStage: true };
    }
    const first = e[0] === "b" ? [S(e[3], e[4]), S(e[1], e[2])] : [S(e[1], e[2]), S(e[3], e[4])];   // 전에: 뒤에 말한 것을 먼저 놓아요
    return { text: T(e[0] === "b" ? "g.err.t5b" : "g.err.t5a", { a: obj(e[1]), p: pl(e[2]), b: obj(e[3]), q: pl(e[4]) }), steps: first };
  }

  /* ---- 그림 (색은 CSS 변수로만) ---- */
  const ballSvg = (color) => '<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse class="ei-shadow" cx="50" cy="90" rx="26" ry="5"/>' +
    '<circle class="ei-ball" data-c="' + color + '" cx="50" cy="52" r="32"/><path class="ei-shine" d="M32 40 C36 30 44 26 52 26"/>' +
    '<circle class="ei-dot" cx="' + (color === "red" ? 50 : 42) + '" cy="58" r="5"/>' + (color === "blue" ? '<circle class="ei-dot" cx="58" cy="58" r="5"/>' : "") + '</svg>';
  const cupSvg = '<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse class="ei-shadow" cx="48" cy="90" rx="28" ry="5"/>' +
    '<path class="ei-handle" d="M70 42 C90 40 90 68 68 66"/><path class="ei-cup" d="M24 30 H72 V60 C72 76 62 86 48 86 C34 86 24 76 24 60Z"/><path class="ei-band" d="M24 44 H72"/></svg>';
  const bookSvg = '<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse class="ei-shadow" cx="50" cy="90" rx="34" ry="5"/>' +
    '<rect class="ei-book" x="18" y="20" width="62" height="66" rx="5"/><rect class="ei-spine" x="18" y="20" width="12" height="66" rx="4"/>' +
    '<rect class="ei-label" x="38" y="32" width="30" height="18" rx="3"/><path class="ei-band" d="M38 62 H68 M38 70 H60"/></svg>';
  const vaseSvg = '<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse class="ei-shadow" cx="50" cy="91" rx="24" ry="5"/>' +
    '<path class="ei-stem" d="M50 40 V20"/><circle class="ei-bloom" cx="50" cy="14" r="10"/><circle class="ei-core" cx="50" cy="14" r="3.4"/>' +
    '<path class="ei-vase" d="M40 40 H60 V48 C72 58 72 80 62 88 H38 C28 80 28 58 40 48Z"/><path class="ei-band" d="M36 64 H64"/></svg>';
  function itemSvg(id, color) {
    if (id === "공") return color === "green" ? Art.prop("공", { label: "" }) : ballSvg(color);
    if (id === "컵") return cupSvg;
    if (id === "책") return bookSvg;
    if (id === "꽃병") return vaseSvg;
    if (id === "방석" || id === "쿠션") return Art.prop(id, { label: "" });
    return Art.fruit(id, { label: "" });
  }
  const earSvg = '<svg viewBox="0 0 60 60" aria-hidden="true"><path class="er-ear" d="M18 40 C12 28 16 10 32 9 C48 8 52 26 42 34 C36 38 36 44 32 50 C28 56 20 52 18 46"/><path class="er-ear" d="M28 24 C28 18 38 18 38 26 C38 31 31 31 31 37"/></svg>';

  /* 집 단면 장면 3개 (방 → 부엌 → 정원): 같은 가구(선반·탁자·의자·상자) 뒤로 벽·창·하늘만 달라요 */
  function sceneSvg(room) {
    let s = '<svg viewBox="0 0 100 75" aria-hidden="true">';
    if (room === 0) {
      s += '<rect class="sc-wall0" x="0" y="0" width="100" height="75"/><rect class="sc-floor0" x="0" y="58" width="100" height="17"/><path class="sc-edge" d="M0 58 H100"/>' +
        '<rect class="sc-frame" x="46" y="6" width="26" height="22" rx="2"/><rect class="sc-glass" x="48.5" y="8.5" width="21" height="17"/><path class="sc-edge" d="M59 8.5 V25.5 M48.5 17 H69.5"/>' +
        '<circle class="sc-frame" cx="38" cy="12" r="4.4"/><path class="sc-edge" d="M38 12 V9 M38 12 L40 13"/>' +
        '<ellipse class="sc-rug" cx="55" cy="71.5" rx="19" ry="2.6"/>';
    } else if (room === 1) {
      s += '<rect class="sc-wall1" x="0" y="0" width="100" height="75"/><rect class="sc-floor1" x="0" y="58" width="100" height="17"/><path class="sc-edge" d="M0 58 H100"/>';
      for (let x = 10; x < 100; x += 10) s += '<path class="sc-tile" d="M' + x + ' 0 V58"/>';
      for (let y = 10; y < 58; y += 10) s += '<path class="sc-tile" d="M0 ' + y + ' H100"/>';
      s += '<rect class="sc-cup" x="46" y="5" width="28" height="22" rx="2"/><path class="sc-edge" d="M60 5 V27"/><circle class="sc-knob" cx="57.5" cy="16" r="1.1"/><circle class="sc-knob" cx="62.5" cy="16" r="1.1"/>' +
        '<path class="sc-edge" d="M37 4 V14"/><circle class="sc-frame" cx="37" cy="17" r="3.6"/>';
    } else {
      s += '<rect class="sc-sky" x="0" y="0" width="100" height="75"/><circle class="sc-sun" cx="62" cy="10" r="5.5"/>' +
        '<path class="sc-hill" d="M0 40 C16 24 34 26 50 38 C66 28 84 26 100 36 V60 H0Z"/>' +
        '<rect class="sc-fence" x="0" y="20" width="36" height="38"/><path class="sc-edge" d="M6 20 V58 M12 20 V58 M18 20 V58 M24 20 V58 M30 20 V58"/>' +
        '<rect class="sc-grass" x="0" y="58" width="100" height="17"/><path class="sc-edge" d="M0 58 H100"/>';
      [[44, 72], [50, 73.5], [96, 72]].forEach(([x, y]) => { s += '<path class="sc-edge" d="M' + x + ' ' + y + ' V' + (y - 5) + '"/><circle class="sc-bloom" cx="' + x + '" cy="' + (y - 6) + '" r="2.1"/>'; });
    }
    s += '<path class="sc-wood" d="M3 30 H33 V33 H3Z"/><path class="sc-wood" d="M7 33 V40 L14 33Z M22 33 L29 40 V33Z"/>' +                                   // 선반
      '<rect class="sc-wood" x="42" y="46" width="26" height="3.5" rx="1"/><rect class="sc-wood" x="44" y="49.5" width="2.6" height="20"/><rect class="sc-wood" x="63.4" y="49.5" width="2.6" height="20"/>' +   // 탁자
      '<rect class="sc-wood" x="71" y="35" width="2.4" height="19"/><rect class="sc-wood" x="80.6" y="35" width="2.4" height="19"/><rect class="sc-wood" x="71" y="35" width="12" height="3"/><rect class="sc-wood" x="71" y="54" width="12" height="3"/>' +
      '<rect class="sc-wood" x="71.5" y="57" width="2.2" height="12.5"/><rect class="sc-wood" x="80.3" y="57" width="2.2" height="12.5"/>' +                    // 의자
      '<path class="sc-box" d="M4 56 H24 L22.6 70 H5.4Z"/><path class="sc-boxin" d="M4 56 H24 L23.6 58.6 H4.4Z"/><path class="sc-edge" d="M10 63 H18"/></svg>';   // 상자
    return s;
  }

  JN.registerGame({
    id: "심부름", stages: STAGES, stageLabel: (st) => st.name, desc: T("g.err.desc"),
    hintHelp: { always: T("g.err.hh.always"), button: T("g.err.hh.button"), none: T("g.err.hh.none") },
    parentNote: T("g.err.parentNote"),
    /* 보호자 설정의 '집 꾸미기 다시 시작': 지우는 것은 이 아이의 끝낸 심부름 수(mem.errands)뿐이에요. 놀이 기록은 그대로 */
    memReset: { key: "errands", max: ERR_MAX, label: T("g.err.reset.label"), sub: T("g.err.reset.sub"), button: T("g.err.reset.btn"), confirm: T("g.err.reset.confirm"), done: T("g.err.reset.done"), nowKey: "g.err.reset.now" },
    chart: { key: "errands", label: T("g.err.chart"), unit: T("g.err.unit") },
    describe: (e) => T("g.err.describe", { n: e.errands || 0, r: e.redo || 0 }) + (e.hints ? T("g.number.describe.hint", { n: e.hints }) : ""),
    intro: () => T("g.err.intro"),
    mount(ctx) {
      const lv = ctx.stage, mode = ctx.settings.hintMode, mem = ctx.mem, board = ctx.board;
      board.classList.add("er-board");
      const canSpeak = () => ctx.settings.voice !== false && JN.speakAvailable();

      /* ---- 상태 ---- */
      let errandsNow = clamp(mem.errands | 0, 0, ERR_MAX);
      const wasFull = errandsNow >= ERR_MAX;
      let house = Array.isArray(mem.house) ? mem.house.filter((s) => typeof s === "string").slice(-30) : [];
      if (errandsNow % ROOM_N === 0) house = [];   // 방이 막 완성됐거나(또는 처음부터 다시 시작) 새 방은 비어 있어요
      let phase = "idle", done = false, tm = 0, hideTm = 0, snailTm = 0, owlTm = 0;
      let order = [], stepIdx = 0, tray = [], selected = null, errandText = "", pending = [], putEls = [], putCount = {}, usedIdx = [];
      let doneThis = 0, redo = 0, hints = 0, spoken = 0, completed = false, uidN = 0;
      const roomIdx = () => (errandsNow >= ERR_MAX ? 2 : Math.floor(errandsNow / ROOM_N));
      const after = (ms, fn) => { clearTimeout(tm); tm = ctx.later(fn, ms); };
      const setPhase = (p) => { phase = p; scene.dataset.phase = p; };

      /* ---- 화면 짜기: 위(보미 말풍선) · 가운데 집 장면 · 아래 물건 줄 ---- */
      const owlEl = h("span", { class: "er-owl", svg: JN.Assets.owl("웃음", "기본", T("g.err.aria.owl")) });
      const bubTxt = h("span", { class: "er-bubtxt", id: "erText" });
      const bubble = h("div", { class: "er-bubble", id: "erBubble", "data-show": "ear", role: "status" }, h("i", { class: "er-eari", "aria-label": T("g.err.aria.ear"), role: "img", svg: earSvg }), bubTxt);
      const top = h("div", { class: "er-top" }, owlEl, bubble);
      const bg = h("div", { class: "er-bg", "aria-hidden": "true", svg: sceneSvg(roomIdx()) });
      const snailEl = h("span", { class: "er-snail", svg: JN.Assets.snail("기본", "기본", T("g.err.aria.snail")) });
      const scene = h("div", { class: "er-scene", role: "group", "aria-label": T("g.err.desc"), "data-phase": "idle", "data-drag": "" }, bg);
      const zoneEls = {};
      ZONE_IDS.forEach((z) => {
        const b = h("button", { type: "button", class: "er-zone", "data-zone": z, "aria-label": T("g.err.aria.zone", { p: pl(z) }) });
        zoneEls[z] = b; scene.appendChild(b);
      });
      scene.appendChild(snailEl);
      const wrap = h("div", { class: "er-wrap" }, scene);
      const trayEl = h("div", { class: "er-tray", role: "group", "aria-label": T("g.err.aria.tray") });
      board.append(top, wrap, trayEl);

      /* 집 꾸미기 칸 (아래 줄 옆 상태 칸) */
      const houseTxt = h("span", {});
      const paintHouse = () => {
        const n = errandsNow >= ERR_MAX ? ROOM_N : errandsNow % ROOM_N;
        houseTxt.textContent = T("g.err.house", { room: T("g.err.room." + roomIdx()), n, max: ROOM_N });
      };
      ctx.status(h("span", { class: "er-house" }, houseTxt));
      paintHouse();

      /* ---- 장면 위 물건 ---- */
      function addPut(key, zone, pop) {
        const [id, size, color] = key.split("|"), z = ZONES[zone];
        if (!z || !ITEM_IDS.includes(id)) return;
        const n = putCount[zone] || 0; putCount[zone] = n + 1;
        const dx = OFFS[n % OFFS.length];
        const el = h("span", { class: "er-put" + (pop ? " pop" : ""), "data-size": size, "data-zone": zone, "aria-hidden": "true", svg: itemSvg(id, color || "green") });
        el.style.left = (z.ax + dx - 6) + "%"; el.style.top = ((z.ay - 6) / 75 * 100) + "%"; el.style.zIndex = String(2 + n);
        scene.insertBefore(el, snailEl); putEls.push(el);
      }
      function clearPuts() { putEls.forEach((e) => e.remove()); putEls = []; putCount = {}; }
      house.forEach((s) => { const p = s.split("|"); if (p.length === 4) addPut(p[0] + "|" + p[1] + "|" + p[2], p[3], false); });

      /* ---- 달롱·보미 반응 (잠깐만 바뀌었다가 돌아와요) ---- */
      function smile() {
        clearTimeout(snailTm);
        snailEl.innerHTML = JN.Assets.snail("웃음", "기본", T("g.err.aria.snail"));
        snailTm = ctx.later(() => { snailEl.innerHTML = JN.Assets.snail("기본", "기본", T("g.err.aria.snail")); }, Math.max(JN.ms(900), 40));
      }
      function cheer() {
        clearTimeout(owlTm);
        owlEl.innerHTML = JN.Assets.owl("응원", "만세", T("g.err.aria.owl"));
        owlTm = ctx.later(() => { owlEl.innerHTML = JN.Assets.owl("웃음", "기본", T("g.err.aria.owl")); }, Math.max(JN.ms(1600), 60));
      }

      /* ---- 보미 말: 한 번 읽어 주고, 글자는 3초(소리를 못 들려줄 때는 6초) 뒤에 귀 그림만 남아요 ---- */
      function showText(secs) {
        bubTxt.textContent = errandText; bubble.dataset.show = "text";
        clearTimeout(hideTm);
        if (mode !== "always") hideTm = ctx.later(() => { bubble.dataset.show = "ear"; }, Math.max(JN.ms(secs * 1000), 40));
      }
      function say() {
        const sp = canSpeak();
        if (sp) JN.speak(errandText);
        spoken++;
        showText(sp ? 3 : 6);
      }

      /* ---- 심부름 하나 ---- */
      function trayItems(e) {
        const need = [];
        e.steps.forEach((s) => { for (let i = 0; i < s.n; i++) need.push({ id: s.id, size: s.size, color: s.color }); });
        let list = need.slice();
        if (e.extra) list = list.concat(e.extra);
        const total = Math.max(lv.tray, list.length + 1);
        const used = new Set(e.steps.map((s) => s.id));
        const pool = U.shuffle(ITEM_IDS.filter((i) => !used.has(i) && !(e.ballStage && i === "공")));
        while (list.length < total && pool.length) list.push({ id: pool.pop(), size: "big", color: "green" });
        return U.shuffle(list);
      }
      function nextErrand() {
        if (done) return;
        const bank = BANK[lv.id];
        /* (2026-11-27 로웰님: "전에 했던 게 그대로 있어서 할 수가 없음") 집에 이미 꾸며 둔 물건과 같은 물건·같은 자리를 또 시키면
           아이 눈에는 '벌써 놓여 있는' 심부름이라 헷갈려요 → 이미 놓인 '물건|자리'와 겹치지 않는 심부름을 골라요 */
        const decorated = new Set(house.map((s) => { const p = s.split("|"); return p[0] + "|" + p[3]; }));
        const clash = (ee) => ee.steps.some((s) => decorated.has(s.id + "|" + s.place));
        let i = U.rnd(bank.length), e = make(lv.id, bank[i]), guard = 0;
        while ((usedIdx.includes(i) || clash(e)) && guard++ < 60) { i = U.rnd(bank.length); e = make(lv.id, bank[i]); }
        if (clash(e)) clearPuts();   // 그래도 겹치면(고를 심부름이 다 겹침) 장면의 옛 물건만 잠깐 치워 헷갈리지 않게 (저장된 집 꾸미기는 그대로)
        usedIdx.push(i);
        order = e.steps.map((s) => ({ key: keyOf(s.id, s.size, s.color), id: s.id, place: s.place, left: s.n, n: s.n }));
        stepIdx = 0; errandText = e.text; pending = [];
        selected = null; scene.dataset.drag = "";
        trayEl.textContent = ""; tray = [];
        trayItems(e).forEach((o) => {
          const it = { uid: ++uidN, id: o.id, size: o.size, color: o.color, key: keyOf(o.id, o.size, o.color), placed: false, off: { x: 0, y: 0 } };
          const label = (o.size === "small" ? T("g.err.mod.small") + " " : "") + (o.color === "red" ? T("g.err.mod.red") + " " : o.color === "blue" ? T("g.err.mod.blue") + " " : "") + nm(o.id);
          it.label = label;
          it.el = h("button", { type: "button", class: "er-item", "data-uid": it.uid, "data-key": it.key, "data-size": o.size, "aria-pressed": "false", "aria-label": T("g.err.aria.item", { name: label }) },
            h("span", { class: "er-itemart", "aria-hidden": "true", svg: itemSvg(o.id, o.color) }));
          bindItem(it); tray.push(it); trayEl.appendChild(it.el);
        });
        paintWant();
        setPhase("play"); ctx.say(T("g.err.say.listen"));
        say();
      }
      function paintWant() {   // 늘 보기: 지금 놓을 자리에 연한 점선
        ZONE_IDS.forEach((z) => zoneEls[z].classList.remove("want"));
        if (mode === "always" && order[stepIdx]) zoneEls[order[stepIdx].place].classList.add("want");
      }

      /* ---- 고르기 · 끌기 · 놓기 ---- */
      function clearSel() { if (selected) { selected.el.classList.remove("sel"); selected.el.setAttribute("aria-pressed", "false"); selected.el.setAttribute("aria-label", T("g.err.aria.item", { name: selected.label })); } selected = null; scene.dataset.drag = ""; }
      function toggleSel(it) {
        if (done || phase !== "play" || it.placed) return;
        if (selected === it) return clearSel();
        clearSel(); selected = it; it.el.classList.add("sel"); it.el.setAttribute("aria-pressed", "true"); it.el.setAttribute("aria-label", T("g.err.aria.item.sel", { name: it.label }));
        scene.dataset.drag = "1";
      }
      function zoneAt(x, y) {
        let best = null, bd = 1e9;
        ZONE_IDS.forEach((z) => {
          const r = zoneEls[z].getBoundingClientRect();
          if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
            const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
            if (d < bd) { bd = d; best = z; }
          }
        });
        return best;
      }
      function bindItem(it) {
        const el = it.el; let drag = null, firedAt = 0;
        el.addEventListener("pointerdown", (e) => {
          if (done || phase !== "play" || it.placed || drag) return;
          if (e.pointerType === "mouse" && e.button !== 0) return;
          drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
          try { el.setPointerCapture(e.pointerId); } catch (err) { /* 없어도 돼요 */ }
        });
        el.addEventListener("pointermove", (e) => {
          if (!drag || drag.id !== e.pointerId) return;
          const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
          if (!drag.moved && Math.hypot(dx, dy) > 8) { drag.moved = true; el.classList.add("drag"); scene.dataset.drag = "1"; }
          if (drag.moved) { it.off = { x: dx, y: dy }; el.style.transform = "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px)"; }
        });
        el.addEventListener("pointerup", (e) => {
          if (!drag || drag.id !== e.pointerId) return;
          const d = drag; drag = null;
          try { el.releasePointerCapture(e.pointerId); } catch (err) { /* 이미 풀렸어요 */ }
          el.classList.remove("drag");
          if (!d.moved) { firedAt = Date.now(); toggleSel(it); return; }
          scene.dataset.drag = selected ? "1" : "";
          const z = (done || phase !== "play" || it.placed) ? null : zoneAt(e.clientX, e.clientY);
          el.style.transform = ""; it.off = { x: 0, y: 0 };    // 빈 곳에 놓으면 줄로 둥실 돌아와요 (아무 일도 없어요)
          if (z) place(it, z);
        });
        el.addEventListener("pointercancel", () => { drag = null; el.classList.remove("drag"); el.style.transform = ""; scene.dataset.drag = selected ? "1" : ""; });
        el.addEventListener("click", (e) => { if (Date.now() - firedAt < 600) return; toggleSel(it); });
      }
      ZONE_IDS.forEach((z) => U.onTap(zoneEls[z], () => {
        if (done || phase !== "play") return;
        if (!selected) { ctx.say(T("g.err.say.pickfirst")); return; }
        place(selected, z);
      }));

      function place(it, zone) {
        if (done || phase !== "play" || it.placed) return;
        const st = order[stepIdx];
        if (st && it.key === st.key && zone === st.place) {
          it.placed = true; it.el.style.visibility = "hidden"; it.el.disabled = true; it.el.style.transform = "";
          clearSel();
          addPut(it.key, zone, true); pending.push(it.key + "|" + zone);
          ctx.tone(392, 0.12, 0.05);   // 놓기 톡
          smile(); ctx.say(T("g.err.say.ok"));
          st.left--;
          if (st.left <= 0) stepIdx++;
          paintWant();
          if (stepIdx >= order.length) errandDone();
        } else {   // 벌 없이: 물건이 줄로 둥실 돌아오고 한 번 더 (소리 없음)
          redo++; it.el.style.transform = ""; clearSel();
          ctx.say(T("g.err.say.again"));
        }
      }

      function errandDone() {
        setPhase("between"); doneThis++;
        let roomDone = false;
        if (errandsNow < ERR_MAX) {
          errandsNow++; house = house.concat(pending);
          if (errandsNow % ROOM_N === 0) { roomDone = true; house = []; }
          if (errandsNow >= ERR_MAX) completed = true;
          mem.errands = errandsNow; mem.house = house; ctx.saveMem(); paintHouse();
        }
        pending = [];
        [330, 392, 523].forEach((f, i) => ctx.tone(f, 0.16, 0.04, i * 0.14));   // 심부름 끝 3음
        ctx.say(T(roomDone ? "g.err.say.room" : "g.err.say.errand"));
        if (roomDone) cheer();
        after(Math.max(JN.ms(1300), 60), () => {
          if (done) return;
          if (completed || doneThis >= PER_ROUND) return finishRound();
          if (roomDone) { clearPuts(); bg.innerHTML = sceneSvg(roomIdx()); paintHouse(); }
          else if (wasFull) clearPuts();
          nextErrand();
        });
      }

      /* ---- 판 끝 ---- */
      function finishRound() {
        done = true; setPhase("done"); clearTimeout(tm); clearTimeout(hideTm);
        const time = ctx.timer.stop();
        const fin = () => ctx.finish({ cleared: true, time, mistakes: redo, hints, metrics: { errands: doneThis, redo }, title: T("g.err.title"),
          line: T(completed ? "g.err.line.full" : wasFull ? "g.err.line.again" : "g.err.line", { n: errandsNow, max: ERR_MAX }), showTime: false });
        ctx.tone(392, 0.15, 0.04); ctx.tone(523, 0.2, 0.04, 0.12);
        if (completed) after(JN.ms(900), () => showDone(fin)); else after(JN.ms(600), fin);
      }
      /* 집 완성 카드: 방·부엌·정원 그림 + 따뜻한 말. '고마워요' 단추 하나. 저절로 새로 시작하지 않아요 */
      function showDone(next) {
        if (!ctx.alive()) return;
        const row = h("div", { class: "er-donescenes", "aria-hidden": "true" });
        for (let i = 0; i < 3; i++) row.appendChild(h("span", { svg: sceneSvg(i) }));
        const ok = h("button", { type: "button", class: "jn-btn jn-btn--big", id: "erDoneOk" }, T("g.err.done.ok"));
        const dc = h("div", { class: "er-done", id: "erDone", role: "group", "aria-label": T("g.err.done.title") },
          h("div", { class: "er-donecard" }, h("h2", { text: T("g.err.done.title") }), row, h("p", { text: T("g.err.done.body") }), ok));
        board.appendChild(dc);
        setPhase("card"); cheer();
        U.onTap(ok, () => { if (dc.isConnected) { dc.remove(); next(); } });
        ctx.say(T("g.err.done.say"));
        try { ok.focus({ preventScroll: true }); } catch (e) { /* 포커스는 없어도 돼요 */ }
      }

      /* 힌트 단추: 보미가 말을 한 번 더 들려주고 글자를 3초 보여 줘요 */
      ctx.hint(mode === "button", () => {
        if (done || phase !== "play") return;
        hints++;
        if (canSpeak()) JN.speak(errandText);
        showText(3); ctx.say(T("g.err.say.hint"));
      });

      function layout() {
        const W = wrap.clientWidth, H = wrap.clientHeight; if (W < 40 || H < 40) return;
        const w = Math.min(W, H * 4 / 3), hh = w * 3 / 4;
        scene.style.width = w.toFixed(1) + "px"; scene.style.height = hh.toFixed(1) + "px";
        ZONE_IDS.forEach((z) => {
          const g = ZONES[z], el = zoneEls[z];
          const zw = Math.max(g.w * w / 100, 56), zh = Math.max(g.h * hh / 75, 56);
          el.style.width = zw.toFixed(1) + "px"; el.style.height = zh.toFixed(1) + "px";
          el.style.left = clamp(g.x * w / 100 - zw / 2, 0, w - zw).toFixed(1) + "px";
          el.style.top = clamp(g.y * hh / 75 - zh / 2, 0, hh - zh).toFixed(1) + "px";
        });
      }
      layout();
      return {
        start() { ctx.timer.start(); ctx.say(T("g.err.say.begin")); layout(); nextErrand(); },
        resize: layout,
        visibility(hidden) { /* 저절로 움직이는 것도 벌도 없어서 따로 멈추지 않아요 */ },
        destroy() { done = true; clearTimeout(tm); clearTimeout(hideTm); clearTimeout(snailTm); clearTimeout(owlTm); JN.speakStop(); },
        test: {
          state: () => ({ phase, text: errandText, bubble: bubble.dataset.show, steps: JSON.stringify(order.map((s) => ({ key: s.key, place: s.place, left: s.left }))), stepIdx, stepsTotal: order.length,
            tray: JSON.stringify(tray.filter((t) => !t.placed).map((t) => ({ uid: t.uid, key: t.key }))), trayCount: tray.length, trayPlaced: tray.filter((t) => t.placed).length,
            errands: errandsNow, doneThis, perRound: PER_ROUND, redo, hints, spoken, completed, room: roomIdx(), house: JSON.stringify(house), pending: pending.length,
            puts: putEls.length, mode, wasFull, selected: selected ? selected.uid : 0, want: ZONE_IDS.filter((z) => zoneEls[z].classList.contains("want")).join(",") }),
        },
      };
    },
  });
})();
