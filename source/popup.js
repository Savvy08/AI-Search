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

  // theme apply
  try {
    chrome.storage.local.get(['darkTheme'], (res) => {
      if (res && res.darkTheme) document.body.classList.add('dark');
      else document.body.classList.remove('dark');
    });
  } catch(e) {
    // in non-extension environment ignore
  }

  updateState();

  // === Scroll Control ===
  const scrollToggle = document.getElementById('scrollToggle');
  const scrollSpeedInput = document.getElementById('scrollSpeed');

  chrome.storage.sync.get(['scrollEnabled', 'scrollSpeed'], (data) => {
    scrollToggle.checked = data.scrollEnabled || false;
    scrollSpeedInput.value = data.scrollSpeed || 3;
  });

  scrollToggle.addEventListener('change', () => {
    const enabled = scrollToggle.checked;
    chrome.storage.sync.set({ scrollEnabled: enabled });
    sendScrollCommand(enabled);
  });

  scrollSpeedInput.addEventListener('input', () => {
    chrome.storage.sync.set({ scrollSpeed: Number(scrollSpeedInput.value) });
  });

  function sendScrollCommand(enabled) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, { type: enabled ? 'START_SCROLL' : 'STOP_SCROLL' }, () => {
        // Если скрипт scroll.js ещё не внедрён, внедрим его
        if (chrome.runtime.lastError) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['scroll.js']
          }, () => {
            chrome.tabs.sendMessage(tabs[0].id, { type: enabled ? 'START_SCROLL' : 'STOP_SCROLL' });
          });
        }
      });
    });
  }
});
