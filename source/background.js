// background.js

// ======= Дефолтные ключи (fallback, если в настройках пусто) =======
const GOOGLE_KEYS = [
  "AIzaSyDCq46CoeWM_EZdqHKxTdk738G72qkP5nY",
  "AIzaSyDpgtlngRN4ukrA-eYBp_EPGMgRCSAnUpQ",
  "AIzaSyBAOFd4WNxCV7MOV-faah4moFVj7dfDgEs"
];
let googleKeyIndex = 0;

const OPENROUTER_KEY = "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";

// ======= Состояние =======
let state = {
  running: false,
  testMode: false,
  model: "google", // "google" или "openrouter"
  lastQuery: "",
  visitCount: 0,
  visitedDomains: [],
  currentTabId: null,
  sessionStartedAt: null,
  sessionEndsAt: null
};

function saveState() { chrome.storage.local.set({ ai_seq_state: state }); }
async function loadState() {
  const s = await chrome.storage.local.get("ai_seq_state");
  if (s.ai_seq_state) state = s.ai_seq_state;
}
function log(...a) { console.log("[AI-SEQ]", ...a); }

// ======= Загрузка пользовательских настроек =======
async function getUserSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get([
      "geminiKey", "openrouterKey", "sessionDuration", "stepDelay", "fallbackQueries"
    ], (data) => {
      resolve({
        geminiKey: data.geminiKey || null,
        openrouterKey: data.openrouterKey || null,
        sessionDuration: (data.sessionDuration || 30) * 60 * 1000, // мин в мс
        stepDelay: (data.stepDelay || 120) * 1000, // сек в мс
        fallbackQueries: data.fallbackQueries || []
      });
    });
  });
}

// ======= Фоллбек запросы (дефолтный список) =======
function fallbackQueryDefault() {
  const arr = [
    "погода сегодня", "снять квартиру москва", "новости спорта",
    "новые технологии", "рецепт борща", "фильмы",
    "история древнего рима", "музыкальные новинки", "курс доллара сегодня",
    "афиша кино москва", "лучшие сериалы", "как научиться программировать",
    "онлайн переводчик", "расписание поездов", "биткоин цена",
    "стриминговые сервисы", "диета для похудения", "бесплатные онлайн курсы",
    "кофейни рядом", "игры на пк", "новости политики",
    "открыть свой бизнес", "туры в турцию", "йога для начинающих",
    "мемы сегодня", "автомобили электрические", "подкасты про науку",
    "как медитировать", "тренды", "лайфхаки для дома",
    "книги фантастика", "стримы twitch", "здоровое питание",
    "акции компаний", "искусственный интеллект", "путешествия бюджетные",
    "музыка 90 х", "изучение английского", "косметика натуральная",
    "новости кино", "психология отношений", "it вакансии",
    "спортзалы рядом", "аниме новинки", "handmade идеи",
    "купить ноутбук", "экскурсии онлайн", "котики видео",
    "ремонт квартиры", "криптовалюты", "снять офис",
    "садоводство для начинающих", "гитара уроки", "vr технологии",
    "доставка еды", "велнес ретриты", "диджитал арт",
    "языки программирования", "космос новости", "handmade рынки",
    "финансовая грамотность", "кино фестивали", "домашние животные",
    "стартапы идеи", "стрижка модная", "онлайн банкинг",
    "экология проекты", "подкасты юмор"
  ];
  return arr[Math.floor(Math.random() * arr.length)];
}

// ======= Запросы к моделям =======
async function googleQuery(prompt) {
  const settings = await getUserSettings();
  const keys = settings.geminiKey ? [settings.geminiKey] : GOOGLE_KEYS;

  for (let attempt = 0; attempt < keys.length; attempt++) {
    const key = keys[googleKeyIndex];
    googleKeyIndex = (googleKeyIndex + 1) % keys.length;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
      const body = { contents: [{ parts: [{ text: prompt }] }] };
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      text = text.trim();
      if (text) return text;
    } catch (e) {
      log("Google key failed:", e);
    }
  }
  return "";
}

async function openrouterDeepseekQuery(prompt) {
  try {
    const settings = await getUserSettings();
    const key = settings.openrouterKey || OPENROUTER_KEY;

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat-v3.1:free",
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!resp.ok) return "";
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content || "";
    return text.trim();
  } catch (e) {
    log("OpenRouter error:", e);
    return "";
  }
}

// ======= Универсальная генерация =======
async function generateQueryViaAI() {
  const prompt = `Ты — генератор поисковых запросов.
Сгенерируй один уникальный короткий поисковый запрос на русском языке 
на повседневную тему. Не добавляй пояснений, верни только сам запрос.`;

  let query = "";
  if (state.model === "google") query = await googleQuery(prompt);
  else if (state.model === "openrouter") query = await openrouterDeepseekQuery(prompt);

  if (!query || !query.trim()) {
    const settings = await getUserSettings();
    if (settings.fallbackQueries.length > 0) {
      query = settings.fallbackQueries[
        Math.floor(Math.random() * settings.fallbackQueries.length)
      ];
    } else {
      query = fallbackQueryDefault();
    }
  }
  return query.trim();
}

// ======= Логика переходов =======
let dwellTimer = null;

async function openSearchTab() {
  if (!state.running) return;

  if (state.currentTabId) {
    try { chrome.tabs.remove(state.currentTabId); } catch (e) {}
    state.currentTabId = null;
  }

  const q = await generateQueryViaAI();
  state.lastQuery = q;
  saveState();

  const url = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  chrome.tabs.create({ url }, (tab) => {
    state.currentTabId = tab.id;
    saveState();
  });
}

async function startDwellTimer() {
  if (dwellTimer) clearTimeout(dwellTimer);
  const settings = await getUserSettings();
  const ms = state.testMode ? 10000 : settings.stepDelay;
  dwellTimer = setTimeout(async () => {
    if (Date.now() >= state.sessionEndsAt) {
      stopSession();
    } else {
      await openSearchTab();
    }
  }, ms);
}

// ======= Управление сессией =======
async function startSession() {
  if (state.running) return;
  state.running = true;
  state.visitCount = 0;
  state.lastQuery = "";
  state.sessionStartedAt = Date.now();

  const settings = await getUserSettings();
  state.sessionEndsAt = state.testMode
    ? state.sessionStartedAt + 10 * 1000
    : state.sessionStartedAt + settings.sessionDuration;

  saveState();
  openSearchTab();
}

function stopSession() {
  state.running = false;
  if (dwellTimer) clearTimeout(dwellTimer);
  if (state.currentTabId) {
    try { chrome.tabs.remove(state.currentTabId); } catch (e) {}
    state.currentTabId = null;
  }
  saveState();
}

// ======= Сообщения =======
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "START") { startSession(); sendResponse({ ok: true }); }
  else if (msg.type === "STOP") { stopSession(); sendResponse({ ok: true }); }
  else if (msg.type === "TOGGLE_TEST_MODE") {
    state.testMode = !!msg.value; saveState(); sendResponse({ testMode: state.testMode });
  }
  else if (msg.type === "SET_MODEL") {
    if (msg.value === "google" || msg.value === "openrouter") {
      state.model = msg.value; saveState(); sendResponse({ model: state.model });
    } else sendResponse({ error: "unknown model" });
  }
  else if (msg.type === "REQUEST_STATE") { sendResponse({ state }); }

  // навигация из content-google.js
  else if (msg.type === "ORGANIC_LINKS") {
    if (msg.links && msg.links.length > 0 && state.running) {
      const choice = msg.links[Math.floor(Math.random() * msg.links.length)];
      log("Навигация на сайт:", choice.href);
      sendResponse({ action: "NAVIGATE", href: choice.href });
    } else sendResponse({ action: "NONE" });
  }

  // сигнал от content-visit.js
  else if (msg.type === "PAGE_VISITED") {
    log("PAGE_VISITED:", msg.url);
    state.visitedDomains.push(new URL(msg.url).hostname);
    state.visitCount++;
    saveState();
    startDwellTimer(); // запускаем таймер после входа на сайт
    sendResponse({ ok: true });
  }

  return true;
});

chrome.tabs.onRemoved.addListener((id) => {
  if (id === state.currentTabId) {
    state.currentTabId = null;
    saveState();
  }
});

loadState();
