export const GEORGIAN_DECLENSION_CLASSES = Object.freeze({
  CONSONANT: "consonant",
  VOWEL_I: "vowel_i",
  VOWEL_A_E: "vowel_a_e",
  GEOGRAPHIC_VOWEL_A_E: "geographic_vowel_a_e",
  VOWEL_O_U: "vowel_o_u",
});

export const GEORGIAN_INFLECTION_CASES = Object.freeze([
  "nominative",
  "ergative",
  "dative",
  "genitive",
  "instrumental",
  "adverbial",
  "vocative",
]);

const CASE_ENDINGS = Object.freeze({
  [GEORGIAN_DECLENSION_CLASSES.CONSONANT]: Object.freeze({
    nominative: Object.freeze({ ending: "ი" }),
    ergative: Object.freeze({ ending: "მა" }),
    dative: Object.freeze({ ending: "ს" }),
    genitive: Object.freeze({ ending: "ის" }),
    instrumental: Object.freeze({ ending: "ით" }),
    adverbial: Object.freeze({ ending: "ად" }),
    vocative: Object.freeze({ ending: "ო" }),
  }),
  [GEORGIAN_DECLENSION_CLASSES.VOWEL_I]: Object.freeze({
    nominative: Object.freeze({ ending: "" }),
    ergative: Object.freeze({ ending: "მ" }),
    dative: Object.freeze({ ending: "ს" }),
    genitive: Object.freeze({ ending: "ს" }),
    instrumental: Object.freeze({ ending: "თ" }),
    adverbial: Object.freeze({ ending: "დ" }),
    vocative: Object.freeze({ ending: "" }),
  }),
  [GEORGIAN_DECLENSION_CLASSES.VOWEL_A_E]: Object.freeze({
    nominative: Object.freeze({ ending: "" }),
    ergative: Object.freeze({ ending: "მ" }),
    dative: Object.freeze({ ending: "ს" }),
    genitive: Object.freeze({ ending: "ს" }),
    instrumental: Object.freeze({ ending: "თი" }),
    adverbial: Object.freeze({ ending: "დ" }),
    vocative: Object.freeze({ ending: "" }),
  }),
  [GEORGIAN_DECLENSION_CLASSES.GEOGRAPHIC_VOWEL_A_E]: Object.freeze({
    nominative: Object.freeze({ ending: "" }),
    ergative: Object.freeze({ ending: "მ" }),
    dative: Object.freeze({ ending: "ს" }),
    genitive: Object.freeze({ ending: "ის", dropFinal: true }),
    instrumental: Object.freeze({ ending: "ით", dropFinal: true }),
    adverbial: Object.freeze({ ending: "დ" }),
    vocative: Object.freeze({ ending: "" }),
  }),
  [GEORGIAN_DECLENSION_CLASSES.VOWEL_O_U]: Object.freeze({
    nominative: Object.freeze({ ending: "" }),
    ergative: Object.freeze({ ending: "მ" }),
    dative: Object.freeze({ ending: "ს" }),
    genitive: Object.freeze({ ending: "ს" }),
    instrumental: Object.freeze({ ending: "თი" }),
    adverbial: Object.freeze({ ending: "დ" }),
    vocative: Object.freeze({ ending: "" }),
  }),
});

const GEORGIAN_LETTER = /[\u10A0-\u10FF]/u;
const LATIN_LETTER = /\p{Script=Latin}/u;
const CONTROL_WHITESPACE = /[\r\n\t]/u;

export class GeorgianInflectionError extends TypeError {
  constructor(code, message) {
    super(message);
    this.name = "GeorgianInflectionError";
    this.code = code;
  }
}

function validateStem(stem) {
  if (typeof stem !== "string" || stem.length === 0) {
    throw new GeorgianInflectionError("INVALID_STEM", "Stem must be a non-empty string.");
  }
  if (stem !== stem.trim()) {
    throw new GeorgianInflectionError("UNTRIMMED_STEM", "Stem must not have leading or trailing whitespace.");
  }
  if (CONTROL_WHITESPACE.test(stem)) {
    throw new GeorgianInflectionError("INVALID_STEM_WHITESPACE", "Stem must not contain tabs or line breaks.");
  }
  if (!GEORGIAN_LETTER.test(stem) || LATIN_LETTER.test(stem)) {
    throw new GeorgianInflectionError("NON_GEORGIAN_STEM", "Stem must be written in Georgian script.");
  }
}

function validateDeclensionClass(declensionClass) {
  if (!Object.hasOwn(CASE_ENDINGS, declensionClass)) {
    throw new GeorgianInflectionError(
      "INVALID_DECLENSION_CLASS",
      "Declension class is not supported.",
    );
  }
}

function createCaseResult(stem, declensionClass, caseName) {
  const rule = CASE_ENDINGS[declensionClass][caseName];
  const base = rule.dropFinal ? stem.slice(0, -1) : stem;
  const form = `${base}${rule.ending}`;
  return Object.freeze({
    forms: Object.freeze([form]),
    display: form,
    endings: Object.freeze([rule.ending]),
    ruleId: `georgian.case.${declensionClass}.${caseName}`,
  });
}

/** Inflect a stored Georgian stem without inserting a joining hyphen. */
export function inflectGeorgianStem({ stem, declensionClass } = {}) {
  validateStem(stem);
  validateDeclensionClass(declensionClass);

  const cases = Object.fromEntries(
    GEORGIAN_INFLECTION_CASES.map((caseName) => [
      caseName,
      createCaseResult(stem, declensionClass, caseName),
    ]),
  );

  return Object.freeze({
    stem,
    declensionClass,
    cases: Object.freeze(cases),
  });
}

