/* =========================================================
   저장소 — 모든 정보는 이 기기 localStorage 에만 저장해요. 밖으로 보내지 않아요.
   열쇠 이름
     jnp.profiles       아이 목록 [{id, nick, animal, color, age}]
     jnp.child.<id>     아이별 설정·지금 단계·최고 기록·처음 깬 단계
     jnp.hist.<id>      아이별 판 기록 {rounds:[…최근 1,000판], summary:[…날짜별 요약]}
   ========================================================= */
"use strict";
(function () {
  const CFG = JN.CONFIG;
  const P = "jnp.";

  function get(key, fb) {
    try { const v = localStorage.getItem(P + key); return v ? JSON.parse(v) : fb; } catch (e) { return fb; }
  }
  function set(key, v) {
    try { localStorage.setItem(P + key, JSON.stringify(v)); return true; } catch (e) { return false; }
  }
  function del(key) { try { localStorage.removeItem(P + key); } catch (e) { /* 무시 */ } }

  const isObj = (o) => !!o && typeof o === "object" && !Array.isArray(o);
  const clampInt = (v, a, b, d) => { v = Math.round(Number(v)); return isFinite(v) ? Math.min(b, Math.max(a, v)) : d; };
  const pad2 = (n) => String(n).padStart(2, "0");
  function dateStr(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function stamp(d) { return dateStr(d) + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes()); }
  function newId() { return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* ---------- 아이 목록 ---------- */
  function cleanProfile(p) {
    if (!isObj(p)) return null;
    const nick = typeof p.nick === "string" ? p.nick.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 8) : "";
    if (!nick) return null;
    const id = typeof p.id === "string" && /^[a-z0-9]{2,24}$/i.test(p.id) ? p.id : newId();
    return {
      id, nick,
      animal: Art.PROFILE_KINDS.includes(p.animal) ? p.animal : Art.PROFILE_KINDS[0],
      color: CFG.PROFILE_COLORS.includes(p.color) ? p.color
        : CFG.PROFILE_COLORS_V1.includes(p.color) ? CFG.PROFILE_COLORS[CFG.PROFILE_COLORS_V1.indexOf(p.color)] : CFG.PROFILE_COLORS[1],
      age: clampInt(p.age, CFG.AGE_MIN, CFG.AGE_MAX, 5),
    };
  }
  function profiles() {
    const l = get("profiles", []);
    if (!Array.isArray(l)) return [];
    const out = [];
    let fixed = false;   // 아이디가 없거나 겹쳐서 새로 붙였으면 그 결과를 한 번 저장해 둬요 (읽을 때마다 아이디가 바뀌지 않게)
    for (const src of l) {
      const c = cleanProfile(src);
      if (!c) { fixed = true; continue; }
      if (!isObj(src) || c.id !== src.id || out.some((x) => x.id === c.id)) { fixed = true; if (out.some((x) => x.id === c.id)) continue; }
      out.push(c);
    }
    const res = out.slice(0, CFG.MAX_CHILDREN);
    if (fixed) set("profiles", res);
    return res;
  }
  function saveProfiles(list) { set("profiles", list); }
  function addProfile(p) {
    const list = profiles();
    if (list.length >= CFG.MAX_CHILDREN) return null;
    const c = cleanProfile(Object.assign({}, p, { id: newId() }));
    if (!c) return null;
    list.push(c); saveProfiles(list);
    return c;
  }
  function updateProfile(p) {
    const list = profiles();
    const i = list.findIndex((x) => x.id === p.id);
    const c = cleanProfile(p);
    if (i < 0 || !c) return null;
    list[i] = c; saveProfiles(list);
    return c;
  }
  /* 아이를 지우면 그 아이의 설정과 기록도 함께 지워요 */
  function deleteProfile(id) {
    saveProfiles(profiles().filter((x) => x.id !== id));
    del("child." + id); del("hist." + id);
  }

  /* ---------- 아이별 설정·상태 ---------- */
  function cleanChild(d) {
    d = isObj(d) ? d : {};
    const s = Object.assign({}, CFG.DEFAULT_SETTINGS, isObj(d.settings) ? d.settings : {});
    if (!CFG.HINT_MODES[s.hintMode]) s.hintMode = CFG.DEFAULT_SETTINGS.hintMode;
    for (const k of ["sound", "showTimer", "autoNext", "suggestEasier", "from1"]) s[k] = !!s[k];
    s.restEvery = clampInt(s.restEvery, 0, 10, 0);
    s.eyeRest = s.eyeRest !== false;   // 옛 저장값(없음)은 켬
    s.dailyLimit = CFG.DAILY_LIMITS.includes(Number(s.dailyLimit)) ? Number(s.dailyLimit) : 0;
    const out = { settings: s, games: {}, state: {}, bests: {}, firsts: {} };
    /* 놀이별 칸은 늘 '상자' 모양이어야 해요. 깨진 값(숫자·글자 등)은 그 칸만 버려요 */
    for (const k of ["games", "state", "bests", "firsts"]) if (isObj(d[k])) {
      for (const g of Object.keys(d[k])) if (isObj(d[k][g])) out[k][g] = d[k][g];
    }
    return out;
  }
  function child(id) { return cleanChild(get("child." + id, null)); }
  function saveChild(id, data) { set("child." + id, data); }

  /* ---------- 판 기록 ---------- */
  function history(id) {
    const h = get("hist." + id, null);
    return {
      rounds: isObj(h) && Array.isArray(h.rounds) ? h.rounds.filter(validRound) : [],
      summary: isObj(h) && Array.isArray(h.summary) ? h.summary.filter(validSummary) : [],
    };
  }
  function validRound(e) {
    return isObj(e) && typeof e.game === "string" && typeof e.stage === "string" && typeof e.ts === "number" && isFinite(e.ts) &&
      typeof e.at === "string" && !!CFG.HINT_MODES[e.mode];
  }
  function validSummary(s) {
    return isObj(s) && typeof s.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.date) && typeof s.game === "string" &&
      typeof s.rounds === "number" && isFinite(s.rounds);
  }
  /* 오래된 판을 날짜별 요약으로 줄이기 */
  function compact(h) {
    const over = h.rounds.length - CFG.HISTORY_MAX;
    if (over <= 0) return h;
    const old = h.rounds.slice(0, over);
    h.rounds = h.rounds.slice(over);
    for (const e of old) {
      const date = e.at.slice(0, 10);
      let s = h.summary.find((x) => x.date === date && x.game === e.game);
      if (!s) { s = { date, game: e.game, rounds: 0, cleared: 0, time: 0, maxStage: 0 }; h.summary.push(s); }
      s.rounds++;
      if (e.cleared) { s.cleared++; s.maxStage = Math.max(s.maxStage, e.stageNo || 0); }
      s.time = Math.round((s.time + (Number(e.time) || 0)) * 10) / 10;
    }
    h.summary.sort((a, b) => (a.date < b.date ? -1 : 1));
    return h;
  }
  function addRound(id, entry) {
    const h = history(id);
    const now = new Date();
    entry.ts = now.getTime();
    entry.at = stamp(now);
    h.rounds.push(entry);
    compact(h);
    set("hist." + id, h);
    return entry;
  }
  function clearHistory(id) {
    del("hist." + id);
    const c = child(id);
    c.bests = {}; c.firsts = {};
    saveChild(id, c);
  }

  /* ---------- 내보내기 · 가져오기 (JSON) ---------- */
  const FORMAT = "jipjung-nori-backup";
  function exportAll() {
    const list = profiles();
    const out = { format: FORMAT, version: 1, exportedAt: stamp(new Date()), profiles: list, children: {}, history: {} };
    for (const p of list) { out.children[p.id] = child(p.id); out.history[p.id] = history(p.id); }
    return out;
  }
  /* 형식을 검사한 뒤에만 반영해요. 이상하면 아무것도 바꾸지 않아요. */
  function validateImport(obj) {
    if (!isObj(obj) || obj.format !== FORMAT || obj.version !== 1) return { ok: false, msg: JN.t("import.notfile") };
    if (!Array.isArray(obj.profiles) || obj.profiles.length > CFG.MAX_CHILDREN) return { ok: false, msg: JN.t("import.kids") };
    const list = [];
    for (const p of obj.profiles) {
      const c = cleanProfile(p);
      if (!c || c.id !== p.id) return { ok: false, msg: JN.t("import.kid") };
      if (list.some((x) => x.id === c.id)) return { ok: false, msg: JN.t("import.dup") };
      list.push(c);
    }
    const children = {}, hist = {};
    for (const p of list) {
      const cd = isObj(obj.children) ? obj.children[p.id] : null;
      children[p.id] = cleanChild(cd);
      const h = isObj(obj.history) ? obj.history[p.id] : null;
      const rounds = isObj(h) && Array.isArray(h.rounds) ? h.rounds : [];
      const summary = isObj(h) && Array.isArray(h.summary) ? h.summary : [];
      if (rounds.length > CFG.HISTORY_MAX * 2 || summary.length > 20000) return { ok: false, msg: JN.t("import.toomany") };
      const cleanR = [];
      for (const e of rounds) {
        if (!validRound(e)) return { ok: false, msg: JN.t("import.round") };
        cleanR.push(cleanEntry(e));
      }
      const cleanS = [];
      for (const s of summary) {
        if (!validSummary(s)) return { ok: false, msg: JN.t("import.summary") };
        cleanS.push({ date: s.date, game: String(s.game).slice(0, 20), rounds: clampInt(s.rounds, 0, 1e6, 0),
          cleared: clampInt(s.cleared, 0, 1e6, 0), time: Number(s.time) || 0, maxStage: clampInt(s.maxStage, 0, 99, 0) });
      }
      hist[p.id] = compact({ rounds: cleanR, summary: cleanS });
    }
    return { ok: true, list, children, hist };
  }
  /* 판 기록 한 줄: 숫자·짧은 글자만 남겨요 */
  function cleanEntry(e) {
    const out = {};
    for (const k of Object.keys(e).slice(0, 40)) {
      const v = e[k];
      if (typeof v === "number" && isFinite(v)) out[k] = v;
      else if (typeof v === "boolean") out[k] = v;
      else if (typeof v === "string") out[k] = v.slice(0, 40);
    }
    return out;
  }
  function importAll(obj) {
    const r = validateImport(obj);
    if (!r.ok) return r;
    for (const p of profiles()) { del("child." + p.id); del("hist." + p.id); }
    saveProfiles(r.list);
    for (const p of r.list) { saveChild(p.id, r.children[p.id]); set("hist." + p.id, r.hist[p.id]); }
    return { ok: true, msg: JN.t("import.done", { n: r.list.length }) };
  }

  /* 오늘 한 놀이 요약 (보호자 화면용): 판 수 · 걸린 시간(초) · 놀이별 판 수. 점수는 만들지 않아요 */
  function today(id) {
    const d = dateStr(new Date()), out = { rounds: 0, seconds: 0, byGame: {} };
    for (const e of history(id).rounds) {
      if (e.at.slice(0, 10) !== d) continue;
      out.rounds++;
      out.seconds += Number(e.time) || 0;
      out.byGame[e.game] = (out.byGame[e.game] || 0) + 1;
    }
    out.seconds = Math.round(out.seconds);
    return out;
  }

  JN.Store = { today, profiles, addProfile, updateProfile, deleteProfile, child, saveChild, history, addRound, clearHistory,
               exportAll, importAll, validateImport, dateStr, stamp, getApp: () => { const a = get("app", {}); return isObj(a) ? a : {}; }, setApp: (v) => set("app", v) };
})();
