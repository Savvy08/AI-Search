(function(){
  function collectLinks() {
    const out = [];
    const anchors = Array.from(document.querySelectorAll('a h3')).map(h3 => h3.closest('a'));
    for (const a of anchors) {
      if (!a || !a.href) continue;
      if (a.href.includes("google.com")) continue;
      out.push({ href: a.href });
    }
    return out;
  }

  async function main(){
    if (!location.pathname.includes("/search")) return;
    const links = collectLinks();
    chrome.runtime.sendMessage({ type:"ORGANIC_LINKS", links }, (resp) => {
      if (resp?.action === "NAVIGATE" && resp.href) {
        chrome.runtime.sendMessage({ type:"WILL_NAVIGATE", href: resp.href }, () => {
          window.location.href = resp.href;
        });
      }
    });
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(main, 500);
  } else {
    window.addEventListener("DOMContentLoaded", () => setTimeout(main, 500));
  }
})();
