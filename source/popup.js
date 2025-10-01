document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const runningEl = document.getElementById('running');
  const lastQueryEl = document.getElementById('lastQuery');
  const visitCountEl = document.getElementById('visitCount');
  const timeLeftEl = document.getElementById('timeLeft');
  const testModeChk = document.getElementById('testModeChk');
  const openrouterChk = document.getElementById('openrouterChk');
  const aiLabel = document.getElementById('aiLabel');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsImg = document.getElementById('settingsImg');

  function openOptions() {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  }

  startBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: "START" }, () => updateState());
  });
  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: "STOP" }, () => updateState());
  });
  testModeChk.addEventListener('change', () => {
    chrome.runtime.sendMessage({ type: "TOGGLE_TEST_MODE", value: testModeChk.checked }, () => updateState());
  });
  openrouterChk.addEventListener('change', () => {
    const model = openrouterChk.checked ? "openrouter" : "google";
    aiLabel.textContent = openrouterChk.checked ? "OpenRouter" : "Gemini";
    chrome.runtime.sendMessage({ type: "SET_MODEL", value: model }, () => updateState());
  });

  // Открытие настроек по клику
  settingsBtn.addEventListener('click', openOptions);

  // Доступность: enter/space
  settingsBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openOptions();
    }
  });

  function msToTime(ms) {
    if (!ms || ms <= 0) return "00:00";
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function updateState() {
    chrome.runtime.sendMessage({ type: "REQUEST_STATE" }, (resp) => {
      const st = resp?.state;
      if (!st) return;
      runningEl.textContent = st.running ? "Запущен" : "Остановлен";
      lastQueryEl.textContent = st.lastQuery || "—";
      visitCountEl.textContent = st.visitCount || "0";
      const left = st.sessionEndsAt ? Math.max(0, st.sessionEndsAt - Date.now()) : 0;
      timeLeftEl.textContent = msToTime(left);
      testModeChk.checked = !!st.testMode;
      openrouterChk.checked = (st.model === "openrouter");
      aiLabel.textContent = st.model === "openrouter" ? "OpenRouter" : "Gemini";
    });
  }

  // Если хочешь использовать локальный файл вместо внешней ссылки:
  // settingsImg.src = chrome.runtime.getURL('images/gear.png');

  setInterval(updateState, 1000);
  updateState();
});
