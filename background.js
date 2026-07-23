const FIREBASE_PROJECT_ID = "translate-f35c0";
const FIREBASE_API_KEY = "AIzaSyB0_EnyhVfj9onv2IS2dDL7CykHWoTXVd0";

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

function cacheKey(text, targetLang) {
  return `${targetLang}:${text.trim().toLowerCase()}`;
}

function getCached(text, targetLang) {
  const key = cacheKey(text, targetLang);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCache(text, targetLang, value) {
  cache.set(cacheKey(text, targetLang), { value, time: Date.now() });
}

async function translateWithGoogle(text, targetLang) {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "auto");
  url.searchParams.set("tl", targetLang);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Google Translate HTTP ${response.status}`);
  }

  const data = await response.json();
  const translated = data[0]
    ?.map((part) => part[0])
    .filter(Boolean)
    .join("");

  if (!translated) {
    throw new Error("Boş çeviri yanıtı");
  }

  const detectedLang = data[2] || "auto";
  return { translated, detectedLang, targetLang, provider: "google" };
}

async function translateWithMyMemory(text, targetLang) {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", `autodetect|${targetLang}`);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`MyMemory HTTP ${response.status}`);
  }

  const data = await response.json();
  const translated = data.responseData?.translatedText;

  if (!translated || data.responseStatus !== 200) {
    throw new Error(data.responseDetails || "MyMemory çeviri hatası");
  }

  return {
    translated,
    detectedLang: data.responseData?.match?.split("|")?.[0] || "auto",
    targetLang,
    provider: "mymemory",
  };
}

async function translateText(text, targetLang) {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Çevrilecek metin yok");
  }

  const lang = targetLang || "tr";
  const cached = getCached(trimmed, lang);
  if (cached) {
    return { ...cached, cached: true };
  }

  let result;
  try {
    result = await translateWithGoogle(trimmed, lang);
  } catch {
    result = await translateWithMyMemory(trimmed, lang);
  }

  setCache(trimmed, lang, result);
  return { ...result, cached: false };
}

async function checkWordInFirestore(word) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/saved_words?key=${FIREBASE_API_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return false;
    const data = await response.json();
    if (!data.documents) return false;
    const trimmed = word.trim().toLowerCase();
    return data.documents.some((doc) => {
      const w = doc.fields?.word?.stringValue || "";
      return w.trim().toLowerCase() === trimmed;
    });
  } catch {
    return false;
  }
}

async function saveWordToFirestore(word, translation, sourceLang, targetLang) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/saved_words?key=${FIREBASE_API_KEY}`;
  
  const payload = {
    fields: {
      word: { stringValue: word },
      translation: { stringValue: translation },
      sourceLang: { stringValue: sourceLang },
      targetLang: { stringValue: targetLang },
      createdAt: { stringValue: new Date().toISOString() },
      status: { stringValue: "learning" },
      level: { integerValue: 1 },
      nextReviewDate: { stringValue: new Date().toISOString() }
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData.error?.message || `HTTP error! status: ${response.status}`;
    throw new Error(errMsg);
  }

  return await response.json();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "TRANSLATE") {
    translateText(message.text, message.targetLang)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error.message || "Çeviri başarısız oldu",
        })
      );
    return true;
  } else if (message.type === "SAVE_WORD") {
    saveWordToFirestore(message.word, message.translation, message.sourceLang, message.targetLang)
      .then(() => sendResponse({ ok: true }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error.message || "Kaydetme başarısız oldu",
        })
      );
    return true;
  } else if (message.type === "CHECK_WORD_EXISTS") {
    checkWordInFirestore(message.word)
      .then((exists) => sendResponse({ ok: true, exists }))
      .catch(() => sendResponse({ ok: false, exists: false }));
    return true;
  }

  return false;
});

