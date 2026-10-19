import test from "node:test";
import assert from "node:assert/strict";
import {
  PronunciationProviderError,
  createHttpPronunciationProvider,
  createInMemoryPronunciationProvider,
} from "../src/pronunciation-provider.js";

const record = {
  term: "Lee",
  aliases: ["lee"],
  language: "English",
  readingType: "ordinary_word",
  pronunciations: [{
    ipa: "/liː/",
    variety: "General English",
    source: { label: "Editorial fixture", reliability: "editorial" },
  }],
};

test("looks up validated pronunciation records case-insensitively", async () => {
  const provider = createInMemoryPronunciationProvider([record]);

  assert.equal((await provider.lookup("LEE")).term, "Lee");
  assert.equal(await provider.lookup("unknown"), null);
});

test("rejects pronunciation records without authoritative metadata", () => {
  assert.throws(
    () => createInMemoryPronunciationProvider([{ ...record, readingType: "guessed" }]),
    (error) => error instanceof PronunciationProviderError && error.code === "INVALID_READING_TYPE",
  );
});

test("HTTP provider treats 404 as no pronunciation record", async () => {
  const provider = createHttpPronunciationProvider({
    endpoint: "https://example.test/pronunciations",
    fetchImpl: async () => ({ status: 404, ok: false }),
  });

  assert.equal(await provider.lookup("Lee"), null);
});

test("HTTP provider validates successful response data", async () => {
  let requestedUrl;
  const provider = createHttpPronunciationProvider({
    endpoint: "https://example.test/pronunciations",
    fetchImpl: async (url) => {
      requestedUrl = url;
      return { status: 200, ok: true, json: async () => record };
    },
  });

  assert.equal((await provider.lookup("Lee")).term, "Lee");
  assert.equal(requestedUrl.searchParams.get("term"), "Lee");
});
