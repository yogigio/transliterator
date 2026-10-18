const CASES = [
  ["nominative", "Nominative"],
  ["ergative", "Ergative"],
  ["dative", "Dative"],
  ["genitive", "Genitive"],
  ["instrumental", "Instrumental"],
  ["adverbial", "Adverbial"],
  ["vocative", "Vocative"],
];

const pendingParadigm = () => Object.fromEntries(CASES.map(([key]) => [key, null]));

export const sampleEntries = Object.freeze([
  {
    id: "sample_wordpress", headword: "WordPress", aliases: ["Word Press"],
    lexicalClass: "Proper noun", entityType: "Open-source project", status: "automatic",
    sourceLanguage: "English", sourceRegion: null, transcriptionBasis: "English pronunciation",
    confidence: { band: "Medium", explanation: "This reference candidate still requires eng.ge editorial approval." },
    pronunciations: {
      us: { label: "American", ipa: "/ˈwɝːd.prɛs/", source: "Reference pronunciation pending review" },
      uk: { label: "British", ipa: "/ˈwɜːd.prɛs/", source: "Reference pronunciation pending review" },
    },
    georgian: {
      spelling: "ვორდპრესი", stem: "ვორდპრეს", ending: "ი", endingClass: "Consonant-ending",
      finalIRole: "Nominative case marker", explanation: "The final -ი is presented as a candidate nominative case marker pending editorial review.",
    },
    inflection: { georgianScript: "blocked_pending_rules", latinScript: "blocked_pending_rules", scopes: ["whole"], whole: pendingParadigm() },
    details: { method: "Reference candidate", version: "Reference record · preview", reviewed: "Not reviewed", dictionaryUrl: null },
  },
  {
    id: "sample_github", headword: "GitHub", aliases: ["Git Hub"],
    lexicalClass: "Proper noun", entityType: "Developer platform", status: "automatic",
    sourceLanguage: "English", sourceRegion: null, transcriptionBasis: "English pronunciation",
    confidence: { band: "Medium", explanation: "This reference candidate still requires eng.ge editorial approval." },
    pronunciations: {
      us: { label: "American", ipa: "/ˈɡɪt.hʌb/", source: "Reference pronunciation pending review" },
      uk: { label: "British", ipa: "/ˈɡɪt.hʌb/", source: "Reference pronunciation pending review" },
    },
    georgian: {
      spelling: "გიტჰაბი", stem: "გიტჰაბ", ending: "ი", endingClass: "Consonant-ending",
      finalIRole: "Nominative case marker", explanation: "The final -ი is presented as a candidate nominative case marker pending editorial review.",
    },
    inflection: { georgianScript: "blocked_pending_rules", latinScript: "blocked_pending_rules", scopes: ["whole"], whole: pendingParadigm() },
    details: { method: "Reference candidate", version: "Reference record · preview", reviewed: "Not reviewed", dictionaryUrl: null },
  },
  {
    id: "sample_php", headword: "PHP", aliases: ["PHP: Hypertext Preprocessor", "Hypertext Preprocessor"],
    lexicalClass: "Abbreviation", entityType: "Programming language", status: "automatic",
    fullForm: "PHP: Hypertext Preprocessor", abbreviationType: "Recursive acronym",
    sourceLanguage: "English", sourceRegion: null, transcriptionBasis: "Spoken English letter names",
    confidence: { band: "Medium", explanation: "The letter-by-letter Georgian spelling still requires eng.ge editorial approval." },
    pronunciations: {
      us: { label: "American", ipa: "/ˌpiː.eɪtʃˈpiː/", source: "Reference pronunciation pending review" },
      uk: { label: "British", ipa: "/ˌpiː.eɪtʃˈpiː/", source: "Reference pronunciation pending review" },
    },
    georgian: {
      spelling: "პი-ეიჩ-პი", stem: "პი-ეიჩ-პი", ending: "", endingClass: "Spelled-out initialism",
      finalIRole: "Part of the letter name", explanation: "The final ი belongs to the spoken name of the letter P and is not a nominative case marker.",
    },
    inflection: { georgianScript: "blocked_pending_rules", latinScript: "blocked_pending_rules", scopes: ["whole"], whole: pendingParadigm() },
    details: { method: "Reference candidate", version: "Reference record · preview", reviewed: "Not reviewed", dictionaryUrl: null },
  },
  {
    id: "sample_microsoft", headword: "Microsoft", aliases: ["MSFT"],
    lexicalClass: "Proper noun", entityType: "Brand", status: "approved",
    sourceLanguage: "English", sourceRegion: null, transcriptionBasis: "English pronunciation",
    pronunciations: {
      us: { label: "American", ipa: "/ˈmaɪ.krə.sɔft/", source: "Editorial pronunciation record" },
      uk: { label: "British", ipa: "/ˈmaɪ.krə.sɒft/", source: "Editorial pronunciation record" },
    },
    rejectedForms: ["მაიქროსოფთი", "მიკროსოფტი", "მიქროსოფთი"],
    georgian: {
      spelling: "მაიკროსოფტი", stem: "მაიკროსოფტ", ending: "ი",
      endingClass: "Consonant-ending", finalIRole: "Nominative case marker",
      explanation: "The final -ი marks the nominative case and is not part of the stem.",
    },
    inflection: { georgianScript: "blocked_pending_rules", latinScript: "blocked_pending_rules", scopes: ["whole"], whole: pendingParadigm() },
    details: { method: "Editorially reviewed spelling", version: "Editorial record · v1", reviewed: "Review date not supplied", dictionaryUrl: "https://eng.ge/?lang=en" },
  },
  {
    id: "sample_miami", headword: "Miami", aliases: [],
    lexicalClass: "Proper noun", entityType: "Place name", status: "approved",
    sourceLanguage: "American English", sourceRegion: "United States", transcriptionBasis: "Established English usage",
    pronunciations: {
      us: { label: "American", ipa: "/maɪˈæm.i/", source: "Editorial pronunciation record" },
      uk: { label: "British", ipa: "/maɪˈæm.i/", source: "Editorial pronunciation record" },
    },
    georgian: {
      spelling: "მაიამი", stem: "მაიამი", ending: "", endingClass: "Vowel-ending",
      finalIRole: "Part of the root", explanation: "The final ი belongs to the root and is not a nominative case marker.",
    },
    inflection: { georgianScript: "blocked_pending_rules", latinScript: "not_applicable", scopes: ["whole"], whole: pendingParadigm() },
    details: { method: "Editorially reviewed spelling", version: "Editorial record · v1", reviewed: "Review date not supplied", dictionaryUrl: "https://eng.ge/?lang=en" },
  },
  {
    id: "sample_linus_torvalds", headword: "Linus Torvalds", aliases: ["Torvalds, Linus"],
    lexicalClass: "Proper noun", entityType: "Personal name", status: "automatic",
    sourceLanguage: "Swedish", sourceVariety: "Finland Swedish", sourceRegion: "Finland", transcriptionBasis: "Individually researched source-language pronunciation",
    confidence: { band: "Medium", explanation: "The Georgian form is attested in a public Georgian-language reference but still requires eng.ge editorial approval." },
    pronunciations: {
      source: { label: "Swedish (Finland)", ipa: "[ˈliːnʉs ˈtuːrvɑlds]", source: "Source pronunciation" },
    },
    georgian: {
      spelling: "ლინუს ტორვალდსი", stem: "ლინუს ტორვალდს", ending: "ი", endingClass: "Composite personal name",
      finalIRole: "Surname case marker", explanation: "The public reference form is structured as a given name and surname; its morphology still awaits editorial review.",
    },
    components: [
      { source: "Linus", georgian: "ლინუს", role: "Given name", paradigm: pendingParadigm() },
      { source: "Torvalds", georgian: "ტორვალდსი", role: "Surname", paradigm: pendingParadigm() },
    ],
    inflection: { georgianScript: "blocked_pending_rules", latinScript: "not_applicable", scopes: ["whole", "components"], whole: pendingParadigm() },
    details: { method: "Public reference candidate", version: "Reference record · preview", reviewed: "Not reviewed", dictionaryUrl: null },
  },
  {
    id: "sample_steve_jobs", headword: "Steve Jobs", aliases: ["Jobs, Steve"],
    lexicalClass: "Proper noun", entityType: "Personal name", status: "approved",
    sourceLanguage: "English", sourceRegion: "United States", transcriptionBasis: "English pronunciation",
    pronunciations: {
      us: { label: "American", ipa: "/stiːv dʒɑːbz/", source: "Editorial pronunciation record" },
      uk: { label: "British", ipa: "/stiːv dʒɒbz/", source: "Editorial pronunciation record" },
    },
    georgian: {
      spelling: "სტივ ჯობსი", stem: "სტივ ჯობს", ending: "ი", endingClass: "Composite personal name",
      finalIRole: "Surname case marker", explanation: "The entry is structured as a given name and surname so whole-name and component behavior can be reviewed separately.",
    },
    components: [
      { source: "Steve", georgian: "სტივ", role: "Given name", paradigm: pendingParadigm() },
      { source: "Jobs", georgian: "ჯობსი", role: "Surname", paradigm: pendingParadigm() },
    ],
    inflection: { georgianScript: "blocked_pending_rules", latinScript: "not_applicable", scopes: ["whole", "components"], whole: pendingParadigm() },
    details: { method: "Editorially reviewed spelling", version: "Editorial record · v1", reviewed: "Review date not supplied", dictionaryUrl: "https://eng.ge/?lang=en" },
  },
  {
    id: "sample_figma", headword: "Figma", aliases: [],
    lexicalClass: "Proper noun", entityType: "Brand", status: "automatic",
    sourceLanguage: "English", sourceRegion: null, transcriptionBasis: "English pronunciation",
    confidence: { band: "Medium", explanation: "Pronunciation and transcription rules require editorial confirmation." },
    pronunciations: {
      us: { label: "American", ipa: "/ˈfɪɡ.mə/", source: "Automatically generated pronunciation" },
      uk: { label: "British", ipa: "/ˈfɪɡ.mə/", source: "Automatically generated pronunciation" },
    },
    georgian: {
      spelling: "ფიგმა", stem: "ფიგმა", ending: "", endingClass: "Analysis pending",
      finalIRole: "Not applicable", explanation: "This candidate is illustrative and has not been editorially approved.",
    },
    inflection: { georgianScript: "blocked_pending_rules", latinScript: "blocked_pending_rules", scopes: ["whole"], whole: pendingParadigm() },
    details: { method: "Automatic suggestion", version: "Rule engine · preview", reviewed: "Not reviewed", dictionaryUrl: null },
  },
]);

const featuredEntryIds = ["sample_wordpress", "sample_github", "sample_php", "sample_miami", "sample_linus_torvalds"];
export const featuredEntries = Object.freeze(featuredEntryIds.map((id) => sampleEntries.find((entry) => entry.id === id)));

const normalize = (value) => String(value ?? "").trim().toLocaleLowerCase("en");

export function searchEntries(query) {
  const needle = normalize(query);
  if (!needle) return [];
  const exact = sampleEntries.find((entry) => [entry.headword, ...entry.aliases].some((candidate) => normalize(candidate) === needle));
  if (exact) return [exact];
  return sampleEntries.filter((entry) => [entry.headword, ...entry.aliases].some((candidate) => normalize(candidate).includes(needle)));
}

export function getEntry(id) {
  return sampleEntries.find((entry) => entry.id === id) ?? null;
}

export { CASES };
