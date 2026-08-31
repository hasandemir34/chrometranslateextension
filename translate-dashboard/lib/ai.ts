import type { SavedWord } from "../firebase";

// ─── YDS Tipleri (page.tsx buradan import eder) ──────────────────────────────
export interface YDSWordEnrichment {
  synonyms: string[];
  antonyms: string[];
  collocations: string[];
  ydsLevel: "B1" | "B2" | "C1" | "C2";
  ydsExampleSentence: string;
  ydsExampleTranslation: string;
  ydsQuestion?: {
    question: string;
    options: string[];
    answer: string;
    explanation: string;
  };
}

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

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const DEFAULT_GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "AIzaSyB0_EnyhVfj9onv2IS2dDL7CykHWoTXVd0";

// ─── Yardımcı: Gemini API çağrısı ────────────────────────────────────────────
async function callGemini(prompt: string, apiKey?: string): Promise<string> {
  const activeKey = apiKey || DEFAULT_GEMINI_KEY;
  const response = await fetch(`${GEMINI_BASE}?key=${activeKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API HTTP ${response.status}`);
  }

  const data = await response.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  return raw.replace(/```json|```/g, "").trim();
}

// ─── Yardımcı: Güvenli JSON parse ────────────────────────────────────────────
function safeParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.warn("JSON parse failed:", raw.slice(0, 200));
    return fallback;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. YDS Kelime Zenginleştirme
//    Döndürür: synonyms, antonyms, collocations, ydsLevel, örnek cümle + YDS sorusu
// ─────────────────────────────────────────────────────────────────────────────
export async function enrichWordForYDS(
  word: string,
  translation: string,
  apiKey?: string
): Promise<YDSWordEnrichment> {
  const activeKey = apiKey || DEFAULT_GEMINI_KEY;
  const fallback: YDSWordEnrichment = {
    synonyms: [],
    antonyms: [],
    collocations: [`${word} with`, `${word} of`],
    ydsLevel: "B2",
    ydsExampleSentence: `The concept of ${word} plays a significant role in academic discourse.`,
    ydsExampleTranslation: `"${translation}" kavramı akademik söylemde önemli bir rol oynar.`,
  };

  if (!activeKey) return fallback;

  const prompt = `You are an expert English lexicographer specializing in Turkish university entrance exam vocabulary (YDS — Yabancı Dil Bilgisi Seviye Tespit Sınavı).

Analyze the English word: "${word}" (Turkish meaning: "${translation}")

Return ONLY a valid JSON object with EXACTLY these keys:
{
  "synonyms": ["word1", "word2", "word3"],
  "antonyms": ["word1", "word2"],
  "collocations": ["${word} with something", "${word} of something", "be ${word} to something"],
  "ydsLevel": "B1" | "B2" | "C1" | "C2",
  "ydsExampleSentence": "A sophisticated, academic English sentence using '${word}' naturally in a real-world scientific, social, or literary context. NEVER meta-sentences about learning.",
  "ydsExampleTranslation": "Fluent Turkish translation of the example sentence",
  "ydsQuestion": {
    "question": "The scientists were ____ by the unprecedented speed of climate change. (Fill the blank with the best word closest in meaning to '${word}')",
    "options": ["A) ${word}", "B) synonym1", "C) synonym2", "D) antonym", "E) unrelated_word"],
    "answer": "A) ${word}",
    "explanation": "Turkish explanation of why this answer is correct and why others are wrong, in YDS style."
  }
}

Rules:
- synonyms/antonyms must be real, common English words at the same or similar CEFR level
- collocations must be real, attested English collocations (preposition + word, verb + word, etc.)
- ydsExampleSentence must be 20-35 words, academic register, no meta-language
- ydsQuestion must reflect actual YDS exam style (sentence completion)
- Do not include markdown, code blocks, or extra text`;

  try {
    const raw = await callGemini(prompt, apiKey);
    const parsed = safeParse<YDSWordEnrichment>(raw, fallback);
    return {
      synonyms: parsed.synonyms || [],
      antonyms: parsed.antonyms || [],
      collocations: parsed.collocations || [],
      ydsLevel: parsed.ydsLevel || "B2",
      ydsExampleSentence: parsed.ydsExampleSentence || fallback.ydsExampleSentence,
      ydsExampleTranslation: parsed.ydsExampleTranslation || fallback.ydsExampleTranslation,
      ydsQuestion: parsed.ydsQuestion,
    };
  } catch (e) {
    console.warn("enrichWordForYDS failed:", e);
    return fallback;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. YDS Cümle Analizi
//    Döndürür: mainVerb, tense, conjunctions, clauses, transitionType
// ─────────────────────────────────────────────────────────────────────────────
export interface YDSSentenceAnalysis {
  mainVerb: string;
  tense: string;
  subject: string;
  conjunctions: Array<{ word: string; type: "contrast" | "cause" | "addition" | "condition" | "time" | "other" }>;
  clauses: Array<{ type: string; text: string; function: string }>;
  transitionType: string;
  simplifiedTurkish: string;
}

export async function analyzeSentenceForYDS(
  sentence: string,
  apiKey?: string
): Promise<YDSSentenceAnalysis> {
  const activeKey = apiKey || DEFAULT_GEMINI_KEY;
  const fallback: YDSSentenceAnalysis = {
    mainVerb: "—",
    tense: "—",
    subject: "—",
    conjunctions: [],
    clauses: [],
    transitionType: "—",
    simplifiedTurkish: "Analiz yapılamadı.",
  };

  if (!activeKey || sentence.length < 10) return fallback;

  const prompt = `You are an expert English grammar instructor specializing in YDS (Turkish university entrance exam) sentence analysis.

Analyze this English sentence for a Turkish YDS student:
"${sentence}"

Return ONLY a valid JSON object:
{
  "mainVerb": "the main verb phrase of the sentence",
  "tense": "e.g. Present Perfect, Past Simple, etc.",
  "subject": "the grammatical subject",
  "conjunctions": [
    { "word": "however", "type": "contrast" },
    { "word": "because", "type": "cause" }
  ],
  "clauses": [
    { "type": "main clause", "text": "...", "function": "states the main idea" },
    { "type": "relative clause / adverbial clause / noun clause", "text": "...", "function": "modifies X / acts as subject" }
  ],
  "transitionType": "Contrast / Cause-Effect / Addition / Condition / Time / Mixed / None",
  "simplifiedTurkish": "A simplified Turkish paraphrase of the sentence meaning"
}

conjunction types: contrast | cause | addition | condition | time | other
Keep explanations brief and YDS-exam focused. No markdown, no extra text.`;

  try {
    const raw = await callGemini(prompt, apiKey);
    const parsed = safeParse<YDSSentenceAnalysis>(raw, fallback);
    return {
      mainVerb: parsed.mainVerb || fallback.mainVerb,
      tense: parsed.tense || fallback.tense,
      subject: parsed.subject || fallback.subject,
      conjunctions: parsed.conjunctions || [],
      clauses: parsed.clauses || [],
      transitionType: parsed.transitionType || fallback.transitionType,
      simplifiedTurkish: parsed.simplifiedTurkish || fallback.simplifiedTurkish,
    };
  } catch (e) {
    console.warn("analyzeSentenceForYDS failed:", e);
    return fallback;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. YDS Mini Sınav Üreteci
//    5 kelime sorusu + 5 boşluklu Cloze Test
// ─────────────────────────────────────────────────────────────────────────────
export async function generateYDSMiniExam(
  words: SavedWord[],
  apiKey?: string
): Promise<YDSExam> {
  const activeKey = apiKey || DEFAULT_GEMINI_KEY;
  const emptyExam: YDSExam = { questions: [], generatedAt: new Date().toISOString() };

  if (!activeKey || words.length < 3) return emptyExam;

  // En fazla 10 kelime kullan (Gemini token limiti)
  const sample = words.slice(0, Math.min(10, words.length));
  const wordList = sample
    .map((w) => `${w.word} (Türkçe: ${w.translation})`)
    .join(", ");

  const prompt = `You are a YDS (Yabancı Dil Bilgisi Seviye Tespit Sınavı) test writer. Generate a mini exam using these vocabulary words: [${wordList}]

Create EXACTLY this JSON structure:
{
  "questions": [
    {
      "id": "q1",
      "type": "vocabulary",
      "question": "The research team was ____ by the unexpected findings that contradicted their initial hypothesis.",
      "options": ["A) astounded", "B) reluctant", "C) proficient", "D) ambiguous", "E) coherent"],
      "answer": "A) astounded",
      "explanation": "Turkish: 'astounded' şaşkına dönmüş anlamına gelir. Araştırma ekibinin öngörmedikleri bulgularla karşılaşması bu duyguyu doğurur.",
      "wordId": "${sample[0]?.id || ""}",
      "word": "${sample[0]?.word || ""}"
    }
  ]
}

Generate 4-5 VOCABULARY questions (sentence completion, 5 options A-E each) + 1 CLOZE TEST question where type="cloze" and question is a paragraph with 3 blanks marked as (1)___, (2)___, (3)___ and options are 5 sets.

Rules:
- Use ONLY the provided vocabulary words as correct answers
- Wrong options must be plausible English words of similar grammatical category
- Sentences must be academic, 20-35 words, real-world context
- Explanations in Turkish, YDS style
- Do not repeat the target word in the sentence before the blank
- No markdown, no extra text, only the JSON object`;

  try {
    const raw = await callGemini(prompt, apiKey);
    const parsed = safeParse<{ questions: YDSQuestion[] }>(raw, { questions: [] });

    if (!parsed.questions || parsed.questions.length === 0) return emptyExam;

    return {
      questions: parsed.questions.map((q, i) => ({
        id: q.id || `q${i + 1}`,
        type: q.type || "vocabulary",
        question: q.question || "",
        options: q.options || [],
        answer: q.answer || "",
        explanation: q.explanation || "",
        wordId: q.wordId,
        word: q.word,
      })),
      generatedAt: new Date().toISOString(),
    };
  } catch (e) {
    console.warn("generateYDSMiniExam failed:", e);
    return emptyExam;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. YDS Örnek Cümle Üretme (mevcut fonksiyon — YDS prompt ile güncellendi)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateExampleSentence(
  word: string,
  translation: string,
  sourceLang = "en",
  apiKey?: string
): Promise<{ sentence: string; sentenceTranslation: string }> {
  const fallbacks = [
    {
      s: `Researchers have found that ${word} significantly influences long-term cognitive development in academic settings.`,
      t: `Araştırmacılar, ${translation} konusunun akademik ortamlarda uzun vadeli bilişsel gelişimi önemli ölçüde etkilediğini bulmuştur.`,
    },
    {
      s: `The policy reform aimed to address the systemic issues related to ${word} across multiple sectors.`,
      t: `Politika reformu, birden fazla sektördeki ${translation} ile ilgili sistemik sorunları ele almayı hedefliyordu.`,
    },
    {
      s: `Despite initial resistance, the concept of ${word} gradually gained acceptance among leading scholars.`,
      t: `İlk dirence rağmen, ${translation} kavramı önde gelen akademisyenler arasında giderek kabul görmeye başladı.`,
    },
    {
      s: `A growing body of evidence suggests that ${word} is fundamentally linked to social and economic well-being.`,
      t: `Giderek büyüyen bir kanıt bütünü, ${translation} konusunun sosyal ve ekonomik refahla temelden bağlantılı olduğunu öne sürmektedir.`,
    },
  ];

  const fallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];

  if (!apiKey) return { sentence: fallback.s, sentenceTranslation: fallback.t };

  const langNote = sourceLang && sourceLang !== "en"
    ? `(Note: the word originates from ${sourceLang.toUpperCase()})`
    : "";

  const prompt = `You are a YDS exam content expert. Write 1 authentic, academic English sentence (20-35 words) that naturally uses the word "${word}" (Turkish: "${translation}") ${langNote}.

Context domains (choose one): science, psychology, economics, history, technology, sociology, environment.

STRICT RULES:
- NEVER write meta-sentences about learning or teaching
- The word must function naturally in its correct grammatical role
- Sentence must be at C1 academic register, suitable for YDS exam

Respond ONLY with valid JSON — no markdown, no extra text:
{"sentence": "...", "sentenceTranslation": "Fluent Turkish translation"}`;

  try {
    const raw = await callGemini(prompt, apiKey);
    const parsed = safeParse<{ sentence: string; sentenceTranslation: string }>(raw, {
      sentence: fallback.s,
      sentenceTranslation: fallback.t,
    });
    if (parsed.sentence && parsed.sentenceTranslation) return parsed;
    return { sentence: fallback.s, sentenceTranslation: fallback.t };
  } catch {
    return { sentence: fallback.s, sentenceTranslation: fallback.t };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. AI Okuma Metni (mevcut fonksiyon — YDS odaklı prompt ile güncellendi)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateAIStory(
  words: { word: string; translation: string }[],
  apiKey?: string
): Promise<{ storyEn: string; storyTr: string }> {
  if (words.length === 0) {
    return { storyEn: "Lütfen hikaye için kelime seçin.", storyTr: "" };
  }

  const wordListStr = words.map((w) => `${w.word} (${w.translation})`).join(", ");

  const fallbackEn = `Environmental scientists have long studied how ${words.map((w) => w.word.toUpperCase()).join(", ")} shape our understanding of ecological systems. Their research demonstrates that sustainable policies must account for these complex, interconnected phenomena.`;
  const fallbackTr = `Çevre bilimciler, ${words.map((w) => w.translation).join(", ")} konularının ekolojik sistemler hakkındaki anlayışımızı nasıl şekillendirdiğini uzun süredir incelemektedir.`;

  if (!apiKey) return { storyEn: fallbackEn, storyTr: fallbackTr };

  const prompt = `You are a YDS (Turkish university entrance exam) reading passage writer. Write a cohesive academic reading passage (4-6 sentences, ~120-160 words) at C1 level that naturally incorporates ALL of these vocabulary words: [${wordListStr}].

Requirements:
- Academic register suitable for YDS exam
- Real-world topic (science, history, environment, psychology, technology)
- Each target word must appear naturally in context, marked in UPPERCASE
- Passage must have logical flow with appropriate discourse markers
- Turkish translation must be fluent, not literal

Respond ONLY with valid JSON — no markdown, no extra text:
{"storyEn": "The passage text with TARGET WORDS in UPPERCASE.", "storyTr": "Fluent Turkish translation"}`;

  try {
    const raw = await callGemini(prompt, apiKey);
    const parsed = safeParse<{ storyEn: string; storyTr: string }>(raw, {
      storyEn: fallbackEn,
      storyTr: fallbackTr,
    });
    if (parsed.storyEn && parsed.storyTr) return parsed;
    return { storyEn: fallbackEn, storyTr: fallbackTr };
  } catch {
    return { storyEn: fallbackEn, storyTr: fallbackTr };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. YDS 4 Sorulu Paragraf Seti Üreteci
// ─────────────────────────────────────────────────────────────────────────────
export interface YDSReadingQuestion {
  id: string;
  type: "main_idea" | "detail" | "inference" | "vocabulary";
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface YDSReadingPassageSet {
  title: string;
  passageEn: string;
  passageTr: string;
  questions: YDSReadingQuestion[];
}

export async function generateYDSReadingPassageSet(
  words: { word: string; translation: string }[],
  apiKey?: string
): Promise<YDSReadingPassageSet> {
  const wordListStr = words.length > 0
    ? words.map((w) => `${w.word} (${w.translation})`).join(", ")
    : "relinquish, vulnerable, deteriorate, mitigate, substantial";

  const fallback: YDSReadingPassageSet = {
    title: "Environmental Resilience and Global Policy",
    passageEn: "Recent meteorological studies indicate that ecosystem stability is increasingly vulnerable to global climate shifts. As habitats deteriorate under extreme thermal pressure, international consortiums must relinquish outdated resource management strategies. To mitigate long-term degradation, scientists advocate substantial investments in renewable energy infrastructure, asserting that proactive measures are indispensable for biodiversity preservation.",
    passageTr: "Son meteorolojik çalışmalar, ekosistem istikrarının küresel iklim değişimlerine karşı giderek daha savunmasız hale geldiğini göstermektedir. Aşırı termal basınç altında doğal yaşam alanları kötüleştikçe, uluslararası konsorsiyumlar demode kaynak yönetim stratejilerinden vazgeçmelidir. Uzun vadeli bozulmayı hafifletmek için bilim insanları, biyolojik çeşitliliğin korunması için proaktif önlemlerin vazgeçilmez olduğunu savunarak yenilenebilir enerji altyapısına kayda değer yatırımlar yapılmasını önermektedir.",
    questions: [
      {
        id: "q1",
        type: "main_idea",
        question: "Which of the following best expresses the primary purpose of the passage?",
        options: [
          "A) To argue that renewable energy investments are unnecessary for ecosystem preservation.",
          "B) To emphasize the urgency of updating resource management and mitigating climate impacts.",
          "C) To critique international consortiums for their research methodologies.",
          "D) To demonstrate that global temperatures have reached a permanent peak.",
          "E) To compare different meteorological study techniques."
        ],
        answer: "B) To emphasize the urgency of updating resource management and mitigating climate impacts.",
        explanation: "Metnin ana amacı, iklim değişikliğinin ekosistemlere zarar verdiğini belirtip kaynak yönetiminin güncellenmesi ve yenilenebilir enerjiye yatırım yapılması gerektiğini vurgulamaktır."
      },
      {
        id: "q2",
        type: "detail",
        question: "According to the passage, why must consortiums relinquish outdated strategies?",
        options: [
          "A) Because traditional methods have proven to be too expensive.",
          "B) Because public protests have demanded an immediate halt to industrial activity.",
          "C) Because natural habitats are deteriorating under extreme thermal pressure.",
          "D) Because renewable energy sources have become fully depleted.",
          "E) Because meteorological studies have been invalidated."
        ],
        answer: "C) Because natural habitats are deteriorating under extreme thermal pressure.",
        explanation: "Metnin 2. cümlesinde açıkça 'As habitats deteriorate under extreme thermal pressure, international consortiums must relinquish...' denmektedir."
      },
      {
        id: "q3",
        type: "inference",
        question: "It can be inferred from the passage that proactive measures in energy policy ----.",
        options: [
          "A) will have no significant effect on global temperature trends",
          "B) are vital for safeguarding the future of global biodiversity",
          "C) are opposed by the majority of environmental scientists",
          "D) require immediate reduction in international trade",
          "E) were first introduced in the 19th century"
        ],
        answer: "B) are vital for safeguarding the future of global biodiversity",
        explanation: "Son cümlede proaktif önlemlerin biyolojik çeşitliliğin korunması için 'indispensable' (vazgeçilmez) olduğu ifade edildiğinden bu çıkarım doğrudur."
      },
      {
        id: "q4",
        type: "vocabulary",
        question: "The word 'relinquish' in the passage is closest in meaning to ----.",
        options: [
          "A) surrender / give up",
          "B) acquire / possess",
          "C) intensify / expand",
          "D) analyze / investigate",
          "E) transform / alter"
        ],
        answer: "A) surrender / give up",
        explanation: "'Relinquish', bir haktan, güçten veya stratejiden vazgeçmek, bırakmak anlamına geldiğinden 'surrender / give up' en yakın anlamlı seçenektir."
      }
    ]
  };

  if (!apiKey) return fallback;

  const prompt = `You are a YDS (Yabancı Dil Bilgisi Seviye Tespit Sınavı) exam passage and question writer.
Generate a C1-level academic reading passage (150-180 words) naturally incorporating these words: [${wordListStr}].

Then generate EXACTLY 4 ÖSYM YDS-style questions based on the passage:
1. main_idea (What is the primary purpose...)
2. detail (According to the passage...)
3. inference (It can be inferred from the passage that...)
4. vocabulary (The word 'X' in the passage is closest in meaning to...)

Return ONLY a valid JSON object:
{
  "title": "Academic Passage Title",
  "passageEn": "Full English academic passage text...",
  "passageTr": "Fluent Turkish translation of the passage...",
  "questions": [
    {
      "id": "q1",
      "type": "main_idea",
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ...", "E) ..."],
      "answer": "A) ...",
      "explanation": "Detailed Turkish explanation of the correct answer and distractor rationale."
    }
  ]
}

No markdown, no code block markers. Just pure JSON.`;

  try {
    const raw = await callGemini(prompt, apiKey);
    const parsed = safeParse<YDSReadingPassageSet>(raw, fallback);
    if (parsed.passageEn && parsed.questions && parsed.questions.length > 0) return parsed;
    return fallback;
  } catch {
    return fallback;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. YDS Restatement (Yakın Anlamlı Cümle) Soru Üreteci
// ─────────────────────────────────────────────────────────────────────────────
export interface YDSRestatementQuestion {
  id: string;
  originalSentence: string;
  options: string[];
  answer: string;
  explanation: string;
}

export async function generateYDSRestatementQuestions(
  words: SavedWord[],
  apiKey?: string
): Promise<YDSRestatementQuestion[]> {
  const fallback: YDSRestatementQuestion[] = [
    {
      id: "r1",
      originalSentence: "Although initial economic forecasts were pessimistic, subsequent scientific innovations triggered unprecedented market growth.",
      options: [
        "A) Despite gloomy initial financial projections, later technological breakthroughs led to unparalleled market expansion.",
        "B) Because early economic forecasts were accurate, scientific research was funded heavily.",
        "C) Market growth remained static despite the introduction of various technological innovations.",
        "D) Technological advancements failed to alter the negative financial expectations established early on.",
        "E) Initial pessimistic views resulted in the complete cessation of scientific innovation."
      ],
      answer: "A) Despite gloomy initial financial projections, later technological breakthroughs led to unparalleled market expansion.",
      explanation: "Orijinal cümledeki 'Although pessimistic forecasts' -> 'Despite gloomy projections', 'subsequent innovations' -> 'later breakthroughs', 'unprecedented growth' -> 'unparalleled expansion' ile tam eş anlamlıdır."
    }
  ];

  if (!apiKey || words.length === 0) return fallback;

  const sampleWords = words.slice(0, 5).map(w => w.word).join(", ");
  const prompt = `You are a YDS test author. Write 2 YDS Restatement (Yakın Anlamlı Cümle) questions using vocabulary related to: [${sampleWords}].

Return ONLY a valid JSON array:
[
  {
    "id": "r1",
    "originalSentence": "Complex English C1 sentence with conjunctions (e.g. Although/Despite/Because/Unless)",
    "options": ["A) ...", "B) ...", "C) ...", "D) ...", "E) ..."],
    "answer": "A) ...",
    "explanation": "Detailed Turkish explanation mapping key vocabulary and conjunction equivalences."
  }
]

No markdown, no extra text.`;

  try {
    const raw = await callGemini(prompt, apiKey);
    const parsed = safeParse<YDSRestatementQuestion[]>(raw, fallback);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return fallback;
  } catch {
    return fallback;
  }
}

