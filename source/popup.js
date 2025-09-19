const els = {
  status: document.getElementById("status"),
  lastQuery: document.getElementById("lastQuery"),
  region: document.getElementById("region"),
  visits: document.getElementById("visits"),
  runtime: document.getElementById("runtime"),
  remaining: document.getElementById("remaining"),
  startBtn: document.getElementById("startBtn"),
  stopBtn: document.getElementById("stopBtn")
};

function fmtMins(ms) {
  if (!ms || ms < 0) return "0 мин";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (m <= 0 && s > 0) return `${s} сек`;
  return `${m} мин`;
}

async function readState() {
  const { autoState } = await chrome.storage.local.get("autoState");
  return autoState || {};
}

function render(state) {
  const running = !!state.running;
  els.status.textContent = running ? "Работает" : "Остановлено";
  els.status.classList.toggle("running", running);
  els.status.classList.toggle("stopped", !running);

  els.lastQuery.textContent = state.lastQuery || "—";
  els.region.textContent = state.region || "—";
  els.visits.textContent = String(state.visitCount || 0);

  const now = Date.now();
  const runtimeMs = state.startTime ? now - state.startTime : 0;
  const remainingMs = state.sessionEndsAt ? Math.max(0, state.sessionEndsAt - now) : 0;

  els.runtime.textContent = fmtMins(runtimeMs);
  els.remaining.textContent = fmtMins(remainingMs);
}

async function refresh() {
  const st = await readState();
  render(st);
}

els.startBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "START" });
  setTimeout(refresh, 300);
});

els.stopBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "STOP" });
  setTimeout(refresh, 300);
});

refresh();
const timer = setInterval(refresh, 1000);
window.addEventListener("unload", () => clearInterval(timer));
