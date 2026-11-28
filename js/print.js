/* =========================================================
   인쇄용 활동지 (print.html, 보호자용) — 2026-11-28
   - 앱 놀이와 짝이 되는 종이 활동지 무료 샘플 3종: ① 달롱 미로(쉬움, 갈림길 2개) ② 달라진 곳 찾기(쉬움, 3곳) ③ 그림 순서 오려 붙이기(3장)
   - 그림은 앱에 있는 코드 그림만 다시 써요: Art(보미·달롱·동물…), JN.spotArt(다른 그림 찾기 장면), JN.orderArt(그림 순서 장면). 새 캐릭터 없음.
   - '흑백 선화'는 그림 속 색을 하얗게 바꾸고 연필 선만 남겨요(잉크 절약 + 색칠 놀이). 색 그림도 고를 수 있어요.
   - 같은 '그림 번호'(seed)면 늘 같은 그림이 나와요(시험·PDF 다시 만들기용). '새 그림으로 바꾸기'를 누르면 번호가 바뀌어요.
   - 바깥 주소 요청·기록 저장·추적 코드 없음. 주소(?…)도 읽지 않아요.
   ========================================================= */
"use strict";
(function () {
  const T = JN.t, K = Art.COLORS, INK = Art.INK;
  const NS = "http://www.w3.org/2000/svg";
  Art.config({ texture: false });   // 종이에는 번짐 필터 없이 또렷한 선으로

  /* ---------- 같은 번호면 같은 그림: 그리는 동안만 Math.random 을 번호로 정한 난수로 바꿔요 ---------- */
  function seeded(seed, fn) {
    let a = (seed * 2654435761) >>> 0 || 1;
    const r = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const keep = Math.random;
    Math.random = r;
    try { return fn(); } finally { Math.random = keep; }
  }
  const rnd = (n) => Math.floor(Math.random() * n);
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  /** Art 의 <svg …> 문자열을 다른 SVG 안 (x,y,w,h) 자리에 넣어요 */
  const place = (svgStr, x, y, w, hh) => svgStr.replace("<svg ", `<svg x="${x}" y="${y}" width="${w}" height="${hh}" `);

  /* ================= 난이도 (1 쉬움 · 2 보통 · 3 어려움) — 카테고리마다 =================
     미로: 칸 수·갈림길 수 / 달라진 곳: 찾을 곳 수·물건 수 / 그림 순서: 카드 수 */
  const LEVELS = {
    maze: [{ n: 5, forks: 2 }, { n: 7, forks: 4 }, { n: 9, forks: 7 }],
    changed: [{ diffs: 3, kinds: ["remove", "scale", "move"], items: [4, 6], bigOnly: true },
      { diffs: 4, kinds: ["remove", "scale", "move"], items: [7, 9] },
      { diffs: 5, kinds: ["remove", "scale", "move", "flip"], items: null }],
    order: [{ n: 3 }, { n: 4 }, { n: 5 }],
  };
  const lvOf = (cat, lv) => LEVELS[cat][Math.min(3, Math.max(1, lv | 0 || 1)) - 1];

  /* ================= ① 달롱 미로 (쉬움 5×5 갈림길 2개 → 어려움 9×9) ================= */
  const MAZE_FORKS = 2;   // 쉬움 기준 (시험용)
  function genMaze(n) {
    const R = [], D = [], vis = [];
    for (let y = 0; y < n; y++) { R.push(Array(n).fill(true)); D.push(Array(n).fill(true)); vis.push(Array(n).fill(false)); }
    const stack = [[0, 0]]; vis[0][0] = true;
    while (stack.length) {
      const [x, y] = stack[stack.length - 1], nb = [];
      if (x > 0 && !vis[y][x - 1]) nb.push([x - 1, y]);
      if (x < n - 1 && !vis[y][x + 1]) nb.push([x + 1, y]);
      if (y > 0 && !vis[y - 1][x]) nb.push([x, y - 1]);
      if (y < n - 1 && !vis[y + 1][x]) nb.push([x, y + 1]);
      if (!nb.length) { stack.pop(); continue; }
      const [nx, ny] = nb[rnd(nb.length)];
      if (nx > x) R[y][x] = false; else if (nx < x) R[y][nx] = false; else if (ny > y) D[y][x] = false; else D[ny][x] = false;
      vis[ny][nx] = true; stack.push([nx, ny]);
    }
    return { n, R, D };
  }
  /** 칸마다 열린 방향 수 */
  function opens(m, x, y) {
    let k = 0;
    if (x < m.n - 1 && !m.R[y][x]) k++;
    if (x > 0 && !m.R[y][x - 1]) k++;
    if (y < m.n - 1 && !m.D[y][x]) k++;
    if (y > 0 && !m.D[y - 1][x]) k++;
    return k;
  }
  /** 갈림길 = 길이 셋 이상으로 나뉘는 칸 (출발 칸은 두 갈래부터 갈림길) */
  function forks(m) {
    let f = 0;
    for (let y = 0; y < m.n; y++) for (let x = 0; x < m.n; x++) {
      const k = opens(m, x, y);
      if ((x === 0 && y === 0) ? k >= 2 : k >= 3) f++;
    }
    return f;
  }
  function makeMaze(lv) {
    let best = null, bestGap = 99;
    for (let t = 0; t < 600; t++) {
      const m = genMaze(lv.n), gap = Math.abs(forks(m) - lv.forks);
      if (gap < bestGap) { best = m; bestGap = gap; }
      if (!gap) break;
    }
    return best;
  }
  const HOUSE = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">` +
    `<path d="M18 48 H82 V88 H18 Z" fill="${K.sand}"/><path d="M10 50 L50 16 L90 50 Z" fill="${K.terracotta}"/>` +
    `<path d="M42 88 V66 Q50 58 58 66 V88" fill="${K.bark}"/><rect x="62" y="56" width="13" height="12" rx="2" fill="${K.sky}"/>` +
    `<path d="M68 31 V20 H76 V38" fill="${K.paper}"/></g>`;
  function mazeSvg(m) {
    const C = 100, n = m.n, W = n * C, lw = 7;
    let walls = `<path d="M0 0 H${W} V${W - C} M${W} ${W} H0 V${C}" fill="none"/>`;   // 바깥 벽 (왼쪽 위 = 들어가는 문, 오른쪽 아래 = 나가는 문)
    let d = "";
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (x < n - 1 && m.R[y][x]) d += `M${(x + 1) * C} ${y * C}V${(y + 1) * C}`;
      if (y < n - 1 && m.D[y][x]) d += `M${x * C} ${(y + 1) * C}H${(x + 1) * C}`;
    }
    walls += `<path d="${d}" fill="none"/>`;
    const snail = place(Art.snail({ face: "웃음", pose: "인사", label: T("mascot.snail") }), 4, 6, 92, 92);
    return `<svg xmlns="${NS}" viewBox="-60 -10 ${W + 120} ${W + 20}" class="ps-maze" role="img" aria-label="${T("print.maze.title")}">` +
      `<rect x="0" y="0" width="${W}" height="${W}" fill="${K.paper}" stroke="none"/>` +
      `<g stroke="${INK}" stroke-width="${lw}" stroke-linecap="round" stroke-linejoin="round">${walls}</g>` +
      `<path d="M-48 50 H-8 M-22 36 L-8 50 L-22 64" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` +
      snail + HOUSE(W - C + 6, W - C + 4, .88) +
      `<path d="M${W + 8} ${W - 50} H${W + 48} M${W + 34} ${W - 64} L${W + 48} ${W - 50} L${W + 34} ${W - 36}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` +
      `</svg>`;
  }

  /* ================= ② 달라진 곳 찾기 (쉬움: 큰 물건 4~6개, 3곳 → 어려움: 모든 물건, 5곳) =================
     흑백으로 찍어도 보이도록 '색 바꾸기'는 쓰지 않고 없어지기·크기·자리 옮기기(어려움은 좌우 뒤집기도)만 써요. 어두운 우주 장면은 잉크가 많이 들어 빼요. */
  function makeChanged(seed, CH) {
    const A = JN.spotArt, scenes = A.SCENES.filter((s) => !s.dark), scene = scenes[(seed - 1) % scenes.length];
    let all = scene.items.map(([type, x, y, s, c], i) => ({ id: i, type, x, y, s, c, flip: false }));
    if (CH.bigOnly) {
      const big = all.filter((o) => o.s >= 1);
      if (big.length >= CH.diffs) all = shuffle(big.slice()).slice(0, Math.min(big.length, CH.items[0] + rnd(CH.items[1] - CH.items[0] + 1))).sort((p, q) => p.id - q.id);
    } else if (CH.items) {
      const k = Math.min(all.length, CH.items[0] + rnd(CH.items[1] - CH.items[0] + 1));
      all = shuffle(all.slice()).slice(0, Math.max(k, CH.diffs)).sort((p, q) => p.id - q.id);
    }
    all.forEach((o, i) => (o.id = i));
    const mod = all.map((o) => Object.assign({}, o)), used = new Set(), list = [], kinds = shuffle(CH.kinds.slice());
    for (let i = 0; i < CH.diffs; i++) {
      let kind = kinds[i % kinds.length];
      const free = all.filter((o) => !used.has(o.id));
      let pool = free.filter((o) => A.okKind(kind, o) && (kind !== "flip" || A.ASYM.has(o.type)));
      if (!pool.length) { kind = "remove"; pool = free; }
      if (!pool.length) break;
      const o = pool[rnd(pool.length)]; used.add(o.id); A.applyKind(kind, o, mod[o.id]);
      list.push({ kind, a: o, b: mod[o.id] });
    }
    return { scene, base: all, mod, list };
  }
  let sceneUid = 0;
  function sceneEl(scene, items, cls, label) {
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 400 300"); s.setAttribute("class", cls); s.id = "psScene" + (++sceneUid);
    s.setAttribute("role", "img"); s.setAttribute("aria-label", label);
    JN.spotArt.renderScene(s, scene, items, "line");
    s.querySelectorAll(".hintLayer, .marks").forEach((g) => g.remove());
    s.insertAdjacentHTML("beforeend", `<rect class="ps-frame" x="1.5" y="1.5" width="397" height="297" rx="10" fill="none" stroke="${INK}" stroke-width="3"/>`);
    return s;
  }
  function answerEl(ch) {
    const s = sceneEl(ch.scene, ch.mod, "ps-answer-svg", T("print.changed.answer"));
    let rings = "";
    for (const d of ch.list) {
      const o = d.b.removed ? d.a : d.b, r = JN.spotArt.hitR(o) + 6;
      rings += `<ellipse cx="${o.x}" cy="${o.y}" rx="${r}" ry="${r * .92}" fill="none" stroke="${K.terracotta}" stroke-width="9"/>`;
      if (d.kind === "move") { const r2 = JN.spotArt.hitR(d.a) + 4; rings += `<ellipse cx="${d.a.x}" cy="${d.a.y}" rx="${r2}" ry="${r2 * .92}" fill="none" stroke="${K.terracotta}" stroke-width="6" stroke-dasharray="14 10"/>`; }
    }
    s.insertAdjacentHTML("beforeend", `<g class="ps-rings">${rings}</g>`);
    return s;
  }

  /* ================= ③ 그림 순서 오려 붙이기 (쉬움 3장: 처음·가운데 하나·끝 → 어려움 5장) =================
     흑백에서도 차례가 잘 보이는 이야기만 써요('물 따르기'는 물 높이가 색으로만 보여서 뺌). */
  const ORDER_STORIES = ["flower", "snowman", "tower", "apple", "cake", "balloon", "drawing"];
  function makeOrder(seed, lv) {
    const sid = ORDER_STORIES[(seed - 1) % ORDER_STORIES.length];
    const frames = lv.n >= 5 ? [0, 1, 2, 3, 4] : [0, ...shuffle([1, 2, 3]).slice(0, lv.n - 2).sort(), 4];
    let cards = frames.map((f, i) => i);
    do { shuffle(cards); } while (cards[0] === 0 && cards[1] === 1);   // 처음부터 순서대로 놓이지 않게
    return { sid, frames, cards: cards.map((k) => frames[k]) };
  }
  const orderSvg = (sid, i) => JN.orderArt.svg(sid, i).replace("<svg ", `<svg class="ps-card-svg" role="img" aria-label="${i + 1}" `);

  /* ================= 종이 한 장 ================= */
  const h = (tag, attrs, ...kids) => {
    const el = document.createElement(tag);
    for (const k in attrs || {}) { if (k === "text") el.textContent = attrs[k]; else el.setAttribute(k, attrs[k]); }
    kids.forEach((c) => c && el.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return el;
  };
  function sheet(id, body, extra, vars) {
    const notes = h("ol", { class: "ps-notes" },
      h("li", { text: T("print." + id + ".note1", vars) }), h("li", { text: T("print." + id + ".note2") }), h("li", { text: T("print.note.common") }));
    return h("section", { class: "ps-sheet", id: "sheet-" + id, "data-sheet": id },
      h("header", { class: "ps-top" },
        h("p", { class: "ps-brand", text: T("print.brand") + " · " + T("print.level." + level) }),
        h("h2", { class: "ps-title", text: T("print." + id + ".title") }),
        h("p", { class: "ps-kid", text: T("print." + id + ".kid", vars) })),
      h("div", { class: "ps-body ps-art" }, ...body),
      h("footer", { class: "ps-foot" }, h("div", { class: "ps-foot-txt" }, notes, h("p", { class: "ps-copy", text: T("print.copy") })), extra || null));
  }
  function render(seed) {
    const out = document.getElementById("sheets");
    out.textContent = "";
    seeded(seed, () => {
      /* ① 미로 */
      const mz = makeMaze(lvOf("maze", level)), box = h("div", { class: "ps-maze-box" });
      box.innerHTML = mazeSvg(mz);
      box.append(h("span", { class: "ps-lab ps-lab-start", text: T("print.maze.start") }), h("span", { class: "ps-lab ps-lab-goal", text: T("print.maze.goal") }));
      const s1 = sheet("maze", [box]);
      s1.dataset.forks = String(forks(mz));
      out.appendChild(s1);

      /* ② 달라진 곳 */
      const ch = makeChanged(seed, lvOf("changed", level));
      const top = h("figure", { class: "ps-pic" }, h("figcaption", { text: T("print.changed.top") })), bot = h("figure", { class: "ps-pic" }, h("figcaption", { text: T("print.changed.bottom") }));
      top.prepend(sceneEl(ch.scene, ch.base, "ps-scene", T("print.changed.top")));
      bot.prepend(sceneEl(ch.scene, ch.mod, "ps-scene", T("print.changed.bottom")));
      const ans = h("div", { class: "ps-answer ps-art" }, h("span", { text: T("print.changed.answer") }));
      ans.prepend(answerEl(ch));
      const s2 = sheet("changed", [top, bot], ans, { n: ch.list.length });
      s2.dataset.diffs = String(ch.list.length); s2.dataset.scene = ch.scene.name;
      out.appendChild(s2);

      /* ③ 그림 순서 */
      const od = makeOrder(seed, lvOf("order", level));
      const nums = od.frames.map((f, i) => i + 1);
      const slots = h("div", { class: "ps-slots ps-n" + nums.length }), cards = h("div", { class: "ps-cards ps-n" + nums.length });
      nums.forEach((n) => slots.appendChild(h("div", { class: "ps-slot" }, h("b", { text: String(n) }), h("span", { text: T("print.order.paste") }))));
      od.cards.forEach((f) => { const c = h("div", { class: "ps-card", "data-frame": String(f) }); c.innerHTML = orderSvg(od.sid, f); cards.appendChild(c); });
      const s3 = sheet("order", [slots, h("p", { class: "ps-cutnote", text: T("print.order.cut") }), cards], null, { nums: nums.join("·") });
      s3.dataset.story = od.sid;
      out.appendChild(s3);
    });
    out.dataset.seed = String(seed); out.dataset.level = String(level);
    out.querySelectorAll(".ps-sheet").forEach((s) => (s.dataset.level = String(level)));
    applyPick();
  }

  /* ================= 고르기 · 색 · 인쇄 단추 ================= */
  let seed = 1, level = 1;
  const $ = (id) => document.getElementById(id);
  function applyPick() {
    const v = (document.querySelector('input[name="pick"]:checked') || {}).value || "all";
    const all = Array.from(document.querySelectorAll(".ps-sheet"));
    all.forEach((s) => { s.classList.toggle("off", v !== "all" && s.dataset.sheet !== v); s.classList.remove("last"); });
    const on = all.filter((s) => !s.classList.contains("off"));
    if (on.length) on[on.length - 1].classList.add("last");   // 마지막 장 뒤에 빈 종이가 나오지 않게
  }
  function applyColor() {
    const bw = ((document.querySelector('input[name="color"]:checked') || {}).value || "bw") === "bw";
    document.body.classList.toggle("ps-bw", bw);
  }
  /* 화면에서는 A4 종이를 폭에 맞춰 줄여 보여 줘요 (인쇄할 때는 원래 크기) */
  function fit() {
    const stage = $("sheets"); if (!stage) return;
    const mm = 210 * 96 / 25.4, k = Math.min(1, Math.max(.3, (stage.clientWidth - 2) / mm));
    stage.style.setProperty("--k", k.toFixed(3));
  }
  document.querySelectorAll('input[name="pick"]').forEach((r) => r.addEventListener("change", applyPick));
  document.querySelectorAll('input[name="color"]').forEach((r) => r.addEventListener("change", applyColor));
  document.querySelectorAll('input[name="level"]').forEach((r) => r.addEventListener("change", () => { level = +r.value || 1; render(seed); }));
  $("newBtn").addEventListener("click", () => { seed = seed % 9999 + 1; render(seed); });
  $("printBtn").addEventListener("click", () => {
    const go = () => window.print();
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(go, go);
  });
  window.addEventListener("resize", fit);
  /* render(그림 번호, 난이도 1~3): 시험·매일 활동지 만들기(tools/make_worksheets.py)가 써요 */
  JN.Print = { render: (s, lv) => { seed = s | 0 || 1; if (lv) { level = Math.min(3, Math.max(1, lv | 0)); const r = document.querySelector('input[name="level"][value="' + level + '"]'); if (r) r.checked = true; } render(seed); }, forks, MAZE_FORKS, LEVELS };
  applyColor();
  render(seed);
  fit();
})();
