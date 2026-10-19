import { ENGLISH_READING_TYPES, PRONUNCIATION_RELIABILITY } from "./english-ipa-rules.js";

export class PronunciationProviderError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "PronunciationProviderError";
    this.code = code;
  }
}

const normalizeKey = (value) => String(value ?? "").trim().toLocaleLowerCase("en");

function validateSource(source) {
  return Boolean(
    source
    && typeof source.label === "string"
    && source.label.trim()
    && PRONUNCIATION_RELIABILITY.includes(source.reliability),
  );
}

export function validatePronunciationRecord(record) {
  if (!record || typeof record !== "object") {
    throw new PronunciationProviderError("INVALID_RECORD", "Pronunciation record must be an object.");
  }
  if (typeof record.term !== "string" || !record.term.trim()) {
    throw new PronunciationProviderError("INVALID_TERM", "Pronunciation record requires a term.");
  }
  if (record.language !== "English") {
    throw new PronunciationProviderError("NON_ENGLISH_RECORD", "Only English pronunciation records are supported.");
  }
  if (!ENGLISH_READING_TYPES.includes(record.readingType)) {
    throw new PronunciationProviderError("INVALID_READING_TYPE", "Pronunciation record requires authoritative readingType metadata.");
  }
  if (!Array.isArray(record.pronunciations) || record.pronunciations.length === 0) {
    throw new PronunciationProviderError("MISSING_PRONUNCIATIONS", "Pronunciation record requires at least one pronunciation.");
  }

  record.pronunciations.forEach((pronunciation) => {
    if (
      !pronunciation
      || typeof pronunciation.ipa !== "string"
      || !pronunciation.ipa.trim()
      || typeof pronunciation.variety !== "string"
      || !pronunciation.variety.trim()
      || !validateSource(pronunciation.source)
    ) {
      throw new PronunciationProviderError(
        "INVALID_PRONUNCIATION",
        "Each pronunciation requires IPA, variety, and source reliability metadata.",
      );
    }
  });

  return record;
}

export function createInMemoryPronunciationProvider(records = []) {
  const index = new Map();
  records.forEach((record) => {
    validatePronunciationRecord(record);
    index.set(normalizeKey(record.term), Object.freeze(record));
    (record.aliases ?? []).forEach((alias) => index.set(normalizeKey(alias), Object.freeze(record)));
  });

  return Object.freeze({
    kind: "in_memory",
    async lookup(term) {
      return index.get(normalizeKey(term)) ?? null;
    },
  });
}

export function createHttpPronunciationProvider({ endpoint, fetchImpl = globalThis.fetch } = {}) {
  if (typeof endpoint !== "string" || !endpoint.trim()) {
    throw new PronunciationProviderError("INVALID_ENDPOINT", "A pronunciation endpoint is required.");
  }
  if (typeof fetchImpl !== "function") {
    throw new PronunciationProviderError("FETCH_UNAVAILABLE", "A fetch implementation is required.");
  }

  return Object.freeze({
    kind: "http",
    async lookup(term, { signal } = {}) {
      const url = new URL(endpoint, globalThis.location?.href ?? "http://localhost/");
      url.searchParams.set("term", String(term ?? "").trim());
      let response;
      try {
        response = await fetchImpl(url, { headers: { accept: "application/json" }, signal });
      } catch (error) {
        throw new PronunciationProviderError("PROVIDER_UNAVAILABLE", "Pronunciation provider could not be reached.", { cause: error });
      }
      if (response.status === 404) return null;
      if (!response.ok) {
        throw new PronunciationProviderError("PROVIDER_RESPONSE_ERROR", `Pronunciation provider returned ${response.status}.`);
      }
      const record = await response.json();
      return validatePronunciationRecord(record);
    },
  });
}
