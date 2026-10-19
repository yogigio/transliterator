import test from "node:test";
import assert from "node:assert/strict";
import { resolveGenerationPolicy } from "../src/generation-policies.js";

test("selects the ordinary English-word IPA strategy", () => {
  const policy = resolveGenerationPolicy({ lexicalClass: "ordinary_word", readingType: "ordinary_word" });
  assert.equal(policy.id, "ordinary_word.english_ipa");
  assert.equal(policy.strategy.expectedReadingType, "ordinary_word");
  assert.deepEqual(policy.checks, []);
});

test("adds the exonym check to the geographic-name policy", () => {
  const policy = resolveGenerationPolicy({
    lexicalClass: "proper_noun",
    entityType: "geographic_name",
    readingType: "ordinary_word",
  });
  assert.equal(policy.strategy.id, "english_proper_noun_ipa");
  assert.equal(policy.morphologyProfile, "geographic_name");
  assert.equal(policy.checks[0].code, "check_established_exonym");
});

test("keeps personal names eligible for confidence-based output while adding a pronunciation check", () => {
  const policy = resolveGenerationPolicy({
    lexicalClass: "proper_noun",
    entityType: "personal_name",
    readingType: "ordinary_word",
  });
  assert.equal(policy.id, "proper_noun.personal_name.english_ipa");
  assert.equal(policy.checks[0].code, "confirm_source_pronunciation");
});

test("distinguishes initialism and acronym strategies", () => {
  const initialism = resolveGenerationPolicy({ lexicalClass: "abbreviation", readingType: "initialism" });
  const acronym = resolveGenerationPolicy({ lexicalClass: "abbreviation", readingType: "acronym" });
  assert.equal(initialism.strategy.id, "english_initialism_letter_names");
  assert.equal(acronym.strategy.id, "english_acronym_word");
  assert.ok(acronym.checks.some(({ code }) => code === "check_conventional_acronym_form"));
});

