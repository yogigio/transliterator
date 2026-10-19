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
  assert.deepEqual(result.pronunciationSource, verified);
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

test("writes no vowel for a syllabic word-final l", () => {
  const apple = transcribeEnglishIpa({ ...baseMetadata, surface: "apple", readingType: "ordinary_word", ipa: "/ˈæpəl/", pronunciationSource: verified });
  const table = transcribeEnglishIpa({ ...baseMetadata, surface: "table", readingType: "ordinary_word", ipa: "/ˈteɪbəl/", pronunciationSource: verified });
  const cmudictStress = transcribeEnglishIpa({ ...baseMetadata, surface: "table", readingType: "ordinary_word", ipa: "/tˈeɪbəl/", pronunciationSource: verified });

  assert.equal(apple.candidate.georgianForm, "ეპლი");
  assert.equal(table.candidate.georgianForm, "ტეიბლი");
  assert.equal(cmudictStress.candidate.georgianForm, "ტეიბლი");
  assert.equal(apple.candidate.declensionClass, "consonant");
  assert.equal(apple.trace.some((item) => item.ruleId === "english.ipa.schwa.syllabic-final-l"), true);
});

test("leaves every other schwa context to an editor", () => {
  for (const ipa of ["/əˈbaʊt/", "/ˈæpəlz/", "/ˈæpəlɪŋ/", "/ˈæpəl.pai/", "/ˈɑːməl/"]) {
    const result = transcribeEnglishIpa({ ...baseMetadata, surface: "x", readingType: "ordinary_word", ipa, pronunciationSource: verified });
    if (ipa === "/ˈɑːməl/") {
      assert.equal(result.candidate.georgianForm, "ამლი", ipa);
    } else {
      assert.equal(result.candidate, null, ipa);
    }
  }
});

const generate = (surface, ipa, overrides = {}) => transcribeEnglishIpa({
  ...baseMetadata, surface, readingType: "ordinary_word", ipa, pronunciationSource: verified, ...overrides,
}).candidate?.georgianForm ?? null;

test("lets the written vowel decide /oʊ/ between ო and ოუ", () => {
  assert.equal(generate("Microsoft", "/mˈaɪkɹˌoʊsˈɔːft/"), "მაიკროსოფტი");
  assert.equal(generate("Nokia", "/nˈoʊkiːə/"), "ნოკია");
  assert.equal(generate("Snowden", "/snˈoʊdən/"), "სნოუდენი");
  assert.equal(generate("window", "/ˈwɪndoʊ/"), "უინდოუ");
  assert.equal(generate("NATO", "/ˈneɪtoʊ/"), "ნეიტო");
});

test("keeps the IPA default for /oʊ/ when the spelling cannot be aligned", () => {
  assert.equal(generate("Microsoft Corp", "/mˈaɪkɹˌoʊsˈɔːft/"), "მაიკროუსოფტი");
});

test("resolves an unstressed schwa from the vowel letter that spells it", () => {
  assert.equal(generate("Obama", "/ˌoʊbˈɑːmə/"), "ობამა");
  assert.equal(generate("Nokia", "/nˈoʊkiːə/"), "ნოკია");
  assert.equal(generate("Oracle", "/ˈɔːɹəkəl/"), "ორაკლი");
  assert.equal(generate("Snowden", "/snˈoʊdən/"), "სნოუდენი");
});

test("lets the written vowel decide back /ɑ/ between ა and ო", () => {
  assert.equal(generate("Photoshop", "/fˈoʊtˌoʊʃˌɑːp/"), "ფოტოშოპი");
  assert.equal(generate("Carl", "/kˈɑːɹl/"), "კარლი");
});

test("does not guess when the spelling and the IPA cannot be lined up", () => {
  assert.equal(generate("x", "/ˈæpəlɪŋ/"), null);
  assert.equal(generate("Nokia Inc", "/nˈoʊkiːə/"), null);
  assert.equal(generate("Nokia", "/nˈoʊkiːə/", { readingType: "initialism" }), null);
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
