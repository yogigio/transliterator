import {
  ENGLISH_READING_TYPES,
  IPA_CONTEXTUAL_RULES,
  IPA_DIRECT_RULES,
  IPA_VOWEL_TOKENS,
  PRONUNCIATION_RELIABILITY,
  PUBLIC_PRONUNCIATION_RELIABILITY,
} from "./english-ipa-rules.js?v=0.10.1";
import { tokenizeEnglishIpa } from "./ipa-tokenizer.js";
import { inflectGeorgianStem } from "./georgian-inflector.js";
import { createSpellingGuide } from "./spelling-guided-vowels.js?v=0.10.7";

const VOWELS = new Set(IPA_VOWEL_TOKENS);
const ROOT_FINAL_I = new Set(["iː", "i", "ɪ", "eɪ", "aɪ", "ɔɪ"]);
const CONFIDENCE_RANK = Object.freeze({ high: 3, medium: 2, low: 1 });

export const MORPHOLOGY_PROFILES = Object.freeze({
  FOREIGN_TERM: "foreign_term",
  GEOGRAPHIC_NAME: "geographic_name",
});

export class EnglishIpaEngineError extends TypeError {
  constructor(code, message) {
    super(message);
    this.name = "EnglishIpaEngineError";
    this.code = code;
  }
}

function validateInput(input) {
  if (!input || typeof input !== "object") {
    throw new EnglishIpaEngineError("INVALID_INPUT", "An engine input object is required.");
  }
  if (typeof input.surface !== "string" || !input.surface.trim()) {
    throw new EnglishIpaEngineError("INVALID_SURFACE", "A non-empty English surface form is required.");
  }
  if (input.language !== "English") {
    throw new EnglishIpaEngineError("NON_ENGLISH_SOURCE", "This engine accepts English-source terms only.");
  }
  if (typeof input.variety !== "string" || !input.variety.trim()) {
    throw new EnglishIpaEngineError("PRONUNCIATION_VARIETY_REQUIRED", "A pronunciation variety is required.");
  }
  if (!ENGLISH_READING_TYPES.includes(input.readingType)) {
    throw new EnglishIpaEngineError("READING_TYPE_REQUIRED", "readingType must be authoritative metadata.");
  }
  if (
    !input.pronunciationSource
    || typeof input.pronunciationSource.label !== "string"
    || !input.pronunciationSource.label.trim()
    || !PRONUNCIATION_RELIABILITY.includes(input.pronunciationSource.reliability)
  ) {
    throw new EnglishIpaEngineError("PRONUNCIATION_SOURCE_REQUIRED", "Pronunciation reliability metadata is required.");
  }
  if (input.lexicalClass != null && !["ordinary_word", "proper_noun", "abbreviation"].includes(input.lexicalClass)) {
    throw new EnglishIpaEngineError("INVALID_LEXICAL_CLASS", "lexicalClass must be ordinary_word, proper_noun, or abbreviation.");
  }
  if (
    input.morphologyProfile != null
    && !Object.values(MORPHOLOGY_PROFILES).includes(input.morphologyProfile)
  ) {
    throw new EnglishIpaEngineError("INVALID_MORPHOLOGY_PROFILE", "The morphology profile is not supported.");
  }
}

function surroundingPhoneme(tokens, index, direction) {
  for (let cursor = index + direction; cursor >= 0 && cursor < tokens.length; cursor += direction) {
    if (tokens[cursor].type === "word_boundary" || tokens[cursor].type === "morpheme_boundary") return null;
    if (tokens[cursor].type === "phoneme") return tokens[cursor];
  }
  return null;
}

function mapW(tokens, index) {
  const previous = surroundingPhoneme(tokens, index, -1);
  const next = surroundingPhoneme(tokens, index, 1);
  const initialBeforeVowel = !previous && next && VOWELS.has(next.value);
  return Object.freeze({
    output: initialBeforeVowel ? "უ" : "ვ",
    confidence: "high",
    ruleId: initialBeforeVowel ? "english.ipa.w.initial" : "english.ipa.w.medial",
  });
}

/**
 * An unstressed schwa between a consonant and a word-final /l/ is a syllabic l
 * ("apple" /ˈæpəl/ -> ეპლ-, "table" /ˈteɪbəl/ -> ტეიბლ-): Georgian writes no vowel
 * there. Every other schwa context stays unresolved and goes to an editor.
 */
function mapSyllabicFinalL(tokens, index) {
  const previous = surroundingPhoneme(tokens, index, -1);
  const next = surroundingPhoneme(tokens, index, 1);
  if (!previous || VOWELS.has(previous.value) || next?.value !== "l") return null;
  const nextIndex = tokens.indexOf(next, index);
  if (surroundingPhoneme(tokens, nextIndex, 1) !== null) return null;
  return Object.freeze({ output: "", confidence: "medium", ruleId: "english.ipa.schwa.syllabic-final-l" });
}

/**
 * Vowels IPA cannot separate but the written word can (see spelling-guided-vowels.js):
 * the written vowel unit that lines up with this nucleus picks the Georgian vowel.
 */
function mapSpellingGuided(token, kind, context, extra = {}) {
  const ordinal = context.nucleusOrdinals.get(token);
  const decision = context.guide && ordinal !== undefined
    ? context.guide.decide(ordinal, kind, { properName: context.properName, ...extra })
    : null;
  if (!decision) return null;
  return Object.freeze({
    output: decision.output,
    confidence: decision.confidence,
    ruleId: decision.suffix ? `english.ipa.name-suffix.${decision.suffix}` : `english.ipa.${kind}.spelling`,
    spelling: decision.letters,
  });
}

function mapToken(tokens, index, context) {
  const token = tokens[index];
  if (token.type !== "phoneme") return null;
  if (token.value === "w") return mapW(tokens, index);
  if (token.value === "ə") {
    const followedByR = surroundingPhoneme(tokens, index, 1)?.value === "ɹ";
    return mapSyllabicFinalL(tokens, index) ?? mapSpellingGuided(token, "schwa", context, { followedByR });
  }
  if (token.value === "ɚ") return mapSpellingGuided(token, "rhoticUnstressed", context);
  if (token.value === "ɝ" || token.value === "ɜː") return mapSpellingGuided(token, "rhoticStressed", context);
  if (token.value === "oʊ") {
    const guided = mapSpellingGuided(token, "ou", context);
    if (guided) return guided;
  }
  if (token.value === "ɑː" || token.value === "ɑ") {
    const guided = mapSpellingGuided(token, "back", context);
    if (guided) return guided;
  }
  const direct = IPA_DIRECT_RULES[token.value];
  if (direct) return Object.freeze({ ...direct, ruleId: `english.ipa.${token.value}` });
  return null;
}

function classifyFinalVowel(phonemes, georgianStem, morphologyProfile) {
  const finalPhoneme = phonemes.at(-1)?.value;
  if (ROOT_FINAL_I.has(finalPhoneme)) return Object.freeze({ finalRootVowel: "ი", declensionClass: "vowel_i" });
  const finalLetter = georgianStem.at(-1);
  if (finalLetter === "ა" || finalLetter === "ე") {
    const declensionClass = morphologyProfile === MORPHOLOGY_PROFILES.GEOGRAPHIC_NAME
      ? "geographic_vowel_a_e"
      : "vowel_a_e";
    return Object.freeze({ finalRootVowel: "other", declensionClass });
  }
  if (finalLetter === "ო" || finalLetter === "უ") {
    return Object.freeze({ finalRootVowel: "other", declensionClass: "vowel_o_u" });
  }
  return Object.freeze({ finalRootVowel: "none", declensionClass: "consonant" });
}

/**
 * The final sound class the Latin-script inflector needs. It follows the Georgian
 * stem the candidate ends with, so a Latin term reads exactly as its Georgian
 * counterpart declines: a consonant-final Georgian stem is a consonant sound
 * (ვორდპრესი / WordPress-ი), ი is vowel/i, and ა, ე, ო, უ are vowel/other.
 */
const LATIN_FINAL_SOUND = Object.freeze({
  consonant: Object.freeze({ finalSoundClass: "consonant", finalVowelClass: null }),
  vowel_i: Object.freeze({ finalSoundClass: "vowel", finalVowelClass: "i" }),
  vowel_a_e: Object.freeze({ finalSoundClass: "vowel", finalVowelClass: "other" }),
  geographic_vowel_a_e: Object.freeze({ finalSoundClass: "vowel", finalVowelClass: "other" }),
  vowel_o_u: Object.freeze({ finalSoundClass: "vowel", finalVowelClass: "other" }),
});

function confidenceFromTrace(trace) {
  return trace.reduce(
    (lowest, item) => CONFIDENCE_RANK[item.confidence] < CONFIDENCE_RANK[lowest] ? item.confidence : lowest,
    "high",
  );
}

/** Generate an auditable English-IPA-to-Georgian editorial candidate. */
export function transcribeEnglishIpa(input) {
  validateInput(input);
  const morphologyProfile = input.morphologyProfile ?? MORPHOLOGY_PROFILES.FOREIGN_TERM;
  const pronunciationSource = Object.freeze({
    ...input.pronunciationSource,
    label: input.pronunciationSource.label.trim(),
  });
  const tokenized = tokenizeEnglishIpa(input.ipa);
  const phonemes = tokenized.tokens.filter((token) => token.type === "phoneme");
  const unresolved = [];
  const trace = [];
  let georgianStem = "";

  // An initialism is read letter by letter, so its spelling says nothing about its vowels.
  const nuclei = tokenized.tokens.filter((token) => token.type === "phoneme" && VOWELS.has(token.value));
  const guide = input.readingType === "initialism" ? null : createSpellingGuide(input.surface, nuclei.length);
  const context = Object.freeze({ guide, properName: input.lexicalClass === "proper_noun", nucleusOrdinals: new Map(nuclei.map((token, ordinal) => [token, ordinal])) });

  tokenized.tokens.forEach((token, index) => {
    if (token.type === "unknown") {
      unresolved.push(Object.freeze({ token: token.value, reason: "unsupported_ipa_symbol" }));
      return;
    }
    if (token.type !== "phoneme") return;
    const mapped = mapToken(tokenized.tokens, index, context);
    if (!mapped) {
      const contextual = IPA_CONTEXTUAL_RULES[token.value];
      unresolved.push(Object.freeze({
        token: token.value,
        reason: contextual?.ruleId ?? "missing_mapping",
      }));
      return;
    }
    georgianStem += mapped.output;
    trace.push(Object.freeze({ input: token.value, output: mapped.output, ...mapped }));
  });

  const reliable = PUBLIC_PRONUNCIATION_RELIABILITY.includes(input.pronunciationSource.reliability);
  const reviewReasons = [];
  if (!reliable) reviewReasons.push("pronunciation_source_not_verified");
  if (unresolved.length) reviewReasons.push("unresolved_ipa_context");

  if (unresolved.length || !georgianStem) {
    return Object.freeze({
      surface: input.surface,
      language: input.language,
      variety: input.variety,
      readingType: input.readingType,
      pronunciationSource,
      ipaOriginal: tokenized.original,
      ipaNormalized: tokenized.normalized,
      tokens: tokenized.tokens,
      candidate: null,
      alternatives: Object.freeze([]),
      unresolved: Object.freeze(unresolved),
      trace: Object.freeze(trace),
      visibility: "editor_only",
      publicEligible: false,
      reviewReasons: Object.freeze(reviewReasons),
    });
  }

  const morphology = classifyFinalVowel(phonemes, georgianStem, morphologyProfile);
  const inflection = inflectGeorgianStem({ stem: georgianStem, declensionClass: morphology.declensionClass });
  const candidate = Object.freeze({
    georgianForm: inflection.cases.nominative.display,
    georgianStem,
    morphologyProfile,
    ...morphology,
    latinFinalSound: LATIN_FINAL_SOUND[morphology.declensionClass],
    confidence: confidenceFromTrace(trace),
    inflection: Object.freeze(Object.fromEntries(
      Object.entries(inflection.cases).map(([caseName, value]) => [caseName, value.display]),
    )),
  });

  return Object.freeze({
    surface: input.surface,
    language: input.language,
    variety: input.variety,
    readingType: input.readingType,
    pronunciationSource,
    ipaOriginal: tokenized.original,
    ipaNormalized: tokenized.normalized,
    tokens: tokenized.tokens,
    candidate,
    alternatives: Object.freeze([]),
    unresolved: Object.freeze([]),
    trace: Object.freeze(trace),
    visibility: reliable ? "public_candidate" : "editor_only",
    publicEligible: reliable,
    reviewReasons: Object.freeze(reviewReasons),
  });
}
