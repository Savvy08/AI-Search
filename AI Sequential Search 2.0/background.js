// background.js — стабильная логика с setTimeout

// background.js — стабильная логика с setTimeout

// ключ от Google Gemini
const API_KEY = "AIzaSyBXdWXgA61Pv64uBuKdcF8xnuf_fVmwS9o";
const MODEL_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

const DWELL_MINUTES = 3;     // обычный режим
const TEST_DWELL_SEC = 10;   // тест-режим
const SESSION_MINUTES = 30;  // вся сессия

let state = {
  running: false,
  testMode: false,
  sessionStartedAt: null,
  sessionEndsAt: null,
  currentTabId: null,
  visitCount: 0,
  visitedDomains: [],
  lastQuery: ""
};


let dwellTimer = null;

function log(...a) { console.log("[AI-SEQ]", ...a); }
function saveState() { chrome.storage.local.set({ ai_seq_state: state }); }
async function loadState() {
  const s = await chrome.storage.local.get("ai_seq_state");
  if (s.ai_seq_state) state = s.ai_seq_state;
}

// --- генерация запроса ---
async function generateQueryViaAI() {
  const prompt = `Сгенерируй короткий поисковый запрос строго на русском языке (1–3 слова), без города или страны.
Если тема — "погода", верни только "погода".
Если тема — "снять квартиру", верни только "снять квартиру".
Верни ровно один запрос без пояснений.`;

  const body = { contents: [{ parts: [{ text: prompt }] }] };
  const resp = await fetch(MODEL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await resp.json();
  let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  text = text.trim().split(/[.,;!]/)[0];
  if (!text || !/[А-Яа-яЁё]/.test(text)) throw new Error("bad query");
  return text;
}

function fallbackQuery() {
  const arr = ["погода","снять квартиру","новости","работа","афиша","спорт","кино"];
  return arr[Math.floor(Math.random() * arr.length)];
}

async function generateQuery() {
  try {
    const q = await generateQueryViaAI();
    state.lastQuery = q;
    saveState();
    return q;
  } catch {
    const q = fallbackQuery();
    state.lastQuery = q;
    saveState();
    return q;
  }
}

// --- запуск поиска ---
async function openSearchTab() {
  if (!state.running) return;
  if (state.currentTabId) {
    try { await chrome.tabs.remove(state.currentTabId); } catch {}
    state.currentTabId = null;
  }
  const q = await generateQuery();
  const url = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  log("Query:", q);
  chrome.tabs.create({ url }, (tab) => {
    state.currentTabId = tab.id;
    saveState();
  });
}

// --- таймер dwell ---
function startDwellTimer() {
  if (dwellTimer) clearTimeout(dwellTimer);
  const ms = state.testMode ? TEST_DWELL_SEC * 1000 : DWELL_MINUTES * 60 * 1000;
  dwellTimer = setTimeout(() => {
    if (!state.running) return;
    if (state.currentTabId) {
      chrome.tabs.remove(state.currentTabId).catch(()=>{});
      state.currentTabId = null;
    }
    state.visitCount++;
    saveState();

    if (Date.now() >= state.sessionEndsAt) stopSession();
    else openSearchTab();
  }, ms);
}

// --- управление сессией ---
function startSession() {
  state.running = true;
  state.sessionStartedAt = Date.now();
  state.sessionEndsAt = state.sessionStartedAt + SESSION_MINUTES * 60 * 1000;
  state.visitCount = 0;
  state.visitedDomains = [];
  state.lastQuery = "";
  saveState();
  openSearchTab();
}

function stopSession() {
  state.running = false;
  if (dwellTimer) clearTimeout(dwellTimer);
  if (state.currentTabId) {
    chrome.tabs.remove(state.currentTabId).catch(()=>{});
    state.currentTabId = null;
  }
  saveState();
}

// --- сообщения ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "START") startSession();
  if (msg.type === "STOP") stopSession();
  if (msg.type === "REQUEST_STATE") sendResponse({ state });
  if (msg.type === "TOGGLE_TEST_MODE") {
    state.testMode = !!msg.value;
    saveState();
    sendResponse({ testMode: state.testMode });
  }

  if (msg.type === "ORGANIC_LINKS") {
    const links = msg.links || [];
    let chosen = null;
    for (const l of links) {
      try {
        const d = new URL(l.href).hostname.replace(/^www\./,"");
        if (!state.visitedDomains.includes(d)) { chosen = l; break; }
      } catch {}
    }
    if (!chosen && links[0]) chosen = links[0];
    if (chosen) sendResponse({ action:"NAVIGATE", href: chosen.href });
  }

  if (msg.type === "WILL_NAVIGATE") {
    try {
      const u = new URL(msg.href);
      const domain = u.hostname.replace(/^www\./,"");
      if (!state.visitedDomains.includes(domain)) state.visitedDomains.push(domain);
      saveState();
      startDwellTimer();
      sendResponse({ ok:true });
    } catch { sendResponse({ ok:false }); }
  }
});

chrome.tabs.onRemoved.addListener((id) => {
  if (id === state.currentTabId) state.currentTabId = null;
  saveState();
});

loadState();
