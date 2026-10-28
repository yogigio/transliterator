import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLatinColumnMode, resolveLatinColumn } from "../src/latin-column.js?v=0.10.17";

const CASES = ["nominative", "ergative", "dative", "genitive", "instrumental", "adverbial", "vocative"];
const empty = () => Object.fromEntries(CASES.map((key) => [key, null]));
const inflection = (latinScript, latin) => ({ latinScript, latin });

test("the mode attribute falls back to auto on anything unknown", () => {
  assert.equal(normalizeLatinColumnMode("NEVER"), "never");
  assert.equal(normalizeLatinColumnMode(" always "), "always");
  assert.equal(normalizeLatinColumnMode("sometimes"), "auto");
  assert.equal(normalizeLatinColumnMode(null), "auto");
});

test("an entry marked not_applicable never draws the column, whatever the mode", () => {
  for (const mode of ["auto", "always", "never"]) {
    assert.equal(resolveLatinColumn(inflection("not_applicable", { paradigm: { ...empty(), nominative: "Miami" } }), CASES, mode), null);
  }
});

test("stored Latin forms are shown as they are, with missing cases left null", () => {
  const result = resolveLatinColumn(inflection("regular", { paradigm: { ...empty(), nominative: "Microsoft", ergative: "Microsoft-მა" } }), CASES);
  assert.equal(result.generated, false);
  assert.equal(result.paradigm.ergative, "Microsoft-მა");
  assert.equal(result.paradigm.dative, null);
});

test("no forms and nothing to generate from: no column (auto), an empty one only when asked for", () => {
  const bare = inflection("unknown", { paradigm: empty() });
  assert.equal(resolveLatinColumn(bare, CASES), null);
  assert.equal(resolveLatinColumn(inflection("unknown", undefined), CASES), null);
  const legacy = resolveLatinColumn(bare, CASES, "always");
  assert.deepEqual(legacy.paradigm, empty());
});

test("a recorded stem and final sound produce the forms when none are stored", () => {
  const result = resolveLatinColumn(inflection("unknown", { paradigm: empty(), stem: "GitHub", soundClass: "consonant" }), CASES);
  assert.equal(result.generated, true);
  assert.equal(result.paradigm.ergative, "GitHub-მა");
  assert.equal(result.paradigm.genitive, "GitHub-ის");
  const vowel = resolveLatinColumn(inflection("regular", { paradigm: empty(), stem: "PHP", soundClass: "vowel_i" }), CASES);
  assert.equal(vowel.paradigm.instrumental, "PHP-თ");
  const other = resolveLatinColumn(inflection("regular", { paradigm: empty(), stem: "Figma", soundClass: "vowel_other" }), CASES);
  assert.equal(other.paradigm.instrumental, "Figma-თი");
});

test("an editor's invariable, irregular or component-only verdict is not overridden by generation", () => {
  for (const state of ["invariable", "irregular", "component_only"]) {
    assert.equal(resolveLatinColumn(inflection(state, { paradigm: empty(), stem: "GitHub", soundClass: "consonant" }), CASES), null, state);
  }
});

test("stored forms win over generation", () => {
  const result = resolveLatinColumn(inflection("regular", { paradigm: { ...empty(), nominative: "X" }, stem: "GitHub", soundClass: "consonant" }), CASES);
  assert.equal(result.generated, false);
  assert.equal(result.paradigm.genitive, null);
});

test("a stem the inflector refuses, or an unknown sound class, quietly yields no column", () => {
  assert.equal(resolveLatinColumn(inflection("regular", { paradigm: empty(), stem: "მაიამი", soundClass: "consonant" }), CASES), null);
  assert.equal(resolveLatinColumn(inflection("regular", { paradigm: empty(), stem: "GitHub", soundClass: "nasal" }), CASES), null);
  assert.equal(resolveLatinColumn(inflection("regular", { paradigm: empty(), stem: "  ", soundClass: "consonant" }), CASES), null);
});

test("never hides the column even when forms are stored", () => {
  assert.equal(resolveLatinColumn(inflection("regular", { paradigm: { ...empty(), nominative: "X" } }), CASES, "never"), null);
});
