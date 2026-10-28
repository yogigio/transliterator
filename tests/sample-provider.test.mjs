import test from "node:test";
import assert from "node:assert/strict";
import { CASES, featuredEntries, getEntry, sampleEntries, searchEntries } from "../src/sample-provider.js";

test("finds fixtures by exact headword without changing their status", () => {
  assert.equal(searchEntries("Microsoft")[0].id, "sample_microsoft");
  assert.equal(searchEntries("Microsoft")[0].status, "approved");
});

test("search is case-insensitive and supports aliases", () => {
  assert.equal(searchEntries("miami")[0].entityType, "Place name");
  assert.equal(searchEntries("word press")[0].headword, "WordPress");
});

test("returns partial matching entries and no result for unknown values", () => {
  assert.equal(searchEntries("linus")[0].id, "sample_linus_torvalds");
  assert.deepEqual(searchEntries("unknown term"), []);
});

test("filters search with OR inside groups and AND between groups", () => {
  assert.deepEqual(
    searchEntries("", { lexicalClasses: ["Abbreviation"] }).map((entry) => entry.headword),
    ["PHP", "CNN"],
  );
  assert.deepEqual(
    searchEntries("", { entityCategories: ["person", "place"] }).map((entry) => entry.headword),
    ["Miami", "Linus Torvalds", "Steve Jobs"],
  );
  assert.deepEqual(
    searchEntries("", { lexicalClasses: ["Abbreviation"], entityCategories: ["organization"] }).map((entry) => entry.headword),
    ["CNN"],
  );
  assert.deepEqual(searchEntries("PHP", { entityCategories: ["organization"] }), []);
});

test("features only the selected open-source-oriented examples", () => {
  assert.deepEqual(featuredEntries.map((entry) => entry.headword), ["WordPress", "GitHub", "PHP", "Miami", "Linus Torvalds"]);
});

test("stores the official expansion and abbreviation type for PHP", () => {
  const php = getEntry("sample_php");
  assert.equal(php.fullForm, "PHP: Hypertext Preprocessor");
  assert.equal(php.abbreviationType, "Recursive acronym");
  assert.equal(php.georgian.spelling, "პიეიჩპი");
  assert.equal(php.georgian.stem, "პიეიჩპი");
  assert.equal(php.inflection.whole.instrumental, "პიეიჩპით");
  assert.equal(php.georgian.finalIRole, "Part of the letter name");
});

test("joins CNN letter names and adds the Georgian nominative marker", () => {
  const cnn = getEntry("sample_cnn");
  assert.equal(cnn.georgian.spelling, "სიენენი");
  assert.equal(cnn.georgian.stem, "სიენენ");
  assert.equal(cnn.georgian.ending, "ი");
  assert.equal(cnn.inflection.whole.genitive, "სიენენის");
  assert.equal(cnn.inflection.latin.paradigm.instrumental, "CNN-ით");
});

test("keeps source language separate from nationality and rule coverage", () => {
  const linus = getEntry("sample_linus_torvalds");
  assert.equal(linus.sourceLanguage, "Swedish");
  assert.equal(linus.sourceVariety, "Finland Swedish");
  assert.equal(linus.sourceRegion, "Finland");
  assert.match(linus.transcriptionBasis, /source-language/);
  assert.deepEqual(Object.keys(linus.pronunciations), ["source"]);
  assert.equal(linus.pronunciations.source.label, "Swedish (Finland)");
});

test("models classification as separate lexical and entity fields", () => {
  const entry = getEntry("sample_microsoft");
  assert.equal(entry.lexicalClass, "Proper noun");
  assert.equal(entry.entityType, "Brand");
});

test("preserves the final-i distinction", () => {
  assert.equal(getEntry("sample_microsoft").georgian.finalIRole, "Nominative case marker");
  assert.equal(getEntry("sample_miami").georgian.finalIRole, "Part of the root");
});

test("stores only the supplied rejected Microsoft spellings", () => {
  assert.deepEqual(getEntry("sample_microsoft").rejectedForms, [
    "მაიქროსოფთი",
    "მიკროსოფტი",
    "მიქროსოფთი",
  ]);
});

test("declares conditional script and component inflection capabilities", () => {
  const personalName = getEntry("sample_steve_jobs");
  assert.equal(personalName.inflection.latinScript, "not_applicable");
  assert.deepEqual(personalName.inflection.scopes, ["whole", "components"]);
  assert.equal(personalName.components.length, 2);
});

test("a component carries its own paradigm, or an all-null one while none is confirmed", () => {
  const keys = CASES.map(([key]) => key);
  sampleEntries.filter((entry) => entry.components).forEach((entry) => {
    entry.components.forEach((component) => assert.deepEqual(Object.keys(component.paradigm), keys));
  });

  const [given, surname] = getEntry("sample_steve_jobs").components;
  assert.equal(given.paradigm.ergative, "სტივმა");
  assert.equal(surname.paradigm.genitive, "ჯობსის");
  assert.equal(surname.stem, "ჯობს");

  // Linus Torvalds stays pending: the component view must say so rather than invent forms.
  getEntry("sample_linus_torvalds").components.forEach((component) => {
    assert.ok(Object.values(component.paradigm).every((value) => value === null));
  });
});

test("all fixtures expose a complete generated Georgian case-table shape", () => {
  const keys = CASES.map(([key]) => key);
  sampleEntries.forEach((entry) => {
    assert.deepEqual(Object.keys(entry.inflection.whole), keys);
    assert.ok(Object.values(entry.inflection.whole).every((value) => typeof value === "string" && value.length > 0));
  });
});

test("generates the requested GitHub Georgian paradigm without hyphens", () => {
  assert.deepEqual(getEntry("sample_github").inflection.whole, {
    nominative: "გიტჰაბი",
    ergative: "გიტჰაბმა",
    dative: "გიტჰაბს",
    genitive: "გიტჰაბის",
    instrumental: "გიტჰაბით",
    adverbial: "გიტჰაბად",
    vocative: "გიტჰაბო",
  });
});

test("unreviewed candidates remain distinct from approved fixtures", () => {
  const figma = getEntry("sample_figma");
  assert.equal(figma.status, "candidate");
  assert.equal(figma.confidence.band, "Medium");
});

test("provides generated Latin-script case forms from recorded sound classes", () => {
  const github = getEntry("sample_github");
  assert.equal(github.inflection.latinScript, "automatic");
  assert.equal(github.inflection.latin.finalSoundClass, "consonant");
  assert.deepEqual(github.inflection.latin.paradigm, {
    nominative: "GitHub / GitHub-ი",
    ergative: "GitHub-მა",
    dative: "GitHub-ს",
    genitive: "GitHub-ის",
    instrumental: "GitHub-ით",
    adverbial: "GitHub-ად",
    vocative: "GitHub / GitHub-ო",
  });

  assert.equal(getEntry("sample_php").inflection.latin.paradigm.instrumental, "PHP-თ");
  assert.equal(getEntry("sample_figma").inflection.latin.paradigm.instrumental, "Figma-თი");
});
