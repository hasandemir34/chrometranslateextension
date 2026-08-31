const FIREBASE_PROJECT_ID = "translate-f35c0";
const FIREBASE_API_KEY = "AIzaSyB0_EnyhVfj9onv2IS2dDL7CykHWoTXVd0";

// ─── YDS Etiket Tipleri ──────────────────────────────────────────────────────
export type WordTag =
  | "Academic Adjective"
  | "Phrasal Verb"
  | "Prepositional Phrase"
  | "Conjunction"
  | "High Priority YDS"
  | "Noun"
  | "Verb"
  | "Adverb";

export type YDSLevel = "B1" | "B2" | "C1" | "C2";

// ─── Ana Kelime Tipi ─────────────────────────────────────────────────────────
export interface SavedWord {
  id: string;
  word: string;
  translation: string;
  sourceLang: string;
  targetLang: string;
  createdAt: string;
  status: "learning" | "memorized";

  // Leitner (mevcut)
  level: number; // 1-5
  nextReviewDate: string; // ISO String

  // AI Örnek Cümle (mevcut)
  exampleSentence?: string;
  exampleTranslation?: string;

  // ── YDS Yeni Alanlar ──────────────────────────────────────────────────────
  tags?: WordTag[];
  contextSentence?: string; // Kaydedildiği bağlam cümlesi
  synonyms?: string[];
  antonyms?: string[];
  collocations?: string[]; // Örn: "vulnerable to", "lead to"
  ydsLevel?: YDSLevel;

  // SM-2 Algoritması
  sm2EF?: number;          // Easiness Factor (başlangıç: 2.5)
  sm2Interval?: number;    // Gün cinsinden tekrar aralığı
  sm2Repetitions?: number; // Ardışık doğru yanıt sayısı
  sm2NextReview?: string;  // ISO String
}

// ─── YDS Kelime Zenginleştirme Tipi ─────────────────────────────────────────
export interface YDSWordEnrichment {
  synonyms: string[];
  antonyms: string[];
  collocations: string[];
  ydsLevel: YDSLevel;
  ydsExampleSentence: string;
  ydsExampleTranslation: string;
  ydsQuestion?: {
    question: string;
    options: string[];
    answer: string;
    explanation: string;
  };
}

// ─── YDS Sınav Tipi ──────────────────────────────────────────────────────────
export interface YDSQuestion {
  id: string;
  type: "vocabulary" | "cloze";
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  wordId?: string;
  word?: string;
}

export interface YDSExam {
  questions: YDSQuestion[];
  generatedAt: string;
}

// ─── Firestore İç Tipleri ───────────────────────────────────────────────────
type FirestoreValue = {
  stringValue?: string;
  integerValue?: string | number;
  doubleValue?: number;
  arrayValue?: { values?: FirestoreValue[] };
  booleanValue?: boolean;
};

type FirestoreDocument = {
  name: string;
  fields?: Record<string, FirestoreValue>;
};

// ─── Yardımcı: Firestore dizisini string[] olarak oku ────────────────────────
function readStringArray(field?: FirestoreValue): string[] {
  if (!field?.arrayValue?.values) return [];
  return field.arrayValue.values
    .map((v) => v.stringValue || "")
    .filter(Boolean);
}

// ─── CRUD Fonksiyonları ──────────────────────────────────────────────────────

export async function getSavedWords(): Promise<SavedWord[]> {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/saved_words?key=${FIREBASE_API_KEY}&orderBy=createdAt desc`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to fetch words: ${response.statusText}`);

    const data = await response.json();
    if (!data.documents) return [];

    return (data.documents as FirestoreDocument[]).map((doc) => {
      const id = doc.name.split("/").pop() || "";
      const fields = doc.fields || {};

      const levelNum = fields.level?.integerValue
        ? Number(fields.level.integerValue)
        : fields.status?.stringValue === "memorized" ? 5 : 1;

      return {
        id,
        word: fields.word?.stringValue || "",
        translation: fields.translation?.stringValue || "",
        sourceLang: fields.sourceLang?.stringValue || "",
        targetLang: fields.targetLang?.stringValue || "",
        createdAt: fields.createdAt?.stringValue || new Date().toISOString(),
        status: (fields.status?.stringValue || (levelNum === 5 ? "memorized" : "learning")) as "learning" | "memorized",
        level: levelNum,
        nextReviewDate: fields.nextReviewDate?.stringValue || new Date().toISOString(),
        exampleSentence: fields.exampleSentence?.stringValue || "",
        exampleTranslation: fields.exampleTranslation?.stringValue || "",
        // YDS alanları
        tags: readStringArray(fields.tags) as WordTag[],
        contextSentence: fields.contextSentence?.stringValue || "",
        synonyms: readStringArray(fields.synonyms),
        antonyms: readStringArray(fields.antonyms),
        collocations: readStringArray(fields.collocations),
        ydsLevel: (fields.ydsLevel?.stringValue as YDSLevel) || undefined,
        // SM-2
        sm2EF: fields.sm2EF?.doubleValue ?? 2.5,
        sm2Interval: fields.sm2Interval?.integerValue ? Number(fields.sm2Interval.integerValue) : 1,
        sm2Repetitions: fields.sm2Repetitions?.integerValue ? Number(fields.sm2Repetitions.integerValue) : 0,
        sm2NextReview: fields.sm2NextReview?.stringValue || new Date().toISOString(),
      };
    });
  } catch (error) {
    console.error("Error fetching saved words from Firestore:", error);
    return [];
  }
}

export async function checkWordExists(word: string): Promise<boolean> {
  const trimmed = word.trim().toLowerCase();
  if (!trimmed) return false;
  try {
    const words = await getSavedWords();
    return words.some((w) => w.word.trim().toLowerCase() === trimmed);
  } catch {
    return false;
  }
}

export async function deleteSavedWord(id: string): Promise<boolean> {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/saved_words/${id}?key=${FIREBASE_API_KEY}`;
  try {
    const response = await fetch(url, { method: "DELETE" });
    return response.ok;
  } catch (error) {
    console.error("Error deleting saved word:", error);
    return false;
  }
}

export async function addSavedWord(
  word: string,
  translation: string,
  sourceLang: string,
  targetLang: string,
  exampleSentence = "",
  exampleTranslation = "",
  contextSentence = "",
  tags: WordTag[] = []
): Promise<SavedWord | null> {
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
      nextReviewDate: { stringValue: new Date().toISOString() },
      exampleSentence: { stringValue: exampleSentence },
      exampleTranslation: { stringValue: exampleTranslation },
      contextSentence: { stringValue: contextSentence },
      tags: {
        arrayValue: {
          values: tags.map((t) => ({ stringValue: t })),
        },
      },
      sm2EF: { doubleValue: 2.5 },
      sm2Interval: { integerValue: 1 },
      sm2Repetitions: { integerValue: 0 },
      sm2NextReview: { stringValue: new Date().toISOString() },
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Failed to add word: ${response.statusText}`);

    const doc = (await response.json()) as FirestoreDocument;
    const id = doc.name.split("/").pop() || "";

    return {
      id,
      word,
      translation,
      sourceLang,
      targetLang,
      createdAt: new Date().toISOString(),
      status: "learning",
      level: 1,
      nextReviewDate: new Date().toISOString(),
      exampleSentence,
      exampleTranslation,
      contextSentence,
      tags,
      synonyms: [],
      antonyms: [],
      collocations: [],
      sm2EF: 2.5,
      sm2Interval: 1,
      sm2Repetitions: 0,
      sm2NextReview: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error adding saved word:", error);
    return null;
  }
}

export async function updateWordStatus(
  id: string,
  status: "learning" | "memorized"
): Promise<boolean> {
  const level = status === "memorized" ? 5 : 1;
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/saved_words/${id}?updateMask.fieldPaths=status&updateMask.fieldPaths=level&key=${FIREBASE_API_KEY}`;

  const payload = {
    fields: {
      status: { stringValue: status },
      level: { integerValue: level },
    },
  };

  try {
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (error) {
    console.error("Error updating word status:", error);
    return false;
  }
}

export async function updateWordLeitnerLevel(
  id: string,
  newLevel: number,
  nextReviewDateISO: string
): Promise<boolean> {
  const status = newLevel >= 5 ? "memorized" : "learning";
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/saved_words/${id}?updateMask.fieldPaths=level&updateMask.fieldPaths=nextReviewDate&updateMask.fieldPaths=status&key=${FIREBASE_API_KEY}`;

  const payload = {
    fields: {
      level: { integerValue: newLevel },
      nextReviewDate: { stringValue: nextReviewDateISO },
      status: { stringValue: status },
    },
  };

  try {
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (error) {
    console.error("Error updating Leitner level:", error);
    return false;
  }
}

// ─── SM-2 Algoritması Güncelleme ─────────────────────────────────────────────
// q: 0=Again, 1=Hard, 3=Good, 5=Easy
export async function updateWordSM2(
  id: string,
  q: number, // 0-5 SM-2 kalite skoru
  currentEF: number,
  currentInterval: number,
  currentRepetitions: number
): Promise<boolean> {
  // SM-2 formülü
  let newEF = currentEF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (newEF < 1.3) newEF = 1.3;

  let newInterval: number;
  let newRepetitions: number;

  if (q < 3) {
    // Başarısız → sıfırla
    newInterval = 1;
    newRepetitions = 0;
  } else {
    newRepetitions = currentRepetitions + 1;
    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentInterval * newEF);
    }
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);
  const nextReviewISO = nextReview.toISOString();
  const status = newRepetitions >= 5 ? "memorized" : "learning";

  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/saved_words/${id}?updateMask.fieldPaths=sm2EF&updateMask.fieldPaths=sm2Interval&updateMask.fieldPaths=sm2Repetitions&updateMask.fieldPaths=sm2NextReview&updateMask.fieldPaths=status&key=${FIREBASE_API_KEY}`;

  const payload = {
    fields: {
      sm2EF: { doubleValue: newEF },
      sm2Interval: { integerValue: newInterval },
      sm2Repetitions: { integerValue: newRepetitions },
      sm2NextReview: { stringValue: nextReviewISO },
      status: { stringValue: status },
    },
  };

  try {
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (error) {
    console.error("Error updating SM-2:", error);
    return false;
  }
}

// ─── Etiket Güncelleme ───────────────────────────────────────────────────────
export async function updateWordTags(id: string, tags: WordTag[]): Promise<boolean> {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/saved_words/${id}?updateMask.fieldPaths=tags&key=${FIREBASE_API_KEY}`;

  const payload = {
    fields: {
      tags: {
        arrayValue: {
          values: tags.map((t) => ({ stringValue: t })),
        },
      },
    },
  };

  try {
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (error) {
    console.error("Error updating tags:", error);
    return false;
  }
}

// ─── YDS Zenginleştirme Güncelleme ──────────────────────────────────────────
export async function updateWordYDSEnrichment(
  id: string,
  data: {
    synonyms?: string[];
    antonyms?: string[];
    collocations?: string[];
    ydsLevel?: YDSLevel;
    contextSentence?: string;
  }
): Promise<boolean> {
  const masks = [
    "synonyms",
    "antonyms",
    "collocations",
    "ydsLevel",
    "contextSentence",
  ];
  const maskStr = masks.map((m) => `updateMask.fieldPaths=${m}`).join("&");
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/saved_words/${id}?${maskStr}&key=${FIREBASE_API_KEY}`;

  const toArray = (arr?: string[]) => ({
    arrayValue: { values: (arr || []).map((s) => ({ stringValue: s })) },
  });

  const payload = {
    fields: {
      synonyms: toArray(data.synonyms),
      antonyms: toArray(data.antonyms),
      collocations: toArray(data.collocations),
      ydsLevel: { stringValue: data.ydsLevel || "" },
      contextSentence: { stringValue: data.contextSentence || "" },
    },
  };

  try {
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (error) {
    console.error("Error updating YDS enrichment:", error);
    return false;
  }
}

// ─── Örnek Cümle Güncelleme (mevcut) ─────────────────────────────────────────
export async function updateWordExample(
  id: string,
  exampleSentence: string,
  exampleTranslation: string
): Promise<boolean> {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/saved_words/${id}?updateMask.fieldPaths=exampleSentence&updateMask.fieldPaths=exampleTranslation&key=${FIREBASE_API_KEY}`;

  const payload = {
    fields: {
      exampleSentence: { stringValue: exampleSentence },
      exampleTranslation: { stringValue: exampleTranslation },
    },
  };

  try {
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (error) {
    console.error("Error updating example sentence:", error);
    return false;
  }
}

// ─── Toplu Ekleme (mevcut) ───────────────────────────────────────────────────
export async function bulkAddSavedWords(
  words: { word: string; translation: string; sourceLang?: string; targetLang?: string }[]
): Promise<number> {
  let successCount = 0;
  for (const item of words) {
    const added = await addSavedWord(
      item.word,
      item.translation,
      item.sourceLang || "en",
      item.targetLang || "tr"
    );
    if (added) successCount++;
  }
  return successCount;
}
