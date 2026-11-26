/* =========================================================
   보호자 "놀이 기록" 화면 — 아이별·놀이별
   - SVG 꺾은선 그래프, 최근 기록 표, 이번 주·이번 달 놀이 횟수, "○단계를 처음 깼어요"
   - 판정 표현 없음. 다른 아이와 비교하지 않음. 영역별 그래프는 SHOW_AREA_CHART 가 true 일 때만(놀이 횟수 막대)
   - 내보내기·가져오기(JSON). 가져올 때는 형식 검사 후에만 반영하고, 글자는 모두 textContent 로 넣어요.
   ========================================================= */
"use strict";
(function () {
  const CFG = JN.CONFIG, S = JN.Store, U = JN.util, h = U.h, A = JN.App;
  const $ = (id) => document.getElementById(id);
  const TXT = JN.t;   // 화면 글자는 lang/ko.js 에서 가져와요
  const R = { kid: null, game: JN.GAME_ORDER[0], stage: null, mode: null, msg: "" };

  function startOfWeek(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return x; }
  function counts(hist) {
    const now = new Date(), wk = S.dateStr(startOfWeek(now)), mo = S.dateStr(now).slice(0, 7);
    let week = 0, month = 0; const per = {};
    for (const e of hist.rounds) { const d = e.at.slice(0, 10); if (d >= wk) week++; if (d.slice(0, 7) === mo) month++; per[e.game] = (per[e.game] || 0) + 1; }
    for (const s of hist.summary) { if (s.date >= wk) week += s.rounds; if (s.date.slice(0, 7) === mo) month += s.rounds; per[s.game] = (per[s.game] || 0) + s.rounds; }
    return { week, month, per };
  }

  function open(kidId) {
    const list = S.profiles();
    R.kid = list.some((p) => p.id === kidId) ? kidId : list.length ? list[0].id : null;
    R.msg = "";
    render();
    A.show("scr-records");
  }
  function render() {
    A.kidTabs($("recTabs"), R.kid, (id) => { R.kid = id; R.stage = null; R.mode = null; R.msg = ""; render(); }, false);
    const body = $("recBody"); body.textContent = "";
    const kid = S.profiles().find((p) => p.id === R.kid);
    if (kid) renderKid(body, kid);
    else body.appendChild(h("p", { class: "care", text: TXT("rec.nokid") }));
    body.appendChild(backupPanel(kid));
    body.appendChild(A.privacyBox());
  }
  function renderKid(body, kid) {
    const hist = S.history(kid.id), data = S.child(kid.id), c = counts(hist);
    const most = Object.keys(c.per).sort((a, b) => c.per[b] - c.per[a])[0];
    body.appendChild(h("div", { class: "sumcards" },
      h("div", null, h("b", { text: TXT("rec.rounds", { n: c.week }), id: "sumWeek" }), TXT("rec.week")),
      h("div", null, h("b", { text: TXT("rec.rounds", { n: c.month }), id: "sumMonth" }), TXT("rec.month")),
      h("div", null, h("b", { text: most ? JN.GAMES[most].name : "-" }), TXT("rec.most"))));
    if (CFG.SHOW_AREA_CHART) body.appendChild(areaPanel(c.per));

    // 놀이 고르기
    const gbox = h("div", { class: "rec-games", role: "group", "aria-label": TXT("rec.pick.aria") });
    for (const gid of JN.GAME_ORDER) gbox.appendChild(h("button", { type: "button", "aria-pressed": String(gid === R.game), "data-game": gid,
      onclick: () => { R.game = gid; R.stage = null; R.mode = null; render(); } }, h("span", { svg: JN.Assets.gameIcon(gid) }), JN.GAMES[gid].name));
    body.appendChild(gbox);

    const def = JN.GAMES[R.game], rounds = hist.rounds.filter((e) => e.game === R.game);
    body.appendChild(h("p", { class: "care", text: TXT("rec.summary", { name: def.name, stage: A.curStage(kid, data, R.game) + 1, rounds: (c.per[R.game]) || 0 }) }));

    // 처음 깬 단계
    const f = data.firsts[R.game] || {};
    const firsts = Object.keys(f).map((sid) => ({ i: def.stages.findIndex((s) => s.id === sid), at: f[sid] })).filter((x) => x.i >= 0).sort((a, b) => (a.at < b.at ? 1 : -1));
    const fp = h("div", { class: "panel", id: "firstsPanel" }, h("h3", { text: TXT("rec.firsts") }));
    if (firsts.length) { const ul = h("ul"); firsts.slice(0, 8).forEach((x) => ul.appendChild(h("li", { text: TXT("rec.firsts.item", { n: x.i + 1, date: x.at.slice(0, 10) }) }))); fp.appendChild(ul); }
    else fp.appendChild(h("p", { class: "care", text: TXT("rec.firsts.none") }));
    body.appendChild(fp);

    // 그래프
    const cp = h("div", { class: "panel" }, h("h3", { text: TXT("rec.chart.title", { label: def.chart.label }) }));
    const stagesWith = def.stages.map((s, i) => ({ s, i })).filter((x) => rounds.some((e) => e.stage === x.s.id));
    const modesWith = Object.keys(CFG.HINT_MODES).filter((m) => rounds.some((e) => e.mode === m));
    if (!stagesWith.length) cp.appendChild(h("p", { class: "care", text: TXT("rec.chart.none") }));
    else {
      if (!stagesWith.some((x) => x.s.id === R.stage)) R.stage = (rounds[rounds.length - 1] || {}).stage;
      if (!modesWith.includes(R.mode)) R.mode = (rounds.filter((e) => e.stage === R.stage).pop() || rounds[rounds.length - 1]).mode;
      const ss = h("select", { "aria-label": TXT("rec.stage"), id: "chartStage" });
      stagesWith.forEach((x) => ss.appendChild(h("option", { value: x.s.id }, TXT("stage.chip", { n: x.i + 1 }))));
      ss.value = R.stage; ss.onchange = () => { R.stage = ss.value; render(); };
      const ms = h("select", { "aria-label": TXT("parent.hint.title"), id: "chartMode" });
      modesWith.forEach((m) => ms.appendChild(h("option", { value: m }, TXT("rec.hintmode", { mode: CFG.HINT_MODES[m] }))));
      ms.value = R.mode; ms.onchange = () => { R.mode = ms.value; render(); };
      cp.appendChild(h("div", { class: "filters" }, ss, ms));
      const pts = rounds.filter((e) => e.stage === R.stage && e.mode === R.mode).slice(-30);
      cp.appendChild(h("div", { class: "chart", id: "chartBox" }, chart(pts, def.chart)));
      cp.appendChild(h("p", { class: "care", text: TXT("rec.chart.note") }));
    }
    body.appendChild(cp);

    // 최근 기록 표
    const tp = h("div", { class: "panel" }, h("h3", { text: TXT("rec.recent") }));
    const recent = rounds.slice(-15).reverse();
    if (!recent.length) tp.appendChild(h("p", { class: "care", text: TXT("rec.recent.none") }));
    else {
      const t = h("table", { class: "log", id: "recTable" }, h("thead", null, h("tr", null, h("th", { text: TXT("rec.th.date") }), h("th", { text: TXT("rec.th.stage") }), h("th", { text: TXT("rec.th.hint") }), h("th", { text: TXT("rec.th.result") }))));
      const tb = h("tbody");
      for (const e of recent) {
        tb.appendChild(h("tr", null, h("td", { class: "nw", text: e.at.slice(5) }), h("td", { class: "nw", text: TXT("stage.chip", { n: e.stageNo || "?" }) }),
          h("td", { class: "nw", text: CFG.HINT_MODES[e.mode] + (e.mode === "button" ? " " + TXT("rec.hint.times", { n: e.hints || 0 }) : "") }), h("td", { text: def.describe(e) })));
      }
      t.appendChild(tb);
      tp.appendChild(h("div", { class: "tablewrap" }, t));
    }
    if (hist.summary.some((s) => s.game === R.game)) tp.appendChild(h("p", { class: "care", text: TXT("rec.old") }));
    body.appendChild(tp);
    body.appendChild(h("p", { class: "care", text: TXT("rec.selfonly") }));
  }
  /* SVG 꺾은선 (코드로 그림) */
  function chart(pts, meta) {
    const W = 600, H = 220, L = 46, Rr = 12, T = 14, B = 34;
    const vals = pts.map((e) => Number(e[meta.key]) || 0);
    const box = h("div");
    if (!vals.length) { box.appendChild(h("p", { class: "care", text: TXT("rec.cond.none") })); return box; }
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (lo === hi) { lo = Math.max(0, lo - 1); hi = hi + 1; }
    const pad = (hi - lo) * 0.1; lo = Math.max(0, lo - pad); hi += pad;
    const x = (i) => L + (vals.length === 1 ? (W - L - Rr) / 2 : i * (W - L - Rr) / (vals.length - 1));
    const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const ink = "var(--c-ink)", soft = "var(--c-ink-soft)", line = "var(--c-line)", pr = "var(--c-primary)";
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${TXT("rec.chart.aria", { label: meta.label })}">`;
    for (let k = 0; k <= 3; k++) { const v = lo + (hi - lo) * k / 3, yy = y(v).toFixed(1); s += `<line x1="${L}" x2="${W - Rr}" y1="${yy}" y2="${yy}" stroke="${line}" stroke-width="1"/><text x="${L - 6}" y="${(+yy + 4).toFixed(1)}" font-size="12" text-anchor="end" fill="${soft}">${(Math.round(v * 10) / 10)}</text>`; }
    s += `<polyline fill="none" stroke="${pr}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="${vals.map((v, i) => x(i).toFixed(1) + "," + y(v).toFixed(1)).join(" ")}"/>`;
    vals.forEach((v, i) => { s += `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="4.5" fill="var(--c-honey)" stroke="${ink}" stroke-width="1.5"/>`; });
    const lab = (i) => pts[i].at.slice(5, 10).replace("-", "/");
    s += `<text x="${x(0)}" y="${H - 10}" font-size="12" fill="${soft}" text-anchor="start">${lab(0)}</text>`;
    if (vals.length > 1) s += `<text x="${x(vals.length - 1)}" y="${H - 10}" font-size="12" fill="${soft}" text-anchor="end">${lab(vals.length - 1)}</text>`;
    s += `<text x="${L}" y="11" font-size="12" fill="${soft}">${meta.unit}</text></svg>`;
    box.innerHTML = s;   // 숫자와 날짜만 들어간 코드 생성 SVG
    return box;
  }
  /* 영역별 놀이 횟수 (SHOW_AREA_CHART=true 일 때만). 점수·변화 판정 없이 횟수만 */
  function areaPanel(per) {
    const p = h("div", { class: "panel", id: "areaChart" }, h("h3", { text: TXT("rec.area.title") }));
    for (const a of Art.AREAS) {
      const n = a.games.reduce((s, g) => s + (per[g] || 0), 0);
      p.appendChild(h("div", { class: "jn-row" }, h("span", { text: a.name }), h("b", { text: TXT("rec.rounds", { n }) })));
    }
    return p;
  }
  function backupPanel(kid) {
    const msg = h("p", { class: "msgok", role: "status", id: "backupMsg", text: R.msg });
    const file = h("input", { type: "file", accept: ".json,application/json", hidden: true, id: "importFile" });
    file.addEventListener("change", () => {
      const f = file.files && file.files[0]; if (!f) return;
      if (f.size > 5 * 1024 * 1024) { R.msg = TXT("rec.file.big"); render(); return; }
      const rd = new FileReader();
      rd.onload = () => {
        let obj; try { obj = JSON.parse(String(rd.result)); } catch (e) { R.msg = TXT("rec.file.bad"); render(); return; }
        const chk = S.validateImport(obj);
        if (!chk.ok) { R.msg = chk.msg; render(); return; }
        if (!window.confirm(TXT("rec.import.confirm"))) return;
        const r = S.importAll(obj);
        R.msg = r.msg; R.kid = S.profiles().length ? S.profiles()[0].id : null;
        if (A.kid && !S.profiles().some((p) => p.id === A.kid.id)) { A.kid = null; A.data = null; }
        render();
      };
      rd.readAsText(f);
    });
    const p = h("div", { class: "panel", id: "backupPanel" }, h("h3", { text: TXT("rec.backup") }),
      h("div", { class: "btnrow" },
        h("button", { type: "button", class: "jn-btn", id: "exportBtn", onclick: doExport }, TXT("rec.export")),
        h("button", { type: "button", class: "jn-btn", id: "importBtn", onclick: () => file.click() }, TXT("rec.import")), file),
      h("p", { class: "care", id: "shareWarn", text: TXT("rec.sharewarn") }),
      msg);
    if (kid) p.appendChild(h("button", { type: "button", class: "jn-btn jn-btn--quiet", id: "clearKidRec", onclick: () => {
      if (!window.confirm(TXT("rec.clear.confirm", { name: kid.nick }))) return;
      S.clearHistory(kid.id); if (A.kid && A.kid.id === kid.id) A.data = S.child(kid.id);
      R.msg = TXT("rec.cleared"); render();
    } }, TXT("rec.clear")));
    return p;
  }
  function doExport() {
    const data = JSON.stringify(S.exportAll(), null, 1);
    const blob = new Blob([data], { type: "application/json" });
    const a = h("a", { href: URL.createObjectURL(blob), download: TXT("rec.file", { date: S.dateStr(new Date()) }) });
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    R.msg = TXT("rec.saved"); $("backupMsg").textContent = R.msg;
  }
  $("recBack").onclick = () => A.renderParent();
  JN.Records = { open, render, _state: R };
})();
