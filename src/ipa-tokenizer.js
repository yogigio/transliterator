import { IPA_TOKEN_INVENTORY } from "./english-ipa-rules.js";
import { normalizeEnglishIpa } from "./ipa-normalizer.js";

const MARKERS = Object.freeze({
  "ˈ": "primary_stress",
  "ˌ": "secondary_stress",
  ".": "syllable_boundary",
  "|": "morpheme_boundary",
  "-": "morpheme_boundary",
  " ": "word_boundary",
});

function matchPhoneme(value, index) {
  return IPA_TOKEN_INVENTORY.find((phoneme) => value.startsWith(phoneme, index)) ?? null;
}

/** Tokenize normalized English IPA without discarding stress or boundaries. */
export function tokenizeEnglishIpa(ipa) {
  const normalizedIpa = normalizeEnglishIpa(ipa);
  const tokens = [];
  const unknown = [];

  for (let index = 0; index < normalizedIpa.normalized.length;) {
    const marker = normalizedIpa.normalized[index];
    if (Object.hasOwn(MARKERS, marker)) {
      tokens.push(Object.freeze({ type: MARKERS[marker], value: marker, index }));
      index += marker.length;
      continue;
    }

    const phoneme = matchPhoneme(normalizedIpa.normalized, index);
    if (phoneme) {
      tokens.push(Object.freeze({ type: "phoneme", value: phoneme, index }));
      index += phoneme.length;
      continue;
    }

    const value = String.fromCodePoint(normalizedIpa.normalized.codePointAt(index));
    const token = Object.freeze({ type: "unknown", value, index });
    tokens.push(token);
    unknown.push(token);
    index += value.length;
  }

  return Object.freeze({
    ...normalizedIpa,
    tokens: Object.freeze(tokens),
    unknown: Object.freeze(unknown),
  });
}
