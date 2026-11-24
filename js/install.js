/* 앱으로 설치 도우미 (index.html 과 install.html 이 같이 써요)
   - 안드로이드 크롬·PC 크롬/엣지: 브라우저가 "설치할 수 있어요"라고 알려 주면(beforeinstallprompt) 단추로 바로 설치
   - 아이폰·아이패드 사파리: 그런 신호가 없어서 안내 글만 보여 줘요
   - 바깥으로 보내는 것은 없어요. 기기 종류는 브라우저 정보로 화면에 보여 주는 데만 쓰고 저장하지 않아요. */
(function () {
  "use strict";
  window.JN = window.JN || {};
  let deferred = null;
  const subs = [];
  const notify = () => subs.forEach((fn) => { try { fn(); } catch (e) { /* 화면 갱신 실패는 무시 */ } });

  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; notify(); });
  window.addEventListener("appinstalled", () => { deferred = null; notify(); });

  function isStandalone() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  }
  function device() {
    const ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
    if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return "ios";   // 아이패드(데스크톱 모드 표시)
    if (/Android/i.test(ua)) return "android";
    return "pc";
  }
  function canWork() { return /^https?:$/.test(location.protocol) && window.isSecureContext; }

  window.JN.Install = {
    device, isStandalone,
    canPrompt() { return !!deferred; },
    /* 웹 주소(https)로 열었는지: file:// 이나 http(내 PC 밖) 에서는 설치가 안 돼요 */
    canWork,
    onChange(fn) { subs.push(fn); },
    async prompt() {
      if (!deferred) return "none";
      const ev = deferred; deferred = null; notify();
      try { await ev.prompt(); const r = await ev.userChoice; return r && r.outcome ? r.outcome : "done"; }
      catch (e) { return "error"; }
    },
  };
})();
