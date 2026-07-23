"use client";

import { useEffect, useState, useMemo } from "react";
import {
  getSavedWords,
  deleteSavedWord,
  addSavedWord,
  updateWordStatus,
  updateWordLeitnerLevel,
  updateWordExample,
  checkWordExists,
  bulkAddSavedWords,
  SavedWord,
} from "@/firebase";
import { exportToCSV, exportToJSON, parseCSVText, parseJSONText } from "@/lib/exportImport";
import { generateExampleSentence, generateAIStory } from "@/lib/ai";

type SortBy = "newest" | "oldest" | "alphabetical-asc" | "alphabetical-desc";
type QuizSubMode = "flashcard" | "choice" | "type";

export default function Home() {
  const [words, setWords] = useState<SavedWord[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [filterLang, setFilterLang] = useState<string>("all");
  const [listFilterStatus, setListFilterStatus] = useState<"all" | "learning" | "memorized">("all");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());

  // Koyu Mod
  const theme = "dark";

  // Tab State: "list" veya "quiz"
  const [activeTab, setActiveTab] = useState<"list" | "quiz">("list");

  // Quiz State
  const [quizSubMode, setQuizSubMode] = useState<QuizSubMode>("flashcard");
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizRevealed, setQuizRevealed] = useState(false);

  // Çoktan Seçmeli Test State'leri
  const [choiceSelected, setChoiceSelected] = useState<string | null>(null);
  const [choiceFeedback, setChoiceFeedback] = useState<{ isCorrect: boolean; selected: string } | null>(null);

  // Yazma Testi State'leri
  const [typingAnswer, setTypingAnswer] = useState("");
  const [typingFeedback, setTypingFeedback] = useState<{ isCorrect: boolean; correctText: string } | null>(null);

  // AI State'leri
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [aiSentenceLoadingId, setAiSentenceLoadingId] = useState<string | null>(null);
  const [aiStoryOpen, setAiStoryOpen] = useState(false);
  const [aiStoryLoading, setAiStoryLoading] = useState(false);
  const [aiStoryData, setAiStoryData] = useState<{ storyEn: string; storyTr: string } | null>(null);

  // İçe Aktarma (Import) State'leri
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [importing, setImporting] = useState(false);

  // Manüel kelime ekleme formu için state'ler
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [newTranslation, setNewTranslation] = useState("");
  const [newSourceLang, setNewSourceLang] = useState("en");
  const [newTargetLang, setNewTargetLang] = useState("tr");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const languagesList = [
    { code: "en", label: "English" },
    { code: "de", label: "Deutsch" },
    { code: "fr", label: "Français" },
    { code: "es", label: "Español" },
    { code: "it", label: "Italiano" },
    { code: "pt", label: "Português" },
    { code: "ru", label: "Русский" },
    { code: "tr", label: "Türkçe" },
    { code: "ar", label: "العربية" },
    { code: "ja", label: "日本語" },
  ];

  // Koyu Mod ve API Key İlklendirme
  useEffect(() => {
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
    const savedKey = localStorage.getItem("gemini_key") || "";
    setGeminiApiKey(savedKey);
  }, []);

  // Quiz Kartının Her Yeni Kelimede veya Mod Değişiminde Ön Yüzüne Dönmesini Sağlama
  useEffect(() => {
    setQuizRevealed(false);
    setChoiceSelected(null);
    setChoiceFeedback(null);
    setTypingAnswer("");
    setTypingFeedback(null);
  }, [quizIndex, quizSubMode]);

  // Seçilen Metinden Hızlı Kelime Ekleme State'i
  const [selectedWordTooltip, setSelectedWordTooltip] = useState<{
    word: string;
    x: number;
    y: number;
  } | null>(null);
  const [addingSelectedWord, setAddingSelectedWord] = useState(false);
  const [quickAddSuccessMsg, setQuickAddSuccessMsg] = useState("");

  // Metin Seçimi Dinleyicisi
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setSelectedWordTooltip(null);
        return;
      }

      const text = selection.toString().trim();
      if (text.length >= 2 && text.length <= 40) {
        try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            setSelectedWordTooltip({
              word: text,
              x: rect.left + rect.width / 2,
              y: rect.top - 45,
            });
          }
        } catch {
          setSelectedWordTooltip(null);
        }
      } else {
        setSelectedWordTooltip(null);
      }
    };

    document.addEventListener("mouseup", handleSelectionChange);
    return () => {
      document.removeEventListener("mouseup", handleSelectionChange);
    };
  }, []);

  // Seçilen Kelimeyi Deftere Hızlı Ekleme
  const handleAddSelectedWord = async () => {
    if (!selectedWordTooltip || addingSelectedWord) return;

    const wordToAdd = selectedWordTooltip.word.trim();
    setAddingSelectedWord(true);

    // 1. Çift Kontrolü
    const exists = await checkWordExists(wordToAdd);
    if (exists) {
      alert(`⚠️ "${wordToAdd}" kelimesi defterinizde zaten ekli!`);
      setAddingSelectedWord(false);
      setSelectedWordTooltip(null);
      return;
    }

    // 2. Google Translate ile Hızlı Türkçe Çeviri Al
    let translation = wordToAdd;
    try {
      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=tr&dt=t&q=${encodeURIComponent(wordToAdd)}`
      );
      const data = await res.json();
      if (data?.[0]?.[0]?.[0]) {
        translation = data[0][0][0];
      }
    } catch {
      translation = wordToAdd;
    }

    // 3. Firestore'a Ekle
    const added = await addSavedWord(wordToAdd, translation, "en", "tr");
    if (added) {
      setWords((prev) => [added, ...prev]);
      setQuickAddSuccessMsg(`✔ "${wordToAdd}" defterinize eklendi! (${translation})`);
      setTimeout(() => setQuickAddSuccessMsg(""), 4000);
    } else {
      alert("Kelime eklenirken hata oluştu.");
    }

    setAddingSelectedWord(false);
    setSelectedWordTooltip(null);
    window.getSelection()?.removeAllRanges();
  };

  // Firestore Verilerini Yükleme
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await getSavedWords();
      setWords(data);
      setLoading(false);
    }
    loadData();
  }, []);

  // API Key kaydetme
  const handleSaveApiKey = (key: string) => {
    setGeminiApiKey(key);
    localStorage.setItem("gemini_key", key);
    setShowApiKeyModal(false);
  };

  // Kelime silme işlemi
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Bu kelimeyi silmek istediğinize emin misiniz?")) {
      setDeletingId(id);
      const success = await deleteSavedWord(id);
      if (success) {
        setWords((prev) => prev.filter((w) => w.id !== id));
      } else {
        alert("Kelime silinirken bir hata oluştu.");
      }
      setDeletingId(null);
    }
  };

  // Status Manuel Değiştirme
  const handleToggleStatus = async (e: React.MouseEvent, item: SavedWord) => {
    e.stopPropagation();
    const newStatus = item.status === "learning" ? "memorized" : "learning";
    const success = await updateWordStatus(item.id, newStatus);
    if (success) {
      setWords((prev) =>
        prev.map((w) =>
          w.id === item.id ? { ...w, status: newStatus, level: newStatus === "memorized" ? 5 : 1 } : w
        )
      );
    } else {
      alert("Durum güncellenirken bir hata oluştu.");
    }
  };

  // Kartın ön/arka yüzünü değiştirme
  const toggleFlip = (id: string) => {
    setFlippedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Sesli telaffuz (Text-to-Speech)
  const handleSpeak = (e: React.MouseEvent, text: string, lang: string) => {
    e.stopPropagation();
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const utterance = new SpeechSynthesisUtterance(text);
    const langMap: Record<string, string> = {
      en: "en-US", de: "de-DE", fr: "fr-FR", es: "es-ES",
      it: "it-IT", pt: "pt-PT", ru: "ru-RU", ja: "ja-JP",
      ko: "ko-KR", zh: "zh-CN", tr: "tr-TR"
    };

    utterance.lang = langMap[lang.toLowerCase()] || lang || "en-US";
    window.speechSynthesis.speak(utterance);
  };

  // Manüel kelime ekleme formu gönderimi (Çift Kontrolü ile)
  const handleAddWordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const trimmedWord = newWord.trim();
    const trimmedTrans = newTranslation.trim();

    if (!trimmedWord || !trimmedTrans) {
      setFormError("Lütfen tüm alanları doldurun.");
      return;
    }

    setFormSubmitting(true);

    // Çift kontrolü (Duplicate Detection)
    const exists = await checkWordExists(trimmedWord);
    if (exists) {
      setFormError("⚠️ Bu kelime defterinizde zaten ekli!");
      setFormSubmitting(false);
      return;
    }

    const added = await addSavedWord(trimmedWord, trimmedTrans, newSourceLang, newTargetLang);
    if (added) {
      setWords((prev) => [added, ...prev]);
      setNewWord("");
      setNewTranslation("");
      setIsFormOpen(false);
    } else {
      setFormError("Kelime eklenirken hata oluştu.");
    }
    setFormSubmitting(false);
  };

  // AI Örnek Cümle Üretme
  const handleGenerateAISentence = async (e: React.MouseEvent, item: SavedWord) => {
    e.stopPropagation();
    setAiSentenceLoadingId(item.id);
    const result = await generateExampleSentence(item.word, item.translation, item.sourceLang, geminiApiKey);
    if (result.sentence) {
      const ok = await updateWordExample(item.id, result.sentence, result.sentenceTranslation);
      if (ok) {
        setWords((prev) =>
          prev.map((w) =>
            w.id === item.id
              ? { ...w, exampleSentence: result.sentence, exampleTranslation: result.sentenceTranslation }
              : w
          )
        );
      }
    }
    setAiSentenceLoadingId(null);
  };

  // AI Okuma Metni Üretme
  const handleGenerateStoryModal = async () => {
    setAiStoryOpen(true);
    setAiStoryLoading(true);
    const sampleWords = words.slice(0, 5);
    const result = await generateAIStory(sampleWords, geminiApiKey);
    setAiStoryData(result);
    setAiStoryLoading(false);
  };

  // Dosyadan Toplu Yükleme (CSV / JSON Import)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportStatus("Dosya okunuyor...");
    const text = await file.text();
    let parsed: { word: string; translation: string; sourceLang?: string; targetLang?: string }[] = [];

    if (file.name.endsWith(".json")) {
      parsed = parseJSONText(text);
    } else {
      parsed = parseCSVText(text);
    }

    if (parsed.length === 0) {
      setImportStatus("❌ Dosyada geçerli kelime bulunamadı.");
      setImporting(false);
      return;
    }

    setImportStatus(`${parsed.length} kelime veritabanına ekleniyor...`);
    const count = await bulkAddSavedWords(parsed);
    setImportStatus(`✔ ${count} kelime başarıyla eklendi!`);
    setImporting(false);

    // Yeniden verileri yükle
    const updated = await getSavedWords();
    setWords(updated);
  };

  // Quiz Havuzu (Sadece "learning" veya Level < 5 olanlar)
  const quizWords = useMemo(() => {
    return words.filter((w) => (w.level ? w.level < 5 : w.status === "learning"));
  }, [words]);

  const currentQuizWord = quizWords[quizIndex] || quizWords[0];

  // Çoktan Seçmeli Şıkları Oluşturma
  const choiceOptions = useMemo(() => {
    if (!currentQuizWord) return [];
    const correct = currentQuizWord.translation;
    const others = words
      .filter((w) => w.id !== currentQuizWord.id && w.translation !== correct)
      .map((w) => w.translation);

    const shuffledOthers = [...others].sort(() => 0.5 - Math.random()).slice(0, 3);
    const allChoices = [correct, ...shuffledOthers].sort(() => 0.5 - Math.random());
    return allChoices;
  }, [currentQuizWord, words]);

  // Aralıklı Tekrar (Leitner) - Doğru Yanıt
  const handleQuizAnswerCorrect = async (wordId: string) => {
    setQuizRevealed(false);
    const item = words.find((w) => w.id === wordId);
    if (!item) return;

    const currentLevel = item.level || 1;
    const nextLevel = Math.min(5, currentLevel + 1);
    const daysToAdd = [0, 1, 2, 4, 7, 14][nextLevel];
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + daysToAdd);

    const success = await updateWordLeitnerLevel(wordId, nextLevel, nextReview.toISOString());
    if (success) {
      setWords((prev) =>
        prev.map((w) =>
          w.id === wordId
            ? {
                ...w,
                level: nextLevel,
                status: nextLevel === 5 ? "memorized" : "learning",
                nextReviewDate: nextReview.toISOString(),
              }
            : w
        )
      );
      resetQuizState();
    }
  };

  // Aralıklı Tekrar (Leitner) - Yanlış Yanıt
  const handleQuizAnswerWrong = async (wordId: string) => {
    setQuizRevealed(false);
    const item = words.find((w) => w.id === wordId);
    if (!item) return;

    const nextLevel = 1;
    const nextReview = new Date();
    const success = await updateWordLeitnerLevel(wordId, nextLevel, nextReview.toISOString());
    if (success) {
      setWords((prev) =>
        prev.map((w) =>
          w.id === wordId
            ? {
                ...w,
                level: nextLevel,
                status: "learning",
                nextReviewDate: nextReview.toISOString(),
              }
            : w
        )
      );
      resetQuizState();
    }
  };

  const resetQuizState = () => {
    setQuizRevealed(false);
    setChoiceSelected(null);
    setChoiceFeedback(null);
    setTypingAnswer("");
    setTypingFeedback(null);
    if (quizWords.length > 1) {
      setQuizIndex((prev) => (prev + 1) % quizWords.length);
    } else {
      setQuizIndex(0);
    }
  };

  // Benzersiz kaynak dilleri
  const uniqueSourceLangs = useMemo(() => {
    const langs = new Set<string>();
    words.forEach((w) => w.sourceLang && langs.add(w.sourceLang.toLowerCase()));
    return Array.from(langs);
  }, [words]);

  // Arama ve Filtreleme
  const filteredAndSortedWords = useMemo(() => {
    const result = words.filter((w) => {
      const term = search.toLowerCase();
      const matchesSearch = w.word.toLowerCase().includes(term) || w.translation.toLowerCase().includes(term);
      const matchesLang = filterLang === "all" || w.sourceLang.toLowerCase() === filterLang;
      const matchesStatus = listFilterStatus === "all" || w.status === listFilterStatus;
      return matchesSearch && matchesLang && matchesStatus;
    });

    if (sortBy === "newest") {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "oldest") {
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === "alphabetical-asc") {
      result.sort((a, b) => a.word.localeCompare(b.word));
    } else if (sortBy === "alphabetical-desc") {
      result.sort((a, b) => b.word.localeCompare(a.word));
    }
    return result;
  }, [words, search, sortBy, filterLang, listFilterStatus]);

  // İstatistikler
  const stats = useMemo(() => {
    const total = words.length;
    const learning = words.filter((w) => w.status === "learning").length;
    const memorized = words.filter((w) => w.status === "memorized").length;
    return { total, learning, memorized };
  }, [words]);

  const formatDate = (isoStr: string) => {
    if (!isoStr) return "";
    try {
      return new Date(isoStr).toLocaleDateString("tr-TR", {
        day: "numeric", month: "short", year: "numeric",
      });
    } catch { return ""; }
  };

  return (
    <div className="min-h-screen pb-16 font-sans relative bg-[#090d16] text-[#f8fafc] antialiased selection:bg-indigo-500 selection:text-white">
      {/* Şık Arka Plan Işık Efektleri */}
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[140px] pointer-events-none bg-indigo-600/10" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[140px] pointer-events-none bg-purple-600/10" />

      {/* Header (Cam Tasarımı) */}
      <header className="border-b sticky top-0 z-40 backdrop-blur-xl border-slate-800/80 bg-slate-950/75 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-xl shadow-md shadow-indigo-500/20">
              📖
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                Kelime Defterim Pro
              </h1>
              <p className="text-xs text-slate-300 font-medium">
                Leitner 5x Algoritması & Yapay Zeka
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* AI Key Butonu */}
            <button
              onClick={() => setShowApiKeyModal(true)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                geminiApiKey
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                  : "border-purple-500/50 bg-purple-500/15 text-purple-300 hover:bg-purple-500/25"
              }`}
              title="Gemini AI API Anahtarı Ayarları"
            >
              <span>{geminiApiKey ? "✨ AI Aktif" : "🔑 AI Key"}</span>
            </button>

            {/* Yeni Kelime Ekle Butonu */}
            <button
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/25 active:scale-95"
            >
              {isFormOpen ? "Kapat ✕" : "➕ Kelime Ekle"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-6">
        
        {/* İstatistikler & Dışa/İçe Aktar Kartları */}
        <section className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
          <div className="border rounded-2xl p-4 flex flex-col justify-center backdrop-blur-md shadow-sm transition-all hover:border-slate-700 bg-slate-900/60 border-slate-800/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Toplam Kelime</span>
            <span className="text-2xl font-extrabold text-indigo-400 mt-0.5">{stats.total}</span>
          </div>

          <div className="border rounded-2xl p-4 flex flex-col justify-center backdrop-blur-md shadow-sm transition-all hover:border-slate-700 bg-slate-900/60 border-slate-800/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90">Öğreniliyor</span>
            <span className="text-2xl font-extrabold text-amber-400 mt-0.5">{stats.learning}</span>
          </div>

          <div className="border rounded-2xl p-4 flex flex-col justify-center backdrop-blur-md shadow-sm transition-all hover:border-slate-700 bg-slate-900/60 border-slate-800/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400/90">Ezberlendi</span>
            <span className="text-2xl font-extrabold text-emerald-400 mt-0.5">{stats.memorized}</span>
          </div>

          {/* Dışa/İçe Aktar Paneli */}
          <div className="border rounded-2xl p-4 flex items-center justify-around backdrop-blur-md shadow-sm gap-2 bg-slate-900/60 border-slate-800/80">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1.5"
              title="CSV veya JSON Yükle"
            >
              📥 İçe Aktar
            </button>
            <span className="text-slate-700 font-bold">|</span>
            <button
              onClick={() => exportToCSV(words)}
              className="text-xs font-bold text-purple-400 hover:text-purple-300 transition flex items-center gap-1.5"
              title="CSV Olarak İndir"
            >
              📤 Dışa Aktar
            </button>
          </div>
        </section>

        {/* Ana Tab Navigasyonu */}
        <div className="flex border-b mb-6 justify-between items-center border-slate-800">
          <div className="flex gap-2 sm:gap-4">
            <button
              onClick={() => setActiveTab("list")}
              className={`pb-3 text-sm font-bold border-b-2 transition-all px-4 flex items-center gap-2 ${
                activeTab === "list"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-300 hover:text-slate-100"
              }`}
            >
              📋 Kelime Listem
              <span className="bg-slate-800 text-slate-300 text-[11px] px-2 py-0.5 rounded-full font-bold">
                {words.length}
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab("quiz");
                setQuizIndex(0);
                setQuizRevealed(false);
              }}
              className={`pb-3 text-sm font-bold border-b-2 transition-all px-4 flex items-center gap-2 ${
                activeTab === "quiz"
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-slate-300 hover:text-slate-100"
              }`}
            >
              ⚡ Çoklu Pratik (Quiz)
              {quizWords.length > 0 && (
                <span className="bg-purple-950 text-purple-300 border border-purple-800/80 px-2 py-0.5 rounded-full text-[11px] font-bold">
                  {quizWords.length}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={handleGenerateStoryModal}
            className="pb-3 text-xs font-extrabold text-amber-400 hover:text-amber-300 transition flex items-center gap-1.5"
          >
            ✨ AI Okuma Metni Oluştur
          </button>
        </div>

        {/* Form: Yeni Kelime Ekleme */}
        {isFormOpen && (
          <section className="mb-6 border rounded-3xl p-6 shadow-2xl backdrop-blur-xl bg-slate-900/90 border-slate-800 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-100">➕ Deftere Yeni Kelime Ekle</h3>
              <span className="text-xs text-slate-300 font-medium">Otomatik çift kontrolü aktiftir</span>
            </div>

            <form onSubmit={handleAddWordSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-300">Orijinal Kelime / Cümle</label>
                  <input
                    type="text"
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    placeholder="Örn: resilience"
                    className="w-full rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-300">Türkçe Çevirisi</label>
                  <input
                    type="text"
                    value={newTranslation}
                    onChange={(e) => setNewTranslation(e.target.value)}
                    placeholder="Örn: esneklik, direnç"
                    className="w-full rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-300">Kaynak Dil</label>
                  <select
                    value={newSourceLang}
                    onChange={(e) => setNewSourceLang(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm font-medium bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none"
                  >
                    {languagesList.map((lang) => (
                      <option key={lang.code} value={lang.code}>{lang.label} ({lang.code.toUpperCase()})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-300">Hedef Dil</label>
                  <select
                    value={newTargetLang}
                    onChange={(e) => setNewTargetLang(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm font-medium bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none"
                  >
                    {languagesList.map((lang) => (
                      <option key={lang.code} value={lang.code}>{lang.label} ({lang.code.toUpperCase()})</option>
                    ))}
                  </select>
                </div>
              </div>

              {formError && <p className="text-xs text-rose-400 font-bold bg-rose-950/40 p-2.5 rounded-xl border border-rose-800/40">{formError}</p>}

              <button
                type="submit"
                disabled={formSubmitting}
                className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
              >
                {formSubmitting ? "Kaydediliyor..." : "Deftere Kaydet ✔"}
              </button>
            </form>
          </section>
        )}

        {/* TAB 1: KELİME LİSTEM */}
        {activeTab === "list" && (
          <>
            {/* Filtre ve Arama Barı */}
            <section className="border rounded-2xl p-4 mb-6 backdrop-blur-md bg-slate-900/40 border-slate-800/70 space-y-4">
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">🔍</span>
                  <input
                    type="text"
                    placeholder="Kelime veya çeviri ara..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl pl-10 pr-10 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200">✕</button>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 items-center justify-between">
                  {/* Status Filtreleri */}
                  <div className="flex gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setListFilterStatus("all")}
                      className={`py-1 px-3 rounded-lg text-xs font-bold transition ${
                        listFilterStatus === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Tümü
                    </button>
                    <button
                      onClick={() => setListFilterStatus("learning")}
                      className={`py-1 px-3 rounded-lg text-xs font-bold transition ${
                        listFilterStatus === "learning" ? "bg-amber-950 text-amber-300 border border-amber-800/60" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Öğreniliyor
                    </button>
                    <button
                      onClick={() => setListFilterStatus("memorized")}
                      className={`py-1 px-3 rounded-lg text-xs font-bold transition ${
                        listFilterStatus === "memorized" ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Ezberlendi
                    </button>
                  </div>

                  {/* Dil & Sıralama Kontrolleri */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] sm:max-w-none">
                      <button
                        onClick={() => setFilterLang("all")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                          filterLang === "all" ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-950 border-slate-800 text-slate-300"
                        }`}
                      >
                        Dil: Tümü
                      </button>
                      {uniqueSourceLangs.map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setFilterLang(lang)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold uppercase border ${
                            filterLang === lang ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-950 border-slate-800 text-slate-300"
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortBy)}
                      className="rounded-lg px-2.5 py-1 text-xs font-bold bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none"
                    >
                      <option value="newest">En Yeni</option>
                      <option value="oldest">En Eski</option>
                      <option value="alphabetical-asc">A - Z</option>
                      <option value="alphabetical-desc">Z - A</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            {/* Kelime Listesi Grid */}
            {loading ? (
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-52 border border-slate-800/80 rounded-2xl animate-pulse bg-slate-900/40 p-5" />
                ))}
              </section>
            ) : filteredAndSortedWords.length === 0 ? (
              <section className="text-center py-16 border border-dashed rounded-3xl p-6 border-slate-800 bg-slate-900/20">
                <span className="text-4xl">📭</span>
                <h3 className="text-sm font-bold mt-4 text-slate-300">Henüz Kayıtlı Kelime Yok</h3>
                <p className="text-xs text-slate-300 mt-1">Yukarıdaki "Kelime Ekle" veya "İçe Aktar" butonuyla yeni kelimeler yükleyebilirsiniz.</p>
              </section>
            ) : (
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {filteredAndSortedWords.map((item) => {
                  const isFlipped = flippedIds.has(item.id);
                  const isDeleting = deletingId === item.id;
                  const isAiLoading = aiSentenceLoadingId === item.id;
                  
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleFlip(item.id)}
                      className={`flip-card h-56 cursor-pointer relative select-none transition-all duration-300 ${isFlipped ? "flipped" : ""} ${isDeleting ? "opacity-30 scale-95 pointer-events-none" : ""}`}
                    >
                      <div className="flip-card-inner">
                        {/* KART ÖN YÜZÜ (İNGİLİZCE) */}
                        <div className={`flip-card-front bg-slate-900/80 border p-5 flex flex-col justify-between backdrop-blur-md rounded-2xl shadow-md transition-all hover:border-slate-700 ${
                          item.status === "memorized" ? "border-emerald-800/60" : "border-slate-800"
                        }`}>
                          <div className="flex justify-between items-start">
                            <div className="flex gap-1.5 items-center">
                              <span className="bg-indigo-950 text-indigo-300 border border-indigo-800/60 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                                {item.sourceLang || "EN"}
                              </span>
                              {/* Leitner Level Badge */}
                              <span className="bg-purple-950 text-purple-300 border border-purple-800/60 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                Level {item.level || 1}/5
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              {/* ✨ AI Cümle Butonu Kelimenin İngilizce Yüzünde */}
                              <button
                                onClick={(e) => handleGenerateAISentence(e, item)}
                                disabled={isAiLoading}
                                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg font-bold transition shadow-sm"
                                title="AI Örnek Cümle Üret"
                              >
                                {isAiLoading ? "..." : "✨ AI Cümle"}
                              </button>
                              <button
                                onClick={(e) => handleSpeak(e, item.word, item.sourceLang)}
                                className="text-slate-300 p-1.5 hover:bg-slate-800/60 rounded-lg transition text-xs"
                                title="Telaffuz Et"
                              >
                                🔊
                              </button>
                              <button
                                onClick={(e) => handleToggleStatus(e, item)}
                                className={`p-1.5 rounded-lg border text-xs font-bold ${
                                  item.status === "memorized" ? "bg-amber-950/60 text-amber-300 border-amber-800/60" : "bg-emerald-950/60 text-emerald-300 border-emerald-800/60"
                                }`}
                                title={item.status === "memorized" ? "Öğreniliyor Yap" : "Ezberlendi Yap"}
                              >
                                {item.status === "memorized" ? "🔄" : "✔"}
                              </button>
                              <button
                                onClick={(e) => handleDelete(e, item.id)}
                                disabled={isDeleting}
                                className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg transition text-xs"
                                title="Sil"
                              >
                                🗑
                              </button>
                            </div>
                          </div>

                          <div className="my-1">
                            <h2 className="text-xl font-extrabold tracking-tight line-clamp-1 text-slate-100">{item.word}</h2>
                            {item.exampleSentence ? (
                              <p className="text-xs text-slate-300 italic mt-1.5 line-clamp-2">
                                &quot;{item.exampleSentence}&quot;
                              </p>
                            ) : (
                              <p className="text-xs text-slate-300 italic mt-1 line-clamp-1">Örnek cümle eklenmemiş.</p>
                            )}
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-slate-300 font-bold">
                            <span>{formatDate(item.createdAt)}</span>
                            <span className="text-indigo-400 hover:underline">Çeviriyi Göster ↻</span>
                          </div>
                        </div>

                        {/* KART ARKA YÜZÜ (TÜRKÇE) */}
                        <div className="flip-card-back bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 border border-indigo-800/60 p-5 flex flex-col justify-between rounded-2xl shadow-md">
                          <div className="flex justify-between items-start">
                            <span className="bg-purple-950 text-purple-300 border border-purple-800/60 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                              {item.targetLang || "TR"}
                            </span>

                            <button
                              onClick={(e) => handleSpeak(e, item.translation, item.targetLang)}
                              className="text-slate-300 p-1.5 hover:bg-slate-800/60 rounded-lg transition text-xs"
                              title="Çeviriyi Oku"
                            >
                              🔊
                            </button>
                          </div>

                          <div className="my-1">
                            <h2 className="text-xl font-extrabold text-emerald-400 line-clamp-1">{item.translation}</h2>
                            {item.exampleTranslation && (
                              <p className="text-xs text-emerald-300/90 italic mt-1.5 line-clamp-2">
                                &quot;{item.exampleTranslation}&quot;
                              </p>
                            )}
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-slate-300 font-bold">
                            <span>{formatDate(item.createdAt)}</span>
                            <span className="text-indigo-300 hover:underline">Kapat ↻</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}
          </>
        )}

        {/* TAB 2: ÇOKLU QUIZ MODLARI */}
        {activeTab === "quiz" && (
          <div className="max-w-md mx-auto mt-4 space-y-6">
            {quizWords.length === 0 ? (
              <section className="text-center py-16 bg-slate-900/60 border border-emerald-800/50 rounded-3xl p-8 shadow-xl">
                <span className="text-5xl">🎉</span>
                <h3 className="text-lg font-extrabold text-emerald-400 mt-5">Tebrikler! Test Tamamlandı!</h3>
                <p className="text-xs text-slate-300 mt-2">
                  Tüm kelimelerinizi en az Level 5 (Ezberlendi) seviyesine taşıdınız.
                </p>
                <button
                  onClick={() => setActiveTab("list")}
                  className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  Kelime Listesine Dön
                </button>
              </section>
            ) : (
              <div className="space-y-5">
                {/* Quiz Sub-Mode Seçici */}
                <div className="flex p-1 bg-slate-950 rounded-xl gap-1 border border-slate-800 shadow-inner">
                  <button
                    onClick={() => { setQuizSubMode("flashcard"); resetQuizState(); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                      quizSubMode === "flashcard" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    🎴 Kart
                  </button>
                  <button
                    onClick={() => { setQuizSubMode("choice"); resetQuizState(); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                      quizSubMode === "choice" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    🎯 4 Şık
                  </button>
                  <button
                    onClick={() => { setQuizSubMode("type"); resetQuizState(); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                      quizSubMode === "type" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    ✍️ Yazma
                  </button>
                </div>

                {/* İlerleme Bilgileri */}
                <div className="flex justify-between items-center text-xs text-slate-300 font-bold px-1">
                  <span>Leitner Havuzu: <strong className="text-indigo-400">{quizWords.length} Kelime</strong></span>
                  <span>Soru #{quizIndex + 1} (Lvl {currentQuizWord?.level || 1})</span>
                </div>

                {/* MOD 1: FLASHCARD */}
                {quizSubMode === "flashcard" && currentQuizWord && (
                  <div className="space-y-5">
                    <div
                      onClick={() => setQuizRevealed(!quizRevealed)}
                      className={`flip-card h-64 w-full cursor-pointer relative select-none transition-all duration-300 ${quizRevealed ? "flipped" : ""}`}
                    >
                      <div className="flip-card-inner">
                        <div className="flip-card-front bg-slate-900/90 border border-slate-800 p-6 flex flex-col justify-between rounded-3xl shadow-xl text-slate-100">
                          <div className="flex justify-between items-start">
                            <span className="bg-indigo-950 text-indigo-300 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-indigo-800/60">
                              {currentQuizWord.sourceLang || "EN"}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">FLASCKARD</span>
                          </div>
                          <div className="text-center py-6">
                            <h2 className="text-2xl font-extrabold text-slate-100">{currentQuizWord.word}</h2>
                          </div>
                          <div className="text-center">
                            <span className="text-xs bg-slate-950/80 py-2 px-4 rounded-full border border-slate-800 font-bold text-slate-300">
                              Anlamını Göster 👁
                            </span>
                          </div>
                        </div>

                        <div className="flip-card-back bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 border border-indigo-800/80 p-6 flex flex-col justify-between rounded-3xl shadow-xl">
                          <div className="flex justify-between items-start">
                            <span className="bg-purple-950 text-purple-300 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-purple-800/60">
                              {currentQuizWord.targetLang || "TR"}
                            </span>
                            <button onClick={(e) => handleSpeak(e, currentQuizWord.word, currentQuizWord.sourceLang)} className="p-1.5 text-slate-300">🔊</button>
                          </div>
                          <div className="text-center py-6">
                            <h2 className="text-2xl font-extrabold text-emerald-400">
                              {quizRevealed ? currentQuizWord.translation : ""}
                            </h2>
                          </div>
                          <div className="text-center text-[10px] text-indigo-300 font-bold">Kapat ↻</div>
                        </div>
                      </div>
                    </div>

                    {quizRevealed && (
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => handleQuizAnswerWrong(currentQuizWord.id)}
                          className="bg-rose-950/80 hover:bg-rose-900 border border-rose-800/60 text-rose-200 font-bold py-3 rounded-2xl text-xs shadow-lg transition active:scale-95"
                        >
                          Bilmiyorum ❌ (Lvl 1)
                        </button>
                        <button
                          onClick={() => handleQuizAnswerCorrect(currentQuizWord.id)}
                          className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-200 font-bold py-3 rounded-2xl text-xs shadow-lg transition active:scale-95"
                        >
                          Biliyorum ✔ (+1 Level)
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* MOD 2: ÇOKTAN SEÇMELİ TEST (4 ŞIK) */}
                {quizSubMode === "choice" && currentQuizWord && (
                  <div className="space-y-4 border rounded-3xl p-6 bg-slate-900/90 border-slate-800 shadow-xl">
                    <div className="text-center">
                      <span className="text-[11px] font-extrabold text-indigo-400 uppercase tracking-wider">Çoktan Seçmeli Soru</span>
                      <h2 className="text-2xl font-extrabold mt-1.5 text-slate-100">{currentQuizWord.word}</h2>
                      <p className="text-xs text-slate-300 mt-1 font-medium">Doğru Türkçe karşılığını seçin:</p>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 mt-4">
                      {choiceOptions.map((choice, idx) => {
                        const isSelected = choiceSelected === choice;
                        const isCorrect = choice === currentQuizWord.translation;

                        let btnStyle = "bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700";
                        if (choiceFeedback) {
                          if (isCorrect) {
                            btnStyle = "bg-emerald-600 border-emerald-500 text-white font-extrabold shadow-md";
                          } else if (isSelected && !isCorrect) {
                            btnStyle = "bg-rose-600 border-rose-500 text-white font-extrabold shadow-md";
                          }
                        }

                        return (
                          <button
                            key={idx}
                            disabled={!!choiceFeedback}
                            onClick={() => {
                              setChoiceSelected(choice);
                              const correct = choice === currentQuizWord.translation;
                              setChoiceFeedback({ isCorrect: correct, selected: choice });
                            }}
                            className={`p-3.5 rounded-xl border text-xs text-left transition font-bold ${btnStyle}`}
                          >
                            {idx + 1}. {choice}
                          </button>
                        );
                      })}
                    </div>

                    {choiceFeedback && (
                      <div className="mt-4 text-center space-y-3 pt-2">
                        <p className={`text-xs font-extrabold ${choiceFeedback.isCorrect ? "text-emerald-400" : "text-rose-400"}`}>
                          {choiceFeedback.isCorrect ? "🎉 Tebrikler! Doğru Cevap!" : `❌ Yanlış! Doğru cevap: ${currentQuizWord.translation}`}
                        </p>
                        <button
                          onClick={() => {
                            if (choiceFeedback.isCorrect) handleQuizAnswerCorrect(currentQuizWord.id);
                            else handleQuizAnswerWrong(currentQuizWord.id);
                          }}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg transition"
                        >
                          Sonraki Kelime ➔
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* MOD 3: YAZMA / SPELLING TESTİ */}
                {quizSubMode === "type" && currentQuizWord && (
                  <div className="space-y-4 border rounded-3xl p-6 bg-slate-900/90 border-slate-800 shadow-xl">
                    <div className="text-center">
                      <span className="text-[11px] font-extrabold text-purple-400 uppercase tracking-wider">Yazma Testi</span>
                      <h2 className="text-2xl font-extrabold text-emerald-400 mt-1.5">{currentQuizWord.translation}</h2>
                      <p className="text-xs text-slate-300 mt-1 font-medium">Bu çevirinin orijinal kelimesini yazın:</p>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!typingAnswer.trim()) return;
                        const isCorrect = typingAnswer.trim().toLowerCase() === currentQuizWord.word.trim().toLowerCase();
                        setTypingFeedback({ isCorrect, correctText: currentQuizWord.word });
                      }}
                      className="space-y-3"
                    >
                      <input
                        type="text"
                        value={typingAnswer}
                        disabled={!!typingFeedback}
                        onChange={(e) => setTypingAnswer(e.target.value)}
                        placeholder="Cevabınızı buraya yazın..."
                        className="w-full rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 bg-slate-950 border border-slate-800 text-white placeholder-slate-500"
                      />

                      {!typingFeedback && (
                        <button
                          type="submit"
                          className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-lg transition"
                        >
                          Kontrol Et ✔
                        </button>
                      )}
                    </form>

                    {typingFeedback && (
                      <div className="mt-4 text-center space-y-3 pt-2">
                        <p className={`text-xs font-extrabold ${typingFeedback.isCorrect ? "text-emerald-400" : "text-rose-400"}`}>
                          {typingFeedback.isCorrect ? "🎉 Harika! Mükemmel Yazım!" : `❌ Doğru Yazım: ${typingFeedback.correctText}`}
                        </p>
                        <button
                          onClick={() => {
                            if (typingFeedback.isCorrect) handleQuizAnswerCorrect(currentQuizWord.id);
                            else handleQuizAnswerWrong(currentQuizWord.id);
                          }}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg transition"
                        >
                          Sonraki Kelime ➔
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: GEMINI API KEY MODALI */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl p-6 border shadow-2xl bg-slate-950 border-slate-800 text-white space-y-4">
            <h3 className="text-base font-extrabold text-slate-100">✨ Gemini AI API Key Ayarı</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Google AI Studio üzerinden alacağınız API anahtarını buraya ekleyebilirsiniz. Key eklemezseniz dahili akıllı şablonlar çalışacaktır.
            </p>

            <input
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full p-3 rounded-xl border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 bg-slate-900 border-slate-800 text-slate-100"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white"
              >
                Vazgeç
              </button>
              <button
                onClick={() => handleSaveApiKey(geminiApiKey)}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg transition"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: AI OKUMA METNİ MODALI */}
      {aiStoryOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-3xl p-6 border shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto bg-slate-950 border-slate-800 text-white">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold flex items-center gap-2 text-slate-100">✨ AI Özel Okuma Metni Generator</h3>
              <button onClick={() => setAiStoryOpen(false)} className="text-slate-400 hover:text-white font-bold text-sm">✕</button>
            </div>

            {aiStoryLoading ? (
              <div className="py-12 text-center text-slate-300 text-xs font-bold animate-pulse">
                Yapay Zeka kelimelerinizle akıcı okuma metni oluşturuyor...
              </div>
            ) : aiStoryData ? (
              <div className="space-y-4">
                <div className="p-4 bg-indigo-950/60 border border-indigo-800/50 rounded-2xl">
                  <h4 className="text-[11px] font-extrabold text-indigo-400 uppercase tracking-wider mb-1.5">İngilizce Okuma Metni</h4>
                  <p className="text-xs leading-relaxed text-indigo-100 font-medium">{aiStoryData.storyEn}</p>
                </div>

                <div className="p-4 bg-purple-950/60 border border-purple-800/50 rounded-2xl">
                  <h4 className="text-[11px] font-extrabold text-purple-400 uppercase tracking-wider mb-1.5">Türkçe Çevirisi</h4>
                  <p className="text-xs leading-relaxed text-purple-100 font-medium">{aiStoryData.storyTr}</p>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setAiStoryOpen(false)}
                className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg hover:bg-indigo-500"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: İÇE AKTAR (IMPORT) MODALI */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl p-6 border shadow-2xl space-y-4 bg-slate-950 border-slate-800 text-white">
            <h3 className="text-base font-extrabold text-slate-100">📥 Toplu Kelime Yükle (CSV / JSON)</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bilgisayarınızdan Anki, Quizlet veya Excel uyumlu CSV / JSON dosyası seçerek kelimeleri toplu ekleyebilirsiniz.
            </p>

            <input
              type="file"
              accept=".csv, .json"
              onChange={handleFileUpload}
              disabled={importing}
              className="block w-full text-xs text-slate-300 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
            />

            {importStatus && (
              <p className="text-xs font-bold text-indigo-400 mt-2 bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-800/40">{importStatus}</p>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => { setIsImportModalOpen(false); setImportStatus(""); }}
                className="px-5 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEÇİLEN METİN HIZLI EKLEME TOOLTIP'I */}
      {selectedWordTooltip && (
        <div
          style={{
            position: "fixed",
            left: `${selectedWordTooltip.x}px`,
            top: `${selectedWordTooltip.y}px`,
            transform: "translateX(-50%)",
            zIndex: 9999,
          }}
          className="animate-in fade-in zoom-in-95 duration-150"
        >
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              handleAddSelectedWord();
            }}
            disabled={addingSelectedWord}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-extrabold text-xs px-4 py-2 rounded-full shadow-2xl border border-emerald-400/40 active:scale-95 transition-all cursor-pointer"
          >
            {addingSelectedWord ? "Ekleniyor..." : `➕ Deftere Ekle: "${selectedWordTooltip.word}"`}
          </button>
        </div>
      )}

      {/* HIZLI EKLEME BAŞARI TOAST MESAJI */}
      {quickAddSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 border border-emerald-800/80 text-emerald-200 font-bold text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <span>{quickAddSuccessMsg}</span>
        </div>
      )}
    </div>
  );
}
