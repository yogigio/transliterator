import test from "node:test";
import assert from "node:assert/strict";
import { createAutomaticCandidateService } from "../src/automatic-candidate-service.js";
import { createInMemoryPronunciationProvider } from "../src/pronunciation-provider.js";

const source = { label: "Editorial fixture", reliability: "editorial" };

test("generates a public candidate from a reliable IPA record", async () => {
  const provider = createInMemoryPronunciationProvider([{
    term: "win", language: "English", readingType: "ordinary_word",
    pronunciations: [{ ipa: "/wɪn/", variety: "General American", source }],
  }]);
  const service = createAutomaticCandidateService({ pronunciationProvider: provider });
  const result = await service.suggest("WIN");

  assert.equal(result.status, "candidate");
  assert.equal(result.suggestions[0].candidate.georgianForm, "უინი");
});

test("returns not_found when no reliable pronunciation record exists", async () => {
  const service = createAutomaticCandidateService({
    pronunciationProvider: createInMemoryPronunciationProvider([]),
  });

  assert.deepEqual(await service.suggest("unknown"), {
    status: "not_found", term: "unknown", suggestions: [],
  });
});

test("keeps unresolved and unverified results in the editorial channel", async () => {
  const provider = createInMemoryPronunciationProvider([
    {
      term: "schwa", language: "English", readingType: "ordinary_word",
      pronunciations: [{ ipa: "/ə/", variety: "General English", source }],
    },
    {
      term: "unverified", language: "English", readingType: "ordinary_word",
      pronunciations: [{
        ipa: "/wɪn/", variety: "General American",
        source: { label: "Submission", reliability: "unverified" },
      }],
    },
  ]);
  const service = createAutomaticCandidateService({ pronunciationProvider: provider });

  for (const term of ["schwa", "unverified"]) {
    const result = await service.suggest(term);
    assert.equal(result.status, "editor_review");
    assert.deepEqual(result.suggestions, []);
    assert.equal(result.editorialResults.length, 1);
  }
});

test("passes the geographical morphology profile into generated inflection", async () => {
  const provider = createInMemoryPronunciationProvider([{
    term: "Cuba", language: "English", readingType: "ordinary_word",
    pronunciations: [{ ipa: "/kuːbɑː/", variety: "Morphology fixture", source }],
  }]);
  const service = createAutomaticCandidateService({ pronunciationProvider: provider });
  const result = await service.suggest("Cuba", { morphologyProfile: "geographic_name" });

  assert.equal(result.suggestions[0].candidate.declensionClass, "geographic_vowel_a_e");
  assert.equal(result.suggestions[0].candidate.inflection.genitive, "კუბის");
  assert.equal(result.suggestions[0].candidate.inflection.instrumental, "კუბით");
});
