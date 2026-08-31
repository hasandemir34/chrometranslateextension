"use client";

import { useEffect, useState, useMemo } from "react";
import {
  getSavedWords,
  deleteSavedWord,
  addSavedWord,
  updateWordStatus,
  updateWordLeitnerLevel,
  updateWordExample,
  updateWordSM2,
  updateWordTags,
  updateWordYDSEnrichment,
  checkWordExists,
  bulkAddSavedWords,
  SavedWord,
  WordTag,
  YDSWordEnrichment,
} from "@/firebase";
import { exportToCSV, exportToJSON, parseCSVText, parseJSONText } from "@/lib/exportImport";
import {
  generateExampleSentence,
  generateAIStory,
  enrichWordForYDS,
  generateYDSMiniExam,
  generateYDSReadingPassageSet,
  generateYDSRestatementQuestions,
  analyzeSentenceForYDS,
  type YDSExam,
  type YDSQuestion,
  type YDSReadingPassageSet,
  type YDSRestatementQuestion,
  type YDSSentenceAnalysis,
} from "@/lib/ai";
import { buildPresetSavedWords, YDS_PRESET_WORDS } from "@/lib/ydsPresets";

type SortBy = "newest" | "oldest" | "alphabetical-asc" | "alphabetical-desc";
type QuizSubMode = "flashcard" | "choice" | "type" | "restatement";
type SM2Quality = 0 | 1 | 3 | 5;

const ALL_TAGS: WordTag[] = [
  "Academic Adjective",
  "Phrasal Verb",
  "Prepositional Phrase",
  "Conjunction",
  "High Priority YDS",
  "Noun",
  "Verb",
  "Adverb",
];

const TAG_COLORS: Record<WordTag, string> = {
  "Academic Adjective": "bg-sky-50 text-sky-700 border-sky-200",
  "Phrasal Verb": "bg-purple-50 text-purple-700 border-purple-200",
  "Prepositional Phrase": "bg-teal-50 text-teal-700 border-teal-200",
  "Conjunction": "bg-amber-50 text-amber-700 border-amber-200",
  "High Priority YDS": "bg-rose-50 text-rose-700 border-rose-200",
  "Noun": "bg-slate-100 text-slate-700 border-slate-200",
  "Verb": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Adverb": "bg-indigo-50 text-indigo-700 border-indigo-200",
};

export default function Home() {
  const [words, setWords] = useState<SavedWord[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [filterLang, setFilterLang] = useState<string>("all");
  const [listFilterStatus, setListFilterStatus] = useState<"all" | "learning" | "memorized">("all");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());

  // Tab State
  const [activeTab, setActiveTab] = useState<"list" | "quiz" | "yds" | "grammar" | "tags">("list");

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

  // Restatement Quiz State
  const [restatementQuestions, setRestatementQuestions] = useState<YDSRestatementQuestion[]>([]);
  const [restatementLoading, setRestatementLoading] = useState(false);
  const [restatementIndex, setRestatementIndex] = useState(0);
  const [restatementSelected, setRestatementSelected] = useState<string | null>(null);
  const [restatementFeedback, setRestatementFeedback] = useState<{ isCorrect: boolean; selected: string } | null>(null);

  // AI State'leri
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [aiSentenceLoadingId, setAiSentenceLoadingId] = useState<string | null>(null);
  const [aiStoryOpen, setAiStoryOpen] = useState(false);
  const [aiStoryLoading, setAiStoryLoading] = useState(false);
  const [aiStoryData, setAiStoryData] = useState<{ storyEn: string; storyTr: string } | null>(null);

  // Hazır YDS Paketi State
  const [presetLoading, setPresetLoading] = useState(false);
  const [presetMsg, setPresetMsg] = useState("");

  // YDS Zenginleştirme State
  const [enrichLoadingId, setEnrichLoadingId] = useState<string | null>(null);
  const [enrichedWordId, setEnrichedWordId] = useState<string | null>(null);

  // YDS Sınav & Paragraf Seti State
  const [ydsExam, setYdsExam] = useState<YDSExam | null>(null);
  const [ydsExamLoading, setYdsExamLoading] = useState(false);
  const [ydsAnswers, setYdsAnswers] = useState<Record<string, string>>({});
  const [ydsSubmitted, setYdsSubmitted] = useState(false);

  const [passageSet, setPassageSet] = useState<YDSReadingPassageSet | null>(null);
  const [passageLoading, setPassageLoading] = useState(false);
  const [passageAnswers, setPassageAnswers] = useState<Record<string, string>>({});
  const [passageSubmitted, setPassageSubmitted] = useState(false);
  const [showPassageTr, setShowPassageTr] = useState(false);

  // Görsel Gramer & Cümle Parçalayıcı State
  const [sentenceInput, setSentenceInput] = useState("");
  const [sentenceAnalysis, setSentenceAnalysis] = useState<YDSSentenceAnalysis | null>(null);
  const [sentenceLoading, setSentenceLoading] = useState(false);

  // Etiket State
  const [activeTagFilter, setActiveTagFilter] = useState<WordTag | "all">("all");
  const [editTagsId, setEditTagsId] = useState<string | null>(null);

  // İçe Aktarma State'leri
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [importing, setImporting] = useState(false);

  // Form State
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

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
    const savedKey = localStorage.getItem("gemini_key") || "";
    setGeminiApiKey(savedKey);
  }, []);

  // Kelimeleri Firestore'dan Çekme
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await getSavedWords();
      setWords(data);
      setLoading(false);
    }
    loadData();
  }, []);

  // Quiz Sıfırlama
  useEffect(() => {
    setQuizRevealed(false);
    setChoiceSelected(null);
    setChoiceFeedback(null);
    setTypingAnswer("");
    setTypingFeedback(null);
    setRestatementSelected(null);
    setRestatementFeedback(null);
  }, [quizIndex, quizSubMode]);

  // Hazır YDS Paketi Yükleme
  const handleLoadPresetWords = async () => {
    setPresetLoading(true);
    setPresetMsg("YDS Akademik Kelimeleri & Kalıpları Yükleniyor...");
    const presets = buildPresetSavedWords();
    const count = await bulkAddSavedWords(presets);
    setPresetMsg(`✔ ${count} adet yüksek öncelikli YDS kelimesi ve edat kalıbı defterinize eklendi!`);
    const updated = await getSavedWords();
    setWords(updated);
    setPresetLoading(false);
  };

  // YDS 4'lü Paragraf Sınavı Üretme
  const handleGeneratePassageSet = async () => {
    setPassageLoading(true);
    setPassageSubmitted(false);
    setPassageAnswers({});
    const sample = words.length > 0 ? words.slice(0, 6) : YDS_PRESET_WORDS.slice(0, 6);
    const result = await generateYDSReadingPassageSet(sample, geminiApiKey);
    setPassageSet(result);
    setPassageLoading(false);
  };

  // Restatement Soruları Üretme
  const handleGenerateRestatement = async () => {
    setRestatementLoading(true);
    setRestatementIndex(0);
    setRestatementSelected(null);
    setRestatementFeedback(null);
    const questions = await generateYDSRestatementQuestions(words, geminiApiKey);
    setRestatementQuestions(questions);
    setRestatementLoading(false);
  };

  // Cümle Parçalama Analizi
  const handleAnalyzeSentenceSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sentenceInput.trim()) return;
    setSentenceLoading(true);
    const result = await analyzeSentenceForYDS(sentenceInput, geminiApiKey);
    setSentenceAnalysis(result);
    setSentenceLoading(false);
  };

  // Kelime Silme
  const handleDeleteWord = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Bu kelimeyi silmek istediğinize emin misiniz?")) return;
    setDeletingId(id);
    const ok = await deleteSavedWord(id);
    if (ok) {
      setWords((prev) => prev.filter((w) => w.id !== id));
    } else {
      alert("Kelime silinirken hata oluştu.");
    }
    setDeletingId(null);
  };

  // Leitner / SM-2 Doğru Yanıt
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
            ? { ...w, level: nextLevel, status: nextLevel === 5 ? "memorized" : "learning", nextReviewDate: nextReview.toISOString() }
            : w
        )
      );
      if (quizIndex < quizWords.length - 1) setQuizIndex((prev) => prev + 1);
      else setQuizIndex(0);
    }
  };

  // Leitner / SM-2 Yanlış Yanıt
  const handleQuizAnswerWrong = async (wordId: string) => {
    setQuizRevealed(false);
    const item = words.find((w) => w.id === wordId);
    if (!item) return;

    const nextLevel = 1;
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + 1);

    const success = await updateWordLeitnerLevel(wordId, nextLevel, nextReview.toISOString());
    if (success) {
      setWords((prev) =>
        prev.map((w) =>
          w.id === wordId
            ? { ...w, level: nextLevel, status: "learning", nextReviewDate: nextReview.toISOString() }
            : w
        )
      );
      if (quizIndex < quizWords.length - 1) setQuizIndex((prev) => prev + 1);
      else setQuizIndex(0);
    }
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

  // AI Okuma Metni Modal
  const handleGenerateStoryModal = async () => {
    setAiStoryOpen(true);
    setAiStoryLoading(true);
    const sampleWords = words.length > 0 ? words.slice(0, 5) : YDS_PRESET_WORDS.slice(0, 5);
    const result = await generateAIStory(sampleWords, geminiApiKey);
    setAiStoryData(result);
    setAiStoryLoading(false);
  };

  // YDS Zenginleştirme
  const handleEnrichWord = async (e: React.MouseEvent, item: SavedWord) => {
    e.stopPropagation();
    setEnrichLoadingId(item.id);
    const data = await enrichWordForYDS(item.word, item.translation, geminiApiKey);
    const ok = await updateWordYDSEnrichment(item.id, data);
    if (ok) {
      setWords((prev) =>
        prev.map((w) => (w.id === item.id ? { ...w, ...data } : w))
      );
      setEnrichedWordId(item.id);
    }
    setEnrichLoadingId(null);
  };

  // Manüel Ekleme
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

  // Quiz Kelimeleri
  const quizWords = useMemo(() => {
    return words.filter((w) => (w.level ? w.level < 5 : w.status === "learning"));
  }, [words]);

  const currentQuizWord = quizWords[quizIndex] || quizWords[0];

  const choiceOptions = useMemo(() => {
    if (!currentQuizWord) return [];
    const correct = currentQuizWord.translation;
    const others = words
      .filter((w) => w.id !== currentQuizWord.id && w.translation !== correct)
      .map((w) => w.translation);

    const shuffledOthers = [...others].sort(() => 0.5 - Math.random()).slice(0, 3);
    return [correct, ...shuffledOthers].sort(() => 0.5 - Math.random());
  }, [currentQuizWord, words]);

  // Filtrelenmiş ve Sıralanmış Kelimeler
  const filteredWords = useMemo(() => {
    return words
      .filter((w) => {
        const matchesSearch =
          w.word.toLowerCase().includes(search.toLowerCase()) ||
          w.translation.toLowerCase().includes(search.toLowerCase());
        const matchesLang = filterLang === "all" || w.sourceLang === filterLang;
        const matchesStatus = listFilterStatus === "all" || w.status === listFilterStatus;
        const matchesTag = activeTagFilter === "all" || w.tags?.includes(activeTagFilter);
        return matchesSearch && matchesLang && matchesStatus && matchesTag;
      })
      .sort((a, b) => {
        if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sortBy === "alphabetical-asc") return a.word.localeCompare(b.word);
        if (sortBy === "alphabetical-desc") return b.word.localeCompare(a.word);
        return 0;
      });
  }, [words, search, filterLang, listFilterStatus, activeTagFilter, sortBy]);

  // İstatistikler
  const totalCount = words.length;
  const memorizedCount = words.filter((w) => w.status === "memorized").length;
  const learningCount = words.filter((w) => w.status === "learning").length;
  const memorizedPercent = totalCount > 0 ? Math.round((memorizedCount / totalCount) * 100) : 0;

  // YDS Kelime Yetkinlik Metriği
  const ydsReadinessLevel = memorizedPercent > 80 ? "C1/C2 (YDS 85+)" : memorizedPercent > 50 ? "B2/C1 (YDS 70+)" : "B1/B2 (YDS 50+)";

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans pb-24 md:pb-8">
      {/* HEADER / ÜST BAR */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-blue-500/20">
              YDS
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                YDS Sınav & Kelime Asistanı
                <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
                  PWA Mobile
                </span>
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">
                Leitner & SM-2 Hafıza Sistemi | Yapay Zeka Sınav Koçu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadPresetWords}
              disabled={presetLoading}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition shadow-md flex items-center gap-1.5 active:scale-95"
            >
              <span>⚡ Hazır YDS Paket</span>
            </button>

            <button
              onClick={() => setShowApiKeyModal(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs px-3 py-2 rounded-xl border border-slate-700 transition flex items-center gap-1"
            >
              <span>🔑 API Key</span>
            </button>
          </div>
        </div>
      </header>

      {/* ANA İÇERİK KONTEYNERİ */}
      <main className="max-w-7xl mx-auto px-4 pt-6 flex-1 w-full space-y-6">
        {/* İSTATİSTİK BAR / YDS SKOR METRİĞİ */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400">Toplam Kelime</span>
            <span className="text-2xl font-extrabold text-white mt-1">{totalCount}</span>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-amber-400">Öğreniliyor</span>
            <span className="text-2xl font-extrabold text-amber-400 mt-1">{learningCount}</span>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-emerald-400">Ezberlendi</span>
            <span className="text-2xl font-extrabold text-emerald-400 mt-1">{memorizedCount}</span>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-blue-400">Tahmini YDS Skoru</span>
            <span className="text-sm font-extrabold text-blue-400 mt-1">{ydsReadinessLevel}</span>
          </div>
        </section>

        {presetMsg && (
          <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 p-3 rounded-2xl text-xs font-semibold flex items-center justify-between">
            <span>{presetMsg}</span>
            <button onClick={() => setPresetMsg("")} className="text-emerald-400 font-bold px-2">×</button>
          </div>
        )}

        {/* TAB GEZİNTİ BAR (MASAÜSTÜ) */}
        <div className="hidden md:flex items-center justify-between border-b border-slate-800">
          <div className="flex gap-2">
            {[
              { id: "list", label: "Kelime Defterim", count: totalCount, icon: "📚" },
              { id: "quiz", label: "Pratik & Quiz", count: quizWords.length, icon: "⚡" },
              { id: "yds", label: "YDS Sınav & Paragraf", icon: "📝" },
              { id: "grammar", label: "Gramer & Cümle Analiz", icon: "🔬" },
              { id: "tags", label: "Etiketler", icon: "🏷️" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 text-sm font-bold border-b-2 px-4 flex items-center gap-2 transition ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition flex items-center gap-1"
            >
              <span>+ Yeni Kelime</span>
            </button>

            <button
              onClick={handleGenerateStoryModal}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition flex items-center gap-1"
            >
              <span>✨ AI Paragraf</span>
            </button>
          </div>
        </div>

        {/* FORM: MANÜEL KELİME EKLEME */}
        {isFormOpen && (
          <section className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">Deftere Yeni Kelime / Kalıp Ekle</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white font-bold text-lg">×</button>
            </div>

            <form onSubmit={handleAddWordSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-300">İngilizce Kelime / Kalıp</label>
                  <input
                    type="text"
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    placeholder="Örn: relinquish"
                    className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-300">Türkçe Anlamı</label>
                  <input
                    type="text"
                    value={newTranslation}
                    onChange={(e) => setNewTranslation(e.target.value)}
                    placeholder="Örn: feragat etmek, bırakmak"
                    className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {formError && <p className="text-xs text-rose-400 font-semibold">{formError}</p>}

              <button
                type="submit"
                disabled={formSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 rounded-xl transition"
              >
                {formSubmitting ? "Kaydediliyor..." : "Deftere Ekle"}
              </button>
            </form>
          </section>
        )}

        {/* TAB 1: KELİME LİSTESİ */}
        {activeTab === "list" && (
          <div className="space-y-4">
            {/* ARAMA VE FİLTRE BAR */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Kelime veya Türkçe anlam ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />

                <div className="flex gap-2">
                  <select
                    value={listFilterStatus}
                    onChange={(e) => setListFilterStatus(e.target.value as any)}
                    className="rounded-xl px-3 py-2 text-xs font-bold bg-slate-900 border border-slate-700 text-slate-300 focus:outline-none"
                  >
                    <option value="all">Tüm Durumlar</option>
                    <option value="learning">Öğreniliyor</option>
                    <option value="memorized">Ezberlendi</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="rounded-xl px-3 py-2 text-xs font-bold bg-slate-900 border border-slate-700 text-slate-300 focus:outline-none"
                  >
                    <option value="newest">En Yeni</option>
                    <option value="oldest">En Eski</option>
                    <option value="alphabetical-asc">A-Z</option>
                    <option value="alphabetical-desc">Z-A</option>
                  </select>
                </div>
              </div>
            </div>

            {/* KELİME KARTLARI IZGARASI */}
            {loading ? (
              <div className="text-center py-12 text-slate-400 font-semibold text-sm">Yükleniyor...</div>
            ) : filteredWords.length === 0 ? (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-12 text-center space-y-3">
                <p className="text-slate-400 font-bold text-sm">Henüz kaydedilmiş kelime yok veya filtreye uymuyor.</p>
                <button
                  onClick={handleLoadPresetWords}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition"
                >
                  ⚡ Hazır YDS Kelimelerini Yükle
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWords.map((item) => {
                  const isMemorized = item.status === "memorized";
                  const level = item.level || 1;

                  return (
                    <div
                      key={item.id}
                      className="bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-5 space-y-3 flex flex-col justify-between transition group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition">
                            {item.word}
                          </h3>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                              isMemorized
                                ? "bg-emerald-950 text-emerald-400 border-emerald-500/30"
                                : "bg-amber-950 text-amber-400 border-amber-500/30"
                            }`}
                          >
                            Seviye {level}
                          </span>
                        </div>

                        <p className="text-sm font-semibold text-slate-300 mt-1">{item.translation}</p>

                        {/* Etiketler */}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.tags.map((t) => (
                              <span key={t} className="text-[10px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded-md font-semibold border border-slate-700">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Örnek Cümle */}
                        {item.exampleSentence && (
                          <div className="mt-3 bg-slate-900/80 border border-slate-700/60 rounded-xl p-3 text-xs space-y-1">
                            <p className="text-slate-200 font-medium italic">"{item.exampleSentence}"</p>
                            {item.exampleTranslation && (
                              <p className="text-slate-400 font-normal">{item.exampleTranslation}</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Kart Alt Butonları */}
                      <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => handleGenerateAISentence(e, item)}
                            disabled={aiSentenceLoadingId === item.id}
                            className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                          >
                            {aiSentenceLoadingId === item.id ? "..." : "✨ Örnek"}
                          </button>
                          <span className="text-slate-600">•</span>
                          <button
                            onClick={(e) => handleEnrichWord(e, item)}
                            disabled={enrichLoadingId === item.id}
                            className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                          >
                            {enrichLoadingId === item.id ? "..." : "🔬 YDS Analiz"}
                          </button>
                        </div>

                        <button
                          onClick={(e) => handleDeleteWord(e, item.id)}
                          className="text-rose-400 hover:text-rose-300 font-semibold"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PRATİK & QUIZ */}
        {activeTab === "quiz" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex justify-center gap-2 p-1.5 bg-slate-800 rounded-2xl border border-slate-700">
              {[
                { id: "flashcard", label: "Kartlar" },
                { id: "choice", label: "Test (A-D)" },
                { id: "type", label: "Yazma" },
                { id: "restatement", label: "Restatement" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setQuizSubMode(m.id as any)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                    quizSubMode === m.id
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Flashcard Modu */}
            {quizSubMode === "flashcard" && currentQuizWord && (
              <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 text-center space-y-6 shadow-xl">
                <div className="space-y-2">
                  <span className="text-xs font-extrabold text-blue-400 uppercase tracking-wider">
                    Kelime {quizIndex + 1} / {quizWords.length}
                  </span>
                  <h2 className="text-3xl font-extrabold text-white">{currentQuizWord.word}</h2>
                </div>

                {quizRevealed ? (
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-3 animate-fade-in">
                    <p className="text-xl font-bold text-emerald-400">{currentQuizWord.translation}</p>
                    {currentQuizWord.exampleSentence && (
                      <p className="text-xs text-slate-300 italic">"{currentQuizWord.exampleSentence}"</p>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setQuizRevealed(true)}
                    className="w-full bg-slate-900 hover:bg-slate-700 text-slate-300 font-bold py-4 rounded-2xl border border-slate-700 transition"
                  >
                    Anlamı Göster 👁️
                  </button>
                )}

                {quizRevealed && (
                  <div className="flex gap-4 pt-2">
                    <button
                      onClick={() => handleQuizAnswerWrong(currentQuizWord.id)}
                      className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3.5 rounded-2xl transition"
                    >
                      ❌ Yanlış
                    </button>
                    <button
                      onClick={() => handleQuizAnswerCorrect(currentQuizWord.id)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-2xl transition"
                    >
                      ✔ Doğru
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Choice Modu */}
            {quizSubMode === "choice" && currentQuizWord && (
              <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 space-y-6 shadow-xl">
                <div className="text-center space-y-2">
                  <span className="text-xs font-extrabold text-purple-400 uppercase tracking-wider">
                    Kelime {quizIndex + 1} / {quizWords.length}
                  </span>
                  <h2 className="text-2xl font-extrabold text-white">"{currentQuizWord.word}" karşılığı nedir?</h2>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {choiceOptions.map((opt) => {
                    const isSelected = choiceSelected === opt;
                    const isCorrect = opt === currentQuizWord.translation;
                    let btnStyle = "bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500";

                    if (choiceFeedback) {
                      if (isCorrect) btnStyle = "bg-emerald-950 border-emerald-500 text-emerald-300 font-bold";
                      else if (isSelected && !isCorrect) btnStyle = "bg-rose-950 border-rose-500 text-rose-300 font-bold";
                    }

                    return (
                      <button
                        key={opt}
                        disabled={!!choiceFeedback}
                        onClick={() => {
                          setChoiceSelected(opt);
                          const correct = opt === currentQuizWord.translation;
                          setChoiceFeedback({ isCorrect: correct, selected: opt });
                        }}
                        className={`w-full p-4 rounded-2xl border text-left font-semibold text-sm transition ${btnStyle}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {choiceFeedback && (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => {
                        if (choiceFeedback.isCorrect) handleQuizAnswerCorrect(currentQuizWord.id);
                        else handleQuizAnswerWrong(currentQuizWord.id);
                      }}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-2xl transition"
                    >
                      Sonraki Kelime ➔
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Restatement Modu */}
            {quizSubMode === "restatement" && (
              <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 space-y-6 shadow-xl">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-white">YDS Restatement (Yakın Anlam)</h3>
                  <button
                    onClick={handleGenerateRestatement}
                    disabled={restatementLoading}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-3 py-2 rounded-xl"
                  >
                    {restatementLoading ? "Yükleniyor..." : "✨ Soru Üret"}
                  </button>
                </div>

                {restatementQuestions.length > 0 && restatementQuestions[restatementIndex] ? (
                  <div className="space-y-4">
                    <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl text-sm font-semibold text-white italic">
                      "{restatementQuestions[restatementIndex].originalSentence}"
                    </div>

                    <div className="space-y-2">
                      {restatementQuestions[restatementIndex].options.map((opt) => (
                        <button
                          key={opt}
                          disabled={!!restatementFeedback}
                          onClick={() => {
                            setRestatementSelected(opt);
                            const isCorrect = opt.startsWith(restatementQuestions[restatementIndex].answer[0]);
                            setRestatementFeedback({ isCorrect, selected: opt });
                          }}
                          className={`w-full text-left p-3.5 rounded-xl border text-xs font-medium transition ${
                            restatementSelected === opt
                              ? restatementFeedback?.isCorrect
                                ? "bg-emerald-950 border-emerald-500 text-emerald-300"
                                : "bg-rose-950 border-rose-500 text-rose-300"
                              : "bg-slate-900 border-slate-700 text-slate-200"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>

                    {restatementFeedback && (
                      <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl text-xs space-y-2">
                        <p className="font-bold text-amber-400">Çözüm / Açıklama:</p>
                        <p className="text-slate-300">{restatementQuestions[restatementIndex].explanation}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">
                    Yakın anlamlı cümle pratiği için 'Soru Üret' butonuna tıklayın.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: YDS SINAV & PARAGRAF */}
        {activeTab === "yds" && (
          <div className="space-y-6">
            <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">YDS 4 Sorulu Paragraf Seti Sınavı</h2>
                  <p className="text-xs text-slate-400">
                    Akademik C1 okuma metni ve altındaki 4 klasik ÖSYM YDS soru tipi (Main Idea, Detail, Inference, Vocabulary)
                  </p>
                </div>

                <button
                  onClick={handleGeneratePassageSet}
                  disabled={passageLoading}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"
                >
                  {passageLoading ? "YDS Metni Üretiliyor..." : "⚡ YDS Paragraf Sınavı Oluştur"}
                </button>
              </div>

              {passageSet && (
                <div className="space-y-6 pt-4 border-t border-slate-700">
                  {/* PARAGRAF METNİ */}
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-amber-400">{passageSet.title}</h3>
                      <button
                        onClick={() => setShowPassageTr(!showPassageTr)}
                        className="text-xs font-semibold text-blue-400 hover:underline"
                      >
                        {showPassageTr ? "Türkçe Gizle" : "Türkçe Göster"}
                      </button>
                    </div>

                    <p className="text-sm text-slate-200 leading-relaxed font-medium">{passageSet.passageEn}</p>

                    {showPassageTr && (
                      <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-800 pt-3 italic">
                        {passageSet.passageTr}
                      </p>
                    )}
                  </div>

                  {/* SORULAR */}
                  <div className="space-y-6">
                    {passageSet.questions.map((q, idx) => (
                      <div key={q.id} className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-md">
                            Soru {idx + 1} • {q.type.toUpperCase()}
                          </span>
                        </div>

                        <p className="text-sm font-bold text-white">{q.question}</p>

                        <div className="space-y-2 pt-1">
                          {q.options.map((opt) => {
                            const isSelected = passageAnswers[q.id] === opt;
                            const isCorrect = opt.startsWith(q.answer[0]);

                            let style = "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500";
                            if (passageSubmitted) {
                              if (isCorrect) style = "bg-emerald-950 border-emerald-500 text-emerald-300 font-bold";
                              else if (isSelected && !isCorrect) style = "bg-rose-950 border-rose-500 text-rose-300 font-bold";
                            } else if (isSelected) {
                              style = "bg-blue-950 border-blue-500 text-blue-300 font-bold";
                            }

                            return (
                              <button
                                key={opt}
                                disabled={passageSubmitted}
                                onClick={() => setPassageAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                                className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition ${style}`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>

                        {passageSubmitted && (
                          <div className="bg-slate-900/90 border border-slate-700 p-3.5 rounded-xl text-xs space-y-1">
                            <span className="font-bold text-amber-400">Çözüm Analizi: </span>
                            <span className="text-slate-300">{q.explanation}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {!passageSubmitted && (
                    <button
                      onClick={() => setPassageSubmitted(true)}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-2xl transition"
                    >
                      Sınavı Bitir ve Analizi Gör
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: GRAMER & CÜMLE PARÇALAYICI */}
        {activeTab === "grammar" && (
          <div className="space-y-6">
            <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">YDS Görsel Cümle Parçalayıcı (Özne-Yüklem-Bağlaç)</h2>
                <p className="text-xs text-slate-400">
                  Karmaşık YDS akademik cümlelerini girin; Özne, Yüklem, Bağlaç ve Yan Cümle ayrıştırmasını inceleyin.
                </p>
              </div>

              <form onSubmit={handleAnalyzeSentenceSubmit} className="space-y-3">
                <textarea
                  rows={3}
                  value={sentenceInput}
                  onChange={(e) => setSentenceInput(e.target.value)}
                  placeholder="İncelemek istediğiniz YDS cümlesini buraya yapıştırın..."
                  className="w-full rounded-2xl p-4 text-sm bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />

                <button
                  type="submit"
                  disabled={sentenceLoading}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-3 rounded-xl transition"
                >
                  {sentenceLoading ? "Cümle Parçalanıyor..." : "🔬 Cümleyi Analiz Et"}
                </button>
              </form>

              {sentenceAnalysis && (
                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 mt-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-blue-950 text-blue-300 border border-blue-500/40 px-3 py-1 rounded-xl text-xs font-bold">
                      👤 Özne: {sentenceAnalysis.subject}
                    </span>
                    <span className="bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-xl text-xs font-bold">
                      🎯 Yüklem: {sentenceAnalysis.mainVerb}
                    </span>
                    <span className="bg-purple-950 text-purple-300 border border-purple-500/40 px-3 py-1 rounded-xl text-xs font-bold">
                      ⏱ Tense: {sentenceAnalysis.tense}
                    </span>
                  </div>

                  {sentenceAnalysis.conjunctions.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-amber-400">Bağlaçlar & Geçişler:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {sentenceAnalysis.conjunctions.map((c) => (
                          <span key={c.word} className="bg-amber-950 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-lg text-xs font-semibold">
                            {c.word} ({c.type})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {sentenceAnalysis.simplifiedTurkish && (
                    <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-xs text-slate-300">
                      <span className="font-bold text-emerald-400">Basitleştirilmiş Türkçe Çeviri: </span>
                      {sentenceAnalysis.simplifiedTurkish}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: ETİKETLER */}
        {activeTab === "tags" && (
          <div className="space-y-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-3">YDS Kelime Türleri ve Etiket Filtresi</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTagFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeTagFilter === "all" ? "bg-blue-600 text-white" : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  Tüm Etiketler
                </button>
                {ALL_TAGS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTagFilter(t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                      activeTagFilter === t
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MOBİL SABİT ALT GEZİNTİ BAR (PWA / MOBILE BOTTOM NAV BAR) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 border-t border-slate-800 backdrop-blur-md flex justify-around p-2 text-xs font-bold text-slate-400">
        {[
          { id: "list", label: "Kelimeler", icon: "📚" },
          { id: "quiz", label: "Pratik", icon: "⚡" },
          { id: "yds", label: "YDS Sınav", icon: "📝" },
          { id: "grammar", label: "Gramer", icon: "🔬" },
          { id: "tags", label: "Etiketler", icon: "🏷️" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
              activeTab === item.id ? "text-blue-400 font-extrabold" : "hover:text-slate-200"
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span className="text-[10px]">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* API KEY MODAL */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white">Gemini API Key Yapılandırması</h3>
            <p className="text-xs text-slate-400">
              YDS soru üretimi ve yapay zeka içerikleri için Google Gemini API key'inizi girin.
            </p>
            <input
              type="text"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  localStorage.setItem("gemini_key", geminiApiKey);
                  setShowApiKeyModal(false);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs transition"
              >
                Kaydet
              </button>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="bg-slate-800 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs hover:bg-slate-700 transition"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
