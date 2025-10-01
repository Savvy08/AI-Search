// content-google.js
(function () {
  function collectLinks() {
    const out = [];
    // Ищем органические ссылки: <a><h3>...</h3></a>
    const anchors = Array.from(document.querySelectorAll("a h3")).map(h3 => h3.closest("a"));
    for (const a of anchors) {
      if (!a || !a.href) continue;
      if (a.href.includes("google.com")) continue; // пропускаем внутренние ссылки Google
      out.push({ href: a.href });
    }
    return out;
  }

  function main() {
    if (!location.pathname.includes("/search")) return;

    const links = collectLinks();

    // Отправляем в background и сразу ждём ответа
    chrome.runtime.sendMessage({ type: "ORGANIC_LINKS", links }, (resp) => {
      if (resp && resp.action === "NAVIGATE" && resp.href) {
        console.log("[AI-SEQ] Навигация на:", resp.href);
        window.location.href = resp.href;
      }
    });
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(main, 500);
  } else {
    window.addEventListener("DOMContentLoaded", () => setTimeout(main, 500));
  }
})();
