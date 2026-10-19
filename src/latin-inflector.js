export const FINAL_SOUND_CLASSES = Object.freeze({
  CONSONANT: "consonant",
  VOWEL: "vowel",
});

export const FINAL_VOWEL_CLASSES = Object.freeze({
  I: "i",
  OTHER: "other",
});

export const INFLECTION_CASES = Object.freeze([
  "nominative",
  "ergative",
  "dative",
  "genitive",
  "instrumental",
  "adverbial",
  "vocative",
]);

const CASE_ENDINGS = Object.freeze({
  [FINAL_SOUND_CLASSES.CONSONANT]: Object.freeze({
    nominative: Object.freeze(["", "ი"]),
    ergative: Object.freeze(["მა"]),
    dative: Object.freeze(["ს"]),
    genitive: Object.freeze(["ის"]),
    instrumental: Object.freeze(["ით"]),
    adverbial: Object.freeze(["ად"]),
    vocative: Object.freeze(["", "ო"]),
  }),
  [FINAL_SOUND_CLASSES.VOWEL]: Object.freeze({
    nominative: Object.freeze([""]),
    ergative: Object.freeze(["მ"]),
    dative: Object.freeze(["ს"]),
    genitive: Object.freeze(["ს"]),
    adverbial: Object.freeze(["დ"]),
    vocative: Object.freeze([""]),
  }),
});

const LATIN_LETTER = /\p{Script=Latin}/u;
const GEORGIAN_LETTER = /[\u10A0-\u10FF]/u;
const CONTROL_WHITESPACE = /[\r\n\t]/u;

export class LatinInflectionError extends TypeError {
  constructor(code, message) {
    super(message);
    this.name = "LatinInflectionError";
    this.code = code;
  }
}

function validateStem(stem) {
  if (typeof stem !== "string" || stem.length === 0) {
    throw new LatinInflectionError("INVALID_STEM", "Stem must be a non-empty string.");
  }
  if (stem !== stem.trim()) {
    throw new LatinInflectionError("UNTRIMMED_STEM", "Stem must not have leading or trailing whitespace.");
  }
  if (CONTROL_WHITESPACE.test(stem)) {
    throw new LatinInflectionError("INVALID_STEM_WHITESPACE", "Stem must not contain tabs or line breaks.");
  }
  if (!LATIN_LETTER.test(stem)) {
    throw new LatinInflectionError("NON_LATIN_STEM", "Stem must contain at least one Latin-script letter.");
  }
  if (GEORGIAN_LETTER.test(stem)) {
    throw new LatinInflectionError("ALREADY_INFLECTED", "Stem must not already contain Georgian letters.");
  }
  if (stem.endsWith("-")) {
    throw new LatinInflectionError("TRAILING_HYPHEN", "Stem must not end with a hyphen.");
  }
}

function validateFinalSoundClass(finalSoundClass) {
  if (!Object.hasOwn(CASE_ENDINGS, finalSoundClass)) {
    throw new LatinInflectionError(
      "INVALID_FINAL_SOUND_CLASS",
      'Final sound class must be either "consonant" or "vowel".',
    );
  }
}

function validateFinalVowelClass(finalSoundClass, finalVowelClass) {
  if (finalSoundClass !== FINAL_SOUND_CLASSES.VOWEL) return;
  if (!Object.values(FINAL_VOWEL_CLASSES).includes(finalVowelClass)) {
    throw new LatinInflectionError(
      "INVALID_FINAL_VOWEL_CLASS",
      'Vowel-final stems require finalVowelClass "i" or "other".',
    );
  }
}

function applyEnding(stem, ending) {
  return ending ? `${stem}-${ending}` : stem;
}

function getCaseEndings(finalSoundClass, finalVowelClass, caseName) {
  if (finalSoundClass === FINAL_SOUND_CLASSES.VOWEL && caseName === "instrumental") {
    return Object.freeze([finalVowelClass === FINAL_VOWEL_CLASSES.I ? "თ" : "თი"]);
  }
  return CASE_ENDINGS[finalSoundClass][caseName];
}

function createCaseResult(stem, finalSoundClass, finalVowelClass, caseName) {
  const endings = getCaseEndings(finalSoundClass, finalVowelClass, caseName);
  const forms = Object.freeze(endings.map((ending) => applyEnding(stem, ending)));
  const ruleVariant = caseName === "instrumental" && finalSoundClass === FINAL_SOUND_CLASSES.VOWEL
    ? `.${finalVowelClass}`
    : "";
  return Object.freeze({
    forms,
    display: forms.join(" / "),
    endings,
    ruleId: `latin.case.${finalSoundClass}.${caseName}${ruleVariant}`,
  });
}

function createWarnings(stem) {
  const wordCount = stem.split(/\s+/u).length;
  const warnings = [];
  if (wordCount > 2) {
    warnings.push(Object.freeze({
      code: "LONG_PHRASE",
      message: "The term has more than two words; verify the mixed-script form for readability.",
    }));
  }
  return { wordCount, warnings: Object.freeze(warnings) };
}

/**
 * Inflect a preserved Latin-script stem using its final pronounced sound.
 * The function deliberately does not infer pronunciation from spelling.
 */
export function inflectLatinStem({ stem, finalSoundClass, finalVowelClass = null } = {}) {
  validateStem(stem);
  validateFinalSoundClass(finalSoundClass);
  validateFinalVowelClass(finalSoundClass, finalVowelClass);

  const cases = Object.fromEntries(
    INFLECTION_CASES.map((caseName) => [
      caseName,
      createCaseResult(stem, finalSoundClass, finalVowelClass, caseName),
    ]),
  );
  const { wordCount, warnings } = createWarnings(stem);

  return Object.freeze({
    stem,
    finalSoundClass,
    finalVowelClass,
    wordCount,
    warnings,
    cases: Object.freeze(cases),
  });
}

