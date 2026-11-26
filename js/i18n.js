/* =========================================================
   문구 도우미 — 화면 글자는 lang/ko.js 같은 언어 파일에 있고, 코드는 JN.t("키") 로 꺼내 써요.
   - 언어 파일은 window.JN_LANGS.언어코드 = { "키": "문구", ... } 로 등록해요 (lang/ko.js 참고).
   - 쓸 언어는 index.html 의 <script>window.JN_LANG = "ko";</script> 한 줄로 골라요.
   - 고른 언어에 없는 키는 한국어(ko)로 대신 보여 주고, 그것도 없으면 키 이름을 보여 줘요(JN.missingKeys 에 기록).
   - 문구 안의 {이름} 은 JN.t("키", { 이름: 값 }) 의 값으로 바뀌어요.
   ========================================================= */
"use strict";
window.JN = window.JN || {};
(function () {
  const L = window.JN_LANGS || {};
  JN.LANG = window.JN_LANG && L[window.JN_LANG] ? window.JN_LANG : "ko";
  JN.missingKeys = [];
  JN.t = function (key, vars) {
    let s = L[JN.LANG] && L[JN.LANG][key];
    if (s == null && L.ko) s = L.ko[key];
    if (s == null) { if (JN.missingKeys.indexOf(key) < 0) JN.missingKeys.push(key); return key; }
    if (typeof s !== "string" || !vars) return s;
    return s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? String(vars[k]) : m; });
  };
  /* 문구 안의 **굵은 글씨** 를 <b> 로 바꿔 넣어요 (글자는 늘 textContent/텍스트 노드로 넣어서 HTML 로 해석되지 않아요) */
  JN.rich = function (el, s) {
    el.textContent = "";
    String(s).split("**").forEach((part, i) => {
      if (!part) return;
      if (i % 2) { const b = document.createElement("b"); b.textContent = part; el.appendChild(b); }
      else el.appendChild(document.createTextNode(part));
    });
  };
  /* index.html / install.html 의 data-t(글자) · data-t-rich(굵은 글씨 포함) · data-t-aria(aria-label) · data-t-ph(placeholder) · data-t-title(title) 속성에 문구 키를 적어 두면 채워 줘요 */
  JN.applyStatic = function (root) {
    root = root || document;
    const each = (attr, fn) => root.querySelectorAll("[" + attr + "]").forEach((el) => fn(el, JN.t(el.getAttribute(attr))));
    each("data-t", (el, s) => { el.textContent = s; });
    each("data-t-rich", (el, s) => { JN.rich(el, s); });
    each("data-t-aria", (el, s) => { el.setAttribute("aria-label", s); });
    each("data-t-ph", (el, s) => { el.setAttribute("placeholder", s); });
    each("data-t-title", (el, s) => { el.setAttribute("title", s); });
    each("data-t-content", (el, s) => { el.setAttribute("content", s); });
  };
  if (document.documentElement) document.documentElement.setAttribute("lang", JN.LANG);
  if (document.title !== undefined && document.querySelector("title[data-t]")) document.title = JN.t(document.querySelector("title[data-t]").getAttribute("data-t"));
  JN.applyStatic(document);
})();
