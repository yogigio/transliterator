import test from "node:test";
import assert from "node:assert/strict";
import { EnglishIpaEngineError, MORPHOLOGY_PROFILES, transcribeEnglishIpa } from "../src/english-ipa-engine.js";

const verified = Object.freeze({ label: "Editorial dictionary", reliability: "verified" });
const baseMetadata = Object.freeze({ language: "English", variety: "General American" });

test("transcribes a verified consonant-final English pronunciation", () => {
  const result = transcribeEnglishIpa({
    ...baseMetadata,
    surface: "GitHub",
    readingType: "ordinary_word",
    ipa: "/ˈɡɪt.hʌb/",
    pronunciationSource: verified,
  });

  assert.equal(result.candidate.georgianStem, "გიტჰაბ");
  assert.equal(result.candidate.georgianForm, "გიტჰაბი");
  assert.equal(result.candidate.finalRootVowel, "none");
  assert.equal(result.candidate.inflection.genitive, "გიტჰაბის");
  assert.equal(result.publicEligible, true);
});

test("concatenates an initialism without internal spaces or hyphens", () => {
  const php = transcribeEnglishIpa({
    ...baseMetadata,
    surface: "PHP",
    readingType: "initialism",
    ipa: "/ˌpiː.eɪtʃˈpiː/",
    pronunciationSource: verified,
  });
  const cnn = transcribeEnglishIpa({
    ...baseMetadata,
    surface: "CNN",
    readingType: "initialism",
    ipa: "/ˌsiː.ɛnˈɛn/",
    pronunciationSource: verified,
  });

  assert.equal(php.candidate.georgianForm, "პიეიჩპი");
  assert.equal(php.candidate.declensionClass, "vowel_i");
  assert.equal(cnn.candidate.georgianStem, "სიენენ");
  assert.equal(cnn.candidate.georgianForm, "სიენენი");
});

test("treats final short, long, and lax i as Georgian root-final ი", () => {
  const inputs = [
    ["city", "/ˈsɪti/", "სიტი"],
    ["Lee", "/liː/", "ლი"],
    ["test-final-lax-i", "/lɪ/", "ლი"],
  ];

  inputs.forEach(([surface, ipa, expected]) => {
    const result = transcribeEnglishIpa({
      ...baseMetadata,
      surface,
      readingType: "ordinary_word",
      ipa,
      pronunciationSource: verified,
    });
    assert.equal(result.candidate.georgianForm, expected);
    assert.equal(result.candidate.finalRootVowel, "ი");
    assert.equal(result.candidate.declensionClass, "vowel_i");
  });
});

test("uses the geographical a/e declension profile without changing transcription", () => {
  const result = transcribeEnglishIpa({
    ...baseMetadata,
    surface: "Cuba",
    readingType: "ordinary_word",
    ipa: "/kuːbɑː/",
    pronunciationSource: verified,
    morphologyProfile: MORPHOLOGY_PROFILES.GEOGRAPHIC_NAME,
  });

  assert.equal(result.candidate.georgianForm, "კუბა");
  assert.equal(result.candidate.declensionClass, "geographic_vowel_a_e");
  assert.equal(result.candidate.inflection.genitive, "კუბის");
  assert.equal(result.candidate.inflection.instrumental, "კუბით");
});

test("applies the positional w rule from IPA rather than spelling", () => {
  const initial = transcribeEnglishIpa({
    ...baseMetadata,
    surface: "win",
    readingType: "ordinary_word",
    ipa: "/wɪn/",
    pronunciationSource: verified,
  });
  const medial = transcribeEnglishIpa({
    ...baseMetadata,
    surface: "made-up medial w fixture",
    readingType: "ordinary_word",
    ipa: "/dɛwɛl/",
    pronunciationSource: verified,
  });

  assert.equal(initial.candidate.georgianForm, "უინი");
  assert.equal(medial.candidate.georgianForm, "დეველი");
});

test("withholds a candidate when schwa cannot yet be resolved", () => {
  const result = transcribeEnglishIpa({
    ...baseMetadata,
    surface: "Birmingham",
    readingType: "ordinary_word",
    ipa: "/ˈbɜːmɪŋəm/",
    pronunciationSource: verified,
  });

  assert.equal(result.candidate, null);
  assert.equal(result.publicEligible, false);
  assert.equal(result.visibility, "editor_only");
  assert.equal(result.reviewReasons.includes("unresolved_ipa_context"), true);
  assert.deepEqual(result.alternatives, []);
});

test("keeps candidates based on unverified pronunciation editor-only", () => {
  const result = transcribeEnglishIpa({
    ...baseMetadata,
    surface: "GitHub",
    readingType: "ordinary_word",
    ipa: "/ˈɡɪt.hʌb/",
    pronunciationSource: { label: "Unverified submission", reliability: "unverified" },
  });

  assert.equal(result.candidate.georgianForm, "გიტჰაბი");
  assert.equal(result.visibility, "editor_only");
  assert.equal(result.publicEligible, false);
  assert.deepEqual(result.reviewReasons, ["pronunciation_source_not_verified"]);
});

test("requires authoritative reading-type and pronunciation-source metadata", () => {
  assert.throws(
    () => transcribeEnglishIpa({ ...baseMetadata, surface: "NATO", ipa: "/ˈneɪtoʊ/", pronunciationSource: verified }),
    (error) => error instanceof EnglishIpaEngineError && error.code === "READING_TYPE_REQUIRED",
  );
  assert.throws(
    () => transcribeEnglishIpa({ ...baseMetadata, surface: "NATO", readingType: "acronym", ipa: "/ˈneɪtoʊ/" }),
    (error) => error instanceof EnglishIpaEngineError && error.code === "PRONUNCIATION_SOURCE_REQUIRED",
  );
});

test("rejects non-English input and missing pronunciation variety", () => {
  assert.throws(
    () => transcribeEnglishIpa({
      surface: "Paris", language: "French", variety: "Metropolitan French",
      readingType: "ordinary_word", ipa: "/paʁi/", pronunciationSource: verified,
    }),
    (error) => error instanceof EnglishIpaEngineError && error.code === "NON_ENGLISH_SOURCE",
  );
  assert.throws(
    () => transcribeEnglishIpa({
      surface: "NATO", language: "English", readingType: "acronym",
      ipa: "/ˈneɪtoʊ/", pronunciationSource: verified,
    }),
    (error) => error instanceof EnglishIpaEngineError && error.code === "PRONUNCIATION_VARIETY_REQUIRED",
  );
});
