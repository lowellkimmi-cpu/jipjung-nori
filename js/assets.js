/* =========================================================
   그림 목록 (한 곳) — 디자인을 바꿀 때 여기만 고치면 돼요.
   - 값이 null 이면 지금 그림(art.js 의 SVG)을 써요.
   - 이미지 파일을 쓰려면 경로를 적어요. 예) owl: { "웃음,만세": "assets/owl_cheer.png" }
     (폴더 안 상대 경로만. 인터넷 주소는 쓰지 않아요.)
   - 배경(BACKGROUNDS)은 이미지가 있을 때만 깔리고, 없으면 지금처럼 색 바탕이에요.
   ========================================================= */
"use strict";
(function () {
  const FILES = {
    owl: {},        // "표정,포즈": "파일 경로"  (표정: 기본·웃음·응원·놀람·쉬어요 / 포즈: 기본·인사·가리키기·만세)
    snail: {},      // "표정,포즈": "파일 경로"  (포즈: 기본·인사·기지개)
    areaIcon: {},   // attention·memory·seeing·thinking·hands·words·body : "파일 경로"
    gameIcon: {},   // 숫자찾기·벌찾기 … : "파일 경로"
    roomArt: {},    // 방 삽화 (정사각 768px 권장) attention … : "파일 경로"
    cardBack: null, // 짝꿍 카드 뒷면 "파일 경로"
  };
  const BACKGROUNDS = {
    who: null,                                  // 누가 놀까요? 화면
    home: null,                                 // 영역 방 목록 화면
    room: { attention: null, memory: null, seeing: null, thinking: null, hands: null, words: null, body: null },  // 방 카드·방 안 띠
    praise: null,                               // 칭찬 화면
    rest: null,                                 // 잠깐 쉬어요 화면
  };
  /* 앱 아이콘(홈 화면 추가용)은 icons/ 폴더의 PNG 파일이에요. tests/make_icons.py 로 다시 만들 수 있어요. */
  const APP_ICON = { png192: "icons/icon-192.png", png512: "icons/icon-512.png", apple: "icons/apple-touch-icon.png" };

  const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const img = (src, label) => `<img src="${esc(src)}" alt="${esc(label || "")}" draggable="false" style="width:100%;height:auto;display:block">`;

  JN.Assets = {
    FILES, BACKGROUNDS, APP_ICON,
    owl(face, pose, label) { const f = FILES.owl[face + "," + pose]; return f ? img(f, label) : Art.owl({ face, pose, label }); },
    snail(face, pose, label) { const f = FILES.snail[face + "," + pose]; return f ? img(f, label) : Art.snail({ face, pose, label }); },
    areaIcon(id) { const f = FILES.areaIcon[id]; return f ? img(f, id) : Art.areaIcon(id); },
    roomArt(id) { const f = FILES.roomArt[id]; return f ? img(f, id) : Art.roomArt(id); },
    cardBack() { return FILES.cardBack ? img(FILES.cardBack, "카드 뒷면") : Art.cardBack(); },
    /* 화면 배경 장면: BACKGROUNDS 에 이미지가 있으면 그 그림, 없으면 v2 코드 그림 (tall = 세로 화면용) */
    scene(key, tall) {
      const f = BACKGROUNDS[key];
      if (typeof f === "string" && f) return '<img src="' + esc(f) + '" alt="" draggable="false" style="width:100%;height:100%;object-fit:cover;display:block">';
      if (key === "who" || key === "home") return Art.heroScene();
      if (key === "praise") return Art.praiseScene({ tall: !!tall });
      if (key === "rest") return Art.restScene({ tall: !!tall });
      if (key === "meadow") return Art.meadow();
      return "";
    },
    gameIcon(id) { const f = FILES.gameIcon[id]; return f ? img(f, id) : Art.gameIcon(id); },
    /* 배경 이미지 자리: 있으면 깔고, 없으면 아무것도 안 해요 */
    background(el, key, sub) {
      let v = BACKGROUNDS[key];
      if (sub && v && typeof v === "object") v = v[sub];
      if (typeof v === "string" && v) { el.style.backgroundImage = 'url("' + v.replace(/"/g, "") + '")'; el.classList.add("has-bg"); }
      else { el.style.backgroundImage = ""; el.classList.remove("has-bg"); }
    },
  };
})();
