import test from "node:test";
import assert from "node:assert/strict";
import { normalizeEnglishIpa } from "../src/ipa-normalizer.js";
import { tokenizeEnglishIpa } from "../src/ipa-tokenizer.js";

test("normalizes equivalent IPA notation while preserving the original", () => {
  const result = normalizeEnglishIpa("/ˈgetəʊr/");

  assert.equal(result.original, "/ˈgetəʊr/");
  assert.equal(result.normalized, "ˈɡɛtoʊɹ");
});

test("tokenizes affricates and diphthongs as single phonemes", () => {
  const result = tokenizeEnglishIpa("/ˌpiː.eɪt͡ʃˈpiː/");

  assert.deepEqual(
    result.tokens.filter(({ type }) => type === "phoneme").map(({ value }) => value),
    ["p", "iː", "eɪ", "tʃ", "p", "iː"],
  );
  assert.deepEqual(
    result.tokens.filter(({ type }) => type.endsWith("stress")).map(({ type }) => type),
    ["secondary_stress", "primary_stress"],
  );
});

test("retains word and morpheme boundaries for later context rules", () => {
  const result = tokenizeEnglishIpa("/spɹɪŋ|hɪl laɪn/");

  assert.equal(result.tokens.some(({ type }) => type === "morpheme_boundary"), true);
  assert.equal(result.tokens.some(({ type }) => type === "word_boundary"), true);
  assert.deepEqual(result.unknown, []);
});

test("reports unsupported IPA symbols instead of silently dropping them", () => {
  const result = tokenizeEnglishIpa("/pɐ/");

  assert.deepEqual(result.unknown.map(({ value }) => value), ["ɐ"]);
});
