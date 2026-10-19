import test from "node:test";
import assert from "node:assert/strict";
import {
  GEORGIAN_DECLENSION_CLASSES,
  GEORGIAN_INFLECTION_CASES,
  GeorgianInflectionError,
  inflectGeorgianStem,
} from "../src/georgian-inflector.js";

test("inflects a consonant-final Georgian stem without hyphens", () => {
  const result = inflectGeorgianStem({
    stem: "გიტჰაბ",
    declensionClass: GEORGIAN_DECLENSION_CLASSES.CONSONANT,
  });

  assert.deepEqual(Object.keys(result.cases), GEORGIAN_INFLECTION_CASES);
  assert.deepEqual(
    Object.fromEntries(GEORGIAN_INFLECTION_CASES.map((caseName) => [caseName, result.cases[caseName].display])),
    {
      nominative: "გიტჰაბი",
      ergative: "გიტჰაბმა",
      dative: "გიტჰაბს",
      genitive: "გიტჰაბის",
      instrumental: "გიტჰაბით",
      adverbial: "გიტჰაბად",
      vocative: "გიტჰაბო",
    },
  );
});

test("inflects an i-final Georgian stem without inserting hyphens", () => {
  const result = inflectGeorgianStem({
    stem: "მაიამი",
    declensionClass: GEORGIAN_DECLENSION_CLASSES.VOWEL_I,
  });

  assert.equal(result.cases.nominative.display, "მაიამი");
  assert.equal(result.cases.ergative.display, "მაიამიმ");
  assert.equal(result.cases.dative.display, "მაიამის");
  assert.equal(result.cases.genitive.display, "მაიამის");
  assert.equal(result.cases.instrumental.display, "მაიამით");
  assert.equal(result.cases.adverbial.display, "მაიამიდ");
  assert.equal(result.cases.vocative.display, "მაიამი");
});

test("preserves spaces in names and inflects joined initialisms", () => {
  const name = inflectGeorgianStem({ stem: "სტივ ჯობს", declensionClass: "consonant" });
  const abbreviation = inflectGeorgianStem({ stem: "პიეიჩპი", declensionClass: "vowel_i" });

  assert.equal(name.cases.genitive.display, "სტივ ჯობსის");
  assert.equal(abbreviation.cases.ergative.display, "პიეიჩპიმ");
});

test("preserves a non-i final vowel in foreign names before genitive and instrumental endings", () => {
  const result = inflectGeorgianStem({ stem: "ფიგმა", declensionClass: "vowel_a_e" });

  assert.equal(result.cases.nominative.display, "ფიგმა");
  assert.equal(result.cases.ergative.display, "ფიგმამ");
  assert.equal(result.cases.dative.display, "ფიგმას");
  assert.equal(result.cases.genitive.display, "ფიგმას");
  assert.equal(result.cases.instrumental.display, "ფიგმათი");
  assert.equal(result.cases.adverbial.display, "ფიგმად");
});

test("truncates final a or e in geographical genitive and instrumental forms", () => {
  const result = inflectGeorgianStem({
    stem: "კუბა",
    declensionClass: GEORGIAN_DECLENSION_CLASSES.GEOGRAPHIC_VOWEL_A_E,
  });

  assert.equal(result.cases.nominative.display, "კუბა");
  assert.equal(result.cases.dative.display, "კუბას");
  assert.equal(result.cases.genitive.display, "კუბის");
  assert.equal(result.cases.instrumental.display, "კუბით");
});

test("rejects missing, Latin-script, and untrimmed Georgian stems", () => {
  const invalid = [
    ["", "INVALID_STEM"],
    [" გიტჰაბ", "UNTRIMMED_STEM"],
    ["GitHub", "NON_GEORGIAN_STEM"],
  ];

  invalid.forEach(([stem, code]) => {
    assert.throws(
      () => inflectGeorgianStem({ stem, declensionClass: "consonant" }),
      (error) => error instanceof GeorgianInflectionError && error.code === code,
    );
  });
});

test("rejects unknown declension classes", () => {
  assert.throws(
    () => inflectGeorgianStem({ stem: "გიტჰაბ", declensionClass: "unknown" }),
    (error) => error instanceof GeorgianInflectionError && error.code === "INVALID_DECLENSION_CLASS",
  );
});

