// content-google.js
(function () {
  function firstOrganicLink() {
    const anchors = Array.from(document.querySelectorAll('a h3')).map(h3 => h3.closest('a'));
    const organic = anchors.filter(a => {
      const href = a?.href || "";
      if (!href.startsWith("http")) return false;
      try {
        const u = new URL(href);
        if (u.hostname.includes("google.")) return false;
        return true;
      } catch {
        return false;
      }
    });
    return organic[0] || null;
  }

  let attempts = 0;
  function tryGo() {
    const link = firstOrganicLink();
    if (link) {
      // Отправляем в background сигнал, что мы переходим
      chrome.runtime.sendMessage({ type: "SITE_LOADED" });
      window.location.href = link.href;
      return;
    }
    attempts += 1;
    if (attempts < 20) {
      setTimeout(tryGo, 700); // ретраи до ~14 сек
    }
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(tryGo, 600);
  } else {
    window.addEventListener("DOMContentLoaded", () => setTimeout(tryGo, 600));
  }
})();
