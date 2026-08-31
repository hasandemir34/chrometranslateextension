import { SavedWord, WordTag } from "../firebase";

export interface YDSPresetWord {
  word: string;
  translation: string;
  tags: WordTag[];
  ydsLevel: "B1" | "B2" | "C1" | "C2";
  collocations: string[];
  synonyms: string[];
  antonyms: string[];
  exampleSentence: string;
  exampleTranslation: string;
}

export const YDS_PRESET_WORDS: YDSPresetWord[] = [
  {
    word: "relinquish",
    translation: "feragat etmek, bırakmak, vazgeçmek",
    tags: ["Verb", "High Priority YDS"],
    ydsLevel: "C1",
    collocations: ["relinquish control", "relinquish power", "relinquish claim"],
    synonyms: ["surrender", "abandon", "yield", "renounce"],
    antonyms: ["retain", "keep", "maintain"],
    exampleSentence: "The monarch was forced to relinquish power after widespread public protests demanded democratic reforms.",
    exampleTranslation: "Hükümdar, yaygın halk protestolarının demokratik reformlar talep etmesi üzerine iktidarı bırakmak zorunda kaldı."
  },
  {
    word: "vulnerable to",
    translation: "-e karşı savunmasız, hassas, kırılgan",
    tags: ["Prepositional Phrase", "High Priority YDS", "Academic Adjective"],
    ydsLevel: "B2",
    collocations: ["highly vulnerable to", "vulnerable to infection", "vulnerable to climate change"],
    synonyms: ["susceptible to", "prone to", "exposed to"],
    antonyms: ["immune to", "resistant to", "protected against"],
    exampleSentence: "Coastal regions are particularly vulnerable to extreme weather events caused by rising global temperatures.",
    exampleTranslation: "Kıyı bölgeleri, yükselen küresel sıcaklıkların neden olduğu aşırı hava olaylarına karşı özellikle savunmasızdır."
  },
  {
    word: "deteriorate",
    translation: "kötüleşmek, bozulmak, dejenere olmak",
    tags: ["Verb", "High Priority YDS"],
    ydsLevel: "B2",
    collocations: ["deteriorate rapidly", "relations deteriorate", "health deteriorates"],
    synonyms: ["decline", "worsen", "degrade", "degenerate"],
    antonyms: ["improve", "enhance", "ameliorate"],
    exampleSentence: "Diplomatic relations between the two countries began to deteriorate rapidly after negotiations broke down.",
    exampleTranslation: "Müzakerelerin kesintiye uğramasının ardından iki ülke arasındaki diplomatik ilişkiler hızla kötüleşmeye başladı."
  },
  {
    word: "mitigate",
    translation: "hafifletmek, yatıştırmak, etkisini azaltmak",
    tags: ["Verb", "High Priority YDS"],
    ydsLevel: "C1",
    collocations: ["mitigate risk", "mitigate impact", "mitigate damage"],
    synonyms: ["alleviate", "reduce", "diminish", "lessen"],
    antonyms: ["aggravate", "exacerbate", "intensify"],
    exampleSentence: "Governments around the world are implementing strict policies to mitigate the financial impact of economic crises.",
    exampleTranslation: "Dünyadaki hükümetler, ekonomik krizlerin finansal etkisini hafifletmek için katı politikalar uyguluyor."
  },
  {
    word: "subsequent",
    translation: "sonraki, ardından gelen, müteakip",
    tags: ["Academic Adjective", "High Priority YDS"],
    ydsLevel: "B2",
    collocations: ["subsequent years", "subsequent studies", "subsequent events"],
    synonyms: ["following", "succeeding", "consecutive", "subsequent"],
    antonyms: ["prior", "previous", "preceding"],
    exampleSentence: "The initial discovery laid the groundwork for subsequent scientific breakthroughs in genetics.",
    exampleTranslation: "İlk keşif, genetikteki sonraki bilimsel atılımlar için zemin hazırladı."
  },
  {
    word: "attribute to",
    translation: "-e bağlamak, atfetmek, sebebini ... olarak görmek",
    tags: ["Phrasal Verb", "High Priority YDS"],
    ydsLevel: "C1",
    collocations: ["attribute success to", "be attributed to climate change", "attribute failure to"],
    synonyms: ["ascribe to", "impute to", "assign to"],
    antonyms: ["disassociate from"],
    exampleSentence: "Scientists attribute the recent increase in wildfires to prolonged heatwaves and severe drought conditions.",
    exampleTranslation: "Bilim insanları son zamanlardaki orman yangını artışını uzun süren sıcak hava dalgalarına ve şiddetli kuraklığa bağlıyor."
  },
  {
    word: "prevalent",
    translation: "yaygın, hâkim olan, genel kabul gören",
    tags: ["Academic Adjective", "High Priority YDS"],
    ydsLevel: "C1",
    collocations: ["prevalent among", "prevalent attitude", "became prevalent"],
    synonyms: ["widespread", "common", "predominant", "rife"],
    antonyms: ["rare", "uncommon", "scarce"],
    exampleSentence: "Chronic anxiety has become increasingly prevalent among young adults living in modern urban environments.",
    exampleTranslation: "Kronik kaygı, modern şehir ortamlarında yaşayan genç yetişkinler arasında giderek daha yaygın hale geldi."
  },
  {
    word: "reluctant",
    translation: "isteksiz, gönülsüz, tereddütlü",
    tags: ["Academic Adjective", "High Priority YDS"],
    ydsLevel: "B2",
    collocations: ["reluctant to accept", "reluctant participant", "reluctant agreement"],
    synonyms: ["unwilling", "hesitant", "loath", "disinclined"],
    antonyms: ["eager", "willing", "enthusiastic"],
    exampleSentence: "Many traditional financial institutions were initially reluctant to adopt digital currency technologies.",
    exampleTranslation: "Birçok geleneksel finans kuruluşu, başlangıçta dijital para teknolojilerini benimsemekte isteksizdi."
  },
  {
    word: "give rise to",
    translation: "-e yol açmak, neden olmak, doğurmak",
    tags: ["Phrasal Verb", "High Priority YDS"],
    ydsLevel: "B2",
    collocations: ["give rise to speculation", "give rise to concerns", "give rise to new industries"],
    synonyms: ["cause", "lead to", "trigger", "bring about", "engender"],
    antonyms: ["prevent", "halt", "suppress"],
    exampleSentence: "The rapid advance of artificial intelligence has given rise to profound ethical questions regarding privacy.",
    exampleTranslation: "Yapay zekanın hızlı ilerleyişi, gizlilikle ilgili derin etik soruların doğmasına yol açtı."
  },
  {
    word: "inevitable",
    translation: "kaçınılmaz, çaresiz, önlenemez",
    tags: ["Academic Adjective", "High Priority YDS"],
    ydsLevel: "B2",
    collocations: ["inevitable consequence", "inevitable result", "seem inevitable"],
    synonyms: ["unavoidable", "inescapable", "certain"],
    antonyms: ["avoidable", "preventable", "uncertain"],
    exampleSentence: "Conflict seems almost inevitable when competing nations vie for scarce natural resources.",
    exampleTranslation: "Rakip uluslar kıt doğal kaynaklar için mücadele ettiğinde çatışma neredeyse kaçınılmaz görünmektedir."
  },
  {
    word: "coherent",
    translation: "tutarlı, mantıklı, anlaşılır",
    tags: ["Academic Adjective", "High Priority YDS"],
    ydsLevel: "C1",
    collocations: ["coherent argument", "coherent policy", "coherent strategy"],
    synonyms: ["logical", "consistent", "lucid", "articulate"],
    antonyms: ["incoherent", "illogical", "disjointed"],
    exampleSentence: "The candidate presented a coherent plan for economic recovery that won the backing of business leaders.",
    exampleTranslation: "Aday, iş dünyası liderlerinin desteğini kazanan ekonomik iyileşme için tutarlı bir plan sundu."
  },
  {
    word: "compromise",
    translation: "uzlaşmak, tavis vermek; tehlikeye atmak",
    tags: ["Verb", "Noun", "High Priority YDS"],
    ydsLevel: "B2",
    collocations: ["reach a compromise", "compromise safety", "compromise integrity"],
    synonyms: ["negotiate", "concede", "jeopardize", "endanger"],
    antonyms: ["disagree", "stand firm", "protect"],
    exampleSentence: "Consuming unpasteurized food products may compromise the immune system of elderly individuals.",
    exampleTranslation: "Pastörize edilmemiş gıdaların tüketilmesi yaşlı bireylerin bağışıklık sistemini tehlikeye atabilir."
  },
  {
    word: "substantial",
    translation: "kayda değer, önemli miktarda, büyük",
    tags: ["Academic Adjective", "High Priority YDS"],
    ydsLevel: "B2",
    collocations: ["substantial amount", "substantial growth", "substantial evidence"],
    synonyms: ["considerable", "significant", "sizeable"],
    antonyms: ["negligible", "insignificant", "minor"],
    exampleSentence: "There is now substantial scientific evidence proving the direct correlation between smoking and lung cancer.",
    exampleTranslation: "Artık sigara kullanımı ile akciğer kanseri arasındaki doğrudan korelasyonu kanıtlayan kayda değer bilimsel kanıt bulunmaktadır."
  },
  {
    word: "turn down",
    translation: "geri çevirmek, reddetmek; sesini kısmak",
    tags: ["Phrasal Verb", "High Priority YDS"],
    ydsLevel: "B2",
    collocations: ["turn down an offer", "turn down an invitation", "turn down proposal"],
    synonyms: ["reject", "decline", "refuse", "dismiss"],
    antonyms: ["accept", "approve"],
    exampleSentence: "The prestigious university decided to turn down the application due to incomplete documentation.",
    exampleTranslation: "Prestijli üniversite, eksik belgeler nedeniyle başvuruyu geri çevirmeye karar verdi."
  },
  {
    word: "unprecedented",
    translation: "eşi benzeri görülmemiş, emsalsiz",
    tags: ["Academic Adjective", "High Priority YDS"],
    ydsLevel: "C1",
    collocations: ["unprecedented scale", "unprecedented growth", "unprecedented challenge"],
    synonyms: ["unmatched", "unparalleled", "extraordinary", "unheard-of"],
    antonyms: ["common", "unremarkable", "routine"],
    exampleSentence: "The global economy faced an unprecedented challenge during the pandemic outbreak.",
    exampleTranslation: "Küresel ekonomi, pandemi salgını sırasında eşi benzeri görülmemiş bir zorlukla karşı karşıya kaldı."
  }
];

export function buildPresetSavedWords(): Omit<SavedWord, "id">[] {
  const now = new Date().toISOString();
  return YDS_PRESET_WORDS.map((preset) => ({
    word: preset.word,
    translation: preset.translation,
    sourceLang: "en",
    targetLang: "tr",
    createdAt: now,
    status: "learning",
    level: 1,
    nextReviewDate: now,
    tags: preset.tags,
    ydsLevel: preset.ydsLevel,
    collocations: preset.collocations,
    synonyms: preset.synonyms,
    antonyms: preset.antonyms,
    exampleSentence: preset.exampleSentence,
    exampleTranslation: preset.exampleTranslation,
    sm2EF: 2.5,
    sm2Interval: 1,
    sm2Repetitions: 0,
    sm2NextReview: now,
  }));
}
