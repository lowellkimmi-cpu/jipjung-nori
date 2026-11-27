/* 집중 놀이터 오프라인 캐시 (웹 https 로 올렸을 때만 등록돼요. 더블클릭·http 에서는 쓰이지 않아요)
   - 모든 경로는 상대 경로라서 https://아이디.github.io/집중놀이터/ 같은 하위 경로에서도 동작해요.
   - 앱 파일을 고치면 VERSION 숫자를 올려 주세요. 그래야 폰에 새 파일이 들어가요.
   - 외부 주소는 캐시하지도 요청하지도 않아요. */
const VERSION = "jn-v45";
const ASSETS = [
  "./",
  "index.html",
  "lang/ko.js",
  "js/i18n.js",
  "manifest.json",
  "css/tokens.css",
  "css/tokens-extra.css",
  "css/app.css",
  "css/games.css",
  "vendor/perfect-freehand.js",
  "vendor/rough.js",
  "vendor/LICENSE-perfect-freehand.txt",
  "vendor/LICENSE-roughjs.txt",
  "photos/사진목록.js",
  "js/art.js",
  "js/config.js",
  "js/assets.js",
  "js/install.js",
  "js/install-page.js",
  "install.html",
  "css/install.css",
  "js/store.js",
  "js/core.js",
  "js/games/number.js",
  "js/games/bee.js",
  "js/games/memory.js",
  "js/games/light.js",
  "js/games/spot.js",
  "js/games/shape.js",
  "js/games/pattern.js",
  "js/games/half.js",
  "js/games/maze.js",
  "js/games/word.js",
  "js/games/bodymove.js",
  "js/games/bodytogether.js",
  "js/games/sentence.js",
  "js/games/emotion.js",
  "js/games/changed.js",
  "js/games/puzzle.js",
  "js/games/dalrong.js",
  "js/games/leaf.js",
  "js/games/mail.js",
  "js/games/errand.js",
  "js/games/situation.js",
  "js/app.js",
  "js/records.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
];
self.addEventListener("install", (e) => {
  /* 일부러 skipWaiting() 을 바로 부르지 않아요. 이미 앱을 쓰고 있으면 새 버전은 '기다리는 중'이 되고,
     앱 화면의 '새 놀이가 왔어요' 단추를 누르면 아래 message 로 그때 바뀌어요 (놀이 도중에 갑자기 바뀌지 않게). 처음 설치는 바로 켜져요. */
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS.map((a) => new Request(a, { cache: "reload" })))));
});
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => (req.mode === "navigate" ? caches.match("index.html") : undefined)))
  );
});
