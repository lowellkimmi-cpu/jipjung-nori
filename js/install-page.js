/* install.html 화면 동작: 지금 기기 알아보기 · 설치 단추 · 내 기기 안내를 맨 위로 */
(function () {
  "use strict";
  const I = window.JN.Install;
  const $ = (id) => document.getElementById(id);
  const btn = $("installBtn"), text = $("stateText"), result = $("installResult");

  function render() {
    const dev = I.device();
    for (const sec of document.querySelectorAll("[data-dev]")) {
      const mine = sec.dataset.dev === dev;
      sec.classList.toggle("mine", mine);
      const tag = sec.querySelector(".mine-tag");
      if (tag) tag.hidden = !mine;
    }
    btn.hidden = true;
    const T = window.JN.t;   // 글자는 lang/ko.js 에서
    if (I.isStandalone()) {
      text.textContent = T("inst.state.standalone");
    } else if (!I.canWork()) {
      text.textContent = T("inst.state.nowork");
    } else if (I.canPrompt()) {
      text.textContent = T("inst.state.can");
      btn.hidden = false;
    } else if (dev === "ios") {
      text.textContent = T("inst.state.ios");
    } else {
      text.textContent = T("inst.state.wait");
    }
  }

  btn.addEventListener("click", async () => {
    const r = await I.prompt();
    result.textContent = r === "accepted" ? window.JN.t("inst.result.ok") : r === "dismissed" ? window.JN.t("inst.result.no") : "";
  });
  I.onChange(render);
  render();
})();
