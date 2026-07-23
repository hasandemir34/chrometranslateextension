export async function generateExampleSentence(
  word: string,
  translation: string,
  sourceLang = "en",
  apiKey?: string
): Promise<{ sentence: string; sentenceTranslation: string }> {
  const activeKey = apiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (activeKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${activeKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are an expert English lexicographer and author. Write 1 authentic, highly natural, real-world example sentence in English that uses the word "${word}" (Turkish meaning: "${translation}") in a realistic context (such as science, business, technology, psychology, nature, or everyday life).

STRICT CRITICAL RULE: Never write meta-sentences about learning, teaching, or using words (e.g. NEVER write "The teacher used the word...", "Learning the word...", "It is important to know..."). The word "${word}" MUST be an active, natural vocabulary item in the sentence itself.

Respond strictly in valid JSON format with keys "sentence" (the English sentence) and "sentenceTranslation" (the fluent Turkish translation). Do not include markdown code blocks or extra text.`,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        const cleanJson = rawText.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        if (parsed.sentence && parsed.sentenceTranslation) {
          return {
            sentence: parsed.sentence,
            sentenceTranslation: parsed.sentenceTranslation,
          };
        }
      }
    } catch (e) {
      console.warn("Gemini API call failed, falling back to smart generator:", e);
    }
  }

  // Fallback / Standalone Template Generator
  const templates = [
    {
      s: `Recent studies demonstrate how ${word} plays a crucial role in modern technological advances.`,
      t: `Son çalışmalar, ${translation} konusunun modern teknolojik ilerlemelerde kritik bir rol oynadığını göstermektedir.`,
    },
    {
      s: `Despite facing unexpected challenges, the team showed remarkable ${word} during the project.`,
      t: `Beklenmedik zorluklarla karşılaşmasına rağmen, ekip proje boyunca dikkate değer bir ${translation} sergiledi.`,
    },
    {
      s: `Clear communication and strong ${word} help organizations make better decisions under pressure.`,
      t: `Net iletişim ve güçlü ${translation}, kuruluşların baskı altında daha iyi kararlar almasına yardımcı olur.`,
    },
    {
      s: `The author highlighted the significance of ${word} in shaping modern societal values.`,
      t: `Yazar, modern toplumsal değerlerin şekillenmesinde ${translation} önemini vurguladı.`,
    },
  ];

  const randomIndex = Math.floor(Math.random() * templates.length);
  return {
    sentence: templates[randomIndex].s,
    sentenceTranslation: templates[randomIndex].t,
  };
}

export async function generateAIStory(
  words: { word: string; translation: string }[],
  apiKey?: string
): Promise<{ storyEn: string; storyTr: string }> {
  if (words.length === 0) {
    return { storyEn: "Lütfen hikaye için kelime seçin.", storyTr: "" };
  }

  const wordListStr = words.map((w) => `${w.word} (${w.translation})`).join(", ");
  const activeKey = apiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (activeKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${activeKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are an expert English language educator and writer. Write a highly coherent, meaningful, and professional English reading passage (3-5 sentences) that naturally incorporates all of these target vocabulary words: [${wordListStr}]. The passage must make complete logical sense, sound authentic and educational, and clearly demonstrate the context of each word. Format the target words in UPPERCASE in the English passage. Respond strictly in valid JSON format with keys "storyEn" (the English passage) and "storyTr" (the fluent, natural Turkish translation of the passage). Do not include markdown code block formatting or extra text.`,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        const cleanJson = rawText.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        if (parsed.storyEn && parsed.storyTr) {
          return { storyEn: parsed.storyEn, storyTr: parsed.storyTr };
        }
      }
    } catch (e) {
      console.warn("Gemini API story call failed, falling back to smart generator:", e);
    }
  }

  // Fallback Smart Story Generator
  const wordsFormatted = words.map((w) => w.word.toUpperCase()).join(", ");
  const storyEn = `Once upon a time, a passionate learner embarked on a journey to master new vocabulary. Every single day, words like ${wordsFormatted} became part of their daily reflection. Through persistent practice and dedication, knowledge transformed into wisdom.`;
  const storyTr = `Bir zamanlar tutkulu bir öğrenci yeni kelimelerde ustalaşmak için bir yolculuğa çıktı. Her gün, ${words.map(w => w.translation).join(", ")} gibi kelimeler günlük düşüncelerinin bir parçası oldu. Sürekli pratik ve azimle bilgi bilgeliğe dönüştü.`;

  return { storyEn, storyTr };
}
