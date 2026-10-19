const OUTER_DELIMITERS = [["/", "/"], ["[", "]"]];

export class IpaInputError extends TypeError {
  constructor(code, message) {
    super(message);
    this.name = "IpaInputError";
    this.code = code;
  }
}

function removeOuterDelimiters(value) {
  const pair = OUTER_DELIMITERS.find(([open, close]) => value.startsWith(open) && value.endsWith(close));
  return pair ? value.slice(1, -1) : value;
}

/** Normalize dictionary notation while preserving the submitted IPA verbatim. */
export function normalizeEnglishIpa(ipa) {
  if (typeof ipa !== "string" || !ipa.trim()) {
    throw new IpaInputError("INVALID_IPA", "IPA must be a non-empty string.");
  }

  const original = ipa;
  let normalized = removeOuterDelimiters(ipa.trim().normalize("NFC"));
  normalized = normalized
    .replaceAll("t͡ʃ", "tʃ")
    .replaceAll("d͡ʒ", "dʒ")
    .replaceAll("t͜ʃ", "tʃ")
    .replaceAll("d͜ʒ", "dʒ")
    .replaceAll(":", "ː")
    .replaceAll("əʊ", "oʊ")
    .replaceAll("g", "ɡ")
    .replaceAll("r", "ɹ")
    .replace(/e(?!ɪ)/gu, "ɛ")
    .replace(/\s+/gu, " ");

  return Object.freeze({ original, normalized });
}
