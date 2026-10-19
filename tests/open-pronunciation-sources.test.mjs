import test from "node:test";
import assert from "node:assert/strict";
import {
  arpabetToIpa,
  createCmudictPronunciationProvider,
  createMachinePronunciationProvider,
  createPronunciationSourcePipeline,
  createWiktextractPronunciationProvider,
  mapWiktextractEntry,
} from "../src/open-pronunciation-sources.js";
import { createAutomaticCandidateService } from "../src/automatic-candidate-service.js";

test("maps Wiktextract IPA and dialect tags into a community-sourced record", () => {
  const record = mapWiktextractEntry({
    word: "kit",
    lang_code: "en",
    sounds: [{ ipa: "/kɪt/", tags: ["General-American"] }],
  }, { datasetVersion: "2026-10-19" });

  assert.equal(record.pronunciations[0].variety, "General American");
  assert.equal(record.pronunciations[0].source.reliability, "community");
  assert.equal(record.pronunciations[0].source.datasetVersion, "2026-10-19");
});

test("combines duplicate Wiktextract entries and ignores non-English data", async () => {
  const provider = createWiktextractPronunciationProvider([
    { word: "route", lang_code: "en", sounds: [{ ipa: "/ɹuːt/", tags: ["US"] }] },
    { word: "route", lang_code: "en", sounds: [{ ipa: "/ɹaʊt/", tags: ["US"] }] },
    { word: "route", lang_code: "fr", sounds: [{ ipa: "/ʁut/" }] },
  ]);

  assert.equal((await provider.lookup("ROUTE")).pronunciations.length, 2);
});

test("converts CMUdict ARPAbet into engine-compatible IPA", () => {
  assert.equal(arpabetToIpa("W IH1 N"), "/wˈɪn/");
  assert.equal(arpabetToIpa("S AH0 T IY1"), "/sətˈiː/");
});

test("groups CMUdict pronunciation variants and declines non-word readings", async () => {
  const provider = createCmudictPronunciationProvider({
    ROUTE: "R UW1 T",
    "ROUTE(2)": "R AW1 T",
  });

  assert.equal((await provider.lookup("route", { readingType: "ordinary_word" })).pronunciations.length, 2);
  assert.equal(await provider.lookup("route", { readingType: "initialism" }), null);
});

test("machine fallback is opt-in, cached, and exposed only as a low-trust candidate", async () => {
  let calls = 0;
  const provider = createMachinePronunciationProvider({
    async generate() {
      calls += 1;
      return { ipa: "/wɪn/", variety: "General American", model: "small-g2p" };
    },
  });
  assert.equal(await provider.lookup("win"), null);

  const first = await provider.lookup("win", { allowMachineFallback: true });
  const second = await provider.lookup("WIN", { allowMachineFallback: true });
  assert.equal(calls, 1);
  assert.equal(first, second);
  assert.equal(first.pronunciations[0].source.reliability, "machine");

  const service = createAutomaticCandidateService({ pronunciationProvider: provider });
  const result = await service.suggest("win", { allowMachineFallback: true });
  assert.equal(result.status, "machine_candidate");
  assert.equal(result.suggestions.length, 1);
  assert.equal(result.suggestions[0].publicEligible, false);
});

test("source pipeline prefers reviewed, Wiktextract, and CMUdict data before machine fallback", async () => {
  let machineCalls = 0;
  const pipeline = createPronunciationSourcePipeline({
    wiktextractEntries: [
      { word: "kit", lang_code: "en", sounds: [{ ipa: "/kɪt/", tags: ["US"] }] },
    ],
    cmudictEntries: { WIN: "W IH1 N" },
    machineGenerate: async ({ term }) => {
      machineCalls += 1;
      return { ipa: "/tɛst/", variety: "Machine English", model: `tiny-${term}` };
    },
  });

  assert.equal((await pipeline.lookup("kit", { allowMachineFallback: true })).pronunciations[0].source.reliability, "community");
  assert.equal((await pipeline.lookup("win", { allowMachineFallback: true })).pronunciations[0].source.reliability, "converted");
  assert.equal(machineCalls, 0);
  assert.equal((await pipeline.lookup("novelname", { allowMachineFallback: true })).pronunciations[0].source.reliability, "machine");
  assert.equal(machineCalls, 1);
});
