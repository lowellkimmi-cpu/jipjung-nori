/* =========================================================
   보호자 '해제 코드' 뼈대 (2026-11-28)
   - 판매자만 가진 비밀키로 서명한 코드를, 앱은 공개키(CONFIG.UNLOCK.PUBLIC_KEY_JWK)로 '검사만' 해요.
     비밀키는 이 앱·저장소·배포 폴더 어디에도 없어요. (코드 만들기 도구는 판매 직전에 로웰님 PC 에서 따로)
   - 코드 안에는 무작위 일련번호(8바이트)와 묶음 번호만 들어가요. 이름·연락처 같은 개인정보는 없어요.
   - CONFIG.UNLOCK.ENABLED 가 false(기본)이면 화면에 아무것도 나오지 않고, 어떤 놀이도 잠그지 않아요.
   - 아이 화면에는 사는 단추·안내가 없어요. 코드 넣기는 덧셈 잠금 뒤 보호자 설정에만 있어요.
   코드 모양: "JN1-" + Crockford base32( [판 1][묶음 1][일련번호 8] + 서명 64(P-256, SHA-256, r||s) ), 5글자마다 '-'
   ========================================================= */
"use strict";
window.JN = window.JN || {};

JN.Unlock = (() => {
  const ALPHA = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const PREFIX = "JN1";
  const VER = 1, PAYLOAD = 10, SIG = 64;
  const unlocked = new Set();   // 이번에 검사를 통과한 묶음 번호

  function cfg() { return (JN.CONFIG && JN.CONFIG.UNLOCK) || {}; }
  function enabled() { const c = cfg(); return !!(c.ENABLED && c.PUBLIC_KEY_JWK); }
  function hasCrypto() { return !!(window.crypto && window.crypto.subtle); }

  function b32enc(bytes) {
    let out = "", bits = 0, val = 0;
    for (const b of bytes) {
      val = (val << 8) | b; bits += 8;
      while (bits >= 5) { out += ALPHA[(val >>> (bits - 5)) & 31]; bits -= 5; }
      val &= (1 << bits) - 1;
    }
    if (bits > 0) out += ALPHA[(val << (5 - bits)) & 31];
    return out;
  }
  function b32dec(str) {
    const out = []; let bits = 0, val = 0;
    for (const ch of str) {
      const i = ALPHA.indexOf(ch);
      if (i < 0) return null;
      val = (val << 5) | i; bits += 5;
      if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; }
      val &= (1 << bits) - 1;
    }
    return new Uint8Array(out);
  }
  /* 붙여 넣은 글자 정리: 띄어쓰기·줄바꿈·'-' 빼고, 헷갈리는 글자(O→0, I·L→1)는 바꿔 읽어요 */
  function normalize(code) {
    let s = String(code || "").toUpperCase().replace(/[\s\-_.]/g, "");
    if (!s.startsWith(PREFIX)) return null;
    s = s.slice(PREFIX.length).replace(/O/g, "0").replace(/[IL]/g, "1");
    return s.length > 0 && s.length <= 200 ? s : null;
  }
  function format(bytes) {
    return PREFIX + "-" + b32enc(bytes).match(/.{1,5}/g).join("-");
  }
  function hex(bytes) { return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""); }

  let keyFor = null, keyP = null;
  function key() {
    const jwk = cfg().PUBLIC_KEY_JWK;
    const id = JSON.stringify(jwk);
    if (keyFor !== id) {
      keyFor = id;
      const pub = { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y };   // 혹시 비밀 부분(d)이 섞여 와도 공개 부분만 써요
      keyP = crypto.subtle.importKey("jwk", pub, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    }
    return keyP;
  }

  /* 코드 검사 → { ok:true, serial, bundle } 또는 { ok:false, why: "off"|"nocrypto"|"format"|"sign" } */
  async function verify(code) {
    if (!enabled()) return { ok: false, why: "off" };
    if (!hasCrypto()) return { ok: false, why: "nocrypto" };
    const s = normalize(code);
    const raw = s && b32dec(s);
    if (!raw || raw.length !== PAYLOAD + SIG || raw[0] !== VER) return { ok: false, why: "format" };
    const payload = raw.slice(0, PAYLOAD), sig = raw.slice(PAYLOAD);
    let good = false;
    try { good = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, await key(), sig, payload); } catch (e) { good = false; }
    if (!good) return { ok: false, why: "sign" };
    return { ok: true, bundle: payload[1], serial: hex(payload.slice(2)) };
  }

  function saved() {
    const a = JN.Store.getApp();
    const list = a.unlock && Array.isArray(a.unlock.codes) ? a.unlock.codes : [];
    return list.filter((c) => c && typeof c.code === "string");
  }
  /* 코드 넣기: 검사를 통과한 코드만 이 기기에 저장(코드·일련번호·묶음 번호만). 같은 일련번호는 한 번만 */
  async function add(code) {
    const r = await verify(code);
    if (!r.ok) return r;
    const a = JN.Store.getApp();
    const list = saved();
    if (list.some((c) => c.serial === r.serial)) { unlocked.add(r.bundle); return Object.assign({ dup: true }, r); }
    list.push({ code: format(b32dec(normalize(code))), serial: r.serial, bundle: r.bundle });
    a.unlock = { codes: list };
    JN.Store.setApp(a);
    unlocked.add(r.bundle);
    return r;
  }
  /* 앱을 열 때 저장된 코드를 다시 검사해요 (공개키가 바뀌면 옛 코드는 통과하지 않아요) */
  async function init() {
    unlocked.clear();
    if (!enabled()) return 0;
    for (const c of saved()) {
      const r = await verify(c.code);
      if (r.ok) unlocked.add(r.bundle);
    }
    return unlocked.size;
  }
  function isUnlocked(bundle) { return unlocked.has(bundle); }
  /* 놀이가 잠겼는지: 꺼져 있으면(기본) 늘 false. 묶음(BUNDLES)에 없는 놀이도 늘 false */
  function isLocked(gid) {
    if (!enabled()) return false;
    const b = cfg().BUNDLES || {};
    for (const id of Object.keys(b)) {
      if (Array.isArray(b[id]) && b[id].includes(gid)) return !unlocked.has(Number(id));
    }
    return false;
  }

  if (enabled()) init();
  return { enabled, hasCrypto, verify, add, init, saved, isUnlocked, isLocked, normalize, format, b32enc, b32dec, PREFIX };
})();
