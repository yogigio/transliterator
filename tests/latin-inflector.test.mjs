import test from "node:test";
import assert from "node:assert/strict";
import {
  FINAL_SOUND_CLASSES,
  FINAL_VOWEL_CLASSES,
  INFLECTION_CASES,
  LatinInflectionError,
  inflectLatinStem,
} from "../src/latin-inflector.js";

test("inflects a consonant-final Latin stem across all seven cases", () => {
  const result = inflectLatinStem({
    stem: "Codex",
    finalSoundClass: FINAL_SOUND_CLASSES.CONSONANT,
  });

  assert.deepEqual(Object.keys(result.cases), INFLECTION_CASES);
  assert.deepEqual(
    Object.fromEntries(INFLECTION_CASES.map((caseName) => [caseName, result.cases[caseName].display])),
    {
      nominative: "Codex / Codex-ი",
      ergative: "Codex-მა",
      dative: "Codex-ს",
      genitive: "Codex-ის",
      instrumental: "Codex-ით",
      adverbial: "Codex-ად",
      vocative: "Codex / Codex-ო",
    },
  );
  assert.deepEqual(result.warnings, []);
});

test("inflects vowel-final terms without altering their Latin base", () => {
  const result = inflectLatinStem({
    stem: "OpenAI",
    finalSoundClass: FINAL_SOUND_CLASSES.VOWEL,
    finalVowelClass: FINAL_VOWEL_CLASSES.I,
  });

  assert.equal(result.cases.nominative.display, "OpenAI");
  assert.equal(result.cases.ergative.display, "OpenAI-მ");
  assert.equal(result.cases.dative.display, "OpenAI-ს");
  assert.equal(result.cases.genitive.display, "OpenAI-ს");
  assert.equal(result.cases.instrumental.display, "OpenAI-თ");
  assert.equal(result.cases.adverbial.display, "OpenAI-დ");
  assert.equal(result.cases.vocative.display, "OpenAI");
});

test("selects the vowel-final instrumental ending from the final pronounced vowel", () => {
  const examples = [
    ["API", FINAL_VOWEL_CLASSES.I, "API-თ"],
    ["PHP", FINAL_VOWEL_CLASSES.I, "PHP-თ"],
    ["NATO", FINAL_VOWEL_CLASSES.OTHER, "NATO-თი"],
    ["ChatGPT", FINAL_VOWEL_CLASSES.I, "ChatGPT-თ"],
  ];

  examples.forEach(([stem, finalVowelClass, expected]) => {
    const result = inflectLatinStem({
      stem,
      finalSoundClass: FINAL_SOUND_CLASSES.VOWEL,
      finalVowelClass,
    });
    assert.equal(result.cases.instrumental.display, expected);
  });
});

test("adds non-i vowel endings to a preserved Latin-script brand name", () => {
  const result = inflectLatinStem({
    stem: "Figma",
    finalSoundClass: FINAL_SOUND_CLASSES.VOWEL,
    finalVowelClass: FINAL_VOWEL_CLASSES.OTHER,
  });

  assert.equal(result.cases.genitive.display, "Figma-ს");
  assert.equal(result.cases.instrumental.display, "Figma-თი");
});

test("requires an explicit final-vowel class for vowel-final stems", () => {
  assert.throws(
    () => inflectLatinStem({ stem: "PHP", finalSoundClass: FINAL_SOUND_CLASSES.VOWEL }),
    (error) => error instanceof LatinInflectionError && error.code === "INVALID_FINAL_VOWEL_CLASS",
  );
});

test("preserves a multiword stem and warns when it has more than two words", () => {
  const result = inflectLatinStem({
    stem: "Christian Science Monitor",
    finalSoundClass: FINAL_SOUND_CLASSES.CONSONANT,
  });

  assert.equal(result.cases.nominative.display, "Christian Science Monitor / Christian Science Monitor-ი");
  assert.equal(result.cases.genitive.display, "Christian Science Monitor-ის");
  assert.equal(result.wordCount, 3);
  assert.deepEqual(result.warnings.map(({ code }) => code), ["LONG_PHRASE"]);
});

test("preserves internal punctuation and hyphens", () => {
  const result = inflectLatinStem({
    stem: "GPT-5.6 Sol",
    finalSoundClass: FINAL_SOUND_CLASSES.CONSONANT,
  });

  assert.equal(result.cases.dative.display, "GPT-5.6 Sol-ს");
});

test("keeps alternative forms as arrays instead of slash-containing data", () => {
  const result = inflectLatinStem({
    stem: "Codex",
    finalSoundClass: FINAL_SOUND_CLASSES.CONSONANT,
  });

  assert.deepEqual(result.cases.nominative.forms, ["Codex", "Codex-ი"]);
  assert.deepEqual(result.cases.vocative.forms, ["Codex", "Codex-ო"]);
  assert.deepEqual(result.cases.nominative.endings, ["", "ი"]);
});

test("rejects unknown sound classes rather than guessing from spelling", () => {
  assert.throws(
    () => inflectLatinStem({ stem: "Google", finalSoundClass: "unknown" }),
    (error) => error instanceof LatinInflectionError && error.code === "INVALID_FINAL_SOUND_CLASS",
  );
});

test("rejects stems that are empty, untrimmed, suffixed, or non-Latin", () => {
  const invalid = [
    ["", "INVALID_STEM"],
    [" Codex", "UNTRIMMED_STEM"],
    ["Codex-ის", "ALREADY_INFLECTED"],
    ["Codex-", "TRAILING_HYPHEN"],
    ["კოდექს", "NON_LATIN_STEM"],
  ];

  invalid.forEach(([stem, code]) => {
    assert.throws(
      () => inflectLatinStem({ stem, finalSoundClass: FINAL_SOUND_CLASSES.CONSONANT }),
      (error) => error instanceof LatinInflectionError && error.code === code,
    );
  });
});

