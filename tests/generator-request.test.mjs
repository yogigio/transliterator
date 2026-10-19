import test from "node:test";
import assert from "node:assert/strict";
import { validateGeneratorRequest } from "../src/generator-request.js";
import { createTransliterationGenerator } from "../src/transliteration-generator.js";
import { createAutomaticCandidateService } from "../src/automatic-candidate-service.js";
import { createInMemoryPronunciationProvider } from "../src/pronunciation-provider.js";

test("normalizes ordinary-word generator metadata", () => {
  assert.deepEqual(validateGeneratorRequest({ term: " win ", lexicalClass: "ordinary_word" }), {
    term: "win",
    sourceLanguage: "English",
    lexicalClass: "ordinary_word",
    entityType: "not_applicable",
    readingType: "ordinary_word",
  });
});

test("requires entity metadata for proper nouns", () => {
  assert.throws(
    () => validateGeneratorRequest({ term: "Lee", lexicalClass: "proper_noun" }),
    (error) => error.code === "ENTITY_TYPE_REQUIRED",
  );
});

test("requires an authoritative abbreviation reading type", () => {
  assert.throws(
    () => validateGeneratorRequest({ term: "PHP", lexicalClass: "abbreviation" }),
    (error) => error.code === "READING_TYPE_REQUIRED",
  );
});

test("withholds a candidate when selected and recorded reading types conflict", async () => {
  const generator = createTransliterationGenerator({
    candidateService: {
      async suggest() {
        return { status: "candidate", readingType: "acronym", suggestions: [{ candidate: {} }] };
      },
    },
  });
  const result = await generator.generate({ term: "NATO", lexicalClass: "abbreviation", readingType: "initialism" });
  assert.equal(result.status, "editor_review");
  assert.equal(result.reason, "reading_type_mismatch");
  assert.deepEqual(result.suggestions, []);
  assert.equal(result.policy.strategy.id, "english_initialism_letter_names");
});

test("generates a joined Georgian initialism through the classified service boundary", async () => {
  const provider = createInMemoryPronunciationProvider([{
    term: "PHP",
    language: "English",
    readingType: "initialism",
    pronunciations: [{
      ipa: "/piːeɪtʃpiː/",
      variety: "General English",
      source: { label: "Editorial fixture", reliability: "editorial" },
    }],
  }]);
  const generator = createTransliterationGenerator({
    candidateService: createAutomaticCandidateService({ pronunciationProvider: provider }),
  });
  const result = await generator.generate({ term: "PHP", lexicalClass: "abbreviation", readingType: "initialism" });
  assert.equal(result.status, "candidate");
  assert.equal(result.suggestions[0].candidate.georgianForm, "პიეიჩპი");
  assert.equal(result.policy.id, "abbreviation.initialism.english_ipa");
  assert.equal(result.policy.strategy.label, "English letter names");
});

test("passes the resolved policy and reading strategy to the candidate service", async () => {
  let receivedOptions;
  const generator = createTransliterationGenerator({
    candidateService: {
      async suggest(_term, options) {
        receivedOptions = options;
        return { status: "not_found", suggestions: [] };
      },
    },
  });
  const result = await generator.generate({
    term: "Cambridge",
    lexicalClass: "proper_noun",
    entityType: "geographic_name",
  });
  assert.equal(receivedOptions.generationPolicy, "proper_noun.geographic_name.english_ipa");
  assert.equal(receivedOptions.readingType, "ordinary_word");
  assert.equal(receivedOptions.morphologyProfile, "geographic_name");
  assert.equal(result.policy.label, "Geographic name");
  assert.match(result.warnings[0], /exonym/);
});

test("passes the lexical class through so name-suffix rules reach the engine", async () => {
  const provider = createInMemoryPronunciationProvider([{
    term: "Portland", language: "English", readingType: "ordinary_word",
    pronunciations: [{ ipa: "/ˈpɔːɹtlənd/", variety: "General American", source: { label: "Editorial dictionary", reliability: "verified" } }],
  }]);
  const generator = createTransliterationGenerator({ candidateService: createAutomaticCandidateService({ pronunciationProvider: provider }) });

  const name = await generator.generate({ term: "Portland", lexicalClass: "proper_noun", entityType: "geographic_name" });
  const word = await generator.generate({ term: "Portland", lexicalClass: "ordinary_word" });
  assert.equal(name.suggestions[0].candidate.georgianForm, "პორტლენდი");
  assert.equal(word.suggestions[0].candidate.georgianForm, "პორტლანდი");
});
