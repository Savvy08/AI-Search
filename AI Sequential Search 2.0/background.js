// --- модели и ключи  ---
const MODELS = {
  google: {
    name: "Google Gemini",
    endpoint: (prompt) => ({
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${MODELS.google.apiKey}`,
      options: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      },
      parse: (data) => data?.candidates?.[0]?.content?.parts?.[0]?.text || ""
    }),
    apiKey: "Ключ GEMENI"
  },
  deepseek: {
    name: "DeepSeek",
    endpoint: (prompt) => ({
      url: "https://api.deepseek.com/v1/chat/completions",
      options: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${MODELS.deepseek.apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt }]
        })
      },
      parse: (data) => data?.choices?.[0]?.message?.content || ""
    }),
    apiKey: "Ключ DeepSeek"
  }
};

// --- настройки времени ---
const DWELL_MINUTES = 3;
const TEST_DWELL_SEC = 10;
const SESSION_MINUTES = 30;

let state = {
  running: false,
  testMode: false,
  sessionStartedAt: null,
  sessionEndsAt: null,
  currentTabId: null,
  visitCount: 0,
  visitedDomains: [],
  lastQuery: "",
  model: "google" // по умолчанию Gemini
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
  const prompt = `Ты — генератор поисковых запросов. 
Сгенерируй один короткий поисковый запрос на русском языке. 
Темы всегда разные: новости, спорт, наука, технологии, медицина, финансы, кулинария, путешествия, игры, кино, книги, история, культура, образование, музыка и многое другое. 
Не добавляй пояснений, только сам запрос. 
Формат ответа: только запрос, без кавычек и без дополнительных слов.`;

  const modelConf = MODELS[state.model];
  if (!modelConf) throw new Error("unknown model");

  const { url, options, parse } = modelConf.endpoint(prompt);
  const resp = await fetch(url, options);
  const data = await resp.json();

  let text = parse(data) || "";
  text = text.trim();

  // если модель вернёт несколько строк — берём только первую
  if (text.includes("\n")) text = text.split("\n")[0];

  // убираем кавычки и лишние символы
  text = text.replace(/^["'\-–\s]+|["'\-–\s]+$/g, "");

  if (!text || !/[А-Яа-яЁё]/.test(text)) throw new Error("bad query");

  return text;
}

function fallbackQuery() {
  const arr = ["погода сегодня", "снять квартиру москва", "новости спорта", "новые технологии", "рецепт борща", "лучшие фильмы 2023", "история древнего рима", "музыкальные новинки"];
  return arr[Math.floor(Math.random() * arr.length)];
}

async function generateQuery() {
  try {
    const q = await generateQueryViaAI();
    state.lastQuery = q;
    saveState();
    return q;
  } catch (err) {
    log("Ошибка ИИ, fallback:", err);
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
  log("Query:", q, "via", state.model);
  chrome.tabs.create({ url }, (tab) => {
    state.currentTabId = tab.id;
    saveState();
  });
}

// --- dwell ---
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
  if (msg.type === "SET_MODEL") {
    state.model = msg.value; // "google" или "deepseek"
    saveState();
    sendResponse({ model: state.model });
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
