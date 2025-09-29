const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const runningEl = document.getElementById('running');
const lastQueryEl = document.getElementById('lastQuery');
const visitCountEl = document.getElementById('visitCount');
const timeLeftEl = document.getElementById('timeLeft');
const testModeChk = document.getElementById('testModeChk');
const deepseekChk = document.getElementById('deepseekChk');
const aiLabel = document.getElementById('aiLabel');

startBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: "START" }, () => updateState());
});
stopBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: "STOP" }, () => updateState());
});
testModeChk.addEventListener('change', () => {
  chrome.runtime.sendMessage({ type: "TOGGLE_TEST_MODE", value: testModeChk.checked }, () => updateState());
});
deepseekChk.addEventListener('change', () => {
  const model = deepseekChk.checked ? "deepseek" : "google";
  aiLabel.textContent = deepseekChk.checked ? "DeepSeek" : "Gemini";
  chrome.runtime.sendMessage({ type: "SET_MODEL", value: model }, () => updateState());
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
    deepseekChk.checked = (st.model === "deepseek");
    aiLabel.textContent = st.model === "deepseek" ? "DeepSeek" : "Gemini";
  });
}

setInterval(updateState, 1000);
updateState();
