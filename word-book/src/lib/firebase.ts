const FIREBASE_PROJECT_ID = "translate-f35c0";
const FIREBASE_API_KEY = "AIzaSyB0_EnyhVfj9onv2IS2dDL7CykHWoTXVd0";

export interface SavedWord {
  id: string;
  word: string;
  translation: string;
  sourceLang: string;
  targetLang: string;
  createdAt: string;
  status: "learning" | "memorized";
  level: number; // Leitner level 1 - 5
  nextReviewDate: string; // ISO String
  exampleSentence?: string;
  exampleTranslation?: string;
}

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string | number;
};

type FirestoreDocument = {
  name: string;
  fields?: Record<string, FirestoreValue>;
};

export async function getSavedWords(): Promise<SavedWord[]> {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/saved_words?key=${FIREBASE_API_KEY}&orderBy=createdAt desc`;

  try {
    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch words: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.documents) {
      return [];
    }

    return (data.documents as FirestoreDocument[]).map((doc) => {
      const id = doc.name.split("/").pop() || "";
      const fields = doc.fields || {};
      
      const levelNum = fields.level?.integerValue 
        ? Number(fields.level.integerValue) 
        : (fields.status?.stringValue === "memorized" ? 5 : 1);

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
    const response = await fetch(url, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`Failed to delete word: ${response.statusText}`);
    }

    return true;
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
  exampleTranslation = ""
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
      exampleTranslation: { stringValue: exampleTranslation }
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Failed to add word: ${response.statusText}`);
    }

    const doc = (await response.json()) as FirestoreDocument;
    const id = doc.name.split("/").pop() || "";
    const fields = doc.fields || {};

    return {
      id,
      word: fields.word?.stringValue || "",
      translation: fields.translation?.stringValue || "",
      sourceLang: fields.sourceLang?.stringValue || "",
      targetLang: fields.targetLang?.stringValue || "",
      createdAt: fields.createdAt?.stringValue || "",
      status: "learning",
      level: 1,
      nextReviewDate: new Date().toISOString(),
      exampleSentence: fields.exampleSentence?.stringValue || "",
      exampleTranslation: fields.exampleTranslation?.stringValue || "",
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
      level: { integerValue: level }
    }
  };

  try {
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
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
      status: { stringValue: status }
    }
  };

  try {
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error("Error updating Leitner level:", error);
    return false;
  }
}

export async function updateWordExample(
  id: string,
  exampleSentence: string,
  exampleTranslation: string
): Promise<boolean> {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/saved_words/${id}?updateMask.fieldPaths=exampleSentence&updateMask.fieldPaths=exampleTranslation&key=${FIREBASE_API_KEY}`;

  const payload = {
    fields: {
      exampleSentence: { stringValue: exampleSentence },
      exampleTranslation: { stringValue: exampleTranslation }
    }
  };

  try {
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error("Error updating example sentence:", error);
    return false;
  }
}

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
