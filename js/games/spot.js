/* 다른 그림 찾기 — 두 그림에서 다른 곳 찾기.
   단계가 오를수록 그림이 복잡해지고 그림체가 바뀌어요 (굵은 선 → 색면 → 색면+그림자 → 수채화 → 연필 스케치 → 사진).
   장면 그림은 원래 놀이의 데이터를 그대로 옮겼고, 1~2단계 '굵은 선'은 먹색 테두리를 더했어요. */
"use strict";
(function () {
  const U = JN.util, h = U.h, rnd = U.rnd, shuffle = U.shuffle, T = JN.t;   // T: 화면 글자는 lang/ko.js 에서
  const CONF = {
    levels: [
      { style: "line", items: [3, 5], props: 0, diffs: 3, kinds: ["remove", "color"] },
      { style: "line", items: [6, 8], props: 0, diffs: 3, kinds: ["remove", "color"] },
      { style: "flat", items: [8, 12], props: 0, diffs: 4, kinds: ["remove", "color", "scale", "move"] },
      { style: "flat2", items: null, props: 0, diffs: 5, kinds: ["color", "scale", "move", "remove", "flip"] },
      { style: "water", items: null, props: 6, diffs: 5, kinds: ["scale", "move", "flip", "pattern", "prop", "color"] },
      { style: "sketch", items: null, props: 8, diffs: 6, kinds: ["move", "flip", "pattern", "prop", "scale", "color"] },
      { style: "photo", diffs: 5, kinds: ["color", "erase", "flip", "scale"] },
      { style: "photo", diffs: 7, kinds: ["color", "erase", "flip", "scale"] },
    ],
    styleNames: { line: T("g.spot.style.line"), flat: T("g.spot.style.flat"), flat2: T("g.spot.style.flat2"), water: T("g.spot.style.water"), sketch: T("g.spot.style.sketch"), photo: T("g.spot.style.photo") },
    photoFolder: "photos/", photoAnswerFile: "photos/정답.json",
  };
  const STAGES = CONF.levels.map((l, i) => Object.assign({ id: "s" + (i + 1), name: T("g.spot.stage", { style: CONF.styleNames[l.style], n: l.diffs }) }, l));
  // 그림 색 (art.js 색 이름에서 가져와요)
  const K = Art.COLORS;
  const G = K.moss, S = K.night, Y = K.mustard, A = K.terracotta, P = K.lilac, I = Art.INK, W = K.white;
  const LINE = I;                // 윤곽선 = 디자인 가이드 연필 선색 #4A3F37 (모든 그림 단계 공통)
  const LINE_DARK = K.paper;     // 어두운 장면(우주)에서는 밝은 윤곽선
  const LINE_W = 3.0;            // 윤곽선 굵기 (그림 400칸 기준 ≈ 화면 3~4px)
  const PALETTE = [G, S, Y, A, P];

  /* ---------- 장면 데이터 (원래 놀이에서 그대로) ---------- */
  const star5 = (ro, ri) => { let p=[]; for (let i=0;i<10;i++){ const r = i%2?ri:ro, a = -Math.PI/2 + i*Math.PI/5; p.push((r*Math.cos(a)).toFixed(1)+','+(r*Math.sin(a)).toFixed(1)); } return p.join(' '); };
  const DRAW = {
    sun: c => `<g stroke="${c}" stroke-width="3" stroke-linecap="round">${[0,1,2,3,4,5,6,7].map(i=>{const a=i*Math.PI/4;return `<line x1="${(17*Math.cos(a)).toFixed(1)}" y1="${(17*Math.sin(a)).toFixed(1)}" x2="${(23*Math.cos(a)).toFixed(1)}" y2="${(23*Math.sin(a)).toFixed(1)}"/>`}).join('')}</g><circle r="13" fill="${c}"/>`,
    cloud: c => `<g fill="${c}"><ellipse cx="-9" cy="3" rx="13" ry="9"/><ellipse cx="9" cy="3" rx="13" ry="9"/><ellipse cx="0" cy="-4" rx="11" ry="10"/></g>`,
    tree: c => `<rect x="-4" y="4" width="8" height="18" rx="2" fill="${A}"/><g fill="${c}"><circle cy="-7" r="14"/><circle cx="-10" cy="2" r="9"/><circle cx="10" cy="2" r="9"/></g>`,
    flower: c => `<path d="M0 2 V22" stroke="${G}" stroke-width="3"/><g fill="${c}">${[0,1,2,3,4].map(i=>{const a=-Math.PI/2+i*2*Math.PI/5;return `<circle cx="${(8*Math.cos(a)).toFixed(1)}" cy="${(-4+8*Math.sin(a)).toFixed(1)}" r="6"/>`}).join('')}</g><circle cy="-4" r="5" fill="${c===Y?A:Y}"/>`,
    ball: c => `<circle r="14" fill="${c}"/><path d="M-14 0 Q0 -10 14 0 M-10 9 Q0 2 10 9" stroke="${W}" stroke-width="3" fill="none"/>`,
    bird: c => `<polygon points="-10,-2 -22,-9 -20,4" fill="${c}"/><ellipse rx="13" ry="9" fill="${c}"/><circle cx="10" cy="-6" r="7" fill="${c}"/><polygon points="16,-8 24,-5 16,-2" fill="${c===Y?A:Y}"/><circle cx="12" cy="-7" r="1.7" fill="${I}"/><path d="M-6 -1 Q-2 -14 7 -2 Z" fill="${W}" opacity=".7" stroke="none"/>`,
    slide: c => `<path d="M-16 -18 V22 M-8 -18 V22 M-16 -8 H-8 M-16 2 H-8 M-16 12 H-8" stroke="${I}" stroke-width="2.5"/><path d="M-8 -18 Q6 -16 10 4 Q14 20 24 22" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round"/>`,
    bench: c => `<rect x="-20" y="-10" width="40" height="6" rx="2" fill="${c}"/><rect x="-20" y="1" width="40" height="6" rx="2" fill="${c}"/><rect x="-16" y="7" width="4" height="11" fill="${I}"/><rect x="12" y="7" width="4" height="11" fill="${I}"/>`,
    kite: c => `<polygon points="0,-20 13,-3 0,12 -13,-3" fill="${c}"/><path d="M0 -20 V12 M-13 -3 H13" stroke="${W}" stroke-width="1.5"/><path d="M0 12 q10 4 8 12 q-2 6 12 8" stroke="${I}" stroke-width="1.5" fill="none"/>`,
    boat: c => `<path d="M0 6 V-22" stroke="${I}" stroke-width="2"/><polygon points="3,-20 3,2 19,2" fill="${W}" stroke="${I}" stroke-width="1"/><polygon points="0,-22 -9,-19 0,-16" fill="${A}"/><path d="M-22 5 H22 L14 17 H-14 Z" fill="${c}"/>`,
    umbrella: c => `<path d="M0 -14 V24" stroke="${I}" stroke-width="2.5"/><path d="M-22 0 A22 17 0 0 1 22 0 Z" fill="${c}"/><path d="M-8 0 A8 17 0 0 1 8 0" fill="${W}" opacity=".6" stroke="none"/>`,
    crab: c => `<path d="M-12 8 L-20 14 M12 8 L20 14 M-10 4 L-14 -4 M10 4 L14 -4" stroke="${c}" stroke-width="3" stroke-linecap="round"/><circle cx="-16" cy="-8" r="5" fill="${c}"/><circle cx="16" cy="-8" r="5" fill="${c}"/><ellipse cy="5" rx="14" ry="9" fill="${c}"/><path d="M-4 -2 V-9 M4 -2 V-9" stroke="${I}" stroke-width="1.5"/><circle cx="-4" cy="-10" r="2" fill="${I}"/><circle cx="4" cy="-10" r="2" fill="${I}"/>`,
    shell: c => `<path d="M0 12 L-15 -3 A16 16 0 0 1 15 -3 Z" fill="${c}"/><path d="M0 12 L-8 -12 M0 12 L0 -14 M0 12 L8 -12" stroke="${W}" stroke-width="1.5"/>`,
    starfish: c => `<polygon points="${star5(17,7)}" fill="${c}"/>`,
    bucket: c => `<path d="M-12 -8 Q0 -24 12 -8" stroke="${I}" stroke-width="2" fill="none"/><path d="M-12 -8 H12 L9 14 H-9 Z" fill="${c}"/>`,
    cup: c => `<path d="M8 -4 Q18 -4 16 4 Q14 9 8 8" stroke="${c}" stroke-width="3.5" fill="none"/><path d="M-12 -10 H8 V8 Q8 14 2 14 H-6 Q-12 14 -12 8 Z" fill="${c}"/>`,
    pot: c => `<rect x="-24" y="-4" width="8" height="4" rx="2" fill="${I}"/><rect x="16" y="-4" width="8" height="4" rx="2" fill="${I}"/><rect x="-16" y="-8" width="32" height="20" rx="4" fill="${c}"/><rect x="-18" y="-12" width="36" height="5" rx="2" fill="${I}" opacity=".7"/><circle cy="-14" r="3" fill="${I}"/>`,
    apple: c => `<circle cx="-5" cy="2" r="11" fill="${c}"/><circle cx="5" cy="2" r="11" fill="${c}"/><path d="M0 -8 V-15" stroke="${I}" stroke-width="2"/><ellipse cx="6" cy="-14" rx="6" ry="3" fill="${c===G?Y:G}" transform="rotate(-20 6 -14)"/>`,
    clock: c => `<circle r="17" fill="${W}" stroke="${c}" stroke-width="5"/><path d="M0 0 V-11 M0 0 H8" stroke="${I}" stroke-width="2.5" stroke-linecap="round"/>`,
    plate: c => `<ellipse cy="4" rx="22" ry="7" fill="${W}" stroke="${c}" stroke-width="3"/><ellipse cy="-1" rx="10" ry="6" fill="${c===Y?A:Y}"/>`,
    kettle: c => `<path d="M12 2 L23 -9" stroke="${c}" stroke-width="5" stroke-linecap="round"/><path d="M-8 -10 Q0 -22 8 -10" stroke="${I}" stroke-width="2.5" fill="none"/><path d="M-14 12 Q-16 -10 0 -10 Q16 -10 14 12 Z" fill="${c}"/>`,
    mushroom: c => `<rect x="-6" y="-1" width="12" height="17" rx="4" fill="${W}"/><path d="M-18 0 Q-18 -18 0 -18 Q18 -18 18 0 Z" fill="${c}"/><circle cx="-7" cy="-9" r="3" fill="${W}"/><circle cx="7" cy="-12" r="2.5" fill="${W}"/>`,
    rabbit: c => `<ellipse cx="-2" cy="8" rx="13" ry="11" fill="${c}"/><ellipse cx="6" cy="-20" rx="3.5" ry="9" fill="${c}"/><ellipse cx="13" cy="-19" rx="3.5" ry="9" fill="${c}" transform="rotate(20 13 -19)"/><circle cx="8" cy="-6" r="9" fill="${c}"/><circle cx="11" cy="-7" r="1.7" fill="${I}"/><circle cx="-15" cy="8" r="4" fill="${c===W?P:W}"/>`,
    butterfly: c => `<g fill="${c}"><ellipse cx="-8" cy="-5" rx="8" ry="9"/><ellipse cx="8" cy="-5" rx="8" ry="9"/><circle cx="-6" cy="7" r="6"/><circle cx="6" cy="7" r="6"/></g><rect x="-1.5" y="-12" width="3" height="24" rx="1.5" fill="${I}"/>`,
    rock: c => `<path d="M-18 10 Q-20 -6 -6 -10 Q8 -16 16 -4 Q22 8 14 12 Z" fill="${c}"/>`,
    planet: c => `<circle r="15" fill="${c}"/><ellipse rx="25" ry="6" fill="none" stroke="${W}" stroke-width="2.5" transform="rotate(-20)"/>`,
    star: c => `<polygon points="${star5(16,7)}" fill="${c}"/>`,
    rocket: c => `<g transform="rotate(30)"><polygon points="-9,4 -16,16 -9,12" fill="${A}"/><polygon points="9,4 16,16 9,12" fill="${A}"/><path d="M-5 11 L0 22 L5 11 Z" fill="${Y}"/><path d="M0 -24 Q10 -12 9 11 H-9 Q-10 -12 0 -24 Z" fill="${c}"/><circle cy="-6" r="4.5" fill="${c===S?W:S}"/></g>`,
    moon: c => `<path d="M6 -16 A16 16 0 1 0 6 16 A12 12 0 1 1 6 -16 Z" fill="${c}"/>`,
    satellite: c => `<path d="M0 -6 V-14" stroke="${W}" stroke-width="2"/><circle cy="-15" r="2.2" fill="${W}"/><rect x="-24" y="-4" width="15" height="8" fill="${S}" stroke="${W}"/><rect x="9" y="-4" width="15" height="8" fill="${S}" stroke="${W}"/><rect x="-7" y="-7" width="14" height="14" rx="2" fill="${c}"/>`,
    comet: c => `<path d="M-3 -6 L-26 -18 L-6 3 Z" fill="${c}" opacity=".55" stroke="none"/><circle r="8" fill="${c}"/>`,
    fish: c => `<polygon points="-11,0 -22,-9 -22,9" fill="${c}"/><ellipse rx="14" ry="9" fill="${c}"/><circle cx="7" cy="-2" r="2" fill="${I}"/>`,
  };
  // 좌우가 다르게 생긴 물건만 '방향 뒤집기'가 가능해요
  const ASYM = new Set(['bird','slide','boat','cup','apple','clock','kettle','rabbit','rock','planet','rocket','moon','comet','fish']);
  
  // ---------- 장면 ----------
  function spaceDots(){ let s='', seed=7; const r=()=>{ seed=(seed*9301+49297)%233280; return seed/233280; };
    for (let i=0;i<40;i++) s += `<circle cx="${(r()*400).toFixed(0)}" cy="${(r()*300).toFixed(0)}" r="${(0.8+r()*1.2).toFixed(1)}" fill="#fff" opacity=".5"/>`; return s; }
  const SCENES = [
    {name:'놀이터', bg:`<rect width="400" height="190" fill="#E4F0F7"/><rect y="190" width="400" height="110" fill="#E2EFE3"/>`,
     items:[['sun',45,45,1,Y],['cloud',140,48,1,W],['kite',245,60,1,A],['cloud',335,45,.9,W],['bird',175,115,.8,P],['tree',345,152,1.5,G],
            ['slide',90,178,1.5,A],['bench',232,205,1.2,S],['ball',160,258,.8,P],['flower',40,262,.8,P],['flower',290,262,.8,A],['butterfly',365,258,.7,Y]]},
    {name:'바닷가', bg:`<rect width="400" height="130" fill="#E4F0F7"/><rect y="130" width="400" height="75" fill="#BFDBEC"/><path d="M0 132 Q25 124 50 132 T100 132 T150 132 T200 132 T250 132 T300 132 T350 132 T400 132" stroke="#fff" stroke-width="3" fill="none"/><rect y="205" width="400" height="95" fill="#FBEBC4"/>`,
     items:[['sun',350,45,1,Y],['cloud',90,45,1,W],['cloud',225,38,.8,W],['bird',160,92,.7,P],['boat',275,150,1.3,A],['fish',95,172,.8,Y],
            ['umbrella',60,232,1.5,G],['crab',200,262,.9,A],['shell',300,272,.7,P],['starfish',362,236,.8,Y],['bucket',140,272,.8,S],['ball',250,228,.75,P]]},
    {name:'부엌', bg:`<rect width="400" height="300" fill="#FDF1D8"/><rect x="30" y="20" width="120" height="85" rx="6" fill="#E4F0F7" stroke="#fff" stroke-width="6"/><path d="M90 20 V105 M30 62 H150" stroke="#fff" stroke-width="4"/><rect x="170" y="102" width="220" height="7" rx="3" fill="${A}" opacity=".7"/><rect y="198" width="400" height="12" fill="${A}" opacity=".7"/><rect y="210" width="400" height="90" fill="#F7DCCF"/><path d="M100 215 V300 M200 215 V300 M300 215 V300" stroke="#fff" stroke-width="3"/>`,
     items:[['clock',340,48,1,S],['flower',90,84,.7,A],['cup',198,86,.8,S],['apple',252,88,.7,A],['cup',305,86,.8,Y],
            ['pot',65,178,1.2,G],['kettle',170,176,1.1,P],['plate',262,190,1.05,S],['apple',338,180,.8,G],['ball',125,262,.7,Y],['fish',290,262,.75,S]]},
    {name:'숲', bg:`<rect width="400" height="150" fill="#E4F0F7"/><ellipse cx="120" cy="160" rx="200" ry="40" fill="#CFE5D3"/><rect y="150" width="400" height="150" fill="#D9EBDC"/>`,
     items:[['sun',60,45,1,Y],['cloud',200,40,1,W],['bird',320,55,.8,S],['tree',40,150,1.5,G],['tree',330,140,1.6,G],['tree',190,128,1.2,G],
            ['butterfly',125,178,.7,P],['mushroom',105,245,.9,A],['rabbit',250,232,1.1,W],['flower',45,278,.7,Y],['flower',362,262,.7,P],['rock',305,282,.8,P],['mushroom',190,280,.6,S]]},
    {name:'우주', dark:true, bg:`<rect width="400" height="300" fill="${I}"/>${spaceDots()}`,
     items:[['planet',80,72,1.3,A],['star',165,48,.7,Y],['moon',330,60,1.1,Y],['star',262,105,.6,W],['rocket',200,160,1.4,W],['star',48,200,.7,S],
            ['comet',335,190,1,S],['satellite',100,255,1,P],['planet',270,255,.9,G],['star',372,282,.6,Y],['star',185,272,.6,P]]},
  ];
  
  // 바닥에 놓인 물건 (색면+그림자 그림체에서 그림자를 그려요)
  const GROUNDED = new Set(['tree','flower','slide','bench','umbrella','crab','shell','starfish','bucket','pot','kettle','mushroom','rabbit','rock','ball','cup','apple','plate']);
  const PROP_TYPES = ['star','flower','shell','ball','butterfly','apple'];

  /* ---------- 사진 단계: photos/사진목록.js (index.html 이 미리 읽음) → 이미지 크기 확인 → (http 일 때) 정답.json ---------- */
  let PHOTOS = [];
  function probe(entry) {
    return new Promise((resolve) => {
      const im = new Image(); let ok = false;
      im.onload = () => { ok = true; resolve(Object.assign({}, entry, { w: im.naturalWidth, h: im.naturalHeight })); };
      im.onerror = () => resolve(null);
      setTimeout(() => { if (!ok) resolve(null); }, 4000);
      im.src = encodeURI(CONF.photoFolder + entry.file);
    });
  }
  (async function loadPhotos() {
    try {
      const list = (Array.isArray(window.PHOTO_LIST) ? window.PHOTO_LIST : []).map((e) => (typeof e === "string" ? { file: e } : e))
        .filter((e) => e && typeof e.file === "string" && !/^[a-z]+:|^\/\//i.test(e.file));
      if (!list.length) return;
      if (/^https?:$/.test(location.protocol)) {
        try { const r = await fetch(CONF.photoAnswerFile); if (r.ok) { const ans = await r.json(); list.forEach((e) => { if (!e.answers && ans[e.file]) e.answers = ans[e.file]; }); } } catch (e) { /* 없어도 돼요 */ }
      }
      PHOTOS = (await Promise.all(list.map(probe))).filter(Boolean);
    } catch (e) { PHOTOS = []; }
  })();
  const isPhoto = (i) => CONF.levels[i].style === "photo";
  /* 달라진 그림 찾기(js/games/changed.js)가 같은 장면 그림을 다시 쓰려고 꺼내 두는 것 (읽기만 해요) */
  JN.spotArt = { SCENES, ASYM, renderScene, applyKind, okKind, hitR, COLORS: { yellow: Y, white: W } };

  function hitR(it) { return Math.max(22 * it.s, 18) + 12; }
  /* 그림체 원칙:
     - 모든 그림 단계에서 물건마다 굵고 진한 윤곽선(LINE_W, 먹색). 우주처럼 어두운 장면은 밝은 선.
     - 수채화·연필 느낌은 '바탕'에만 번짐/종이결을 주고, 물건은 선이 또렷하게(아주 약한 손떨림만).
     - 단계가 오르면 '흐려서'가 아니라 '물건이 많고 차이가 작아서' 어려워져요. */
  function itemSvg(it, style, dark) {
    const sx = it.flip ? -it.s : it.s;
    let out = "";
    if ((style === "flat2" || style === "water") && GROUNDED.has(it.type)) out += `<ellipse cx="${it.x}" cy="${(it.y + 21 * it.s).toFixed(1)}" rx="${(19 * it.s).toFixed(1)}" ry="${(4 * it.s).toFixed(1)}" fill="${I}" opacity=".16"/>`;
    let body = DRAW[it.type](it.c);
    if (it.pattern) {
      const pc = (it.c === W || it.type === "clock" || it.type === "plate") ? I : W;
      body += `<g fill="${pc}" stroke="none"><circle cx="-6" cy="1" r="4.5"/><circle cx="6" cy="-6" r="4.2"/><circle cx="6" cy="7" r="4.2"/></g>`;
    }
    // 윤곽선: 그림 크기와 상관없이 화면에서 같은 굵기 (작은 물건은 조금 가늘게, 최소 2.4)
    const lw = Math.max(2.4, LINE_W * Math.min(1, 0.55 + it.s * 0.5));
    // paint-order: 선을 먼저 그리고 색을 위에 → 바깥쪽 절반만 보여서 얇은 모양(초승달 등)도 색이 살아요. 그래서 굵기는 2배로.
    body = `<g stroke="${dark ? LINE_DARK : LINE}" stroke-width="${(2 * lw / it.s).toFixed(2)}" paint-order="stroke" stroke-linejoin="round" stroke-linecap="round">${body}</g>`;
    return out + `<g transform="translate(${it.x} ${it.y}) scale(${sx} ${it.s})">${body}</g>`;
  }
  function styleDefs(id, style) {
    // 바탕(bg)만 번지게 하는 필터
    if (style === "water") return `<filter id="bgfx-${id}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="8" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="1.4"/></filter>`
      + `<filter id="fx-${id}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="1" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G"/></filter>`
      + `<filter id="paper-${id}"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="2"/><feColorMatrix values="0 0 0 0 0.95  0 0 0 0 0.9  0 0 0 0 0.8  0 0 0 0.18 0"/></filter>`;
    // 연필: 물건 선은 진하게, 손떨림만 살짝. 바탕은 종이결
    if (style === "sketch") return `<filter id="fx-${id}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="turbulence" baseFrequency="0.06" numOctaves="2" seed="9" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.4" xChannelSelector="R" yChannelSelector="G" result="d"/><feColorMatrix in="d" type="saturate" values="0.85"/></filter>`
      + `<filter id="paper-${id}"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" seed="5"/><feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 0 0.2  0 0 0 0.10 0"/></filter>`;
    if (style === "flat2") return `<pattern id="pt-${id}" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.4" fill="${W}"/><circle cx="10" cy="10" r="1.4" fill="${W}"/></pattern>`;
    return "";
  }
  function renderScene(svg, scene, items, style) {
    const id = svg.id, fx = style === "water" || style === "sketch";
    const bgExtra = (style === "flat2" ? `<rect width="400" height="300" fill="url(#pt-${id})" opacity=".35"/>` : "")
      + (fx ? `<rect width="400" height="300" filter="url(#paper-${id})"/>` : "");
    svg.innerHTML = `<defs>${styleDefs(id, style)}</defs><g class="scene st-${style}"><g class="bg" ${style === "water" ? `filter="url(#bgfx-${id})"` : ""}>${scene.bg}</g><g class="bgx" pointer-events="none">${bgExtra}</g><g class="items" ${fx ? `filter="url(#fx-${id})"` : ""}>${items.filter((o) => !o.removed).map((o) => itemSvg(o, style, scene.dark)).join("")}</g></g><g class="hintLayer"></g><g class="marks"></g>`;
  }
  function addProps(base, count) {
    const out = [];
    for (let k = 0, tries = 0; k < count && tries < 400; tries++) {
      const p = { type: PROP_TYPES[rnd(PROP_TYPES.length)], x: 25 + Math.random() * 350, y: 30 + Math.random() * 245, s: 0.52 + Math.random() * 0.1, c: PALETTE[rnd(5)], flip: false, small: true };
      if (GROUNDED.has(p.type) && p.y < 200) p.y = 200 + Math.random() * 75;
      if (base.concat(out).every((o) => Math.hypot(o.x - p.x, o.y - p.y) > 22 * o.s + 22 * p.s + 14)) { out.push(p); k++; }
    }
    return out;
  }
  /* ---------- 차이 크기 최소 기준 ----------
     - 색 바꾸기: 원래 색과 충분히 다른 색만 (RGB 거리 MIN_COLOR_DIST 이상)
     - 크기 바꾸기: 1.5배 또는 0.6배, 그리고 지름 차이가 화면 MIN_SIZE_DIFF 칸 이상
     - 무늬·뒤집기·옮기기: 작은 물건(s < MIN_S_DETAIL)에는 안 씀 (작으면 눈으로 구분이 어려움) */
  const MIN_COLOR_DIST = 95, MIN_SIZE_DIFF = 12, MIN_S_DETAIL = 0.75, MIN_S_PATTERN = 1.0;
  const rgb = (hx) => [1, 3, 5].map((i) => parseInt(hx.slice(i, i + 2), 16));
  const colorDist = (a, b) => { const x = rgb(a), y = rgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
  function okKind(kind, o) {
    if (kind === "pattern") return o.s >= MIN_S_PATTERN;   // 무늬 점이 화면 지름 ~9px 이상
    if (kind === "color") return o.type !== "plate";        // 접시는 얇은 테두리만 바뀌어서 안 씀
    if (kind === "flip" || kind === "move") return o.s >= MIN_S_DETAIL;
    if (kind === "scale") return o.s >= 0.6;
    return true;
  }
  function applyKind(kind, o, m) {
    if (kind === "color") {
      const opts = PALETTE.concat(W).filter((c) => c !== o.c).map((c) => [c, colorDist(c, o.c)]).sort((a, b) => b[1] - a[1]);
      const far = opts.filter(([, d]) => d >= MIN_COLOR_DIST);
      m.c = far.length ? far[rnd(far.length)][0] : opts[0][0];
    }
    else if (kind === "remove") m.removed = true;
    else if (kind === "scale") {
      let f = Math.random() < 0.5 ? 1.5 : 0.6;
      if (Math.abs(f - 1) * 44 * o.s < MIN_SIZE_DIFF) f = 1 + MIN_SIZE_DIFF / (44 * o.s);   // 44 = 물건 기본 지름
      m.s = o.s * f;
    }
    else if (kind === "flip") m.flip = true;
    else if (kind === "pattern") m.pattern = true;
    else if (kind === "move") {
      const opts = (GROUNDED.has(o.type) ? [[40, 0], [-40, 0]] : [[36, 0], [-36, 0], [0, 30], [0, -30]]).filter(([dx, dy]) => o.x + dx > 25 && o.x + dx < 375 && o.y + dy > 25 && o.y + dy < 280);
      const [dx, dy] = opts.length ? opts[rnd(opts.length)] : [0, 0]; m.x = o.x + dx; m.y = o.y + dy;
    }
  }

  JN.registerGame({
    id: "다른그림", stages: STAGES,
    isStageOpen: (i) => !isPhoto(i) || PHOTOS.length > 0,
    stageLabel: (st) => st.name,
    hintHelp: { always: T("g.spot.hh.always"), button: T("g.spot.hh.button"), none: T("g.spot.hh.none") },
    extraSettings: [{ key: "hintAfterSec", type: "select", label: T("g.spot.x.after"), def: 30, options: [15, 30, 45, 60].map((n) => [n, T("common.sec", { n })]) }],
    parentNote: T("g.spot.parentNote"),
    chart: { key: "time", label: T("common.time"), unit: T("common.unit.sec") },
    describe: (e) => U.fmtTime(e.time) + T("g.spot.describe", { m: e.mistakes || 0 }) + (e.hints ? T("g.number.describe.hint", { n: e.hints }) : ""),
    intro: (st) => T("g.spot.intro", { n: st.diffs }),
    mount(ctx) {
      const lv = ctx.stage, set = ctx.settings, mode = set.hintMode, board = ctx.board, mem = ctx.mem;
      board.classList.add("sd-board");
      const NS = "http://www.w3.org/2000/svg";
      const mk = (id, tag) => { const svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 400 300"); svg.id = id; svg.setAttribute("aria-label", T("g.spot.pic", { tag })); return svg; };
      const left = mk("sdL", T("g.spot.tag.a")), right = mk("sdR", T("g.spot.tag.b"));
      const wrapL = h("div", { class: "sd-pic" }, h("span", { class: "tag", text: T("g.spot.tag.a") })), wrapR = h("div", { class: "sd-pic" }, h("span", { class: "tag", text: T("g.spot.tag.b") }));
      wrapL.appendChild(left); wrapR.appendChild(right);
      const pics = h("div", { class: "sd-pics" }, wrapL, wrapR); board.appendChild(pics);
      let diffs = [], found = 0, done = true, hintShown = false, hints = 0, autoHints = 0, wrong = 0, lastFind = 0, iv = 0;
      const dotsBox = h("span", { class: "sd-dots", "aria-label": T("g.spot.count.aria") });
      ctx.status(dotsBox);

      function makeDrawing() {
        const sceneIdx = (mem.scene | 0) % SCENES.length, scene = SCENES[sceneIdx], style = scene.style || lv.style;
        let all = scene.items.map(([type, x, y, s, c], i) => ({ id: i, type, x, y, s, c, flip: false }));
        if (lv.items) { const k = Math.min(all.length, lv.items[0] + rnd(lv.items[1] - lv.items[0] + 1)); all = shuffle(all.slice()).slice(0, Math.max(k, lv.diffs)).sort((a, b) => a.id - b.id); }
        const base = all.concat(addProps(all, lv.props || 0)); base.forEach((o, i) => (o.id = i));
        const mod = base.map((o) => Object.assign({}, o)), used = new Set(), list = [], kinds = shuffle(lv.kinds.slice());
        for (let i = 0; i < lv.diffs; i++) {
          let kind = kinds[i % kinds.length], pool = base.filter((o) => !used.has(o.id) && !o.small);
          if (kind === "prop") { pool = base.filter((o) => !used.has(o.id) && o.small); kind = Math.random() < 0.5 ? "remove" : "color"; }
          if (kind === "flip") pool = pool.filter((o) => ASYM.has(o.type));
          pool = pool.filter((o) => okKind(kind, o));
          if (!pool.length) { pool = base.filter((o) => !used.has(o.id)); kind = Math.random() < 0.5 ? "color" : "remove"; }
          if (!pool.length) break;
          const o = pool[rnd(pool.length)]; used.add(o.id); applyKind(kind, o, mod[o.id]);
          list.push({ kind, a: o, b: mod[o.id], found: false });
        }
        const swap = Math.random() < 0.5;
        renderScene(swap ? right : left, scene, base, style); renderScene(swap ? left : right, scene, mod, style);
        list.forEach((d) => { d.left = swap ? d.b : d.a; d.right = swap ? d.a : d.b; });
        mem.scene = (sceneIdx + 1) % SCENES.length;
        return list;
      }
      function makePhoto() {
        const ph = PHOTOS[(mem.photo | 0) % PHOTOS.length];
        mem.photo = (mem.photo | 0) + 1;
        const sc = Math.max(400 / ph.w, 300 / ph.h), offX = (400 - ph.w * sc) / 2, offY = (300 - ph.h * sc) / 2, spots = [];
        shuffle((ph.answers || []).slice()).forEach((a) => {
          if (spots.length >= lv.diffs) return;
          const s = { x: offX + a.x * ph.w * sc, y: offY + a.y * ph.h * sc, r: Math.max(18, (a.r || 0.06) * ph.w * sc), kind: a.kind };
          if (s.x > 0 && s.x < 400 && s.y > 0 && s.y < 300) spots.push(s);
        });
        for (let t = 0; spots.length < lv.diffs && t < 500; t++) {
          const r = 24 + Math.random() * 10, s = { x: r + 12 + Math.random() * (400 - 2 * r - 24), y: r + 12 + Math.random() * (300 - 2 * r - 24), r };
          if (spots.every((o) => Math.hypot(o.x - s.x, o.y - s.y) > o.r + s.r + 14)) spots.push(s);
        }
        const href = encodeURI(CONF.photoFolder + ph.file).replace(/"/g, "");
        const img = (t) => `<image href="${href}" x="0" y="0" width="400" height="300" preserveAspectRatio="xMidYMid slice" ${t ? `transform="${t}"` : ""}/>`;
        const swap = Math.random() < 0.5, modSvg = swap ? left : right, baseSvg = swap ? right : left;
        let defs = `<filter id="hue-${modSvg.id}"><feColorMatrix type="hueRotate" values="140"/><feColorMatrix type="saturate" values="1.5"/></filter><radialGradient id="fg-${modSvg.id}"><stop offset=".55" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>`, mods = "";
        const list = spots.map((s, i) => {
          const kind = s.kind && lv.kinds.includes(s.kind) ? s.kind : lv.kinds[i % lv.kinds.length];
          defs += `<mask id="cp-${modSvg.id}-${i}" maskUnits="userSpaceOnUse"><circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${s.r.toFixed(1)}" fill="url(#fg-${modSvg.id})"/></mask>`;
          let inner;
          if (kind === "color") inner = `<g filter="url(#hue-${modSvg.id})">${img()}</g>`;
          else if (kind === "flip") inner = img(`translate(${(2 * s.x).toFixed(1)} 0) scale(-1 1)`);
          else if (kind === "scale") inner = img(`translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) scale(1.4) translate(${(-s.x).toFixed(1)} ${(-s.y).toFixed(1)})`);
          else { const dx = (s.x > 200 ? -1 : 1) * s.r * 2.4; inner = img(`translate(${(-dx).toFixed(1)} 0)`); }
          mods += `<g mask="url(#cp-${modSvg.id}-${i})">${inner}</g>`;
          const o = { x: s.x, y: s.y, s: s.r / 22 };
          return { kind, a: o, b: o, left: o, right: o, found: false };
        });
        baseSvg.innerHTML = `${img()}<g class="hintLayer"></g><g class="marks"></g>`;
        modSvg.innerHTML = `<defs>${defs}</defs>${img()}${mods}<g class="hintLayer"></g><g class="marks"></g>`;
        return list;
      }
      function paintDots() {
        dotsBox.textContent = "";
        diffs.forEach((d) => dotsBox.appendChild(h("i", { class: d.found ? "on" : null, svg: d.found ? Art.icon("확인") : "" })));
      }
      function layout() {
        const W = board.clientWidth - 16, H = board.clientHeight - 16;
        if (W < 40 || H < 40) return;
        const side = W / H > 1.2;   // 넓으면 좌우, 좁으면 위아래
        pics.classList.toggle("side", side);
        const gap = side ? 24 : 12;
        let w = side ? Math.min((W - gap) / 2, H * 4 / 3) : Math.min(W, (H - gap) / 2 * 4 / 3);
        w = Math.max(100, Math.min(w, side ? 560 : 640));
        for (const p of [wrapL, wrapR]) { p.style.width = Math.floor(w) + "px"; p.style.height = Math.floor(w * 0.75) + "px"; }
      }
      function svgPoint(svg, e) {
        const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
        const m = svg.getScreenCTM(); if (!m) return null;
        const p = pt.matrixTransform(m.inverse()); return [p.x, p.y];
      }
      function circle(svg, cls, x, y, r, layer) {
        if (cls === "mark" && window.rough) {   // 찾은 곳 = 연필 동그라미
          const g = document.createElementNS(NS, "g"); g.setAttribute("class", "mark");
          g.innerHTML = JN.rough.paths("ellipse", [+x, +y, r * 2.1, r * 1.95], { stroke: JN.cssVar("--c-olive-deep", "#5E6B2C"), strokeWidth: 3.6, roughness: 1.5, seed: 1 + Math.floor(x + y) });
          svg.querySelector(layer || ".marks").appendChild(g); return g;
        }
        const c = document.createElementNS(NS, "circle");
        c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", r); c.setAttribute("class", cls);
        svg.querySelector(layer || ".marks").appendChild(c); return c;
      }
      function onTap(svg, e) {
        if (done) return;
        const p = svgPoint(svg, e); if (!p) return;
        let best = null, bd = Infinity;
        diffs.forEach((d) => { if (d.found) return; [d.a, d.b].forEach((o) => { const dist = Math.hypot(p[0] - o.x, p[1] - o.y); if (dist <= hitR(o) && dist < bd) { best = d; bd = dist; } }); });
        if (best) {
          best.found = true; found++; lastFind = Date.now(); clearHint();
          circle(left, "mark", best.left.x, best.left.y, hitR(best.left) - 4); circle(right, "mark", best.right.x, best.right.y, hitR(best.right) - 4);
          ctx.sound("ok"); paintDots();
          if (found === diffs.length) finish(); else ctx.say(found === 1 ? T("g.spot.say.first") : T("g.spot.say.more"));
        } else {
          wrong++;
          const r = circle(svg, "ripple", p[0], p[1], 22); setTimeout(() => r.remove(), 800);
        }
      }
      [left, right].forEach((svg) => svg.addEventListener("pointerdown", (e) => { e.preventDefault(); onTap(svg, e); }));
      function clearHint() { hintShown = false; [left, right].forEach((s) => { const l = s.querySelector(".hintLayer"); if (l) l.innerHTML = ""; }); }
      function showHint() {
        const d = diffs.find((x) => !x.found); if (!d) return;
        hintShown = true;
        const ang = Math.random() * Math.PI * 2, off = hitR(d.a) * 0.5;
        [[left, d.left], [right, d.right]].forEach(([svg, o]) => {
          const layer = svg.querySelector(".hintLayer");
          layer.innerHTML = `<defs><radialGradient id="hg${svg.id}"><stop offset="0" stop-color="${Y}" stop-opacity=".75"/><stop offset="1" stop-color="${Y}" stop-opacity="0"/></radialGradient></defs>`;
          const c = circle(svg, "hintglow", (o.x + Math.cos(ang) * off).toFixed(1), (o.y + Math.sin(ang) * off).toFixed(1), (hitR(o) * 2).toFixed(1), ".hintLayer");
          c.setAttribute("fill", `url(#hg${svg.id})`); c.setAttribute("pointer-events", "none");
        });
      }
      function finish() {
        done = true; clearHint(); clearInterval(iv);
        const time = ctx.timer.stop();
        ctx.finish({ cleared: true, time, mistakes: wrong, hints, metrics: { autoHints }, title: T("g.spot.title"), line: T("g.spot.line", { n: diffs.length }),
          bestKey: lv.id, bestValue: U.r1(time) });
      }
      ctx.hint(mode === "button", () => { if (!done && !hintShown) { hints++; showHint(); } });
      diffs = lv.style === "photo" && PHOTOS.length ? makePhoto() : makeDrawing();
      paintDots(); layout();
      return {
        start() {
          done = false; lastFind = Date.now(); ctx.timer.start(); ctx.say(T("g.spot.say.begin"));
          iv = setInterval(() => {
            if (!done && mode === "always" && !hintShown && Date.now() - lastFind >= (Number(set.hintAfterSec) || 30) * 1000 / JN.TIME_SCALE) { autoHints++; showHint(); }
          }, 500);
        },
        resize: layout,
        destroy() { done = true; clearInterval(iv); },
        test: { diffs: () => diffs.map((d) => ({ x: d.left.x, y: d.left.y, found: d.found })), toClient: (x, y) => { const r = left.getBoundingClientRect(); return [r.left + x * r.width / 400, r.top + y * r.height / 300]; } },
      };
    },
  });
})();
