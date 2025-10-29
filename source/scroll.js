// scroll.js — отвечает за автоскролл
(() => {
  let scrollInterval = null;
  let step = 3;
  const tick = 50;

  function loadSettings(callback) {
    chrome.storage.sync.get(['scrollEnabled', 'scrollSpeed'], (data) => {
      step = Number(data.scrollSpeed) || 3;
      callback?.(data.scrollEnabled);
    });
  }

  function startScroll() {
    stopScroll();
    loadSettings(() => {
      scrollInterval = setInterval(() => {
        window.scrollBy({ top: step, behavior: 'auto' });
        if (window.innerHeight + window.scrollY >= document.body.scrollHeight) {
          stopScroll();
        }
      }, tick);
    });
  }

  function stopScroll() {
    if (scrollInterval) {
      clearInterval(scrollInterval);
      scrollInterval = null;
    }
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === 'START_SCROLL') startScroll();
    else if (msg?.type === 'STOP_SCROLL') stopScroll();
  });

  // автозапуск если включено
  loadSettings((enabled) => {
    if (enabled) startScroll();
  });
})();
