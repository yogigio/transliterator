import {
  PronunciationProviderError,
  createFallbackPronunciationProvider,
  createInMemoryPronunciationProvider,
  validatePronunciationRecord,
} from "./pronunciation-provider.js";

const normalizeKey = (value) => String(value ?? "").trim().toLocaleLowerCase("en");

const ARPABET_TO_IPA = Object.freeze({
  AA: "ɑː", AE: "æ", AH: "ʌ", AO: "ɔː", AW: "aʊ", AY: "aɪ",
  EH: "ɛ", ER: "ɝ", EY: "eɪ", IH: "ɪ", IY: "iː", OW: "oʊ",
  OY: "ɔɪ", UH: "ʊ", UW: "uː",
  B: "b", CH: "tʃ", D: "d", DH: "ð", F: "f", G: "ɡ", HH: "h",
  JH: "dʒ", K: "k", L: "l", M: "m", N: "n", NG: "ŋ", P: "p",
  R: "ɹ", S: "s", SH: "ʃ", T: "t", TH: "θ", V: "v", W: "w",
  Y: "j", Z: "z", ZH: "ʒ",
});

const VOWEL_PHONES = new Set([
  "AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY", "IH", "IY", "OW", "OY", "UH", "UW",
]);

const WIKTEXTRACT_SOURCE = Object.freeze({
  label: "English Wiktionary via Wiktextract",
  reliability: "community",
  license: "CC BY-SA 4.0 / GFDL",
  url: "https://kaikki.org/dictionary/rawdata.html",
});

const CMUDICT_SOURCE = Object.freeze({
  label: "CMU Pronouncing Dictionary (converted from ARPAbet)",
  reliability: "converted",
  license: "CMU unrestricted-use terms; attribution requested",
  url: "https://github.com/cmusphinx/cmudict",
});

function pronunciationVariety(tags = []) {
  const normalized = tags.map((tag) => normalizeKey(tag).replaceAll("_", "-"));
  if (normalized.some((tag) => ["us", "general-american", "ga", "america"].includes(tag))) {
    return "General American";
  }
  if (normalized.some((tag) => ["uk", "britain", "received-pronunciation", "rp"].includes(tag))) {
    return "British English";
  }
  return "General English";
}

function uniquePronunciations(pronunciations) {
  const seen = new Set();
  return pronunciations.filter(({ ipa, variety }) => {
    const key = `${ipa}\u0000${variety}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mapWiktextractEntry(entry, { datasetVersion } = {}) {
  if (!entry || entry.lang_code !== "en" || typeof entry.word !== "string") return null;
  const pronunciations = uniquePronunciations((entry.sounds ?? [])
    .filter((sound) => typeof sound?.ipa === "string" && sound.ipa.trim())
    .map((sound) => Object.freeze({
      ipa: sound.ipa.trim(),
      variety: pronunciationVariety(sound.tags),
      source: Object.freeze({
        ...WIKTEXTRACT_SOURCE,
        ...(datasetVersion ? { datasetVersion } : {}),
      }),
    })));
  if (!pronunciations.length) return null;
  return validatePronunciationRecord({
    term: entry.word.trim(),
    language: "English",
    readingType: "ordinary_word",
    pronunciations,
  });
}

export function createWiktextractPronunciationProvider(entries = [], options = {}) {
  const grouped = new Map();
  entries.forEach((entry) => {
    const record = mapWiktextractEntry(entry, options);
    if (!record) return;
    const key = normalizeKey(record.term);
    const previous = grouped.get(key);
    grouped.set(key, previous
      ? { ...previous, pronunciations: uniquePronunciations([...previous.pronunciations, ...record.pronunciations]) }
      : record);
  });
  return createInMemoryPronunciationProvider([...grouped.values()]);
}

export function arpabetToIpa(pronunciation) {
  const tokens = String(pronunciation ?? "").trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) {
    throw new PronunciationProviderError("INVALID_ARPABET", "ARPAbet pronunciation is required.");
  }
  const ipa = tokens.map((token) => {
    const match = /^([A-Z]+)([012])?$/.exec(token);
    const phone = match?.[1];
    const stress = match?.[2];
    if (!phone || !ARPABET_TO_IPA[phone]) {
      throw new PronunciationProviderError("UNSUPPORTED_ARPABET", `Unsupported ARPAbet phone: ${token}`);
    }
    let output = ARPABET_TO_IPA[phone];
    if (phone === "AH" && stress === "0") output = "ə";
    if (phone === "ER" && stress === "0") output = "ɚ";
    if (VOWEL_PHONES.has(phone) && stress === "1") output = `ˈ${output}`;
    if (VOWEL_PHONES.has(phone) && stress === "2") output = `ˌ${output}`;
    return output;
  }).join("");
  return `/${ipa}/`;
}

export function createCmudictPronunciationProvider(entries = {}, { datasetVersion } = {}) {
  const grouped = new Map();
  Object.entries(entries).forEach(([rawTerm, arpabet]) => {
    const term = rawTerm.replace(/\(\d+\)$/, "");
    const key = normalizeKey(term);
    const pronunciation = Object.freeze({
      ipa: arpabetToIpa(arpabet),
      variety: "General American",
      source: Object.freeze({
        ...CMUDICT_SOURCE,
        ...(datasetVersion ? { datasetVersion } : {}),
      }),
    });
    const record = grouped.get(key) ?? {
      term,
      language: "English",
      readingType: "ordinary_word",
      pronunciations: [],
    };
    record.pronunciations.push(pronunciation);
    grouped.set(key, record);
  });
  const provider = createInMemoryPronunciationProvider([...grouped.values()].map((record) => ({
    ...record,
    pronunciations: uniquePronunciations(record.pronunciations),
  })));
  return Object.freeze({
    kind: "cmudict",
    async lookup(term, options = {}) {
      if (options.readingType && options.readingType !== "ordinary_word") return null;
      return provider.lookup(term, options);
    },
  });
}

export function createMachinePronunciationProvider({ generate, cache = new Map() } = {}) {
  if (typeof generate !== "function") {
    throw new PronunciationProviderError("MISSING_GENERATOR", "A machine pronunciation generator is required.");
  }
  return Object.freeze({
    kind: "machine",
    async lookup(term, options = {}) {
      if (options.allowMachineFallback !== true) return null;
      const normalizedTerm = String(term ?? "").trim();
      if (!normalizedTerm) return null;
      const readingType = options.readingType ?? "ordinary_word";
      const cacheKey = `${normalizeKey(normalizedTerm)}\u0000${readingType}`;
      if (cache.has(cacheKey)) return cache.get(cacheKey);

      const generated = await generate(Object.freeze({
        term: normalizedTerm,
        language: "English",
        readingType,
      }));
      if (!generated) {
        cache.set(cacheKey, null);
        return null;
      }
      const pronunciations = (Array.isArray(generated.pronunciations)
        ? generated.pronunciations
        : [generated]).map((item) => Object.freeze({
        ipa: item.ipa,
        variety: item.variety ?? "Machine-estimated English",
        source: Object.freeze({
          label: item.model ? `Machine-generated pronunciation (${item.model})` : "Machine-generated pronunciation",
          reliability: "machine",
          method: "machine_generated",
          ...(item.model ? { model: item.model } : {}),
          ...(item.modelVersion ? { datasetVersion: item.modelVersion } : {}),
        }),
      }));
      const record = validatePronunciationRecord({
        term: normalizedTerm,
        language: "English",
        readingType,
        pronunciations,
      });
      cache.set(cacheKey, record);
      return record;
    },
  });
}

export function createPronunciationSourcePipeline({
  reviewedRecords = [],
  wiktextractEntries = [],
  cmudictEntries = {},
  machineGenerate,
  machineCache,
  wiktextractVersion,
  cmudictVersion,
} = {}) {
  const providers = [];
  if (reviewedRecords.length) providers.push(createInMemoryPronunciationProvider(reviewedRecords));
  if (wiktextractEntries.length) {
    providers.push(createWiktextractPronunciationProvider(
      wiktextractEntries,
      { datasetVersion: wiktextractVersion },
    ));
  }
  if (Object.keys(cmudictEntries).length) {
    providers.push(createCmudictPronunciationProvider(
      cmudictEntries,
      { datasetVersion: cmudictVersion },
    ));
  }
  if (machineGenerate) {
    providers.push(createMachinePronunciationProvider({ generate: machineGenerate, cache: machineCache }));
  }
  return createFallbackPronunciationProvider(providers);
}
