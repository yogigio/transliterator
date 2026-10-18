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

test("features only the selected open-source-oriented examples", () => {
  assert.deepEqual(featuredEntries.map((entry) => entry.headword), ["WordPress", "GitHub", "PHP", "Miami", "Linus Torvalds"]);
});

test("stores the official expansion and abbreviation type for PHP", () => {
  const php = getEntry("sample_php");
  assert.equal(php.fullForm, "PHP: Hypertext Preprocessor");
  assert.equal(php.abbreviationType, "Recursive acronym");
  assert.equal(php.georgian.finalIRole, "Part of the letter name");
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

test("all fixtures expose a complete case-table shape without invented forms", () => {
  const keys = CASES.map(([key]) => key);
  sampleEntries.forEach((entry) => {
    assert.deepEqual(Object.keys(entry.inflection.whole), keys);
    assert.ok(Object.values(entry.inflection.whole).every((value) => value === null));
  });
});

test("automatic suggestions remain visibly distinct from approved fixtures", () => {
  const figma = getEntry("sample_figma");
  assert.equal(figma.status, "automatic");
  assert.equal(figma.confidence.band, "Medium");
});
