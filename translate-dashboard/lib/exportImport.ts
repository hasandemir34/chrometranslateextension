import { SavedWord } from "../firebase";

export function exportToCSV(words: SavedWord[], filename = "kelimelerim.csv") {
  const headers = ["Kelime", "Çeviri", "Kaynak Dil", "Hedef Dil", "Seviye", "Eklenme Tarihi"];
  const rows = words.map((w) => [
    `"${(w.word || "").replace(/"/g, '""')}"`,
    `"${(w.translation || "").replace(/"/g, '""')}"`,
    `"${w.sourceLang || "en"}"`,
    `"${w.targetLang || "tr"}"`,
    `"${w.level || 1}"`,
    `"${w.createdAt || ""}"`,
  ]);

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToJSON(words: SavedWord[], filename = "kelimelerim.json") {
  const jsonContent = JSON.stringify(words, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function parseCSVText(csvText: string): { word: string; translation: string; sourceLang?: string; targetLang?: string }[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const results: { word: string; translation: string; sourceLang?: string; targetLang?: string }[] = [];

  // Check if first line is header
  let startIdx = 0;
  const firstLine = lines[0].toLowerCase();
  if (firstLine.includes("kelime") || firstLine.includes("word")) {
    startIdx = 1;
  }

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    // Split by comma ignoring quotes
    const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(",");
    if (parts.length >= 2) {
      const word = parts[0].replace(/^"|"$/g, "").trim();
      const translation = parts[1].replace(/^"|"$/g, "").trim();
      const sourceLang = parts[2] ? parts[2].replace(/^"|"$/g, "").trim() : "en";
      const targetLang = parts[3] ? parts[3].replace(/^"|"$/g, "").trim() : "tr";

      if (word && translation) {
        results.push({ word, translation, sourceLang, targetLang });
      }
    }
  }

  return results;
}

export function parseJSONText(jsonText: string): { word: string; translation: string; sourceLang?: string; targetLang?: string }[] {
  try {
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item === "object" && item.word && item.translation)
      .map((item) => ({
        word: String(item.word).trim(),
        translation: String(item.translation).trim(),
        sourceLang: item.sourceLang ? String(item.sourceLang).trim() : "en",
        targetLang: item.targetLang ? String(item.targetLang).trim() : "tr",
      }));
  } catch (e) {
    console.error("JSON parse error:", e);
    return [];
  }
}
