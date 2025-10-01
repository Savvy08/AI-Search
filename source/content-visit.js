// content-visit.js
(function () {
  // Сообщаем background.js, что страница посещена
  chrome.runtime.sendMessage({ type: "PAGE_VISITED", url: window.location.href });
})();
