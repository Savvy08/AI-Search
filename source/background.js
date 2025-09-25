const API_KEY = "AIzaSyBwNHhBC7IKitdpn6iwY9hzje1FOSmU9Gg";
const GOOGLE_SHEET_URL = "Сюда ссылку на Google Таблицу";
const DWELL_MINUTES = 2;
const SESSION_MINUTES = 30;

let running = false;
let startTime = null;
let sessionEndsAt = null;
let visitCount = 0;
let dwellTimerId = null;
let currentTabId = null;
let regionCache = null;
let recentQueries = [];

async function updateUIState(partial) {
  const defaults = {
    running: false,
    visitCount: 0,
    startTime: null,
    sessionEndsAt: null,
    lastQuery: "",
    region: "",
    lastUpdate: Date.now()
  };
  const cur = (await chrome.storage.local.get("autoState")).autoState || {};
  const next = { ...defaults, ...cur, ...partial, lastUpdate: Date.now() };
  await chrome.storage.local.set({ autoState: next });
}

async function getLocationFromIP() {
  if (regionCache) return regionCache;
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    regionCache = {
      ip: data.ip || "",
      city: data.city || "",
      region: data.region || "",
      country: data.country_name || ""
    };
    return regionCache;
  } catch {
    regionCache = { ip: "", city: "", region: "", country: "" };
    return regionCache;
  }
}

async function enforceOnlyTab(keepTabId) {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const toClose = tabs.filter(t => t.id !== keepTabId).map(t => t.id);
    if (toClose.length) await chrome.tabs.remove(toClose);
  } catch {}
}

function clearDwellTimer() {
  if (dwellTimerId) {
    clearTimeout(dwellTimerId);
    dwellTimerId = null;
  }
}

function uniqueQuery(text) {
  const cleaned = text.trim().toLowerCase();
  if (!cleaned || cleaned.length < 3) return false;
  return !recentQueries.includes(cleaned);
}

function rememberQuery(q) {
  const cleaned = q.trim().toLowerCase();
  if (!cleaned) return;
  recentQueries.unshift(cleaned);
  if (recentQueries.length > 10) recentQueries.pop();
}

async function generateQuery() {
  const loc = await getLocationFromIP();
  const topicSeed = [
    "местные новости", "погода", "спорт", "технологии",
    "культура", "бизнес", "туризм", "образование",
    "транспорт", "здравоохранение", "новые рестораны"
  ];
  const randomTopic = topicSeed[Math.floor(Math.random() * topicSeed.length)];

  const prompt = [
    `Сгенерируй один краткий поисковый запрос (до 6 слов) на русском, интересный для региона: ${loc.city || "ваш город"}, ${loc.country || "ваша страна"}.`,
    `Тема для вдохновения: ${randomTopic}.`,
    "Только сам запрос, без кавычек и пояснений."
  ].join(" ");

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.95, maxOutputTokens: 24 }
  };

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(API_KEY)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    text = text.trim().replace(/^["']|["']$/g, "").replace(/\n/g, " ").replace(/\s+/g, " ");

    if (uniqueQuery(text)) {
      rememberQuery(text);
      return text;
    }
  } catch {}

  const fallbackPool = [
    `события ${loc.city || "в городе"}`,
    `афиша ${loc.city || "город"}`,
    `курсы валют ${loc.country || "страна"}`,
    `транспорт ${loc.city || "город"} расписание`,
    `новости ${loc.region || loc.country || "региона"}`,
    `работа ${loc.city || "город"} вакансии`,
    `погода ${loc.city || "город"} сегодня`,
    `кафе ${loc.city || "город"} отзывы`,
    `спорт ${loc.city || "город"} новости`,
    `технологии ${loc.country || "страна"} тренды`
  ];
  let candidate = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
  let tries = 0;
  while (!uniqueQuery(candidate) && tries < 5) {
    candidate = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
    tries++;
  }
  rememberQuery(candidate);
  return candidate;
}

async function sendToSheet() {
  try {
    const loc = await getLocationFromIP();
    const runtimeMinutes = startTime ? Math.floor((Date.now() - startTime) / 60000) : 0;

    const payload = {
      ip: loc.ip || "",
      visits: visitCount,
      runtime: runtimeMinutes,
      region: `${loc.city || ""}${loc.city ? ", " : ""}${loc.country || ""}`
    };

    await fetch(GOOGLE_SHEET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch {}
}

async function startCycle() {
  if (!running) return;
  if (Date.now() >= sessionEndsAt) {
    await stopSession();
    return;
  }

  clearDwellTimer();

  let query;
  try {
    query = await generateQuery();
  } catch {
    query = "новости технологий";
  }

  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  chrome.tabs.create({ url, active: true }, async (tab) => {
    currentTabId = tab.id;
    visitCount += 1;

    await enforceOnlyTab(currentTabId);
    const loc = await getLocationFromIP();
    await updateUIState({
      running: true,
      visitCount,
      startTime,
      sessionEndsAt,
      lastQuery: query,
      region: `${loc.city || ""}${loc.city ? ", " : ""}${loc.country || ""}`
    });

    await sendToSheet();

    // Фолбек: если контент-скрипт не ответит, продолжаем через 15 сек
    dwellTimerId = setTimeout(() => {
      if (running) startCycle();
    }, 15000);
  });
}

async function startSession() {
  if (running) return;
  running = true;
  visitCount = 0;
  startTime = Date.now();
  sessionEndsAt = startTime + SESSION_MINUTES * 60 * 1000;
  regionCache = null;
  recentQueries = [];

  await updateUIState({
    running: true,
    visitCount,
    startTime,
    sessionEndsAt,
    lastQuery: "",
    region: ""
  });

  await startCycle();
}

async function stopSession() {
  running = false;
  clearDwellTimer();
  currentTabId = null;

  await updateUIState({ running: false });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === "START") {
      await startSession();
      sendResponse({ ok: true });
    } else if (msg?.type === "STOP") {
      await stopSession();
      sendResponse({ ok: true });
    } else if (msg?.type === "GET_STATE") {
      const { autoState } = await chrome.storage.local.get("autoState");
      sendResponse({ ok: true, state: autoState || {} });
    } else if (msg?.type === "SITE_LOADED" && running) {
      clearDwellTimer(); // сбрасываем фолбек
      const msLeft = sessionEndsAt - Date.now();
      const dwellMs = Math.max(0, Math.min(DWELL_MINUTES * 60 * 1000, msLeft));
      dwellTimerId = setTimeout(() => {
        if (running) startCycle();
      }, dwellMs);
    }
  })();
  return true;
});

chrome.runtime.onInstalled.addListener(async () => {
  await updateUIState({
    running: false,
    visitCount: 0,
    startTime: null,
    sessionEndsAt: null,
    lastQuery: "",
    region: ""
  });
});

chrome.runtime.onStartup.addListener(async () => {
  const { autostart } = await chrome.storage.local.get("autostart");
  if (autostart) await startSession();
});
