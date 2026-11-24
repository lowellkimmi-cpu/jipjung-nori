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
    if (I.isStandalone()) {
      text.textContent = "이미 앱으로 열려 있어요. 따로 설치하지 않아도 돼요.";
    } else if (!I.canWork()) {
      text.textContent = "지금은 이 PC 안(또는 파일)에서 열려 있어서 설치할 수 없어요. 웹 주소(https)로 열면 설치할 수 있어요.";
    } else if (I.canPrompt()) {
      text.textContent = "이 기기에 앱으로 설치할 수 있어요. 아래 단추를 눌러 주세요.";
      btn.hidden = false;
    } else if (dev === "ios") {
      text.textContent = "아이폰·아이패드는 사파리의 공유 단추에서 설치해요. 아래 안내를 따라 해 주세요.";
    } else {
      text.textContent = "설치 단추가 아직 나타나지 않았어요. 잠깐 기다려 보거나 아래 방법으로 설치해 주세요.";
    }
  }

  btn.addEventListener("click", async () => {
    const r = await I.prompt();
    result.textContent = r === "accepted" ? "설치하고 있어요. 곧 홈 화면(또는 바탕화면)에 생겨요." : r === "dismissed" ? "설치하지 않았어요. 나중에 다시 눌러도 돼요." : "";
  });
  I.onChange(render);
  render();
})();
