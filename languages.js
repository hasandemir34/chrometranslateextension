const LANGUAGES = [
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "ru", label: "Русский" },
  { code: "ar", label: "العربية" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "nl", label: "Nederlands" },
  { code: "pl", label: "Polski" },
  { code: "sv", label: "Svenska" },
  { code: "uk", label: "Українська" },
  { code: "hi", label: "हिन्दी" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "el", label: "Ελληνικά" },
  { code: "ro", label: "Română" },
  { code: "cs", label: "Čeština" },
  { code: "da", label: "Dansk" },
  { code: "fi", label: "Suomi" },
  { code: "hu", label: "Magyar" },
  { code: "no", label: "Norsk" },
  { code: "he", label: "עברית" },
  { code: "th", label: "ไทย" },
];

const DEFAULT_TARGET_LANG = "tr";
const STORAGE_KEY = "targetLang";

function getLanguageLabel(code) {
  const match = LANGUAGES.find((lang) => lang.code === code);
  return match ? match.label : code.toUpperCase();
}

if (typeof globalThis !== "undefined") {
  globalThis.SVC_LANGUAGES = LANGUAGES;
  globalThis.SVC_DEFAULT_TARGET_LANG = DEFAULT_TARGET_LANG;
  globalThis.SVC_STORAGE_KEY = STORAGE_KEY;
  globalThis.getLanguageLabel = getLanguageLabel;
}
