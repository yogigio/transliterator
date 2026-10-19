import { composeGeorgianInitialism } from "./georgian-initialism.js?v=0.8.3";
import { inflectGeorgianStem } from "./georgian-inflector.js?v=0.8.3";
import { inflectLatinStem } from "./latin-inflector.js?v=0.8.3";
import { filterEntries, hasActiveEntryFilters } from "./entry-filters.js?v=0.8.3";

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

const generatedLatinInflection = (stem, finalSoundClass, finalVowelClass = null) => {
  const result = inflectLatinStem({ stem, finalSoundClass, finalVowelClass });
  return {
    finalSoundClass,
    finalVowelClass,
    paradigm: Object.fromEntries(CASES.map(([key]) => [key, result.cases[key].display])),
    warnings: result.warnings,
  };
};

const generatedGeorgianParadigm = (stem, declensionClass) => {
  const result = inflectGeorgianStem({ stem, declensionClass });
  return Object.fromEntries(CASES.map(([key]) => [key, result.cases[key].display]));
};

const phpGeorgian = composeGeorgianInitialism(["პი", "ეიჩ", "პი"]);
const cnnGeorgianStem = composeGeorgianInitialism(["სი", "ენ", "ენ"]);

export const sampleEntries = Object.freeze([
  {
    id: "sample_wordpress", headword: "WordPress", aliases: ["Word Press"],
    lexicalClass: "Proper noun", entityType: "Open-source project", entityCategories: ["software_project"], status: "candidate",
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
    inflection: { georgianScript: "automatic", latinScript: "automatic", scopes: ["whole"], whole: generatedGeorgianParadigm("ვორდპრეს", "consonant"), latin: generatedLatinInflection("WordPress", "consonant") },
    details: { method: "Reference candidate", version: "Reference record · preview", reviewed: "Not reviewed", dictionaryUrl: null },
  },
  {
    id: "sample_github", headword: "GitHub", aliases: ["Git Hub"],
    lexicalClass: "Proper noun", entityType: "Developer platform", entityCategories: ["software_project"], status: "candidate",
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
    inflection: { georgianScript: "automatic", latinScript: "automatic", scopes: ["whole"], whole: generatedGeorgianParadigm("გიტჰაბ", "consonant"), latin: generatedLatinInflection("GitHub", "consonant") },
    details: { method: "Reference candidate", version: "Reference record · preview", reviewed: "Not reviewed", dictionaryUrl: null },
  },
  {
    id: "sample_php", headword: "PHP", aliases: ["PHP: Hypertext Preprocessor", "Hypertext Preprocessor"],
    lexicalClass: "Abbreviation", entityType: "Programming language", entityCategories: ["technical_term", "software_project"], status: "candidate",
    fullForm: "PHP: Hypertext Preprocessor", abbreviationType: "Recursive acronym",
    sourceLanguage: "English", sourceRegion: null, transcriptionBasis: "Spoken English letter names",
    confidence: { band: "Medium", explanation: "The letter-by-letter Georgian spelling still requires eng.ge editorial approval." },
    pronunciations: {
      us: { label: "American", ipa: "/ˌpiː.eɪtʃˈpiː/", source: "Reference pronunciation pending review" },
      uk: { label: "British", ipa: "/ˌpiː.eɪtʃˈpiː/", source: "Reference pronunciation pending review" },
    },
    georgian: {
      spelling: phpGeorgian, stem: phpGeorgian, ending: "", endingClass: "Spelled-out initialism",
      finalIRole: "Part of the letter name", explanation: "The final ი belongs to the spoken name of the letter P and is not a nominative case marker.",
    },
    inflection: { georgianScript: "automatic", latinScript: "automatic", scopes: ["whole"], whole: generatedGeorgianParadigm(phpGeorgian, "vowel_i"), latin: generatedLatinInflection("PHP", "vowel", "i") },
    details: { method: "Reference candidate", version: "Reference record · preview", reviewed: "Not reviewed", dictionaryUrl: null },
  },
  {
    id: "sample_cnn", headword: "CNN", aliases: ["Cable News Network"],
    lexicalClass: "Abbreviation", entityType: "News organization", entityCategories: ["organization"], status: "candidate",
    fullForm: "Cable News Network", abbreviationType: "Initialism",
    sourceLanguage: "English", sourceRegion: null, transcriptionBasis: "Spoken English letter names",
    confidence: { band: "Medium", explanation: "The letter-by-letter Georgian spelling still requires eng.ge editorial approval." },
    pronunciations: {
      us: { label: "American", ipa: "/ˌsiː.ɛnˈɛn/", source: "Reference pronunciation pending review" },
      uk: { label: "British", ipa: "/ˌsiː.ɛnˈɛn/", source: "Reference pronunciation pending review" },
    },
    georgian: {
      spelling: `${cnnGeorgianStem}ი`, stem: cnnGeorgianStem, ending: "ი", endingClass: "Spelled-out consonant-final initialism",
      finalIRole: "Nominative case marker", explanation: "The spoken name of the final letter N ends in a consonant, so Georgian nominative -ი is added to the joined stem.",
    },
    inflection: { georgianScript: "automatic", latinScript: "automatic", scopes: ["whole"], whole: generatedGeorgianParadigm(cnnGeorgianStem, "consonant"), latin: generatedLatinInflection("CNN", "consonant") },
    details: { method: "Reference candidate", version: "Reference record · preview", reviewed: "Not reviewed", dictionaryUrl: null },
  },
  {
    id: "sample_microsoft", headword: "Microsoft", aliases: ["MSFT"],
    lexicalClass: "Proper noun", entityType: "Brand", entityCategories: ["brand_product"], status: "approved",
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
    inflection: { georgianScript: "automatic", latinScript: "automatic", scopes: ["whole"], whole: generatedGeorgianParadigm("მაიკროსოფტ", "consonant"), latin: generatedLatinInflection("Microsoft", "consonant") },
    details: { method: "Editorially reviewed spelling", version: "Editorial record · v1", reviewed: "Review date not supplied", dictionaryUrl: "https://eng.ge/?lang=en" },
  },
  {
    id: "sample_miami", headword: "Miami", aliases: [],
    lexicalClass: "Proper noun", entityType: "Place name", entityCategories: ["place"], status: "approved",
    sourceLanguage: "American English", sourceRegion: "United States", transcriptionBasis: "Established English usage",
    pronunciations: {
      us: { label: "American", ipa: "/maɪˈæm.i/", source: "Editorial pronunciation record" },
      uk: { label: "British", ipa: "/maɪˈæm.i/", source: "Editorial pronunciation record" },
    },
    georgian: {
      spelling: "მაიამი", stem: "მაიამი", ending: "", endingClass: "Vowel-ending",
      finalIRole: "Part of the root", explanation: "The final ი belongs to the root and is not a nominative case marker.",
    },
    inflection: { georgianScript: "automatic", latinScript: "not_applicable", scopes: ["whole"], whole: generatedGeorgianParadigm("მაიამი", "vowel_i") },
    details: { method: "Editorially reviewed spelling", version: "Editorial record · v1", reviewed: "Review date not supplied", dictionaryUrl: "https://eng.ge/?lang=en" },
  },
  {
    id: "sample_linus_torvalds", headword: "Linus Torvalds", aliases: ["Torvalds, Linus"],
    lexicalClass: "Proper noun", entityType: "Personal name", entityCategories: ["person"], status: "candidate",
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
    inflection: { georgianScript: "automatic", latinScript: "not_applicable", scopes: ["whole", "components"], whole: generatedGeorgianParadigm("ლინუს ტორვალდს", "consonant") },
    details: { method: "Public reference candidate", version: "Reference record · preview", reviewed: "Not reviewed", dictionaryUrl: null },
  },
  {
    id: "sample_steve_jobs", headword: "Steve Jobs", aliases: ["Jobs, Steve"],
    lexicalClass: "Proper noun", entityType: "Personal name", entityCategories: ["person"], status: "approved",
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
    inflection: { georgianScript: "automatic", latinScript: "not_applicable", scopes: ["whole", "components"], whole: generatedGeorgianParadigm("სტივ ჯობს", "consonant") },
    details: { method: "Editorially reviewed spelling", version: "Editorial record · v1", reviewed: "Review date not supplied", dictionaryUrl: "https://eng.ge/?lang=en" },
  },
  {
    id: "sample_figma", headword: "Figma", aliases: [],
    lexicalClass: "Proper noun", entityType: "Brand", entityCategories: ["brand_product", "software_project"], status: "candidate",
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
    inflection: { georgianScript: "automatic", latinScript: "automatic", scopes: ["whole"], whole: generatedGeorgianParadigm("ფიგმა", "vowel_a_e"), latin: generatedLatinInflection("Figma", "vowel", "other") },
    details: { method: "Rule-generated preview", version: "Rule engine · preview", reviewed: "Not reviewed", dictionaryUrl: null },
  },
]);

const featuredEntryIds = ["sample_wordpress", "sample_github", "sample_php", "sample_miami", "sample_linus_torvalds"];
export const featuredEntries = Object.freeze(featuredEntryIds.map((id) => sampleEntries.find((entry) => entry.id === id)));

const normalize = (value) => String(value ?? "").trim().toLocaleLowerCase("en");

export function searchEntries(query, filters = {}) {
  const needle = normalize(query);
  const candidates = filterEntries(sampleEntries, filters);
  if (!needle) return hasActiveEntryFilters(filters) ? candidates : [];
  const exact = candidates.find((entry) => [entry.headword, ...entry.aliases].some((candidate) => normalize(candidate) === needle));
  if (exact) return [exact];
  return candidates.filter((entry) => [entry.headword, ...entry.aliases].some((candidate) => normalize(candidate).includes(needle)));
}

export function getEntry(id) {
  return sampleEntries.find((entry) => entry.id === id) ?? null;
}

export { CASES };
